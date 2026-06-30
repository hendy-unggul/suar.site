import { ColorPalette } from '@/config/colorPalettes'
import { ReligionConfig } from '@/config/religionLayer'

type Props = {
  schoolName: string
  colors: ColorPalette
  religion: ReligionConfig
}

const DUNIA = [
  {
    key: 'warna',
    label: 'Dunia Warna',
    icon: (c: string) => (
      <svg viewBox="0 0 48 48" className="w-9 h-9">
        <circle cx="24" cy="16" r="8" fill={c} />
        <circle cx="14" cy="30" r="8" fill={c} opacity={0.55} />
        <circle cx="34" cy="30" r="8" fill={c} opacity={0.8} />
      </svg>
    ),
  },
  {
    key: 'bentuk',
    label: 'Dunia Bentuk',
    icon: (c: string) => (
      <svg viewBox="0 0 48 48" className="w-9 h-9">
        <rect x="6" y="24" width="16" height="16" rx="4" fill={c} opacity={0.7} />
        <circle cx="34" cy="14" r="9" fill={c} />
        <polygon points="34,24 44,40 24,40" fill={c} opacity={0.55} />
      </svg>
    ),
  },
  {
    key: 'kelompok',
    label: 'Dunia Kelompok',
    icon: (c: string) => (
      <svg viewBox="0 0 48 48" className="w-9 h-9">
        <circle cx="14" cy="18" r="7" fill={c} />
        <circle cx="30" cy="14" r="7" fill={c} opacity={0.7} />
        <circle cx="22" cy="32" r="7" fill={c} opacity={0.55} />
        <circle cx="38" cy="32" r="7" fill={c} opacity={0.4} />
      </svg>
    ),
  },
  {
    key: 'pola',
    label: 'Dunia Pola',
    icon: (c: string) => (
      <svg viewBox="0 0 48 48" className="w-9 h-9">
        <circle cx="8" cy="24" r="5" fill={c} />
        <rect x="17" y="19" width="10" height="10" rx="3" fill={c} opacity={0.6} />
        <circle cx="36" cy="24" r="5" fill={c} />
        <rect x="0" y="40" width="48" height="3" rx="1.5" fill={c} opacity={0.3} />
      </svg>
    ),
  },
]

// Posisi & ukuran balon disusun manual supaya terasa "ditebar", bukan grid rapi
const BALLOON_LAYOUT = [
  { top: '4%', left: '6%', size: 152, rotate: -4, floatDelay: '0s' },
  { top: '2%', left: '56%', size: 132, rotate: 5, floatDelay: '0.6s' },
  { top: '46%', left: '2%', size: 124, rotate: 3, floatDelay: '1.1s' },
  { top: '50%', left: '60%', size: 148, rotate: -3, floatDelay: '0.3s' },
]

export default function LayoutReggio({ schoolName, colors, religion }: Props) {
  return (
    <main
      style={{ backgroundColor: colors.background, color: colors.text }}
      className="min-h-screen font-body-reggio"
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap"
      />
      <style>{`
        .font-display-reggio { font-family: 'Fredoka', system-ui, sans-serif; }
        .font-body-reggio { font-family: 'Nunito', system-ui, sans-serif; }
        @keyframes reggio-float {
          0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
          50% { transform: translateY(-14px) rotate(var(--r, 0deg)); }
        }
        .reggio-balloon {
          animation: reggio-float 6s ease-in-out infinite;
        }
        @keyframes reggio-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .reggio-pop { animation: reggio-pop 0.5s ease backwards; }
        @media (prefers-reduced-motion: reduce) {
          .reggio-balloon { animation: none; }
        }
      `}</style>

      {/* Header */}
      <header className="px-6 md:px-10 py-5 flex justify-between items-center relative z-10">
        <h1
          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
          className="font-display-reggio text-lg md:text-xl font-semibold px-5 py-2 rounded-full text-white inline-flex items-center gap-2 shadow-sm"
        >
          {religion.icon && <span>{religion.icon}</span>}
          {schoolName}
        </h1>
        <span className="text-xs opacity-50 font-medium">suar.site</span>
      </header>

      {/* Hero — signature: taman balon mengambang */}
      <section className="relative px-6 md:px-10 pt-6 pb-20 md:pb-28 max-w-5xl mx-auto overflow-hidden min-h-[420px] md:min-h-[480px]">
        {/* Balon-balon ambient di belakang teks, disusun acak-rapi */}
        <div className="absolute inset-0 pointer-events-none">
          {BALLOON_LAYOUT.map((b, i) => {
            const dunia = DUNIA[i]
            return (
              <div
                key={dunia.key}
                className="reggio-balloon absolute hidden md:flex items-center justify-center rounded-full opacity-90"
                style={{
                  top: b.top,
                  left: b.left,
                  width: b.size,
                  height: b.size,
                  backgroundColor: i % 2 === 0 ? colors.secondary : `${colors.accent}33`,
                  animationDelay: b.floatDelay,
                  ['--r' as any]: `${b.rotate}deg`,
                }}
              >
                <div
                  className="absolute -bottom-3 w-px h-6"
                  style={{ backgroundColor: `${colors.primary}55` }}
                />
                {dunia.icon(colors.primary)}
              </div>
            )
          })}
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto reggio-pop">
          <p style={{ color: colors.accent }} className="text-sm font-semibold mb-3">
            {religion.greeting}
          </p>
          <h2 className="font-display-reggio text-3xl md:text-4xl font-semibold leading-snug mb-4">
            Setiap Anak adalah{' '}
            <span style={{ color: colors.primary }}>Penjelajah</span> yang Penuh Rasa Ingin Tahu
          </h2>
          <p className="text-base opacity-75 leading-relaxed">
            {schoolName} merayakan keingintahuan alami anak lewat permainan yang
            dirancang berdasarkan riset perkembangan kognitif.
          </p>
        </div>
      </section>

      {/* Galeri 4 dunia - floating cards miring */}
      <section className="px-6 md:px-10 py-12 max-w-5xl mx-auto relative z-10">
        <h3 className="font-display-reggio text-xl md:text-2xl font-semibold mb-8 text-center">
          Dunia untuk Dijelajahi
        </h3>
        <div className="flex flex-wrap justify-center gap-5 md:gap-6">
          {DUNIA.map((d, i) => (
            <div
              key={d.key}
              style={{
                backgroundColor: colors.secondary,
                transform: i % 2 === 0 ? 'rotate(-2deg)' : 'rotate(2deg)',
              }}
              className="reggio-pop rounded-[2rem] p-6 w-40 text-center shadow-sm flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform"
            >
              {d.icon(colors.primary)}
              <p className="font-display-reggio font-medium text-sm">{d.label}</p>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
        className="px-6 md:px-10 py-8 text-center text-white text-sm rounded-t-[2.5rem] mt-8"
      >
        <p className="font-display-reggio">{religion.closingPhrase}</p>
      </footer>
    </main>
  )
}