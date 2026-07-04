// FILE PATH: app/anak/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { colorPalettes } from '@/config/colorPalettes'

type ChildWithSchool = {
  id: string
  name: string
  photo_url: string | null
  classes: {
    schools: {
      color_palette: string
    }
  }
}

type HariStatus = 'terbuka' | 'terkunci' | 'selesai'

type DashboardStatus = {
  senin: HariStatus
  rabu: HariStatus
  jumat: HariStatus
  tantangan: HariStatus
}

// Warna tombol tiap hari — konsisten dengan warna yang dipelajari anak di game
const HARI_WARNA: Record<string, string> = {
  senin: '#E8001C',
  rabu: '#FFD700',
  jumat: '#0057FF',
  tantangan: '#00B300',
}

// Foto objek familiar per hari — diambil dari bank gambar yang sudah dikenal anak
const HARI_FOTO: Record<string, string> = {
  senin: '/images/objek/apel.png',
  rabu: '/images/objek/pisang.png',
  jumat: '/images/objek/balon_biru.png',
  tantangan: '/images/objek/katak.png',
}

// Warna teks per hari (kuning butuh teks gelap supaya kontras)
const HARI_TEKS_WARNA: Record<string, string> = {
  senin: '#ffffff',
  rabu: '#5a4200',
  jumat: '#ffffff',
  tantangan: '#ffffff',
}

const HARI_LABEL: Record<string, string> = {
  senin: 'Senin',
  rabu: 'Rabu',
  jumat: 'Jumat',
  tantangan: 'Tantangan',
}

const HARI_DESKRIPSI: Record<string, string> = {
  senin: 'Kenali warna',
  rabu: 'Bedakan warna',
  jumat: 'Sortir warna',
  tantangan: 'Semua warna',
}

const HARI_LABEL_AUDIO: Record<string, string> = {
  senin: 'Senin',
  rabu: 'Rabu',
  jumat: 'Jumat',
  tantangan: 'Tantangan',
}

const MECHANIC_KEY: Record<string, string> = {
  senin: 'tap_target',
  rabu: 'tap_distractor',
  jumat: 'sort_2_warna',
  tantangan: 'sort_6_warna',
}

const URUTAN_HARI = ['senin', 'rabu', 'jumat', 'tantangan']

// Info orang tua per hari
const INFO_ORTU: Record<string, { judul: string; manfaat: string; riset: string }> = {
  senin: {
    judul: 'Senin — Kenali Warna',
    manfaat: 'Anak belajar mengenali 1 warna target di antara benda abu-abu. Fondasi pertama sebelum membedakan warna satu sama lain.',
    riset: 'Riset Kokotree: anak usia 4-5 tahun butuh 5-10 repetisi untuk menguasai konsep baru. Setiap sesi 3 repetisi membangun memori jangka panjang secara bertahap.',
  },
  rabu: {
    judul: 'Rabu — Bedakan Warna',
    manfaat: 'Tingkat lebih sulit: anak membedakan warna target dari benda abu-abu dengan bentuk berbeda. Melatih fokus ke warna, bukan bentuk.',
    riset: 'Prinsip spaced-repetition (Settles & Meeder): materi yang akurasinya rendah otomatis lebih sering muncul, mempercepat penguasaan.',
  },
  jumat: {
    judul: 'Jumat — Sortir Warna',
    manfaat: 'Anak menyortir benda ke keranjang warna yang tepat. Melatih kategorisasi — keterampilan dasar matematika dan logika.',
    riset: 'Bornstein (1985): kategorisasi warna primer vs sekunder mulai dikuasai usia 4-5 tahun, persis usia target TKA.',
  },
  tantangan: {
    judul: 'Tantangan & Weekend — Eksplorasi Bebas',
    manfaat: 'Semua warna yang sudah dipelajari hadir sekaligus. Anak bermain bebas tanpa tekanan — proses internalisasi terjadi secara alami lewat pengulangan yang menyenangkan.',
    riset: 'Mayer & Moreno: variasi tempo dalam sesi belajar meningkatkan keterlibatan. Tantangan memberi puncak kegembiraan setelah disiplin weekday.',
  },
}

