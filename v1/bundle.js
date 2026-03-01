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
var APPROACH_TIME_MAX, APPROACH_TIME_MIN, PERFECT_WINDOW, GOOD_WINDOW, LANE_COUNT, LANE_HIT_Y, LANE_CENTERS, FINGER_SPEED_THRESHOLD, PERFECT_SCORE, GOOD_SCORE, COMBO_MILESTONE, MAX_MULTIPLIER, MAX_HEALTH, MISS_DAMAGE, PERFECT_HEAL, POWER_SLOW_TIME_COMBO, POWER_SHIELD_COMBO, POWER_SCORE_BOOST_COMBO, POWER_DURATION, SCORE_BOOST_MULTIPLIER, HIT_EFFECT_DURATION, MISS_EFFECT_DURATION, COMBO_EFFECT_DURATION, COUNTDOWN_SECONDS;
var init_constants = __esm({
  "src/game/constants.ts"() {
    APPROACH_TIME_MAX = 2.5;
    APPROACH_TIME_MIN = 0.8;
    PERFECT_WINDOW = 0.1;
    GOOD_WINDOW = 0.25;
    LANE_COUNT = 4;
    LANE_HIT_Y = 0.82;
    LANE_CENTERS = [0.2, 0.4, 0.6, 0.8];
    FINGER_SPEED_THRESHOLD = 0.8;
    PERFECT_SCORE = 300;
    GOOD_SCORE = 100;
    COMBO_MILESTONE = 10;
    MAX_MULTIPLIER = 8;
    MAX_HEALTH = 100;
    MISS_DAMAGE = 3;
    PERFECT_HEAL = 1;
    POWER_SLOW_TIME_COMBO = 10;
    POWER_SHIELD_COMBO = 20;
    POWER_SCORE_BOOST_COMBO = 30;
    POWER_DURATION = 5;
    SCORE_BOOST_MULTIPLIER = 2;
    HIT_EFFECT_DURATION = 0.6;
    MISS_EFFECT_DURATION = 0.5;
    COMBO_EFFECT_DURATION = 0.8;
    COUNTDOWN_SECONDS = 3;
  }
});

