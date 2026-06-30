'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ChildData = {
  id: string
  name: string
  parent_name: string
  parent_phone: string
  status: string
}

export default function AktivasiPage() {
  const params = useParams()
  const token = params.token as string

  const [child, setChild] = useState<ChildData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<'konfirmasi' | 'otp' | 'tentang' | 'sukses'>('konfirmasi')
  const [otpDikirim, setOtpDikirim] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchChild() {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, parent_name, parent_phone, status')
        .eq('activation_token', token)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setChild(data)
        if (data.status === 'active') {
          setStep('sukses')
        }
      }
      setLoading(false)
    }
    fetchChild()
  }, [token])

  function kirimOtp() {
    // MODE TESTING: kode OTP digenerate dan ditampilkan langsung di layar,
    // BUKAN dikirim via SMS asli. Ganti dengan provider SMS sungguhan nanti.
    const kode = Math.floor(1000 + Math.random() * 9000).toString()
    setOtpDikirim(kode)
    setStep('otp')
  }

  function konfirmasiOtp() {
    setError('')
    if (otpInput !== otpDikirim) {
      setError('Kode tidak sesuai, coba lagi.')
      return
    }
    // Setelah OTP benar, tampilkan dulu halaman edukasi orang tua
    // SEBELUM aktivasi final disimpan ke database
    setStep('tentang')
  }

  async function selesaikanAktivasi() {
    if (!child) return

    const { error: updateError } = await supabase
      .from('children')
      .update({ status: 'active' })
      .eq('id', child.id)

    if (updateError) {
      setError('Gagal mengaktivasi: ' + updateError.message)
      return
    }

    setStep('sukses')
  }

  if (loading) {
    return (
      <main className="max-w-md mx-auto p-6 mt-10 text-center">
        <p>Memuat...</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="max-w-md mx-auto p-6 mt-10 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Link Tidak Ditemukan</h1>
        <p className="text-gray-600">
          Link ini tidak valid. Silakan hubungi guru untuk mendapatkan link yang benar.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto p-6 mt-10">
      {step === 'konfirmasi' && child && (
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Konfirmasi Nomor HP</h1>
          <p className="text-gray-600 mb-2">Halo, ini akun untuk anak bernama:</p>
          <p className="text-2xl font-bold mb-4">{child.name}</p>
          <p className="text-gray-600 mb-6">
            Apakah ini nomor HP Anda?
            <br />
            <span className="font-bold text-lg">{child.parent_phone}</span>
          </p>
          <button
            onClick={kirimOtp}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
          >
            Ya, ini nomor saya
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">Masukkan Kode Verifikasi</h1>

          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-sm">
            <p className="font-medium text-yellow-800">MODE TESTING</p>
            <p className="text-yellow-700">
              Kode OTP Anda: <span className="font-bold text-lg">{otpDikirim}</span>
            </p>
            <p className="text-yellow-600 text-xs mt-1">
              (Di versi asli, ini akan dikirim via SMS)
            </p>
          </div>

          <input
            type="text"
            maxLength={4}
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            className="w-full border rounded-lg px-3 py-3 text-center text-2xl font-bold mb-4"
            placeholder="0000"
          />

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <button
            onClick={konfirmasiOtp}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
          >
            Konfirmasi
          </button>
        </div>
      )}

      {step === 'tentang' && child && (
  <div>
    <h1 className="text-xl font-bold mb-4 text-center">
      Melatih Cara Berpikir {child.name}, Bukan Sekadar Nilai
    </h1>

    <p className="text-gray-700 mb-4 leading-relaxed">
      Pendidikan sejati bukan hanya soal nilai di rapor. Pendidikan adalah
      membentuk manusia — yang berkarakter baik, mampu hidup berdampingan
      dengan orang lain, dan yang paling penting: <strong>mampu berpikir
      dengan akalnya sendiri.</strong>
    </p>

    <p className="text-gray-700 mb-4 leading-relaxed">
      Matematika, pada dasarnya, bukan sekadar hitung-hitungan. Matematika
      adalah <strong>cara berpikir logis</strong> — dan seperti otot,
      kemampuan ini bisa dilatih. Semakin terlatih, semakin kuat anak
      bernalar dalam menghadapi masalah apa pun, bukan hanya di sekolah.
    </p>

    <p className="text-gray-700 mb-4 leading-relaxed">
      Inilah yang dilatih lewat <strong>{child.name}</strong> bermain di
      4 dunia berikut, berurutan, tidak bisa dilompati:
    </p>

    <div className="space-y-2 mb-4">
      <div className="bg-red-50 rounded-lg p-3">
        <p className="font-bold text-red-800">1. Dunia Warna</p>
        <p className="text-sm text-red-700">Melatih ketelitian mengamati — dasar dari semua logika</p>
      </div>
      <div className="bg-yellow-50 rounded-lg p-3">
        <p className="font-bold text-yellow-800">2. Dunia Bentuk</p>
        <p className="text-sm text-yellow-700">Mengasah kemampuan melihat hubungan antar benda</p>
      </div>
      <div className="bg-teal-50 rounded-lg p-3">
        <p className="font-bold text-teal-800">3. Dunia Kelompok</p>
        <p className="text-sm text-teal-700">Melatih otak mengorganisir informasi secara mandiri</p>
      </div>
      <div className="bg-indigo-50 rounded-lg p-3">
        <p className="font-bold text-indigo-800">4. Dunia Pola</p>
        <p className="text-sm text-indigo-700">
          Puncaknya — fondasi nalar yang dipakai sepanjang hidup
        </p>
      </div>
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <p className="text-sm text-blue-900 leading-relaxed">
        Dunia akan terus berubah cepat dengan teknologi dan kecerdasan
        buatan. Anak yang dilatih berpikir sejak dini akan tumbuh menjadi
        orang yang <strong>mengendalikan teknologi</strong>, bukan sekadar
        penggunanya yang pasif — karena dialah yang mampu bertanya, menalar,
        dan menciptakan, bukan hanya mengikuti.
      </p>
    </div>

    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
      <p className="font-medium text-amber-900 mb-1">Agar hasilnya maksimal:</p>
      <p className="text-sm text-amber-800 leading-relaxed">
        Biarkan {child.name} mencoba sendiri dulu meski salah — jangan
        terburu-buru dibantu. Salah adalah bagian dari proses otak menjadi
        kuat. Setiap akhir minggu ada waktu bermain bebas — jangan dilewati,
        karena di situlah semua yang dipelajari benar-benar tertanam.
      </p>
    </div>

    <button
      onClick={selesaikanAktivasi}
      className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
    >
      Aktifkan dan Mulai Perjalanan {child.name}
    </button>
  </div>
)}


      {step === 'sukses' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-2">Berhasil!</h1>
          <p className="text-gray-600">
            Akun {child?.name} sudah aktif. Anak siap untuk mulai bermain dan belajar.
          </p>
        </div>
      )}
    </main>
  )
}