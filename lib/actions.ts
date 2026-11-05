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
import { newDepositCode, newVoucherCode } from "./format";
import { readBottle, sumPoints } from "./points";
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

export async function claimDeposit(uid: string, code: string): Promise<{ points: number; bottles: number }> {
  const depositRef = doc(db, "deposits", code);
  const userRef = doc(db, "users", uid);
  const ledgerRef = doc(db, "users", uid, "ledger", code);

  return runTransaction(db, async (tx) => {
    const [depositSnap, userSnap] = await Promise.all([tx.get(depositRef), tx.get(userRef)]);
    if (!depositSnap.exists()) throw new ActionError("Kode setoran tidak ditemukan.");
    if (!userSnap.exists()) throw new ActionError("Profil belum siap. Muat ulang halaman, lalu coba lagi.");

    const deposit = depositSnap.data() as Deposit;
    const user = userSnap.data() as UserDoc;
    if (deposit.status === "claimed") throw new ActionError("Setoran ini sudah diklaim.");
    if (deposit.status === "expired" || deposit.expiresAt.toMillis() <= Date.now()) {
      throw new ActionError("Kode setoran sudah kedaluwarsa.");
    }

    const binRef = doc(db, "bins", deposit.binId);
    const binSnap = await tx.get(binRef);
    if (binSnap.exists() && (binSnap.data() as Bin).currentDeposit?.code === code) {
      tx.update(binRef, { currentDeposit: null });
    }

    tx.update(depositRef, { status: "claimed", claimedBy: uid, claimedAt: serverTimestamp() });
    tx.update(userRef, {
      points: user.points + deposit.points,
      lifetimePoints: user.lifetimePoints + deposit.points,
      totalBottles: user.totalBottles + deposit.bottleCount,
      lastClaimCode: code,
    });
    tx.set(ledgerRef, {
      type: "setor",
      points: deposit.points,
      bottles: deposit.bottleCount,
      binName: deposit.binName,
      depositCode: code,
      createdAt: serverTimestamp(),
    });

    return { points: deposit.points, bottles: deposit.bottleCount };
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

export async function saveBin(id: string | null, input: BinInput) {
  if (id) {
    await updateDoc(doc(db, "bins", id), { ...input });
    return id;
  }
  const ref = doc(collection(db, "bins"));
  await setDoc(ref, {
    ...input,
    bottleCount: 0,
    totalBottles: 0,
    currentDeposit: null,
    lastEmptiedAt: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function emptyBin(id: string) {
  await updateDoc(doc(db, "bins", id), { bottleCount: 0, lastEmptiedAt: serverTimestamp() });
}

export async function deleteBin(id: string) {
  await deleteDoc(doc(db, "bins", id));
}

/** Meniru hasil pembacaan sensor: menyimpan setoran dan menaruh kodenya di layar tempat sampah. */
export async function createDeposit(
  bin: WithId<Bin>,
  heightsCm: number[],
  settings: PointsSettings,
): Promise<{ code: string; bottles: BottleReading[]; points: number }> {
  const bottles = heightsCm.map((h) => readBottle(h, settings.tiers));
  const points = sumPoints(bottles);
  const code = newDepositCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + settings.depositExpiryMinutes * 60_000);

  const batch = writeBatch(db);
  if (bin.currentDeposit) {
    batch.update(doc(db, "deposits", bin.currentDeposit.code), { status: "expired" });
  }
  batch.set(doc(db, "deposits", code), {
    binId: bin.id,
    binName: bin.name,
    bottleCount: bottles.length,
    bottles,
    points,
    status: "pending",
    claimedBy: null,
    claimedAt: null,
    createdAt: serverTimestamp(),
    expiresAt,
  });
  batch.update(doc(db, "bins", bin.id), {
    bottleCount: increment(bottles.length),
    totalBottles: increment(bottles.length),
    currentDeposit: { code, bottleCount: bottles.length, points, expiresAt },
  });
  await batch.commit();
  return { code, bottles, points };
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
  const samples: RewardInput[] = [
    {
      name: "Gantungan kunci plastik upcycle (contoh)",
      description: "Contoh hadiah. Ganti dengan produk hasil pengolahan botol PET yang benar-benar tersedia.",
      category: "Produk upcycle",
      pointsCost: 50,
      stock: 10,
      active: true,
      imageUrl: "",
    },
    {
      name: "Tatakan gelas plastik press (contoh)",
      description: "Contoh hadiah. Ganti dengan produk hasil pencacahan dan heat pressing yang benar-benar tersedia.",
      category: "Produk upcycle",
      pointsCost: 80,
      stock: 10,
      active: true,
      imageUrl: "",
    },
    {
      name: "Tote bag Twist & Tally (contoh)",
      description: "Contoh hadiah merchandise. Ganti dengan merchandise yang benar-benar tersedia.",
      category: "Merchandise",
      pointsCost: 150,
      stock: 10,
      active: true,
      imageUrl: "",
    },
  ];
  const batch = writeBatch(db);
  samples.forEach((s) => batch.set(doc(collection(db, "rewards")), { ...s, isSample: true, createdAt: serverTimestamp() }));
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
