// FILE PATH: src/components/games/GameDuniaWarnaFreeplay.tsx
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ColorPalette } from '@/config/colorPalettes'

type Props = {
  childId: string
  childName: string
  colors: ColorPalette
}

// ----------------------------------------------------------------------
// Weekend Freeplay (PRD: "semua tema/level yang sudah dikenal anak
// muncul random, tanpa skor, tanpa limit waktu"). BERBEDA dari komponen
// game utama dalam 3 hal yang DISENGAJA:
// 1. Selalu mekanik TAP (bukan drag) - mode santai, hindari kompleksitas.
// 2. TIDAK ADA pencatatan data sama sekali - tidak ke game_sessions,
//    tidak ke repetisi_log. Murni untuk kesenangan, bukan observasi.
// 3. TIDAK ADA loop repetisi tetap, gate, atau ronde bonus - anak main
//    selama dia mau, berhenti kapan saja, tanpa konsekuensi/progres apa pun.
// ----------------------------------------------------------------------

const WARNA_HEX: Record<string, string> = {
  merah: '#E5484D',
  kuning: '#F5D90A',
  hijau: '#46A758',
  biru: '#0091FF',
  oranye: '#F76B15',
  ungu: '#8E4EC6',
  coklat: '#9A6735',
  merah_jambu: '#E93D82',
  abu: '#8B8D98',
  hitam_putih: '#1C1C1F',
}

const WARNA_UCAPAN: Record<string, string> = {
  merah: 'merah',
  kuning: 'kuning',
  hijau: 'hijau',
  biru: 'biru',
  oranye: 'oranye',
  ungu: 'ungu',
  coklat: 'coklat',
  merah_jambu: 'merah muda',
  abu: 'abu-abu',
  hitam_putih: 'hitam, atau putih',
}

const BENTUK_OBJEK: Record<
  string,
  'bulat' | 'lonjong' | 'katak' | 'kadal' | 'rubah' | 'kucing' | 'kelinci' | 'gajah'
> = {
  apel: 'bulat',
  stroberi: 'lonjong',
  mangga: 'lonjong',
  pisang: 'lonjong',
  alpukat: 'lonjong',
  jambu_biji: 'bulat',
  katak: 'katak',
  kadal_hijau: 'kadal',
  rubah: 'rubah',
  kucing_oranye: 'kucing',
  mainan_kelinci_ungu: 'kelinci',
  mainan_gajah_ungu: 'gajah',
}

