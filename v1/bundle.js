var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/game/constants.ts
var APPROACH_TIME, PERFECT_WINDOW, GOOD_WINDOW, HIT_RADIUS, CURSOR_RADIUS, PROJECTILE_RADIUS, PERFECT_SCORE, GOOD_SCORE, COMBO_MILESTONE, MAX_MULTIPLIER, MAX_HEALTH, MISS_DAMAGE, PROJECTILE_DAMAGE, PERFECT_HEAL, HIT_EFFECT_DURATION, MISS_EFFECT_DURATION, DAMAGE_EFFECT_DURATION, COMBO_EFFECT_DURATION, COUNTDOWN_SECONDS;
var init_constants = __esm({
  "src/game/constants.ts"() {
    APPROACH_TIME = 1.2;
    PERFECT_WINDOW = 0.1;
    GOOD_WINDOW = 0.25;
    HIT_RADIUS = 0.08;
    CURSOR_RADIUS = 0.03;
    PROJECTILE_RADIUS = 0.02;
    PERFECT_SCORE = 300;
    GOOD_SCORE = 100;
    COMBO_MILESTONE = 10;
    MAX_MULTIPLIER = 8;
    MAX_HEALTH = 100;
    MISS_DAMAGE = 3;
    PROJECTILE_DAMAGE = 8;
    PERFECT_HEAL = 1;
    HIT_EFFECT_DURATION = 0.6;
    MISS_EFFECT_DURATION = 0.5;
    DAMAGE_EFFECT_DURATION = 0.4;
    COMBO_EFFECT_DURATION = 0.8;
    COUNTDOWN_SECONDS = 3;
  }
});

// src/game/game.ts
var Game;
var init_game = __esm({
  "src/game/game.ts"() {
    init_constants();
    Game = class {
      constructor(beatmap) {
        __publicField(this, "beatmap");
        __publicField(this, "phase", "menu");
        __publicField(this, "time", 0);
        __publicField(this, "score", 0);
        __publicField(this, "combo", 0);
        __publicField(this, "maxCombo", 0);
        __publicField(this, "health", MAX_HEALTH);
        __publicField(this, "targets", []);
        __publicField(this, "projectiles", []);
        __publicField(this, "effects", []);
        __publicField(this, "nextEvent", 0);
        __publicField(this, "hits", { perfect: 0, good: 0, miss: 0 });
        __publicField(this, "countdownValue", COUNTDOWN_SECONDS);
        __publicField(this, "_countdownStart", 0);
        __publicField(this, "_playStart", 0);
        __publicField(this, "_lastComboMilestone", 0);
        this.beatmap = beatmap;
      }
      start(now) {
        this.phase = "countdown";
        this.time = 0;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = MAX_HEALTH;
        this.targets = [];
        this.projectiles = [];
        this.effects = [];
        this.nextEvent = 0;
        this.hits = { perfect: 0, good: 0, miss: 0 };
        this.countdownValue = COUNTDOWN_SECONDS;
        this._countdownStart = now;
        this._playStart = 0;
        this._lastComboMilestone = 0;
      }
      update(now, dt, cursor, audio) {
        if (this.phase === "countdown") {
          this._updateCountdown(now);
          return;
        }
        if (this.phase !== "playing") return;
        this.time = now - this._playStart;
        this._spawnEvents(audio);
        this._updateTargets(cursor, audio);
        this._updateProjectiles(dt, cursor, audio);
        this._updateEffects(dt);
        this.health = Math.max(0, Math.min(MAX_HEALTH, this.health));
        if (this.health <= 0) {
          this.phase = "gameover";
          return;
        }
        if (this.time >= this.beatmap.duration) {
          this.phase = "results";
        }
      }
      /** Advance game time directly (for testing without real clock) */
      tick(dt, cursor, audio) {
        if (this.phase === "countdown") {
          this.countdownValue -= dt;
          if (this.countdownValue <= 0) {
            this.phase = "playing";
            this.time = 0;
          }
          return;
        }
        if (this.phase !== "playing") return;
        this.time += dt;
        this._spawnEvents(audio);
        this._updateTargets(cursor, audio);
        this._updateProjectiles(dt, cursor, audio);
        this._updateEffects(dt);
        this.health = Math.max(0, Math.min(MAX_HEALTH, this.health));
        if (this.health <= 0) {
          this.phase = "gameover";
          return;
        }
        if (this.time >= this.beatmap.duration) {
          this.phase = "results";
        }
      }
      // ---- Private ----
      _updateCountdown(now) {
        const elapsed = now - this._countdownStart;
        this.countdownValue = COUNTDOWN_SECONDS - elapsed;
        if (elapsed >= COUNTDOWN_SECONDS) {
          this.phase = "playing";
          this._playStart = now;
          this.time = 0;
        }
      }
      _spawnEvents(audio) {
        while (this.nextEvent < this.beatmap.events.length) {
          const event = this.beatmap.events[this.nextEvent];
          const spawnTime = event.type === "target" ? event.time - APPROACH_TIME : event.time;
          if (spawnTime <= this.time) {
            if (event.type === "target") {
              this.targets.push({
                x: event.x,
                y: event.y,
                time: event.time,
                hit: false,
                missed: false
              });
              audio.playTick();
            } else {
              this.projectiles.push({
                x: event.x,
                y: event.y,
                dx: event.dx,
                dy: event.dy,
                speed: event.speed
              });
            }
            this.nextEvent++;
          } else {
            break;
          }
        }
      }
      _updateTargets(cursor, audio) {
        for (let i = this.targets.length - 1; i >= 0; i--) {
          const target = this.targets[i];
          const timeDiff = this.time - target.time;
          if (!target.hit && !target.missed && Math.abs(timeDiff) <= GOOD_WINDOW) {
            const dx = cursor.x - target.x;
            const dy = cursor.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < HIT_RADIUS) {
              target.hit = true;
              const isPerfect = Math.abs(timeDiff) <= PERFECT_WINDOW;
              this._registerHit(isPerfect, target, audio);
            }
          }
          if (!target.hit && !target.missed && timeDiff > GOOD_WINDOW) {
            target.missed = true;
            this._registerMiss(target, audio);
          }
          if (timeDiff > GOOD_WINDOW + 0.8) {
            this.targets.splice(i, 1);
          }
        }
      }
      _updateProjectiles(dt, cursor, audio) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const p = this.projectiles[i];
          p.x += p.dx * p.speed * dt;
          p.y += p.dy * p.speed * dt;
          const dx = cursor.x - p.x;
          const dy = cursor.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < PROJECTILE_RADIUS + CURSOR_RADIUS) {
            this.health -= PROJECTILE_DAMAGE;
            this.combo = 0;
            this._lastComboMilestone = 0;
            audio.playDamage();
            this.effects.push({
              type: "damage",
              x: p.x,
              y: p.y,
              life: DAMAGE_EFFECT_DURATION,
              maxLife: DAMAGE_EFFECT_DURATION
            });
            this.projectiles.splice(i, 1);
            continue;
          }
          if (p.x < -0.15 || p.x > 1.15 || p.y < -0.15 || p.y > 1.15) {
            this.projectiles.splice(i, 1);
          }
        }
      }
      _updateEffects(dt) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
          this.effects[i].life -= dt;
          if (this.effects[i].life <= 0) {
            this.effects.splice(i, 1);
          }
        }
      }
      _registerHit(isPerfect, target, audio) {
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        const multiplier = Math.min(
          Math.floor(this.combo / COMBO_MILESTONE) + 1,
          MAX_MULTIPLIER
        );
        const baseScore = isPerfect ? PERFECT_SCORE : GOOD_SCORE;
        this.score += baseScore * multiplier;
        if (isPerfect) {
          this.hits.perfect++;
          audio.playHit(1);
          this.health = Math.min(MAX_HEALTH, this.health + PERFECT_HEAL);
        } else {
          this.hits.good++;
          audio.playHit(0.6);
        }
        const milestone = Math.floor(this.combo / COMBO_MILESTONE) * COMBO_MILESTONE;
        if (milestone > 0 && milestone > this._lastComboMilestone) {
          this._lastComboMilestone = milestone;
          audio.playCombo();
          this.effects.push({
            type: "combo_milestone",
            x: 0.5,
            y: 0.5,
            life: COMBO_EFFECT_DURATION,
            maxLife: COMBO_EFFECT_DURATION,
            value: milestone
          });
        }
        this.effects.push({
          type: isPerfect ? "perfect" : "good",
          x: target.x,
          y: target.y,
          life: HIT_EFFECT_DURATION,
          maxLife: HIT_EFFECT_DURATION
        });
      }
      _registerMiss(target, audio) {
        this.hits.miss++;
        this.combo = 0;
        this._lastComboMilestone = 0;
        this.health -= MISS_DAMAGE;
        audio.playMiss();
        this.effects.push({
          type: "miss",
          x: target.x,
          y: target.y,
          life: MISS_EFFECT_DURATION,
          maxLife: MISS_EFFECT_DURATION
        });
      }
    };
  }
});

// src/game/beatmap.ts
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function randomTunnelProjectile(time, progress) {
  const angle = Math.random() * Math.PI * 2;
  let dx = Math.cos(angle);
  let dy = Math.sin(angle);
  const len = Math.sqrt(dx * dx + dy * dy);
  dx /= len;
  dy /= len;
  return {
    time,
    type: "projectile",
    x: 0.5,
    y: 0.5,
    dx,
    dy,
    speed: 0.25 + progress * 0.35
  };
}
function generateBeatmap(bpm = 140, duration = 60) {
  const events = [];
  const beatInterval = 60 / bpm;
  let time = 3;
  let lastX = 0.5;
  let lastY = 0.5;
  let side = 0;
  while (time < duration - 5) {
    const progress = time / duration;
    const interval = progress < 0.2 ? beatInterval * 2 : progress < 0.5 ? beatInterval : progress < 0.8 ? beatInterval * 0.75 : beatInterval * 0.5;
    const maxDist = Math.min(interval * 0.6, 0.4);
    let tx, ty;
    if (Math.random() < 0.3) {
      tx = lastX + (Math.random() - 0.5) * maxDist * 2;
      ty = lastY + (Math.random() - 0.5) * maxDist * 2;
    } else {
      tx = side === 0 ? 0.2 + Math.random() * 0.25 : 0.55 + Math.random() * 0.25;
      ty = 0.2 + Math.random() * 0.6;
      side = 1 - side;
      const ddx = tx - lastX;
      const ddy = ty - lastY;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist > maxDist * 1.5) {
        tx = lastX + ddx / dist * maxDist * 1.2;
        ty = lastY + ddy / dist * maxDist * 1.2;
      }
    }
    tx = clamp(tx, 0.1, 0.9);
    ty = clamp(ty, 0.1, 0.9);
    events.push({ time, type: "target", x: tx, y: ty });
    lastX = tx;
    lastY = ty;
    if (progress > 0.35 && Math.random() < (progress - 0.3) * 0.5) {
      events.push(randomTunnelProjectile(time + beatInterval * 0.5, progress));
    }
    if (progress > 0.7 && Math.random() < 0.3) {
      events.push(randomTunnelProjectile(time + beatInterval * 0.25, progress));
    }
    time += interval;
  }
  events.sort((a, b) => a.time - b.time);
  return { bpm, duration, events };
}
var init_beatmap = __esm({
  "src/game/beatmap.ts"() {
  }
});

