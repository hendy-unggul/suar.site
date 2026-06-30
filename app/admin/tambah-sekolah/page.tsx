'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TambahSekolahPage() {
  const [namaSekolah, setNamaSekolah] = useState('')
  const [linkHasil, setLinkHasil] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setLinkHasil('')

    const tempSlug = 'temp-' + crypto.randomUUID().slice(0, 8)

    const { data, error: insertError } = await supabase
      .from('schools')
      .insert({
        name: namaSekolah,
        slug: tempSlug,
        layout_structure: 'montessori',
        color_palette: 'palette_1',
        religion_layer: 'umum',
        setup_completed: false,
      })
      .select('setup_token')
      .single()

    setLoading(false)

    if (insertError || !data) {
      setError('Gagal menyimpan: ' + insertError?.message)
      return
    }

    const link = `${window.location.origin}/setup-sekolah/${data.setup_token}`
    setLinkHasil(link)
    setNamaSekolah('')
  }

  function copyLink() {
    navigator.clipboard.writeText(linkHasil)
    alert('Link sudah disalin! Kirim ke sekolah.')
  }

  return (
    <main className="max-w-md mx-auto p-6 mt-10">
      <h1 className="text-2xl font-bold mb-1">Tambah Sekolah Baru</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Buat link setup untuk sekolah memilih tema landing page mereka sendiri.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nama Sekolah</label>
          <input
            type="text"
            required
            value={namaSekolah}
            onChange={(e) => setNamaSekolah(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Contoh: TK Pelangi Bahagia"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Buat Link Setup'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}

      {linkHasil && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-2">
            Link setup berhasil dibuat:
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