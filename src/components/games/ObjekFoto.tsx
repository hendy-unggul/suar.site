// FILE PATH: src/components/games/ObjekFoto.tsx
import { useState } from 'react'

// ----------------------------------------------------------------------
// Komponen generik pengganti SVG geometris (ObjekBuah/BendaMengambang
// lama). Menampilkan FOTO ASLI dari public/images/objek/{nama}.png,
// dengan FALLBACK ke lingkaran warna solid jika file gambar belum ada
// (404) - supaya minggu 3 & 4 yang asetnya belum lengkap TIDAK
// menampilkan broken image icon, melainkan placeholder yang masih
// terlihat seperti benda (lingkaran berwarna), sambil tetap interaktif.
//
// PENTING: ini komponen TAMPILAN saja - tidak ada logic gate/skor di
// sini. Dipakai berulang di SEMUA komponen game (TapTarget,
// TapDistractor, Sort2Warna, Sort6Warna, Freeplay).
// ----------------------------------------------------------------------

export type ObjekFotoProps = {
  // Nama file gambar TANPA ekstensi dan TANPA suffix _abu, mis. "apel".
  // Komponen ini sendiri yang menambahkan "_abu" jika grayscale=true.
  nama: string
  // hex dipakai HANYA sebagai warna fallback (lingkaran solid) saat foto
  // gagal dimuat - BUKAN untuk mewarnai foto asli (foto sudah punya
  // warnanya sendiri dari file PNG).
  hex: string
  size: number
  grayscale?: boolean
  state?: 'idle' | 'wrong' | 'correct'
  bonus?: boolean
  ariaLabel?: string
  onTap?: () => void
}

export default function ObjekFoto({
  nama,
  hex,
  size,
  grayscale = false,
  state = 'idle',
  bonus = false,
  ariaLabel,
  onTap,
}: ObjekFotoProps) {
  const [gagalMuat, setGagalMuat] = useState(false)

  const namaFile = grayscale ? `${nama}_abu` : nama
  const src = `/images/objek/${namaFile}.png`
  const label = ariaLabel ?? nama.replace(/_/g, ' ')

  const kelasAnimasi = [
    state === 'idle' ? (bonus ? 'objek-foto-bonus' : 'objek-foto-idle') : '',
    state === 'wrong' ? 'objek-foto-wrong' : '',
    state === 'correct' ? 'objek-foto-correct' : '',
  ].join(' ')

  // Elemen interaktif (button) HANYA dirender jika onTap diberikan -
  // beberapa pemanggil (mis. BendaMengambang lama di Sort2Warna/Sort6Warna)
  // memakai versi non-interaktif (objek yang "diangkut", bukan ditap).
  const isInteraktif = typeof onTap === 'function'
  const Wrapper = isInteraktif ? 'button' : 'div'

  return (
    <Wrapper
      {...(isInteraktif ? { onClick: onTap, 'aria-label': label } : { 'aria-hidden': true })}
      className={[
        'relative flex items-center justify-center transition-transform duration-300',
        kelasAnimasi,
      ].join(' ')}
      style={{
        width: size,
        height: size,
        minWidth: isInteraktif ? 80 : undefined,
        minHeight: isInteraktif ? 80 : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(isInteraktif ? ({ cursor: 'pointer' } as any) : {}),
      }}
    >
      {gagalMuat ? (
        // FALLBACK: lingkaran warna solid, dipakai saat file PNG belum
        // ada (404) - terutama relevan untuk minggu 3 & 4 yang asetnya
        // belum diupload. Tetap menampilkan grayscale jika diminta,
        // supaya konsisten secara visual dengan versi foto asli.
        <div
          style={{
            width: '70%',
            height: '70%',
            borderRadius: '50%',
            backgroundColor: hex,
            filter: grayscale ? 'grayscale(1) opacity(0.6)' : 'none',
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          width={size}
          height={size}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }}
          onError={() => setGagalMuat(true)}
        />
      )}
    </Wrapper>
  )
}