// src/browser/audio.ts
var AudioManager;
var init_audio = __esm({
  "src/browser/audio.ts"() {
    AudioManager = class {
      constructor() {
        __publicField(this, "ctx", null);
        __publicField(this, "musicSource", null);
        __publicField(this, "musicGain", null);
        __publicField(this, "musicStartTime", 0);
        __publicField(this, "musicBuffer", null);
        __publicField(this, "musicRawData", null);
        __publicField(this, "_musicMuted", false);
        __publicField(this, "_musicVolume", 0.5);
      }
      async init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        await this.ctx.resume();
        if (this.musicRawData && !this.musicBuffer) {
          this.musicBuffer = await this.ctx.decodeAudioData(this.musicRawData);
          this.musicRawData = null;
        }
      }
      /** Fetch an MP3 file for later playback. Can be called before init(). */
      async loadMusic(url) {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        if (this.ctx) {
          this.musicBuffer = await this.ctx.decodeAudioData(arrayBuf);
        } else {
          this.musicRawData = arrayBuf;
        }
      }
      /** Start playing loaded music. Returns the AudioContext time at which it started. */
      startMusic() {
        if (!this.ctx || !this.musicBuffer) return 0;
        this.stopMusic();
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.5;
        this.musicGain.connect(this.ctx.destination);
        this.musicSource = this.ctx.createBufferSource();
        this.musicSource.buffer = this.musicBuffer;
        this.musicSource.connect(this.musicGain);
        this.musicSource.start();
        this.musicStartTime = this.ctx.currentTime;
        return this.musicStartTime;
      }
      /** Get current music playback time in seconds. */
      getMusicTime() {
        if (!this.ctx || !this.musicStartTime) return 0;
        return this.ctx.currentTime - this.musicStartTime;
      }
      /** Stop music playback. */
      stopMusic() {
        if (this.musicSource) {
          try {
            this.musicSource.stop();
          } catch {
          }
          this.musicSource = null;
        }
        this.musicStartTime = 0;
      }
      /** Toggle music mute state. Returns the new muted state. */
      toggleMusicMute() {
        this._musicMuted = !this._musicMuted;
        if (this.musicGain) {
          this.musicGain.gain.value = this._musicMuted ? 0 : this._musicVolume;
        }
        return this._musicMuted;
      }
      /** Whether music is currently muted. */
      get musicMuted() {
        return this._musicMuted;
      }
      _play(setup) {
        if (!this.ctx) return;
        try {
          setup(this.ctx.currentTime, this.ctx);
        } catch {
        }
      }
      // --- Cyberpunk / deep sound effects ---
      /** Sub-bass thump when target spawns (replaces chirpy 600Hz sine). */
      playTick() {
        this._play((t, ctx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(150, t);
          osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.08);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.09);
          const bufSize = ctx.sampleRate * 0.02;
          const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = noiseBuf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.06, t);
          noiseGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.02);
          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 400;
          noise.connect(lp).connect(noiseGain).connect(ctx.destination);
          noise.start(t);
          noise.stop(t + 0.03);
        });
      }
      /** Deep impact on hit (replaces 660-880Hz). Sub-bass layer + mid punch. */
      playHit(intensity) {
        this._play((t, ctx) => {
          const intens = Math.max(0.1, intensity);
          const freq = 180 + 100 * intens;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(90, t + 0.15);
          gain.gain.setValueAtTime(0.22, t);
          gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.15);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.16);
          const sub = ctx.createOscillator();
          const subGain = ctx.createGain();
          sub.type = "sine";
          sub.frequency.setValueAtTime(55, t);
          subGain.gain.setValueAtTime(0.18 * intens, t);
          subGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.12);
          sub.connect(subGain).connect(ctx.destination);
          sub.start(t);
          sub.stop(t + 0.13);
          const clickOsc = ctx.createOscillator();
          const clickGain = ctx.createGain();
          clickOsc.type = "square";
          clickOsc.frequency.setValueAtTime(freq * 1.5, t);
          clickOsc.frequency.exponentialRampToValueAtTime(80, t + 0.03);
          clickGain.gain.setValueAtTime(0.06, t);
          clickGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.03);
          clickOsc.connect(clickGain).connect(ctx.destination);
          clickOsc.start(t);
          clickOsc.stop(t + 0.04);
        });
      }
      /** Extended low buzz with distortion layer (replaces short 120→40Hz square). */
      playMiss() {
        this._play((t, ctx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(100, t);
          osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.31);
          const dist = ctx.createOscillator();
          const distGain = ctx.createGain();
          dist.type = "sawtooth";
          dist.frequency.setValueAtTime(67, t);
          dist.frequency.exponentialRampToValueAtTime(22, t + 0.25);
          distGain.gain.setValueAtTime(0.05, t);
          distGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.25);
          dist.connect(distGain).connect(ctx.destination);
          dist.start(t);
          dist.stop(t + 0.26);
        });
      }
      /** Metallic crunch + deep rumble (replaces random 80-240Hz sawtooths). */
      playDamage() {
        this._play((t, ctx) => {
          const sub = ctx.createOscillator();
          const subGain = ctx.createGain();
          sub.type = "sine";
          sub.frequency.setValueAtTime(40, t);
          subGain.gain.setValueAtTime(0.2, t);
          subGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.2);
          sub.connect(subGain).connect(ctx.destination);
          sub.start(t);
          sub.stop(t + 0.21);
          for (let i = 0; i < 4; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            const baseFreq = 60 + Math.random() * 60;
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.15);
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(1e-3, t + 0.15);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.16);
          }
          const bufSize = ctx.sampleRate * 0.05;
          const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = noiseBuf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.08, t);
          noiseGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.05);
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 200;
          bp.Q.value = 2;
          noise.connect(bp).connect(noiseGain).connect(ctx.destination);
          noise.start(t);
          noise.stop(t + 0.06);
        });
      }
      /** Dark power chord C2-G2-C3 with sawtooth (replaces cheerful C5-E5-G5 arpeggio). */
      playCombo() {
        this._play((t, ctx) => {
          const notes = [65.4, 98, 130.8];
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, t + i * 0.04);
            gain.gain.setValueAtTime(0.1, t + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(1e-3, t + i * 0.04 + 0.25);
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 500;
            osc.connect(lp).connect(gain).connect(ctx.destination);
            osc.start(t + i * 0.04);
            osc.stop(t + i * 0.04 + 0.26);
          });
          const sub = ctx.createOscillator();
          const subGain = ctx.createGain();
          sub.type = "sine";
          sub.frequency.setValueAtTime(32.7, t);
          subGain.gain.setValueAtTime(0.12, t);
          subGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.3);
          sub.connect(subGain).connect(ctx.destination);
          sub.start(t);
          sub.stop(t + 0.31);
        });
      }
    };
  }
});

// src/browser/input.ts
var PALM_LANDMARKS, InputManager;
var init_input = __esm({
  "src/browser/input.ts"() {
    PALM_LANDMARKS = [0, 5, 9, 13, 17];
    InputManager = class {
      constructor(canvas, video) {
        this.canvas = canvas;
        this.video = video;
        /** Smoothed cursor position in game coordinates [0,1]. */
        __publicField(this, "cursor", { x: 0.5, y: 0.5 });
        __publicField(this, "mode", "none");
        __publicField(this, "detected", false);
        /** Debug information for the hand tracking overlay. */
        __publicField(this, "debugInfo", {
          detected: false,
          confidence: 0,
          landmarks: null,
          cursorRaw: { x: 0.5, y: 0.5 },
          cursorSmoothed: { x: 0.5, y: 0.5 },
          inputMode: "none"
        });
        __publicField(this, "_rawCursor", { x: 0.5, y: 0.5 });
        __publicField(this, "_smoothingSpeed", 16);
        __publicField(this, "_confidence", 0);
        __publicField(this, "_landmarks", null);
      }
      async init() {
        try {
          await this._initHandTracking();
          return "hand";
        } catch (e) {
          console.warn(
            "Hand tracking unavailable, using mouse/touch:",
            e.message
          );
          return this.mode === "none" ? "mouse" : this.mode;
        }
      }
      update(dt) {
        const factor = 1 - Math.exp(-this._smoothingSpeed * dt);
        if (this._landmarks) {
          this.cursor.x += (this._rawCursor.x - this.cursor.x) * factor;
          this.cursor.y += (this._rawCursor.y - this.cursor.y) * factor;
        }
        this.debugInfo = {
          detected: this._landmarks !== null,
          confidence: this._confidence,
          landmarks: this._landmarks,
          cursorRaw: { x: this._rawCursor.x, y: this._rawCursor.y },
          cursorSmoothed: { x: this.cursor.x, y: this.cursor.y },
          inputMode: this.mode
        };
      }
      async _initHandTracking() {
        const W = window;
        if (!W.Hands || !W.Camera) {
          throw new Error("MediaPipe not loaded");
        }
        const hands = new W.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6
        });
        hands.onResults((results) => {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this._landmarks = landmarks;
            this._confidence = results.multiHandedness?.[0]?.score ?? 0;
            let sumX = 0, sumY = 0;
            for (const idx of PALM_LANDMARKS) {
              sumX += landmarks[idx].x;
              sumY += landmarks[idx].y;
            }
            const avgX = sumX / PALM_LANDMARKS.length;
            const avgY = sumY / PALM_LANDMARKS.length;
            this._rawCursor.x = this._mapRange(1 - avgX, 0.15, 0.85, 0, 1);
            this._rawCursor.y = this._mapRange(avgY, 0.15, 0.85, 0, 1);
            this.mode = "hand";
            this.detected = true;
          } else {
            this._landmarks = null;
            this._confidence = 0;
          }
        });
        const camera = new W.Camera(this.video, {
          onFrame: async () => {
            await hands.send({ image: this.video });
          },
          width: 1280,
          height: 720
        });
        await camera.start();
        this.mode = "hand";
      }
      _mapRange(value, inMin, inMax, outMin, outMax) {
        const mapped = outMin + (value - inMin) / (inMax - inMin) * (outMax - outMin);
        return Math.max(outMin, Math.min(outMax, mapped));
      }
    };
  }
});