function ObjekBuah({
  nama,
  hex,
  size,
  state,
  onTap,
}: {
  nama: string
  hex: string
  size: number
  state: 'idle' | 'wrong' | 'correct'
  onTap: () => void
}) {
  const bentukKey = nama.split('__netral_')[0].split('__distractor_')[0]
  const bentuk = BENTUK_OBJEK[bentukKey] ?? 'bulat'
  return (
    <button
      onClick={onTap}
      aria-label={bentukKey.replace(/_/g, ' ')}
      className={[
        'relative flex items-center justify-center transition-transform duration-300',
        state === 'idle' ? 'freeplay-buah-idle' : '',
        state === 'wrong' ? 'freeplay-buah-wrong' : '',
        state === 'correct' ? 'freeplay-buah-correct' : '',
      ].join(' ')}
      style={{ width: size, height: size, minWidth: 80, minHeight: 80 }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {bentuk === 'bulat' && <circle cx="50" cy="55" r="38" fill={hex} />}
        {bentuk === 'lonjong' && <ellipse cx="50" cy="55" rx="30" ry="40" fill={hex} />}

        {bentuk === 'katak' && (
          <>
            <ellipse cx="50" cy="62" rx="36" ry="26" fill={hex} />
            <circle cx="36" cy="38" r="9" fill={hex} />
            <circle cx="64" cy="38" r="9" fill={hex} />
            <circle cx="36" cy="36" r="3.5" fill="#222" />
            <circle cx="64" cy="36" r="3.5" fill="#222" />
          </>
        )}

        {bentuk === 'kadal' && (
          <>
            <ellipse cx="46" cy="58" rx="28" ry="18" fill={hex} />
            <polygon points="74,58 96,48 96,68" fill={hex} />
            <circle cx="26" cy="52" r="4" fill="#222" />
          </>
        )}

        {bentuk === 'rubah' && (
          <>
            <polygon points="30,30 42,8 50,32" fill={hex} />
            <polygon points="70,30 58,8 50,32" fill={hex} />
            <circle cx="50" cy="58" r="32" fill={hex} />
            <ellipse cx="50" cy="68" rx="10" ry="7" fill="white" opacity={0.7} />
          </>
        )}

        {bentuk === 'kucing' && (
          <>
            <polygon points="26,28 40,10 46,30" fill={hex} />
            <polygon points="74,28 60,10 54,30" fill={hex} />
            <circle cx="50" cy="58" r="32" fill={hex} />
            <line x1="24" y1="60" x2="6" y2="56" stroke="#5a5a5a" strokeWidth="2" />
            <line x1="24" y1="66" x2="6" y2="66" stroke="#5a5a5a" strokeWidth="2" />
            <line x1="76" y1="60" x2="94" y2="56" stroke="#5a5a5a" strokeWidth="2" />
            <line x1="76" y1="66" x2="94" y2="66" stroke="#5a5a5a" strokeWidth="2" />
          </>
        )}

        {bentuk === 'kelinci' && (
          <>
            <ellipse cx="38" cy="20" rx="8" ry="22" fill={hex} />
            <ellipse cx="62" cy="20" rx="8" ry="22" fill={hex} />
            <circle cx="50" cy="58" r="30" fill={hex} />
          </>
        )}

        {bentuk === 'gajah' && (
          <>
            <circle cx="24" cy="46" r="20" fill={hex} opacity={0.85} />
            <circle cx="76" cy="46" r="20" fill={hex} opacity={0.85} />
            <circle cx="50" cy="55" r="32" fill={hex} />
            <path
              d="M50 80 Q46 95 54 96"
              stroke={hex}
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}

        {(bentuk === 'bulat' || bentuk === 'lonjong') && (
          <>
            <path d="M50 17 Q56 8 64 12" stroke="#5B7B3A" strokeWidth="5" strokeLinecap="round" fill="none" />
            <ellipse cx="62" cy="14" rx="10" ry="6" fill="#6FA84A" transform="rotate(-25 62 14)" />
          </>
        )}
      </svg>
    </button>
  )
}

export default function GameDuniaWarnaFreeplay({ childId, childName, colors }: Props) {
  const [warnaDikenal, setWarnaDikenal] = useState<string[]>([])
  const [objekPerWarna, setObjekPerWarna] = useState<Record<string, string[]>>({})
  const [warnaAktif, setWarnaAktif] = useState<string | null>(null)
  const [objekAktif, setObjekAktif] = useState<string>('apel')
  const [warnaDistractor, setWarnaDistractor] = useState<string | null>(null)
  const [objekDistractor, setObjekDistractor] = useState<string>('apel')
  const [tapState, setTapState] = useState<Record<string, 'idle' | 'wrong' | 'correct'>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ------------------------------------------------------------------
  // 1. Kumpulkan semua warna+objek yang SUDAH PERNAH dimainkan anak,
  //    dari seluruh content_variant Dunia Warna (bukan hanya 1 tingkat).
  //    Ini sumber data freeplay: "semua tema/level yang sudah dikenal".
  // ------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true

    async function loadDikenal() {
      setLoading(true)
      setError(null)

      const { data: riwayat, error: riwayatErr } = await supabase
        .from('game_sessions')
        .select('warna_key')
        .eq('child_id', childId)
        .eq('game_key', 'dunia_warna')
        .not('warna_key', 'is', null)

      if (riwayatErr) {
        if (isMounted) setError('Gagal memuat riwayat warna anak.')
        return
      }

      const warnaUnik = Array.from(
        new Set((riwayat ?? []).map((r) => r.warna_key as string))
      )

      if (warnaUnik.length === 0) {
        if (isMounted) setError('Belum ada warna yang dikenal. Selesaikan sesi harian dulu.')
        return
      }

      // Ambil semua content_variant dunia_warna untuk cari objek per warna
      // (lookup yang sama seperti di GameDuniaWarnaTapDistractor, tapi
      // sumbernya SEMUA variant, bukan 1 variant tertentu).
      const { data: variants, error: variantErr } = await supabase
        .from('game_content_variants')
        .select('asset_config')
        .eq('game_key', 'dunia_warna')

      if (variantErr || !variants) {
        if (isMounted) setError('Gagal memuat konten permainan.')
        return
      }

      const mapObjek: Record<string, Set<string>> = {}
      for (const v of variants) {
        const putaranList = (v.asset_config?.putaran ?? []) as Array<{
          warna_target?: string
          objek?: string[]
        }>
        for (const p of putaranList) {
          if (!p.warna_target || !p.objek) continue
          const warna = p.warna_target
          const objekList = p.objek
          if (!mapObjek[warna]) mapObjek[warna] = new Set()
          objekList.forEach((o) => mapObjek[warna].add(o))
        }
      }

      const objekFinal: Record<string, string[]> = {}
      warnaUnik.forEach((w) => {
        objekFinal[w] = Array.from(mapObjek[w] ?? [])
      })

      if (!isMounted) return
      setWarnaDikenal(warnaUnik)
      setObjekPerWarna(objekFinal)
      pilihAcakBaru(warnaUnik, objekFinal)
      setLoading(false)
    }

    loadDikenal()
    return () => {
      isMounted = false
    }
  }, [childId])

  function pilihAcakBaru(daftarWarna: string[], objekMap: Record<string, string[]>) {
    const warna = daftarWarna[Math.floor(Math.random() * daftarWarna.length)]
    const daftarObjek = objekMap[warna] ?? []
    const objek = daftarObjek.length
      ? daftarObjek[Math.floor(Math.random() * daftarObjek.length)]
      : 'apel'
    setWarnaAktif(warna)
    setObjekAktif(objek)

    // Distractor: warna LAIN yang juga sudah dipelajari (BUKAN abu-abu
    // netral sepenuhnya) - melatih diskriminasi warna-vs-warna, bukan
    // cuma warna-vs-tidak-berwarna. Fallback ke null (render abu-abu
    // murni) HANYA jika anak baru kenal 1 warna saja.
    const warnaLain = daftarWarna.filter((w) => w !== warna)
    if (warnaLain.length === 0) {
      setWarnaDistractor(null)
      return
    }
    const distractor = warnaLain[Math.floor(Math.random() * warnaLain.length)]
    const daftarObjekDistractor = objekMap[distractor] ?? []
    const objekD = daftarObjekDistractor.length
      ? daftarObjekDistractor[Math.floor(Math.random() * daftarObjekDistractor.length)]
      : 'apel'
    setWarnaDistractor(distractor)
    setObjekDistractor(objekD)
  }

  // ------------------------------------------------------------------
  // 2. Audio - identik gaya tingkat 1, tapi TANPA logging karakter
  // ------------------------------------------------------------------
  const ucapkan = useCallback((teks: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(teks)
    utterance.lang = 'id-ID'
    utterance.rate = 0.85
    utterance.pitch = 1.1
    window.speechSynthesis.speak(utterance)
  }, [])

  const [sudahGreeting, setSudahGreeting] = useState(false)
  useEffect(() => {
    if (!warnaAktif) return
    if (!sudahGreeting) {
      setSudahGreeting(true)
      const namaPanggilan = childName?.trim() || 'adik'
      const t1 = setTimeout(() => ucapkan(`Asyik, waktunya main bebas, ${namaPanggilan}!`), 300)
      const t2 = setTimeout(() => {
        const nama = WARNA_UCAPAN[warnaAktif] ?? warnaAktif
        ucapkan(`Coba cari warna ${nama}!`)
      }, 2600)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
    const nama = WARNA_UCAPAN[warnaAktif] ?? warnaAktif
    const timeout = setTimeout(() => ucapkan(`Coba cari warna ${nama}!`), 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warnaAktif, objekAktif])

  // Daftar objek tampil: 1 target + 1 distractor WARNA yang juga sudah
  // dipelajari (bukan abu-abu) + 1 benda netral abu-abu murni. Ini
  // melatih diskriminasi warna-vs-warna, bukan cuma warna-vs-tidak
  // berwarna - lebih bermakna secara pedagogis daripada 2 netral abu-abu.
  const objekTampil = warnaAktif
    ? [
        { nama: objekAktif, hex: WARNA_HEX[warnaAktif] ?? '#C9C7BE', isTarget: true },
        warnaDistractor
          ? {
              nama: `${objekDistractor}__distractor_${warnaDistractor}`,
              hex: WARNA_HEX[warnaDistractor] ?? '#C9C7BE',
              isTarget: false,
            }
          : { nama: 'daun_netral__netral_1', hex: '#C9C7BE', isTarget: false },
        { nama: 'batu_netral__netral_2', hex: '#C9C7BE', isTarget: false },
      ]
    : []

  // BUG YANG DIPERBAIKI: tanpa pengacakan ini, target SELALU dirender di
  // posisi pertama (index 0) karena objekTampil dibangun dengan urutan
  // tetap. Anak/tester bisa belajar "tap yang pertama" tanpa benar-benar
  // melihat warnanya - sama persis masalah yang sudah dihindari di
  // tingkat 2 (TapDistractor) lewat urutanTampil, tapi lupa diterapkan
  // di sini. Diacak ulang HANYA saat putaran berganti (bukan tiap render,
  // yang akan membuat posisi "lompat" saat tapState berubah).
  const [urutanTampil, setUrutanTampil] = useState<typeof objekTampil>([])
  useEffect(() => {
    setUrutanTampil([...objekTampil].sort(() => Math.random() - 0.5))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warnaAktif, objekAktif, warnaDistractor, objekDistractor])

  function handleTap(nama: string, isTarget: boolean) {
    if (isTarget) {
      setTapState((s) => ({ ...s, [nama]: 'correct' }))
      if (warnaAktif) ucapkan((WARNA_UCAPAN[warnaAktif] ?? warnaAktif) + '! Hebat!')
      setTimeout(() => {
        setTapState({})
        pilihAcakBaru(warnaDikenal, objekPerWarna)
      }, 900)
    } else {
      // Zero punishment, sama prinsip seperti tingkat 1 - animasi netral,
      // TIDAK ada skor/catatan apapun di freeplay.
      setTapState((s) => ({ ...s, [nama]: 'wrong' }))
      setTimeout(() => {
        setTapState((s) => ({ ...s, [nama]: 'idle' }))
      }, 400)
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: colors.background }} className="min-h-[480px] flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      </div>
    )
  }

  if (error || !warnaAktif) {
    return (
      <div
        style={{ backgroundColor: colors.background, color: colors.text }}
        className="min-h-[480px] flex items-center justify-center text-center px-6"
      >
        <p className="text-sm opacity-70">{error}</p>
      </div>
    )
  }

  return (
    <div
      style={{ backgroundColor: colors.background }}
      className="relative min-h-[480px] flex flex-col items-center justify-center gap-10 px-6 py-10 overflow-hidden select-none"
    >
      <style>{`
        @keyframes freeplay-buah-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        .freeplay-buah-idle { animation: freeplay-buah-float 2.4s ease-in-out infinite; cursor: pointer; }
        .freeplay-buah-wrong { animation: freeplay-buah-shake 0.4s ease; }
        @keyframes freeplay-buah-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px) rotate(-4deg); }
          75% { transform: translateX(8px) rotate(4deg); }
        }
        .freeplay-buah-correct { animation: freeplay-buah-pop 0.6s ease forwards; }
        @keyframes freeplay-buah-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.35) rotate(10deg); }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .freeplay-buah-idle, .freeplay-buah-wrong, .freeplay-buah-correct { animation: none; }
        }
      `}</style>

      {/* Tidak ada indikator progres/skor sama sekali - sesuai PRD:
          "tanpa skor, tanpa limit waktu". Anak bisa tap kapan saja,
          berhenti kapan saja. */}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {urutanTampil.map((o) => (
          <ObjekBuah
            key={o.nama}
            nama={o.nama}
            hex={o.hex}
            size={130}
            state={tapState[o.nama] ?? 'idle'}
            onTap={() => handleTap(o.nama, o.isTarget)}
          />
        ))}
      </div>
    </div>
  )
}