import type { Timestamp } from "firebase/firestore";

export type WithId<T> = T & { id: string };

export type UserDoc = {
  name: string;
  email: string;
  points: number;
  lifetimePoints: number;
  totalBottles: number;
  createdAt: Timestamp | null;
  lastClaimCode?: string;
  lastRedeemId?: string;
};

export type PointTier = {
  label: string;
  /** Batas tinggi botol (cm) untuk tier ini; null berarti tanpa batas atas. */
  upToCm: number | null;
  points: number;
};

export type PointsSettings = {
  tiers: PointTier[];
  depositExpiryMinutes: number;
};

export type ActiveDeposit = {
  code: string;
  bottleCount: number;
  points: number;
  expiresAt: Timestamp;
};

export type Bin = {
  name: string;
  location: string;
  capacityBottles: number;
  bottleCount: number;
  totalBottles: number;
  currentDeposit: ActiveDeposit | null;
  lastEmptiedAt: Timestamp | null;
  createdAt: Timestamp | null;
};

export type DepositStatus = "pending" | "claimed" | "expired";

export type BottleReading = { heightCm: number; tier: string; points: number };

export type Deposit = {
  binId: string;
  binName: string;
  bottleCount: number;
  bottles: BottleReading[];
  points: number;
  status: DepositStatus;
  claimedBy: string | null;
  claimedAt: Timestamp | null;
  createdAt: Timestamp | null;
  expiresAt: Timestamp;
};

export type Reward = {
  name: string;
  description: string;
  category: string;
  pointsCost: number;
  stock: number;
  active: boolean;
  imageUrl: string;
  isSample: boolean;
  lastRedeemId?: string;
  createdAt: Timestamp | null;
};

export type RedemptionStatus = "baru" | "siap" | "selesai" | "dibatalkan";

export type Redemption = {
  uid: string;
  userName: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  code: string;
  status: RedemptionStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type LedgerType = "setor" | "tukar" | "refund";

export type LedgerEntry = {
  type: LedgerType;
  points: number;
  bottles?: number;
  binName?: string;
  depositCode?: string;
  redemptionId?: string;
  rewardName?: string;
  createdAt: Timestamp | null;
};
