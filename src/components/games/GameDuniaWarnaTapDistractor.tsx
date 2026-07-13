// FILE PATH: src/components/games/GameDuniaWarnaTapDistractor.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getObjekPath } from '@/lib/objekPath'
import { ColorPalette } from '@/config/colorPalettes'

type Props = {
  childId: string
  childName: string
  colors: ColorPalette
  gameKey?: string
  atributUcapan?: Record<string, string>
  onSessionComplete?: (result: {
    correctItems: number
    totalItems: number
    levelTerbuka: boolean
  }) => void
}

type Putaran = {
  minggu: number
  warna_target: string
  objek: string[]
}

type ContentVariant = {
  id: string
  asset_config: { putaran: Putaran[] }
  mechanic_level_id: string
}

type MechanicLevel = {
  id: string
  config: { pilihan: number; timer: boolean | string; distractor: boolean }
}

const WARNA_HEX: Record<string, string> = {
  merah: '#E8001C',
  kuning: '#FFD700',
  hijau: '#00B300',
  biru: '#0057FF',
  oranye: '#FF6000',
  ungu: '#7B00FF',
  coklat: '#8B4513',
  merah_jambu: '#FF1493',
  abu: '#8B8D98',
  hitam_putih: '#111111',
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
  // Bulan 2: Dunia Bentuk
  lingkaran: 'lingkaran',
  persegi: 'persegi',
  segitiga: 'segitiga',
  // Bulan 3: Dunia Ukuran
  besar: 'besar',
  kecil: 'kecil',
  panjang: 'panjang',
  pendek: 'pendek',
  tinggi: 'tinggi',
  rendah: 'rendah',
}

