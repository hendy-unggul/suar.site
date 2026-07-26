// FILE PATH: src/lib/objekPath.ts
// ------------------------------------------------------------------
// Helper untuk resolve path file gambar objek per bulan dan minggu.
// Dipakai oleh semua komponen game (TapTarget, TapDistractor, Sort2,
// Sort6, Freeplay) supaya tidak hardcode path di tiap komponen.
//
// STRUKTUR FOLDER:
// public/images/objek/
//   bulan1/minggu1/ → apel_merah.png, apel_merah_abu.png
//   bulan1/minggu2/ → balon_biru.png, dst
//   bulan2/minggu5/ → bola_lingkaran.png, dst
//   ...
//
// MAPPING minggu → bulan:
// Minggu 1-4   → bulan1  (dunia_warna)
// Minggu 5-8   → bulan2  (dunia_bentuk)
// Minggu 9-12  → bulan3  (dunia_ukuran)
// Minggu 13-16 → bulan4  (dunia_posisi)
// Minggu 17-20 → bulan5  (kategorisasi_dasar)
// Minggu 21-24 → bulan6  (kategorisasi_multi)
// Minggu 25-28 → bulan7  (pattern_dasar)
// Minggu 29-32 → bulan8  (pattern_lanjut)
// ------------------------------------------------------------------

export function getBulanDariMinggu(minggu: number): number {
  return Math.ceil(minggu / 4)
}

// Mapping nama objek ke minggu � diupdate setiap tambah konten baru
const OBJEK_KE_MINGGU: Record<string, number> = {
  // Bulan 1 - Dunia Warna
  apel_merah: 1, apel_merah_abu: 1,
  cabe_merah: 1, cabe_merah_abu: 1,
  pisang_kuning: 1, pisang_kuning_abu: 1,
  bunga_kuning: 1, bunga_kuning_abu: 1,
  balon_biru: 2, balon_biru_abu: 2,
  burung_biru: 2, burung_biru_abu: 2,
  katak_hijau: 2, katak_hijau_abu: 2,
  daun_hijau: 2, daun_hijau_abu: 2,
  anggur_ungu: 3, anggur_ungu_abu: 3,
  terong_ungu: 3, terong_ungu_abu: 3,
  jeruk_oranye: 3, jeruk_oranye_abu: 3,
  wortel_oranye: 3, wortel_oranye_abu: 3,
  // Bulan 2 - Dunia Bentuk
  bola_lingkaran: 5, bola_lingkaran_abu: 5,
  koin_lingkaran: 5, koin_lingkaran_abu: 5,
  kotak_persegi: 6, kotak_persegi_abu: 6,
  buku_persegi: 6, buku_persegi_abu: 6,
  topi_segitiga: 7, topi_segitiga_abu: 7,
  atap_segitiga: 7, atap_segitiga_abu: 7,
}

export function getObjekPath(namaObjek: string, mingguFallback: number, isAbu = false): string {
  // Cari minggu dari mapping, fallback ke parameter minggu
  const minggu = OBJEK_KE_MINGGU[namaObjek] ?? OBJEK_KE_MINGGU[`${namaObjek}_abu`] ?? mingguFallback
  const bulan = getBulanDariMinggu(minggu)
  const suffix = isAbu ? '_abu' : ''
  return `/images/objek/bulan${bulan}/minggu${minggu}/${namaObjek}${suffix}.png`
}

// Dipakai di komponen game untuk render <img>
// Contoh: getObjekPath('apel_merah', 1) → '/images/objek/bulan1/minggu1/apel_merah.png'
// Contoh: getObjekPath('apel_merah', 1, true) → '/images/objek/bulan1/minggu1/apel_merah_abu.png'
