'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const CLASS_ID_SEMENTARA = '60d7dd1a-de99-4d1d-8e87-bd7ab4114934'

export default function TambahAnakPage() {
  const [namaAnak, setNamaAnak] = useState('')
  const [namaOrtu, setNamaOrtu] = useState('')
  const [noHpOrtu, setNoHpOrtu] = useState('')
  const [linkHasil, setLinkHasil] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setLinkHasil('')

    const token = crypto.randomUUID()

    const { error: insertError } = await supabase.from('children').insert({
      class_id: CLASS_ID_SEMENTARA,
      name: namaAnak,
      parent_name: namaOrtu,
      parent_phone: noHpOrtu,
      status: 'pending',
      activation_token: token,
    })

    setLoading(false)

    if (insertError) {
      setError('Gagal menyimpan: ' + insertError.message)
      return
    }

    const link = `${window.location.origin}/aktivasi/${token}`
    setLinkHasil(link)

    setNamaAnak('')
    setNamaOrtu('')
    setNoHpOrtu('')
  }

  function copyLink() {
    navigator.clipboard.writeText(linkHasil)
    alert('Link sudah disalin! Kirim ke WhatsApp orang tua.')
  }

  return (
    <main className="max-w-md mx-auto p-6 mt-10">
      <h1 className="text-2xl font-bold mb-1">Tambah Anak Didik</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Isi data anak, sistem akan membuat link aktivasi untuk dikirim ke orang tua.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nama Anak</label>
          <input
            type="text"
            required
            value={namaAnak}
            onChange={(e) => setNamaAnak(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Contoh: Kayla"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nama Orang Tua</label>
          <input
            type="text"
            required
            value={namaOrtu}
            onChange={(e) => setNamaOrtu(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Contoh: Bu Rina"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">No HP Orang Tua</label>
          <input
            type="tel"
            required
            value={noHpOrtu}
            onChange={(e) => setNoHpOrtu(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="08123456789"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Buat Link Aktivasi'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}

      {linkHasil && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-2">
            Link aktivasi berhasil dibuat:
          </p>
          <p className="text-xs break-all text-gray-700 mb-3">{linkHasil}</p>
          <button
            onClick={copyLink}
            className="bg-green-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium"
          >
            Salin Link
          </button>
        </div>
      )}
    </main>
  )
}
