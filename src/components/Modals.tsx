import { useState } from "react";
import type { LevelDef } from "../game/levels";
import {
  CheckIcon, ClockIcon, DiyaMark, FlameIcon, HeartIcon, Key, LockIcon, ModalShell,
  MusicIcon, SoundIcon, SparkleIcon, StarIcon, Stars, Toggle, VolumeRow, LevelCard, GearIcon,
} from "./ui";

/* --------------------------- Levels ------------------------------ */

export function LevelsModal({
  levels, unlocked, currentLevel, best, onSelect, onClose,
}: {
  levels: LevelDef[];
  unlocked: number;
  currentLevel: number;
  best: Record<number, { score: number; stars: number }>;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const totalStars = levels.reduce((sum, _, i) => sum + (best[i]?.stars ?? 0), 0);
  return (
    <ModalShell wide eyebrow="The golden route" title="Choose a night" onClose={onClose}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-md text-xs leading-relaxed text-[#c9b7e4]">
          Light the required diyas, reach the toran gate, and the next celebration opens. Each night has its own village, hazards and hidden rewards.
        </p>
        <div className="chip !gap-1.5 !border-[#ffc85c]/30 !text-[#ffd479]">
          <StarIcon className="h-3 w-3" /> {totalStars} / 15 stars
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {levels.map((level, i) => {
          const locked = i >= unlocked;
          return (
            <LevelCard
              key={level.id}
              level={level}
              index={i}
              locked={locked}
              current={i === currentLevel}
              best={best[i]}
              onSelect={() => { if (!locked) onSelect(i); }}
            />
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#493069] bg-[#1a0f31]/70 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <DiyaMark className="h-6 w-6" />
          <p className="text-[10px] leading-snug text-[#c9b7e4]">
            <span className="font-pixel text-[11px] text-[#ffe9b0]">Tip:</span> You can replay a night to improve your stars.
          </p>
        </div>
        <button type="button" onClick={onClose} className="pixel-btn pixel-btn-ghost !px-3 !py-1.5 text-[11px]">Back to festival</button>
      </div>
    </ModalShell>
  );
}

/* ---------------------------- How to ----------------------------- */

const collectibles = [
  { emoji: "🪔", name: "Glowing diya", points: "+100", detail: "Lights the toran gate. You need a set number each night." },
  { emoji: "🟡", name: "Motichoor laddoo", points: "+60", detail: "A sweet reward — optional, but a lovely score boost." },
  { emoji: "🎁", name: "Festival gift", points: "+250", detail: "Rare wrapped blessings hidden on high platforms." },
];

const dangers = [
  { icon: "🔥", name: "Wandering flame", detail: "Patrols the lanes. Jump it or time your run." },
  { icon: "🌀", name: "Chakra", detail: "A spinning golden ring that drifts up and down." },
  { icon: "👻", name: "Night spirit", detail: "A floating violet wisp with a gentle guard radius." },
  { icon: "🚀", name: "Rocket", detail: "Firework launchers bob on rooftops. Keep your distance." },
  { icon: "🌹", name: "Thorn vine", detail: "Rooted in flowerbeds. Hop over with care." },
];

export function HowToModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell wide eyebrow="A little lamp, a big adventure" title="How to play" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[#493069] bg-[#1b1033]/70 p-3">
          <h3 className="mb-2 flex items-center gap-2 font-pixel text-sm text-[#ffd479]"><SparkleIcon className="h-4 w-4" /> Your quest</h3>
          <ol className="space-y-2">
            {[
              "Explore the decorated world and collect the glowing diyas.",
              "Light the required number of diyas — this opens the toran gate.",
              "Reach the toran gate at the end of the night to complete it.",
              "Avoid flames, chakras and spirits. You have three hearts.",
              "Touch a checkpoint lamp to save your spot (and +50 points).",
            ].map((t, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-[#d6c5ec]">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#ffd479]/15 font-pixel text-[9px] text-[#ffd479]">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#ff5f8f]/20 bg-[#2b1020]/40 px-2 py-1.5">
            <HeartIcon className="h-3.5 w-3.5 text-[#ff7095]" />
            <span className="text-[10px] text-[#f0c7d5]">Lose all three hearts and the night fades. Checkpoint lamps let you retry from there.</span>
          </div>
        </section>

        <section className="rounded-xl border border-[#493069] bg-[#1b1033]/70 p-3">
          <h3 className="mb-2 flex items-center gap-2 font-pixel text-sm text-[#ffd479]"><GearIcon className="h-4 w-4" /> Controls</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
              <span className="text-[11px] text-[#d6c5ec]">Walk / run</span>
              <span className="flex items-center gap-1"><Key>←</Key><Key>→</Key><span className="text-[9px] text-[#8f7ba9]">or</span><Key>A</Key><Key>D</Key></span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
              <span className="text-[11px] text-[#d6c5ec]">Jump</span>
              <span className="flex items-center gap-1"><Key>Space</Key><span className="text-[9px] text-[#8f7ba9]">or</span><Key>↑</Key></span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
              <span className="text-[11px] text-[#d6c5ec]">Spark jump</span>
              <span className="flex items-center gap-1"><Key>Space</Key><span className="text-[9px] text-[#8f7ba9]">twice in the air</span></span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-[#d6c5ec]">Pause</span>
              <span className="flex items-center gap-1"><Key>Esc</Key><span className="text-[9px] text-[#8f7ba9]">or</span><Key>P</Key></span>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-[#7ae8ff]/20 bg-[#102c37]/40 px-2 py-1.5">
            <p className="text-[10px] leading-relaxed text-[#bfeee9]">
              <span className="font-pixel text-[#7ae8ff]">On mobile:</span> use the arrow pads and round jump button over the game. Hold a direction to run; tap jump twice for a spark jump.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-[#493069] bg-[#1b1033]/70 p-3">
          <h3 className="mb-2 flex items-center gap-2 font-pixel text-sm text-[#ffd479]"><DiyaMark className="h-4 w-4" /> Collectibles</h3>
          <div className="space-y-1.5">
            {collectibles.map((c) => (
              <div key={c.name} className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#0d071e]/50 px-2 py-1.5">
                <span className="text-base leading-none">{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-pixel text-[11px] text-[#ffe9b0]">{c.name}</p>
                  <p className="text-[9px] leading-snug text-[#b6a4d0]">{c.detail}</p>
                </div>
                <span className="font-pixel text-[11px] text-[#ffd479]">{c.points}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#493069] bg-[#1b1033]/70 p-3">
          <h3 className="mb-2 flex items-center gap-2 font-pixel text-sm text-[#ffd479]"><FlameIcon className="h-4 w-4 text-[#ff9fc0]" /> Festival guardians</h3>
          <div className="space-y-1.5">
            {dangers.map((d) => (
              <div key={d.name} className="flex items-start gap-2 text-[10px] leading-snug">
                <span className="w-4 shrink-0 text-center text-xs">{d.icon}</span>
                <p className="text-[#b6a4d0]"><span className="font-pixel text-[10px] text-[#ffe9b0]">{d.name}:</span> {d.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-[#ffc85c]/20 bg-[#2a1a10]/40 px-2 py-1.5">
            <CheckIcon className="h-3 w-3 shrink-0 text-[#8affd9]" />
            <p className="text-[9px] leading-snug text-[#ffe3a4]">Stars: finish the night, collect 60% of diyas, and keep 2+ hearts under 3:30.</p>
          </div>
        </section>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="hidden text-[10px] text-[#8f7ba9] sm:block">Every visual, sound and note is generated in your browser.</span>
        <button type="button" onClick={onClose} className="pixel-btn pixel-btn-primary ml-auto !px-4 !py-2 text-xs">
          Let there be light
        </button>
      </div>
    </ModalShell>
  );
}

/* --------------------------- Settings ---------------------------- */

export function SettingsModal({
  musicOn, sfxOn, musicVol, sfxVol,
  onToggleMusic, onToggleSfx, onMusicVol, onSfxVol,
  onResetProgress, stars, onClose,
}: {
  musicOn: boolean;
  sfxOn: boolean;
  musicVol: number;
  sfxVol: number;
  onToggleMusic: () => void;
  onToggleSfx: () => void;
  onMusicVol: (v: number) => void;
  onSfxVol: (v: number) => void;
  onResetProgress: () => void;
  stars: number;
  onClose: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <ModalShell eyebrow="Your little corner of the festival" title="Settings" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-pixel text-[11px] uppercase tracking-[0.16em] text-[#c3a7ee]"><MusicIcon className="h-3.5 w-3.5" /> Soundtrack</p>
          <div className="space-y-2">
            <Toggle
              on={musicOn}
              onChange={onToggleMusic}
              label="Festival music"
              description="Original procedural sitar-flavoured melody with tabla."
              icon={<MusicIcon className="h-4 w-4" />}
            />
            <VolumeRow label="Music volume" value={musicVol} onChange={onMusicVol} disabled={!musicOn} />
            <Toggle
              on={sfxOn}
              onChange={onToggleSfx}
              label="Sound effects"
              description="Chimes, jumps, sparkles and fireworks."
              icon={<SoundIcon className="h-4 w-4" />}
            />
            <VolumeRow label="Effects volume" value={sfxVol} onChange={onSfxVol} disabled={!sfxOn} />
          </div>
        </div>

        <div className="rounded-xl border border-[#493069] bg-[#1b1033]/70 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-pixel text-[12px] text-[#ffe9b0]">Festival progress</p>
              <p className="text-[10px] text-[#a995c7]">{stars} of 15 stars collected. Progress is saved in this browser.</p>
            </div>
            <StarIcon className="h-5 w-5 text-[#ffd479]" />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!confirmReset) { setConfirmReset(true); return; }
              onResetProgress();
              setConfirmReset(false);
            }}
            className={`mt-2.5 w-full rounded-lg border px-2.5 py-2 font-pixel text-[11px] transition ${
              confirmReset
                ? "border-[#ff5f8f]/60 bg-[#4a1527] text-[#ffd2df]"
                : "border-white/10 bg-[#0d071e]/60 text-[#b9a5d5] hover:border-[#ff5f8f]/40 hover:text-[#ffd2df]"
            }`}
          >
            {confirmReset ? "Tap again to light a fresh path" : "Reset journey & stars"}
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-[#7ae8ff]/15 bg-[#10222f]/50 px-3 py-2">
          <DiyaMark className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-[10px] leading-relaxed text-[#a9dbe0]">
            <span className="font-pixel text-[11px] text-[#7ae8ff]">Diwali: The Festival of Lights</span> is a complete browser-made adventure. Five nights, 90+ collectibles, original generated pixel art and music — no downloads required.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[9px] text-[#8f7ba9]"><ClockIcon className="h-3 w-3" /> Settings save automatically.</span>
          <button type="button" onClick={onClose} className="pixel-btn pixel-btn-primary !px-4 !py-2 text-xs">Back to the festival</button>
        </div>
      </div>
    </ModalShell>
  );
}

export function LockedHint() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#493069] bg-[#160d2a] px-3 py-2 text-[10px] text-[#b6a4d0]">
      <LockIcon className="h-3.5 w-3.5 text-[#ffd479]" />
      Finish the previous night to unlock this celebration.
    </div>
  );
}

export function StarSummary({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Stars count={stars} size={12} />
      <span className="text-[10px] text-[#b6a4d0]">{stars}/15 festival stars</span>
    </div>
  );
}
