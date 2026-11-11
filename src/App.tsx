import { useEffect, useRef, useState } from "react";
import { LEVELS, type LevelDef } from "./game/levels";
import { DiwaliGame, formatTime, type Snapshot } from "./game/engine";
import { FestiveAudio } from "./game/audio";
import {
  CompleteOverlay, GameHUD, GameOverOverlay, MenuOverlay, PauseOverlay, TouchControls,
} from "./components/GameMenus";
import { HowToModal, LevelsModal, SettingsModal } from "./components/Modals";
import {
  ArrowIcon, CheckIcon, ClockIcon, DiyaMark, FlameIcon, GearIcon, GridIcon, HeartIcon, Key,
  LevelCard, MusicIcon, MuteIcon, PauseIcon, PlayIcon, ProgressBar, RestartIcon,
  SoundIcon, SparkleIcon, StarIcon, Stars, ToneDivider, TrophyIcon,
} from "./components/ui";

/* ------------------------------------------------------------------ */
/* Persisted data                                                      */
/* ------------------------------------------------------------------ */

type BestMap = Record<number, { score: number; stars: number }>;
interface Progress { unlocked: number; best: BestMap; }
interface Settings { music: boolean; sfx: boolean; musicVol: number; sfxVol: number; }
type ModalName = "levels" | "howto" | "settings" | null;
interface ToastData { id: number; message: string; tone: "good" | "bad" | "info"; }

const PROGRESS_KEY = "diwali-progress-v1";
const SETTINGS_KEY = "diwali-settings-v1";

const defaultProgress: Progress = { unlocked: 1, best: {} };
const defaultSettings: Settings = { music: true, sfx: true, musicVol: 0.55, sfxVol: 0.8 };

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const unlocked = Math.min(5, Math.max(1, Number(parsed.unlocked) || 1));
    const best: BestMap = {};
    if (parsed.best && typeof parsed.best === "object") {
      for (const [k, v] of Object.entries(parsed.best)) {
        if (v && typeof v === "object") {
          const val = v as { score?: unknown; stars?: unknown };
          best[Number(k)] = { score: Number(val.score) || 0, stars: Math.min(3, Math.max(0, Number(val.stars) || 0)) };
        }
      }
    }
    return { unlocked, best };
  } catch {
    return defaultProgress;
  }
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      music: typeof p.music === "boolean" ? p.music : true,
      sfx: typeof p.sfx === "boolean" ? p.sfx : true,
      musicVol: typeof p.musicVol === "number" ? Math.min(1, Math.max(0, p.musicVol)) : 0.55,
      sfxVol: typeof p.sfxVol === "number" ? Math.min(1, Math.max(0, p.sfxVol)) : 0.8,
    };
  } catch {
    return defaultSettings;
  }
}