// src/browser/renderer.ts
function hsl(h, s, l) {
  h = (h % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs(hp % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hp < 1) {
    r = c;
    g = x;
  } else if (hp < 2) {
    r = x;
    g = c;
  } else if (hp < 3) {
    g = c;
    b = x;
  } else if (hp < 4) {
    g = x;
    b = c;
  } else if (hp < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [r + m, g + m, b + m];
}
function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error("Shader compile error: " + info);
  }
  return s;
}
function linkProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error("Program link error: " + info);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}
function createFBO(gl, w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return { fb, tex, w, h };
}
function resizeFBO(gl, fbo, w, h) {
  fbo.w = w;
  fbo.h = h;
  gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
}
var FAR_Z, RING_COUNT, STREAK_COUNT, TUNNEL_RADIUS, SIDES, MAX_LINES, MAX_CIRCLES, RING_SEGMENTS, PARALLAX_STRENGTH, PALM_INDICES, HAND_SKELETON, COL, FLAT_VS, FLAT_FS, CIRCLE_VS, CIRCLE_FS, SCREEN_VS, BG_FS, GLOW_FS, EXTRACT_FS, BLUR_FS, FINAL_FS, Renderer;
var init_renderer = __esm({
  "src/browser/renderer.ts"() {
    init_constants();
    FAR_Z = 5;
    RING_COUNT = 28;
    STREAK_COUNT = 80;
    TUNNEL_RADIUS = 0.85;
    SIDES = 4;
    MAX_LINES = 5e3;
    MAX_CIRCLES = 600;
    RING_SEGMENTS = 24;
    PARALLAX_STRENGTH = 0.25;
    PALM_INDICES = [0, 5, 9, 13, 17];
    HAND_SKELETON = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      // thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      // index
      [5, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      // middle
      [9, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      // ring
      [13, 17],
      [17, 18],
      [18, 19],
      [19, 20],
      // pinky
      [0, 17]
      // palm edge
    ];
    COL = {
      cursor: [0, 1, 1],
      // #0ff cyan
      target: [1, 0, 1],
      // #f0f magenta
      projectile: [1, 0.267, 0.267],
      // #f44
      perfect: [1, 1, 0],
      // #ff0
      good: [0, 1, 0],
      // #0f0
      miss: [1, 0.267, 0.267],
      // #f44
      white: [1, 1, 1]
    };
    FLAT_VS = `#version 300 es
in vec2 a_pos;
in vec4 a_color;
uniform vec2 u_res;
uniform vec2 u_shake;
out vec4 v_color;
void main() {
  vec2 p = (a_pos + u_shake) / u_res * 2.0 - 1.0;
  p.y = -p.y;
  gl_Position = vec4(p, 0.0, 1.0);
  v_color = a_color;
}`;
    FLAT_FS = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 fragColor;
void main() {
  fragColor = v_color;
}`;
    CIRCLE_VS = `#version 300 es
in vec2 a_center;
in vec2 a_offset;
in float a_radius;
in vec4 a_color;
uniform vec2 u_res;
uniform vec2 u_shake;
out vec2 v_uv;
out vec4 v_color;
void main() {
  vec2 pos = a_center + a_offset * a_radius + u_shake;
  vec2 ndc = pos / u_res * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_uv = a_offset;
  v_color = a_color;
}`;
    CIRCLE_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
in vec4 v_color;
out vec4 fragColor;
void main() {
  float dist = length(v_uv);
  float alpha = 1.0 - smoothstep(0.85, 1.0, dist);
  fragColor = vec4(v_color.rgb, v_color.a * alpha);
}`;
    SCREEN_VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_uv = a_pos * 0.5 + 0.5;
}`;
    BG_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform vec3 u_cCenter;
uniform vec3 u_cEdge;
uniform float u_aspect;
out vec4 fragColor;
void main() {
  vec2 p = (v_uv - 0.5) * vec2(u_aspect, 1.0);
  float d = length(p) * 1.25;
  vec3 c = mix(u_cCenter, u_cEdge, clamp(d, 0.0, 1.0));
  fragColor = vec4(c, 1.0);
}`;
    GLOW_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform vec3 u_color;
uniform float u_alpha;
uniform float u_radius;
uniform float u_aspect;
out vec4 fragColor;
void main() {
  vec2 p = (v_uv - 0.5) * vec2(u_aspect, 1.0);
  float d = length(p) / u_radius;
  float a = max(0.0, 1.0 - d) * u_alpha;
  fragColor = vec4(u_color * a, a);
}`;
    EXTRACT_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_threshold;
out vec4 fragColor;
void main() {
  vec4 c = texture(u_tex, v_uv);
  float br = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  float contrib = max(br - u_threshold, 0.0);
  fragColor = vec4(c.rgb * (contrib / max(br, 0.001)), 1.0);
}`;
    BLUR_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_dir;
out vec4 fragColor;
void main() {
  float w[5] = float[](0.227027, 0.194596, 0.121621, 0.054054, 0.016216);
  vec4 sum = texture(u_tex, v_uv) * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = u_dir * float(i) * 1.5;
    sum += texture(u_tex, v_uv + off) * w[i];
    sum += texture(u_tex, v_uv - off) * w[i];
  }
  fragColor = sum;
}`;
    FINAL_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_bloomStr;
uniform float u_scanStr;
uniform float u_vigStr;
out vec4 fragColor;
void main() {
  vec3 scene = texture(u_scene, v_uv).rgb;
  vec3 bloom = texture(u_bloom, v_uv).rgb;
  vec3 color = scene + bloom * u_bloomStr;
  float scan = pow(sin(gl_FragCoord.y * 3.14159265 / 3.0), 2.0);
  color *= 1.0 - u_scanStr * scan;
  vec2 q = v_uv * 2.0 - 1.0;
  float vig = 1.0 - dot(q, q) * u_vigStr;
  color *= max(vig, 0.0);
  color *= 1.2;
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 1.6));
  fragColor = vec4(color, 1.0);
}`;
    Renderer = class {
      constructor(glCanvas, hudCanvas, video) {
        this.glCanvas = glCanvas;
        this.hudCanvas = hudCanvas;
        __publicField(this, "gl");
        __publicField(this, "hud");
        __publicField(this, "w", 0);
        // CSS pixels
        __publicField(this, "h", 0);
        __publicField(this, "dpr", 1);
        // --- Shader programs ---
        __publicField(this, "flatProg");
        __publicField(this, "flatLocs");
        __publicField(this, "circleProg");
        __publicField(this, "circleLocs");
        __publicField(this, "bgProg");
        __publicField(this, "glowProg");
        __publicField(this, "extractProg");
        __publicField(this, "blurProg");
        __publicField(this, "finalProg");
        // --- Geometry buffers ---
        __publicField(this, "lineVAO");
        __publicField(this, "lineVBO");
        __publicField(this, "lineData");
        __publicField(this, "lineCount", 0);
        __publicField(this, "circleVAO");
        __publicField(this, "circleVBO");
        __publicField(this, "circleData");
        __publicField(this, "circleCount", 0);
        __publicField(this, "quadVAO");
        // --- Framebuffers ---
        __publicField(this, "sceneFBO");
        __publicField(this, "bloomFBO");
        // --- Tunnel state ---
        __publicField(this, "rings", []);
        __publicField(this, "streaks", []);
        __publicField(this, "tunnelSpeed", 0);
        __publicField(this, "lastRenderTime", 0);
        __publicField(this, "shakeX", 0);
        __publicField(this, "shakeY", 0);
        __publicField(this, "shakeDecay", 0);
        __publicField(this, "energyIdx", 0);
        // Parallax camera offset — smoothly follows cursor for 3D effect
        __publicField(this, "camOffX", 0);
        __publicField(this, "camOffY", 0);
        // Debug overlay state
        __publicField(this, "_debugVisible", false);
        __publicField(this, "_debugInfo", null);
        __publicField(this, "_video");
        __publicField(this, "muteButtonRect", { x: 0, y: 0, w: 0, h: 0 });
        this._video = video;
        const gl = glCanvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false });
        if (!gl) throw new Error("WebGL 2 not supported");
        this.gl = gl;
        const ext = gl.getExtension("EXT_color_buffer_half_float");
        if (!ext) {
          gl.getExtension("EXT_color_buffer_float");
        }
        const hud = hudCanvas.getContext("2d");
        if (!hud) throw new Error("Cannot get 2d context for HUD");
        this.hud = hud;
        this.flatProg = linkProgram(gl, FLAT_VS, FLAT_FS);
        this.flatLocs = {
          aPos: gl.getAttribLocation(this.flatProg, "a_pos"),
          aColor: gl.getAttribLocation(this.flatProg, "a_color"),
          uRes: gl.getUniformLocation(this.flatProg, "u_res"),
          uShake: gl.getUniformLocation(this.flatProg, "u_shake")
        };
        this.circleProg = linkProgram(gl, CIRCLE_VS, CIRCLE_FS);
        this.circleLocs = {
          aCenter: gl.getAttribLocation(this.circleProg, "a_center"),
          aOffset: gl.getAttribLocation(this.circleProg, "a_offset"),
          aRadius: gl.getAttribLocation(this.circleProg, "a_radius"),
          aColor: gl.getAttribLocation(this.circleProg, "a_color"),
          uRes: gl.getUniformLocation(this.circleProg, "u_res"),
          uShake: gl.getUniformLocation(this.circleProg, "u_shake")
        };
        this.bgProg = linkProgram(gl, SCREEN_VS, BG_FS);
        this.glowProg = linkProgram(gl, SCREEN_VS, GLOW_FS);
        this.extractProg = linkProgram(gl, SCREEN_VS, EXTRACT_FS);
        this.blurProg = linkProgram(gl, SCREEN_VS, BLUR_FS);
        this.finalProg = linkProgram(gl, SCREEN_VS, FINAL_FS);
        this.lineData = new Float32Array(MAX_LINES * 2 * 6);
        this.lineVBO = gl.createBuffer();
        this.lineVAO = gl.createVertexArray();
        gl.bindVertexArray(this.lineVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.lineData.byteLength, gl.DYNAMIC_DRAW);
        const Lstride = 6 * 4;
        gl.enableVertexAttribArray(this.flatLocs.aPos);
        gl.vertexAttribPointer(this.flatLocs.aPos, 2, gl.FLOAT, false, Lstride, 0);
        gl.enableVertexAttribArray(this.flatLocs.aColor);
        gl.vertexAttribPointer(this.flatLocs.aColor, 4, gl.FLOAT, false, Lstride, 8);
        gl.bindVertexArray(null);
        this.circleData = new Float32Array(MAX_CIRCLES * 6 * 9);
        this.circleVBO = gl.createBuffer();
        this.circleVAO = gl.createVertexArray();
        gl.bindVertexArray(this.circleVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.circleVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.circleData.byteLength, gl.DYNAMIC_DRAW);
        const CSTRIDE = 9 * 4;
        gl.enableVertexAttribArray(this.circleLocs.aCenter);
        gl.vertexAttribPointer(this.circleLocs.aCenter, 2, gl.FLOAT, false, CSTRIDE, 0);
        gl.enableVertexAttribArray(this.circleLocs.aOffset);
        gl.vertexAttribPointer(this.circleLocs.aOffset, 2, gl.FLOAT, false, CSTRIDE, 8);
        gl.enableVertexAttribArray(this.circleLocs.aRadius);
        gl.vertexAttribPointer(this.circleLocs.aRadius, 1, gl.FLOAT, false, CSTRIDE, 16);
        gl.enableVertexAttribArray(this.circleLocs.aColor);
        gl.vertexAttribPointer(this.circleLocs.aColor, 4, gl.FLOAT, false, CSTRIDE, 20);
        gl.bindVertexArray(null);
        this.quadVAO = gl.createVertexArray();
        const quadVBO = gl.createBuffer();
        gl.bindVertexArray(this.quadVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        this.sceneFBO = createFBO(gl, 2, 2);
        this.bloomFBO = [createFBO(gl, 2, 2), createFBO(gl, 2, 2)];
        this.resize();
        window.addEventListener("resize", () => this.resize());
        this.initTunnel();
      }
      // =========================================================================
      // Resize
      // =========================================================================
      resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        const pw = this.w * this.dpr;
        const ph = this.h * this.dpr;
        this.glCanvas.width = pw;
        this.glCanvas.height = ph;
        this.gl.viewport(0, 0, pw, ph);
        this.hudCanvas.width = pw;
        this.hudCanvas.height = ph;
        this.hud.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        resizeFBO(this.gl, this.sceneFBO, pw, ph);
        const bw = Math.max(1, Math.floor(pw / 2));
        const bh = Math.max(1, Math.floor(ph / 2));
        resizeFBO(this.gl, this.bloomFBO[0], bw, bh);
        resizeFBO(this.gl, this.bloomFBO[1], bw, bh);
      }
      // =========================================================================
      // Coordinate helpers
      // =========================================================================
      px(nx) {
        return nx * this.w;
      }
      py(ny) {
        return ny * this.h;
      }
      ps(ns) {
        return ns * Math.min(this.w, this.h);
      }
      perspScale(z) {
        return 1 / (1 + z * FAR_Z);
      }
      // =========================================================================
      // Batch: Lines
      // =========================================================================
      addLine(x1, y1, x2, y2, r, g, b, a) {
        if (this.lineCount >= MAX_LINES) return;
        const i = this.lineCount * 12;
        this.lineData[i] = x1;
        this.lineData[i + 1] = y1;
        this.lineData[i + 2] = r;
        this.lineData[i + 3] = g;
        this.lineData[i + 4] = b;
        this.lineData[i + 5] = a;
        this.lineData[i + 6] = x2;
        this.lineData[i + 7] = y2;
        this.lineData[i + 8] = r;
        this.lineData[i + 9] = g;
        this.lineData[i + 10] = b;
        this.lineData[i + 11] = a;
        this.lineCount++;
      }
      /** Add a ring outline (polygon) as line segments. */
      addRing(cx, cy, radius, r, g, b, a, sides = RING_SEGMENTS) {
        for (let i = 0; i < sides; i++) {
          const a1 = i / sides * Math.PI * 2;
          const a2 = (i + 1) / sides * Math.PI * 2;
          this.addLine(
            cx + Math.cos(a1) * radius,
            cy + Math.sin(a1) * radius,
            cx + Math.cos(a2) * radius,
            cy + Math.sin(a2) * radius,
            r,
            g,
            b,
            a
          );
        }
      }
      flushLines() {
        if (this.lineCount === 0) return;
        const gl = this.gl;
        gl.useProgram(this.flatProg);
        gl.uniform2f(this.flatLocs.uRes, this.w, this.h);
        gl.uniform2f(this.flatLocs.uShake, this.shakeX, this.shakeY);
        gl.bindVertexArray(this.lineVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVBO);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lineData.subarray(0, this.lineCount * 12));
        gl.drawArrays(gl.LINES, 0, this.lineCount * 2);
        gl.bindVertexArray(null);
        this.lineCount = 0;
      }
      // =========================================================================
      // Batch: Circles (filled, with SDF antialiased edge)
      // =========================================================================
      addCircle(cx, cy, radius, r, g, b, a) {
        if (this.circleCount >= MAX_CIRCLES) return;
        const offsets = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
        const base = this.circleCount * 54;
        for (let v = 0; v < 6; v++) {
          const o = base + v * 9;
          this.circleData[o] = cx;
          this.circleData[o + 1] = cy;
          this.circleData[o + 2] = offsets[v][0];
          this.circleData[o + 3] = offsets[v][1];
          this.circleData[o + 4] = radius;
          this.circleData[o + 5] = r;
          this.circleData[o + 6] = g;
          this.circleData[o + 7] = b;
          this.circleData[o + 8] = a;
        }
        this.circleCount++;
      }
      flushCircles() {
        if (this.circleCount === 0) return;
        const gl = this.gl;
        gl.useProgram(this.circleProg);
        gl.uniform2f(this.circleLocs.uRes, this.w, this.h);
        gl.uniform2f(this.circleLocs.uShake, this.shakeX, this.shakeY);
        gl.bindVertexArray(this.circleVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.circleVBO);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.circleData.subarray(0, this.circleCount * 54));
        gl.drawArrays(gl.TRIANGLES, 0, this.circleCount * 6);
        gl.bindVertexArray(null);
        this.circleCount = 0;
      }
      // =========================================================================
      // Fullscreen quad draw
      // =========================================================================
      drawQuad(prog) {
        const gl = this.gl;
        gl.useProgram(prog);
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
      }
      // =========================================================================
      // Tunnel init & animation
      // =========================================================================
      initTunnel() {
        this.rings = [];
        for (let i = 0; i < RING_COUNT; i++) {
          this.rings.push(i / RING_COUNT);
        }
        this.streaks = [];
        for (let i = 0; i < STREAK_COUNT; i++) {
          this.streaks.push({
            angle: Math.random() * Math.PI * 2,
            radius: TUNNEL_RADIUS * (0.5 + Math.random() * 0.5),
            z: Math.random(),
            speed: 0.4 + Math.random() * 0.6,
            brightness: 0.4 + Math.random() * 0.6
          });
        }
      }
      updateTunnel(dt, energy, cursor) {
        const targetSpeed = 0.2 + energy * 0.8;
        this.tunnelSpeed += (targetSpeed - this.tunnelSpeed) * Math.min(dt * 3, 1);
        const spd = this.tunnelSpeed;
        for (let i = 0; i < this.rings.length; i++) {
          this.rings[i] -= spd * dt;
          if (this.rings[i] < 0) this.rings[i] += 1;
        }
        for (const s of this.streaks) {
          s.z -= s.speed * spd * dt;
          if (s.z < 0.02) {
            s.z = 0.8 + Math.random() * 0.2;
            s.angle = Math.random() * Math.PI * 2;
            s.brightness = 0.4 + Math.random() * 0.6;
          }
        }
        const targetCamX = (cursor.x - 0.5) * PARALLAX_STRENGTH;
        const targetCamY = (cursor.y - 0.5) * PARALLAX_STRENGTH;
        const camSmooth = 1 - Math.exp(-6 * dt);
        this.camOffX += (targetCamX - this.camOffX) * camSmooth;
        this.camOffY += (targetCamY - this.camOffY) * camSmooth;
      }
      updateShake(dt, game) {
        for (const effect of game.effects) {
          if (effect.type === "damage" && effect.life > effect.maxLife - 0.05) {
            const intensity = this.ps(0.02);
            this.shakeX = (Math.random() - 0.5) * intensity * 2;
            this.shakeY = (Math.random() - 0.5) * intensity * 2;
            this.shakeDecay = 0.3;
          }
        }
        if (this.shakeDecay > 0) {
          this.shakeDecay -= dt;
          const decay = Math.max(0, this.shakeDecay / 0.3);
          this.shakeX *= decay;
          this.shakeY *= decay;
          if (this.shakeDecay <= 0) {
            this.shakeX = 0;
            this.shakeY = 0;
          }
        }
      }
      // =========================================================================
      // Energy lookup
      // =========================================================================
      getEnergy(game) {
        const tl = game.beatmap.energyTimeline;
        if (!tl || tl.length === 0) {
          const p = game.time / game.beatmap.duration;
          return 0.2 + p * 0.6;
        }
        const t = game.time;
        if (t < (tl[this.energyIdx]?.time ?? 0)) this.energyIdx = 0;
        while (this.energyIdx < tl.length - 1 && tl[this.energyIdx + 1].time <= t) {
          this.energyIdx++;
        }
        if (this.energyIdx >= tl.length - 1) return tl[tl.length - 1].energy;
        const a = tl[this.energyIdx], b = tl[this.energyIdx + 1];
        const f = (t - a.time) / (b.time - a.time);
        return a.energy + (b.energy - a.energy) * f;
      }
      // =========================================================================
      // Main render
      // =========================================================================
      render(game, cursor, musicMuted = false, debugInfo = null) {
        const gl = this.gl;
        const now = performance.now() / 1e3;
        const dt = this.lastRenderTime ? Math.min(now - this.lastRenderTime, 0.1) : 1 / 60;
        this.lastRenderTime = now;
        this._debugInfo = debugInfo;
        let energy = 0.15, hue = 220;
        let drawTargets = false, drawProjectilesFlag = false, drawCursorFlag = false;
        let drawEffectsFlag = false, drawHUDFlag = false;
        if (game.phase === "menu") {
          energy = 0.15;
          hue = 220;
        } else if (game.phase === "countdown") {
          energy = 0.3;
          hue = 230;
          drawCursorFlag = true;
        } else if (game.phase === "results") {
          energy = 0.1;
          hue = 260;
        } else if (game.phase === "gameover") {
          energy = 0.05;
          hue = 0;
        } else {
          energy = this.getEnergy(game);
          const progress = game.time / game.beatmap.duration;
          hue = 220 + energy * 40 + progress * 20;
          drawTargets = true;
          drawProjectilesFlag = true;
          drawCursorFlag = true;
          drawEffectsFlag = true;
          drawHUDFlag = true;
        }
        this.updateTunnel(dt, energy, cursor);
        if (game.phase === "playing") this.updateShake(dt, game);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFBO.fb);
        gl.viewport(0, 0, this.sceneFBO.w, this.sceneFBO.h);
        gl.clearColor(0.024, 0.024, 0.047, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.drawBackground(energy, hue);
        this.drawVanishingGlow(energy, hue);
        this.drawTunnelMesh(energy, hue);
        if (drawTargets) this.drawTargetsGL(game);
        if (drawProjectilesFlag) this.drawProjectilesGL(game);
        if (drawCursorFlag) this.drawCursorGL(cursor);
        if (drawEffectsFlag) this.drawEffectsGL(game);
        this.flushLines();
        this.flushCircles();
        if (energy > 0.55) {
          const bloom = (energy - 0.55) * 2.2;
          const [cr, cg, cb] = hsl(hue, 0.8, 0.4);
          this.drawOverlayRect(cr, cg, cb, bloom * 0.06);
        }
        if (game.phase === "menu") {
          this.drawOverlayRect(0.024, 0.024, 0.047, 0.5);
        } else if (game.phase === "results") {
          this.drawOverlayRect(0.024, 0.024, 0.047, 0.7);
        } else if (game.phase === "gameover") {
          this.drawGameOverVignette();
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.applyBloom();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        gl.useProgram(this.finalProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
        gl.uniform1i(gl.getUniformLocation(this.finalProg, "u_scene"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomFBO[0].tex);
        gl.uniform1i(gl.getUniformLocation(this.finalProg, "u_bloom"), 1);
        gl.uniform1f(gl.getUniformLocation(this.finalProg, "u_bloomStr"), 0.6 + energy * 0.8);
        gl.uniform1f(gl.getUniformLocation(this.finalProg, "u_scanStr"), 0.07);
        gl.uniform1f(gl.getUniformLocation(this.finalProg, "u_vigStr"), 0.25);
        this.drawQuad(this.finalProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.hud.clearRect(0, 0, this.w, this.h);
        if (game.phase === "menu") {
          this.drawMenuHUD();
        } else if (game.phase === "countdown") {
          this.drawCountdownHUD(game);
        } else if (game.phase === "results") {
          this.drawResultsHUD(game);
        } else if (game.phase === "gameover") {
          this.drawGameOverHUD(game);
        }
        if (drawHUDFlag) {
          this.drawPlayingHUD(game, musicMuted, energy);
        }
        if (this._debugVisible) {
          this.drawDebugOverlay();
        }
      }
      // =========================================================================
      // Scene: Background
      // =========================================================================
      drawBackground(energy, hue) {
        const gl = this.gl;
        const [cr, cg, cb] = hsl(hue, 0.4, 0.09 + energy * 0.06);
        const [er, eg, eb] = hsl(hue + 30, 0.25, 0.03 + energy * 0.03);
        gl.useProgram(this.bgProg);
        gl.uniform3f(gl.getUniformLocation(this.bgProg, "u_cCenter"), cr, cg, cb);
        gl.uniform3f(gl.getUniformLocation(this.bgProg, "u_cEdge"), er, eg, eb);
        gl.uniform1f(gl.getUniformLocation(this.bgProg, "u_aspect"), this.w / this.h);
        this.drawQuad(this.bgProg);
      }
      drawVanishingGlow(energy, hue) {
        const gl = this.gl;
        const [r, g, b] = hsl(hue, 0.6, 0.4 + energy * 0.3);
        const minDim = Math.min(this.w, this.h);
        const vpR = minDim * (0.08 + energy * 0.12);
        const normRadius = vpR / minDim;
        gl.useProgram(this.glowProg);
        gl.uniform3f(gl.getUniformLocation(this.glowProg, "u_color"), r, g, b);
        gl.uniform1f(gl.getUniformLocation(this.glowProg, "u_alpha"), 0.3 + energy * 0.4);
        gl.uniform1f(gl.getUniformLocation(this.glowProg, "u_radius"), normRadius);
        gl.uniform1f(gl.getUniformLocation(this.glowProg, "u_aspect"), this.w / this.h);
        this.drawQuad(this.glowProg);
      }
      // =========================================================================
      // Scene: Overlay rectangles
      // =========================================================================
      drawOverlayRect(r, g, b, a) {
        this.flushLines();
        this.flushCircles();
        const gl = this.gl;
        gl.useProgram(this.flatProg);
        gl.uniform2f(this.flatLocs.uRes, this.w, this.h);
        gl.uniform2f(this.flatLocs.uShake, 0, 0);
        const w = this.w, h = this.h;
        const d = this.lineData;
        let o = 0;
        d[o++] = 0;
        d[o++] = 0;
        d[o++] = r;
        d[o++] = g;
        d[o++] = b;
        d[o++] = a;
        d[o++] = w;
        d[o++] = 0;
        d[o++] = r;
        d[o++] = g;
        d[o++] = b;
        d[o++] = a;
        d[o++] = 0;
        d[o++] = h;
        d[o++] = r;
        d[o++] = g;
        d[o++] = b;
        d[o++] = a;
        d[o++] = w;
        d[o++] = 0;
        d[o++] = r;
        d[o++] = g;
        d[o++] = b;
        d[o++] = a;
        d[o++] = w;
        d[o++] = h;
        d[o++] = r;
        d[o++] = g;
        d[o++] = b;
        d[o++] = a;
        d[o++] = 0;
        d[o++] = h;
        d[o++] = r;
        d[o++] = g;
        d[o++] = b;
        d[o++] = a;
        gl.bindVertexArray(this.lineVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVBO);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, d.subarray(0, 36));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
      }
      drawGameOverVignette() {
        const gl = this.gl;
        gl.useProgram(this.glowProg);
        this.drawOverlayRect(0.16, 0, 0, 0.85);
        gl.useProgram(this.glowProg);
        gl.uniform3f(gl.getUniformLocation(this.glowProg, "u_color"), 0, 0, 0);
        gl.uniform1f(gl.getUniformLocation(this.glowProg, "u_alpha"), 0.5);
        gl.uniform1f(gl.getUniformLocation(this.glowProg, "u_radius"), 0.5);
        gl.uniform1f(gl.getUniformLocation(this.glowProg, "u_aspect"), this.w / this.h);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
        this.drawQuad(this.glowProg);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      // =========================================================================
      // Scene: Tunnel mesh
      // =========================================================================
      /** Project a 3D tunnel point to 2D screen coords with parallax camera offset. */
      tunnelProject(x3d, y3d, z) {
        const scale = this.perspScale(z);
        const vpX = this.w / 2 + this.camOffX * this.w * (1 - scale);
        const vpY = this.h / 2 + this.camOffY * this.h * (1 - scale);
        return [
          vpX + x3d * scale * Math.min(this.w, this.h),
          vpY + y3d * scale * Math.min(this.w, this.h)
        ];
      }
      drawTunnelMesh(energy, hue) {
        const minDim = Math.min(this.w, this.h);
        const sortedZ = [...this.rings].sort((a, b) => a - b);
        const halfW = TUNNEL_RADIUS * 0.7;
        const halfH = TUNNEL_RADIUS * 0.5;
        const corners = [
          [-halfW, -halfH],
          [halfW, -halfH],
          [halfW, halfH],
          [-halfW, halfH]
        ];
        for (const z of this.rings) {
          const scale = this.perspScale(z);
          const screenR = minDim * TUNNEL_RADIUS * scale;
          if (screenR < 2) continue;
          const proximity = Math.max(0, 1 - z);
          const alpha = Math.min(scale * 2, 1) * (0.15 + energy * 0.45) * (0.3 + proximity * 0.7);
          const lightness = 0.35 + energy * 0.35 + proximity * 0.1;
          const sat = 0.5 + energy * 0.3;
          const [rr, rg, rb] = hsl(hue + z * 30, sat, lightness);
          const rotOffset = z * Math.PI * 0.08;
          const cosR = Math.cos(rotOffset);
          const sinR = Math.sin(rotOffset);
          const projected = [];
          for (const [cx, cy] of corners) {
            const rx = cx * cosR - cy * sinR;
            const ry = cx * sinR + cy * cosR;
            projected.push(this.tunnelProject(rx, ry, z));
          }
          for (let i = 0; i < SIDES; i++) {
            const [x1, y1] = projected[i];
            const [x2, y2] = projected[(i + 1) % SIDES];
            this.addLine(x1, y1, x2, y2, rr, rg, rb, alpha);
          }
          if (proximity > 0.6) {
            const dotAlpha = alpha * 1.5 * (proximity - 0.6) / 0.4;
            for (const [px, py] of projected) {
              this.addLine(px - 1, py, px + 1, py, 1, 1, 1, dotAlpha);
            }
          }
        }
        const [lr, lg, lb] = hsl(hue + 15, 0.4, 0.3 + energy * 0.3);
        const maxGap = 1.8 / RING_COUNT;
        for (let j = 0; j < sortedZ.length - 1; j++) {
          const z1 = sortedZ[j];
          const z2 = sortedZ[j + 1];
          if (z2 - z1 > maxGap) continue;
          const s1 = this.perspScale(z1);
          const s2 = this.perspScale(z2);
          if (minDim * TUNNEL_RADIUS * s1 < 2 || minDim * TUNNEL_RADIUS * s2 < 2) continue;
          const prox = Math.max(0, 1 - Math.min(z1, z2));
          const alpha = Math.min(Math.min(s1, s2) * 2, 1) * (0.08 + energy * 0.25) * (0.3 + prox * 0.7);
          const rot1 = z1 * Math.PI * 0.08;
          const rot2 = z2 * Math.PI * 0.08;
          const cos1 = Math.cos(rot1), sin1 = Math.sin(rot1);
          const cos2 = Math.cos(rot2), sin2 = Math.sin(rot2);
          for (let i = 0; i < SIDES; i++) {
            const [cx1, cy1] = corners[i];
            const rx1 = cx1 * cos1 - cy1 * sin1;
            const ry1 = cx1 * sin1 + cy1 * cos1;
            const [px1, py1] = this.tunnelProject(rx1, ry1, z1);
            const [cx2, cy2] = corners[i];
            const rx2 = cx2 * cos2 - cy2 * sin2;
            const ry2 = cx2 * sin2 + cy2 * cos2;
            const [px2, py2] = this.tunnelProject(rx2, ry2, z2);
            this.addLine(px1, py1, px2, py2, lr, lg, lb, alpha);
          }
        }
        const vpX = this.w / 2 + this.camOffX * this.w;
        const vpY = this.h / 2 + this.camOffY * this.h;
        const [glR, glG, glB] = hsl(hue, 0.4, 0.25);
        const glA = 0.05 + energy * 0.08;
        const edgeTargets = [
          [0, 0],
          [this.w, 0],
          [this.w, this.h],
          [0, this.h]
        ];
        for (const [ex, ey] of edgeTargets) {
          this.addLine(vpX, vpY, ex, ey, glR, glG, glB, glA);
        }
        for (const s of this.streaks) {
          const [sx, sy] = this.tunnelProject(
            Math.cos(s.angle) * s.radius,
            Math.sin(s.angle) * s.radius,
            s.z
          );
          const trailZ = s.z + 0.05;
          const [tx, ty] = this.tunnelProject(
            Math.cos(s.angle) * s.radius,
            Math.sin(s.angle) * s.radius,
            trailZ
          );
          const scale = this.perspScale(s.z);
          const alpha = s.brightness * scale * (0.25 + energy * 0.75);
          if (alpha < 0.01) continue;
          const [sr, sg, sb] = hsl(hue - 10, 0.5, 0.85);
          this.addLine(tx, ty, sx, sy, sr, sg, sb, alpha);
        }
        this.flushLines();
      }
      // =========================================================================
      // Scene: Targets
      // =========================================================================
      drawTargetsGL(game) {
        const cx = this.w / 2;
        const cy = this.h / 2;
        for (const target of game.targets) {
          const timeDiff = game.time - target.time;
          const approachProgress = 1 - (target.time - game.time) / APPROACH_TIME;
          if (approachProgress < 0) continue;
          const actualX = this.px(target.x);
          const actualY = this.py(target.y);
          const baseR = this.ps(HIT_RADIUS * 0.5);
          if (target.hit) {
            const hitP = Math.max(0, timeDiff) / 0.3;
            if (hitP > 1) continue;
            const r = baseR * (1 + hitP * 2);
            const alpha = 1 - hitP;
            this.addRing(actualX, actualY, r, 1, 1, 1, alpha, 16);
            continue;
          }
          if (target.missed) {
            const missP = Math.max(0, timeDiff - 0.25) / 0.5;
            if (missP > 1) continue;
            const alpha = Math.max(0, 1 - missP) * 0.3;
            this.addCircle(actualX, actualY, baseR, ...COL.miss, alpha);
            continue;
          }
          const clamped = Math.min(approachProgress, 1);
          const z = 1 - clamped;
          const scale = this.perspScale(z);
          const displayX = cx + (actualX - cx) * scale;
          const displayY = cy + (actualY - cy) * scale;
          const displayR = Math.max(2, baseR * scale);
          const landingAlpha = clamped * clamped * 0.6;
          this.addRing(actualX, actualY, baseR * 1.2, ...COL.target, landingAlpha, 16);
          const crossLen = baseR * 0.5;
          this.addLine(actualX - crossLen, actualY, actualX + crossLen, actualY, ...COL.target, landingAlpha);
          this.addLine(actualX, actualY - crossLen, actualX, actualY + crossLen, ...COL.target, landingAlpha);
          if (clamped < 0.9) {
            const connAlpha = (1 - clamped) * 0.12;
            this.addLine(displayX, displayY, actualX, actualY, ...COL.target, connAlpha);
          }
          const pulse = 1 + Math.sin(game.time * 8) * 0.1;
          const orbAlpha = Math.min(clamped * 1.5, 0.9);
          this.addCircle(displayX, displayY, displayR * 2.5 * pulse, ...COL.target, orbAlpha * 0.2);
          this.addCircle(displayX, displayY, displayR * pulse, ...COL.target, orbAlpha);
          this.addCircle(displayX, displayY, displayR * 0.35, 1, 1, 1, Math.min(clamped * 2, 1));
        }
      }
      // =========================================================================
      // Scene: Projectiles
      // =========================================================================
      drawProjectilesGL(game) {
        for (const p of game.projectiles) {
          const pcx = this.px(p.x);
          const pcy = this.py(p.y);
          const r = this.ps(0.014);
          this.addCircle(pcx, pcy, r * 4, ...COL.projectile, 0.12);
          this.addCircle(pcx, pcy, r * 2.2, ...COL.projectile, 0.3);
          this.addCircle(pcx, pcy, r, 1, 1, 1, 1);
          this.addLine(pcx, pcy, pcx - p.dx * r * 6, pcy - p.dy * r * 6, ...COL.projectile, 0.6);
          this.addLine(
            pcx - p.dx * r * 6,
            pcy - p.dy * r * 6,
            pcx - p.dx * r * 10,
            pcy - p.dy * r * 10,
            ...COL.projectile,
            0.25
          );
        }
      }
      // =========================================================================
      // Scene: Cursor
      // =========================================================================
      /** Draw cursor with layered glow. */
      drawCursorGL(cursor) {
        const cursorX = this.px(cursor.x);
        const cursorY = this.py(cursor.y);
        const r = this.ps(CURSOR_RADIUS);
        this.addCircle(cursorX, cursorY, r * 4, ...COL.cursor, 0.08);
        this.addCircle(cursorX, cursorY, r * 2.2, ...COL.cursor, 0.2);
        this.addCircle(cursorX, cursorY, r * 1.4, ...COL.cursor, 0.45);
        this.addCircle(cursorX, cursorY, r, 1, 1, 1, 1);
        this.addCircle(cursorX, cursorY, r * 0.3, ...COL.cursor, 1);
      }
      // =========================================================================
      // Scene: Effects
      // =========================================================================
      drawEffectsGL(game) {
        for (const effect of game.effects) {
          const progress = 1 - effect.life / effect.maxLife;
          const alpha = 1 - progress;
          const ex = this.px(effect.x);
          const ey = this.py(effect.y);
          if (effect.type === "perfect" || effect.type === "good") {
            const col = effect.type === "perfect" ? COL.perfect : COL.good;
            const r = this.ps(0.04 + progress * 0.1);
            this.addRing(ex, ey, r, ...col, alpha * 0.6, 16);
          }
          if (effect.type === "damage") {
            const r = this.ps(progress * 0.12);
            this.addCircle(ex, ey, r, ...COL.projectile, alpha * 0.4);
            this.flushLines();
            this.flushCircles();
            this.drawOverlayRect(1, 0, 0, alpha * 0.18);
          }
          if (effect.type === "combo_milestone") {
            this.flushLines();
            this.flushCircles();
            this.drawOverlayRect(...COL.cursor, alpha * 0.08);
          }
        }
      }
      // =========================================================================
      // Bloom pipeline
      // =========================================================================
      applyBloom() {
        const gl = this.gl;
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFBO[0].fb);
        gl.viewport(0, 0, this.bloomFBO[0].w, this.bloomFBO[0].h);
        gl.useProgram(this.extractProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
        gl.uniform1i(gl.getUniformLocation(this.extractProg, "u_tex"), 0);
        gl.uniform1f(gl.getUniformLocation(this.extractProg, "u_threshold"), 0.3);
        this.drawQuad(this.extractProg);
        for (let pass = 0; pass < 2; pass++) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFBO[1].fb);
          gl.useProgram(this.blurProg);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, this.bloomFBO[0].tex);
          gl.uniform1i(gl.getUniformLocation(this.blurProg, "u_tex"), 0);
          gl.uniform2f(gl.getUniformLocation(this.blurProg, "u_dir"), 1 / this.bloomFBO[0].w, 0);
          this.drawQuad(this.blurProg);
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFBO[0].fb);
          gl.bindTexture(gl.TEXTURE_2D, this.bloomFBO[1].tex);
          gl.uniform2f(gl.getUniformLocation(this.blurProg, "u_dir"), 0, 1 / this.bloomFBO[0].h);
          this.drawQuad(this.blurProg);
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      // =========================================================================
      // HUD: Neon glow text helper
      // =========================================================================
      glowText(text, x, y, color, fontSize, bold = false, glowSize = 0) {
        const ctx = this.hud;
        const weight = bold ? "bold " : "";
        ctx.font = `${weight}${fontSize}px 'Orbitron', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (glowSize > 0) {
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = glowSize;
          ctx.fillStyle = color;
          ctx.fillText(text, x, y);
          ctx.fillText(text, x, y);
          ctx.restore();
        }
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
      }
      // =========================================================================
      // HUD: Playing phase
      // =========================================================================
      drawPlayingHUD(game, musicMuted, energy) {
        const ctx = this.hud;
        const pad = this.ps(0.02);
        const fontSize = this.ps(0.025);
        ctx.font = `bold ${fontSize}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`${game.score}`, pad, pad);
        if (game.combo > 1) {
          const comboSize = Math.min(fontSize * (1 + game.combo * 0.01), fontSize * 1.5);
          ctx.font = `bold ${comboSize}px 'Orbitron', sans-serif`;
          ctx.fillStyle = "#0ff";
          ctx.fillText(`${game.combo}x`, pad, pad + fontSize + 4);
        }
        const barW = this.ps(0.12);
        const barH = this.ps(0.01);
        const barX = this.w - pad - barW;
        const barY = pad;
        ctx.fillStyle = "#222";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = game.health > 30 ? "#0f0" : "#f00";
        ctx.fillRect(barX, barY, barW * (game.health / 100), barH);
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.font = `${this.ps(0.012)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#888";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText("HP", barX - 6, barY);
        const eBarY = barY + barH + 3;
        ctx.fillStyle = "#111";
        ctx.fillRect(barX, eBarY, barW, 3);
        const eHue = 220 + energy * 60;
        ctx.fillStyle = `hsla(${eHue}, 70%, 50%, 0.8)`;
        ctx.fillRect(barX, eBarY, barW * energy, 3);
        const progress = game.time / game.beatmap.duration;
        const pBarH = 3;
        const pBarY = this.h - pBarH;
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(0, pBarY, this.w, pBarH);
        ctx.fillStyle = "#336";
        ctx.fillRect(0, pBarY, this.w * progress, pBarH);
        const remaining = Math.max(0, game.beatmap.duration - game.time);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        ctx.font = `${this.ps(0.014)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#555";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, this.w - pad, pBarY - 4);
        const btnSize = this.ps(0.03);
        const btnX = this.w - pad - btnSize;
        const btnY = eBarY + 6 + pad;
        this.muteButtonRect = { x: btnX, y: btnY, w: btnSize, h: btnSize };
        ctx.fillStyle = musicMuted ? "#555" : "#888";
        ctx.font = `${btnSize * 0.8}px 'Orbitron', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("M", btnX + btnSize / 2, btnY + btnSize / 2);
        if (musicMuted) {
          ctx.strokeStyle = "#f44";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(btnX + 2, btnY + btnSize - 2);
          ctx.lineTo(btnX + btnSize - 2, btnY + 2);
          ctx.stroke();
        }
        for (const effect of game.effects) {
          const prog = 1 - effect.life / effect.maxLife;
          const alpha = 1 - prog;
          const ex = this.px(effect.x);
          const ey = this.py(effect.y);
          if (effect.type === "perfect") {
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${this.ps(0.022)}px 'Orbitron', sans-serif`;
            ctx.fillStyle = "#ff0";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("PERFECT", ex, ey - this.ps(0.05 + prog * 0.04));
            ctx.globalAlpha = 1;
          }
          if (effect.type === "good") {
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${this.ps(0.022)}px 'Orbitron', sans-serif`;
            ctx.fillStyle = "#0f0";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("GOOD", ex, ey - this.ps(0.05 + prog * 0.04));
            ctx.globalAlpha = 1;
          }
          if (effect.type === "miss") {
            ctx.globalAlpha = alpha;
            ctx.font = `${this.ps(0.018)}px 'Orbitron', sans-serif`;
            ctx.fillStyle = "#f44";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("MISS", ex, ey - this.ps(0.04 + prog * 0.02));
            ctx.globalAlpha = 1;
          }
          if (effect.type === "combo_milestone") {
            ctx.globalAlpha = alpha;
            const comboFontSize = this.ps(0.06 + prog * 0.02);
            this.glowText(`${effect.value} COMBO!`, this.w / 2, this.h / 2, "#0ff", comboFontSize, true, 20);
            ctx.globalAlpha = 1;
          }
        }
      }
      // =========================================================================
      // HUD: Phase overlays
      // =========================================================================
      drawMenuHUD() {
        const ctx = this.hud;
        const cx = this.w / 2;
        const cy = this.h / 2;
        const s = (n) => this.ps(n);
        this.glowText("OPAD", cx, cy - s(0.2), "#0ff", s(0.09), true, 30);
        ctx.font = `${s(0.02)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("TUNNEL FLIGHT", cx, cy - s(0.12));
        this.drawPhoneIllustration(cx, cy + s(0.02), s);
        const instY = cy + s(0.21);
        const lineH = s(0.026);
        ctx.font = `${s(0.016)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#0ff";
        ctx.textAlign = "center";
        ctx.fillText("BEST ON MOBILE", cx, instY);
        ctx.font = `${s(0.013)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#667";
        ctx.fillText("Hold phone in LEFT hand  \u2022  Camera on the RIGHT", cx, instY + lineH);
        ctx.fillText("Control with your RIGHT hand in front of camera", cx, instY + lineH * 2);
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 600));
        ctx.globalAlpha = pulse;
        ctx.font = `${s(0.018)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#0ff";
        ctx.fillText("TAP TO START", cx, this.h - s(0.06));
        ctx.globalAlpha = 1;
      }
      /** Draw a simple schematic: phone held in left hand, right hand waving at camera. */
      drawPhoneIllustration(cx, cy, s) {
        const ctx = this.hud;
        const handX = cx - s(0.13);
        const handY = cy;
        const fR = s(0.012);
        ctx.save();
        ctx.strokeStyle = "#446";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.ellipse(handX - s(5e-3), handY - s(0.05), fR * 0.8, fR * 1.6, -0.3, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const fy = handY + s(0.04) + i * fR * 1.6;
          ctx.beginPath();
          ctx.ellipse(handX + s(0.01), fy, fR * 1.8, fR * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        const pw = s(0.22);
        const ph = s(0.13);
        const px = cx - pw / 2;
        const py = cy - ph / 2;
        const cornerR = s(0.012);
        ctx.save();
        ctx.strokeStyle = "#556";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, cornerR);
        ctx.stroke();
        const inset = s(6e-3);
        ctx.strokeStyle = "#334";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px + inset, py + inset, pw - inset * 2, ph - inset * 2, cornerR * 0.5);
        ctx.stroke();
        const camR = s(7e-3);
        const camX = px + pw - s(0.018);
        const camY = py + s(0.02);
        ctx.beginPath();
        ctx.arc(camX, camY, camR, 0, Math.PI * 2);
        ctx.strokeStyle = "#0ff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = `${s(8e-3)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#0aa";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("CAM", camX, camY + camR + 2);
        ctx.fillStyle = "rgba(0, 255, 255, 0.06)";
        ctx.fillRect(px + inset, py + inset, pw - inset * 2, ph - inset * 2);
        const scrCx = px + pw / 2 - s(0.01);
        const scrCy = py + ph / 2;
        ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(scrCx + Math.cos(a) * s(0.01), scrCy + Math.sin(a) * s(8e-3));
          ctx.lineTo(scrCx + Math.cos(a) * s(0.06), scrCy + Math.sin(a) * s(0.05));
          ctx.stroke();
        }
        ctx.restore();
        const rhX = cx + s(0.18);
        const rhY = cy - s(0.01);
        this.drawOpenHand(rhX, rhY, s);
        ctx.save();
        ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        const arrowStartX = rhX - s(0.04);
        const arrowEndX = camX + s(0.025);
        ctx.beginPath();
        ctx.moveTo(arrowStartX, rhY);
        ctx.quadraticCurveTo((arrowStartX + arrowEndX) / 2, rhY - s(0.04), arrowEndX, camY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      /** Draw a simple open right hand silhouette. */
      drawOpenHand(cx, cy, s) {
        const ctx = this.hud;
        ctx.save();
        ctx.strokeStyle = "#0cc";
        ctx.fillStyle = "rgba(0, 204, 204, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        const palmW = s(0.022);
        const palmH = s(0.028);
        ctx.beginPath();
        ctx.ellipse(cx, cy + s(0.01), palmW, palmH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const fingers = [
          { angle: -1.4, len: s(0.032) },
          // thumb (angled out)
          { angle: -0.5, len: s(0.038) },
          // index
          { angle: -0.2, len: s(0.04) },
          // middle
          { angle: 0.1, len: s(0.037) },
          // ring
          { angle: 0.4, len: s(0.03) }
          // pinky
        ];
        for (const f of fingers) {
          const baseX = cx + Math.sin(f.angle) * palmW * 0.7;
          const baseY = cy + s(0.01) - palmH * 0.6;
          ctx.beginPath();
          ctx.moveTo(baseX, baseY);
          ctx.lineTo(
            baseX + Math.sin(f.angle) * f.len * 0.3,
            baseY - f.len
          );
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx - palmW * 0.5, cy + palmH + s(5e-3));
        ctx.lineTo(cx - palmW * 0.3, cy + palmH + s(0.025));
        ctx.moveTo(cx + palmW * 0.5, cy + palmH + s(5e-3));
        ctx.lineTo(cx + palmW * 0.3, cy + palmH + s(0.025));
        ctx.stroke();
        ctx.restore();
      }
      drawCountdownHUD(game) {
        const count = Math.max(1, Math.ceil(game.countdownValue));
        const frac = game.countdownValue % 1;
        const scale = 1 + frac * 0.3;
        const size = this.ps(0.12) * scale;
        this.hud.globalAlpha = 0.5 + frac * 0.5;
        this.glowText(count.toString(), this.w / 2, this.h / 2, "#0ff", size, true, 25);
        this.hud.globalAlpha = 1;
        this.hud.font = `${this.ps(0.02)}px 'Orbitron', sans-serif`;
        this.hud.fillStyle = "#666";
        this.hud.textAlign = "center";
        this.hud.textBaseline = "middle";
        this.hud.fillText("ENTERING TUNNEL", this.w / 2, this.h / 2 + this.ps(0.1));
      }
      drawResultsHUD(game) {
        const cx = this.w / 2;
        const cy = this.h / 2;
        const lineH = this.ps(0.05);
        const ctx = this.hud;
        this.glowText("MISSION COMPLETE", cx, cy - lineH * 3, "#0ff", this.ps(0.06), true, 25);
        ctx.font = `bold ${this.ps(0.045)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${game.score}`, cx, cy - lineH * 1.5);
        ctx.font = `${this.ps(0.022)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#ff0";
        ctx.fillText(`PERFECT  ${game.hits.perfect}`, cx, cy);
        ctx.fillStyle = "#0f0";
        ctx.fillText(`GOOD  ${game.hits.good}`, cx, cy + lineH * 0.8);
        ctx.fillStyle = "#f44";
        ctx.fillText(`MISS  ${game.hits.miss}`, cx, cy + lineH * 1.6);
        ctx.fillStyle = "#0ff";
        ctx.fillText(`MAX COMBO  ${game.maxCombo}`, cx, cy + lineH * 2.6);
        const total = game.hits.perfect + game.hits.good + game.hits.miss;
        const accuracy = total > 0 ? Math.round((game.hits.perfect + game.hits.good * 0.5) / total * 100) : 0;
        ctx.fillStyle = "#fff";
        ctx.fillText(`ACCURACY  ${accuracy}%`, cx, cy + lineH * 3.4);
        ctx.font = `${this.ps(0.016)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#555";
        ctx.fillText("TAP TO RETRY", cx, cy + lineH * 4.8);
      }
      drawGameOverHUD(game) {
        const cx = this.w / 2;
        const cy = this.h / 2;
        const lineH = this.ps(0.05);
        const ctx = this.hud;
        this.glowText("SYSTEMS OFFLINE", cx, cy - lineH * 2.5, "#f44", this.ps(0.07), true, 20);
        ctx.font = `bold ${this.ps(0.035)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`SCORE  ${game.score}`, cx, cy - lineH * 0.8);
        ctx.font = `${this.ps(0.022)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#ff0";
        ctx.fillText(`PERFECT  ${game.hits.perfect}`, cx, cy + lineH * 0.2);
        ctx.fillStyle = "#0f0";
        ctx.fillText(`GOOD  ${game.hits.good}`, cx, cy + lineH * 1);
        ctx.fillStyle = "#f44";
        ctx.fillText(`MISS  ${game.hits.miss}`, cx, cy + lineH * 1.8);
        ctx.fillStyle = "#0ff";
        ctx.fillText(`MAX COMBO  ${game.maxCombo}`, cx, cy + lineH * 2.8);
        const progress = Math.round(game.time / game.beatmap.duration * 100);
        ctx.fillStyle = "#888";
        ctx.fillText(`TUNNEL REACHED  ${progress}%`, cx, cy + lineH * 3.6);
        ctx.font = `${this.ps(0.016)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = "#555";
        ctx.fillText("TAP TO RETRY", cx, cy + lineH * 5);
      }
      // =========================================================================
      // Debug overlay (toggled with D key)
      // =========================================================================
      /** Toggle the debug hand tracking overlay. */
      toggleDebug() {
        this._debugVisible = !this._debugVisible;
      }
      /** Draw debug overlay: small camera feed, hand skeleton, and calibration hints. */
      drawDebugOverlay() {
        const ctx = this.hud;
        const info = this._debugInfo;
        const pad = this.ps(0.01);
        const fontSize = this.ps(0.012);
        const lineH = fontSize * 1.5;
        const panelW = Math.max(this.ps(0.25), 180);
        const videoH = panelW * (9 / 16);
        const textAreaH = lineH * 4 + pad * 2;
        const panelH = videoH + textAreaH;
        const panelX = pad;
        const panelY = this.h - pad - panelH;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#0a0a14";
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#334";
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelW, panelH);
        const vidX = panelX;
        const vidY = panelY;
        try {
          if (this._video && this._video.readyState >= 2) {
            ctx.save();
            ctx.translate(vidX + panelW, vidY);
            ctx.scale(-1, 1);
            ctx.drawImage(this._video, 0, 0, panelW, videoH);
            ctx.restore();
          } else {
            ctx.fillStyle = "#111";
            ctx.fillRect(vidX, vidY, panelW, videoH);
            ctx.fillStyle = "#444";
            ctx.font = `${fontSize}px 'Orbitron', sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("NO CAMERA", vidX + panelW / 2, vidY + videoH / 2);
          }
        } catch {
        }
        ctx.strokeStyle = "rgba(0, 255, 0, 0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          vidX + 0.15 * panelW,
          vidY + 0.15 * videoH,
          0.7 * panelW,
          0.7 * videoH
        );
        ctx.setLineDash([]);
        if (info && info.landmarks) {
          const lm = info.landmarks;
          ctx.strokeStyle = "#0ff";
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.7;
          for (const [a, b] of HAND_SKELETON) {
            const ax = vidX + (1 - lm[a].x) * panelW;
            const ay = vidY + lm[a].y * videoH;
            const bx = vidX + (1 - lm[b].x) * panelW;
            const by = vidY + lm[b].y * videoH;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          const dotR = 2;
          for (let i = 0; i < lm.length; i++) {
            const lx = vidX + (1 - lm[i].x) * panelW;
            const ly = vidY + lm[i].y * videoH;
            ctx.beginPath();
            ctx.arc(lx, ly, dotR, 0, Math.PI * 2);
            ctx.fillStyle = PALM_INDICES.includes(i) ? "#ff0" : "#0ff";
            ctx.fill();
          }
          let sumX = 0, sumY = 0;
          for (const idx of PALM_INDICES) {
            sumX += lm[idx].x;
            sumY += lm[idx].y;
          }
          const centX = vidX + (1 - sumX / PALM_INDICES.length) * panelW;
          const centY = vidY + sumY / PALM_INDICES.length * videoH;
          ctx.beginPath();
          ctx.arc(centX, centY, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#f0f";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        let textY = vidY + videoH + pad;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = `${fontSize}px 'Orbitron', sans-serif`;
        const mode = info ? info.inputMode : "none";
        const confStr = info && info.detected ? `${Math.round(info.confidence * 100)}%` : "--";
        ctx.fillStyle = "#888";
        ctx.fillText(`Mode: ${mode}  Conf: ${confStr}`, panelX + pad, textY);
        textY += lineH;
        if (info && info.landmarks) {
          const hint = this._getDistanceHint(info.landmarks);
          ctx.fillStyle = hint.color;
          ctx.fillText(`Distance: ${hint.label}`, panelX + pad, textY);
        } else {
          ctx.fillStyle = "#555";
          ctx.fillText("Show hand to camera", panelX + pad, textY);
        }
        textY += lineH;
        if (info) {
          ctx.fillStyle = "#666";
          ctx.fillText(
            `Pos: (${info.cursorSmoothed.x.toFixed(3)}, ${info.cursorSmoothed.y.toFixed(3)})`,
            panelX + pad,
            textY
          );
        }
        textY += lineH;
        ctx.fillStyle = "#444";
        ctx.fillText("Press D to close", panelX + pad, textY);
        ctx.restore();
      }
      /** Evaluate hand distance from camera based on landmark spread. */
      _getDistanceHint(landmarks) {
        const wrist = landmarks[0];
        const midMcp = landmarks[9];
        const dx = wrist.x - midMcp.x;
        const dy = wrist.y - midMcp.y;
        const span = Math.sqrt(dx * dx + dy * dy);
        if (span < 0.06) {
          return { label: "TOO FAR -- move closer", color: "#f44" };
        } else if (span > 0.18) {
          return { label: "TOO CLOSE -- move back", color: "#ff0" };
        } else {
          return { label: "GOOD", color: "#0f0" };
        }
      }
    };
  }
});

// src/browser/main.ts
var require_main = __commonJS({
  "src/browser/main.ts"() {
    init_game();
    init_beatmap();
    init_audio();
    init_input();
    init_renderer();
    function reportError(entry) {
      const payload = JSON.stringify({
        ...entry,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        userAgent: navigator.userAgent,
        url: location.href
      });
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      }).catch(() => {
      });
    }
    window.addEventListener("error", (e) => {
      reportError({
        type: "onerror",
        message: e.message,
        source: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack
      });
    });
    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason;
      reportError({
        type: "unhandledrejection",
        message: reason?.message ?? String(reason),
        stack: reason?.stack
      });
    });
    var _origConsoleError = console.error;
    console.error = (...args) => {
      _origConsoleError.apply(console, args);
      const msg = args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
      if (msg.includes("Failed to acquire camera feed")) return;
      reportError({ type: "console.error", message: msg });
    };
    var BEATMAP_URL = "media/ep4.beatmap.json";
    var MUSIC_URL = "media/ep4.mp3";
    function requestFullscreenLandscape() {
      const doc = document.documentElement;
      if (!document.fullscreenElement) {
        const p = doc.requestFullscreen?.() ?? doc.webkitRequestFullscreen?.();
        if (p instanceof Promise) {
          p.then(() => {
            screen.orientation?.lock?.("landscape-primary").catch(() => {
            });
          }).catch(() => {
          });
        }
      }
    }
    var canvas = document.getElementById("game");
    var hudCanvas = document.getElementById("hud");
    var video = document.getElementById("cam");
    var audio = new AudioManager();
    var input = new InputManager(canvas, video);
    var renderer = new Renderer(canvas, hudCanvas, video);
    var loadedBeatmap = null;
    var game = new Game(generateBeatmap());
    var musicMode = false;
    var musicStarted = false;
    var lastTime = 0;
    function loop(now) {
      const dt = lastTime ? Math.min((now - lastTime) / 1e3, 0.1) : 1 / 60;
      lastTime = now;
      input.update(dt);
      if (game.phase === "playing" || game.phase === "countdown") {
        if (musicMode && game.phase === "playing" && !musicStarted) {
          audio.startMusic();
          musicStarted = true;
        }
        game.update(now / 1e3, dt, input.cursor, audio);
      }
      if (musicMode && (game.phase === "results" || game.phase === "gameover")) {
        audio.stopMusic();
        musicStarted = false;
      }
      renderer.render(game, input.cursor, audio.musicMuted, input.debugInfo);
      requestAnimationFrame(loop);
    }
    async function loadBeatmapAndMusic() {
      try {
        const resp = await fetch(BEATMAP_URL);
        if (resp.ok) {
          loadedBeatmap = await resp.json();
          await audio.loadMusic(MUSIC_URL);
          console.log(`Loaded beatmap: ${loadedBeatmap.events.length} events, ${loadedBeatmap.duration.toFixed(0)}s`);
        }
      } catch (e) {
        console.log("No beatmap/music found, using procedural generation", e);
        loadedBeatmap = null;
      }
    }
    async function handleStart() {
      await audio.init();
      if (loadedBeatmap) {
        game = new Game(loadedBeatmap);
        musicMode = true;
        musicStarted = false;
      } else {
        game = new Game(generateBeatmap());
        musicMode = false;
        musicStarted = false;
      }
      game.start(performance.now() / 1e3);
    }
    function hitTestMuteButton(clientX, clientY) {
      const r = renderer.muteButtonRect;
      const margin = 10;
      return clientX >= r.x - margin && clientX <= r.x + r.w + margin && clientY >= r.y - margin && clientY <= r.y + r.h + margin;
    }
    function handleClick(e) {
      requestFullscreenLandscape();
      if (game.phase === "playing" && hitTestMuteButton(e.clientX, e.clientY)) {
        audio.toggleMusicMute();
        return;
      }
      if (game.phase === "menu" || game.phase === "results" || game.phase === "gameover") {
        handleStart();
      }
    }
    canvas.addEventListener("click", (e) => handleClick(e));
    canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        handleClick(e.changedTouches[0]);
      }
    }, { passive: false });
    renderer.render(game, input.cursor);
    loadBeatmapAndMusic();
    input.init().then((mode) => {
      console.log(`Input mode: ${mode}`);
    });
    window.__OPAD_TEST__ = {
      getGame: () => game,
      getRenderer: () => renderer,
      getAudio: () => audio,
      /** Replace game with a new instance using a custom beatmap and render one frame. */
      setGame: (beatmap) => {
        game = new Game(beatmap);
        renderer.render(game, input.cursor);
      },
      /** Start the current game (transitions from menu to countdown). */
      startGame: () => {
        game.start(performance.now() / 1e3);
      },
      /** Tick the game forward by dt seconds and render. */
      tickAndRender: (dt, cursorX = 0.5, cursorY = 0.5) => {
        const nullAudio = { playTick() {
        }, playHit() {
        }, playMiss() {
        }, playDamage() {
        }, playCombo() {
        } };
        const cursor = { x: cursorX, y: cursorY };
        game.tick(dt, cursor, nullAudio);
        renderer.render(game, cursor);
      },
      /** Render current state without advancing time. */
      renderFrame: (cursorX = 0.5, cursorY = 0.5) => {
        renderer.render(game, { x: cursorX, y: cursorY });
      }
    };
    window.addEventListener("keydown", (e) => {
      if (e.key === "d" || e.key === "D") {
        renderer.toggleDebug();
      }
    });
    requestAnimationFrame(loop);
  }
});
export default require_main();
//# sourceMappingURL=bundle.js.map
