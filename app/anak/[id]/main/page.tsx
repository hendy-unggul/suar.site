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
  classes: {
    schools: {
      color_palette: string
    }
  }
}

type GameConfig = {
  gameKey: string
  atributUcapan: Record<string, string>
  atributLabel: string
}

function getGameConfig(minggu: number): GameConfig {
  if (minggu <= 4) return {
    gameKey: 'dunia_warna',
    atributLabel: 'warna',
    atributUcapan: { merah: 'merah', kuning: 'kuning', biru: 'biru', hijau: 'hijau', oranye: 'oranye', ungu: 'ungu' }
  }
  if (minggu <= 8) return {
    gameKey: 'dunia_bentuk',
    atributLabel: 'bentuk',
    atributUcapan: { lingkaran: 'lingkaran', persegi: 'persegi', segitiga: 'segitiga' }
  }
  if (minggu <= 12) return {
    gameKey: 'dunia_ukuran',
    atributLabel: 'ukuran',
    atributUcapan: { besar: 'besar', kecil: 'kecil', panjang: 'panjang', pendek: 'pendek', tinggi: 'tinggi', rendah: 'rendah' }
  }
  return { gameKey: 'dunia_warna', atributLabel: 'warna', atributUcapan: {} }
}

const HARI_KE_MECHANIC_KEY: Record<string, string> = {
  senin: 'tap_target',
  rabu: 'tap_distractor',
  jumat: 'sort_2_warna',
  tantangan: 'sort_6_warna',
}

const URUTAN_HARI = ['senin', 'rabu', 'jumat', 'tantangan']

function MainGameContent() {
  const params = useParams<{ id: string }>()
  const childId = params.id
  const searchParams = useSearchParams()

  const hariParam = searchParams.get('hari') ?? 'senin'
  const hari = hariParam in HARI_KE_MECHANIC_KEY ? hariParam : 'senin'
  const devBypassGate = !!searchParams.get('dev_bypass_gate')

  // ALL HOOKS FIRST — no conditional returns before this
  const [child, setChild] = useState<ChildWithSchool | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gateStatus, setGateStatus] = useState<'checking' | 'terbuka' | 'terkunci'>('checking')
  const [currentWeek, setCurrentWeek] = useState(1)
  const [sessionResult, setSessionResult] = useState<{ correctItems: number; totalItems: number; levelTerbuka: boolean } | null>(null)
  const [gameInstanceKey, setGameInstanceKey] = useState(0)

  // Load child data
  useEffect(() => {
    if (!childId) return
    let isMounted = true

    supabase
      .from('children')
      .select('id, name, classes(schools(color_palette))')
      .eq('id', childId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return
        if (fetchError || !data) {
          setError('Gagal memuat data anak.')
          setLoading(false)
          return
        }
        setChild(data as unknown as ChildWithSchool)
        setLoading(false)
      })

    return () => { isMounted = false }
  }, [childId])

  // Load currentWeek dari game_sessions
  useEffect(() => {
    if (!childId) return
    supabase
      .from('game_sessions')
      .select('week_number')
      .eq('child_id', childId)
      .order('week_number', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const w = data?.[0]?.week_number ?? 1
        setCurrentWeek(w)
      })
  }, [childId])

  // Cek gate
  useEffect(() => {
    if (!childId || !child) return
    let isMounted = true

    async function cekGate() {
      setGateStatus('checking')

      if (devBypassGate) {
        if (isMounted) setGateStatus('terbuka')
        return
      }

      const indexHariIni = URUTAN_HARI.indexOf(hari)
      if (indexHariIni <= 0) {
        if (isMounted) setGateStatus('terbuka')
        return
      }

      const hariSebelumnyaKey = HARI_KE_MECHANIC_KEY[URUTAN_HARI[indexHariIni - 1]]
      const isTantangan = hari === 'tantangan'
      const hariIni = new Date().toDateString()

      const { data } = await supabase
        .from('game_sessions')
        .select('played_at, game_content_variants(game_mechanic_levels(level_key))')
        .eq('child_id', childId)

      const sudahSelesai = (data ?? []).some((s: any) => {
        const levelKey = s.game_content_variants?.game_mechanic_levels?.level_key
        if (levelKey !== hariSebelumnyaKey) return false
        const tgl = new Date(s.played_at).toDateString()
        return isTantangan ? true : tgl !== hariIni
      })

      if (isMounted) setGateStatus(sudahSelesai ? 'terbuka' : 'terkunci')
    }

    cekGate()
    return () => { isMounted = false }
  }, [childId, child, hari, devBypassGate])

  // AFTER ALL HOOKS — now safe to have conditional returns
  const paletteKey = (child as any)?.classes?.schools?.color_palette ?? 'palette_1'
  const colors = colorPalettes[paletteKey] ?? colorPalettes['palette_1']
  const gameConfig = getGameConfig(currentWeek)

  console.log('DEBUG week/gameKey:', currentWeek, gameConfig.gameKey)

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f0f4f8' }} className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
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

  if (sessionResult) {
    return (
      <div style={{ backgroundColor: colors.background, color: colors.text }}
        className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div style={{ backgroundColor: colors.primary }}
          className="w-24 h-24 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm opacity-60">{sessionResult.correctItems}/{sessionResult.totalItems}</p>
        <button
          onClick={() => { setSessionResult(null); setGameInstanceKey(k => k + 1) }}
          style={{ backgroundColor: colors.accent }}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          aria-label="Main lagi">
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
      <div style={{ backgroundColor: colors.background }}
        className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      </div>
    )
  }

  if (gateStatus === 'terkunci') {
    return (
      <div style={{ backgroundColor: colors.background, color: colors.text }}
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div style={{ backgroundColor: colors.secondary }}
          className="w-24 h-24 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke={colors.text} strokeWidth="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={colors.text} strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <p className="text-sm opacity-60">Permainan ini terbuka setelah menyelesaikan sesi sebelumnya.</p>
      </div>
    )
  }

  const commonProps = {
    key: gameInstanceKey,
    childId: child.id,
    childName: child.name,
    colors,
    gameKey: gameConfig.gameKey,
    atributUcapan: gameConfig.atributUcapan,
    atributLabel: gameConfig.atributLabel,
    onSessionComplete: setSessionResult,
  }

  if (hari === 'rabu') return <GameDuniaWarnaTapDistractor {...commonProps} />
  if (hari === 'jumat') return <GameDuniaWarnaSort2Warna {...commonProps} />
  if (hari === 'tantangan') return <GameDuniaWarnaSort6Warna {...commonProps} />
  return <GameDuniaWarnaTapTarget {...commonProps} />
}

export default function MainGamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      </div>
    }>
      <MainGameContent />
    </Suspense>
  )
}