// src/game/game.ts
function laneCenterX(lane) {
  return LANE_CENTERS[lane] ?? 0.5;
}
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
        __publicField(this, "slashes", []);
        __publicField(this, "effects", []);
        __publicField(this, "nextEvent", 0);
        __publicField(this, "hits", { perfect: 0, good: 0, miss: 0 });
        __publicField(this, "countdownValue", COUNTDOWN_SECONDS);
        __publicField(this, "power", "none");
        __publicField(this, "powerTimeLeft", 0);
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
        this.slashes = [];
        this.effects = [];
        this.nextEvent = 0;
        this.hits = { perfect: 0, good: 0, miss: 0 };
        this.countdownValue = COUNTDOWN_SECONDS;
        this._countdownStart = now;
        this._playStart = 0;
        this._lastComboMilestone = 0;
        this.power = "none";
        this.powerTimeLeft = 0;
      }
      update(now, dt, gesture, audio) {
        if (this.phase === "countdown") {
          this._updateCountdown(now);
          return;
        }
        if (this.phase !== "playing") return;
        const effectiveDt = this.power === "slow_time" ? dt * (1 - (1 - 0.4) * Math.min(this.powerTimeLeft / POWER_DURATION, 1)) : dt;
        this.time = now - this._playStart;
        this._spawnEvents(audio);
        this._updateSlashes(gesture, audio);
        this._updatePower(effectiveDt);
        this._updateEffects(effectiveDt);
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
      tick(dt, gesture, audio) {
        if (this.phase === "countdown") {
          this.countdownValue -= dt;
          if (this.countdownValue <= 0) {
            this.phase = "playing";
            this.time = 0;
          }
          return;
        }
        if (this.phase !== "playing") return;
        const effectiveDt = this.power === "slow_time" ? dt * 0.4 : dt;
        this.time += dt;
        this._spawnEvents(audio);
        this._updateSlashes(gesture, audio);
        this._updatePower(effectiveDt);
        this._updateEffects(effectiveDt);
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
          const progress = Math.min(event.time / this.beatmap.duration, 1);
          const approachTime = APPROACH_TIME_MAX - (APPROACH_TIME_MAX - APPROACH_TIME_MIN) * progress;
          const spawnTime = event.time - approachTime;
          if (spawnTime <= this.time) {
            const lane = typeof event.lane === "number" ? event.lane : 0;
            this.slashes.push({
              lane,
              time: event.time,
              approachTime,
              hit: false,
              missed: false
            });
            audio.playTick();
            this.nextEvent++;
          } else {
            break;
          }
        }
      }
      _updateSlashes(gesture, audio) {
        for (let i = this.slashes.length - 1; i >= 0; i--) {
          const slash = this.slashes[i];
          const timeDiff = this.time - slash.time;
          if (!slash.hit && !slash.missed && Math.abs(timeDiff) <= GOOD_WINDOW) {
            if (gesture.lanesPressed[slash.lane]) {
              slash.hit = true;
              const isPerfect = Math.abs(timeDiff) <= PERFECT_WINDOW;
              this._registerHit(isPerfect, slash, audio);
            }
          }
          if (!slash.hit && !slash.missed && timeDiff > GOOD_WINDOW) {
            slash.missed = true;
            this._registerMiss(slash, audio);
          }
          if (timeDiff > GOOD_WINDOW + 0.8) {
            this.slashes.splice(i, 1);
          }
        }
      }
      _updatePower(dt) {
        if (this.power === "none") return;
        this.powerTimeLeft -= dt;
        if (this.powerTimeLeft <= 0) {
          this.power = "none";
          this.powerTimeLeft = 0;
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
      _activatePower(power) {
        this.power = power;
        this.powerTimeLeft = POWER_DURATION;
      }
      _registerHit(isPerfect, slash, audio) {
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        const multiplier = Math.min(
          Math.floor(this.combo / COMBO_MILESTONE) + 1,
          MAX_MULTIPLIER
        );
        const baseScore = isPerfect ? PERFECT_SCORE : GOOD_SCORE;
        const boostMult = this.power === "score_boost" ? SCORE_BOOST_MULTIPLIER : 1;
        this.score += baseScore * multiplier * boostMult;
        const effectX = laneCenterX(slash.lane);
        const effectY = LANE_HIT_Y;
        if (isPerfect) {
          this.hits.perfect++;
          audio.playHit(1);
          audio.playSlash(1);
          this.health = Math.min(MAX_HEALTH, this.health + PERFECT_HEAL);
        } else {
          this.hits.good++;
          audio.playHit(0.6);
          audio.playSlash(0.6);
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
          if (milestone === POWER_SLOW_TIME_COMBO) {
            this._activatePower("slow_time");
          } else if (milestone === POWER_SHIELD_COMBO) {
            this._activatePower("shield");
          } else if (milestone === POWER_SCORE_BOOST_COMBO) {
            this._activatePower("score_boost");
          }
        }
        this.effects.push({
          type: isPerfect ? "perfect" : "good",
          x: effectX,
          y: effectY,
          life: HIT_EFFECT_DURATION,
          maxLife: HIT_EFFECT_DURATION
        });
      }
      _registerMiss(slash, audio) {
        this.hits.miss++;
        this.combo = 0;
        this._lastComboMilestone = 0;
        this.health -= MISS_DAMAGE;
        audio.playMiss();
        this.effects.push({
          type: "miss",
          x: laneCenterX(slash.lane),
          y: LANE_HIT_Y,
          life: MISS_EFFECT_DURATION,
          maxLife: MISS_EFFECT_DURATION
        });
      }
    };
  }
});

