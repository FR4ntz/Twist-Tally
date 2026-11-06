import type { Reward } from "./types";

type SampleReward = Pick<Reward, "name" | "description" | "category" | "pointsCost" | "stock" | "active" | "imageUrl">;

/**
 * Data dummy katalog dengan ilustrasi di public/rewards (gambar buatan sendiri, bukan foto produk). Semua barang ditandai isSample saat disimpan, jadi pengguna melihat label "Contoh"
 * dan admin bisa menggantinya dengan hadiah asli. Satu barang sengaja stok 0 dan satu nonaktif
 * supaya tampilan stok habis dan hadiah tersembunyi bisa dicoba.
 */
export const SAMPLE_REWARDS: SampleReward[] = [
  {
    name: "Stiker Pack Botol Bijak",
    description: "Satu set stiker kecil bertema pilah botol. Cocok untuk laptop dan botol minum.",
    category: "Merchandise",
    pointsCost: 15,
    stock: 60,
    active: true,
    imageUrl: "/rewards/stiker-pack.svg",
  },
  {
    name: "Pin Kancing Twist & Tally",
    description: "Pin bulat bergambar kancing dua lubang, identitas visual Twist & Tally.",
    category: "Merchandise",
    pointsCost: 25,
    stock: 40,
    active: true,
    imageUrl: "/rewards/pin-kancing.svg",
  },
  {
    name: "Gantungan Kunci Botol Press",
    description: "Gantungan kunci dari serpihan botol PET yang dicacah lalu dipres panas. Warna dan pola tiap buah berbeda.",
    category: "Produk upcycle",
    pointsCost: 40,
    stock: 25,
    active: true,
    imageUrl: "/rewards/gantungan-kunci.svg",
  },
  {
    name: "Tatakan Gelas Plastik Press",
    description: "Tatakan gelas dari lembaran plastik daur ulang hasil heat pressing. Tahan air dan mudah dilap.",
    category: "Produk upcycle",
    pointsCost: 80,
    stock: 15,
    active: true,
    imageUrl: "/rewards/tatakan-gelas.svg",
  },
  {
    name: "Notebook Sampul Daur Ulang",
    description: "Buku catatan dengan sampul lembaran plastik press. Isi kertas polos 50 halaman.",
    category: "Merchandise",
    pointsCost: 90,
    stock: 12,
    active: true,
    imageUrl: "/rewards/notebook.svg",
  },
  {
    name: "Tempat Pensil Plastik Press",
    description: "Tempat pensil kaku dari plastik press. Ukurannya muat 10 sampai 12 pensil.",
    category: "Produk upcycle",
    pointsCost: 120,
    stock: 8,
    active: true,
    imageUrl: "/rewards/tempat-pensil.svg",
  },
  {
    name: "Tote Bag Denim Patch",
    description: "Tote bag kain denim dengan tambalan jahitan bergaya gingham, sesuai tema Twist & Tally.",
    category: "Merchandise",
    pointsCost: 180,
    stock: 10,
    active: true,
    imageUrl: "/rewards/tote-denim.svg",
  },
  {
    name: "Tumbler Twist & Tally",
    description: "Tumbler stainless 500 ml dengan logo Twist & Tally, supaya tidak perlu botol sekali pakai.",
    category: "Merchandise",
    pointsCost: 250,
    stock: 5,
    active: true,
    imageUrl: "/rewards/tumbler.svg",
  },
  {
    name: "Papan Nama Meja Plastik Press",
    description: "Papan nama meja dari plastik press, bisa dipesan dengan nama sendiri. Stok sedang kosong.",
    category: "Produk upcycle",
    pointsCost: 150,
    stock: 0,
    active: true,
    imageUrl: "/rewards/papan-nama.svg",
  },
  {
    name: "Totebag Edisi Wisuda",
    description: "Hadiah edisi terbatas yang belum dibuka. Nonaktif, jadi tidak tampil di katalog pengguna.",
    category: "Merchandise",
    pointsCost: 300,
    stock: 20,
    active: false,
    imageUrl: "/rewards/tote-wisuda.svg",
  },
];
