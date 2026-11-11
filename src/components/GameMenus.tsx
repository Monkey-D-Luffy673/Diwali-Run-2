import { useState } from "react";
import { formatTime, type LevelResult, type Snapshot } from "../game/engine";
import {
  ArrowIcon, CheckIcon, ClockIcon, DiyaMark, FlameIcon, HeartIcon, HomeIcon, LockIcon,
  MusicIcon, PauseIcon, PlayIcon, RestartIcon, SoundIcon, SparkleIcon, Stars, StarIcon,
  ToneDivider, GridIcon, SettingsSliders,
} from "./ui";

/* ------------------------------- HUD ----------------------------- */

export function GameHUD({ snap, onPause }: { snap: Snapshot; onPause: () => void }) {
  const pct = snap.requiredDiyas ? Math.min(100, (snap.diyas / snap.requiredDiyas) * 100) : 0;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2 sm:p-3">
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <div className="hud-chip flex max-w-[190px] items-center gap-1.5 rounded-md px-2 py-1 sm:max-w-none sm:gap-2 sm:px-2.5 sm:py-1.5">
          <span className="grid h-5 w-5 place-items-center rounded bg-[#ffd479]/15 font-pixel text-[10px] text-[#ffd479] sm:h-6 sm:w-6 sm:text-xs">
            {snap.levelIndex + 1}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="whitespace-nowrap text-[7px] uppercase tracking-[0.14em] text-[#c9b9e6] sm:text-[8px]">Night {snap.levelIndex + 1} of 5</p>
            <p className="truncate font-pixel text-[10px] text-[#fff4da] sm:text-xs">{snap.levelName}</p>
          </div>
        </div>
        <div className="hud-chip flex items-center gap-1.5 rounded-md px-2 py-1">
          <span className="text-[11px] leading-none">🪔</span>
          <span className="font-pixel text-[10px] tabular-nums text-[#ffe9b0] sm:text-[11px]">
            {snap.diyas}<span className="text-[#b7a3d4]">/{snap.requiredDiyas}</span>
          </span>
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#0b0618] sm:w-16">
            <span className="block h-full rounded-full bg-gradient-to-r from-[#ff9d5c] to-[#ffd479] transition-all duration-300" style={{ width: `${pct}%` }} />
          </span>
          <span className={`hidden items-center gap-0.5 text-[8px] sm:flex ${snap.gateOpen ? "text-[#8affd9]" : "text-[#9d8ab9]"}`}>
            {snap.gateOpen ? <SparkleIcon className="h-2.5 w-2.5" /> : <LockIcon className="h-2.5 w-2.5" />}
            {snap.gateOpen ? "gate lit" : "gate"}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="hud-chip flex items-center gap-1 rounded-md px-2 py-1.5" aria-label={`${snap.health} hearts remaining`}>
            {Array.from({ length: snap.maxHealth }).map((_, i) => (
              <HeartIcon
                key={i}
                className={`h-3 w-3 transition-all sm:h-3.5 sm:w-3.5 ${i < snap.health ? "text-[#ff6f95] drop-shadow-[0_0_4px_rgba(255,95,143,0.6)]" : "text-[#4e3b62]"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onPause}
            className="pointer-events-auto grid h-[30px] w-[30px] place-items-center rounded-md border border-[#ffd479]/30 bg-[#160b2a]/85 text-[#ffe9b0] backdrop-blur-sm transition hover:bg-[#35205a] focus-visible:outline-2 focus-visible:outline-[#ffc85c] sm:h-8 sm:w-8"
            aria-label="Pause game"
          >
            <PauseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="hud-chip flex items-center gap-2 rounded-md px-2 py-1">
          <span className="font-pixel text-[10px] tabular-nums text-[#ffe9b0] sm:text-xs">{snap.score.toLocaleString()}</span>
          <span className="text-[7px] uppercase tracking-[0.18em] text-[#a995c7] sm:text-[8px]">score</span>
        </div>
        <div className="hud-chip hidden items-center gap-1 rounded-md px-2 py-1 sm:flex">
          <ClockIcon className="h-2.5 w-2.5 text-[#9edfd5]" />
          <span className="font-pixel text-[10px] tabular-nums text-[#d9fbf5]">{formatTime(snap.elapsed)}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Touch ------------------------------ */

export function TouchControls({
  onTouch, onJumpPress, onJumpRelease,
}: {
  onTouch: (dir: "left" | "right", pressed: boolean) => void;
  onJumpPress: () => void;
  onJumpRelease: () => void;
}) {
  const [held, setHeld] = useState({ left: false, right: false, jump: false });

  const move = (dir: "left" | "right", pressed: boolean) => {
    setHeld((h) => ({ ...h, [dir]: pressed }));
    onTouch(dir, pressed);
  };
  const jump = (pressed: boolean) => {
    setHeld((h) => ({ ...h, jump: pressed }));
    if (pressed) onJumpPress();
    else onJumpRelease();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between p-2.5 sm:p-4">
      <div className="pointer-events-auto flex gap-2">
        <button
          type="button"
          aria-label="Move left"
          className={`touch-pad ${held.left ? "pressed" : ""}`}
          onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ } move("left", true); }}
          onPointerUp={(e) => { e.preventDefault(); move("left", false); }}
          onPointerCancel={() => move("left", false)}
          onPointerLeave={() => { if (held.left) move("left", false); }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        <button
          type="button"
          aria-label="Move right"
          className={`touch-pad ${held.right ? "pressed" : ""}`}
          onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ } move("right", true); }}
          onPointerUp={(e) => { e.preventDefault(); move("right", false); }}
          onPointerCancel={() => move("right", false)}
          onPointerLeave={() => { if (held.right) move("right", false); }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m10 6 6 6-6 6" /></svg>
        </button>
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-1">
        <span className="font-pixel text-[8px] uppercase tracking-[0.16em] text-[#ffe9b0]/75 drop-shadow">jump ×2</span>
        <button
          type="button"
          aria-label="Jump"
          className={`touch-pad touch-jump ${held.jump ? "pressed" : ""}`}
          onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ } jump(true); }}
          onPointerUp={(e) => { e.preventDefault(); jump(false); }}
          onPointerCancel={() => jump(false)}
          onPointerLeave={() => { if (held.jump) jump(false); }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Menu ------------------------------ */

export function MenuOverlay({
  unlocked, totalStars, onPlay, onLevels, onHowTo, onSettings,
}: {
  unlocked: number;
  totalStars: number;
  onPlay: () => void;
  onLevels: () => void;
  onHowTo: () => void;
  onSettings: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex overflow-y-auto overscroll-contain bg-gradient-to-r from-[#0c061c]/96 via-[#100823]/86 to-[#100823]/15">
      <div className="flex w-full max-w-[370px] flex-col justify-center gap-2.5 p-4 sm:gap-4 sm:p-7">
        <div className="flex items-center gap-2">
          <span className="chip !border-[#ffc85c]/30 !bg-[#30200f]/60 !text-[#ffd479]">
            <SparkleIcon className="h-2.5 w-2.5" /> A five-night adventure
          </span>
        </div>

        <div>
          <div className="flex items-end gap-2">
            <DiyaMark className="mb-1 h-8 w-8 animate-floaty sm:h-11 sm:w-11" />
            <div>
              <p className="font-deva text-[11px] leading-none text-[#ffb37a] sm:text-sm">दीपावली</p>
              <h1 className="gold-text font-pixel text-3xl leading-none tracking-tight sm:text-[52px]">DIWALI</h1>
            </div>
          </div>
          <p className="mt-1 font-pixel text-[9px] uppercase tracking-[0.22em] text-[#e9d7ff] sm:mt-1.5 sm:text-[11px] sm:tracking-[0.34em]">
            The Festival of Lights
          </p>
          <p className="mt-2 hidden max-w-[300px] text-[11px] leading-relaxed text-[#c9b7e4] sm:block">
            Carry a little flame through five luminous worlds. Gather diyas, leap the shadows, and wake the toran gate before the fireworks fade.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 pt-1 sm:gap-2">
          <button type="button" onClick={onPlay} className="pixel-btn pixel-btn-primary w-full !py-2 text-sm sm:!py-3 sm:text-base">
            <PlayIcon className="h-4 w-4" /> {unlocked > 1 ? "Continue the journey" : "Begin the journey"}
            <span className="ml-auto hidden rounded border border-[#2b1206]/25 bg-[#2b1206]/10 px-1.5 py-0.5 text-[9px] sm:inline">ENTER</span>
          </button>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <button type="button" onClick={onLevels} className="pixel-btn pixel-btn-ghost !px-2 !py-2 text-[11px] sm:text-xs">
              <GridIcon className="h-3.5 w-3.5 text-[#ffd479]" /> 5 Nights
            </button>
            <button type="button" onClick={onHowTo} className="pixel-btn pixel-btn-ghost !px-2 !py-2 text-[11px] sm:text-xs">
              <SparkleIcon className="h-3.5 w-3.5 text-[#ff9fc0]" /> How to play
            </button>
          </div>
        </div>

        <div className="hidden items-center justify-between gap-3 sm:flex">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[#a995c7]">
            <span className="inline-flex items-center gap-1"><FlameIcon className="h-2.5 w-2.5 text-[#ffb35c]" /> {unlocked}/5 lit</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="inline-flex items-center gap-1"><StarIcon className="h-2.5 w-2.5 text-[#ffd479]" /> {totalStars}/15</span>
            <span className="h-3 w-px bg-white/15" />
            <button type="button" onClick={onSettings} className="transition hover:text-[#ffd479]">Settings</button>
          </div>
          <span className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#6f5e88]">use sound ⏻</span>
        </div>

        <div className="absolute right-3 top-3 hidden flex-col items-end gap-1.5 md:flex">
          <span className="hud-chip rounded-full px-2.5 py-1 font-pixel text-[9px] uppercase tracking-[0.14em] text-[#ffe9b0]">
            Festival edition
          </span>
          <span className="hud-chip rounded-full px-2.5 py-1 text-[9px] text-[#c9b7e4]">
            Hand-drawn pixel art · original score
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Pause ----------------------------- */

export function PauseOverlay({
  snap, onResume, onRestart, onQuit, onSettings, musicOn, sfxOn, onToggleMusic, onToggleSfx,
}: {
  snap: Snapshot;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onSettings: () => void;
  musicOn: boolean;
  sfxOn: boolean;
  onToggleMusic: () => void;
  onToggleSfx: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#07030f]/66 p-3 backdrop-blur-[3px]">
      <div className="animate-pop w-full max-w-[350px] rounded-xl border border-[#ffd479]/30 bg-gradient-to-b from-[#22133d]/97 to-[#120a25]/97 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-pixel text-[9px] uppercase tracking-[0.24em] text-[#c3a7ee]">Night {snap.levelIndex + 1} · pause</p>
            <h2 className="font-pixel text-2xl leading-tight text-[#fff4da]">Breathe in the light.</h2>
          </div>
          <DiyaMark className="h-9 w-9 animate-flicker" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            ["Diyas", `${snap.diyas}/${snap.requiredDiyas}`],
            ["Score", snap.score.toLocaleString()],
            ["Time", formatTime(snap.elapsed)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/10 bg-[#0d071e]/60 px-1 py-1.5">
              <p className="text-[8px] uppercase tracking-[0.12em] text-[#a995c7]">{k}</p>
              <p className="font-pixel text-[12px] text-[#ffe9b0]">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <button type="button" onClick={onToggleMusic} className={`icon-btn !h-8 !w-8 ${musicOn ? "on" : ""}`} aria-label={musicOn ? "Mute music" : "Play music"}>
            <MusicIcon className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onToggleSfx} className={`icon-btn !h-8 !w-8 ${sfxOn ? "on" : ""}`} aria-label={sfxOn ? "Mute sound effects" : "Enable sound effects"}>
            {sfxOn ? <SoundIcon className="h-3.5 w-3.5" /> : <MuteIconSmall />}
          </button>
          <button type="button" onClick={onSettings} className="icon-btn !h-8 !w-8" aria-label="Open settings">
            <SettingsSliders className="h-3.5 w-3.5" />
          </button>
          <span className="ml-auto hidden items-center gap-1 text-[9px] text-[#8f7ba9] sm:flex"><span className="keycap !h-5 !min-w-5 !text-[9px]">esc</span> resume</span>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <button type="button" onClick={onResume} className="pixel-btn pixel-btn-primary w-full !py-2 text-sm">
            <PlayIcon className="h-4 w-4" /> Resume journey
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={onRestart} className="pixel-btn pixel-btn-ghost !px-2 !py-2 text-[11px]">
              <RestartIcon className="h-3.5 w-3.5" /> Restart
            </button>
            <button type="button" onClick={onQuit} className="pixel-btn pixel-btn-ghost !px-2 !py-2 text-[11px]">
              <HomeIcon className="h-3.5 w-3.5" /> Back to village
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MuteIconSmall() {
  return <SoundIcon className="h-3.5 w-3.5 opacity-30" />;
}

/* -------------------------- End screens -------------------------- */

function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border px-1.5 py-1.5 text-center ${accent ? "border-[#ffd479]/30 bg-[#3a270f]/40" : "border-white/10 bg-[#0d071e]/60"}`}>
      <p className="text-[7px] uppercase tracking-[0.13em] text-[#a995c7] sm:text-[8px]">{label}</p>
      <p className={`font-pixel text-[12px] leading-tight sm:text-sm ${accent ? "text-[#ffd479]" : "text-[#ffe9b0]"}`}>{value}</p>
    </div>
  );
}

export function CompleteOverlay({
  snap, totalStars, onNext, onReplay, onLevels, onPlayAgain,
}: {
  snap: Snapshot;
  totalStars: number;
  onNext: () => void;
  onReplay: () => void;
  onLevels: () => void;
  onPlayAgain: () => void;
}) {
  const result: LevelResult | null = snap.result;
  if (!result) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#07030f]/55 p-2 backdrop-blur-[2px] sm:p-4">
      <div className="animate-pop my-auto w-full max-w-[410px] overflow-hidden rounded-xl border border-[#ffd479]/40 bg-gradient-to-b from-[#251440]/98 to-[#10081f]/98 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="marigold-strip" />
        <div className="p-3 text-center sm:p-5">
          <p className="font-pixel text-[8px] uppercase tracking-[0.22em] text-[#ffb88a] sm:text-[9px]">
            {result.final ? "The final flame" : `Night ${result.levelIndex + 1} · complete`}
          </p>
          <h2 className="mt-0.5 gold-text font-pixel text-2xl leading-none pixel-text-shadow sm:text-4xl">
            {result.final ? "VICTORY" : "JOURNEY COMPLETE"}
          </h2>
          <p className="mt-1 text-[10px] text-[#d5c4ee] sm:text-xs">
            {result.final ? "The whole village shines with your light." : snap.levelName}
          </p>
          <div className="mt-1.5 flex justify-center"><Stars count={result.stars} size={22} /></div>

          <div className="mt-2 grid grid-cols-4 gap-1 sm:mt-3 sm:gap-1.5">
            <StatCell label="Score" value={result.score.toLocaleString()} accent />
            <StatCell label="Diyas" value={`${result.diyas}/${result.totalDiyas}`} />
            <StatCell label="Time" value={formatTime(result.time)} />
            <StatCell label="Hearts" value={`${result.health}/3`} />
          </div>

          {result.final ? (
            <div className="mt-2 rounded-lg border border-[#ffd479]/20 bg-[#2e1e0d]/40 px-2 py-1.5 text-[9px] text-[#ffe3a4] sm:text-[10px]">
              <span className="font-pixel text-[10px] text-[#ffd479]">★ {totalStars}/15 festival stars</span>
              <span className="hidden sm:inline"> · From one small diya, an entire village of light.</span>
            </div>
          ) : (
            <div className="mt-2 hidden gap-2 text-left sm:flex">
              {[
                ["Complete the night", true],
                [`Collect 60% of diyas`, result.diyas >= Math.ceil(result.totalDiyas * 0.6)],
                ["2+ hearts & under 3:30", result.health >= 2 && result.time <= 210],
              ].map(([label, done], i) => (
                <div key={i} className="flex flex-1 items-center gap-1 rounded border border-white/10 bg-[#0d071e]/50 px-1.5 py-1">
                  <span className={`grid h-3.5 w-3.5 place-items-center rounded-full ${done ? "bg-[#ffd479]/20 text-[#ffd479]" : "bg-white/5 text-[#65537d]"}`}>
                    {done ? <CheckIcon className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                  <span className="text-[8px] leading-tight text-[#c8b8e0]">{String(label)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2.5 flex flex-col gap-1.5 sm:mt-3">
            {result.final ? (
              <button type="button" onClick={onPlayAgain} className="pixel-btn pixel-btn-primary w-full !py-2 text-sm">
                <RestartIcon className="h-4 w-4" /> Play the journey again
              </button>
            ) : (
              <button type="button" onClick={onNext} className="pixel-btn pixel-btn-primary w-full !py-2 text-sm">
                <PlayIcon className="h-4 w-4" /> Next night <ArrowIcon className="ml-auto h-4 w-4" />
              </button>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={onReplay} className="pixel-btn pixel-btn-ghost !px-2 !py-1.5 text-[10px] sm:text-[11px]">
                <RestartIcon className="h-3.5 w-3.5" /> Replay
              </button>
              <button type="button" onClick={onLevels} className="pixel-btn pixel-btn-ghost !px-2 !py-1.5 text-[10px] sm:text-[11px]">
                <GridIcon className="h-3.5 w-3.5" /> Nights
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameOverOverlay({
  snap, onRetry, onLevels,
}: {
  snap: Snapshot;
  onRetry: () => void;
  onLevels: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#07030f]/72 p-2 backdrop-blur-[2px] sm:p-4">
      <div className="animate-pop my-auto w-full max-w-[380px] overflow-hidden rounded-xl border border-[#ff5f8f]/35 bg-gradient-to-b from-[#261132]/98 to-[#0e071b]/98 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <div className="p-4 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-[#ff5f8f]/30 bg-[#3d1427]/60">
            <FlameIcon className="h-5 w-5 text-[#ff9fc0]" />
          </div>
          <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.24em] text-[#ffb0c8]">Night {snap.levelIndex + 1}</p>
          <h2 className="rose-text font-pixel text-2xl leading-tight sm:text-3xl">THE LIGHTS WENT OUT</h2>
          <p className="mx-auto mt-1 max-w-[280px] text-[10px] leading-relaxed text-[#d4c2e8] sm:text-xs">
            Not every night goes to plan. A diya never loses hope — relight it and step back into the festival.
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            <StatCell label="Score" value={snap.score.toLocaleString()} accent />
            <StatCell label="Diyas" value={`${snap.diyas}/${snap.requiredDiyas}`} />
            <StatCell label="Time" value={formatTime(snap.elapsed)} />
          </div>
          {snap.checkpointActive && (
            <p className="mt-1.5 text-[9px] text-[#8affd9]">Your checkpoint lamp will relight you there.</p>
          )}
          <div className="mt-3 flex flex-col gap-1.5">
            <button type="button" onClick={onRetry} className="pixel-btn pixel-btn-rose w-full !py-2 text-sm">
              <RestartIcon className="h-4 w-4" /> Try this night again
            </button>
            <button type="button" onClick={onLevels} className="pixel-btn pixel-btn-ghost w-full !py-1.5 text-[11px]">
              <GridIcon className="h-3.5 w-3.5" /> Back to the village map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MenuFooterHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-20 flex justify-center">
      <span className="rounded-full bg-[#0b0618]/60 px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-[#c5b3df] backdrop-blur">
        Arrow keys / WASD · Space to jump · Esc to pause
      </span>
    </div>
  );
}

export function MenuLevelUnlockNote({ unlocked }: { unlocked: number }) {
  return (
    <div className="hidden rounded-lg border border-[#ffd479]/20 bg-[#2a1a0f]/60 px-2 py-1 text-[9px] text-[#ffe3a4] md:block">
      <ToneDivider label={unlocked >= 5 ? "All five nights unlocked" : `${5 - unlocked} night${5 - unlocked === 1 ? "" : "s"} still hidden in the dark`} />
    </div>
  );
}
