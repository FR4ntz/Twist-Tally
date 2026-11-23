"use client";

import { create } from "zustand";

type SerialReader = {
  read: () => Promise<{ value?: Uint8Array; done: boolean }>;
  cancel: () => Promise<void>;
  releaseLock: () => void;
};

type SerialReadable = {
  getReader: () => SerialReader;
};

type SerialPort = {
  readable?: SerialReadable;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  setSignals?: (signals: { dataTerminalReady?: boolean; requestToSend?: boolean }) => Promise<void>;
};

type SerialNavigator = {
  requestPort: () => Promise<SerialPort>;
};

declare global {
  interface Navigator {
    serial?: SerialNavigator;
  }
}

export type SerialStatus = "unsupported" | "disconnected" | "connecting" | "connected" | "error";

type DetectionState = {
  sampleCount: number;
  bestHeight: number;
  emptyCount: number;
  locked: boolean;
};

function initialDetection(): DetectionState {
  return { sampleCount: 0, bestHeight: 0, emptyCount: 0, locked: false };
}

const MIN_BOTTLE_CM = 3;

let activePort: SerialPort | null = null;
let activeReader: SerialReader | null = null;
let running = false;
let intentionalDisconnect = false;
let autoCaptureHandler: ((heightCm: number) => void) | null = null;
let detectionState: DetectionState = initialDetection();

