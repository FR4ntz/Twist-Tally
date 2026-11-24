"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import jsQR from "jsqr";
import { Icon } from "./icons";
import { Button } from "./ui";

type Status = "idle" | "starting" | "scanning" | "denied" | "unavailable";

const SCAN_WIDTH = 480;
const SCAN_INTERVAL_MS = 110;

export function QrScanner({ onText, autoStart = true }: { onText: (text: string) => void; autoStart?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(autoStart);
  const [status, setStatus] = useState<Status>(autoStart ? "starting" : "idle");
  const [attempt, setAttempt] = useState(0);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;
    let lastScan = 0;
    let lastText = "";
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const tick = (time: number) => {
      const video = videoRef.current;
      if (cancelled || !video || !ctx) return;
      if (time - lastScan >= SCAN_INTERVAL_MS && video.readyState >= 2 && video.videoWidth > 0) {
        lastScan = time;
        const scale = Math.min(1, SCAN_WIDTH / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (found && found.data && found.data !== lastText) {
          lastText = found.data;
          onTextRef.current(found.data);
        }
      }
      frame = requestAnimationFrame(tick);
    };

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("scanning");
        frame = requestAnimationFrame(tick);
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : "";
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt, active]);

  const retry = useCallback(() => {
    setActive(true);
    setStatus("starting");
    setAttempt((n) => n + 1);
  }, []);

  const pause = useCallback(() => {
    setActive(false);
    setStatus("idle");
  }, []);

  return (
    <div className="patch patch-ink mx-auto grid w-full max-w-sm gap-2 p-3">
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-[#0d1024]">
        <video ref={videoRef} playsInline muted className="size-full object-cover" aria-label="Pratinjau kamera" />

        {status === "scanning" && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute inset-6 rounded-[12px] border-2 border-thread/85 shadow-[0_0_0_1px_rgb(29_33_88/0.35)]" />
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 h-0.5 bg-thread"
              initial={{ top: "14%" }}
              animate={{ top: "86%" }}
              transition={{ duration: 1.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          </>
        )}

        {status !== "scanning" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-on-fill">
            {status === "idle" && (
              <div className="grid justify-items-center gap-3">
                <Icon name="camera" size={38} />
                <p className="font-bold">Kamera scanner QR</p>
                <p className="text-sm text-on-fill/85">
                  Tekan tombol di bawah untuk menyalakan kamera dan memindai QR tempat sampah.
                </p>
                <Button variant="thread" size="sm" onClick={retry}>
                  Aktifkan kamera QR
                </Button>
              </div>
            )}
            {status === "starting" && (
              <div role="status" className="grid gap-3">
                <div className="loading-thread mx-auto w-32 text-on-fill/70" aria-hidden="true" />
                <p className="text-sm font-bold">Meminta izin kamera...</p>
              </div>
            )}
            {status === "denied" && (
              <div className="grid justify-items-center gap-3">
                <Icon name="camera" size={34} />
                <p className="font-bold">Izin kamera ditolak</p>
                <p className="text-sm text-on-fill/85">
                  Izinkan kamera lewat ikon gembok di bilah alamat, lalu coba lagi. Atau tulis kode setoran secara manual di bawah.
                </p>
                <Button variant="thread" size="sm" onClick={retry}>
                  Coba aktifkan kamera lagi
                </Button>
              </div>
            )}
            {status === "unavailable" && (
              <div className="grid justify-items-center gap-3">
                <Icon name="camera" size={34} />
                <p className="font-bold">Kamera tidak tersedia</p>
                <p className="text-sm text-on-fill/85">
                  Browser hanya mengizinkan kamera di alamat https atau localhost. Tulis kode setoran secara manual di bawah.
                </p>
                <Button variant="thread" size="sm" onClick={retry}>
                  Coba lagi
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      {status === "scanning" && (
        <Button variant="ghost" size="sm" onClick={pause} className="w-full border-on-fill/35 text-on-fill hover:bg-on-fill/15">
          Jeda kamera
        </Button>
      )}
    </div>
  );
}