// src/game/beatmap.ts
function xToLane(x) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < LANE_COUNT; i++) {
    const center = (i + 1) / (LANE_COUNT + 1);
    const dist = Math.abs(x - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
function convertLegacyBeatmap(raw) {
  const events = raw.events.map((e, i) => {
    if (typeof e.lane === "number" && e.lane >= 0 && e.lane < LANE_COUNT) {
      return {
        time: e.time,
        type: "slash",
        lane: e.lane
      };
    }
    if (typeof e.x === "number") {
      return {
        time: e.time,
        type: "slash",
        lane: xToLane(e.x)
      };
    }
    return {
      time: e.time,
      type: "slash",
      lane: i % LANE_COUNT
    };
  });
  return {
    bpm: raw.bpm,
    duration: raw.duration,
    events,
    energyTimeline: raw.energyTimeline
  };
}
function generateBeatmap(bpm = 140, duration = 60) {
  const events = [];
  const beatInterval = 60 / bpm;
  let time = 3;
  let lastLane = -1;
  while (time < duration - 5) {
    const progress = time / duration;
    const interval = progress < 0.2 ? beatInterval * 2 : progress < 0.5 ? beatInterval : progress < 0.8 ? beatInterval * 0.75 : beatInterval * 0.5;
    let lane;
    if (progress < 0.25) {
      const innerLanes = [1, 2];
      const filtered = innerLanes.filter((l) => l !== lastLane);
      lane = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : innerLanes[Math.floor(Math.random() * innerLanes.length)];
    } else {
      const allLanes = Array.from({ length: LANE_COUNT }, (_, i) => i);
      const filtered = allLanes.filter((l) => l !== lastLane);
      lane = filtered[Math.floor(Math.random() * filtered.length)];
    }
    events.push({ time, type: "slash", lane });
    lastLane = lane;
    time += interval;
  }
  events.sort((a, b) => a.time - b.time);
  return { bpm, duration, events };
}
var init_beatmap = __esm({
  "src/game/beatmap.ts"() {
    init_constants();
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
      /** Sharp whoosh for slash gesture: noise burst + high-frequency sweep. */
      playSlash(intensity) {
        this._play((t, ctx) => {
          const intens = Math.max(0.1, intensity);
          const bufSize = ctx.sampleRate * 0.08;
          const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = noiseBuf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.setValueAtTime(2e3, t);
          hp.frequency.exponentialRampToValueAtTime(6e3, t + 0.05);
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.18 * intens, t);
          noiseGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.08);
          noise.connect(hp).connect(noiseGain).connect(ctx.destination);
          noise.start(t);
          noise.stop(t + 0.09);
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(3e3 * intens, t);
          osc.frequency.exponentialRampToValueAtTime(800, t + 0.06);
          oscGain.gain.setValueAtTime(0.06 * intens, t);
          oscGain.gain.exponentialRampToValueAtTime(1e-3, t + 0.06);
          osc.connect(oscGain).connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.07);
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
var CURSOR_LANDMARK, HAND_CLAMP_MIN, HAND_CLAMP_MAX, FINGER_TIP_LANDMARKS, VELOCITY_WINDOW, KEY_LANE_MAP, InputManager;
var init_input = __esm({
  "src/browser/input.ts"() {
    init_constants();
    CURSOR_LANDMARK = 9;
    HAND_CLAMP_MIN = 0.25;
    HAND_CLAMP_MAX = 0.75;
    FINGER_TIP_LANDMARKS = [8, 12, 16, 20];
    VELOCITY_WINDOW = 3;
    KEY_LANE_MAP = {
      "a": 0,
      "A": 0,
      "s": 1,
      "S": 1,
      "d": 2,
      "D": 2,
      "f": 3,
      "F": 3
    };
    InputManager = class {
      constructor(canvas, video) {
        this.canvas = canvas;
        this.video = video;
        __publicField(this, "cursor", { x: 0.5, y: 0.5 });
        __publicField(this, "mode", "none");
        __publicField(this, "detected", false);
        /** Latest raw hand landmarks (21 points) from MediaPipe, or null. */
        __publicField(this, "landmarks", null);
        /** Which landmark index drives the cursor. */
        __publicField(this, "cursorLandmarkIndex", CURSOR_LANDMARK);
        /** Hand input clamp boundaries (normalized camera coords). */
        __publicField(this, "clampMin", HAND_CLAMP_MIN);
        __publicField(this, "clampMax", HAND_CLAMP_MAX);
        /** Current gesture sample: which lanes are pressed this frame. */
        __publicField(this, "gesture", { lanesPressed: [false, false, false, false] });
        __publicField(this, "_raw", { x: 0.5, y: 0.5 });
        __publicField(this, "_smoothingSpeed", 12);
        // Per-finger velocity tracking for downward flick detection
        __publicField(this, "_fingerPrevY", [0.5, 0.5, 0.5, 0.5]);
        __publicField(this, "_fingerPrevTime", [0, 0, 0, 0]);
        __publicField(this, "_fingerVelSamples", [[], [], [], []]);
        // vy samples per finger
        __publicField(this, "_fingerLanesPressed", [false, false, false, false]);
        // Keyboard lane presses (edge-triggered, cleared after each frame)
        __publicField(this, "_keyLanesPressed", [false, false, false, false]);
        canvas.addEventListener("mousemove", (e) => {
          const nx = e.clientX / window.innerWidth;
          const ny = e.clientY / window.innerHeight;
          this._raw.x = nx;
          this._raw.y = ny;
          if (this.mode !== "hand") this.mode = "mouse";
          this.detected = true;
        });
        canvas.addEventListener(
          "touchstart",
          (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const nx = t.clientX / window.innerWidth;
            const ny = t.clientY / window.innerHeight;
            this._raw.x = nx;
            this._raw.y = ny;
            if (this.mode !== "hand") this.mode = "touch";
            this.detected = true;
          },
          { passive: false }
        );
        canvas.addEventListener(
          "touchmove",
          (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const nx = t.clientX / window.innerWidth;
            const ny = t.clientY / window.innerHeight;
            this._raw.x = nx;
            this._raw.y = ny;
            if (this.mode !== "hand") this.mode = "touch";
            this.detected = true;
          },
          { passive: false }
        );
        window.addEventListener("keydown", (e) => {
          const lane = KEY_LANE_MAP[e.key];
          if (lane !== void 0) {
            this._keyLanesPressed[lane] = true;
          }
        });
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
        this.cursor.x += (this._raw.x - this.cursor.x) * factor;
        this.cursor.y += (this._raw.y - this.cursor.y) * factor;
        const merged = [false, false, false, false];
        for (let i = 0; i < LANE_COUNT; i++) {
          merged[i] = this._keyLanesPressed[i] || this._fingerLanesPressed[i];
        }
        this.gesture = { lanesPressed: merged };
        this._keyLanesPressed = [false, false, false, false];
      }
      _pushFingerVelocity(finger, vy) {
        const samples = this._fingerVelSamples[finger];
        samples.push(vy);
        if (samples.length > VELOCITY_WINDOW) {
          samples.shift();
        }
        let avg = 0;
        for (let i = 0; i < samples.length; i++) {
          avg += samples[i];
        }
        avg /= samples.length;
        this._fingerLanesPressed[finger] = avg > FINGER_SPEED_THRESHOLD;
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
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5
        });
        hands.onResults((results) => {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const hand = results.multiHandLandmarks[0];
            this.landmarks = hand;
            const point = hand[CURSOR_LANDMARK];
            if (!point) return;
            this._raw.x = this._mapRange(1 - point.x, HAND_CLAMP_MIN, HAND_CLAMP_MAX, 0, 1);
            this._raw.y = this._mapRange(point.y, HAND_CLAMP_MIN, HAND_CLAMP_MAX, 0, 1);
            this.mode = "hand";
            this.detected = true;
            const now = performance.now() / 1e3;
            for (let f = 0; f < FINGER_TIP_LANDMARKS.length; f++) {
              const tip = hand[FINGER_TIP_LANDMARKS[f]];
              if (!tip) continue;
              const elapsed = now - this._fingerPrevTime[f];
              if (this._fingerPrevTime[f] > 0 && elapsed > 0 && elapsed < 0.2) {
                const vy = (tip.y - this._fingerPrevY[f]) / elapsed;
                this._pushFingerVelocity(f, vy);
              }
              this._fingerPrevY[f] = tip.y;
              this._fingerPrevTime[f] = now;
            }
          } else {
            this.landmarks = null;
            this._fingerLanesPressed = [false, false, false, false];
            this._fingerVelSamples = [[], [], [], []];
          }
        });
        const camera = new W.Camera(this.video, {
          onFrame: async () => {
            await hands.send({ image: this.video });
          },
          width: 640,
          height: 480
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
var FAR_Z, RING_COUNT, STREAK_COUNT, TUNNEL_RADIUS, SIDES, MAX_LINES, MAX_CIRCLES, RING_SEGMENTS, PARALLAX_STRENGTH, LANE_COLORS, COL, HAND_CONNECTIONS, FLAT_VS, FLAT_FS, CIRCLE_VS, CIRCLE_FS, SCREEN_VS, BG_FS, GLOW_FS, EXTRACT_FS, BLUR_FS, FINAL_FS, Renderer;
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
    LANE_COLORS = [
      [0, 1, 1],
      // lane 0: cyan
      [1, 0, 1],
      // lane 1: magenta
      [0, 1, 0.2],
      // lane 2: green
      [1, 0.6, 0]
      // lane 3: orange
    ];
    COL = {
      cursor: [0, 1, 1],
      // #0ff cyan
      perfect: [1, 1, 0],
      // #ff0
      good: [0, 1, 0],
      // #0f0
      miss: [1, 0.267, 0.267],
      // #f44
      white: [1, 1, 1]
    };
    HAND_CONNECTIONS = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      // thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      // index finger
      [5, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      // middle finger
      [9, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      // ring finger
      [13, 17],
      [17, 18],
      [18, 19],
      [19, 20],
      // pinky
      [0, 17]
      // wrist to pinky base
    ];
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
  fragColor = vec4(color, 1.0);
}`;
    Renderer = class {
      constructor(glCanvas, hudCanvas) {
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
        __publicField(this, "muteButtonRect", { x: 0, y: 0, w: 0, h: 0 });
        __publicField(this, "camDebugButtonRect", { x: 0, y: 0, w: 0, h: 0 });
        __publicField(this, "camDebugVisible", false);
        __publicField(this, "_camOverlay", null);
        __publicField(this, "_camDebugEl", null);
        __publicField(this, "_camPreviewVideo", null);
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
      render(game, cursor, musicMuted = false, landmarks = null, cursorLandmarkIdx = 8, clampMin = 0.25, clampMax = 0.75, gesture = { lanesPressed: [false, false, false, false] }) {
        const gl = this.gl;
        const now = performance.now() / 1e3;
        const dt = this.lastRenderTime ? Math.min(now - this.lastRenderTime, 0.1) : 1 / 60;
        this.lastRenderTime = now;
        let energy = 0.15, hue = 220;
        let drawLanesFlag = false, drawCursorFlag = false;
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
          drawLanesFlag = true;
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
        if (drawLanesFlag) this.drawLanesGL(game, gesture);
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
        gl.uniform1f(gl.getUniformLocation(this.finalProg, "u_vigStr"), 0.35);
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
          this.drawPlayingHUD(game, musicMuted, energy, gesture);
        }
        this.drawCamDebugOverlay(landmarks, cursorLandmarkIdx, clampMin, clampMax);
      }
      // =========================================================================
      // Scene: Background
      // =========================================================================
      drawBackground(energy, hue) {
        const gl = this.gl;
        const [cr, cg, cb] = hsl(hue, 0.4, 0.06 + energy * 0.05);
        const [er, eg, eb] = hsl(hue + 30, 0.25, 0.02 + energy * 0.02);
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
      // Scene: Lane-based game objects
      // =========================================================================
      /** Draw 4 lane tracks, hit zones, and approaching bullets. */
      drawLanesGL(game, gesture) {
        const cx = this.w / 2;
        const cy = this.h / 2;
        const hitY = this.py(LANE_HIT_Y);
        const hitR = this.ps(0.035);
        for (let i = 0; i < LANE_COUNT; i++) {
          const laneX = this.px(LANE_CENTERS[i]);
          const [cr, cg, cb] = LANE_COLORS[i];
          this.addLine(cx, cy, laneX, hitY, cr, cg, cb, 0.08);
          const pressed = gesture.lanesPressed[i];
          const hitAlpha = pressed ? 0.7 : 0.2;
          const hitGlow = pressed ? hitR * 1.8 : hitR * 1.2;
          this.addCircle(laneX, hitY, hitGlow, cr, cg, cb, hitAlpha * 0.3);
          this.addRing(laneX, hitY, hitR, cr, cg, cb, hitAlpha, 16);
          this.addCircle(laneX, hitY, hitR * 0.25, cr, cg, cb, hitAlpha);
        }
        for (const slash of game.slashes) {
          const timeDiff = game.time - slash.time;
          const approachProgress = 1 - (slash.time - game.time) / slash.approachTime;
          if (approachProgress < 0) continue;
          const laneX = this.px(LANE_CENTERS[slash.lane]);
          const [cr, cg, cb] = LANE_COLORS[slash.lane] ?? [1, 1, 1];
          const baseR = this.ps(0.03);
          if (slash.hit) {
            const hitP = Math.max(0, timeDiff) / 0.35;
            if (hitP > 1) continue;
            const alpha = 1 - hitP;
            const ringR = hitR * (1 + hitP * 3);
            this.addRing(laneX, hitY, ringR, cr, cg, cb, alpha * 0.7, 20);
            const coreR = hitR * (1 - hitP * 0.5);
            this.addCircle(laneX, hitY, Math.max(2, coreR), 1, 1, 1, alpha * 0.9);
            this.addRing(laneX, hitY, ringR * 0.5, cr, cg, cb, alpha * 0.4, 12);
            continue;
          }
          if (slash.missed) {
            const missP = Math.max(0, timeDiff - 0.25) / 0.5;
            if (missP > 1) continue;
            const alpha = Math.max(0, 1 - missP) * 0.3;
            const collapseR = hitR * (1 - missP * 0.6);
            this.addRing(laneX, hitY, collapseR, ...COL.miss, alpha, 12);
            this.addCircle(laneX, hitY, collapseR * 0.4, ...COL.miss, alpha * 0.5);
            continue;
          }
          const clamped = Math.min(approachProgress, 1);
          const z = 1 - clamped;
          const scale = this.perspScale(z);
          const displayX = cx + (laneX - cx) * scale;
          const displayY = cy + (hitY - cy) * scale;
          const displayR = Math.max(3, baseR * scale);
          const nearWindow = Math.abs(timeDiff) <= GOOD_WINDOW;
          const pulse = nearWindow ? 1 + Math.sin(game.time * 14) * 0.15 : 1;
          const landingAlpha = clamped * clamped * 0.55;
          if (landingAlpha > 0.02 && nearWindow) {
            this.addRing(laneX, hitY, hitR * 1.4 * pulse, cr, cg, cb, landingAlpha * 0.5, 12);
          }
          if (clamped < 0.88) {
            const connAlpha = (1 - clamped) * 0.08;
            this.addLine(displayX, displayY, laneX, hitY, cr, cg, cb, connAlpha);
          }
          this.addCircle(displayX, displayY, displayR * 3.2 * pulse, cr, cg, cb, landingAlpha * 0.12);
          this.addCircle(displayX, displayY, displayR * 1.8 * pulse, cr, cg, cb, Math.min(clamped * 1.2, 0.6));
          this.addCircle(displayX, displayY, displayR * pulse, cr, cg, cb, Math.min(clamped * 1.5, 0.85));
          this.addCircle(displayX, displayY, displayR * 0.35, 1, 1, 1, Math.min(clamped * 2, 1));
        }
      }
      // =========================================================================
      // Scene: Cursor
      // =========================================================================
      drawCursorGL(cursor) {
        const cursorX = this.px(cursor.x);
        const cursorY = this.py(cursor.y);
        const r = this.ps(0.025);
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
            this.addCircle(ex, ey, r, ...COL.miss, alpha * 0.4);
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
      drawPlayingHUD(game, musicMuted, energy, gesture) {
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
        const keyLabels = ["A", "S", "D", "F"];
        const labelY = this.py(LANE_HIT_Y) + this.ps(0.06);
        const labelSize = this.ps(0.022);
        ctx.font = `bold ${labelSize}px 'Orbitron', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < LANE_COUNT; i++) {
          const laneX = this.px(LANE_CENTERS[i]);
          const [cr, cg, cb] = LANE_COLORS[i];
          const pressed = gesture.lanesPressed[i];
          ctx.fillStyle = pressed ? `rgba(${Math.round(cr * 255)}, ${Math.round(cg * 255)}, ${Math.round(cb * 255)}, 1)` : `rgba(${Math.round(cr * 255)}, ${Math.round(cg * 255)}, ${Math.round(cb * 255)}, 0.4)`;
          ctx.fillText(keyLabels[i], laneX, labelY);
        }
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
        const camBtnY = btnY + btnSize + 8;
        this.camDebugButtonRect = { x: btnX, y: camBtnY, w: btnSize, h: btnSize };
        ctx.fillStyle = this.camDebugVisible ? "#0ff" : "#555";
        ctx.font = `${btnSize * 0.7}px 'Orbitron', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("C", btnX + btnSize / 2, camBtnY + btnSize / 2);
        this.drawPowerHUD(game, camBtnY + btnSize + 8);
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
      // HUD: Power indicator
      // =========================================================================
      drawPowerHUD(game, topY) {
        if (game.power === "none") return;
        const ctx = this.hud;
        const pad = this.ps(0.02);
        const barW = this.ps(0.12);
        const barH = this.ps(0.012);
        const barX = this.w - pad - barW;
        const barY = topY;
        const POWER_NAMES = {
          slow_time: "SLOW TIME",
          shield: "SHIELD",
          score_boost: "SCORE x2"
        };
        const POWER_COLORS = {
          slow_time: "#0ff",
          shield: "#4af",
          score_boost: "#ff0"
        };
        const name = POWER_NAMES[game.power] ?? game.power.toUpperCase();
        const color = POWER_COLORS[game.power] ?? "#fff";
        ctx.font = `bold ${this.ps(0.013)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(name, barX + barW, barY);
        const labelH = this.ps(0.016);
        const countBarY = barY + labelH + 2;
        ctx.fillStyle = "#222";
        ctx.fillRect(barX, countBarY, barW, barH);
        const frac = game.powerTimeLeft / 5;
        ctx.fillStyle = color;
        ctx.fillRect(barX, countBarY, barW * Math.max(0, frac), barH);
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, countBarY, barW, barH);
      }
      // =========================================================================
      // HUD: Phase overlays
      // =========================================================================
      drawMenuHUD() {
        const cx = this.w / 2;
        const cy = this.h / 2;
        this.glowText("OPAD", cx, cy - this.ps(0.08), "#0ff", this.ps(0.08), true, 30);
        this.hud.font = `${this.ps(0.02)}px 'Orbitron', sans-serif`;
        this.hud.fillStyle = "#888";
        this.hud.textAlign = "center";
        this.hud.textBaseline = "middle";
        this.hud.fillText("TUNNEL FLIGHT", cx, cy);
        this.hud.font = `${this.ps(0.016)}px 'Orbitron', sans-serif`;
        this.hud.fillStyle = "#555";
        this.hud.fillText("TAP TO START", cx, cy + this.ps(0.08));
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
      // Camera debug overlay
      // =========================================================================
      /** Initialize references to the camera debug DOM elements. */
      initCamDebug(debugEl, overlayCanvas, previewVideo) {
        this._camDebugEl = debugEl;
        this._camPreviewVideo = previewVideo;
        const ctx = overlayCanvas.getContext("2d");
        if (ctx) this._camOverlay = ctx;
      }
      /** Toggle camera debug visibility and sync video stream. */
      toggleCamDebug(sourceVideo) {
        this.camDebugVisible = !this.camDebugVisible;
        if (!this._camDebugEl) return;
        this._camDebugEl.style.display = this.camDebugVisible ? "block" : "none";
        if (this.camDebugVisible && this._camPreviewVideo && sourceVideo.srcObject) {
          this._camPreviewVideo.srcObject = sourceVideo.srcObject;
        }
      }
      /** Draw hand landmarks on the camera debug overlay canvas. */
      drawCamDebugOverlay(landmarks, cursorIdx, clampMin, clampMax) {
        if (!this._camOverlay || !this._camDebugEl) return;
        if (!this.camDebugVisible) return;
        const canvas = this._camOverlay.canvas;
        const rect = this._camDebugEl.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
        const ctx = this._camOverlay;
        const cw = canvas.width;
        const ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
        const clampX = clampMin * cw;
        const clampY = clampMin * ch;
        const clampW = (clampMax - clampMin) * cw;
        const clampH = (clampMax - clampMin) * ch;
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(0, 0, cw, clampY);
        ctx.fillRect(0, clampY + clampH, cw, ch - clampY - clampH);
        ctx.fillRect(0, clampY, clampX, clampH);
        ctx.fillRect(clampX + clampW, clampY, cw - clampX - clampW, clampH);
        ctx.strokeStyle = "rgba(255, 255, 0, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(clampX, clampY, clampW, clampH);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255, 255, 0, 0.7)";
        ctx.font = "8px 'Orbitron', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("CLAMP", clampX + 3, clampY + 2);
        ctx.restore();
        if (!landmarks || landmarks.length < 21) return;
        ctx.save();
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
        ctx.lineWidth = 1.5;
        for (const [a, b] of HAND_CONNECTIONS) {
          const la = landmarks[a];
          const lb = landmarks[b];
          ctx.beginPath();
          ctx.moveTo(la.x * cw, la.y * ch);
          ctx.lineTo(lb.x * cw, lb.y * ch);
          ctx.stroke();
        }
        for (let i = 0; i < landmarks.length; i++) {
          const lm = landmarks[i];
          const px = lm.x * cw;
          const py = lm.y * ch;
          if (i === cursorIdx) continue;
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        const active = landmarks[cursorIdx];
        if (active) {
          const ax = active.x * cw;
          const ay = active.y * ch;
          ctx.strokeStyle = "#0ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ax, ay, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#0ff";
          ctx.beginPath();
          ctx.arc(ax, ay, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0ff";
          ctx.font = "10px 'Orbitron', sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          ctx.fillText("CURSOR", ax + 14, ay - 2);
        }
        ctx.restore();
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
    var canvas = document.getElementById("game");
    var hudCanvas = document.getElementById("hud");
    var video = document.getElementById("cam");
    var camDebugEl = document.getElementById("cam-debug");
    var camOverlay = document.getElementById("cam-overlay");
    var camPreview = document.getElementById("cam-preview");
    var audio = new AudioManager();
    var input = new InputManager(canvas, video);
    var renderer = new Renderer(canvas, hudCanvas);
    renderer.initCamDebug(camDebugEl, camOverlay, camPreview);
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
        game.update(now / 1e3, dt, input.gesture, audio);
      }
      if (musicMode && (game.phase === "results" || game.phase === "gameover")) {
        audio.stopMusic();
        musicStarted = false;
      }
      renderer.render(
        game,
        input.cursor,
        audio.musicMuted,
        input.landmarks,
        input.cursorLandmarkIndex,
        input.clampMin,
        input.clampMax,
        input.gesture
      );
      requestAnimationFrame(loop);
    }
    async function loadBeatmapAndMusic() {
      try {
        const resp = await fetch(BEATMAP_URL);
        if (resp.ok) {
          loadedBeatmap = convertLegacyBeatmap(await resp.json());
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
    function hitTestCamDebugButton(clientX, clientY) {
      const r = renderer.camDebugButtonRect;
      const margin = 10;
      return clientX >= r.x - margin && clientX <= r.x + r.w + margin && clientY >= r.y - margin && clientY <= r.y + r.h + margin;
    }
    function handleClick(e) {
      if (game.phase === "playing" && hitTestMuteButton(e.clientX, e.clientY)) {
        audio.toggleMusicMute();
        return;
      }
      if (game.phase === "playing" && hitTestCamDebugButton(e.clientX, e.clientY)) {
        renderer.toggleCamDebug(video);
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
        }, playSlash() {
        } };
        const cursor = { x: cursorX, y: cursorY };
        const nullGesture = { lanesPressed: [false, false, false, false] };
        game.tick(dt, nullGesture, nullAudio);
        renderer.render(game, cursor);
      },
      /** Render current state without advancing time. */
      renderFrame: (cursorX = 0.5, cursorY = 0.5) => {
        renderer.render(game, { x: cursorX, y: cursorY });
      }
    };
    requestAnimationFrame(loop);
  }
});
export default require_main();
//# sourceMappingURL=bundle.js.map
