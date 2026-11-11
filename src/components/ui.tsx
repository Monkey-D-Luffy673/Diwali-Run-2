import type { ReactNode } from "react";
import type { LevelDef } from "../game/levels";

/* ----------------------------- Icons ----------------------------- */

type IconProps = { className?: string };
const S = ({ children, className = "h-4 w-4", viewBox = "0 0 24 24" }: IconProps & { children: ReactNode; viewBox?: string }) => (
  <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

export const PlayIcon = ({ className }: IconProps) => <S className={className}><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" /></S>;
export const PauseIcon = ({ className }: IconProps) => <S className={className}><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" /></S>;
export const RestartIcon = ({ className }: IconProps) => <S className={className}><path d="M4 10a8 8 0 1 1 2 6" /><path d="M4 4v6h6" /></S>;
export const HomeIcon = ({ className }: IconProps) => <S className={className}><path d="m4 11 8-7 8 7" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></S>;
export const LockIcon = ({ className }: IconProps) => <S className={className}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V8a4 4 0 0 1 8 0v2" /><path d="M12 14v2" /></S>;
export const StarIcon = ({ className }: IconProps) => <S className={className}><path d="m12 3 2.7 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.2 6.5 20.2l1.1-6.2L3 9.6l6.3-.9L12 3Z" fill="currentColor" stroke="none" /></S>;
export const MusicIcon = ({ className }: IconProps) => <S className={className}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></S>;
export const SoundIcon = ({ className }: IconProps) => <S className={className}><path d="M4 10v4h3l4 3V7L7 10H4Z" /><path d="M15 9a4 4 0 0 1 0 6" /><path d="M18 6a8 8 0 0 1 0 12" /></S>;
export const MuteIcon = ({ className }: IconProps) => <S className={className}><path d="M4 10v4h3l4 3V7L7 10H4Z" /><path d="m15 10 4 4M19 10l-4 4" /></S>;
export const GearIcon = ({ className }: IconProps) => <S className={className}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></S>;
export const HeartIcon = ({ className }: IconProps) => <S className={className}><path d="M12 20s-8-4.8-8-10.2A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8 3.8C20 15.2 12 20 12 20Z" fill="currentColor" stroke="none" /></S>;
export const ArrowIcon = ({ className }: IconProps) => <S className={className}><path d="M4 12h15M13 6l6 6-6 6" /></S>;
export const ChevronLeft = ({ className }: IconProps) => <S className={className}><path d="m15 5-7 7 7 7" /></S>;
export const CloseIcon = ({ className }: IconProps) => <S className={className}><path d="m6 6 12 12M18 6 6 18" /></S>;
export const GridIcon = ({ className }: IconProps) => <S className={className}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></S>;
export const TrophyIcon = ({ className }: IconProps) => <S className={className}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a3 3 0 0 0 3 3h1M16 6h4v2a3 3 0 0 1-3 3h-1" /><path d="M12 13v4M8 21h8M10 17h4v4h-4z" /></S>;
export const SparkleIcon = ({ className }: IconProps) => <S className={className}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill="currentColor" stroke="none" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" fill="currentColor" stroke="none" /></S>;
export const ClockIcon = ({ className }: IconProps) => <S className={className}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></S>;
export const CheckIcon = ({ className }: IconProps) => <S className={className}><path d="m5 12 4 4L19 6" /></S>;
export const FlameIcon = ({ className }: IconProps) => <S className={className}><path d="M12 3c2 4 5 5.4 5 9a5 5 0 0 1-10 0c0-2 1.2-3.4 2.4-4.8C10.6 5.8 12 4.6 12 3Z" fill="currentColor" stroke="none" /></S>;
export const SettingsSliders = ({ className }: IconProps) => <S className={className}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></S>;

/** Hand-built pixel diya mark used for the brand + menu. */
export function DiyaMark({ className = "h-10 w-10" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" shapeRendering="crispEdges">
      <rect x="14" y="3" width="4" height="3" fill="#fff4d6" />
      <rect x="13" y="6" width="6" height="3" fill="#ffd479" />
      <rect x="12" y="9" width="8" height="4" fill="#ff9d3c" />
      <rect x="14" y="9" width="4" height="2" fill="#fff4d6" />
      <rect x="5" y="18" width="22" height="4" fill="#e08b4a" />
      <rect x="7" y="22" width="18" height="4" fill="#b5532b" />
      <rect x="10" y="26" width="12" height="2" fill="#8e4327" />
      <rect x="5" y="17" width="22" height="2" fill="#ffcf6b" />
      <rect x="8" y="20" width="2" height="2" fill="#ff7fa8" />
      <rect x="22" y="20" width="2" height="2" fill="#7ae8ff" />
    </svg>
  );
}

/* --------------------------- Small UI ---------------------------- */

export function Stars({ count, size = 14, total = 3 }: { count: number; size?: number; total?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${count} of ${total} stars`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="inline-flex"
          style={{ width: size, height: size }}
        >
          <StarIcon className={i < count ? "h-full w-full text-[#ffc85c] drop-shadow-[0_0_4px_rgba(255,200,92,0.55)]" : "h-full w-full text-[#4a3965]"} />
        </span>
      ))}
    </span>
  );
}

export function Key({ children }: { children: ReactNode }) {
  return <span className="keycap">{children}</span>;
}

export function ProgressBar({ value, max, color = "#ffc85c", className = "" }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-[#0d071d] ring-1 ring-inset ring-white/10 ${className}`}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}88` }} />
    </div>
  );
}

export function ToneDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="ornament-line" />
      {label ? <span className="font-pixel text-[9px] uppercase tracking-[0.22em] text-[#a48fc4]">{label}</span> : <DiyaMark className="h-3.5 w-3.5 opacity-80" />}
      <span className="ornament-line" />
    </div>
  );
}

/* --------------------------- Level card -------------------------- */

export function LevelCard({
  level, index, locked, current, best, onSelect, compact = false,
}: {
  level: LevelDef;
  index: number;
  locked: boolean;
  current?: boolean;
  best?: { score: number; stars: number };
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      aria-label={locked ? `${level.name} — locked` : `Play ${level.name}`}
      className={`level-card group ${locked ? "locked" : ""} ${current ? "current" : ""}`}
    >
      <div className="level-thumb" style={{ backgroundImage: level.cardGradient }}>
        <div className="silhouette" />
        <span className="absolute left-2 top-1.5 z-10 font-pixel text-[10px] text-white/80">0{index + 1}</span>
        <span className={`absolute right-2 z-10 ${compact ? "top-1 text-base" : "top-1 text-xl"} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>{level.emoji}</span>
        <span className="lamp z-10">🪔</span>
        {locked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-0.5 bg-[#0b0618]/65">
            <LockIcon className="h-4 w-4 text-[#cdbbeb]" />
            <span className="font-pixel text-[8px] uppercase tracking-[0.18em] text-[#cdbbeb]">locked</span>
          </div>
        )}
        {!locked && best?.stars ? (
          <span className="absolute bottom-1 right-1.5 z-10 rounded bg-[#0b0618]/70 px-1 py-0.5 font-pixel text-[8px] text-[#ffd479]">
            ★ {best.stars}
          </span>
        ) : null}
      </div>
      <div className={`flex items-center justify-between gap-2 ${compact ? "px-2 py-1.5" : "px-2.5 py-2"}`}>
        <div className="min-w-0">
          <p className="truncate font-pixel text-[11px] leading-tight text-[#fff4da]">{level.name}</p>
          <p className="truncate text-[8px] uppercase tracking-[0.12em] text-[#a995c7]">
            {locked ? "Light the previous night" : level.subtitle}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Stars count={best?.stars ?? 0} size={compact ? 8 : 10} />
          {best ? <p className="mt-0.5 text-[8px] tabular-nums text-[#c3b2dc]">{best.score.toLocaleString()}</p> : null}
        </div>
      </div>
    </button>
  );
}

