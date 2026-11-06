import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { newDepositCode, newSampahId, newVoucherCode } from "./format";
import { readBottle, sumPoints } from "./points";
import { SAMPLE_REWARDS } from "./sample-rewards";
import type {
  Bin,
  BottleReading,
  Deposit,
  PointsSettings,
  Redemption,
  RedemptionStatus,
  Reward,
  UserDoc,
  WithId,
} from "./types";

export class ActionError extends Error {}

/** Sesi dianggap aktif selama waktu kedaluwarsanya belum lewat. */
export function liveSession(bin: Pick<Bin, "activeSession">, now = Date.now()) {
  return bin.activeSession && bin.activeSession.expiresAt.toMillis() > now ? bin.activeSession : null;
}

/** Scan QR statis tempat sampah: menyambungkan userId ke sensor sampahId. */
export async function connectToBin(sampahId: string, user: Pick<WithId<UserDoc>, "id" | "name">, sessionMinutes: number) {
  const binRef = doc(db, "bins", sampahId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(binRef);
    if (!snap.exists()) throw new ActionError("Tempat sampah dengan ID ini tidak ditemukan.");
    const session = liveSession(snap.data() as Bin);
    if (session && session.userId !== user.id) {
      throw new ActionError(`Tempat sampah ini sedang dipakai ${session.userName}. Tunggu sesinya selesai.`);
    }
    tx.update(binRef, {
      activeSession: {
        userId: user.id,
        userName: user.name,
        startedAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + sessionMinutes * 60_000),
      },
    });
  });
}

export async function disconnectFromBin(sampahId: string) {
  await updateDoc(doc(db, "bins", sampahId), { activeSession: null });
}

export async function claimDeposit(uid: string, depositId: string): Promise<{ points: number; bottles: number }> {
  const depositRef = doc(db, "deposits", depositId);
  const userRef = doc(db, "users", uid);
  const ledgerRef = doc(db, "users", uid, "ledger", depositId);

  return runTransaction(db, async (tx) => {
    const [depositSnap, userSnap] = await Promise.all([tx.get(depositRef), tx.get(userRef)]);
    if (!depositSnap.exists()) throw new ActionError("Setoran ini tidak ditemukan.");
    if (!userSnap.exists()) throw new ActionError("Profil belum siap. Muat ulang halaman, lalu coba lagi.");

    const deposit = depositSnap.data() as Deposit;
    const user = userSnap.data() as UserDoc;
    if (deposit.userId !== uid) throw new ActionError("Setoran ini milik pengguna lain.");
    if (deposit.status === "claimed") throw new ActionError("Setoran ini sudah diklaim.");
    if (deposit.status === "expired" || deposit.expiresAt.toMillis() <= Date.now()) {
      throw new ActionError("Poin ini sudah hangus karena tidak diklaim tepat waktu.");
    }

    const binRef = doc(db, "bins", deposit.binId);
    const binSnap = await tx.get(binRef);
    if (binSnap.exists() && (binSnap.data() as Bin).pendingDeposit?.depositId === depositId) {
      tx.update(binRef, { pendingDeposit: null });
    }

    tx.update(depositRef, { status: "claimed", claimedAt: serverTimestamp() });
    tx.update(userRef, {
      points: user.points + deposit.points,
      lifetimePoints: user.lifetimePoints + deposit.points,
      totalBottles: user.totalBottles + deposit.bottleCount,
      lastClaimCode: depositId,
    });
    tx.set(ledgerRef, {
      type: "setor",
      points: deposit.points,
      bottles: deposit.bottleCount,
      binName: deposit.binName,
      depositCode: depositId,
      createdAt: serverTimestamp(),
    });

    return { points: deposit.points, bottles: deposit.bottleCount };
  });
}

