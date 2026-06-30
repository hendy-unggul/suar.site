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
      <svg viewBox="0 0 48 48" className="w-10 h-10">
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
      <svg viewBox="0 0 48 48" className="w-10 h-10">
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
      <svg viewBox="0 0 48 48" className="w-10 h-10">
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
      <svg viewBox="0 0 48 48" className="w-10 h-10">
        <circle cx="8" cy="24" r="5" fill={c} />
        <rect x="17" y="19" width="10" height="10" rx="3" fill={c} opacity={0.6} />
        <circle cx="36" cy="24" r="5" fill={c} />
        <rect x="0" y="40" width="48" height="3" rx="1.5" fill={c} opacity={0.3} />
      </svg>
    ),
  },
]

export default function LayoutMontessori({ schoolName, colors, religion }: Props) {
  return (
    <main
      style={{ backgroundColor: colors.background, color: colors.text }}
      className="min-h-screen font-body"
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700&display=swap"
      />
      <style>{`
        .font-display-montessori { font-family: 'Baloo 2', system-ui, sans-serif; }
        .font-body { font-family: 'Nunito', system-ui, sans-serif; }
        .montessori-shelf {
          background-image:
            repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent 132px,
              ${colors.secondary}55 132px,
              ${colors.secondary}55 138px
            );
        }
        .montessori-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .montessori-card:hover {
          transform: translateY(-6px) rotate(-1deg);
        }
        @keyframes montessori-pop {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .montessori-pop {
          animation: montessori-pop 0.5s ease backwards;
        }
      `}</style>

      {/* Header */}
      <header
        style={{ borderBottom: `3px dashed ${colors.primary}66` }}
        className="px-6 md:px-10 py-5 flex justify-between items-center"
      >
        <h1 className="font-display-montessori text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
          {religion.icon && <span className="text-2xl">{religion.icon}</span>}
          {schoolName}
        </h1>
        <span
          style={{ backgroundColor: `${colors.primary}1A`, color: colors.primary }}
          className="text-xs font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full"
        >
          Powered by suar.site
        </span>
      </header>

      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 px-6 md:px-10 py-14 md:py-20 max-w-5xl mx-auto items-center">
        <div className="montessori-pop">
          <p
            style={{ color: colors.primary }}
            className="text-sm font-bold tracking-wide mb-3 flex items-center gap-2"
          >
            <span
              style={{ backgroundColor: colors.primary }}
              className="inline-block w-2 h-2 rounded-full"
            />
            {religion.greeting}
          </p>
          <h2 className="font-display-montessori text-3xl md:text-4xl font-bold leading-snug mb-4">
            Membangun Fondasi Cara Berpikir Anak, Selangkah demi Selangkah
          </h2>
          <p className="text-base opacity-80 leading-relaxed">
            {schoolName} mendampingi tumbuh kembang anak lewat permainan yang
            dirancang berdasarkan riset perkembangan kognitif — seperti rak
            alat peraga yang siap dijelajahi tangan-tangan kecil.
          </p>
        </div>

        {/* Signature visual: rak alat peraga kayu */}
        <div
          style={{ backgroundColor: colors.secondary + '33' }}
          className="montessori-shelf rounded-[2rem] aspect-square p-6 md:p-8 grid grid-cols-2 gap-4 montessori-pop"
        >
          {DUNIA.map((d, i) => (
            <div
              key={d.key}
              style={{
                backgroundColor: colors.background,
                boxShadow: `0 6px 0 0 ${colors.secondary}99`,
              }}
              className="montessori-card rounded-2xl flex flex-col items-center justify-center gap-2 p-3"
            >
              {d.icon(colors.primary)}
              <span className="text-[11px] font-bold text-center opacity-70 leading-tight">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Grid 4 dunia detail */}
      <section className="px-6 md:px-10 py-14 max-w-5xl mx-auto">
        <h3 className="font-display-montessori text-xl md:text-2xl font-bold mb-8 text-center">
          4 Dunia untuk Dijelajahi
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {DUNIA.map((d) => (
            <div
              key={d.key}
              style={{
                backgroundColor: colors.background,
                border: `2.5px solid ${colors.secondary}77`,
              }}
              className="montessori-card rounded-2xl p-5 text-center flex flex-col items-center gap-3"
            >
              {d.icon(colors.primary)}
              <p className="font-display-montessori font-semibold text-sm">{d.label}</p>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{ backgroundColor: colors.primary }}
        className="px-6 md:px-10 py-7 text-center text-white"
      >
        <p className="font-display-montessori text-sm md:text-base">{religion.closingPhrase}</p>
      </footer>
    </main>
  )
}