type ArduinoSerialStore = {
  status: SerialStatus;
  log: string;
  lastRawLine: string;
  liveHeightCm: number | null;
  liveDistanceCm: number | null;
  emptyDistanceCm: number | null;
  initSupport: () => void;
  setAutoCaptureHandler: (handler: ((heightCm: number) => void) | null) => void;
  consumeCurrentBottle: (lockUntilEmpty?: boolean) => void;
  calibrateEmpty: () => void;
  clearCalibration: () => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export const useArduinoSerial = create<ArduinoSerialStore>((set, get) => ({
  status: "disconnected",
  log: "Belum ada port USB yang terhubung.",
  lastRawLine: "",
  liveHeightCm: null,
  liveDistanceCm: null,
  emptyDistanceCm: null,

  initSupport: () => {
    if (typeof navigator === "undefined") return;
    if (!navigator.serial && get().status !== "unsupported") {
      set({
        status: "unsupported",
        log: "Web Serial hanya tersedia di Chrome atau Edge, lewat localhost atau HTTPS.",
      });
    } else if (navigator.serial && get().status === "unsupported") {
      set({ status: "disconnected", log: "Belum ada port USB yang terhubung." });
    }
  },

  setAutoCaptureHandler: (handler) => {
    autoCaptureHandler = handler;
  },

  calibrateEmpty: () => {
    const dist = get().liveDistanceCm;
    if (dist === null || !Number.isFinite(dist) || dist < 5) {
      set({ log: "Kalibrasi gagal: pastikan alas kosong dan jarak sensor terbaca terlebih dahulu." });
      return;
    }
    detectionState.locked = false;
    set({
      emptyDistanceCm: dist,
      liveHeightCm: null,
      log: `Alas kosong dikalibrasi pada jarak ${dist.toFixed(1)} cm. Sekarang taruh botol di atas alas.`,
    });
  },

  clearCalibration: () => {
    detectionState.locked = false;
    set({
      emptyDistanceCm: null,
      log: "Kalibrasi browser direset; mengikuti perhitungan tinggi dari sketch Arduino.",
    });
  },

  consumeCurrentBottle: (lockUntilEmpty = true) => {
    const hadBottle = get().liveHeightCm !== null;
    if (hadBottle && lockUntilEmpty) {
      detectionState.locked = true;
    } else {
      detectionState.locked = false;
    }
    detectionState.sampleCount = 0;
    detectionState.bestHeight = 0;
    detectionState.emptyCount = 0;
    set((s) => ({
      liveHeightCm: null,
      log:
        s.status === "connected"
          ? hadBottle
            ? "Ukuran diambil. Singkirkan botol lalu taruh botol baru di alas."
            : "Siap membaca botol berikutnya."
          : s.log,
    }));
  },

  connect: async () => {
    if (typeof navigator === "undefined" || !navigator.serial) {
      set({
        status: "unsupported",
        log: "Web Serial hanya tersedia di Chrome atau Edge, lewat localhost atau HTTPS.",
      });
      return;
    }

    if ((running && activePort) || get().status === "connecting") return;

    intentionalDisconnect = false;
    set({ status: "connecting", log: "Pilih port COM Arduino..." });

    let port: SerialPort | null = null;
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      try {
        await port.setSignals?.({ dataTerminalReady: true, requestToSend: false });
      } catch {
        // Sebagian adapter/port virtual tidak mendukung setSignals
      }
      if (!port.readable) {
        await port.close().catch(() => {});
        throw new Error("Port Arduino tidak menyediakan aliran data yang bisa dibaca.");
      }

      activePort = port;
      const reader = port.readable.getReader();
      activeReader = reader;
      running = true;
      detectionState = initialDetection();

      set({
        status: "connected",
        log: "Arduino terhubung. Menunggu data dari sensor...",
        lastRawLine: "",
        liveHeightCm: null,
        liveDistanceCm: null,
      });

      const decoder = new TextDecoder();
      let buffer = "";

      const applyHeightSample = (rawHeight: number) => {
        const height = Math.round(rawHeight * 10) / 10;
        if (!Number.isFinite(height) || height < MIN_BOTTLE_CM) {
          detectionState.sampleCount = 0;
          detectionState.bestHeight = 0;
          detectionState.emptyCount += 1;
          let nextLog = get().log;
          if (detectionState.locked) {
            detectionState.locked = false;
            nextLog = "Alas kosong. Siap untuk botol berikutnya.";
          } else {
            nextLog = "Alas kosong. Taruh botol di atas alas lalu tekan Deteksi Ukuran Botol.";
          }
          set({ liveHeightCm: null, log: nextLog });
          return;
        }

        if (height > 60) {
          set({ log: `Pembacaan diabaikan (${height.toFixed(1)} cm di luar batas 3 sampai 60 cm).` });
          return;
        }

        detectionState.emptyCount = 0;
        if (detectionState.locked) return;

        if (autoCaptureHandler) {
          detectionState.sampleCount += 1;
          detectionState.bestHeight = Math.max(detectionState.bestHeight, height);
          if (detectionState.sampleCount >= 2) {
            const finalHeight = detectionState.bestHeight;
            detectionState.locked = true;
            set({
              liveHeightCm: null,
              liveDistanceCm: null,
              log: `Botol otomatis ditambahkan: ${finalHeight.toFixed(1)} cm. Singkirkan botol untuk lanjut.`,
            });
            autoCaptureHandler(finalHeight);
            return;
          }
        }

        set({
          liveHeightCm: height,
          log: `Botol di alas terbaca ${height.toFixed(1)} cm. Tekan Deteksi Ukuran Botol untuk mengambil ukuran.`,
        });
      };

      while (running) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          set({ lastRawLine: line });

          if (/Ultrasonic Sensor Started/i.test(line)) {
            detectionState = initialDetection();
            set({
              liveHeightCm: null,
              liveDistanceCm: null,
              log: "Sensor ultrasonik aktif. Taruh botol di alas, lalu tekan Deteksi Ukuran Botol.",
            });
            continue;
          }

          if (/FIRMWARE\s*:\s*TWIST-TALLY-V\d+/i.test(line)) {
            detectionState = initialDetection();
            set({ log: "Firmware Arduino terdeteksi. Menunggu pembacaan tinggi botol..." });
            continue;
          }

          if (/Objek tidak terdeteksi|PING timeout|jarak\s*[:=]\s*-1/i.test(line)) {
            detectionState.sampleCount = 0;
            detectionState.bestHeight = 0;
            detectionState.emptyCount += 1;
            const wasLocked = detectionState.locked;
            detectionState.locked = false;
            set({
              liveHeightCm: null,
              liveDistanceCm: null,
              log: wasLocked ? "Sensor siap menerima botol berikutnya." : "Objek tidak terdeteksi di alas.",
            });
            continue;
          }

          const distanceMatch = line.match(/Jarak\s*[:=]\s*(-?\d+(?:[.,]\d+)?)\s*(?:cm)?/i);
          if (distanceMatch) {
            const distance = Number(distanceMatch[1].replace(",", "."));
            const validDist = Number.isFinite(distance) && distance >= 0.5 && distance <= 400;
            const roundedDist = validDist ? Math.round(distance * 10) / 10 : null;
            set({ liveDistanceCm: roundedDist });

            const calEmpty = get().emptyDistanceCm;
            if (validDist && calEmpty !== null) {
              applyHeightSample(Math.max(0, calEmpty - distance));
            }
          }

          if (/^(?:BOTOL|LIVE)\s*:/i.test(line)) continue;

          const heightMatch =
            line.match(/tinggi\s+botol\s*[:=]\s*(-?\d+(?:[.,]\d+)?)\s*(?:cm)?/i) ??
            line.match(/(?:TINGGI|HEIGHT|KIRIM)\s*[:=]\s*(-?\d+(?:[.,]\d+)?)\s*(?:cm)?/i);

          if (heightMatch && get().emptyDistanceCm === null) {
            const parsedHeight = Number(heightMatch[1].replace(",", "."));
            applyHeightSample(parsedHeight);
          }
        }
      }

      if (!intentionalDisconnect) {
        running = false;
        try {
          activeReader?.releaseLock();
        } catch {
          // abaikan jika lock sudah dilepas
        }
        await activePort?.close().catch(() => {});
        activeReader = null;
        activePort = null;
        detectionState = initialDetection();
        set({
          status: "disconnected",
          liveHeightCm: null,
          liveDistanceCm: null,
          log: "Koneksi USB Arduino terputus.",
        });
      }
    } catch (error) {
      running = false;
      try {
        activeReader?.releaseLock();
      } catch {
        // abaikan jika lock sudah dilepas
      }
      try {
        await (activePort ?? port)?.close();
      } catch {
        // abaikan jika port belum terbuka atau sudah tertutup
      }
      activePort = null;
      activeReader = null;
      detectionState = initialDetection();

      if (intentionalDisconnect) return;

      const isUserCancel =
        error instanceof DOMException && (error.name === "NotFoundError" || error.name === "AbortError");

      if (isUserCancel) {
        set({
          status: "disconnected",
          liveHeightCm: null,
          liveDistanceCm: null,
          log: "Pemilihan port USB dibatalkan.",
        });
        return;
      }

      set({
        status: "error",
        liveHeightCm: null,
        liveDistanceCm: null,
        log: error instanceof Error ? error.message : "Koneksi USB Arduino gagal.",
      });
    }
  },

  disconnect: async () => {
    intentionalDisconnect = true;
    running = false;
    detectionState = initialDetection();
    try {
      await activeReader?.cancel();
      activeReader?.releaseLock();
      await activePort?.close();
      set({
        status: "disconnected",
        lastRawLine: "",
        liveHeightCm: null,
        liveDistanceCm: null,
        log: "Arduino diputus dari browser.",
      });
    } catch {
      set({
        status: "error",
        liveHeightCm: null,
        liveDistanceCm: null,
        log: "Port USB sudah ditutup atau tidak dapat dilepas.",
      });
    } finally {
      activeReader = null;
      activePort = null;
    }
  },
}));
