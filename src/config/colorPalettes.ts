// 10 palet warna yang tersedia untuk dipilih sekolah.
// Setiap palet adalah SET VARIABEL, bukan kode terpisah —
// inilah yang membuat sistem ini ringan untuk skala ribuan sekolah.

export type ColorPalette = {
  name: string
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

export const colorPalettes: Record<string, ColorPalette> = {
  palette_1: {
    name: 'Biru Tenang',
    primary: '#2563EB',
    secondary: '#DBEAFE',
    accent: '#F59E0B',
    background: '#F8FAFC',
    text: '#1E293B',
  },
  palette_2: {
    name: 'Hijau Alam',
    primary: '#16A34A',
    secondary: '#DCFCE7',
    accent: '#EA580C',
    background: '#F7FEE7',
    text: '#1E3A1F',
  },
  palette_3: {
    name: 'Coral Hangat',
    primary: '#DC2626',
    secondary: '#FEE2E2',
    accent: '#0891B2',
    background: '#FFF7ED',
    text: '#3F1212',
  },
  palette_4: {
    name: 'Ungu Lembut',
    primary: '#7C3AED',
    secondary: '#EDE9FE',
    accent: '#F59E0B',
    background: '#FAF5FF',
    text: '#2E1065',
  },
  palette_5: {
    name: 'Kuning Ceria',
    primary: '#CA8A04',
    secondary: '#FEF9C3',
    accent: '#0D9488',
    background: '#FFFBEB',
    text: '#422006',
  },
  palette_6: {
    name: 'Pink Riang',
    primary: '#DB2777',
    secondary: '#FCE7F3',
    accent: '#0891B2',
    background: '#FFF1F2',
    text: '#500724',
  },
  palette_7: {
    name: 'Teal Profesional',
    primary: '#0D9488',
    secondary: '#CCFBF1',
    accent: '#D97706',
    background: '#F0FDFA',
    text: '#134E4A',
  },
  palette_8: {
    name: 'Earthy Tanah',
    primary: '#92400E',
    secondary: '#FEF3C7',
    accent: '#0E7490',
    background: '#FFFBEB',
    text: '#451A03',
  },
  palette_9: {
    name: 'Navy Elegan',
    primary: '#1E3A8A',
    secondary: '#DBEAFE',
    accent: '#DC2626',
    background: '#F8FAFC',
    text: '#0F172A',
  },
  palette_10: {
    name: 'Sage Lembut',
    primary: '#4D7C0F',
    secondary: '#ECFCCB',
    accent: '#B45309',
    background: '#F7FEE7',
    text: '#1A2E05',
  },
}