'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { colorPalettes } from '@/config/colorPalettes'
import { religionLayers } from '@/config/religionLayer'
import LayoutMontessori from '@/components/LayoutMontessori'
import LayoutReggio from '@/components/LayoutReggio'
import LayoutWaldorf from '@/components/LayoutWaldorf'

type School = {
  id: string
  name: string
  setup_completed: boolean
}

const STRUKTUR_OPTIONS = [
  { value: 'montessori', label: 'Montessori', desc: 'Tegas, presisi, netral' },
  { value: 'reggio', label: 'Reggio Emilia', desc: 'Organik, hidup, playful' },
  { value: 'waldorf', label: 'Waldorf', desc: 'Lembut, naratif, lengkung' },
]

const AGAMA_OPTIONS = [
  { value: 'umum', label: 'Umum / Plural' },
  { value: 'islam', label: 'Islam' },
  { value: 'kristen', label: 'Kristen' },
  { value: 'buddha', label: 'Buddha' },
]

export default function SetupSekolahPage() {
  const params = useParams()
  const token = params.token as string

  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [finalSlug, setFinalSlug] = useState('')

  const [struktur, setStruktur] = useState('montessori')
  const [warna, setWarna] = useState('palette_1')
  const [agama, setAgama] = useState('umum')

  useEffect(() => {
    async function fetchSchool() {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, setup_completed')
        .eq('setup_token', token)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setSchool(data)
      }
      setLoading(false)
    }
    fetchSchool()
  }, [token])

  async function handleSubmit() {
    if (!school) return
    setSaving(true)

    const slug = school.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { error } = await supabase
      .from('schools')
      .update({
        slug,
        layout_structure: struktur,
        color_palette: warna,
        religion_layer: agama,
        setup_completed: true,
      })
      .eq('id', school.id)

    setSaving(false)

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
      return
    }

    setFinalSlug(slug)
    setDone(true)
  }

  if (loading) {
    return <main className="max-w-2xl mx-auto p-6 mt-10 text-center"><p>Memuat...</p></main>
  }

  if (notFound) {
    return (
      <main className="max-w-2xl mx-auto p-6 mt-10 text-center">
        <h1 className="text-xl font-bold text-red-600">Link Tidak Valid</h1>
      </main>
    )
  }

  if (done) {
    return (
      <main className="max-w-2xl mx-auto p-6 mt-10 text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-2">Setup Selesai!</h1>
        <p className="text-gray-600 mb-4">
          Halaman sekolah Anda sudah aktif di:
        </p>
        <p className="font-mono bg-gray-100 rounded-lg px-4 py-2 inline-block">
          {window.location.origin}/{finalSlug}
        </p>
      </main>
    )
  }

  const colors = colorPalettes[warna]
  const religion = religionLayers[agama]

  const PreviewComponent =
    struktur === 'reggio' ? LayoutReggio : struktur === 'waldorf' ? LayoutWaldorf : LayoutMontessori

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Setup Halaman {school?.name}</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Pilih tampilan yang paling sesuai, lihat hasilnya langsung di pratinjau bawah.
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div>
          <p className="text-sm font-medium mb-2">Struktur Tampilan</p>
          <div className="space-y-2">
            {STRUKTUR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStruktur(opt.value)}
                className={`w-full text-left border rounded-lg p-3 ${
                  struktur === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Warna</p>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(colorPalettes).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setWarna(key)}
                title={val.name}
                style={{ backgroundColor: val.primary }}
                className={`w-9 h-9 rounded-full ${
                  warna === key ? 'ring-2 ring-offset-2 ring-blue-600' : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Nuansa</p>
          <div className="space-y-2">
            {AGAMA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAgama(opt.value)}
                className={`w-full text-left border rounded-lg p-2 text-sm ${
                  agama === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm font-medium mb-2">Pratinjau Langsung</p>
      <div className="border-2 rounded-xl overflow-hidden mb-6" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}>
        <PreviewComponent schoolName={school?.name ?? ''} colors={colors} religion={religion} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan dan Aktifkan Halaman Sekolah'}
      </button>
    </main>
  )
}