// FILE PATH: app/guru/anak/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Child = {
  id: string
  name: string
}

const NAMA_GURU = 'Bu Sari' // sementara hardcode, nanti dari sesi login guru

export default function CatatanAnakPage() {
  const params = useParams()
  const childId = params.id as string

  const [child, setChild] = useState<Child | null>(null)
  const [pencapaian, setPencapaian] = useState('')
  const [perluDidampingi, setPerluDidampingi] = useState('')
  const [saranRumah, setSaranRumah] = useState('')
  const [sertakanFreeplay, setSertakanFreeplay] = useState(false)

  const KALIMAT_FREEPLAY =
    'Ada juga mode "Main Bebas" di akhir pekan - tanpa skor, anak bisa bermain semua warna yang sudah dikenalnya sesuka hati. Ini bukan wajib, tapi sangat membantu agar warna yang sudah dipelajari makin melekat di ingatan ananda.'

  const [mode, setMode] = useState<'form' | 'preview' | 'terkirim'>('form')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchChild() {
      const { data } = await supabase
        .from('children')
        .select('id, name')
        .eq('id', childId)
        .single()
      setChild(data)
      setLoading(false)
    }
    fetchChild()
  }, [childId])

  function lihatPreview(e: React.FormEvent) {
    e.preventDefault()
    setMode('preview')
  }

  async function kirimCatatan() {
    if (!child) return

    const isiLengkap = `Pencapaian minggu ini: ${pencapaian}\n\nArea yang perlu didampingi: ${perluDidampingi}\n\nSaran aktivitas rumah: ${saranRumah}${
      sertakanFreeplay ? `\n\n${KALIMAT_FREEPLAY}` : ''
    }`

    const { error: insertError } = await supabase.from('teacher_notes').insert({
      child_id: child.id,
      teacher_id: '2695e333-fc4d-4f07-92c2-5424fb3a0d3d', // sementara dummy, nanti dari sesi login guru
      content: isiLengkap,
    })

    if (insertError) {
      setError('Gagal mengirim: ' + insertError.message)
      return
    }

    setMode('terkirim')
  }

  if (loading) {
    return <main className="max-w-xl mx-auto p-6 mt-10 text-center"><p>Memuat...</p></main>
  }

  if (!child) {
    return <main className="max-w-xl mx-auto p-6 mt-10 text-center"><p>Anak tidak ditemukan.</p></main>
  }

  return (
    <main className="max-w-xl mx-auto p-6 mt-10">
      <h1 className="text-2xl font-bold mb-1">Catatan Mingguan</h1>
      <p className="text-gray-500 mb-6">untuk {child.name}</p>

      {mode === 'form' && (
        <form onSubmit={lihatPreview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Pencapaian minggu ini
            </label>
            <textarea
              required
              value={pencapaian}
              onChange={(e) => setPencapaian(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Contoh: sangat antusias bermain dengan warna-warna baru"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Area yang perlu didampingi
            </label>
            <textarea
              required
              value={perluDidampingi}
              onChange={(e) => setPerluDidampingi(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Contoh: masih perlu beberapa kali latihan lagi untuk bentuk segitiga"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Saran aktivitas rumah
            </label>
            <textarea
              required
              value={saranRumah}
              onChange={(e) => setSaranRumah(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Contoh: ajak cari benda berbentuk segitiga di rumah"
            />
          </div>

          <div className="border border-blue-100 bg-blue-50 rounded-lg p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sertakanFreeplay}
                onChange={(e) => setSertakanFreeplay(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                <span className="font-medium">Sertakan anjuran Main Bebas (Weekend Freeplay)</span>
                <br />
                <span className="text-gray-500">
                  Riset menunjukkan anak usia ini butuh pengulangan berkali-kali untuk
                  benar-benar menguasai warna baru. Main Bebas membantu repetisi ini
                  terjadi tanpa terasa seperti tugas — orang tua yang sadar manfaatnya
                  lebih cenderung mendorong anak memainkannya.
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
          >
            Lihat Preview Sebelum Kirim
          </button>
        </form>
      )}

      {mode === 'preview' && (
        <div>
          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-400 mb-2">
              Pratinjau — beginilah pesan ini akan terlihat oleh orang tua
            </p>
            <div className="bg-white rounded-lg p-4 border">
              <p className="font-medium mb-3">Dari: {NAMA_GURU}</p>
              <p className="mb-3">
                <span className="font-medium">Pencapaian minggu ini:</span>
                <br />
                {pencapaian}
              </p>
              <p className="mb-3">
                <span className="font-medium">Area yang perlu didampingi:</span>
                <br />
                {perluDidampingi}
              </p>
              <p>
                <span className="font-medium">Saran aktivitas rumah:</span>
                <br />
                {saranRumah}
              </p>
              {sertakanFreeplay && (
                <p className="mt-3 pt-3 border-t text-gray-600 italic">{KALIMAT_FREEPLAY}</p>
              )}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setMode('form')}
              className="flex-1 border border-gray-300 rounded-lg py-3 font-medium"
            >
              Kembali Edit
            </button>
            <button
              onClick={kirimCatatan}
              className="flex-1 bg-green-600 text-white rounded-lg py-3 font-medium"
            >
              Kirim ke Orang Tua
            </button>
          </div>
        </div>
      )}

      {mode === 'terkirim' && (
        <div className="text-center">
          <h2 className="text-xl font-bold text-green-600 mb-2">Terkirim!</h2>
          <p className="text-gray-600">
            Catatan untuk {child.name} sudah dikirim ke orang tua.
          </p>
        </div>
      )}
    </main>
  )
}