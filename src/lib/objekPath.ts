// FILE PATH: src/lib/objekPath.ts
export function getBulanDariMinggu(minggu: number): number {
  return Math.ceil(minggu / 4)
}

const OBJEK_KE_MINGGU: Record<string, number> = {
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
  bola_lingkaran: 5, bola_lingkaran_abu: 5,
  koin_lingkaran: 5, koin_lingkaran_abu: 5,
  kotak_persegi: 6, kotak_persegi_abu: 6,
  buku_persegi: 6, buku_persegi_abu: 6,
  topi_segitiga: 7, topi_segitiga_abu: 7,
  atap_segitiga: 7, atap_segitiga_abu: 7,
}

export function getObjekPath(namaObjek: string, mingguFallback: number, isAbu = false): string {
  const minggu = OBJEK_KE_MINGGU[namaObjek] ?? mingguFallback
  const bulan = getBulanDariMinggu(minggu)
  const suffix = isAbu ? '_abu' : ''
  return `/images/objek/bulan${bulan}/minggu${minggu}/${namaObjek}${suffix}.png`
}
