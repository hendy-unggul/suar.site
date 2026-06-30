// Layer respons agama — bersifat KOSMETIK/PLASTIS sepenuhnya.
// Tidak mengubah struktur, layout, atau warna sama sekali.
// Hanya mengubah teks sapaan kecil dan ikon kecil non-intrusive.

export type ReligionConfig = {
  greeting: string
  closingPhrase: string
  icon: string // emoji sederhana untuk versi awal, bisa diganti SVG nanti
}

export const religionLayers: Record<string, ReligionConfig> = {
  umum: {
    greeting: 'Selamat Datang',
    closingPhrase: 'Semoga perjalanan belajar ananda menyenangkan',
    icon: '',
  },
  islam: {
    greeting: 'Assalamualaikum',
    closingPhrase: 'Bismillah, Insya Allah berkah untuk ananda',
    icon: '☪',
  },
  kristen: {
    greeting: 'Selamat Datang',
    closingPhrase: 'Tuhan Allah, memberkati perjalanan ananda',
    icon: '✝',
  },
  buddha: {
    greeting: 'Selamat Datang',
    closingPhrase: 'Semoga ananda penuh kebijaksanaan',
    icon: '☸',
  },
}

// Untuk sekolah tanpa layer agama spesifik (religion_layer = null)
export const defaultGreeting: ReligionConfig = {
  greeting: 'Selamat Datang',
  closingPhrase: 'Semoga perjalanan belajar ananda menyenangkan',
  icon: '',
}