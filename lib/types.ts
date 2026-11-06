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
  /** Poin dari sensor hangus bila tidak diklaim dalam waktu ini. */
  depositExpiryMinutes: number;
  /** Sambungan akun ke tempat sampah dilepas otomatis setelah waktu ini. */
  sessionExpiryMinutes: number;
};

/** Pengguna yang sedang tersambung ke sensor sebuah tempat sampah (hasil scan QR statis). */
export type ActiveSession = {
  userId: string;
  userName: string;
  startedAt: Timestamp;
  expiresAt: Timestamp;
};

/** Ringkasan setoran yang menunggu klaim, disalin ke dokumen bin supaya layar tempat sampah bisa menampilkannya tanpa login. */
export type PendingDepositInfo = {
  depositId: string;
  userName: string;
  bottleCount: number;
  points: number;
  expiresAt: Timestamp;
};

/** Dokumen bins/{sampahId}. ID dokumen adalah sampahId yang tercetak di QR tempat sampah. */
export type Bin = {
  sampahId: string;
  name: string;
  location: string;
  capacityBottles: number;
  bottleCount: number;
  totalBottles: number;
  /** Total poin yang pernah dibaca dan diterbitkan sensor tempat sampah ini. */
  pointsIssued: number;
  activeSession: ActiveSession | null;
  pendingDeposit: PendingDepositInfo | null;
  lastReadingAt: Timestamp | null;
  lastEmptiedAt: Timestamp | null;
  createdAt: Timestamp | null;
};

export type DepositStatus = "pending" | "claimed" | "expired";

export type BottleReading = { heightCm: number; tier: string; points: number };

export type Deposit = {
  binId: string;
  binName: string;
  userId: string;
  userName: string;
  bottleCount: number;
  bottles: BottleReading[];
  points: number;
  status: DepositStatus;
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

export type LedgerType = "setor" | "tukar" | "refund" | "bonus";

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
