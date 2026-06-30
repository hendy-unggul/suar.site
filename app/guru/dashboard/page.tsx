'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Child = {
  id: string
  name: string
  parent_name: string
  parent_phone: string
  status: string
  created_at: string
}

export default function DashboardGuruPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Ambil data awal
    async function fetchChildren() {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, parent_name, parent_phone, status, created_at')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setChildren(data)
      }
      setLoading(false)
    }
    fetchChildren()

    // Subscribe ke perubahan real-time pada tabel children
    const channel = supabase
      .channel('children-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'children' },
        (payload) => {
          console.log('Realtime update:', payload)
          // Setiap ada perubahan (insert/update/delete), ambil ulang data
          fetchChildren()
        }
      )
      .subscribe()

    // Bersihkan subscription saat halaman ditutup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-6 mt-10 text-center">
        <p>Memuat data anak...</p>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto p-6 mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard Guru</h1>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
          ● Live
        </span>
      </div>

      {children.length === 0 ? (
        <p className="text-gray-500">Belum ada anak didik yang ditambahkan.</p>
      ) : (
        <div className="space-y-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <Link href={`/guru/anak/${child.id}`} className="hover:underline">
  <p className="font-bold text-lg text-blue-700">{child.name}</p>
  <p className="text-sm text-gray-500">
    Orang tua: {child.parent_name} · {child.parent_phone}
  </p>
</Link>
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  child.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {child.status === 'active' ? 'Aktif' : 'Menunggu Aktivasi'}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}