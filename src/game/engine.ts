/**
 * Diwali: The Festival of Lights — game engine.
 * A self-contained 2D platformer rendered onto a 480x270 canvas.
 * Every visual is drawn procedurally with rectangles, arcs and pixels.
 */
import { FestiveAudio } from "./audio";
import {
  GROUND_Y,
  LEVELS,
  VIEW_H,
  VIEW_W,
  type HazardDef,
  type ItemDef,
  type LevelDef,
  type PlatformDef,
} from "./levels";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type EngineMode = "menu" | "playing" | "paused" | "complete" | "gameover";
export type EventTone = "good" | "bad" | "info";

export interface LevelResult {
  levelIndex: number;
  score: number;
  baseScore: number;
  timeBonus: number;
  healthBonus: number;
  stars: number;
  diyas: number;
  totalDiyas: number;
  time: number;
  health: number;
  final: boolean;
}

export interface Snapshot {
  mode: EngineMode;
  levelIndex: number;
  levelName: string;
  score: number;
  health: number;
  maxHealth: number;
  diyas: number;
  totalDiyas: number;
  requiredDiyas: number;
  laddoos: number;
  totalLaddoos: number;
  gateOpen: boolean;
  checkpointActive: boolean;
  elapsed: number;
  result: LevelResult | null;
}

export interface EngineCallbacks {
  onSnapshot: (snap: Snapshot) => void;
  onEvent: (message: string, tone: EventTone) => void;
}

interface Player {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  onGround: boolean; jumpsLeft: number;
  facing: 1 | -1; animTime: number; state: "idle" | "walk" | "run" | "jump" | "fall" | "cheer";
  coyote: number; jumpBuffer: number; invuln: number; collectTimer: number; hurtTimer: number;
}

interface ItemState extends ItemDef { collected: boolean; phase: number; }

interface HazardState extends HazardDef {
  t: number; cx: number; cy: number;
  baseX: number; baseY: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string; gravity: number; kind: "spark" | "square" | "confetti";
  rot: number; vr: number;
}

interface FwParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
  gravity: number; confetti?: boolean; rot: number; vr: number;
}

interface Firework {
  x: number; y: number; targetY: number; color: string; speed: number;
}

interface Star { x: number; y: number; size: number; phase: number; }
interface Building {
  x: number; w: number; h: number; y: number;
  roof: 0 | 1 | 2; windows: number; hue: number;
}

interface RunState {
  items: ItemState[];
  hazards: HazardState[];
  diyas: number; totalDiyas: number;
  laddoos: number; totalLaddoos: number; totalGifts: number;
  score: number;
  health: number;
  elapsed: number;
  checkpoint: { x: number; y: number } | null;
  checkpointActive: boolean;
  gateOpen: boolean;
  gateHintCooldown: number;
  result: LevelResult | null;
  starBurstAt: number;
}

/* ------------------------------------------------------------------ */
/* Constants + tiny helpers                                            */
/* ------------------------------------------------------------------ */