function ObjekBuah({
  nama,
  hex: _hex,
  size,
  state,
  bonus,
  onTap,
}: {
  nama: string
  hex: string
  size: number
  minggu?: number
  state: 'idle' | 'wrong' | 'correct'
  bonus?: boolean
  onTap: () => void
}) {
  return (
    <button
      onClick={onTap}
      aria-label={nama.split('__distractor_')[0].replace(/_/g, ' ')}
      className={[
        'relative flex items-center justify-center transition-transform duration-300',
        state === 'idle' ? (bonus ? 'tap-buah-bonus' : 'tap-buah-idle') : '',
        state === 'wrong' ? 'tap-buah-wrong' : '',
        state === 'correct' ? 'tap-buah-correct' : '',
      ].join(' ')}
      style={{ width: size, height: size, minWidth: 80, minHeight: 80 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getObjekPath(nama, putaran?.minggu ?? 1)}
        alt={nama}
        draggable={false}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    </button>
  )
}

function TimerVisual({ color, resetKey }: { color: string; resetKey: string | number }) {
  const DURASI_DETIK = 6
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    setProgress(1)
    const mulai = Date.now()
    const interval = setInterval(() => {
      const berlalu = (Date.now() - mulai) / 1000
      const sisa = Math.max(0, 1 - berlalu / DURASI_DETIK)
      setProgress(sisa)
      if (sisa <= 0) clearInterval(interval)
    }, 100)
    return () => clearInterval(interval)
  }, [resetKey])

  const radius = 16
  const circumference = 2 * Math.PI * radius

  return (
    <svg viewBox="0 0 40 40" width={32} height={32} aria-hidden="true">
      <circle cx="20" cy="20" r={radius} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={4} />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform="rotate(-90 20 20)"
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />
    </svg>
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

  const warnaTerakhir = riwayat[0]?.warna_key ?? null

  const bobotList = putaranList.map((p) => {
    if (p.warna_target === warnaTerakhir) return 0
    const riwayatWarnaIni = riwayat.filter((r) => r.warna_key === p.warna_target)
    if (riwayatWarnaIni.length === 0) return 3
    const totalBenar = riwayatWarnaIni.reduce((sum, r) => sum + r.correct_items, 0)
    const totalItem = riwayatWarnaIni.reduce((sum, r) => sum + r.total_items, 0)
    const akurasi = totalItem > 0 ? totalBenar / totalItem : 0
    return 0.5 + (1 - akurasi) * 2.5
  })

  const totalBobot = bobotList.reduce((sum, b) => sum + b, 0)
  if (totalBobot === 0) {
    return putaranList[Math.floor(Math.random() * putaranList.length)]
  }

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

export default function GameDuniaWarnaTapDistractor({ childId, childName, colors, gameKey = 'dunia_warna', atributUcapan, onSessionComplete }: Props) {
  const [variant, setVariant] = useState<ContentVariant | null>(null)
  const [mechanic, setMechanic] = useState<MechanicLevel | null>(null)
  const [putaran, setPutaran] = useState<Putaran | null>(null)
  const [putaranTersedia, setPutaranTersedia] = useState<Putaran[]>([])
  const [objekIndex, setObjekIndex] = useState(0)
  const [tapState, setTapState] = useState<Record<string, 'idle' | 'wrong' | 'correct'>>({})
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
        .eq('game_key', gameKey)
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
        .eq('game_key', gameKey)
        .eq('level_key', 'tap_distractor')
        .single()

      if (mechanicErr || !mechanicData) {
        if (isMounted) setError('Gagal memuat konfigurasi tingkat permainan.')
        return
      }

      const { data: themesData, error: themesErr } = await supabase
        .from('game_themes')
        .select('id, week_range')
        .eq('game_key', gameKey)
        .order('sort_order', { ascending: true })

      if (themesErr || !themesData) {
        if (isMounted) setError('Gagal memuat tema permainan.')
        return
      }

      // Ambil SEMUA theme yang week_range <= currentWeek supaya
      // putaranTersedia mencakup semua minggu yang sudah dipelajari
      const themeIdsTersedia = (themesData as Array<{ id: string; week_range: number[] }>)
        .filter(t => Array.isArray(t.week_range) && Math.min(...t.week_range.map(Number)) <= currentWeek)
        .map(t => t.id)

      // Fallback ke theme pertama kalau tidak ada yang match
      if (themeIdsTersedia.length === 0) themeIdsTersedia.push(themesData[0]?.id)

      const { data: warnaHistory, error: warnaHistoryErr } = await supabase
        .from('game_sessions')
        .select('warna_key, correct_items, total_items, played_at')
        .eq('child_id', childId)
        .eq('game_key', gameKey)
        .not('warna_key', 'is', null)
        .order('played_at', { ascending: false })
        .limit(20)

      if (warnaHistoryErr) {
        if (isMounted) setError('Gagal memuat riwayat warna anak.')
        return
      }

      // Ambil semua variants dari semua theme yang tersedia untuk mekanik ini
      const { data: variantsData, error: variantErr } = await supabase
        .from('game_content_variants')
        .select('id, asset_config, mechanic_level_id')
        .in('theme_id', themeIdsTersedia)
        .eq('mechanic_level_id', mechanicData.id)

      if (variantErr || !variantsData || variantsData.length === 0) {
        if (isMounted) setError('Gagal memuat konten permainan.')
        return
      }

      if (!isMounted) return

      setMechanic(mechanicData as MechanicLevel)
      // Gunakan variant pertama sebagai referensi (untuk content_variant_id di game_sessions)
      setVariant(variantsData[0] as ContentVariant)

      // Gabung semua putaran dari semua variants yang tersedia
      const putaranList = (variantsData as ContentVariant[])
        .flatMap(v => (v.asset_config?.putaran ?? []) as Putaran[])
        .filter((p) => p.minggu <= currentWeek)
      const putaranTersediaFinal = putaranList.length ? putaranList : 
        (variantsData[0].asset_config?.putaran ?? []) as Putaran[]
      setPutaranTersedia(putaranTersediaFinal)

      const riwayatAwal = (warnaHistory ?? []) as RiwayatWarna[]
      const dipilih = pilihPutaranBerbobot(putaranTersediaFinal, riwayatAwal)
      setPutaran(dipilih ?? null)
      setLoading(false)
    }

    loadContent()
    return () => {
      isMounted = false
    }
  }, [childId])

  // ------------------------------------------------------------------
  // Bangun daftar objek tampil:
  // Senin (tap_target): distractor = objek SAMA versi abu (pisang vs pisang_abu)
  // Rabu (tap_distractor): distractor = objek RANDOM LAIN versi abu (pisang vs apel_abu)
  // Kesulitan meningkat karena anak tidak bisa andalkan bentuk, harus fokus warna murni.
  const objekTampil = (() => {
    if (!putaran) return []
    const indexAktif = faseBonus ? bonusIndex : objekIndex
    const namaTarget = putaran.objek[indexAktif % putaran.objek.length]
    const poolDistractor = putaran.objek.filter((o) => o !== namaTarget)
    const namaDistractor = poolDistractor.length > 0
      ? poolDistractor[Math.floor(Math.random() * poolDistractor.length)]
      : putaran.objek[0]
    return [
      { nama: namaTarget, hex: WARNA_HEX[putaran.warna_target], isTarget: true },
      { nama: `${namaDistractor}_abu`, hex: '#C9C7BE', isTarget: false },
    ]
  })()

  const [urutanTampil, setUrutanTampil] = useState<typeof objekTampil>([])
  useEffect(() => {
    setUrutanTampil([...objekTampil].sort(() => Math.random() - 0.5))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [putaran, objekIndex, bonusIndex, faseBonus])

  const ucapkan = useCallback((teks: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(teks)
    utterance.lang = 'id-ID'
    utterance.rate = 0.85
    utterance.pitch = 1.1
    window.speechSynthesis.speak(utterance)
  }, [])

  const playInstruksiAwal = useCallback(
    (warnaKey: string) => {
      const namaWarna = (atributUcapan?.[warnaKey] ?? WARNA_UCAPAN[warnaKey] ?? warnaKey)
      ucapkan(`Yang mana warna ${namaWarna}?`)
    },
    [ucapkan]
  )

  const playAudioCue = useCallback(
    (warnaKey: string) => {
      const namaWarna = (atributUcapan?.[warnaKey] ?? WARNA_UCAPAN[warnaKey] ?? warnaKey)
      ucapkan(namaWarna.charAt(0).toUpperCase() + namaWarna.slice(1) + '!')
    },
    [ucapkan]
  )

  const FRASA_ENCOURAGEMENT = [
    'Bagus sekali! Ayo lanjut lagi.',
    'Hebat! Satu lagi ya.',
    'Pintar! Yuk coba lagi.',
    'Keren! Lanjut ya.',
    'Asyik! Ayo sekali lagi.',
  ]
  const playEncouragement = useCallback(
    (repetisiSelesai: number) => {
      const frasa = FRASA_ENCOURAGEMENT[(repetisiSelesai - 1) % FRASA_ENCOURAGEMENT.length]
      ucapkan(frasa)
    },
    [ucapkan]
  )

  const simpanRepetisiLog = useCallback(
    async (repetisiKeSelesai: number, targetValue: string, jumlahSalah: number, diselesaikan: boolean) => {
      const durasiMs = Date.now() - repetisiStartRef.current
      await supabase.from('repetisi_log').insert({
        child_id: childId,
        game_key: gameKey,
        mechanic_level_key: 'tap_distractor',
        repetisi_ke: repetisiKeSelesai,
        target_value: targetValue,
        jumlah_salah_sebelum_benar: jumlahSalah,
        durasi_ms: durasiMs,
        diselesaikan,
      })
    },
    [childId]
  )

  useEffect(() => {
    if (!putaran) return
    const isAwalSesi = repetisiKe === 1 && objekIndex === 0 && !faseBonus

    if (isAwalSesi && !sudahGreetingRef.current) {
      sudahGreetingRef.current = true
      const namaPanggilan = childName?.trim() || 'adik'
      const timeoutGreeting = setTimeout(() => {
        ucapkan(`Halo, ${namaPanggilan}!`)
      }, 300)
      const timeoutInstruksi = setTimeout(() => {
        playInstruksiAwal(putaran.warna_target)
      }, 2400)
      return () => {
        clearTimeout(timeoutGreeting)
        clearTimeout(timeoutInstruksi)
      }
    }

    const delay = faseBonus ? 150 : 400
    const timeout = setTimeout(() => {
      playInstruksiAwal(putaran.warna_target)
    }, delay)
    return () => clearTimeout(timeout)
  }, [putaran, objekIndex, faseBonus, bonusIndex, repetisiKe, childName, ucapkan, playInstruksiAwal])

  async function handleTap(nama: string, isTarget: boolean) {
    if (faseBonus) return handleTapBonus(nama, isTarget)
    if (!putaran) return

    if (isTarget) {
      setTapState((s) => ({ ...s, [nama]: 'correct' }))
      playAudioCue(putaran.warna_target)
      const newCorrectCount = correctCount + 1
      setCorrectCount(newCorrectCount)

      setTimeout(() => {
        const isLastObjek = objekIndex + 1 >= putaran.objek.length
        if (isLastObjek) {
          simpanSesiNormal(newCorrectCount, putaran)
          simpanRepetisiLog(repetisiKe, putaran.warna_target, jumlahSalahRef.current, true)
          setRiwayatWarnaSesi((prev) => [
            {
              warna_key: putaran.warna_target,
              correct_items: newCorrectCount,
              total_items: putaran.objek.length,
              played_at: new Date().toISOString(),
            },
            ...prev,
          ])

          if (repetisiKe < TARGET_REPETISI) {
            const putaranBaru = pilihPutaranBerbobot(putaranTersedia, [
              {
                warna_key: putaran.warna_target,
                correct_items: newCorrectCount,
                total_items: putaran.objek.length,
                played_at: new Date().toISOString(),
              },
              ...riwayatWarnaSesi,
            ])
            playEncouragement(repetisiKe)
            jumlahSalahRef.current = 0
            repetisiStartRef.current = Date.now()
            setPutaran(putaranBaru)
            setRepetisiKe((r) => r + 1)
            setObjekIndex(0)
            setCorrectCount(0)
            setTapState({})
          } else {
            setFaseBonus(true)
            setBonusIndex(0)
            setTapState({})
          }
        } else {
          setObjekIndex((i) => i + 1)
          setTapState({})
        }
      }, 700)
    } else {
      jumlahSalahRef.current += 1
      setTapState((s) => ({ ...s, [nama]: 'wrong' }))
      if (putaran) playInstruksiAwal(putaran.warna_target)
      setTimeout(() => {
        setTapState((s) => ({ ...s, [nama]: 'idle' }))
      }, 400)
    }
  }

  function handleTapBonus(nama: string, isTarget: boolean) {
    if (isTarget) {
      setTapState((s) => ({ ...s, [nama]: 'correct' }))
      playAudioCue(putaran?.warna_target ?? '')
      setTimeout(() => {
        const isLastBonus = bonusIndex + 1 >= BONUS_TOTAL
        if (isLastBonus) {
          onSessionComplete?.({
            correctItems: correctCount,
            totalItems: putaran?.objek.length ?? 0,
            levelTerbuka: true,
          })
        } else {
          setBonusIndex((i) => i + 1)
          setTapState({})
        }
      }, 350)
    } else {
      setTapState((s) => ({ ...s, [nama]: 'wrong' }))
      if (putaran) playInstruksiAwal(putaran.warna_target)
      setTimeout(() => {
        setTapState((s) => ({ ...s, [nama]: 'idle' }))
      }, 250)
    }
  }

  async function simpanSesiNormal(finalCorrectCount: number, putaranSesi: Putaran) {
    if (!variant) return
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000)
    await supabase.from('game_sessions').insert({
      child_id: childId,
      game_key: gameKey,
      content_variant_id: variant.id,
      session_day: deteksiSessionDay(),
      week_number: putaranSesi.minggu,
      total_items: putaranSesi.objek.length,
      correct_items: finalCorrectCount,
      duration_seconds: durationSeconds,
      attempt_number: 1,
      warna_key: putaranSesi.warna_target,
    })
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: colors.background }} className="min-h-[480px] flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-[480px] flex items-center justify-center text-center px-6">
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
        @keyframes tap-buah-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(-2deg); }
        }
        .tap-buah-idle { animation: tap-buah-float 3.2s ease-in-out infinite; cursor: pointer; }
        .tap-buah-bonus { animation: tap-buah-float 1.6s ease-in-out infinite; cursor: pointer; }
        .tap-buah-wrong { animation: tap-buah-shake 0.4s ease; }
        @keyframes tap-buah-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px) rotate(-4deg); }
          75% { transform: translateX(8px) rotate(4deg); }
        }
        .tap-buah-correct { animation: tap-buah-correct 0.7s ease forwards; }
        @keyframes tap-buah-correct {
          0% { transform: scale(1); opacity: 1; }
          40% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.2); opacity: 0; }
        }
        @keyframes bonus-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .bonus-border { animation: bonus-glow 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tap-buah-idle, .tap-buah-bonus, .tap-buah-wrong, .tap-buah-correct, .bonus-border { animation: none; }
        }
      `}</style>

      {faseBonus && (
        <div
          className="bonus-border absolute inset-3 rounded-3xl pointer-events-none"
          style={{ border: `4px solid ${colors.accent}` }}
          aria-hidden="true"
        />
      )}

      {!faseBonus && putaran && (
        <div className="absolute top-4 right-4">
          <TimerVisual color={colors.accent} resetKey={`${repetisiKe}-${objekIndex}`} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {urutanTampil.map((o) => (
          <ObjekBuah
            key={o.nama}
            nama={o.nama}
            hex={o.hex}
            minggu={putaran?.minggu ?? 1}
            size={110}
            state={tapState[o.nama] ?? 'idle'}
            bonus={faseBonus}
            onTap={() => handleTap(o.nama, o.isTarget)}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2" aria-hidden="true">
          {(faseBonus ? Array.from({ length: BONUS_TOTAL }) : putaran?.objek ?? []).map((_, i) => (
            <span
              key={i}
              style={{
                backgroundColor:
                  i <= (faseBonus ? bonusIndex : objekIndex)
                    ? faseBonus ? colors.accent : colors.primary
                    : colors.secondary,
              }}
              className="w-3 h-3 rounded-full transition-colors"
            />
          ))}
        </div>

        {!faseBonus && (
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: TARGET_REPETISI }).map((_, i) => (
              <span
                key={i}
                style={{
                  backgroundColor: i < repetisiKe ? colors.accent : colors.secondary,
                  opacity: i < repetisiKe ? 1 : 0.4,
                }}
                className="w-2 h-2 rounded-full transition-colors"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
