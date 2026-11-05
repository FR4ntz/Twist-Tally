import type { BottleReading, PointTier, PointsSettings } from "./types";

export const DEFAULT_SETTINGS: PointsSettings = {
  tiers: [
    { label: "Kecil", upToCm: 18, points: 5 },
    { label: "Sedang", upToCm: 25, points: 10 },
    { label: "Besar", upToCm: null, points: 20 },
  ],
  depositExpiryMinutes: 15,
};

export function sortTiers(tiers: PointTier[]): PointTier[] {
  return [...tiers].sort((a, b) => (a.upToCm ?? Infinity) - (b.upToCm ?? Infinity));
}

export function tierForHeight(heightCm: number, tiers: PointTier[]): PointTier {
  const sorted = sortTiers(tiers);
  return sorted.find((t) => t.upToCm === null || heightCm <= t.upToCm) ?? sorted[sorted.length - 1];
}

export function readBottle(heightCm: number, tiers: PointTier[]): BottleReading {
  const tier = tierForHeight(heightCm, tiers);
  return { heightCm, tier: tier.label, points: tier.points };
}

export function sumPoints(bottles: BottleReading[]): number {
  return bottles.reduce((total, b) => total + b.points, 0);
}

/** Tinggi contoh untuk tombol cepat di simulator: di batas atas tier, atau 8 cm di atas tier sebelumnya. */
export function sampleHeight(tiers: PointTier[], index: number): number {
  const sorted = sortTiers(tiers);
  const tier = sorted[index];
  if (tier.upToCm !== null) return tier.upToCm;
  const prev = sorted[index - 1]?.upToCm ?? 20;
  return prev + 8;
}