export default function DashboardAnak() {
  const params = useParams<{ id: string }>()
  const childId = params.id
  const router = useRouter()

  const [child, setChild] = useState<ChildWithSchool | null>(null)
  const [status, setStatus] = useState<DashboardStatus>({
    senin: 'checking' as HariStatus,
    rabu: 'checking' as HariStatus,
    jumat: 'checking' as HariStatus,
    tantangan: 'checking' as HariStatus,
  })
  const [loading, setLoading] = useState(true)
  const [showInfoOrtu, setShowInfoOrtu] = useState(false)
  const [sudahGreeting, setSudahGreeting] = useState(false)
  const [mingguAktif, setMingguAktif] = useState(1)

  const ucapkan = useCallback((teks: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd?.()
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(teks)
    utterance.lang = 'id-ID'
    utterance.rate = 0.85
    utterance.pitch = 1.1
    if (onEnd) utterance.onend = onEnd
    window.speechSynthesis.speak(utterance)
  }, [])

  useEffect(() => {
    if (!childId) return
    let isMounted = true

    async function loadDashboard() {
      setLoading(true)

      // Ambil data anak
      const { data: childData } = await supabase
        .from('children')
        .select('id, name, photo_url, classes(schools(color_palette))')
        .eq('id', childId)
        .single()

      if (!childData || !isMounted) return
      setChild(childData as unknown as ChildWithSchool)

      // Ambil semua sesi anak untuk cek gate dan minggu aktif
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select(`
          played_at,
          week_number,
          game_content_variants (
            game_mechanic_levels ( level_key )
          )
        `)
        .eq('child_id', childId)
        .eq('game_key', 'dunia_warna')
        .order('played_at', { ascending: false })

      if (!isMounted) return

      const sessionList = (sessions ?? []) as unknown as Array<{
        played_at: string
        week_number: number
        game_content_variants: { game_mechanic_levels: { level_key: string } } | null
      }>

      // Minggu aktif
      const maxWeek = sessionList.length > 0
        ? Math.max(...sessionList.map(s => s.week_number))
        : 1
      setMingguAktif(maxWeek)

      const hariIni = new Date().toDateString()

      // Hitung status tiap hari
      const hitungStatus = (hariKey: string): HariStatus => {
        const levelKey = MECHANIC_KEY[hariKey]
        const indexHari = URUTAN_HARI.indexOf(hariKey)

        // Senin selalu terbuka
        if (indexHari === 0) {
          const selesaiHariIni = sessionList.some(s =>
            s.game_content_variants?.game_mechanic_levels?.level_key === levelKey &&
            new Date(s.played_at).toDateString() === hariIni
          )
          return selesaiHariIni ? 'selesai' : 'terbuka'
        }

        // Cek apakah hari sebelumnya sudah selesai
        const hariSebelumnyaKey = MECHANIC_KEY[URUTAN_HARI[indexHari - 1]]
        const isTantangan = hariKey === 'tantangan'

        const hariSebelumnyaSelesai = sessionList.some(s => {
          const levelKeySesi = s.game_content_variants?.game_mechanic_levels?.level_key
          if (levelKeySesi !== hariSebelumnyaKey) return false
          const tanggalSesi = new Date(s.played_at).toDateString()
          return isTantangan ? true : tanggalSesi !== hariIni
        })

        if (!hariSebelumnyaSelesai) return 'terkunci'

        // Sudah selesai hari ini?
        const selesaiHariIni = sessionList.some(s =>
          s.game_content_variants?.game_mechanic_levels?.level_key === levelKey &&
          new Date(s.played_at).toDateString() === hariIni
        )
        // Tantangan boleh diulang terus
        return (selesaiHariIni && hariKey !== 'tantangan') ? 'selesai' : 'terbuka'
      }

      const statusBaru: DashboardStatus = {
        senin: hitungStatus('senin'),
        rabu: hitungStatus('rabu'),
        jumat: hitungStatus('jumat'),
        tantangan: hitungStatus('tantangan'),
      }

      setStatus(statusBaru)
      setLoading(false)
    }

    loadDashboard()
    return () => { isMounted = false }
  }, [childId])

  // Greeting audio saat pertama load
  useEffect(() => {
    if (loading || !child || sudahGreeting) return
    setSudahGreeting(true)
    const nama = child.name?.trim() || 'adik'

    // Cek hari mana yang terbuka hari ini
    const hariTerbuka = URUTAN_HARI.find(h =>
      status[h as keyof DashboardStatus] === 'terbuka'
    )

    const greeting = `Halo ${nama}!`
    const instruksi = hariTerbuka
      ? `Hari ini waktunya main ${HARI_LABEL_AUDIO[hariTerbuka]}!`
      : 'Semua tugas hari ini sudah selesai. Hebat!'

    setTimeout(() => {
      ucapkan(greeting, () => {
        setTimeout(() => ucapkan(instruksi), 300)
      })
    }, 500)
  }, [loading, child, sudahGreeting, status, ucapkan])

  const handleTapHari = (hari: string) => {
    const s = status[hari as keyof DashboardStatus]

    if (s === 'terkunci') {
      const indexHari = URUTAN_HARI.indexOf(hari)
      const hariSebelumnya = URUTAN_HARI[indexHari - 1]
      ucapkan(`Selesaikan ${HARI_LABEL_AUDIO[hariSebelumnya]} dulu ya!`)
      return
    }

    ucapkan(`Ayo main ${HARI_LABEL_AUDIO[hari]}!`, () => {
      const route = hari === 'tantangan'
        ? `/anak/${childId}/main?mode=freeplay`
        : `/anak/${childId}/main?hari=${hari}`
      router.push(route)
    })
  }

  if (loading || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
      </div>
    )
  }

  const paletteKey = (child as any).classes?.schools?.color_palette ?? 'palette_1'
  const colors = colorPalettes[paletteKey] ?? colorPalettes['palette_1']

  // Hitung bintang: berapa hari yang sudah selesai minggu ini
  const bintangSelesai = URUTAN_HARI.filter(h =>
    status[h as keyof DashboardStatus] === 'selesai'
  ).length

  return (
    <div
      style={{ backgroundColor: colors.background, color: colors.text }}
      className="min-h-screen flex flex-col select-none overflow-hidden"
    >
      {/* Header: nama anak + toggle info ortu */}
      <div className="flex items-center justify-between px-6 pt-8 pb-2">
        <div className="flex items-center gap-3">
          {/* Avatar: foto anak kalau ada, inisial sebagai fallback */}
          <div
            style={{ backgroundColor: colors.primary }}
            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold"
          >
            {child.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={child.photo_url}
                alt={child.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>{child.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span
            style={{ color: colors.text, fontSize: 20, fontWeight: 700 }}
          >
            {child.name.split(' ')[0]}
          </span>
        </div>

        {/* Toggle info orang tua */}
        <button
          onClick={() => setShowInfoOrtu(!showInfoOrtu)}
          style={{
            backgroundColor: showInfoOrtu ? colors.accent : colors.secondary,
            color: showInfoOrtu ? 'white' : colors.text,
          }}
          className="px-4 py-2 rounded-full text-xs font-medium transition-colors"
          aria-label="Info untuk orang tua"
        >
          {showInfoOrtu ? 'Tutup Info' : 'Info Ortu'}
        </button>
      </div>

      {/* Indikator minggu aktif */}
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(m => (
            <div
              key={m}
              style={{
                backgroundColor: m <= mingguAktif ? colors.primary : colors.secondary,
                opacity: m <= mingguAktif ? 1 : 0.3,
                width: m === mingguAktif ? 24 : 8,
              }}
              className="h-2 rounded-full transition-all duration-300"
            />
          ))}
        </div>
        <span style={{ color: colors.text, opacity: 0.5, fontSize: 12 }}>
          Minggu {mingguAktif}
        </span>
      </div>

      {/* Bintang progress hari ini */}
      <div className="flex gap-2 px-6 pb-4">
        {URUTAN_HARI.map((_, i) => (
          <span key={i} style={{ fontSize: 24, opacity: i < bintangSelesai ? 1 : 0.2 }}>
            ⭐
          </span>
        ))}
      </div>

      {/* Tombol hari — satu kolom vertikal, urutan atas ke bawah */}
      <div className="flex flex-col gap-3 px-4 pb-6">
        {URUTAN_HARI.map((hari) => {
          const s = status[hari as keyof DashboardStatus]
          const terbuka = s !== 'terkunci'
          const selesai = s === 'selesai'
          const warnaTombol = HARI_WARNA[hari]
          const warnaTeks = HARI_TEKS_WARNA[hari]

          return (
            <button
              key={hari}
              onClick={() => handleTapHari(hari)}
              style={{
                backgroundColor: warnaTombol,
                opacity: terbuka ? 1 : 0.4,
                minHeight: 80,
              }}
              className="relative w-full rounded-2xl flex items-center gap-4 px-5 py-4 transition-transform active:scale-95"
            >
              {/* Foto objek familiar */}
              <div
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HARI_FOTO[hari]}
                  alt={HARI_LABEL[hari]}
                  style={{
                    width: 44,
                    height: 44,
                    objectFit: 'contain',
                    filter: terbuka ? 'none' : 'grayscale(1)',
                  }}
                />
              </div>

              {/* Label + deskripsi */}
              <div className="flex flex-col items-start flex-1">
                <span style={{ color: `${warnaTeks}99`, fontSize: 12, marginBottom: 2 }}>
                  {HARI_LABEL[hari]}
                </span>
                <span style={{ color: warnaTeks, fontSize: 17, fontWeight: 600 }}>
                  {HARI_DESKRIPSI[hari]}
                </span>
              </div>

              {/* Status: centang / gembok / panah */}
              {selesai ? (
                <div
                  style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                    <path d="M5 13l4 4L19 7" stroke={warnaTombol} strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : !terbuka ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" className="flex-shrink-0">
                  <rect x="5" y="11" width="14" height="9" rx="2"
                    stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"
                    stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" className="flex-shrink-0">
                  <path d="M9 18l6-6-6-6"
                    stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}

              {/* Pulse border untuk hari aktif yang belum selesai */}
              {terbuka && !selesai && (
                <div
                  style={{ borderColor: 'rgba(255,255,255,0.6)' }}
                  className="absolute inset-0 rounded-2xl border-2 animate-pulse pointer-events-none"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Panel info orang tua — slide up dari bawah */}
      {showInfoOrtu && (
        <div
          style={{ backgroundColor: colors.background, borderTop: `2px solid ${colors.secondary}` }}
          className="px-6 py-6 space-y-4 max-h-[50vh] overflow-y-auto"
        >
          <p style={{ color: colors.text, fontWeight: 700, fontSize: 16 }}>
            Untuk Orang Tua
          </p>
          <p style={{ color: colors.text, opacity: 0.6, fontSize: 13, lineHeight: 1.6 }}>
            Minggu {mingguAktif} dari 4 — setiap minggu memperkenalkan warna baru dengan 4 tingkat kesulitan yang meningkat secara bertahap.
          </p>

          {URUTAN_HARI.map(hari => {
            const info = INFO_ORTU[hari]
            const s = status[hari as keyof DashboardStatus]
            return (
              <div
                key={hari}
                style={{
                  backgroundColor: colors.secondary,
                  opacity: s === 'terkunci' ? 0.5 : 1,
                }}
                className="rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={HARI_FOTO[hari]} alt={HARI_LABEL[hari]} style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  <span style={{ color: colors.text, fontWeight: 600, fontSize: 14 }}>
                    {info.judul}
                  </span>
                  {s === 'selesai' && (
                    <span style={{ color: colors.accent, fontSize: 12, marginLeft: 'auto' }}>
                      ✓ Selesai
                    </span>
                  )}
                </div>
                <p style={{ color: colors.text, opacity: 0.7, fontSize: 13, lineHeight: 1.5 }}>
                  {info.manfaat}
                </p>
                <p style={{ color: colors.text, opacity: 0.5, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' }}>
                  {info.riset}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse { animation: none; }
        }
      `}</style>
    </div>
  )
}