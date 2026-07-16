// FILE PATH: app/anak/[id]/main/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { colorPalettes } from '@/config/colorPalettes'
import GameDuniaWarnaTapTarget from '@/components/games/GameDuniaWarnaTapTarget'
import GameDuniaWarnaTapDistractor from '@/components/games/GameDuniaWarnaTapDistractor'
import GameDuniaWarnaSort2Warna from '@/components/games/GameDuniaWarnaSort2Warna'
import GameDuniaWarnaSort6Warna from '@/components/games/GameDuniaWarnaSort6Warna'
type ChildWithSchool = {
  id: string
  name: string
  class_id: string
  classes: {
    school_id: string
    schools: {
      id: string
      name: string
      color_palette: string
    }
  }
}

function MainGameContent() {
  const params = useParams<{ id: string }>()
  const childId = params.id

  const searchParams = useSearchParams()

  const HARI_KE_MECHANIC_KEY: Record<string, string> = {
    senin: 'tap_target',
    rabu: 'tap_distractor',
    jumat: 'sort_2_warna',
    tantangan: 'sort_6_warna',
  }
  const hariParam = searchParams.get('hari') ?? 'senin'
  const hari = hariParam in HARI_KE_MECHANIC_KEY ? hariParam : 'senin'

  const devBypassGate = searchParams.get('dev_bypass_gate') === '1'


  const [child, setChild] = useState<ChildWithSchool | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionResult, setSessionResult] = useState<{
    correctItems: number
    totalItems: number
    levelTerbuka: boolean
  } | null>(null)

  const [gameInstanceKey, setGameInstanceKey] = useState(0)

  // Urutan gate: senin → rabu → jumat → tantangan
  // Tantangan terbuka setelah jumat selesai (boleh hari yang sama)
  // Weekend bebas mainkan tantangan berulang tanpa batas
  const URUTAN_HARI = ['senin', 'rabu', 'jumat', 'tantangan']
  const [gateStatus, setGateStatus] = useState<'checking' | 'terbuka' | 'terkunci'>('checking')

  useEffect(() => {
    if (!childId) return
    let isMounted = true

    async function loadChild() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('children')
        .select(
          `
          id,
          name,
          class_id,
          classes (
            school_id,
            schools (
              id,
              name,
              color_palette
            )
          )
        `
        )
        .eq('id', childId)
        .single()

      if (fetchError || !data) {
        if (isMounted) {
          setError('Gagal memuat data anak. Pastikan ID anak valid dan relasi class/school terisi.')
          setLoading(false)
        }
        return
      }

      if (isMounted) {
        setChild(data as unknown as ChildWithSchool)
        setLoading(false)
      }
    }

    loadChild()
    return () => { isMounted = false }
  }, [childId])

  useEffect(() => {
    if (!childId || !child) return
    let isMounted = true

    async function cekGate() {
      setGateStatus('checking')

      if (devBypassGate) {
        if (isMounted) setGateStatus('terbuka')
        return
      }

      const hariEfektif = hari

      // Senin selalu terbuka
      const indexHariIni = URUTAN_HARI.indexOf(hariEfektif)
      if (indexHariIni <= 0) {
        if (isMounted) setGateStatus('terbuka')
        return
      }

      const hariSebelumnyaKey = HARI_KE_MECHANIC_KEY[URUTAN_HARI[indexHariIni - 1]]
      if (!hariSebelumnyaKey) {
        if (isMounted) setGateStatus('terkunci')
        return
      }

      const { data, error: gateErr } = await supabase
        .from('game_sessions')
        .select(
          `
          played_at,
          game_content_variants (
            game_mechanic_levels ( level_key )
          )
        `
        )
        .eq('child_id', childId)
        .eq('game_key', 'dunia_warna')

      if (gateErr || !data) {
        if (isMounted) setGateStatus('terkunci')
        return
      }

      const hariIni = new Date().toDateString()

      // Untuk gate Senin→Rabu→Jumat: harus hari BERBEDA (anak belajar sequencing hari)
      // Untuk gate Jumat→Tantangan: boleh hari yang SAMA (tantangan reward langsung)
      const isTantangan = hariEfektif === 'tantangan'

      const sudahSelesai = (data as unknown as Array<{
        played_at: string
        game_content_variants: { game_mechanic_levels: { level_key: string } } | null
      }>).some((sesi) => {
        const levelKeySesi = sesi.game_content_variants?.game_mechanic_levels?.level_key
        if (levelKeySesi !== hariSebelumnyaKey) return false
        const tanggalSesi = new Date(sesi.played_at).toDateString()
        // Tantangan: cukup jumat pernah selesai kapan saja (hari sama boleh)
        // Rabu/Jumat: harus di hari BERBEDA dari sekarang
        return isTantangan ? true : tanggalSesi !== hariIni
      })

      if (isMounted) setGateStatus(sudahSelesai ? 'terbuka' : 'terkunci')
    }

    cekGate()
    return () => { isMounted = false }
  }, [childId, child, hari, devBypassGate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      <p style={{color:"red",fontSize:20}}>WEEK:{String(currentWeekForGame)}</p>
      </div>
    )
  }

  if (error || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-sm opacity-70">{error ?? 'Data anak tidak ditemukan.'}</p>
      </div>
    )
  }

  const paletteKey = child.classes?.schools?.color_palette ?? 'palette_1'
  const colors = colorPalettes[paletteKey] ?? colorPalettes['palette_1']

  // Config per bulan berdasarkan minggu aktif anak
  // Minggu 1-4 = dunia_warna, Minggu 5-8 = dunia_bentuk, dst
  const [currentWeekForGame, setCurrentWeekForGame] = useState<number | null>(null)
  useEffect(() => {
    supabase
      .from('game_sessions')
      .select('week_number, game_key')
      .eq('child_id', child.id)
      .order('week_number', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const w = data?.[0]?.week_number ?? 1
        setCurrentWeekForGame(w)
      })
  }, [child.id])

  const getGameConfig = (minggu: number): { gameKey: string; atributUcapan: Record<string, string> } => {
    if (minggu <= 4) return {
      gameKey: 'dunia_warna',
      atributUcapan: {
        merah: 'merah', kuning: 'kuning', biru: 'biru',
        hijau: 'hijau', oranye: 'oranye', ungu: 'ungu',
      }
    }
    if (minggu <= 8) return {
      gameKey: 'dunia_bentuk',
      atributUcapan: {
        lingkaran: 'lingkaran', persegi: 'persegi', segitiga: 'segitiga',
      }
    }
    if (minggu <= 12) return {
      gameKey: 'dunia_ukuran',
      atributUcapan: {
        besar: 'besar', kecil: 'kecil', panjang: 'panjang',
        pendek: 'pendek', tinggi: 'tinggi', rendah: 'rendah',
      }
    }
    return { gameKey: 'dunia_warna', atributUcapan: {} }
  }

  const gameConfig = getGameConfig(currentWeekForGame ?? 1)
  console.log("DEBUG gameConfig:", currentWeekForGame, gameConfig.gameKey, JSON.stringify(gameConfig))


  if (sessionResult) {
    return (
      <div
        style={{ backgroundColor: colors.background, color: colors.text }}
        className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
      >
        <div style={{ backgroundColor: colors.primary }} className="w-24 h-24 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm opacity-60">
          {sessionResult.correctItems}/{sessionResult.totalItems}
        </p>
        <button
          onClick={() => {
            setSessionResult(null)
            setGameInstanceKey((k) => k + 1)
          }}
          style={{ backgroundColor: colors.accent }}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          aria-label="Main lagi"
        >
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none">
            <path d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0 1 14.6-4.6M20 14a8 8 0 0 1-14.6 4.6"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>
    )
  }

  if (gateStatus === 'checking') {
    return (
      <div style={{ backgroundColor: colors.background }} className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      </div>
    )
  }

  if (gateStatus === 'terkunci') {
    return (
      <div style={{ backgroundColor: colors.background, color: colors.text }}
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div style={{ backgroundColor: colors.secondary }} className="w-24 h-24 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke={colors.text} strokeWidth="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={colors.text} strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <p className="text-sm opacity-60">
          Permainan ini terbuka setelah menyelesaikan sesi sebelumnya.
        </p>
      </div>
    )
  }

  if (hari === 'rabu') {
    return (
      <GameDuniaWarnaTapDistractor
        key={gameInstanceKey}
        childId={child.id}
        childName={child.name}
        colors={colors}
        gameKey={gameConfig.gameKey}
        atributUcapan={gameConfig.atributUcapan}
        onSessionComplete={setSessionResult}
      />
    )
  }

  if (hari === 'jumat') {
    return (
      <GameDuniaWarnaSort2Warna
        key={gameInstanceKey}
        childId={child.id}
        childName={child.name}
        colors={colors}
        gameKey={gameConfig.gameKey}
        atributUcapan={gameConfig.atributUcapan}
        onSessionComplete={setSessionResult}
      />
    )
  }

  if (hari === 'tantangan') {
    return (
      <GameDuniaWarnaSort6Warna
        key={gameInstanceKey}
        childId={child.id}
        childName={child.name}
        colors={colors}
        gameKey={gameConfig.gameKey}
        atributUcapan={gameConfig.atributUcapan}
        onSessionComplete={setSessionResult}
      />
    )
  }

  return (
    <GameDuniaWarnaTapTarget
      key={gameInstanceKey}
      childId={child.id}
      childName={child.name}
      colors={colors}
      gameKey={gameConfig.gameKey}
      atributUcapan={gameConfig.atributUcapan}
      onSessionComplete={setSessionResult}
    />
  )
}

export default function MainGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
        </div>
      }
    >
      <MainGameContent />
    </Suspense>
  )
}
