// FILE PATH: src/components/games/GameDuniaWarnaFreeplay.tsx
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ColorPalette } from '@/config/colorPalettes'

type Props = {
  childId: string
  childName: string
  colors: ColorPalette
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
}

function ObjekBuah({
  nama,
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
  const namaFile = nama.split('__netral_')[0].split('__distractor_')[0]
  return (
    <button
      onClick={onTap}
      aria-label={namaFile.replace(/_/g, ' ')}
      className={[
        'relative flex items-center justify-center transition-transform duration-300',
        state === 'idle' ? 'freeplay-buah-idle' : '',
        state === 'wrong' ? 'freeplay-buah-wrong' : '',
        state === 'correct' ? 'freeplay-buah-correct' : '',
      ].join(' ')}
      style={{ width: size, height: size, minWidth: 80, minHeight: 80 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/objek/${namaFile}.png`}
        alt={namaFile}
        draggable={false}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
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

      const warnaUnik = Array.from(new Set((riwayat ?? []).map((r) => r.warna_key as string)))

      if (warnaUnik.length === 0) {
        if (isMounted) setError('Belum ada warna yang dikenal. Selesaikan sesi harian dulu.')
        return
      }

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
        const putaranList = (v.asset_config?.putaran ?? []) as Array<{ warna_target?: string; objek?: string[] }>
        for (const p of putaranList) {
          if (!p.warna_target || !p.objek) continue
          if (!mapObjek[p.warna_target]) mapObjek[p.warna_target] = new Set()
          p.objek.forEach((o) => mapObjek[p.warna_target!].add(o))
        }
      }

      const objekFinal: Record<string, string[]> = {}
      warnaUnik.forEach((w) => { objekFinal[w] = Array.from(mapObjek[w] ?? []) })

      if (!isMounted) return
      setWarnaDikenal(warnaUnik)
      setObjekPerWarna(objekFinal)
      pilihAcakBaru(warnaUnik, objekFinal)
      setLoading(false)
    }

    loadDikenal()
    return () => { isMounted = false }
  }, [childId])

  function pilihAcakBaru(daftarWarna: string[], objekMap: Record<string, string[]>) {
    const warna = daftarWarna[Math.floor(Math.random() * daftarWarna.length)]
    const daftarObjek = objekMap[warna] ?? []
    const objek = daftarObjek.length ? daftarObjek[Math.floor(Math.random() * daftarObjek.length)] : 'apel'
    setWarnaAktif(warna)
    setObjekAktif(objek)

    const warnaLain = daftarWarna.filter((w) => w !== warna)
    if (warnaLain.length === 0) { setWarnaDistractor(null); return }
    const distractor = warnaLain[Math.floor(Math.random() * warnaLain.length)]
    const daftarObjekDistractor = objekMap[distractor] ?? []
    const objekD = daftarObjekDistractor.length
      ? daftarObjekDistractor[Math.floor(Math.random() * daftarObjekDistractor.length)]
      : 'apel'
    setWarnaDistractor(distractor)
    setObjekDistractor(objekD)
  }

  const ucapkan = useCallback((teks: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(teks)
    utterance.lang = 'id-ID'; utterance.rate = 0.85; utterance.pitch = 1.1
    window.speechSynthesis.speak(utterance)
  }, [])

  const [sudahGreeting, setSudahGreeting] = useState(false)
  useEffect(() => {
    if (!warnaAktif) return
    if (!sudahGreeting) {
      setSudahGreeting(true)
      const namaPanggilan = childName?.trim() || 'adik'
      const t1 = setTimeout(() => ucapkan(`Asyik, waktunya main bebas, ${namaPanggilan}!`), 300)
      const t2 = setTimeout(() => ucapkan(`Coba cari warna ${WARNA_UCAPAN[warnaAktif] ?? warnaAktif}!`), 2600)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    const timeout = setTimeout(() => ucapkan(`Coba cari warna ${WARNA_UCAPAN[warnaAktif] ?? warnaAktif}!`), 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warnaAktif, objekAktif])

  // 3 objek dari bank 24 file yang ada, tidak ada broken image:
  // 1. Target berwarna (mis. pisang)
  // 2. Distractor warna lain berwarna (mis. apel merah) — kalau anak
  //    baru kenal 1 warna, fallback ke target_abu
  // 3. Target versi abu (mis. pisang_abu) — selalu tersedia
  const objekTampil = warnaAktif
    ? [
        { nama: objekAktif, hex: WARNA_HEX[warnaAktif] ?? '#C9C7BE', isTarget: true },
        warnaDistractor
          ? { nama: `${objekDistractor}__distractor_${warnaDistractor}`, hex: WARNA_HEX[warnaDistractor] ?? '#C9C7BE', isTarget: false }
          : { nama: `${objekAktif}_abu__fallback`, hex: '#C9C7BE', isTarget: false },
        { nama: `${objekAktif}_abu`, hex: '#C9C7BE', isTarget: false },
      ]
    : []

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
      setTapState((s) => ({ ...s, [nama]: 'wrong' }))
      setTimeout(() => { setTapState((s) => ({ ...s, [nama]: 'idle' })) }, 400)
    }
  }

  if (loading) return (
    <div style={{ backgroundColor: colors.background }} className="min-h-[480px] flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-4 border-current opacity-20 animate-spin" />
    </div>
  )

  if (error || !warnaAktif) return (
    <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-[480px] flex items-center justify-center text-center px-6">
      <p className="text-sm opacity-70">{error}</p>
    </div>
  )

  return (
    <div style={{ backgroundColor: colors.background }} className="relative min-h-[480px] flex flex-col items-center justify-center gap-10 px-6 py-10 overflow-hidden select-none">
      <style>{`
        @keyframes freeplay-buah-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(3deg); } }
        .freeplay-buah-idle { animation: freeplay-buah-float 2.4s ease-in-out infinite; cursor: pointer; }
        .freeplay-buah-wrong { animation: freeplay-buah-shake 0.4s ease; }
        @keyframes freeplay-buah-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px) rotate(-4deg); } 75% { transform: translateX(8px) rotate(4deg); } }
        .freeplay-buah-correct { animation: freeplay-buah-pop 0.6s ease forwards; }
        @keyframes freeplay-buah-pop { 0% { transform: scale(1); } 40% { transform: scale(1.35) rotate(10deg); } 100% { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .freeplay-buah-idle, .freeplay-buah-wrong, .freeplay-buah-correct { animation: none; } }
      `}</style>

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