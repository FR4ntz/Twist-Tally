# Twist & Tally

Prototype web untuk smart bin botol plastik. Sensor di tempat sampah membaca jumlah dan tinggi botol, layar tempat sampah menampilkan kode QR, pengguna scan QR untuk mengklaim poin, lalu poin ditukar dengan produk upcycle atau merchandise.

Dibuat dari slide presentasi Kelompok 2. Identitas visual mengikuti slide: gingham indigo, denim, jahitan, dan kancing.

## Stack

- Next.js 16 (App Router, Cache Components), React 19
- Tailwind CSS 4, Framer Motion, Zustand
- Firebase Auth (email dan kata sandi) dan Cloud Firestore
- `jsqr` untuk membaca QR dari kamera, `qrcode.react` untuk membuat QR

## Alur

Tiap tempat sampah punya `sampahId` (misalnya `SB-7K3P`) yang tercetak di QR statis. QR itu hanya menghubungkan akun pengguna ke sensor, jadi sensor tahu poin yang dibacanya milik siapa.

1. Admin mendaftarkan tempat sampah di `/admin/bin`. ID dibuat otomatis, lalu QR dan ID dicetak dari tombol "QR dan ID".
2. Pengguna membuka `/scan` (kamera atau ketik ID), lalu menekan Hubungkan di `/hubung`. Dokumen `bins/{sampahId}` menyimpan `activeSession` dengan `userId` pengguna. Satu tempat sampah melayani satu akun dalam satu waktu.
3. Sensor membaca tinggi tiap botol, menghitung poin dari tier, lalu menulis `deposits/{id}` atas nama `userId` dan `sampahId` dengan status `pending`. Di prototype ini `/admin/simulator` meniru sensor dengan penulisan yang sama.
4. Pengguna melihat spanduk klaim dengan hitung mundur dan mengklaim poin. **Poin hangus bila tidak diklaim dalam 3 menit** (bisa diubah di pengaturan). Klaim yang lewat batas ditolak oleh rules, dan statusnya ditandai `expired`.
5. Poin ditukar di `/tukar`. Penukaran menghasilkan voucher (QR dan kode) yang diproses admin di `/admin/penukaran`.

Layar tempat sampah (`/bin?id=...`) menampilkan QR statis, siapa yang sedang tersambung, dan setoran yang menunggu klaim. Panel admin mencatat per `sampahId` berapa poin yang diterbitkan sensor, diklaim, dan hangus.

Aturan poin (tier tinggi botol, batas klaim, masa sambungan) diubah di `/admin/pengaturan`.

## Data

| Koleksi | Isi |
|---|---|
| `bins/{sampahId}` | tempat sampah, isi, `activeSession`, `pendingDeposit`, `pointsIssued` |
| `deposits/{id}` | bacaan sensor: `userId`, `sampahId`, botol, poin, `status`, `expiresAt` |
| `users/{uid}` dan `users/{uid}/ledger` | saldo poin dan riwayat |
| `rewards`, `redemptions` | katalog hadiah dan voucher |
| `settings/points` | tier poin dan batas waktu |

Gambar katalog contoh ada di `public/rewards` (ilustrasi buatan sendiri, bukan foto produk).

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi dari: firebase apps:sdkconfig web <APP_ID> --project <PROJECT_ID>
npm run dev
```

Kamera hanya aktif di `https` atau `localhost`. Di alamat lain, ketik ID tempat sampah secara manual.

## Firebase

`firebase.json`, `firestore.rules`, dan `firestore.indexes.json` ada di repo.

```bash
firebase deploy --only firestore,auth --project <PROJECT_ID>
```

Perintah itu membuat database `(default)`, mengunggah rules, dan mengaktifkan login email dan kata sandi.

Admin pertama dipilih sekali: akun pertama yang menekan "Jadikan akun ini admin pertama" di `/admin`. Setelah itu tombolnya hilang.

## Catatan keamanan

Prototype ini tidak memakai Cloud Functions. Sambungan akun, klaim poin, kedaluwarsa, dan penukaran dijaga oleh Firestore rules yang membandingkan dokumen sebelum dan sesudah transaksi. Penulisan setoran saat ini hanya boleh dilakukan admin. Untuk sensor asli, buat jalur server atau identitas perangkat yang terautentikasi, lalu pindahkan klaim dan penukaran ke Cloud Functions.