const initialSnapshot: Snapshot = {
  mode: "menu",
  levelIndex: 0,
  levelName: LEVELS[0].name,
  score: 0,
  health: 3,
  maxHealth: 3,
  diyas: 0,
  totalDiyas: LEVELS[0].items.filter((i) => i.kind === "diya").length,
  requiredDiyas: LEVELS[0].requiredDiyas,
  laddoos: 0,
  totalLaddoos: LEVELS[0].items.filter((i) => i.kind === "laddoo").length,
  gateOpen: false,
  checkpointActive: false,
  elapsed: 0,
  result: null,
};

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DiwaliGame | null>(null);
  const audioRef = useRef<FestiveAudio | null>(null);
  const autoPausedRef = useRef(false);
  const lastResultRef = useRef<object | null>(null);

  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [modal, setModal] = useState<ModalName>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showTouch, setShowTouch] = useState(false);

  const totalStars = Object.values(progress.best).reduce((n, b) => n + b.stars, 0);

  /* ------------------------- engine boot -------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const startSettings = loadSettings();
    const audio = new FestiveAudio();
    audio.musicEnabled = startSettings.music;
    audio.sfxEnabled = startSettings.sfx;
    audio.setMusicVolume(startSettings.musicVol);
    audio.setSfxVolume(startSettings.sfxVol);

    const game = new DiwaliGame(canvas, audio, {
      onSnapshot: (s) => setSnap(s),
      onEvent: (message, tone) => setToast({ id: Date.now() + Math.random(), message, tone }),
    });
    engineRef.current = game;
    audioRef.current = audio;

    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      game.destroy();
      audio.destroy();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      engineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  /* --------------------- persistence effects --------------------- */
  useEffect(() => {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* private mode */ }
  }, [progress]);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    document.body.dataset.modal = modal ? "1" : "0";
    return () => { delete document.body.dataset.modal; };
  }, [modal]);

  /* Touch controls are driven by pointer capability, not viewport width, so
     landscape phones and tablets always get their pad. */
  useEffect(() => {
    const detect = () => {
      const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
      const touch = "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
      setShowTouch(coarse || touch || window.innerWidth < 768);
    };
    detect();
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  /* ------------------------ unlock progress ---------------------- */
  useEffect(() => {
    const result = snap.result;
    if (snap.mode !== "complete" || !result) return;
    if (lastResultRef.current === result) return;
    lastResultRef.current = result;
    setProgress((prev) => {
      const previous = prev.best[result.levelIndex];
      const best: BestMap = {
        ...prev.best,
        [result.levelIndex]: {
          score: Math.max(previous?.score ?? 0, result.score),
          stars: Math.max(previous?.stars ?? 0, result.stars),
        },
      };
      const unlocked = result.final ? 5 : Math.max(prev.unlocked, Math.min(5, result.levelIndex + 2));
      return { unlocked, best };
    });
  }, [snap.mode, snap.result]);

  /* --------------------------- audio ----------------------------- */
  const applyAudio = (s: Settings) => {
    const a = audioRef.current;
    if (!a) return;
    a.setMusicEnabled(s.music);
    a.setSfxEnabled(s.sfx);
    a.setMusicVolume(s.musicVol);
    a.setSfxVolume(s.sfxVol);
  };

  const patchSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    applyAudio(next);
  };

  const toggleMusic = () => {
    const a = audioRef.current;
    a?.unlock();
    a?.sfx("click");
    patchSettings({ music: !settings.music });
  };

  const toggleSfx = () => {
    const a = audioRef.current;
    a?.unlock();
    a?.sfx("click");
    patchSettings({ sfx: !settings.sfx });
  };

  const tap = () => {
    audioRef.current?.unlock();
    audioRef.current?.sfx("click");
  };

  /* -------------------------- actions ---------------------------- */
  const scrollToGame = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.setTimeout(() => frameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    }
  };

  const startLevel = (index: number) => {
    if (index >= progress.unlocked) {
      setToast({ id: Date.now(), message: "This celebration is still hidden. Finish the previous night first.", tone: "info" });
      audioRef.current?.sfx("locked");
      return;
    }
    tap();
    autoPausedRef.current = false;
    setModal(null);
    document.body.dataset.modal = "0";
    engineRef.current?.startLevel(index);
    lastResultRef.current = null;
    scrollToGame();
  };

  const openModal = (name: Exclude<ModalName, null>) => {
    tap();
    if (snap.mode === "playing") {
      engineRef.current?.pause();
      autoPausedRef.current = true;
    }
    document.body.dataset.modal = "1";
    setModal(name);
  };

  const closeModal = () => {
    setModal(null);
    document.body.dataset.modal = "0";
    if (autoPausedRef.current) {
      autoPausedRef.current = false;
      if (engineRef.current?.mode === "paused") engineRef.current.resume();
    }
  };

  const goHome = () => {
    tap();
    autoPausedRef.current = false;
    setModal(null);
    engineRef.current?.showMenu();
  };

  const primaryAction = () => {
    tap();
    const engine = engineRef.current;
    if (!engine) return;
    if (snap.mode === "menu") startLevel(Math.min(progress.unlocked - 1, LEVELS.length - 1));
    else if (snap.mode === "playing") engine.pause();
    else if (snap.mode === "paused") engine.resume();
    else if (snap.mode === "gameover") engine.restartLevel();
    else if (snap.mode === "complete") {
      if (snap.result?.final) { setModal(null); engine.startLevel(0); }
      else { setModal(null); engine.nextLevel(); }
    }
  };

  const handleNext = () => {
    tap();
    setModal(null);
    engineRef.current?.nextLevel();
  };

  const handleReplay = () => {
    tap();
    setModal(null);
    autoPausedRef.current = false;
    lastResultRef.current = null;
    engineRef.current?.restartLevel();
  };

  const handlePlayAgain = () => {
    tap();
    setModal(null);
    autoPausedRef.current = false;
    lastResultRef.current = null;
    engineRef.current?.startLevel(0);
  };

  const openLevelsFromEnd = () => {
    tap();
    autoPausedRef.current = false;
    setModal(null);
    engineRef.current?.showMenu();
    setModal("levels");
  };

  const resetProgress = () => {
    setProgress({ unlocked: 1, best: {} });
    lastResultRef.current = null;
    autoPausedRef.current = false;
    setModal(null);
    engineRef.current?.showMenu();
    setToast({ id: Date.now(), message: "A fresh path of light. All nights begin again from the village.", tone: "good" });
  };

  const onPause = () => {
    tap();
    engineRef.current?.pause();
  };

  const onResume = () => {
    tap();
    autoPausedRef.current = false;
    engineRef.current?.resume();
  };

  const onRestartFromPause = () => {
    tap();
    autoPausedRef.current = false;
    lastResultRef.current = null;
    engineRef.current?.restartLevel();
  };

  const onQuit = () => {
    tap();
    autoPausedRef.current = false;
    engineRef.current?.showMenu();
  };

  /* --------------------- keyboard shortcuts ---------------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (modal) {
        if (e.key === "Escape") { e.preventDefault(); closeModal(); }
        return;
      }
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(el.tagName)) return;
      if (e.key === "Enter") {
        if (snap.mode === "menu") { e.preventDefault(); startLevel(Math.min(progress.unlocked - 1, 4)); }
        else if (snap.mode === "complete" && snap.result && !snap.result.final) { e.preventDefault(); handleNext(); }
        else if (snap.mode === "gameover") { e.preventDefault(); handleReplay(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  /* --------------------------- derived --------------------------- */
  const previewIndex = snap.mode === "menu" ? Math.min(progress.unlocked - 1, LEVELS.length - 1) : snap.levelIndex;
  const currentLevel = LEVELS[previewIndex] ?? LEVELS[0];
  const displayLevel = snap.mode === "menu" ? currentLevel : LEVELS[snap.levelIndex];
  const litNights = Object.values(progress.best).filter((b) => b.stars > 0).length;

  const primaryLabel = snap.mode === "playing" ? "Pause" : snap.mode === "paused" ? "Resume"
    : snap.mode === "complete" ? (snap.result?.final ? "Again" : "Next") : snap.mode === "gameover" ? "Retry" : "Play";
  const PrimaryIcon = snap.mode === "playing" ? PauseIcon : snap.mode === "paused" ? PlayIcon
    : snap.mode === "complete" ? ArrowIcon : snap.mode === "gameover" ? RestartIcon : PlayIcon;

  /* ---------------------------- render --------------------------- */
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="festival-bg" aria-hidden="true" />

      {/* Floating ornamental lanterns, page-level */}
      <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block" aria-hidden="true">
        <div className="absolute left-[3%] top-24 animate-floaty text-2xl opacity-25" style={{ animationDelay: "0.4s" }}>🪔</div>
        <div className="absolute right-[2.5%] top-40 animate-floaty text-xl opacity-20" style={{ animationDelay: "1.4s" }}>🏮</div>
        <div className="absolute left-[1.5%] bottom-24 animate-floaty text-lg opacity-15" style={{ animationDelay: "2.1s" }}>✨</div>
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0618]/80 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1460px] items-center justify-between gap-2 px-3 sm:px-5">
          <button type="button" onClick={goHome} className="group flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#ffc85c]" aria-label="Diwali home">
            <span className="relative grid h-9 w-9 place-items-center rounded-lg border border-[#ffc85c]/30 bg-gradient-to-br from-[#3d2454] to-[#1c102f] shadow-[0_3px_0_#080410]">
              <DiyaMark className="h-6 w-6 transition-transform group-hover:-translate-y-0.5" />
            </span>
            <span>
              <span className="gold-text block font-pixel text-[17px] leading-none tracking-[0.06em]">DIWALI</span>
              <span className="mt-0.5 block text-[7px] font-semibold uppercase tracking-[0.23em] text-[#b7a2da]">The festival of lights</span>
            </span>
          </button>

          <nav className="hidden items-center gap-0.5 rounded-full border border-white/8 bg-[#140b27]/80 p-1 md:flex" aria-label="Main navigation">
            {[
              { label: "Festival", active: snap.mode === "menu" && !modal, onClick: goHome, icon: <DiyaMark className="h-3.5 w-3.5" /> },
              { label: "5 Nights", active: modal === "levels", onClick: () => openModal("levels"), icon: <GridIcon className="h-3.5 w-3.5" /> },
              { label: "How to play", active: modal === "howto", onClick: () => openModal("howto"), icon: <SparkleIcon className="h-3.5 w-3.5" /> },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-pixel text-[11px] transition ${
                  item.active ? "bg-[#ffd479]/15 text-[#ffd479]" : "text-[#c3b0e0] hover:bg-white/5 hover:text-[#fff4da]"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMusic}
              className={`icon-btn !h-8 !w-8 ${settings.music ? "on" : "opacity-70"}`}
              aria-label={settings.music ? "Mute festival music" : "Enable festival music"}
              title={settings.music ? "Music on" : "Music off"}
            >
              {settings.music ? <MusicIcon className="h-3.5 w-3.5" /> : <MuteIcon className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={toggleSfx}
              className={`icon-btn !h-8 !w-8 ${settings.sfx ? "on" : "opacity-70"}`}
              aria-label={settings.sfx ? "Mute sound effects" : "Enable sound effects"}
              title={settings.sfx ? "Effects on" : "Effects off"}
            >
              {settings.sfx ? <SoundIcon className="h-3.5 w-3.5" /> : <MuteIcon className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => openModal("settings")} className="icon-btn !h-8 !w-8" aria-label="Open settings">
              <GearIcon className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={primaryAction} className="pixel-btn pixel-btn-primary ml-0.5 !rounded-lg !px-2.5 !py-1.5 text-xs sm:!px-3">
              <PrimaryIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{primaryLabel}</span>
            </button>
          </div>
        </div>
        <div className="marigold-strip opacity-50" aria-hidden="true" />
      </header>

      <main className="relative z-10 mx-auto max-w-[1460px] px-2.5 pb-8 pt-3 sm:px-5 sm:pt-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-0.5 sm:mb-3">
          <div className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#a995c7] sm:text-[9px]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffc85c] opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ffc85c]" />
            </span>
            Five nights of light await
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span className="hidden text-[#7f6d98] sm:block">An original pixel-art platformer</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="chip !border-transparent !bg-transparent !px-1 !text-[8px] !tracking-[0.16em] !text-[#8f7ba9]">★ {totalStars}/15 stars</span>
            <span className="h-3 w-px bg-white/10" />
            <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.16em] text-[#8f7ba9]"><SoundIcon className={`h-3 w-3 ${settings.music || settings.sfx ? "text-[#ffd479]" : "text-[#6f5e88]"}`} /> {settings.music || settings.sfx ? "sound on" : "sound off"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[242px_minmax(0,1fr)_278px] lg:items-start lg:gap-4 xl:gap-5">
          {/* Journey rail */}
          <aside className="glass-panel order-2 p-2.5 lg:order-1 lg:sticky lg:top-[78px] sm:p-3" aria-label="Level journey">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-[#ffc85c]/25 bg-[#33200f]/50"><TrophyIcon className="h-3.5 w-3.5 text-[#ffd479]" /></span>
                <div>
                  <h2 className="font-pixel text-[13px] leading-none text-[#fff4da]">Your Journey</h2>
                  <p className="mt-0.5 text-[8px] uppercase tracking-[0.16em] text-[#9c88ba]">{litNights} of 5 nights lit</p>
                </div>
              </div>
              <span className="font-pixel text-[10px] text-[#ffd479]">{Math.round((litNights / 5) * 100)}%</span>
            </div>
            <ProgressBar value={litNights} max={5} className="mb-2.5" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {LEVELS.map((level, i) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  index={i}
                  compact
                  locked={i >= progress.unlocked}
                  current={i === previewIndex}
                  best={progress.best[i]}
                  onSelect={() => startLevel(i)}
                />
              ))}
            </div>
            <div className="mt-2.5 hidden items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#0f081f]/60 px-2.5 py-2 lg:flex">
              <p className="text-[9px] leading-snug text-[#a995c7]">Every night unlocks the next celebration.</p>
              <button type="button" onClick={() => openModal("levels")} className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#ffd479] transition hover:text-[#ffe9b0]">
                map
              </button>
            </div>
          </aside>

          {/* Game */}
          <section className="order-1 min-w-0 lg:order-2" aria-label="Game area">
            <div ref={frameRef} className="pixel-frame-gold relative rounded-[18px] bg-gradient-to-b from-[#2d1b4b] to-[#170c2b] p-1 sm:p-1.5">
              <div className="game-frame scanlines vignette">
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={270}
                  className="game-canvas"
                  role="application"
                  aria-label="Diwali: The Festival of Lights — platform adventure"
                  tabIndex={0}
                />

                {snap.mode !== "menu" && <GameHUD snap={snap} onPause={onPause} />}

                {snap.mode === "menu" && (
                  <MenuOverlay
                    unlocked={progress.unlocked}
                    totalStars={totalStars}
                    onPlay={() => startLevel(Math.min(progress.unlocked - 1, 4))}
                    onLevels={() => openModal("levels")}
                    onHowTo={() => openModal("howto")}
                    onSettings={() => openModal("settings")}
                  />
                )}

                {snap.mode === "paused" && (
                  <PauseOverlay
                    snap={snap}
                    onResume={onResume}
                    onRestart={onRestartFromPause}
                    onQuit={onQuit}
                    onSettings={() => openModal("settings")}
                    musicOn={settings.music}
                    sfxOn={settings.sfx}
                    onToggleMusic={toggleMusic}
                    onToggleSfx={toggleSfx}
                  />
                )}

                {snap.mode === "complete" && (
                  <CompleteOverlay
                    snap={snap}
                    totalStars={totalStars}
                    onNext={handleNext}
                    onReplay={handleReplay}
                    onLevels={openLevelsFromEnd}
                    onPlayAgain={handlePlayAgain}
                  />
                )}

                {snap.mode === "gameover" && (
                  <GameOverOverlay snap={snap} onRetry={handleReplay} onLevels={openLevelsFromEnd} />
                )}

                {snap.mode === "playing" && showTouch && (
                  <TouchControls
                    onTouch={(dir, pressed) => engineRef.current?.setTouch(dir, pressed)}
                    onJumpPress={() => engineRef.current?.pressJump()}
                    onJumpRelease={() => engineRef.current?.releaseJump()}
                  />
                )}

                {toast && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`pointer-events-none absolute bottom-[76px] left-1/2 z-[60] w-[88%] max-w-[420px] -translate-x-1/2 rounded-lg border px-3 py-2 text-center text-[10px] leading-snug shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur-md animate-toast sm:bottom-5 sm:text-[11px] ${
                      toast.tone === "good"
                        ? "border-[#8affd9]/35 bg-[#0d2a25]/92 text-[#d4fff3]"
                        : toast.tone === "bad"
                          ? "border-[#ff7fa8]/40 bg-[#2b0f1d]/92 text-[#ffdae5]"
                          : "border-[#ffd479]/35 bg-[#2a1c0f]/92 text-[#ffeec4]"
                    }`}
                  >
                    <span className="mr-1.5 align-middle">{toast.tone === "good" ? "✨" : toast.tone === "bad" ? "🪔" : "🔔"}</span>
                    {toast.message}
                  </div>
                )}

                {/* corner ornaments */}
                <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 h-1.5 w-1.5 rounded-[1px] bg-[#ffd479]/70" aria-hidden="true" />
                <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 h-1.5 w-1.5 rounded-[1px] bg-[#ff7fa8]/70" aria-hidden="true" />
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-10 h-1.5 w-1.5 rounded-[1px] bg-[#7ae8ff]/70" aria-hidden="true" />
                <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 h-1.5 w-1.5 rounded-[1px] bg-[#ff9d5c]/70" aria-hidden="true" />
              </div>
            </div>

            {/* Control + mission strip */}
            <div className="mt-2 rounded-xl border border-[#4a316c]/60 bg-[#160d29]/80 px-2.5 py-2 shadow-[0_5px_18px_rgba(0,0,0,0.25)] sm:px-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <div className="flex items-center gap-2.5 text-[8px] uppercase tracking-[0.1em] text-[#a995c7] sm:text-[9px]">
                  <span className="flex items-center gap-1"><Key>←</Key><Key>→</Key><span className="hidden sm:inline">move</span></span>
                  <span className="flex items-center gap-1"><Key>space</Key><span className="hidden sm:inline">jump ×2</span></span>
                  <span className="hidden items-center gap-1 sm:flex"><Key>esc</Key>pause</span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <SparkleIcon className="h-3 w-3 shrink-0 text-[#ffd479]" />
                  <span className="truncate text-[9px] text-[#d5c3ec] sm:text-[10px]">
                    {snap.mode === "menu"
                      ? `${displayLevel.name} · ${displayLevel.subtitle}`
                      : snap.mode === "complete"
                        ? "The gate is lit. A new celebration awaits."
                        : snap.gateOpen
                          ? "Toran gate burning bright — run to the arch!"
                          : `Light ${Math.max(0, snap.requiredDiyas - snap.diyas)} more diyas to wake the toran gate.`}
                  </span>
                </div>
                <div className="hidden items-center gap-1.5 text-[9px] text-[#a995c7] sm:flex">
                  <span className="text-[#ffb35c]">●</span> {progress.best[snap.mode === "menu" ? previewIndex : snap.levelIndex]?.stars ?? 0}/3 stars
                </div>
              </div>
            </div>

            {/* Field guide fills the wide center column beneath the stage */}
            <div className="mt-2.5 hidden rounded-xl border border-[#4a316c]/50 bg-gradient-to-br from-[#160d29]/85 to-[#120a22]/85 p-3 sm:block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <DiyaMark className="h-4 w-4" />
                  <h2 className="font-pixel text-[12px] text-[#fff4da]">The festival field guide</h2>
                </div>
                <span className="text-[8px] uppercase tracking-[0.18em] text-[#8f7ba9]">three small acts of light</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { emoji: "🪔", title: "Gather the light", body: "Every diya adds 100 points and counts toward the gate. You need a set number each night." },
                  { emoji: "✨", title: "Leap with courage", body: "Jump, then tap jump again mid-air for a spark jump. Laddoos and gifts hide on high ledges." },
                  { emoji: "🏮", title: "Reach the toran", body: "Once the toran gate blazes, slip through the arch to open the next celebration." },
                ].map((note) => (
                  <div key={note.title} className="rounded-lg border border-white/8 bg-[#0d071e]/60 px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm leading-none">{note.emoji}</span>
                      <p className="font-pixel text-[10px] leading-tight text-[#ffe9b0]">{note.title}</p>
                    </div>
                    <p className="mt-1 text-[9px] leading-snug text-[#a995c7]">{note.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-white/5 pt-2">
                <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em] text-[#8f7ba9]">
                  <CheckIcon className="h-3 w-3 text-[#8affd9]" /> checkpoint lamps save your spot
                </span>
                <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em] text-[#8f7ba9]">
                  <FlameIcon className="h-3 w-3 text-[#ffb35c]" /> hazard: {displayLevel.hazardHint}
                </span>
              </div>
            </div>
          </section>

          {/* Quest panel */}
          <aside className="order-3 space-y-2.5 lg:sticky lg:top-[78px]" aria-label="Quest log and festival guide">
            <QuestPanel snap={snap} level={displayLevel} best={progress.best[displayLevel.id]} totalStars={totalStars} onOpenLevels={() => openModal("levels")} />
            <div className="glass-panel p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-pixel text-[12px] text-[#fff4da]">Festival treats</h2>
                <span className="text-[8px] uppercase tracking-[0.15em] text-[#8f7ba9]">points</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { icon: "🪔", name: "Glowing diya", value: "+100", note: "opens the gate" },
                  { icon: "🟡", name: "Laddoo", value: "+60", note: "sweet bonus" },
                  { icon: "🎁", name: "Festival gift", value: "+250", note: "rare find" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-2 rounded-lg border border-white/6 bg-[#0f081f]/60 px-2 py-1.5">
                    <span className="text-sm">{item.icon}</span>
                    <span className="flex-1 text-[10px] text-[#d2c1e8]">{item.name}</span>
                    <span className="text-[8px] text-[#8f7ba9]">{item.note}</span>
                    <span className="font-pixel text-[10px] text-[#ffd479]">{item.value}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => openModal("howto")}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#7ae8ff]/20 bg-[#112b33]/40 px-2 py-1.5 text-[10px] text-[#bfeee9] transition hover:border-[#7ae8ff]/45 hover:bg-[#143b44]"
              >
                <SparkleIcon className="h-3 w-3 text-[#7ae8ff]" /> Learn the festival rules
              </button>
            </div>
          </aside>
        </div>

        <footer className="mt-7 flex flex-col items-center gap-2 border-t border-white/6 pt-4 text-center">
          <div className="flex w-full max-w-md items-center gap-3">
            <span className="ornament-line" />
            <DiyaMark className="h-5 w-5 animate-flicker" />
            <span className="ornament-line" />
          </div>
          <p className="font-deva text-[11px] text-[#d3b5a1]">तमसो मा ज्योतिर्गमय</p>
          <p className="max-w-lg text-[10px] leading-relaxed text-[#8f7ba9]">
            From darkness, lead me to light. <span className="text-[#b6a2d2]">Diwali: The Festival of Lights</span> is an original browser game — 5 handcrafted nights, procedural pixel art, and a soundtrack generated in your browser.
          </p>
          <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[8px] uppercase tracking-[0.16em] text-[#6f5e88]">
            <span>Keyboard + touch</span><span className="h-2 w-px bg-white/10" />
            <span>Progress saved locally</span><span className="h-2 w-px bg-white/10" />
            <span>Made with light &amp; code</span>
          </div>
        </footer>
      </main>

      {/* Page-level dialogs */}
      {modal === "levels" && (
        <LevelsModal
          levels={LEVELS}
          unlocked={progress.unlocked}
          currentLevel={snap.mode === "menu" ? previewIndex : snap.levelIndex}
          best={progress.best}
          onSelect={(i) => startLevel(i)}
          onClose={closeModal}
        />
      )}
      {modal === "howto" && <HowToModal onClose={closeModal} />}
      {modal === "settings" && (
        <SettingsModal
          musicOn={settings.music}
          sfxOn={settings.sfx}
          musicVol={settings.musicVol}
          sfxVol={settings.sfxVol}
          onToggleMusic={toggleMusic}
          onToggleSfx={toggleSfx}
          onMusicVol={(v) => patchSettings({ musicVol: v })}
          onSfxVol={(v) => patchSettings({ sfxVol: v })}
          onResetProgress={resetProgress}
          stars={totalStars}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Side panels                                                         */
/* ------------------------------------------------------------------ */

function QuestPanel({
  snap, level, best, totalStars, onOpenLevels,
}: {
  snap: Snapshot;
  level: LevelDef;
  best?: { score: number; stars: number };
  totalStars: number;
  onOpenLevels: () => void;
}) {
  const live = snap.mode !== "menu";
  const diyas = live ? snap.diyas : 0;
  const required = level.requiredDiyas;
  const gate = live && snap.gateOpen;
  const finished = live && !!snap.result;
  const score = live ? snap.score : 0;

  const objectives = [
    { label: `Light ${required} diyas`, done: diyas >= required, progress: Math.min(diyas, required), max: required, icon: <FlameIcon className="h-3 w-3" /> },
    { label: "Wake the toran gate", done: gate, icon: <SparkleIcon className="h-3 w-3" /> },
    { label: "Reach the festival arch", done: finished, icon: <TrophyIcon className="h-3 w-3" /> },
  ];

  return (
    <>
      <div className="glass-panel overflow-hidden">
        <div className="relative px-3 pb-3 pt-3" style={{ backgroundImage: level.cardGradient }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#150c27] via-[#150c27]/55 to-transparent" />
          <div className="relative">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-pixel text-[8px] uppercase tracking-[0.22em] text-[#ffe9c9]/80">Tonight's quest</p>
                <h2 className="font-pixel text-[15px] leading-tight text-white drop-shadow-md">{level.name}</h2>
                <p className="mt-0.5 text-[9px] text-[#f2deff]/85">{level.location}</p>
              </div>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/25 bg-black/20 text-base backdrop-blur-sm">{level.emoji}</span>
            </div>
            <p className="mt-1.5 max-w-[250px] text-[9px] leading-snug text-[#eadcf7]">{level.description}</p>
          </div>
        </div>

        <div className="space-y-1.5 p-2.5">
          {objectives.map((o, i) => (
            <div key={o.label} className="rounded-lg border border-white/8 bg-[#0f081f]/65 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${o.done ? "bg-[#8affd9]/15 text-[#8affd9]" : "bg-white/5 text-[#9b86b8]"}`}>
                  {o.done ? <CheckIcon className="h-2.5 w-2.5" /> : o.icon}
                </span>
                <span className={`min-w-0 flex-1 truncate font-pixel text-[10px] ${o.done ? "text-[#a9f7df]" : "text-[#e5d7f3]"}`}>{o.label}</span>
                <span className="shrink-0 font-pixel text-[9px] text-[#a995c7]">{i === 0 ? `${o.progress}/${o.max}` : o.done ? "done" : "—"}</span>
              </div>
              {i === 0 && <ProgressBar value={o.progress ?? 0} max={o.max ?? 1} color="#ffb45c" className="mt-1.5" />}
            </div>
          ))}

          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { label: "Score", value: score.toLocaleString(), icon: <StarIcon className="h-3 w-3" /> },
              { label: "Hearts", value: `${live ? snap.health : 3}/3`, icon: <HeartIcon className="h-3 w-3 text-[#ff7095]" /> },
              { label: "Time", value: live ? formatTime(snap.elapsed) : "0:00", icon: <ClockIcon className="h-3 w-3 text-[#7ae8ff]" /> },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/8 bg-[#0d071e]/70 px-1.5 py-1.5 text-center">
                <div className="mb-0.5 flex justify-center text-[#ffd479]">{s.icon}</div>
                <p className="font-pixel text-[11px] leading-none text-[#ffe9b0]">{s.value}</p>
                <p className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-[#8f7ba9]">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#ffd479]/16 bg-[#2b1b0e]/40 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <StarIcon className="h-3.5 w-3.5 text-[#ffd479]" />
              <div>
                <p className="font-pixel text-[10px] leading-none text-[#ffe9b0]">{best ? best.score.toLocaleString() : "No score yet"}</p>
                <p className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-[#a995c7]">personal best</p>
              </div>
            </div>
            <Stars count={best?.stars ?? 0} size={10} />
          </div>

          {live && snap.checkpointActive && (
            <p className="flex items-center justify-center gap-1 text-[8px] uppercase tracking-[0.12em] text-[#8affd9]">
              <CheckIcon className="h-2.5 w-2.5" /> checkpoint lamp lit
            </p>
          )}

          <button type="button" onClick={onOpenLevels} className="flex w-full items-center justify-between rounded-lg border border-[#543a78] bg-[#1b1035] px-2 py-1.5 font-pixel text-[10px] text-[#d7c4ee] transition hover:border-[#ffd479]/40 hover:text-[#ffe9b0]">
            <span className="flex items-center gap-1.5"><GridIcon className="h-3 w-3 text-[#ffd479]" /> Festival map</span>
            <span className="text-[8px] uppercase tracking-[0.14em] text-[#8f7ba9]">{totalStars}/15 ★</span>
          </button>
        </div>
      </div>

      <div className="hidden rounded-xl border border-[#4a316c]/50 bg-[#140b26]/70 p-2.5 lg:block">
        <ToneDivider label="a note on light" />
        <p className="mt-2 text-[9px] leading-relaxed text-[#a995c7]">
          The toran gate only opens when enough diyas burn. Look for high platforms, checkpoint lamps and gift boxes — every light counts on the final night.
        </p>
      </div>
    </>
  );
}