const PLAYER_W = 14;
const PLAYER_H = 22;
const MAX_HEALTH = 3;
const MOVE_SPEED = 178;
const JUMP_VELOCITY = 424;
const DOUBLE_JUMP_VELOCITY = 366;
const GRAVITY = 1380;
const MAX_FALL = 540;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const approach = (v: number, target: number, delta: number) =>
  v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = clamp(((n >> 16) & 255) + amount, 0, 255);
  const g = clamp(((n >> 8) & 255) + amount, 0, 255);
  const b = clamp((n & 255) + amount, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
export { formatTime };

const FIREWORK_COLORS = ["#ffd479", "#ff7fa8", "#7ae8ff", "#c8a6ff", "#ff9d5c", "#fff4d6", "#6ff2ca"];

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

export class DiwaliGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private audio: FestiveAudio;

  mode: EngineMode = "menu";
  levelIndex = 0;
  level: LevelDef;
  private run: RunState;
  private player: Player;
  private camera = { x: 0, target: 0, shake: 0 };
  private menuTime = 0;
  private time = 0;
  private keys = new Set<string>();
  private touch = { left: false, right: false };
  private jumpHeld = false;
  private jumpRequested = false;

  private stars: Star[] = [];
  private farBuildings: Building[] = [];
  private midBuildings: Building[] = [];
  private hillPhase = 0;

  private worldParticles: Particle[] = [];
  private fwParticles: FwParticle[] = [];
  private fireworks: Firework[] = [];
  private fwTimer = 0.6;

  private raf = 0;
  private lastTs = 0;
  private snapshotClock = 0;
  private destroyed = false;
  private jumpReleaseQueued = false;

  constructor(canvas: HTMLCanvasElement, audio: FestiveAudio, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.audio = audio;
    this.cb = callbacks;
    this.level = LEVELS[0];
    this.run = this.makeRun(this.level);
    this.player = this.spawnPlayer(this.level);
    this.setupBackdrop();
    this.attach();
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.pushSnapshot();
  }

  /* ---------------------------- setup ---------------------------- */

  private makeRun(level: LevelDef): RunState {
    const items: ItemState[] = level.items.map((it, i) => ({
      ...it, collected: false, phase: (i * 0.77) % Math.PI * 2,
    }));
    return {
      items,
      hazards: level.hazards.map((h, i) => ({
        ...h, t: i * 0.73, cx: h.x, cy: h.y, baseX: h.x, baseY: h.y,
      })),
      diyas: 0,
      totalDiyas: items.filter((i) => i.kind === "diya").length,
      laddoos: 0,
      totalLaddoos: items.filter((i) => i.kind === "laddoo").length,
      totalGifts: items.filter((i) => i.kind === "gift").length,
      score: 0,
      health: MAX_HEALTH,
      elapsed: 0,
      checkpoint: null,
      checkpointActive: false,
      gateOpen: false,
      gateHintCooldown: 0,
      result: null,
      starBurstAt: 0,
    };
  }

  private spawnPlayer(level: LevelDef): Player {
    return {
      x: level.spawn.x, y: level.spawn.y - PLAYER_H - 2,
      w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0,
      onGround: false, jumpsLeft: 2, facing: 1, animTime: 0,
      state: "idle", coyote: 0, jumpBuffer: 0, invuln: 0, collectTimer: 0, hurtTimer: 0,
    };
  }

  private setupBackdrop() {
    const rng = seeded(this.level.id * 977 + 131);
    this.stars = Array.from({ length: 84 }, () => ({
      x: rng() * VIEW_W,
      y: 4 + rng() * 154,
      size: rng() > 0.82 ? 2 : 1,
      phase: rng() * Math.PI * 2,
    }));

    this.farBuildings = [];
    let x = -140;
    while (x < this.level.width + VIEW_W * 2) {
      const w = 34 + rng() * 50;
      const h = 20 + rng() * 40;
      this.farBuildings.push({
        x, w, h, y: 210 - h,
        roof: rng() > 0.72 ? (this.level.id === 2 ? 2 : 1) : 0,
        windows: Math.floor(rng() * 3),
        hue: rng(),
      });
      x += w + 6 + rng() * 34;
    }

    this.midBuildings = [];
    x = -170;
    while (x < this.level.width + VIEW_W * 2) {
      const w = 52 + rng() * 52;
      const h = 42 + rng() * 42 + (rng() > 0.8 ? 24 : 0);
      const d = this.level.id;
      this.midBuildings.push({
        x, w, h, y: 222 - h,
        roof: d === 2 ? 2 : d === 3 ? 0 : rng() > 0.45 ? 1 : 0,
        windows: 1 + Math.floor(rng() * 3),
        hue: rng(),
      });
      x += w + 44 + rng() * 100;
    }
    this.hillPhase = rng() * 6;
  }

  private attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.canvas.addEventListener("pointerdown", this.onCanvasPointer);
  }

  private onCanvasPointer = (e: PointerEvent) => {
    if (this.mode !== "playing") return;
    e.preventDefault();
    this.pressJump();
    window.setTimeout(() => this.releaseJump(), 110);
  };

  private onBlur = () => {
    this.keys.clear();
    this.touch.left = false;
    this.touch.right = false;
    this.jumpHeld = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (document.body.dataset.modal === "1") return;
    if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
    const k = e.key.toLowerCase();
    this.audio.unlock();
    if (["arrowleft", "a"].includes(k)) this.keys.add("left");
    if (["arrowright", "d"].includes(k)) this.keys.add("right");
    if ([" ", "arrowup", "w"].includes(k)) {
      if (this.mode === "playing" || this.mode === "paused") e.preventDefault();
      if (!e.repeat) this.pressJump();
    }
    if (k === "escape") {
      if (this.mode === "playing" || this.mode === "paused") {
        e.preventDefault();
        this.togglePause();
      }
    }
    if (k === "p") {
      if (this.mode === "playing" || this.mode === "paused") this.togglePause();
    }
    if (["arrowleft", "arrowright", "arrowdown", "arrowup", " "].includes(k) && this.mode === "playing") {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowleft", "a"].includes(k)) this.keys.delete("left");
    if (["arrowright", "d"].includes(k)) this.keys.delete("right");
    if ([" ", "arrowup", "w"].includes(k)) this.releaseJump();
  };

  /* -------------------------- public API -------------------------- */

  startLevel(index: number) {
    this.levelIndex = clamp(index, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex];
    this.run = this.makeRun(this.level);
    this.player = this.spawnPlayer(this.level);
    this.camera.x = clamp(this.player.x - VIEW_W * 0.34, 0, this.level.width - VIEW_W);
    this.camera.target = this.camera.x;
    this.camera.shake = 0;
    this.worldParticles = [];
    this.fireworks = [];
    this.fwParticles = [];
    this.keys.clear();
    this.touch.left = false;
    this.touch.right = false;
    this.jumpRequested = false;
    this.jumpHeld = false;
    this.setupBackdrop();
    this.fwTimer = 0.4;
    this.mode = "playing";
    this.audio.unlock();
    this.pushSnapshot();
  }

  restartLevel() { this.startLevel(this.levelIndex); }

  nextLevel() {
    if (this.levelIndex < LEVELS.length - 1) this.startLevel(this.levelIndex + 1);
    else this.showMenu();
  }

  showMenu() {
    this.mode = "menu";
    this.level = LEVELS[this.levelIndex] ?? LEVELS[0];
    this.setupBackdrop();
    this.worldParticles = [];
    this.menuTime = 0;
    this.pushSnapshot();
  }

  pause() {
    if (this.mode !== "playing") return;
    this.mode = "paused";
    this.pushSnapshot();
  }

  resume() {
    if (this.mode !== "paused") return;
    this.mode = "playing";
    this.lastTs = performance.now();
    this.pushSnapshot();
  }

  togglePause() {
    if (this.mode === "playing") this.pause();
    else if (this.mode === "paused") this.resume();
  }

  pressJump() {
    if (this.mode !== "playing") return;
    this.jumpRequested = true;
    this.jumpHeld = true;
    this.player.jumpBuffer = 0.14;
  }

  releaseJump() {
    this.jumpHeld = false;
    this.jumpReleaseQueued = true;
  }

  setTouch(dir: "left" | "right", pressed: boolean) {
    this.touch[dir] = pressed;
  }

  getSnapshot(): Snapshot {
    return {
      mode: this.mode,
      levelIndex: this.levelIndex,
      levelName: this.level.name,
      score: this.run.score,
      health: this.run.health,
      maxHealth: MAX_HEALTH,
      diyas: this.run.diyas,
      totalDiyas: this.run.totalDiyas,
      requiredDiyas: this.level.requiredDiyas,
      laddoos: this.run.laddoos,
      totalLaddoos: this.run.totalLaddoos,
      gateOpen: this.run.gateOpen,
      checkpointActive: this.run.checkpointActive,
      elapsed: this.run.elapsed,
      result: this.run.result,
    };
  }

  private pushSnapshot() { this.cb.onSnapshot(this.getSnapshot()); }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("pointerdown", this.onCanvasPointer);
  }

  /* ---------------------------- loop ------------------------------ */

  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = clamp((ts - this.lastTs) / 1000, 0, 0.045);
    this.lastTs = ts;
    this.tick(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private tick(dt: number) {
    this.time += dt;

    if (this.mode === "menu") {
      this.menuTime += dt;
      this.updateAmbient(dt);
      this.updateWorldParticles(dt);
      return;
    }

    if (this.mode === "playing") {
      this.run.elapsed += dt;
      this.run.gateHintCooldown = Math.max(0, this.run.gateHintCooldown - dt);
      this.updatePlayer(dt);
      this.updateHazards(dt);
      this.checkInteractions();
      this.updateWorldParticles(dt);
      this.updateAmbient(dt);
      if (this.run.starBurstAt > 0 && this.run.elapsed > this.run.starBurstAt) {
        this.run.starBurstAt = 0;
      }
      this.snapshotClock += dt;
      if (this.snapshotClock > 0.12) {
        this.snapshotClock = 0;
        this.pushSnapshot();
      }
      return;
    }

    if (this.mode === "complete") {
      this.updateWorldParticles(dt);
      this.updateAmbient(dt);
      this.run.elapsed += dt;
      return;
    }

    /* paused / gameover: freeze the scene, keep it on screen */
  }

  /* -------------------------- player ------------------------------ */

  private updatePlayer(dt: number) {
    const p = this.player;
    const left = this.keys.has("left") || this.touch.left;
    const right = this.keys.has("right") || this.touch.right;
    const dir = left && !right ? -1 : right && !left ? 1 : 0;

    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
    if (p.collectTimer > 0) p.collectTimer = Math.max(0, p.collectTimer - dt);
    if (p.hurtTimer > 0) p.hurtTimer = Math.max(0, p.hurtTimer - dt);

    const accel = p.onGround ? 1500 : 960;
    if (dir !== 0) {
      p.vx = approach(p.vx, dir * MOVE_SPEED, accel * dt);
      p.facing = dir as 1 | -1;
    } else {
      p.vx = approach(p.vx, 0, (p.onGround ? 1750 : 420) * dt);
    }
    if (Math.abs(p.vx) < 1.5) p.vx = 0;

    if (p.jumpBuffer > 0) p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.coyote > 0) p.coyote = Math.max(0, p.coyote - dt);

    if (this.jumpRequested) {
      this.jumpRequested = false;
      if (p.onGround || p.coyote > 0) {
        p.vy = -JUMP_VELOCITY;
        p.onGround = false;
        p.coyote = 0;
        p.jumpsLeft = 1;
        p.jumpBuffer = 0;
        this.audio.sfx("jump");
        this.spawnBurst(p.x + p.w / 2, p.y + p.h, ["#ffe9b0", "#ffc85c", "#ff9d5c"], 7, 60);
      } else if (p.jumpsLeft > 0) {
        p.vy = -DOUBLE_JUMP_VELOCITY;
        p.jumpsLeft--;
        p.jumpBuffer = 0;
        this.audio.sfx("doubleJump");
        this.spawnBurst(p.x + p.w / 2, p.y + p.h - 2, ["#ffd479", "#ff7fa8", "#7ae8ff", "#fff4d6"], 12, 90);
      }
    }

    if (this.jumpReleaseQueued) {
      this.jumpReleaseQueued = false;
      if (p.vy < -170) p.vy *= 0.56;
    }

    p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);

    /* horizontal sweep */
    p.x += p.vx * dt;
    for (const s of this.level.platforms) {
      if (this.rectsOverlap(p.x, p.y, p.w, p.h, s.x, s.y, s.w, s.h)) {
        if (p.vx > 0) p.x = s.x - p.w;
        else if (p.vx < 0) p.x = s.x + s.w;
        p.vx = 0;
      }
    }
    p.x = clamp(p.x, 0, this.level.width - p.w);

    /* vertical sweep */
    p.y += p.vy * dt;
    const wasGrounded = p.onGround;
    p.onGround = false;
    for (const s of this.level.platforms) {
      if (this.rectsOverlap(p.x, p.y, p.w, p.h, s.x, s.y, s.w, s.h)) {
        if (p.vy > 0) {
          p.y = s.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.jumpsLeft = 2;
        } else if (p.vy < 0) {
          p.y = s.y + s.h;
          p.vy = 0;
        }
      }
    }
    if (p.onGround && !wasGrounded) {
      this.spawnBurst(p.x + p.w / 2, p.y + p.h, ["#ffd479", "#ffe9b0"], 4, 40);
    }
    if (p.onGround) p.coyote = 0.1;

    if (p.state !== "cheer") {
      if (!p.onGround) p.state = p.vy < 0 ? "jump" : "fall";
      else if (Math.abs(p.vx) > 138) p.state = "run";
      else if (Math.abs(p.vx) > 12) p.state = "walk";
      else p.state = "idle";
    }
    p.animTime += dt;

    /* camera */
    const target = clamp(p.x + p.w / 2 - VIEW_W * 0.4, 0, Math.max(0, this.level.width - VIEW_W));
    this.camera.target = target;
    this.camera.x += (target - this.camera.x) * Math.min(1, dt * 6.5);
    if (Math.abs(target - this.camera.x) < 0.35) this.camera.x = target;
    this.camera.shake = Math.max(0, this.camera.shake - dt * 26);
  }

  private updateHazards(dt: number) {
    for (const h of this.run.hazards) {
      h.t += dt;
      const off = Math.sin(h.t * (h.speed ?? 1.2) + (h.phase ?? 0)) * (h.range ?? 0);
      h.cx = h.baseX + (h.axis === "x" ? off : 0);
      h.cy = h.baseY + (h.axis === "y" ? off : 0);
    }
  }

  private checkInteractions() {
    const p = this.player;

    /* collectibles */
    for (const it of this.run.items) {
      if (it.collected) continue;
      const ix = it.x;
      const iy = it.y + Math.sin(this.time * 2.6 + it.phase) * 2.5;
      if (Math.abs(ix - (p.x + p.w / 2)) < 15 && Math.abs(iy - (p.y + p.h / 2)) < 17) {
        it.collected = true;
        p.collectTimer = 0.28;
        this.collectItem(it, ix, iy);
      }
    }

    /* hazards */
    if (p.invuln <= 0) {
      for (const h of this.run.hazards) {
        const hx = h.cx - h.w / 2 + 1;
        const hy = h.cy - h.h / 2 + 1;
        if (this.rectsOverlap(p.x + 2, p.y + 3, p.w - 4, p.h - 5, hx, hy, h.w - 2, h.h - 2)) {
          this.hitHazard(h);
          break;
        }
      }
    }

    /* checkpoints */
    for (let i = 0; i < this.level.checkpoints.length; i++) {
      const cp = this.level.checkpoints[i];
      if (this.run.checkpointActive && this.run.checkpoint &&
          this.run.checkpoint.x === cp.x && this.run.checkpoint.y === cp.y) continue;
      if (Math.abs(p.x + p.w / 2 - cp.x) < 22 && Math.abs(p.y + p.h / 2 - (cp.y - 26)) < 40) {
        this.run.checkpoint = { x: cp.x, y: cp.y };
        this.run.checkpointActive = true;
        this.audio.sfx("checkpoint");
        this.cb.onEvent("Checkpoint lamp lit — your journey is saved.", "good");
        this.spawnBurst(cp.x, cp.y - 42, ["#ffd479", "#fff4d6", "#ff9fc0"], 22, 120);
        this.run.score += 50;
        this.pushSnapshot();
      }
    }

    /* toran gate */
    const g = this.level.goal;
    if (this.rectsOverlap(p.x, p.y, p.w, p.h, g.x - 34, g.y - 68, 68, 68)) {
      if (this.run.gateOpen) this.finishLevel();
      else if (this.run.gateHintCooldown <= 0) {
        const remaining = Math.max(0, this.level.requiredDiyas - this.run.diyas);
        this.cb.onEvent(
          `The toran gate is dark. Light ${remaining} more diya${remaining === 1 ? "" : "s"} to open it.`,
          "info",
        );
        this.audio.sfx("locked");
        this.run.gateHintCooldown = 2.4;
      }
    }

    /* falling into the night */
    if (p.y > VIEW_H + 52) {
      this.run.health -= 1;
      this.camera.shake = 9;
      this.audio.sfx("hurt");
      this.spawnBurst(p.x + p.w / 2, VIEW_H - 18, ["#ff7fa8", "#ffd479"], 12, 90);
      if (this.run.health <= 0) {
        this.mode = "gameover";
        this.audio.sfx("gameover");
        this.cb.onEvent("The little lights went out... but a diya can always be relit.", "bad");
        this.pushSnapshot();
        return;
      }
      this.cb.onEvent("You slipped into the shadows — one heart lost.", "bad");
      this.respawnPlayer();
      this.pushSnapshot();
    }
  }

  private collectItem(it: ItemState, x: number, y: number) {
    if (it.kind === "diya") {
      this.run.diyas++;
      this.run.score += 100;
      this.audio.sfx("collect");
      this.spawnBurst(x, y, ["#ffd479", "#fff4d6", "#ffb347"], 10, 90);
    } else if (it.kind === "laddoo") {
      this.run.laddoos++;
      this.run.score += 60;
      this.audio.sfx("laddoo");
      this.spawnBurst(x, y, ["#ffcf6b", "#f2a93b", "#fff4d6"], 8, 80);
    } else {
      this.run.score += 250;
      this.audio.sfx("gift");
      this.spawnBurst(x, y, ["#ff7fa8", "#7ae8ff", "#ffd479", "#fff4d6"], 18, 130);
      this.cb.onEvent("A festival gift! A blessing worth 250 points.", "good");
    }

    if (!this.run.gateOpen && this.run.diyas >= this.level.requiredDiyas) {
      this.run.gateOpen = true;
      this.run.score += 150;
      this.audio.sfx("unlock");
      this.cb.onEvent("The toran gate blazes to life! The way forward is open.", "good");
      const gate = this.level.goal;
      this.spawnBurst(gate.x, gate.y - 56, ["#ffd479", "#fff4d6", "#ff9fc0", "#7ae8ff"], 34, 170);
    }
    this.pushSnapshot();
  }

  private hitHazard(h: HazardState) {
    const p = this.player;
    this.run.health -= 1;
    this.audio.sfx("hurt");
    this.camera.shake = 11;
    p.invuln = 1.35;
    p.hurtTimer = 0.35;
    p.vy = -230;
    p.vx = (p.x + p.w / 2 < h.cx ? -1 : 1) * 150;
    this.spawnBurst(p.x + p.w / 2, p.y + p.h / 2, ["#ff7fa8", "#ff5f5f", "#ffd479"], 14, 120);
    if (this.run.health <= 0) {
      this.mode = "gameover";
      this.audio.sfx("gameover");
      this.cb.onEvent("The lights have gone out. Relight your diya and try again.", "bad");
    } else {
      this.cb.onEvent(`Ouch! A festival guardian clipped you. ${this.run.health} heart${this.run.health === 1 ? "" : "s"} left.`, "bad");
    }
    this.pushSnapshot();
  }

  private respawnPlayer() {
    const p = this.player;
    const spawn = this.run.checkpoint ?? { x: this.level.spawn.x, y: this.level.spawn.y };
    p.x = spawn.x;
    p.y = spawn.y - PLAYER_H - 2;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 1.6;
    p.facing = 1;
    this.camera.x = clamp(p.x - VIEW_W * 0.34, 0, this.level.width - VIEW_W);
    this.camera.target = this.camera.x;
    this.spawnBurst(p.x + p.w / 2, p.y + p.h / 2, ["#ffd479", "#fff4d6"], 16, 100);
  }

  private finishLevel() {
    if (this.mode !== "playing") return;
    const timeBonus = Math.max(0, Math.round(2400 - this.run.elapsed * 14));
    const healthBonus = this.run.health * 225;
    const baseScore = this.run.score;
    this.run.score += timeBonus + healthBonus;
    let stars = 1;
    if (this.run.diyas >= Math.ceil(this.run.totalDiyas * 0.6)) stars++;
    if (this.run.health >= 2 && this.run.elapsed <= 210) stars++;
    const final = this.levelIndex === LEVELS.length - 1;
    this.run.result = {
      levelIndex: this.levelIndex,
      score: this.run.score,
      baseScore,
      timeBonus,
      healthBonus,
      stars,
      diyas: this.run.diyas,
      totalDiyas: this.run.totalDiyas,
      time: this.run.elapsed,
      health: this.run.health,
      final,
    };
    this.mode = "complete";
    this.player.state = "cheer";
    this.audio.sfx(final ? "victory" : "complete");
    this.camera.shake = 6;
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y;
    this.spawnBurst(px, py, ["#ffd479", "#fff4d6", "#ff7fa8", "#7ae8ff", "#c8a6ff"], 44, 200);
    for (let i = 0; i < 5; i++) {
      window.setTimeout(() => {
        if (!this.destroyed) this.spawnFirework(true);
      }, i * 180);
    }
    this.pushSnapshot();
  }

  /* -------------------------- particles -------------------------- */

  private spawnBurst(x: number, y: number, colors: string[], count: number, power: number) {
    for (let i = 0; i < count; i++) {
      if (this.worldParticles.length > 440) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(power * 0.25, power);
      this.worldParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - power * 0.22,
        life: rand(0.4, 0.95),
        maxLife: 0.95,
        size: Math.random() > 0.78 ? 3 : 2,
        color: pick(colors),
        gravity: 330,
        kind: Math.random() > 0.85 ? "confetti" : "spark",
        rot: rand(0, 6), vr: rand(-6, 6),
      });
    }
  }

  private updateWorldParticles(dt: number) {
    for (const p of this.worldParticles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vx *= 0.99;
    }
    this.worldParticles = this.worldParticles.filter((p) => p.life > 0);
  }

  private updateAmbient(dt: number) {
    this.fwTimer -= dt;
    if (this.fwTimer <= 0) {
      this.spawnFirework(false);
      const base = this.mode === "complete" ? 0.28 : this.mode === "menu" ? 0.9 : 2.4;
      this.fwTimer = base + Math.random() * 1.8;
    }

    for (const f of this.fireworks) {
      f.y -= f.speed * dt;
      if (f.y <= f.targetY) {
        this.explodeFirework(f);
      }
    }
    this.fireworks = this.fireworks.filter((f) => f.y > f.targetY);

    for (const p of this.fwParticles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vx *= 0.988;
      p.vy *= 0.992;
    }
    this.fwParticles = this.fwParticles.filter((p) => p.life > 0 && p.y < VIEW_H + 20);
  }

  private spawnFirework(loud = false) {
    const x = rand(60, VIEW_W - 60);
    const color = pick(FIREWORK_COLORS);
    this.fireworks.push({
      x, y: VIEW_H + 6, targetY: rand(34, 128), color, speed: rand(150, 225),
    });
    if (loud) this.audio.sfx("gift");
  }

  private explodeFirework(f: Firework) {
    const count = this.mode === "complete" ? 34 : 24;
    for (let i = 0; i < count; i++) {
      if (this.fwParticles.length > 520) break;
      const angle = (i / count) * Math.PI * 2 + rand(-0.1, 0.1);
      const speed = rand(26, 62);
      this.fwParticles.push({
        x: f.x, y: f.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.7, 1.4), maxLife: 1.4,
        size: Math.random() > 0.7 ? 2 : 1,
        color: f.color,
        gravity: 32,
        confetti: this.mode === "complete" && Math.random() > 0.6,
        rot: rand(0, 6), vr: rand(-8, 8),
      });
    }
    if (this.audio.sfxEnabled && Math.random() > 0.55) this.audio.sfx("click");
  }

  /* --------------------------- collision -------------------------- */

  private rectsOverlap(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number,
  ) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /* ================================================================ */
  /* RENDERING                                                        */
  /* ================================================================ */

  private render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    const menu = this.mode === "menu";
    const camX = menu ? this.getMenuCamera() : this.camera.x;
    const shakeX = this.camera.shake > 0 ? Math.round(rand(-this.camera.shake, this.camera.shake) * 0.5) : 0;
    const shakeY = this.camera.shake > 0 ? Math.round(rand(-this.camera.shake, this.camera.shake) * 0.35) : 0;

    this.drawSky(camX);
    this.drawFireworks();
    this.drawHills(camX);
    this.drawFarBuildings(camX);
    this.drawMidBuildings(camX);

    if (menu) {
      this.drawMenuDiorama(camX);
      this.drawScreenParticles();
      return;
    }

    ctx.save();
    ctx.translate(-Math.round(camX) + shakeX, shakeY);
    this.drawWorld();
    this.drawWorldParticles();
    ctx.restore();

    this.drawScreenParticles();
    this.drawOverlays();
  }

  private getMenuCamera() {
    const max = Math.max(0, this.level.width - VIEW_W);
    return (Math.sin(this.menuTime * 0.045) * 0.5 + 0.5) * max;
  }

  /* ---------------------------- sky ------------------------------- */

  private drawSky(camX: number) {
    const ctx = this.ctx;
    const th = this.level.theme;
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, th.sky[0]);
    grad.addColorStop(0.52, th.sky[1]);
    grad.addColorStop(1, th.sky[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    /* nebula / mist bands */
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = th.accent;
    ctx.fillRect(0, 104, VIEW_W, 8);
    ctx.fillRect(40, 128, VIEW_W - 100, 4);
    ctx.globalAlpha = 1;

    for (const s of this.stars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(this.time * 1.2 + s.phase));
      const x = Math.round((s.x - camX * 0.025 + VIEW_W * 3) % VIEW_W);
      ctx.globalAlpha = tw;
      ctx.fillStyle = s.size === 2 ? "#fff6df" : "#d9ccff";
      ctx.fillRect(x, Math.round(s.y), s.size, s.size);
      if (s.size === 2) {
        ctx.globalAlpha = tw * 0.35;
        ctx.fillRect(x - 1, Math.round(s.y) + 0, 1, 1);
        ctx.fillRect(x + 2, Math.round(s.y), 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    this.drawMoon(camX);

    /* distant mist hills behind everything */
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = th.glow;
    ctx.fillRect(0, 166, VIEW_W, 2);
    ctx.globalAlpha = 1;
  }

  private drawMoon(camX: number) {
    const ctx = this.ctx;
    const th = this.level.theme;
    const mx = 392 - camX * 0.03;
    const my = 48 + (this.level.id % 2) * -6;

    for (let i = 4; i >= 1; i--) {
      ctx.globalAlpha = 0.035 * i;
      ctx.fillStyle = th.moon;
      ctx.beginPath();
      ctx.arc(mx, my, 15 + i * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = th.moon;
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(mx - 10, my - 8, 4, 2);
    ctx.fillStyle = shade(th.moon, -30);
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(mx + 4, my + 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 5, my + 6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    /* tiny moon birds */
    ctx.strokeStyle = "rgba(12,6,26,0.5)";
    ctx.lineWidth = 1;
    const birdX = (mx - 56 + Math.sin(this.time * 0.25) * 10);
    const birdY = my - 18 + Math.sin(this.time * 0.6) * 2;
    ctx.beginPath();
    ctx.moveTo(birdX - 3, birdY); ctx.lineTo(birdX, birdY - 2); ctx.lineTo(birdX + 3, birdY);
    ctx.moveTo(birdX + 7, birdY - 3); ctx.lineTo(birdX + 9, birdY - 5); ctx.lineTo(birdX + 12, birdY - 3);
    ctx.stroke();
  }

  private drawFireworks() {
    const ctx = this.ctx;
    for (const f of this.fireworks) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = f.color;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 3);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#fff6df";
      ctx.fillRect(Math.round(f.x), Math.round(f.y) + 4, 1, 4);
      ctx.globalAlpha = 1;
    }
    for (const p of this.fwParticles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.size;
      if (p.confetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        if (a > 0.6) {
          ctx.globalAlpha = a * 0.3;
          ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 1, 1);
          ctx.fillRect(Math.round(p.x) + s, Math.round(p.y), 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------- parallax layers ---------------------- */

  private drawHills(camX: number) {
    const ctx = this.ctx;
    const th = this.level.theme;
    const layers = [
      { factor: 0.07, base: 196, amp: 17, color: shade(th.far, -8), freq: 0.016 },
      { factor: 0.14, base: 207, amp: 12, color: shade(th.far, 8), freq: 0.024 },
    ];
    for (const l of layers) {
      const off = camX * l.factor;
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.moveTo(-20, VIEW_H);
      for (let x = -20; x <= VIEW_W + 20; x += 12) {
        const y = l.base - Math.sin((x + off) * l.freq + this.hillPhase) * l.amp
          - Math.sin((x + off) * l.freq * 2.7) * 4;
        ctx.lineTo(x, Math.round(y));
      }
      ctx.lineTo(VIEW_W + 20, VIEW_H);
      ctx.closePath();
      ctx.fill();
    }

    /* far tree / temple spires */
    ctx.fillStyle = shade(th.far, -14);
    const off = camX * 0.16;
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 137 - off * 0.9) % (VIEW_W + 140) + VIEW_W + 140) % (VIEW_W + 140) - 70;
      const h = 20 + (i % 4) * 11;
      ctx.fillRect(Math.round(bx), 190 - h, 2, h);
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(bx - 7, 190 - h + 6);
        ctx.lineTo(bx + 1, 190 - h - 7);
        ctx.lineTo(bx + 9, 190 - h + 6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(Math.round(bx) - 5, 190 - h + 6, 12, 3);
        ctx.fillRect(Math.round(bx) - 3, 190 - h + 2, 8, 4);
      }
    }
  }

  private drawFarBuildings(camX: number) {
    const ctx = this.ctx;
    const th = this.level.theme;
    const off = camX * 0.24;
    for (const b of this.farBuildings) {
      const x = Math.round(b.x - off);
      if (x > VIEW_W + 60 || x + b.w < -60) continue;
      ctx.fillStyle = shade(th.far, -2);
      ctx.fillRect(x, b.y, Math.round(b.w), b.h);
      if (b.roof === 1) {
        ctx.beginPath();
        ctx.moveTo(x - 4, b.y);
        ctx.lineTo(x + b.w / 2, b.y - Math.min(18, b.w * 0.34));
        ctx.lineTo(x + b.w + 4, b.y);
        ctx.closePath();
        ctx.fill();
      } else if (b.roof === 2) {
        ctx.beginPath();
        ctx.arc(x + b.w / 2, b.y, b.w * 0.32, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x + b.w / 2 - 1, b.y - b.w * 0.42, 1, 5);
      } else {
        ctx.fillRect(x - 2, b.y - 2, Math.round(b.w) + 4, 3);
      }
      if (b.windows > 0) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = th.accent;
        for (let i = 0; i < b.windows; i++) {
          ctx.fillRect(x + 8 + i * 14, b.y + 12, 2, 3);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawMidBuildings(camX: number) {
    const ctx = this.ctx;
    const th = this.level.theme;
    const off = camX * 0.46;

    for (const b of this.midBuildings) {
      const x = Math.round(b.x - off);
      if (x > VIEW_W + 80 || x + b.w < -80) continue;
      const bodyColor = shade(th.mid, Math.round((b.hue - 0.5) * 14));
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x, b.y, Math.round(b.w), b.h);

      /* rooftop */
      if (b.roof === 1) {
        ctx.fillStyle = shade(bodyColor, -18);
        ctx.beginPath();
        ctx.moveTo(x - 6, b.y + 1);
        ctx.lineTo(x + b.w * 0.5, b.y - 17 - (b.w > 80 ? 6 : 0));
        ctx.lineTo(x + b.w + 6, b.y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x + b.w * 0.5 - 1, b.y - 16, 1, 3);
        ctx.globalAlpha = 1;
      } else if (b.roof === 2) {
        ctx.fillStyle = shade(bodyColor, -10);
        ctx.beginPath();
        ctx.arc(x + b.w / 2, b.y + 2, b.w * 0.35, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x + b.w / 2 - 8, b.y - b.w * 0.33, 16, 2);
        ctx.fillRect(x + b.w / 2 - 1, b.y - b.w * 0.33 - 7, 2, 7);
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x + b.w / 2 - 1, b.y - b.w * 0.33 - 8, 2, 2);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = shade(bodyColor, -14);
        ctx.fillRect(x - 3, b.y - 3, Math.round(b.w) + 6, 4);
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x - 2, b.y - 2, Math.round(b.w) + 4, 1);
        ctx.globalAlpha = 1;
        /* rooftop railing */
        for (let i = 0; i < b.w; i += 8) ctx.fillRect(x + i, b.y - 8, 2, 6);
        ctx.fillRect(x - 2, b.y - 9, Math.round(b.w) + 4, 2);
      }

      /* lit windows */
      const cols = Math.max(1, Math.floor(b.w / 24));
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < b.windows; cy++) {
          const wx = x + 10 + cx * 23;
          const wy = b.y + 14 + cy * 18;
          if (wy > 214) continue;
          const flick = 0.65 + Math.sin(this.time * 1.7 + cx + cy + b.hue * 9) * 0.2;
          ctx.globalAlpha = flick;
          ctx.fillStyle = "#ffcf6b";
          ctx.fillRect(wx, wy, 5, 5);
          ctx.globalAlpha = flick * 0.28;
          ctx.fillStyle = "#ff9d3c";
          ctx.fillRect(wx - 2, wy - 2, 9, 9);
          ctx.globalAlpha = 1;
        }
      }

      /* doorway lamp + tiny garland */
      const dx = x + Math.round(b.w * 0.5);
      this.drawMiniDiya(dx, 214, this.time * 1.3 + b.hue * 4, 1);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = th.accent2;
      for (let i = 0; i < b.w; i += 5) {
        ctx.fillRect(x + i, b.y + 4 + Math.round(Math.sin(i * 0.9) * 2), 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    /* strings of bulbs between the houses */
    ctx.globalAlpha = 0.9;
    const stringOff = (camX * 0.46) % 160;
    for (let s = -1; s < 4; s++) {
      const baseX = s * 160 - stringOff;
      const y = 110 + (s % 2) * 16;
      ctx.strokeStyle = "rgba(8,4,18,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(baseX, y);
      ctx.quadraticCurveTo(baseX + 80, y + 20, baseX + 160, y);
      ctx.stroke();
      for (let i = 1; i < 10; i++) {
        const t = i / 10;
        const bx = baseX + t * 160;
        const by = y + Math.sin(t * Math.PI) * 13;
        const colors = ["#ffcf6b", "#ff7fa8", "#7ae8ff", "#c8a6ff"];
        ctx.fillStyle = colors[(i + s) % colors.length];
        ctx.globalAlpha = 0.55 + Math.sin(this.time * 2 + i) * 0.25;
        ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------- menu diorama ------------------------- */

  private drawMenuDiorama(camX: number) {
    const ctx = this.ctx;
    const th = this.level.theme;

    ctx.save();
    ctx.translate(-Math.round(camX * 0.55), 0);

    /* decorative foreground terrace */
    const terraceY = 226;
    ctx.fillStyle = shade(th.ground, -10);
    ctx.fillRect(-40, terraceY, this.level.width + 80, VIEW_H - terraceY);
    ctx.fillStyle = th.groundTop;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(-40, terraceY, this.level.width + 80, 3);
    ctx.globalAlpha = 1;

    for (let x = 34; x < this.level.width + 60; x += 96) {
      /* little floor lamps and marigold clusters */
      this.drawMiniDiya(x, terraceY, this.time * 1.2 + x, 1);
      ctx.fillStyle = x % 192 < 96 ? "#ff9d5c" : "#ff7fa8";
      ctx.fillRect(x + 14, terraceY - 3, 3, 3);
      ctx.fillStyle = "#ffcf6b";
      ctx.fillRect(x + 17, terraceY - 5, 3, 3);
      ctx.fillStyle = "#ff9d5c";
      ctx.fillRect(x + 20, terraceY - 3, 3, 3);

      /* rangoli circles on ground */
      if (x % 288 < 96) this.drawRangoli(x + 48, terraceY + 16, 17, this.time + x);
    }

    /* hanging lanterns from an invisible line */
    for (let i = 0; i < 14; i++) {
      const lx = i * 78 + 30;
      const sway = Math.sin(this.time * 0.9 + i) * 2;
      this.drawHangingLantern(lx + sway, 6 + (i % 2) * 9, 1 + (i % 3) * 0.1);
    }

    /* oversized welcome diyas on the far right of the scene */
    const bigX = this.level.width * 0.72;
    this.drawBigDiya(bigX, terraceY, 2.6);
    this.drawBigDiya(bigX + 120, terraceY, 1.7);

    /* rangoli rings and floating petals */
    ctx.fillStyle = rgba(th.accent, 0.22);
    for (let i = 0; i < 6; i++) {
      const px = bigX + 40 + Math.sin(this.time * 0.4 + i * 2) * 50;
      const py = 140 + Math.cos(this.time * 0.5 + i) * 34;
      ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
    ctx.restore();
  }

  /* ---------------------------- world ----------------------------- */

  private drawWorld() {
    const ctx = this.ctx;
    const level = this.level;

    /* decorative rangoli & shadows near ground */
    for (let x = 110; x < level.width; x += 280) {
      this.drawRangoli(x, GROUND_Y + 12, 20, this.time + x * 0.01);
    }

    for (const p of level.platforms) this.drawPlatform(p);

    /* entrance toran arch */
    this.drawToran(36, GROUND_Y, 0.8);

    /* checkpoints */
    for (let i = 0; i < level.checkpoints.length; i++) {
      const cp = level.checkpoints[i];
      const active = this.run.checkpoint?.x === cp.x && this.run.checkpoint?.y === cp.y;
      this.drawCheckpoint(cp.x, cp.y, active);
    }

    this.drawGate(level.goal.x, level.goal.y);

    for (const it of this.run.items) {
      if (!it.collected) this.drawItem(it);
    }
    for (const h of this.run.hazards) this.drawHazard(h);

    this.drawPlayer();

    /* level end gate glow is drawn above player silhouette subtly */
    ctx.globalAlpha = 1;
  }

  private drawPlatform(p: PlatformDef) {
    const ctx = this.ctx;
    const th = this.level.theme;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const w = Math.round(p.w);
    const h = Math.round(p.h);

    /* drop shadow */
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#08040f";
    ctx.fillRect(x + 3, y + h, w, 4);
    ctx.globalAlpha = 1;

    const base = p.style === "flower" ? "#1a574c"
      : p.style === "gold" ? "#5a3348"
      : p.style === "wood" ? "#4d2b3d"
      : p.style === "stone" ? "#343453"
      : p.style === "roof" ? "#38283f"
      : "#3b2144";

    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);

    /* edge light */
    const topColor = p.style === "flower" ? "#7fe6b9"
      : p.style === "gold" ? "#ffd479"
      : p.style === "wood" ? "#ffb27a"
      : p.style === "stone" ? "#c7b08a"
      : p.style === "roof" ? "#d4776b"
      : "#c98168";
    ctx.fillStyle = topColor;
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = shade(th.ground, 22);
    ctx.fillRect(x, y + 3, w, 1);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x, y + h - 2, w, 2);

    /* brick / tile / petal detailing */
    if (p.style === "brick" || p.style === "stone") {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      for (let by = y + 8; by < y + h; by += 9) {
        ctx.fillRect(x, by, w, 1);
        for (let bx = x + ((by / 9) % 2 === 0 ? 8 : 20); bx < x + w; bx += 24) {
          ctx.fillRect(bx, by, 1, 9);
        }
      }
      if (p.style === "stone") {
        ctx.fillStyle = "rgba(255,220,160,0.22)";
        for (let bx = x + 12; bx < x + w - 10; bx += 38) ctx.fillRect(bx, y + 6, 5, 1);
      }
    } else if (p.style === "wood" || p.style === "roof") {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      for (let bx = x + 10; bx < x + w; bx += 18) ctx.fillRect(bx, y + 4, 1, h - 6);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(x, y + 5, w, 1);
      if (p.style === "roof" && w > 70) {
        /* tiny rooftop railing and flower pots */
        this.drawMiniFlower(x + 12, y, this.time + x);
        this.drawMiniFlower(x + w - 14, y, this.time + x + 2);
      }
    } else if (p.style === "gold") {
      ctx.fillStyle = "rgba(255,200,92,0.5)";
      for (let bx = x + 8; bx < x + w - 6; bx += 16) {
        ctx.fillRect(bx, y + 6, 8, 1);
        ctx.fillRect(bx + 3, y + 8, 2, 2);
      }
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x, y + h - 4, w, 1);
    } else {
      /* flower bed: clustered blossoms and leaves */
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(x, y + h - 5, w, 2);
      for (let bx = x + 6; bx < x + w; bx += 12) {
        const c = (bx / 12) % 3 < 1 ? "#ff9fc0" : (bx / 12) % 3 < 2 ? "#ffd479" : "#c8a6ff";
        ctx.fillStyle = c;
        ctx.fillRect(bx, y + 5 + Math.round(Math.sin(bx) * 1.5), 2, 2);
        ctx.fillStyle = "#4fbf91";
        ctx.fillRect(bx + 3, y + 8, 1, 3);
      }
    }

    /* decorative diyas along the platform edges */
    if (w > 58) {
      this.drawMiniDiya(x + 9, y, this.time * 1.4 + x, 1);
      if (w > 130) this.drawMiniDiya(x + w - 9, y, this.time * 1.2 + x + 3, 1);
    }

    /* hanging lanterns below wooden platforms */
    if (p.style === "wood" && w > 70) {
      this.drawHangingLantern(x + 16, y + h, 0.8);
      if (w > 100) this.drawHangingLantern(x + w - 18, y + h, 0.9);
    }
  }

  private drawRangoli(cx: number, cy: number, r: number, t: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    ctx.globalAlpha = 0.65;
    const colors = ["#ff9fc0", "#ffd479", "#7ae8ff", "#c8a6ff", "#6ff2ca"];
    for (let ring = 0; ring < 3; ring++) {
      const radius = r * (1 - ring * 0.26);
      const dots = 12 + ring * 5;
      ctx.fillStyle = colors[ring % colors.length];
      for (let i = 0; i < dots; i++) {
        const a = (i / dots) * Math.PI * 2 + t * 0.12;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius * 0.42;
        ctx.fillRect(Math.round(px), Math.round(py), 2, 1);
      }
    }
    ctx.fillStyle = colors[1];
    ctx.fillRect(-1, -1, 2, 2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawToran(x: number, y: number, scale: number) {
    const ctx = this.ctx;
    const th = this.level.theme;
    const w = 76 * scale;
    ctx.fillStyle = shade(th.ground, 18);
    ctx.fillRect(x - w / 2, y - 58 * scale, 5 * scale, 58 * scale);
    ctx.fillRect(x + w / 2 - 5 * scale, y - 58 * scale, 5 * scale, 58 * scale);
    ctx.fillRect(x - w / 2, y - 60 * scale, w, 5 * scale);
    ctx.fillStyle = th.accent;
    ctx.fillRect(x - w / 2 - 2, y - 62 * scale, w + 4, 2);
    /* marigold fringe */
    for (let i = 0; i < w / 6; i += 1) {
      ctx.fillStyle = i % 2 ? "#ff9d5c" : "#ffcf6b";
      ctx.fillRect(Math.round(x - w / 2 + i * 6), y - 55 * scale, 4, 4);
    }
    this.drawMiniDiya(x - w / 2 + 2, y - 40, this.time + x, 1);
    this.drawMiniDiya(x + w / 2 - 2, y - 40, this.time + x + 1, 1);
  }

  private drawMiniDiya(x: number, baseY: number, phase: number, scale = 1) {
    const ctx = this.ctx;
    const flick = Math.sin(phase * 2.4) * 0.5;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.arc(x, baseY - 5 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#c56a3c";
    ctx.fillRect(Math.round(x - 3 * scale), Math.round(baseY - 3 * scale), Math.round(6 * scale), 2);
    ctx.fillStyle = "#e08b4a";
    ctx.fillRect(Math.round(x - 3 * scale), Math.round(baseY - 4 * scale), Math.round(6 * scale), 1);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(Math.round(x - 1), Math.round(baseY - 7 * scale + flick), 2, 3);
    ctx.fillStyle = "#fff4d6";
    ctx.fillRect(Math.round(x), Math.round(baseY - 7 * scale + flick), 1, 1);
  }

  private drawMiniFlower(x: number, baseY: number, phase: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#ff9d5c";
    ctx.fillRect(Math.round(x) - 2, Math.round(baseY) - 5, 4, 2);
    ctx.fillStyle = "#ffcf6b";
    ctx.fillRect(Math.round(x) - 1, Math.round(baseY) - 7, 2, 2);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#ffcf6b";
    ctx.fillRect(Math.round(x) - 3, Math.round(baseY) - 4, 6, 1);
    ctx.globalAlpha = 1;
    const sway = Math.sin(phase * 2) * 1;
    ctx.fillStyle = "#4fbf91";
    ctx.fillRect(Math.round(x + sway), Math.round(baseY) - 5, 1, 5);
  }

  private drawHangingLantern(x: number, y: number, scale: number) {
    const ctx = this.ctx;
    const th = this.level.theme;
    const len = 10 + 14 * scale;
    const sway = Math.sin(this.time * 1.1 + x * 0.1) * 2;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#0a0514";
    ctx.fillRect(x, y, 1, len);
    ctx.globalAlpha = 1;
    const lx = x + sway;
    const ly = y + len;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = th.accent;
    ctx.beginPath(); ctx.arc(lx + 3, ly + 4, 9 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#8f3b3b";
    ctx.fillRect(Math.round(lx), Math.round(ly), 6, 2);
    ctx.fillStyle = "#c94d55";
    ctx.fillRect(Math.round(lx - 1), Math.round(ly + 2), 8, 5);
    ctx.fillStyle = "#ffcf6b";
    ctx.fillRect(Math.round(lx + 2), Math.round(ly + 3), 2, 3);
    ctx.fillStyle = "#8f3b3b";
    ctx.fillRect(Math.round(lx), Math.round(ly + 7), 6, 1);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(Math.round(lx + 2), Math.round(ly + 8), 2, 2);
  }

  private drawCheckpoint(x: number, y: number, active: boolean) {
    const ctx = this.ctx;
    const baseY = Math.round(y);
    const poleX = Math.round(x) - 1;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#08040f";
    ctx.fillRect(poleX - 7, baseY - 2, 18, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = active ? "#ffd479" : "#6d5b78";
    ctx.fillRect(poleX, baseY - 48, 3, 48);
    ctx.fillRect(poleX - 5, baseY - 4, 13, 3);
    /* little banner */
    ctx.fillStyle = active ? "#ff7fa8" : "#493c58";
    ctx.fillRect(poleX + 3, baseY - 44, 14, 8);
    ctx.fillStyle = active ? "#ffd479" : "#5d4d6c";
    ctx.fillRect(poleX + 7, baseY - 42, 6, 4);

    if (active) {
      ctx.globalAlpha = 0.22 + Math.sin(this.time * 3) * 0.06;
      ctx.fillStyle = "#ffcf6b";
      ctx.beginPath(); ctx.arc(poleX + 1, baseY - 52, 15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      this.drawMiniDiya(poleX + 1, baseY - 47, this.time * 2.2, 1.5);
      /* rising sparkles */
      for (let i = 0; i < 3; i++) {
        const py = baseY - 14 - ((this.time * 20 + i * 16) % 42);
        ctx.globalAlpha = 0.5 * (1 - (baseY - py) / 50);
        ctx.fillStyle = "#fff4d6";
        ctx.fillRect(poleX + 1 + Math.sin(this.time * 2 + i) * 5, Math.round(py), 1, 1);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "#8e789f";
      ctx.fillRect(poleX - 2, baseY - 54, 7, 7);
      ctx.fillStyle = "#c0a9d0";
      ctx.fillRect(poleX - 1, baseY - 53, 5, 3);
    }
  }

  private drawGate(x: number, y: number) {
    const ctx = this.ctx;
    const gx = Math.round(x);
    const gy = Math.round(y);
    const open = this.run.gateOpen;
    const left = gx - 38;
    const right = gx + 30;

    /* threshold glow */
    ctx.globalAlpha = open ? 0.2 + Math.sin(this.time * 3) * 0.05 : 0.07;
    ctx.fillStyle = open ? "#ffcf6b" : "#8a9fff";
    ctx.beginPath();
    ctx.arc(gx - 4, gy - 38, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    /* pillars */
    const gold = open ? "#ffd479" : "#6b5b88";
    const goldDark = open ? "#c88b39" : "#49405f";
    ctx.fillStyle = goldDark;
    ctx.fillRect(left, gy - 64, 11, 64);
    ctx.fillRect(right, gy - 64, 11, 64);
    ctx.fillStyle = gold;
    ctx.fillRect(left, gy - 64, 3, 64);
    ctx.fillRect(right, gy - 64, 3, 64);

    /* ornate capitals */
    ctx.fillStyle = gold;
    ctx.fillRect(left - 3, gy - 66, 17, 4);
    ctx.fillRect(right - 3, gy - 66, 17, 4);

    /* arch */
    ctx.fillStyle = goldDark;
    ctx.fillRect(left, gy - 71, right + 11 - left, 6);
    ctx.fillStyle = gold;
    ctx.fillRect(left - 3, gy - 73, right + 14 - left, 3);
    for (let bx = left; bx < right + 8; bx += 8) {
      ctx.fillStyle = bx % 16 < 8 ? "#ff9d5c" : "#ffcf6b";
      ctx.fillRect(bx, gy - 67, 5, 4);
    }

    /* hanging lamp */
    ctx.fillStyle = goldDark;
    ctx.fillRect(gx - 4, gy - 71, 1, 7);
    if (open) {
      this.drawMiniDiya(gx - 4, gy - 56, this.time * 2.5, 2);
    } else {
      ctx.fillStyle = "#4a4364";
      ctx.fillRect(gx - 9, gy - 57, 11, 5);
      ctx.fillStyle = "#8f86a8";
      ctx.fillRect(gx - 8, gy - 57, 9, 2);
    }

    /* gateway veil */
    if (!open) {
      ctx.globalAlpha = 0.16 + Math.sin(this.time * 2) * 0.03;
      ctx.fillStyle = "#8394ff";
      ctx.fillRect(left + 11, gy - 60, right - left - 11, 60);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#aab8ff";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.strokeRect(left + 14 + i * 10, gy - 54 + i * 4, 26, 40);
      }
      ctx.globalAlpha = 1;
    } else {
      /* rising festival sparks */
      for (let i = 0; i < 8; i++) {
        const px = gx - 12 + Math.sin(this.time * 2 + i * 1.7) * 24;
        const py = gy - 20 - ((this.time * 22 + i * 13) % 54);
        ctx.globalAlpha = 0.5 + Math.sin(this.time * 4 + i) * 0.3;
        ctx.fillStyle = i % 2 ? "#ffd479" : "#fff4d6";
        ctx.fillRect(Math.round(px), Math.round(py), 1, 2);
      }
      ctx.globalAlpha = 1;
      /* diya count pips above arch */
      for (let i = 0; i < Math.min(this.level.requiredDiyas, 12); i++) {
        ctx.fillStyle = "#ffcf6b";
        ctx.fillRect(gx - 28 + i * 5, gy - 79, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------- items ----------------------------- */

  private drawItem(it: ItemState) {
    const ctx = this.ctx;
    const bob = Math.sin(this.time * 2.6 + it.phase) * 2.5;
    const x = Math.round(it.x);
    const y = Math.round(it.y + bob);

    ctx.globalAlpha = 0.18 + Math.sin(this.time * 2 + it.phase) * 0.04;
    ctx.fillStyle = it.kind === "diya" ? "#ffb347" : it.kind === "laddoo" ? "#ffcf6b" : "#ff7fa8";
    ctx.beginPath(); ctx.arc(x, y, it.kind === "gift" ? 11 : 9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    if (it.kind === "diya") {
      /* floating sparkles */
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#fff4d6";
      ctx.fillRect(x - 6, y - 7 + Math.round(Math.sin(this.time * 3) * 1), 1, 1);
      ctx.fillRect(x + 6, y - 5, 1, 1);
      ctx.globalAlpha = 1;
      this.drawMiniDiya(x, y + 7, this.time * 2.6 + it.phase, 1.4);
      ctx.fillStyle = "#fff4d6";
      ctx.fillRect(x - 1, y - 6, 2, 2);
    } else if (it.kind === "laddoo") {
      ctx.fillStyle = "#b97b2c";
      ctx.fillRect(x - 5, y - 3, 10, 8);
      ctx.fillStyle = "#e8a83c";
      ctx.fillRect(x - 5, y - 5, 10, 8);
      ctx.fillStyle = "#ffcf6b";
      ctx.fillRect(x - 4, y - 5, 6, 3);
      ctx.fillStyle = "#fff0b8";
      ctx.fillRect(x - 2, y - 4, 2, 1);
      ctx.fillStyle = "#a86a22";
      ctx.fillRect(x + 2, y, 1, 1);
      ctx.fillRect(x - 3, y + 2, 1, 1);
      ctx.fillStyle = "#4fbf91";
      ctx.fillRect(x + 3, y - 7, 2, 2);
    } else {
      /* wrapped festival gift */
      ctx.fillStyle = "#a92f5b";
      ctx.fillRect(x - 6, y - 5, 12, 11);
      ctx.fillStyle = "#e94c7f";
      ctx.fillRect(x - 6, y - 5, 12, 8);
      ctx.fillStyle = "#ffd479";
      ctx.fillRect(x - 1, y - 5, 3, 11);
      ctx.fillRect(x - 6, y - 1, 12, 2);
      ctx.fillStyle = "#fff0b8";
      ctx.fillRect(x - 4, y - 8, 3, 3);
      ctx.fillRect(x + 2, y - 8, 3, 3);
      ctx.fillStyle = "#ffd479";
      ctx.fillRect(x - 1, y - 9, 2, 4);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "#fff4d6";
      ctx.fillRect(x - 5, y - 4, 1, 1);
      ctx.globalAlpha = 1;
    }
  }

  /* --------------------------- hazards ---------------------------- */

  private drawHazard(h: HazardState) {
    const ctx = this.ctx;
    const x = Math.round(h.cx);
    const y = Math.round(h.cy);

    if (h.kind === "flame") {
      /* An angry crimson will-o'-the-wisp — clearly a danger, never a diya. */
      ctx.globalAlpha = 0.14 + Math.sin(h.t * 6) * 0.04;
      ctx.fillStyle = "#ff3d5e";
      ctx.beginPath(); ctx.arc(x, y - 3, 17, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#1d0e26";
      ctx.fillRect(x - 10, y - 18, 3, 3);
      ctx.fillRect(x + 7, y - 14, 2, 2);
      ctx.fillRect(x - 8, y + 6, 2, 2);
      ctx.globalAlpha = 1;
      /* dark ember body */
      ctx.fillStyle = "#4a1226";
      ctx.beginPath();
      ctx.moveTo(x, y - 21);
      ctx.lineTo(x + 8, y - 6);
      ctx.lineTo(x + 5, y + 6);
      ctx.lineTo(x - 5, y + 6);
      ctx.lineTo(x - 8, y - 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c22a52";
      ctx.beginPath();
      ctx.moveTo(x, y - 17);
      ctx.lineTo(x + 6, y - 5);
      ctx.lineTo(x + 3, y + 3);
      ctx.lineTo(x - 4, y + 3);
      ctx.lineTo(x - 6, y - 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff5a70";
      ctx.beginPath();
      ctx.moveTo(x + 1, y - 11);
      ctx.lineTo(x + 3, y - 3);
      ctx.lineTo(x - 1, y + 1);
      ctx.lineTo(x - 3, y - 5);
      ctx.closePath();
      ctx.fill();
      /* angry white eyes with dark brows */
      ctx.fillStyle = "#fff0f3";
      ctx.fillRect(x - 4, y - 3, 3, 2);
      ctx.fillRect(x + 2, y - 3, 3, 2);
      ctx.fillStyle = "#4a1226";
      ctx.fillRect(x - 3, y - 3, 1, 1);
      ctx.fillRect(x + 3, y - 3, 1, 1);
      ctx.fillRect(x - 5, y - 5, 3, 1);
      ctx.fillRect(x + 2, y - 5, 3, 1);
      /* embers */
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "#ff8a3d";
      ctx.fillRect(x - 7, y - 12 + Math.round(Math.sin(h.t * 5) * 2), 1, 1);
      ctx.fillRect(x + 7, y - 8 + Math.round(Math.cos(h.t * 4) * 2), 1, 1);
      ctx.globalAlpha = 1;
    } else if (h.kind === "spirit") {
      const pulse = Math.sin(h.t * 3) * 2;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#c8a6ff";
      ctx.beginPath(); ctx.arc(x, y, 14 + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#7d5fc4";
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ab8cf0";
      ctx.fillRect(x - 6, y - 2, 12, 8);
      ctx.fillStyle = "#e2d4ff";
      ctx.fillRect(x - 4, y - 2, 3, 3);
      ctx.fillRect(x + 2, y - 2, 3, 3);
      ctx.fillStyle = "#3b2354";
      ctx.fillRect(x - 3, y - 1, 1, 1);
      ctx.fillRect(x + 3, y - 1, 1, 1);
      ctx.fillStyle = "#7d5fc4";
      ctx.fillRect(x - 5 + Math.sin(h.t * 4) * 2, y + 8, 3, 2);
      ctx.fillRect(x + 3 + Math.cos(h.t * 5) * 2, y + 9, 2, 2);
    } else if (h.kind === "chakra") {
      const rot = h.t * 3;
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#ffcf6b";
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = "#ffd479";
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i / 8) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(3, -10); ctx.lineTo(0, -13); ctx.lineTo(-3, -10);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = "#e7a63b";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fff4d6";
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (h.kind === "rocket") {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#ff9fc0";
      ctx.beginPath(); ctx.arc(x, y + 12, 12, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#e3d9f2";
      ctx.fillRect(x - 4, y - 4, 8, 16);
      ctx.fillStyle = "#ff7f9e";
      ctx.fillRect(x - 4, y - 10, 8, 6);
      ctx.fillStyle = "#a92f5b";
      ctx.fillRect(x - 3, y + 12, 2, 5);
      ctx.fillRect(x + 2, y + 12, 2, 5);
      ctx.fillStyle = "#ffcf6b";
      ctx.fillRect(x - 1, y + 16, 2, 5 + Math.round(Math.sin(h.t * 12) * 2));
      ctx.fillStyle = "#fff4d6";
      ctx.fillRect(x, y + 4, 2, 3);
    } else {
      /* thorn vine */
      ctx.fillStyle = "#263d2f";
      ctx.fillRect(x - h.w / 2, y + 2, h.w, 4);
      ctx.fillStyle = "#8f3b5f";
      for (let i = 0; i < h.w; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x - h.w / 2 + i, y + 4);
        ctx.lineTo(x - h.w / 2 + i + 4, y - 7);
        ctx.lineTo(x - h.w / 2 + i + 8, y + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#ff7fa8";
      ctx.fillRect(x - h.w / 2 + 3, y - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /* --------------------------- player ----------------------------- */

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const t = this.time;

    /* ground shadow */
    let shadowY = p.y + p.h + 2;
    for (const s of this.level.platforms) {
      if (p.x + p.w > s.x && p.x < s.x + s.w && s.y >= p.y + p.h - 2 && s.y < shadowY + 10) {
        shadowY = Math.min(shadowY, s.y + 1);
      }
    }
    const dist = clamp(1 - (shadowY - (p.y + p.h)) / 60, 0.15, 1);
    ctx.globalAlpha = 0.28 * dist;
    ctx.fillStyle = "#08040f";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, shadowY, 9 * dist, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    /* aura */
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = "#ffc85c";
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) ctx.globalAlpha = 0.45;

    ctx.save();
    ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y));
    if (p.facing < 0) ctx.scale(-1, 1);
    /* draw the heroine a touch larger than her hitbox for readability */
    const heroScale = 1.34;
    ctx.scale(heroScale, heroScale);
    ctx.translate(0, PLAYER_H / heroScale - PLAYER_H);

    const moving = Math.abs(p.vx) > 12;
    const running = Math.abs(p.vx) > 138;
    const cycle = p.animTime * (running ? 15 : 10);
    const airborne = !p.onGround;
    const bob = airborne ? 0 : moving ? Math.abs(Math.sin(cycle)) * 1.3 : Math.sin(t * 2) * 0.6;
    const legSwing = airborne ? 0 : moving ? Math.sin(cycle) * (running ? 3 : 2) : 0;
    const cheer = this.mode === "complete";
    const collect = p.collectTimer > 0;
    const hurt = p.hurtTimer > 0;

    ctx.translate(0, bob + (cheer ? -2 + Math.sin(t * 5) * 1 : 0));
    if (hurt) ctx.rotate(Math.sin(t * 40) * 0.06);

    const skin = "#f0b083";
    const skinShade = "#c9835c";
    const hair = "#2a1736";
    const hairLight = "#4a2a52";
    const skirt = "#a63f86";
    const skirtLight = "#d15aa4";
    const choli = "#1c8f8a";
    const choliLight = "#36c8b4";
    const gold = "#ffd479";
    const goldDark = "#d29238";

    /* flowing dupatta / scarf behind */
    const flutter = airborne ? 2.5 : moving ? 1.8 : 0.5;
    ctx.fillStyle = "#e05d95";
    ctx.fillRect(-7 - Math.round(flutter), 6 + Math.round(Math.sin(t * 8) * 1), 5, 2);
    ctx.fillRect(-9 - Math.round(flutter * 1.5), 8 + Math.round(Math.cos(t * 7) * 2), 4, 2);
    ctx.fillStyle = "#ff9fc0";
    ctx.fillRect(-7 - Math.round(flutter), 6 + Math.round(Math.sin(t * 8) * 1), 3, 1);

    /* braid behind */
    ctx.fillStyle = hair;
    ctx.fillRect(-5, 4, 3, 7);
    ctx.fillStyle = hairLight;
    ctx.fillRect(-5, 5, 1, 3);
    ctx.fillStyle = gold;
    ctx.fillRect(-5, 10, 3, 1);

    /* legs */
    if (airborne) {
      ctx.fillStyle = skinShade;
      ctx.fillRect(-3, 18, 3, 4);
      ctx.fillRect(1, 17, 3, 5);
      ctx.fillStyle = "#4b2640";
      ctx.fillRect(-3, 21, 3, 2);
      ctx.fillRect(1, 21, 3, 2);
    } else {
      ctx.fillStyle = skinShade;
      ctx.fillRect(-3 + Math.round(legSwing * 0.3), 18, 3, 3);
      ctx.fillRect(1 - Math.round(legSwing * 0.3), 18, 3, 3);
      ctx.fillStyle = "#4b2640";
      ctx.fillRect(-3 + Math.round(legSwing), 20, 3, 2);
      ctx.fillRect(1 - Math.round(legSwing), 20, 3, 2);
      ctx.fillStyle = goldDark;
      ctx.fillRect(-3 + Math.round(legSwing), 20, 3, 1);
      ctx.fillRect(1 - Math.round(legSwing), 20, 3, 1);
    }

    /* flared skirt */
    ctx.fillStyle = skirt;
    ctx.fillRect(-5, 13, 10, 7);
    ctx.fillRect(-6, 16, 12, 4);
    ctx.fillStyle = skirtLight;
    ctx.fillRect(-4, 14, 3, 5);
    ctx.fillRect(2, 15, 2, 4);
    ctx.fillStyle = gold;
    ctx.fillRect(-6, 19, 12, 2);
    ctx.fillStyle = "#ffefa8";
    for (let i = -5; i < 6; i += 3) ctx.fillRect(i, 19, 1, 1);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(-1, 13, 2, 6);

    /* choli / bodice */
    ctx.fillStyle = choli;
    ctx.fillRect(-4, 8, 8, 6);
    ctx.fillStyle = choliLight;
    ctx.fillRect(-4, 8, 8, 2);
    ctx.fillStyle = gold;
    ctx.fillRect(-5, 12, 10, 2);
    ctx.fillRect(0, 8, 1, 4);

    /* arms */
    const armSwing = collect || cheer ? -5 : airborne ? -3 : moving ? Math.round(Math.sin(cycle + Math.PI) * 2) : Math.round(Math.sin(t * 2));
    ctx.fillStyle = choli;
    ctx.fillRect(-6, 9, 2, 3);
    ctx.fillRect(4, 9, 2, 3);
    ctx.fillStyle = skin;
    ctx.fillRect(-7, 10 + armSwing, 2, 4);
    ctx.fillRect(5, 9 - (collect || cheer ? 4 : 0) + Math.round(airborne ? -1 : 0), 2, 4);
    ctx.fillStyle = gold;
    ctx.fillRect(-7, 13 + armSwing, 2, 1);
    ctx.fillRect(5, 12 - (collect || cheer ? 4 : 0), 2, 1);

    /* held diya in the front hand */
    const handX = 6;
    const handY = 11 - (collect || cheer ? 8 : 0);
    ctx.fillStyle = "#b5532b";
    ctx.fillRect(handX - 1, handY, 4, 2);
    ctx.fillStyle = "#e08b4a";
    ctx.fillRect(handX - 1, handY, 4, 1);
    const flame = Math.round(Math.sin(t * 12) * 0.8);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(handX, handY - 4, 2, 5);
    ctx.globalAlpha = p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0 ? 0.45 : 1;
    ctx.fillStyle = "#ffcf4a";
    ctx.fillRect(handX, handY - 4 + flame * 0, 2, 2);
    ctx.fillStyle = "#fff4d6";
    ctx.fillRect(handX, handY - 4, 1, 1);

    /* head */
    ctx.fillStyle = skin;
    ctx.fillRect(-4, 2, 8, 7);
    ctx.fillRect(-3, 1, 6, 1);
    ctx.fillStyle = skinShade;
    ctx.fillRect(-4, 7, 8, 1);
    ctx.fillStyle = skin;
    ctx.fillRect(-4, 3, 1, 4);

    /* hair */
    ctx.fillStyle = hair;
    ctx.fillRect(-5, 0, 10, 3);
    ctx.fillRect(-5, 2, 2, 5);
    ctx.fillRect(4, 2, 2, 5);
    ctx.fillStyle = hairLight;
    ctx.fillRect(-4, 0, 5, 1);
    ctx.fillRect(-3, 2, 1, 1);

    /* face */
    const blink = Math.floor(t * 0.9 + 0.2) % 5 === 0 && (t * 0.9) % 5 < 0.13;
    ctx.fillStyle = "#3a2238";
    ctx.fillRect(0, 4, 1, blink ? 1 : 2);
    ctx.fillRect(3, 4, 1, blink ? 1 : 2);
    ctx.fillStyle = "#fff4d6";
    if (!blink) { ctx.fillRect(0, 4, 1, 1); }
    /* bindi, earring, tiara */
    ctx.fillStyle = "#e94c7f";
    ctx.fillRect(2, 3, 1, 1);
    ctx.fillStyle = gold;
    ctx.fillRect(4, 5, 1, 1);
    ctx.fillRect(-5, 5, 1, 1);
    ctx.fillRect(-2, 0, 4, 1);
    ctx.fillStyle = "#ffefa8";
    ctx.fillRect(0, 0, 1, 1);
    /* smile */
    ctx.fillStyle = "#a62f4b";
    ctx.fillRect(2, 7, 2, 1);

    /* collect sparkle ring */
    if (collect) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#fff4d6";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 3;
        ctx.fillRect(Math.round(Math.cos(a) * 12), Math.round(6 + Math.sin(a) * 9), 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    ctx.globalAlpha = 1;

    /* double jump indicator: tiny sparks when airborne */
    if (airborne && p.jumpsLeft > 0) {
      ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.1;
      ctx.fillStyle = "#ffe9b0";
      ctx.fillRect(Math.round(p.x + p.w / 2 + 9), Math.round(p.y + 4), 1, 2);
      ctx.fillRect(Math.round(p.x + p.w / 2 - 10), Math.round(p.y + 8), 1, 2);
      ctx.globalAlpha = 1;
    }
  }

  private drawBigDiya(x: number, baseY: number, scale: number) {
    const ctx = this.ctx;
    const flick = Math.sin(this.time * 5) * 2;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffb347";
    ctx.beginPath(); ctx.arc(x, baseY - 12 * scale, 22 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#8e4327";
    ctx.fillRect(x - 9 * scale, baseY - 6 * scale, 18 * scale, 5 * scale);
    ctx.fillStyle = "#c56a3c";
    ctx.fillRect(x - 11 * scale, baseY - 9 * scale, 22 * scale, 4 * scale);
    ctx.fillStyle = "#e08b4a";
    ctx.fillRect(x - 8 * scale, baseY - 10 * scale, 16 * scale, 2 * scale);
    ctx.fillStyle = "#ffcf4a";
    ctx.beginPath();
    ctx.moveTo(x, baseY - (24 * scale) + flick);
    ctx.quadraticCurveTo(x + 7 * scale, baseY - 16 * scale, x, baseY - 10 * scale);
    ctx.quadraticCurveTo(x - 7 * scale, baseY - 16 * scale, x, baseY - (24 * scale) + flick);
    ctx.fill();
    ctx.fillStyle = "#fff4d6";
    ctx.fillRect(x - 1, baseY - 17 * scale, 2, 3 * scale);
  }

  /* -------------------------- overlays ---------------------------- */

  private drawWorldParticles() {
    const ctx = this.ctx;
    for (const p of this.worldParticles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === "confetti") {
        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(p.y));
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size);
        ctx.restore();
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawScreenParticles() {
    const ctx = this.ctx;
    for (const p of this.fwParticles) {
      if (!p.confetti) continue;
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size, -p.size, p.size * 2, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawOverlays() {
    const ctx = this.ctx;

    /* Once the gate is lit, guide the player toward the arch if it is off-screen. */
    if (this.mode === "playing" && this.run.gateOpen) {
      const goalScreen = this.level.goal.x - this.camera.x;
      if (goalScreen > VIEW_W - 24) {
        const ax = VIEW_W - 22;
        const ay = 118 + Math.sin(this.time * 2.2) * 3;
        ctx.globalAlpha = 0.2 + Math.sin(this.time * 3) * 0.05;
        ctx.fillStyle = "#ffcf6b";
        ctx.beginPath(); ctx.arc(ax, ay, 17, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffd479";
        ctx.fillRect(ax - 8, ay - 7, 3, 16);
        ctx.fillRect(ax + 5, ay - 7, 3, 16);
        ctx.fillRect(ax - 10, ay - 10, 20, 3);
        this.drawMiniDiya(ax, ay + 5, this.time * 2, 1.2);
        /* chevrons */
        ctx.fillStyle = "#ffe9b0";
        for (let i = 0; i < 2; i++) {
          const cx = ax + 9 + i * 4 + ((this.time * 10) % 4);
          ctx.globalAlpha = 0.75 - i * 0.25;
          ctx.beginPath();
          ctx.moveTo(cx, ay - 4);
          ctx.lineTo(cx + 3, ay);
          ctx.lineTo(cx, ay + 4);
          ctx.lineTo(cx + 1.5, ay);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    if (this.mode === "playing" && this.player.invuln > 0.15) {
      const a = Math.min(0.14, this.player.invuln * 0.1);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#ff3f6e";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    if (this.mode === "complete") {
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#ffcf6b";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }
}