/* --------------------------- Modal shell ------------------------- */

export function ModalShell({
  title, eyebrow, onClose, children, wide = false, accent = "gold",
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  accent?: "gold" | "rose" | "teal";
}) {
  const bar = accent === "rose" ? "from-[#ff7fa8] to-[#c23a68]" : accent === "teal" ? "from-[#6ff2ca] to-[#1d9c8b]" : "from-[#ffd479] to-[#e79a2f]";
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[#07030f]/78 p-3 backdrop-blur-md sm:p-6">
      <div className="flex min-h-full items-start justify-center pt-2 sm:items-center sm:pt-0">
        <div className={`animate-pop w-full ${wide ? "max-w-3xl" : "max-w-xl"} overflow-hidden rounded-2xl border border-[#5a3b86] bg-[#160d2a] shadow-[0_20px_70px_rgba(0,0,0,0.65)]`}>
          <div className="relative border-b border-white/10 bg-gradient-to-br from-[#251543] to-[#170d2b] px-4 pb-4 pt-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                {eyebrow && <p className="font-pixel text-[9px] uppercase tracking-[0.24em] text-[#c3a7ee]">{eyebrow}</p>}
                <h2 className="mt-1 font-pixel text-xl text-[#fff4da] sm:text-2xl">{title}</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close dialog" className="icon-btn shrink-0">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${bar}`} />
          </div>
          <div className="max-h-[74vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Toggle ---------------------------- */

export function Toggle({ on, onChange, label, description, icon }: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#493069] bg-[#1d1135]/80 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="text-[#ffc85c]">{icon}</span>}
        <div className="min-w-0">
          <p className="font-pixel text-[12px] text-[#f6eadb]">{label}</p>
          {description && <p className="text-[10px] leading-snug text-[#a995c7]">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${on ? "border-[#ffd479]/60 bg-[#8f5a1f]" : "border-white/15 bg-[#0d071d]"}`}
      >
        <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full border transition-all ${on ? "left-[22px] border-[#fff0c0] bg-[#ffd479]" : "left-0.5 border-white/25 bg-[#6b5a83]"}`} style={{ height: 18, width: 18 }} />
      </button>
    </div>
  );
}

export function VolumeRow({ label, value, onChange, disabled = false }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-[#493069] bg-[#1d1135]/80 px-3 py-2.5 ${disabled ? "opacity-50" : ""}`}>
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[#b5a6ce]">
        <span>{label}</span>
        <span className="font-pixel text-[11px] text-[#ffd479]">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        disabled={disabled}
        aria-label={`${label} volume`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#3b2558] accent-[#ffc85c]"
      />
    </div>
  );
}