/** Poin yang lewat batas waktu ditandai hangus. Aman dipanggil berulang: transaksi memeriksa status terakhir. */
export async function expireDeposit(depositId: string) {
  const depositRef = doc(db, "deposits", depositId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(depositRef);
    if (!snap.exists()) return;
    const deposit = snap.data() as Deposit;
    if (deposit.status !== "pending" || deposit.expiresAt.toMillis() > Date.now()) return;
    const binRef = doc(db, "bins", deposit.binId);
    const binSnap = await tx.get(binRef);
    if (binSnap.exists() && (binSnap.data() as Bin).pendingDeposit?.depositId === depositId) {
      tx.update(binRef, { pendingDeposit: null });
    }
    tx.update(depositRef, { status: "expired" });
  });
}

export async function redeemReward(user: WithId<UserDoc>, reward: WithId<Reward>): Promise<Redemption & { id: string }> {
  const userRef = doc(db, "users", user.id);
  const rewardRef = doc(db, "rewards", reward.id);
  const redemptionRef = doc(collection(db, "redemptions"));
  const ledgerRef = doc(db, "users", user.id, "ledger", redemptionRef.id);
  const code = newVoucherCode();

  await runTransaction(db, async (tx) => {
    const [userSnap, rewardSnap] = await Promise.all([tx.get(userRef), tx.get(rewardRef)]);
    if (!rewardSnap.exists()) throw new ActionError("Hadiah ini sudah tidak tersedia.");
    const live = rewardSnap.data() as Reward;
    const balance = (userSnap.data() as UserDoc).points;
    if (!live.active || live.stock <= 0) throw new ActionError("Stok hadiah ini habis.");
    if (balance < live.pointsCost) {
      throw new ActionError(`Poin belum cukup. Kurang ${live.pointsCost - balance} poin.`);
    }

    tx.set(redemptionRef, {
      uid: user.id,
      userName: user.name,
      rewardId: reward.id,
      rewardName: live.name,
      cost: live.pointsCost,
      code,
      status: "baru",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(userRef, { points: balance - live.pointsCost, lastRedeemId: redemptionRef.id });
    tx.update(rewardRef, { stock: live.stock - 1, lastRedeemId: redemptionRef.id });
    tx.set(ledgerRef, {
      type: "tukar",
      points: -live.pointsCost,
      rewardName: live.name,
      redemptionId: redemptionRef.id,
      createdAt: serverTimestamp(),
    });
  });

  return {
    id: redemptionRef.id,
    uid: user.id,
    userName: user.name,
    rewardId: reward.id,
    rewardName: reward.name,
    cost: reward.pointsCost,
    code,
    status: "baru",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export async function renameUser(uid: string, name: string) {
  await updateDoc(doc(db, "users", uid), { name: name.trim() });
}

export async function claimFirstAdmin(uid: string) {
  const batch = writeBatch(db);
  batch.set(doc(db, "admins", uid), { createdAt: serverTimestamp() });
  batch.set(doc(db, "meta", "bootstrap"), { claimedBy: uid, claimedAt: serverTimestamp() });
  await batch.commit();
}

export async function saveSettings(settings: PointsSettings) {
  await setDoc(doc(db, "settings", "points"), settings);
}

export type BinInput = Pick<Bin, "name" | "location" | "capacityBottles">;

/** Tempat sampah baru mendapat sampahId acak yang tidak bentrok; ID ini tercetak di QR dan tidak berubah. */
export async function saveBin(id: string | null, input: BinInput, existingIds: string[] = []) {
  if (id) {
    await updateDoc(doc(db, "bins", id), { ...input });
    return id;
  }
  let sampahId = newSampahId();
  while (existingIds.includes(sampahId)) sampahId = newSampahId();
  await setDoc(doc(db, "bins", sampahId), {
    ...input,
    sampahId,
    bottleCount: 0,
    totalBottles: 0,
    pointsIssued: 0,
    activeSession: null,
    pendingDeposit: null,
    lastReadingAt: null,
    lastEmptiedAt: null,
    createdAt: serverTimestamp(),
  });
  return sampahId;
}

export async function emptyBin(id: string) {
  await updateDoc(doc(db, "bins", id), { bottleCount: 0, lastEmptiedAt: serverTimestamp() });
}

export async function deleteBin(id: string) {
  await deleteDoc(doc(db, "bins", id));
}

/**
 * Meniru sensor: membaca tinggi tiap botol, menghitung poin, lalu mencatatnya atas nama
 * pengguna yang tersambung (userId) di tempat sampah ini (sampahId). Sensor asli menulis hal yang sama.
 */
export async function createDeposit(
  bin: WithId<Bin>,
  heightsCm: number[],
  settings: PointsSettings,
): Promise<{ depositId: string; userName: string; bottles: BottleReading[]; points: number }> {
  const session = liveSession(bin);
  if (!session) throw new ActionError("Belum ada pengguna yang tersambung ke tempat sampah ini.");

  const bottles = heightsCm.map((h) => readBottle(h, settings.tiers));
  const points = sumPoints(bottles);
  const depositId = newDepositCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + settings.depositExpiryMinutes * 60_000);

  const batch = writeBatch(db);
  batch.set(doc(db, "deposits", depositId), {
    binId: bin.id,
    binName: bin.name,
    userId: session.userId,
    userName: session.userName,
    bottleCount: bottles.length,
    bottles,
    points,
    status: "pending",
    claimedAt: null,
    createdAt: serverTimestamp(),
    expiresAt,
  });
  batch.update(doc(db, "bins", bin.id), {
    bottleCount: increment(bottles.length),
    totalBottles: increment(bottles.length),
    pointsIssued: increment(points),
    activeSession: null,
    pendingDeposit: { depositId, userName: session.userName, bottleCount: bottles.length, points, expiresAt },
    lastReadingAt: serverTimestamp(),
  });
  await batch.commit();
  return { depositId, userName: session.userName, bottles, points };
}

export type RewardInput = Pick<Reward, "name" | "description" | "category" | "pointsCost" | "stock" | "active" | "imageUrl">;

export async function saveReward(id: string | null, input: RewardInput) {
  if (id) {
    await updateDoc(doc(db, "rewards", id), { ...input });
    return;
  }
  await setDoc(doc(collection(db, "rewards")), { ...input, isSample: false, createdAt: serverTimestamp() });
}

export async function seedSampleRewards() {
  const batch = writeBatch(db);
  SAMPLE_REWARDS.forEach((s) => batch.set(doc(collection(db, "rewards")), { ...s, isSample: true, createdAt: serverTimestamp() }));
  await batch.commit();
}

export async function deleteReward(id: string) {
  await deleteDoc(doc(db, "rewards", id));
}

export async function setRedemptionStatus(redemption: WithId<Redemption>, status: RedemptionStatus) {
  const redemptionRef = doc(db, "redemptions", redemption.id);
  if (status !== "dibatalkan") {
    await updateDoc(redemptionRef, { status, updatedAt: serverTimestamp() });
    return;
  }

  const userRef = doc(db, "users", redemption.uid);
  const rewardRef = doc(db, "rewards", redemption.rewardId);
  await runTransaction(db, async (tx) => {
    const [current, userSnap, rewardSnap] = await Promise.all([
      tx.get(redemptionRef),
      tx.get(userRef),
      tx.get(rewardRef),
    ]);
    const live = current.data() as Redemption | undefined;
    if (!live || live.status === "dibatalkan" || live.status === "selesai") {
      throw new ActionError("Penukaran ini sudah selesai atau sudah dibatalkan.");
    }
    tx.update(redemptionRef, { status: "dibatalkan", updatedAt: serverTimestamp() });
    if (userSnap.exists()) {
      tx.update(userRef, { points: (userSnap.data() as UserDoc).points + live.cost });
      tx.set(doc(db, "users", redemption.uid, "ledger", `${redemption.id}_refund`), {
        type: "refund",
        points: live.cost,
        rewardName: live.rewardName,
        redemptionId: redemption.id,
        createdAt: serverTimestamp(),
      });
    }
    if (rewardSnap.exists()) {
      tx.update(rewardRef, { stock: (rewardSnap.data() as Reward).stock + 1 });
    }
  });
}
