# Twist & Tally

Prototype web untuk smart bin botol plastik. Sensor di tempat sampah membaca jumlah dan tinggi botol, layar tempat sampah menampilkan kode QR, pengguna scan QR untuk mengklaim poin, lalu poin ditukar dengan produk upcycle atau merchandise.

Dibuat dari slide presentasi Kelompok 2. Identitas visual mengikuti slide: gingham indigo, denim, jahitan, dan kancing.

## Stack

- Next.js 16 (App Router, Cache Components), React 19
- Tailwind CSS 4, Framer Motion, Zustand
- Firebase Auth (email dan kata sandi) dan Cloud Firestore
- `jsqr` untuk membaca QR dari kamera, `qrcode.react` untuk membuat QR

## Alur

1. Admin mendaftarkan tempat sampah di `/admin/bin`.
2. Sensor mengirim hasil bacaan. Di prototype ini, `/admin/simulator` meniru sensor: tiap botol punya tinggi, tinggi menentukan tier, tier menentukan poin.
3. Layar tempat sampah (`/bin?id=...`) menampilkan QR dan kode setoran.
4. Pengguna membuka `/scan`, scan QR atau ketik kode, lalu klaim di `/klaim`. Satu kode hanya bisa diklaim sekali dan kedaluwarsa setelah beberapa menit.
5. Poin ditukar di `/tukar`. Penukaran menghasilkan voucher (QR dan kode) yang diproses admin di `/admin/penukaran`.

Aturan poin (tier tinggi botol dan masa berlaku kode) diubah di `/admin/pengaturan`.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi dari: firebase apps:sdkconfig web <APP_ID> --project <PROJECT_ID>
npm run dev
```

Kamera hanya aktif di `https` atau `localhost`. Di alamat lain, ketik kode setoran secara manual.

## Firebase

`firebase.json`, `firestore.rules`, dan `firestore.indexes.json` ada di repo.

```bash
firebase deploy --only firestore,auth --project <PROJECT_ID>
```

Perintah itu membuat database `(default)`, mengunggah rules, dan mengaktifkan login email dan kata sandi.

Admin pertama dipilih sekali: akun pertama yang menekan "Jadikan akun ini admin pertama" di `/admin`. Setelah itu tombolnya hilang.

## Catatan keamanan

Prototype ini tidak memakai Cloud Functions. Klaim poin dan penukaran dijaga oleh Firestore rules yang membandingkan dokumen sebelum dan sesudah transaksi. Untuk produksi, pindahkan dua alur itu ke Cloud Functions, dan sambungkan sensor asli lewat jalur server yang terautentikasi.
