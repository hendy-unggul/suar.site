// FILE PATH: src/components/games/GameDuniaWarnaSort2Warna.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ColorPalette } from '@/config/colorPalettes'

type Props = {
  childId: string
  childName: string
  colors: ColorPalette
  onSessionComplete?: (result: {
    correctItems: number
    totalItems: number
    levelTerbuka: boolean
  }) => void
}

type Putaran = {
  minggu: number
  warna_sort: string[]
  objek: Record<string, string[]>
}

type ContentVariant = {
  id: string
  asset_config: { putaran: Putaran[] }
  mechanic_level_id: string
}

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

function BendaMengambang({ nama, size }: { nama: string; hex: string; size: number }) {
  return (
    <div className="benda-mengambang" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/objek/${nama}.png`}
        alt={nama}
        draggable={false}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}

function Keranjang({
  warna,
  hex,
  size,
  state,
  onTap,
}: {
  warna: string
  hex: string
  size: number
  state: 'idle' | 'wrong' | 'correct'
  onTap: () => void
}) {
  return (
    <button
      onClick={onTap}
      aria-label={`keranjang ${warna.replace(/_/g, ' ')}`}
      className={[
        'relative flex items-center justify-center transition-transform duration-300',
        state === 'idle' ? 'keranjang-idle' : '',
        state === 'wrong' ? 'keranjang-wrong' : '',
        state === 'correct' ? 'keranjang-correct' : '',
      ].join(' ')}
      style={{ width: size, height: size, minWidth: 90, minHeight: 90 }}
    >
      <svg viewBox="0 0 100 90" width={size} height={size * 0.9}>
        <ellipse cx="50" cy="22" rx="42" ry="10" fill={hex} opacity={0.85} />
        <path d="M10 22 L20 75 Q50 85 80 75 L90 22 Z" fill={hex} />
        <line x1="25" y1="35" x2="30" y2="72" stroke="white" strokeOpacity={0.3} strokeWidth="2" />
        <line x1="50" y1="35" x2="50" y2="78" stroke="white" strokeOpacity={0.3} strokeWidth="2" />
        <line x1="75" y1="35" x2="70" y2="72" stroke="white" strokeOpacity={0.3} strokeWidth="2" />
      </svg>
    </button>
  )
}

type RiwayatWarna = {
  warna_key: string | null
  correct_items: number
  total_items: number
  played_at: string
}

function pilihPutaranBerbobot(putaranList: Putaran[], riwayat: RiwayatWarna[]): Putaran | null {
  if (putaranList.length === 0) return null
  if (putaranList.length === 1) return putaranList[0]

  const warnaSortTerakhir = riwayat[0]?.warna_key ?? null

  const bobotList = putaranList.map((p) => {
    if (p.warna_sort.includes(warnaSortTerakhir ?? '')) return 0
    const riwayatRelevan = riwayat.filter((r) => p.warna_sort.includes(r.warna_key ?? ''))
    if (riwayatRelevan.length === 0) return 3
    const totalBenar = riwayatRelevan.reduce((sum, r) => sum + r.correct_items, 0)
    const totalItem = riwayatRelevan.reduce((sum, r) => sum + r.total_items, 0)
    const akurasi = totalItem > 0 ? totalBenar / totalItem : 0
    return 0.5 + (1 - akurasi) * 2.5
  })

  const totalBobot = bobotList.reduce((sum, b) => sum + b, 0)
  if (totalBobot === 0) return putaranList[Math.floor(Math.random() * putaranList.length)]

  let acak = Math.random() * totalBobot
  for (let i = 0; i < putaranList.length; i++) {
    acak -= bobotList[i]
    if (acak <= 0) return putaranList[i]
  }
  return putaranList[putaranList.length - 1]
}

function deteksiSessionDay(): 'senin' | 'rabu' | 'jumat' | 'weekend' {
  const hari = new Date().getDay()
  if (hari === 0 || hari === 6) return 'weekend'
  if (hari === 1 || hari === 2) return 'senin'
  if (hari === 3 || hari === 4) return 'rabu'
  return 'jumat'
}

export default function GameDuniaWarnaSort2Warna({ childId, childName, colors, onSessionComplete }: Props) {
  const [variant, setVariant] = useState<ContentVariant | null>(null)
  const [putaran, setPutaran] = useState<Putaran | null>(null)
  const [putaranTersedia, setPutaranTersedia] = useState<Putaran[]>([])
  const [bendaIndex, setBendaIndex] = useState(0)
  const [warnaBendaAktif, setWarnaBendaAktif] = useState<string>('')
  const [keranjangState, setKeranjangState] = useState<Record<string, 'idle' | 'wrong' | 'correct'>>({})
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const TARGET_REPETISI = 3
  const [repetisiKe, setRepetisiKe] = useState(1)
  const [riwayatWarnaSesi, setRiwayatWarnaSesi] = useState<RiwayatWarna[]>([])

  const [faseBonus, setFaseBonus] = useState(false)
  const [bonusIndex, setBonusIndex] = useState(0)
  const BONUS_TOTAL = 3

  const jumlahSalahRef = useRef(0)
  const repetisiStartRef = useRef<number>(Date.now())
  const sudahGreetingRef = useRef(false)
  const sessionStartRef = useRef<number>(Date.now())

  useEffect(() => {
    let isMounted = true

    async function loadContent() {
      setLoading(true)
      setError(null)

      const { data: existingSessions, error: sessionErr } = await supabase
        .from('game_sessions')
        .select('week_number')
        .eq('child_id', childId)
        .eq('game_key', 'dunia_warna')
        .order('week_number', { ascending: false })
        .limit(1)

      if (sessionErr) {
        if (isMounted) setError('Gagal memuat riwayat progres anak.')
        return
      }

      const currentWeek = existingSessions?.[0]?.week_number ?? 1

      const { data: mechanicData, error: mechanicErr } = await supabase
        .from('game_mechanic_levels')
        .select('id, config')
        .eq('game_key', 'dunia_warna')
        .eq('level_key', 'sort_2_warna')
        .single()

      if (mechanicErr || !mechanicData) {
        if (isMounted) setError('Gagal memuat konfigurasi tingkat permainan.')
        return
      }

      const { data: themesData, error: themesErr } = await supabase
        .from('game_themes')
        .select('id, week_range')
        .eq('game_key', 'dunia_warna')
        .order('sort_order', { ascending: true })

      if (themesErr || !themesData) {
        if (isMounted) setError('Gagal memuat tema permainan.')
        return
      }

      const matchedTheme = themesData.find((t: { week_range: number[] }) =>
        Array.isArray(t.week_range) && t.week_range.map(Number).includes(currentWeek)
      )
      const themeId = matchedTheme?.id ?? themesData[0]?.id

      const { data: warnaHistory, error: warnaHistoryErr } = await supabase
        .from('game_sessions')
        .select('warna_key, correct_items, total_items, played_at')
        .eq('child_id', childId)
        .eq('game_key', 'dunia_warna')
        .not('warna_key', 'is', null)
        .order('played_at', { ascending: false })
        .limit(20)

      if (warnaHistoryErr) {
        if (isMounted) setError('Gagal memuat riwayat warna anak.')
        return
      }

      const { data: variantData, error: variantErr } = await supabase
        .from('game_content_variants')
        .select('id, asset_config, mechanic_level_id')
        .eq('theme_id', themeId)
        .eq('mechanic_level_id', mechanicData.id)
        .single()

      if (variantErr || !variantData) {
        if (isMounted) setError('Gagal memuat konten permainan.')
        return
      }

      if (!isMounted) return

      setVariant(variantData as ContentVariant)

      const putaranList = (variantData.asset_config?.putaran ?? []) as Putaran[]
      const tersedia = putaranList.filter((p) => p.minggu <= currentWeek)
      const putaranTersediaFinal = tersedia.length ? tersedia : putaranList
      setPutaranTersedia(putaranTersediaFinal)

      const riwayatAwal = (warnaHistory ?? []) as RiwayatWarna[]
      const dipilih = pilihPutaranBerbobot(putaranTersediaFinal, riwayatAwal)
      setPutaran(dipilih)
      if (dipilih) setWarnaBendaAktif(dipilih.warna_sort[0])
      setLoading(false)
    }

    loadContent()
    return () => { isMounted = false }
  }, [childId])

  const indexAktif = faseBonus ? bonusIndex : bendaIndex
  const objekBendaAktif = putaran
    ? (putaran.objek[warnaBendaAktif] ?? ['apel'])[indexAktif % (putaran.objek[warnaBendaAktif]?.length ?? 1)]
    : 'apel'

  const keranjangData = putaran
    ? putaran.warna_sort.map((w) => ({ warna: w, hex: WARNA_HEX[w] ?? '#C9C7BE' }))
    : []

  const [urutanKeranjang, setUrutanKeranjang] = useState<typeof keranjangData>([])
  useEffect(() => {
    setUrutanKeranjang([...keranjangData].sort(() => Math.random() - 0.5))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [putaran, bendaIndex, bonusIndex, faseBonus, warnaBendaAktif])

  const ucapkan = useCallback((teks: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(teks)
    utterance.lang = 'id-ID'
    utterance.rate = 0.85
    utterance.pitch = 1.1
    window.speechSynthesis.speak(utterance)
  }, [])

  const playInstruksiAwal = useCallback((warnaKey: string) => {
    const nama = WARNA_UCAPAN[warnaKey] ?? warnaKey
    ucapkan(`Masukkan ke keranjang warna ${nama}!`)
  }, [ucapkan])

  const playAudioCue = useCallback((warnaKey: string) => {
    const nama = WARNA_UCAPAN[warnaKey] ?? warnaKey
    ucapkan(nama.charAt(0).toUpperCase() + nama.slice(1) + '!')
  }, [ucapkan])

  const FRASA_ENCOURAGEMENT = ['Bagus sekali! Ayo lanjut lagi.', 'Hebat! Satu lagi ya.', 'Pintar! Yuk coba lagi.']
  const playEncouragement = useCallback((repetisiSelesai: number) => {
    const frasa = FRASA_ENCOURAGEMENT[(repetisiSelesai - 1) % FRASA_ENCOURAGEMENT.length]
    ucapkan(frasa)
  }, [ucapkan])

  const simpanRepetisiLog = useCallback(
    async (repetisiKeSelesai: number, targetValue: string, jumlahSalah: number, diselesaikan: boolean) => {
      const durasiMs = Date.now() - repetisiStartRef.current
      await supabase.from('repetisi_log').insert({
        child_id: childId, game_key: 'dunia_warna', mechanic_level_key: 'sort_2_warna',
        repetisi_ke: repetisiKeSelesai, target_value: targetValue,
        jumlah_salah_sebelum_benar: jumlahSalah, durasi_ms: durasiMs, diselesaikan,
      })
    }, [childId])

  useEffect(() => {
    if (!warnaBendaAktif) return
    const isAwalSesi = repetisiKe === 1 && bendaIndex === 0 && !faseBonus

    if (isAwalSesi && !sudahGreetingRef.current) {
      sudahGreetingRef.current = true
      const namaPanggilan = childName?.trim() || 'adik'
      const t1 = setTimeout(() => ucapkan(`Halo, ${namaPanggilan}!`), 300)
      const t2 = setTimeout(() => playInstruksiAwal(warnaBendaAktif), 2400)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }

    const delay = faseBonus ? 150 : 400
    const timeout = setTimeout(() => playInstruksiAwal(warnaBendaAktif), delay)
    return () => clearTimeout(timeout)
  }, [warnaBendaAktif, bendaIndex, faseBonus, bonusIndex, repetisiKe, childName, ucapkan, playInstruksiAwal])

  function handleTapKeranjang(warnaKeranjang: string) {
    if (faseBonus) return handleTapBonus(warnaKeranjang)
    if (!putaran) return

    const isBenar = warnaKeranjang === warnaBendaAktif

    if (isBenar) {
      setKeranjangState((s) => ({ ...s, [warnaKeranjang]: 'correct' }))
      playAudioCue(warnaBendaAktif)
      const newCorrectCount = correctCount + 1
      setCorrectCount(newCorrectCount)

      setTimeout(() => {
        const jumlahObjekWarnaIni = putaran.objek[warnaBendaAktif]?.length ?? 1
        const isLastBenda = bendaIndex + 1 >= jumlahObjekWarnaIni

        if (isLastBenda) {
          simpanSesiNormal(newCorrectCount, putaran, warnaBendaAktif)
          simpanRepetisiLog(repetisiKe, warnaBendaAktif, jumlahSalahRef.current, true)
          setRiwayatWarnaSesi((prev) => [{
            warna_key: warnaBendaAktif, correct_items: newCorrectCount,
            total_items: jumlahObjekWarnaIni, played_at: new Date().toISOString(),
          }, ...prev])

          if (repetisiKe < TARGET_REPETISI) {
            const putaranBaru = pilihPutaranBerbobot(putaranTersedia, [{
              warna_key: warnaBendaAktif, correct_items: newCorrectCount,
              total_items: jumlahObjekWarnaIni, played_at: new Date().toISOString(),
            }, ...riwayatWarnaSesi])
            playEncouragement(repetisiKe)
            jumlahSalahRef.current = 0
            repetisiStartRef.current = Date.now()
            setPutaran(putaranBaru)
            if (putaranBaru) setWarnaBendaAktif(putaranBaru.warna_sort[Math.floor(Math.random() * putaranBaru.warna_sort.length)])
            setRepetisiKe((r) => r + 1)
            setBendaIndex(0)
            setCorrectCount(0)
            setKeranjangState({})
          } else {
            setFaseBonus(true)
            setBonusIndex(0)
            setKeranjangState({})
          }
        } else {
          setBendaIndex((i) => i + 1)
          setKeranjangState({})
          setWarnaBendaAktif(putaran.warna_sort[Math.floor(Math.random() * putaran.warna_sort.length)])
        }
      }, 700)
    } else {
      jumlahSalahRef.current += 1
      setKeranjangState((s) => ({ ...s, [warnaKeranjang]: 'wrong' }))
      playInstruksiAwal(warnaBendaAktif)
      setTimeout(() => { setKeranjangState((s) => ({ ...s, [warnaKeranjang]: 'idle' })) }, 400)
    }
  }

  function handleTapBonus(warnaKeranjang: string) {
    const isBenar = warnaKeranjang === warnaBendaAktif
    if (isBenar) {
      setKeranjangState((s) => ({ ...s, [warnaKeranjang]: 'correct' }))
      playAudioCue(warnaBendaAktif)
      setTimeout(() => {
        const isLastBonus = bonusIndex + 1 >= BONUS_TOTAL
        if (isLastBonus) {
          onSessionComplete?.({ correctItems: correctCount, totalItems: putaran?.warna_sort.length ?? 0, levelTerbuka: true })
        } else {
          setBonusIndex((i) => i + 1)
          setKeranjangState({})
          if (putaran) setWarnaBendaAktif(putaran.warna_sort[Math.floor(Math.random() * putaran.warna_sort.length)])
        }
      }, 350)
    } else {
      setKeranjangState((s) => ({ ...s, [warnaKeranjang]: 'wrong' }))
      playInstruksiAwal(warnaBendaAktif)
      setTimeout(() => { setKeranjangState((s) => ({ ...s, [warnaKeranjang]: 'idle' })) }, 250)
    }
  }

  async function simpanSesiNormal(finalCorrectCount: number, putaranSesi: Putaran, warnaKey: string) {
    if (!variant) return
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000)
    await supabase.from('game_sessions').insert({
      child_id: childId, game_key: 'dunia_warna', content_variant_id: variant.id,
      session_day: deteksiSessionDay(), week_number: putaranSesi.minggu,
      total_items: putaranSesi.objek[warnaKey]?.length ?? 1, correct_items: finalCorrectCount,
      duration_seconds: durationSeconds, attempt_number: 1, warna_key: warnaKey,
    })
  }

  if (loading) return (
    <div style={{ backgroundColor: colors.background }} className="min-h-[480px] flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
    </div>
  )

  if (error) return (
    <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-[480px] flex items-center justify-center text-center px-6">
      <p className="text-sm opacity-70">{error}</p>
    </div>
  )

  return (
    <div style={{ backgroundColor: colors.background }} className="relative min-h-[480px] flex flex-col items-center justify-between gap-8 px-6 py-10 overflow-hidden select-none">
      <style>{`
        @keyframes benda-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-6px) rotate(-2deg); } }
        .benda-mengambang { animation: benda-float 3.2s ease-in-out infinite; }
        @keyframes keranjang-idle-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .keranjang-idle { animation: keranjang-idle-bounce 2.8s ease-in-out infinite; cursor: pointer; }
        .keranjang-wrong { animation: keranjang-shake 0.4s ease; }
        @keyframes keranjang-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px) rotate(-3deg); } 75% { transform: translateX(8px) rotate(3deg); } }
        .keranjang-correct { animation: keranjang-correct 0.7s ease forwards; }
        @keyframes keranjang-correct { 0% { transform: scale(1); } 40% { transform: scale(1.25) translateY(-8px); } 100% { transform: scale(1); } }
        @keyframes bonus-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .bonus-border { animation: bonus-glow 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .benda-mengambang, .keranjang-idle, .keranjang-wrong, .keranjang-correct, .bonus-border { animation: none; } }
      `}</style>

      {faseBonus && (
        <div className="bonus-border absolute inset-3 rounded-3xl pointer-events-none" style={{ border: `4px solid ${colors.accent}` }} aria-hidden="true" />
      )}

      <div className="flex-1 flex items-center justify-center">
        <BendaMengambang nama={objekBendaAktif} hex={WARNA_HEX[warnaBendaAktif] ?? '#C9C7BE'} size={100} />
      </div>

      <div className="flex items-end justify-center gap-10 md:gap-16">
        {urutanKeranjang.map((k) => (
          <Keranjang key={k.warna} warna={k.warna} hex={k.hex} size={110}
            state={keranjangState[k.warna] ?? 'idle'} onTap={() => handleTapKeranjang(k.warna)} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2" aria-hidden="true">
          {(faseBonus ? Array.from({ length: BONUS_TOTAL }) : Array.from({ length: putaran?.objek[warnaBendaAktif]?.length ?? 1 })).map((_, i) => (
            <span key={i} style={{ backgroundColor: i <= (faseBonus ? bonusIndex : bendaIndex) ? (faseBonus ? colors.accent : colors.primary) : colors.secondary }}
              className="w-3 h-3 rounded-full transition-colors" />
          ))}
        </div>
        {!faseBonus && (
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: TARGET_REPETISI }).map((_, i) => (
              <span key={i} style={{ backgroundColor: i < repetisiKe ? colors.accent : colors.secondary, opacity: i < repetisiKe ? 1 : 0.4 }}
                className="w-2 h-2 rounded-full transition-colors" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}