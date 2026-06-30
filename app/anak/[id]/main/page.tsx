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
import GameDuniaWarnaFreeplay from '@/components/games/GameDuniaWarnaFreeplay'

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

// Next.js App Router MENGHARUSKAN useSearchParams dibungkus <Suspense>,
// kalau tidak akan error saat build/render. Logika utama dipindah ke
// komponen dalam (MainGameContent), export default di bawah hanya
// membungkusnya dengan Suspense.
function MainGameContent() {
  const params = useParams<{ id: string }>()
  const childId = params.id

  const searchParams = useSearchParams()

  // ?hari=senin|rabu|jumat - menggantikan ?level=1|2|3 yang LAMA dan
  // membingungkan secara istilah. "Level" sebelumnya merujuk ke MEKANIK
  // per hari dalam 1 minggu yang sama (tap_target=Senin, tap_distractor=
  // Rabu, sort_2_warna=Jumat) - BUKAN level yang naik sepanjang bulan
  // seperti yang biasanya dipahami dari kata "level". Struktur sebenarnya:
  // 1 bulan = 4 minggu (1 minggu = 1 tema warna), 1 minggu = 3 hari main
  // (variasi mekanik tap_target->tap_distractor->sort_2_warna, 3 repetisi
  // tiap hari) + 1 weekend freeplay (gabungan random ketiganya).
  const HARI_KE_MECHANIC_KEY: Record<string, string> = {
    senin: 'tap_target',
    rabu: 'tap_distractor',
    jumat: 'sort_2_warna',
    tantangan: 'sort_6_warna',
  }
  const hariParam = searchParams.get('hari') ?? 'senin'
  const hari = hariParam in HARI_KE_MECHANIC_KEY ? hariParam : 'senin'

  // KHUSUS DEVELOPMENT/TESTING: ?dev_bypass_gate=1 melewati pengecekan
  // gate hari-kalender, supaya tidak perlu menunggu hari sungguhan
  // berganti untuk test mekanik berikutnya. Sesi TETAP tersimpan normal
  // ke game_sessions seperti biasa - hanya pengecekan gate yang dilewati.
  // TODO: hapus/lindungi param ini sebelum production (mis. cek env
  // NODE_ENV !== 'production' juga), supaya tidak bisa dipakai user asli
  // untuk melewati gate sungguhan.
  const devBypassGate = searchParams.get('dev_bypass_gate') === '1'

  // Weekend Freeplay: ?mode=freeplay - terpisah total dari logika
  // hari/gate di bawah, sesuai PRD (tanpa skor, tanpa limit waktu,
  // tanpa pencatatan).
  const isFreeplay = searchParams.get('mode') === 'freeplay'

  const [child, setChild] = useState<ChildWithSchool | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionResult, setSessionResult] = useState<{
    correctItems: number
    totalItems: number
    levelTerbuka: boolean
  } | null>(null)

  // BUG FIX: tombol "main lagi" cuma setSessionResult(null), tapi React
  // TIDAK akan remount komponen game hanya karena itu (useEffect loadContent
  // di komponen game bergantung ke [childId], yang tidak berubah). Tanpa
  // key prop ini, komponen akan tetap menampilkan state lama yang sudah
  // "selesai", bukan mulai sesi baru. gameInstanceKey di-increment setiap
  // kali "main lagi" ditekan, dipasang sebagai key prop di semua render
  // komponen game di bawah - ini memaksa React unmount+remount total.
  const [gameInstanceKey, setGameInstanceKey] = useState(0)

  // Gate berbasis HARI KALENDER (bukan jumlah sesi): mekanik hari ini
  // hanya terbuka jika mekanik hari SEBELUMNYA sudah pernah dituntaskan
  // di hari kalender YANG BERBEDA dari hari ini - mencegah loncat
  // mekanik dalam 1x duduk yang sama. Mekanik yang SUDAH terbuka boleh
  // diulang berkali-kali di hari yang sama (gate hanya menahan
  // LONCATAN, bukan pengulangan).
  const URUTAN_HARI = ['senin', 'rabu', 'jumat', 'tantangan']
  const [gateStatus, setGateStatus] = useState<'checking' | 'terbuka' | 'terkunci'>('checking')

  useEffect(() => {
    if (!childId) return
    let isMounted = true

    async function loadChild() {
      setLoading(true)
      setError(null)

      // Rantai relasi: children -> classes -> schools
      // Diperlukan untuk dapat color_palette sekolah, supaya game
      // ikut tema visual sekolah tempat anak ini terdaftar.
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
          setError(
            'Gagal memuat data anak. Pastikan ID anak valid dan relasi class/school terisi.'
          )
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
    return () => {
      isMounted = false
    }
  }, [childId])

  // Cek gate setelah child ter-load DAN hari (dari query param) diketahui.
  useEffect(() => {
    if (!childId || !child) return
    let isMounted = true

    async function cekGate() {
      setGateStatus('checking')

      if (devBypassGate) {
        if (isMounted) setGateStatus('terbuka')
        return
      }

      // Senin selalu terbuka, tidak ada prasyarat.
      const indexHariIni = URUTAN_HARI.indexOf(hari)
      if (indexHariIni <= 0) {
        if (isMounted) setGateStatus('terbuka')
        return
      }

      const hariSebelumnyaKey = HARI_KE_MECHANIC_KEY[URUTAN_HARI[indexHariIni - 1]]
      if (!hariSebelumnyaKey) {
        if (isMounted) setGateStatus('terkunci')
        return
      }

      // Ambil sesi game_sessions milik anak ini, join ke content_variant
      // -> mechanic_level untuk tahu level_key apa yang sebenarnya dimainkan
      // di tiap sesi (game_sessions sendiri tidak simpan level_key langsung).
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
      const pernahDiHariLain = (data as unknown as Array<{
        played_at: string
        game_content_variants: { game_mechanic_levels: { level_key: string } } | null
      }>).some((sesi) => {
        const levelKeySesi = sesi.game_content_variants?.game_mechanic_levels?.level_key
        if (levelKeySesi !== hariSebelumnyaKey) return false
        const tanggalSesi = new Date(sesi.played_at).toDateString()
        return tanggalSesi !== hariIni
      })

      if (isMounted) setGateStatus(pernahDiHariLain ? 'terbuka' : 'terkunci')
    }

    cekGate()
    return () => {
      isMounted = false
    }
  }, [childId, child, hari, devBypassGate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      </div>
    )
  }

  if (error || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-sm opacity-70">
          {error ?? 'Data anak tidak ditemukan.'}
        </p>
      </div>
    )
  }

  const paletteKey = child.classes?.schools?.color_palette ?? 'palette_1'
  const colors = colorPalettes[paletteKey] ?? colorPalettes['palette_1']

  // Weekend Freeplay - TIDAK terikat gate, hari, atau sessionResult sama
  // sekali. Render langsung di sini, return lebih dulu sebelum semua
  // logika di bawah (yang khusus untuk sesi harian terstruktur).
  if (isFreeplay) {
    return (
      <GameDuniaWarnaFreeplay childId={child.id} childName={child.name} colors={colors} />
    )
  }

  // Setelah 1 sesi selesai (3 repetisi + bonus, lihat catatan jumlah
  // repetisi terbaru di komponen game), tampilkan layar selesai. TIDAK
  // ada lagi tombol "lanjut tingkat berikutnya" di sini - dengan gate
  // berbasis hari kalender, tuntas hari ini TIDAK PERNAH membuka tingkat
  // baru pada hari yang sama (itu justru bertentangan dengan gate yang
  // baru ditetapkan). Tingkat berikutnya otomatis terbuka besok, dicek
  // ulang oleh useEffect cekGate di atas saat anak kembali bermain.
  if (sessionResult) {
    return (
      <div
        style={{ backgroundColor: colors.background, color: colors.text }}
        className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
      >
        <div
          style={{ backgroundColor: colors.primary }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-sm opacity-60">
          {sessionResult.correctItems}/{sessionResult.totalItems}
        </p>

        {/* Tombol "main lagi" - menyalurkan excitement anak yang ingin
            lanjut TANPA mengganggu logic gate. Klik ini cuma reset
            sessionResult, kembali ke komponen game tingkat yang SAMA
            (yang sudah terbuka) - pilihPutaranBerbobot otomatis pilih
            variasi warna/objek BARU (weighted random, prioritaskan yang
            akurasinya masih rendah), bukan mengulang identik. Ini cara
            internalisasi terjadi alami lewat repetisi-variatif, sesuai
            riset spaced-repetition yang sudah jadi basis sejak awal -
            BUKAN dengan membongkar urutan hari/gate. */}
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
            <path
              d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0 1 14.6-4.6M20 14a8 8 0 0 1-14.6 4.6"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      </div>
    )
  }

  if (gateStatus === 'checking') {
    return (
      <div
        style={{ backgroundColor: colors.background }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      </div>
    )
  }

  // Gate terkunci: tingkat sebelumnya belum pernah dituntaskan di hari
  // kalender yang berbeda dari hari ini. Tampilan non-teks (ikon gembok
  // terkunci) sesuai prinsip UI anak, dengan teks kecil untuk guru/orang
  // tua yang mendampingi.
  if (gateStatus === 'terkunci') {
    return (
      <div
        style={{ backgroundColor: colors.background, color: colors.text }}
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <div
          style={{ backgroundColor: colors.secondary }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke={colors.text} strokeWidth="2" />
            <path
              d="M8 11V7a4 4 0 0 1 8 0v4"
              stroke={colors.text}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <p className="text-sm opacity-60">
          Permainan ini terbuka besok, setelah hari sebelumnya selesai hari ini.
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