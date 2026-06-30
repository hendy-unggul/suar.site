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
      <svg viewBox="0 0 48 48" className="w-8 h-8">
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
      <svg viewBox="0 0 48 48" className="w-8 h-8">
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
      <svg viewBox="0 0 48 48" className="w-8 h-8">
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
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <circle cx="8" cy="24" r="5" fill={c} />
        <rect x="17" y="19" width="10" height="10" rx="3" fill={c} opacity={0.6} />
        <circle cx="36" cy="24" r="5" fill={c} />
        <rect x="0" y="40" width="48" height="3" rx="1.5" fill={c} opacity={0.3} />
      </svg>
    ),
  },
]

// Titik berhenti di sepanjang jalur cerita melengkung, posisi naik-turun
// seperti perjalanan dongeng — bukan grid kaku.
const PATH_STOPS = [
  { top: '6%', left: '10%' },
  { top: '34%', left: '38%' },
  { top: '14%', left: '66%' },
  { top: '40%', left: '90%' },
]

export default function LayoutWaldorf({ schoolName, colors, religion }: Props) {
  return (
    <main
      style={{ backgroundColor: colors.background, color: colors.text }}
      className="min-h-screen font-body-waldorf"
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap"
      />
      <style>{`
        .font-display-waldorf { font-family: 'Quicksand', system-ui, sans-serif; }
        .font-body-waldorf { font-family: 'Nunito', system-ui, sans-serif; }
        @keyframes waldorf-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.9); }
          50% { opacity: 0.9; transform: scale(1.1); }
        }
        .waldorf-star { animation: waldorf-twinkle 3.5s ease-in-out infinite; }
        @keyframes waldorf-rise {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .waldorf-rise { animation: waldorf-rise 0.6s ease backwards; }
        @media (prefers-reduced-motion: reduce) {
          .waldorf-star { animation: none; }
        }
      `}</style>

      {/* Header - lengkung lembut, spacing lega */}
      <header className="px-8 md:px-10 py-7 flex justify-between items-center">
        <h1 className="font-display-waldorf text-lg font-semibold tracking-wide flex items-center gap-2">
          {religion.icon && <span className="text-xl">{religion.icon}</span>}
          {schoolName}
        </h1>
        <span className="text-xs opacity-50">suar.site</span>
      </header>

      {/* Hero - naratif, lengkung besar, lega, bertabur bintang halus */}
      <section className="relative px-8 md:px-10 py-16 md:py-20 max-w-3xl mx-auto text-center overflow-hidden">
        <svg
          className="absolute top-2 left-1/2 -translate-x-1/2 opacity-70 pointer-events-none"
          width="220"
          height="40"
          viewBox="0 0 220 40"
        >
          {[10, 60, 110, 160, 205].map((x, i) => (
            <circle
              key={i}
              className="waldorf-star"
              cx={x}
              cy={i % 2 === 0 ? 12 : 26}
              r={i % 2 === 0 ? 2.5 : 1.8}
              fill={colors.accent}
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </svg>

        <p
          style={{ color: colors.primary }}
          className="text-sm tracking-widest mb-4 waldorf-rise"
        >
          {religion.greeting}
        </p>
        <h2 className="font-display-waldorf text-3xl md:text-4xl font-medium leading-relaxed mb-6 waldorf-rise" style={{ animationDelay: '0.1s' }}>
          Setiap Hari adalah Cerita Baru untuk{' '}
          <span style={{ color: colors.primary }} className="font-semibold">
            {schoolName}
          </span>
        </h2>
        <p className="text-base opacity-70 leading-relaxed max-w-xl mx-auto waldorf-rise" style={{ animationDelay: '0.2s' }}>
          Lewat ritme bermain yang tenang dan penuh imajinasi, kami menumbuhkan
          cara berpikir anak selangkah demi selangkah, seperti benih yang
          tumbuh perlahan.
        </p>
      </section>

      {/* Signature: jalur cerita melengkung dengan 4 pos dunia */}
      <section className="px-8 md:px-10 py-10 max-w-4xl mx-auto">
        <h3 className="font-display-waldorf text-xl font-semibold mb-10 text-center">
          Perjalanan 4 Dunia
        </h3>

        {/* Versi desktop: jalur melengkung horizontal */}
        <div className="hidden md:block relative h-56">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 400 160"
            preserveAspectRatio="none"
          >
            <path
              d="M 20 30 C 100 30, 120 130, 200 90 C 280 50, 300 140, 380 110"
              fill="none"
              stroke={colors.secondary}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="2 10"
            />
          </svg>
          {PATH_STOPS.map((stop, i) => (
            <div
              key={DUNIA[i].key}
              className="absolute flex flex-col items-center gap-2 waldorf-rise"
              style={{ top: stop.top, left: stop.left, animationDelay: `${0.15 * i}s` }}
            >
              <div
                style={{ backgroundColor: colors.secondary }}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-sm"
              >
                {DUNIA[i].icon(colors.primary)}
              </div>
              <span className="text-xs font-medium opacity-75 whitespace-nowrap">
                {DUNIA[i].label}
              </span>
            </div>
          ))}
        </div>

        {/* Versi mobile: tetap jalur, tapi vertikal supaya tidak perlu scroll horizontal */}
        <div className="md:hidden space-y-5">
          {DUNIA.map((dunia, i) => (
            <div key={dunia.key} className="flex items-center gap-4 waldorf-rise" style={{ animationDelay: `${0.1 * i}s` }}>
              <div
                style={{ backgroundColor: colors.secondary }}
                className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-sm"
              >
                {dunia.icon(colors.primary)}
              </div>
              <p className="font-medium">{dunia.label}</p>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{ backgroundColor: colors.primary }}
        className="px-8 md:px-10 py-10 text-center text-white text-sm rounded-t-[3rem] mt-12"
      >
        <p className="font-display-waldorf italic">{religion.closingPhrase}</p>
      </footer>
    </main>
  )
}