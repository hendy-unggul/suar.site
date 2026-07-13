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

export function getObjekPath(namaObjek: string, minggu: number, isAbu = false): string {
  const bulan = getBulanDariMinggu(minggu)
  const suffix = isAbu ? '_abu' : ''
  return `/images/objek/bulan${bulan}/minggu${minggu}/${namaObjek}${suffix}.png`
}

// Dipakai di komponen game untuk render <img>
// Contoh: getObjekPath('apel_merah', 1) → '/images/objek/bulan1/minggu1/apel_merah.png'
// Contoh: getObjekPath('apel_merah', 1, true) → '/images/objek/bulan1/minggu1/apel_merah_abu.png'
