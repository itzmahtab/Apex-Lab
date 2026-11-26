"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Original background anthem, synthesised live with Web Audio. No audio files, no third-party music.
 * 128 BPM in D minor: kick + hats, an engine-like detuned saw drone that "revs" every 8 bars, a
 * 16th-note bass arpeggio, and broad chord stabs over i–VI–III–VII (Dm–B♭–F–C).
 * Browsers block audio until the visitor interacts, so it starts off; the choice is remembered and,
 * if it was on, resumes at the first tap/click/keypress of the next visit.
 */

const BPM = 128, STEP = 60 / BPM / 4; // 16th-note length in seconds
const PREF = "apexlab:sound";
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
// D minor progression, one chord per bar (root MIDI notes for bass, triads for stabs)
const BARS = [
  { bass: 38, chord: [62, 65, 69] }, // Dm
  { bass: 34, chord: [62, 65, 70] }, // B♭
  { bass: 41, chord: [60, 65, 69] }, // F
  { bass: 36, chord: [60, 64, 67] }, // C
];
const ARP = [0, 12, 7, 12, 3, 12, 7, 15, 0, 12, 7, 12, 5, 12, 7, 17]; // offsets over the bass root

class Engine {
  ctx: AudioContext;
  master: GainNode;
  private drone: { oscs: OscillatorNode[]; filter: BiquadFilterNode };
  private noise: AudioBuffer;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp).connect(this.ctx.destination);

    // engine drone: two detuned saws through a slowly breathing low-pass
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 380; filter.Q.value = 6;
    const g = this.ctx.createGain(); g.gain.value = 0.09;
    filter.connect(g).connect(this.master);
    const oscs = [0, 7].map((cents) => {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = midi(26); o.detune.value = cents;
      o.connect(filter); o.start();
      return o;
    });
    const lfo = this.ctx.createOscillator(), lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.06; lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
    this.drone = { oscs, filter };

    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  private kick(t: number) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.34);
  }
  private hat(t: number, open = false) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = "highpass"; f.frequency.value = 7000;
    g.gain.setValueAtTime(open ? 0.12 : 0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.16 : 0.04));
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 0.2);
  }
  private bass(t: number, note: number) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = "square"; o.frequency.value = midi(note);
    f.type = "lowpass"; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(260, t + STEP * 0.9);
    g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 0.95);
    o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + STEP);
  }
  private stab(t: number, notes: number[], len: number) {
    for (const n of notes) for (const det of [-9, 9]) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = midi(n); o.detune.value = det;
      const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2400;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + len + 0.05);
    }
  }
  private rev(t: number) {
    // engine pull: the drone pitch climbs through the bar, then drops back
    for (const o of this.drone.oscs) {
      o.frequency.setValueAtTime(midi(26), t);
      o.frequency.exponentialRampToValueAtTime(midi(38), t + STEP * 14);
      o.frequency.exponentialRampToValueAtTime(midi(26), t + STEP * 16);
    }
    this.drone.filter.Q.setValueAtTime(12, t); this.drone.filter.Q.linearRampToValueAtTime(6, t + STEP * 16);
  }

  private schedule = () => {
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const t = this.nextTime, s = this.step % 16, bar = Math.floor(this.step / 16);
      const chord = BARS[bar % 4]!;
      const section = Math.floor(bar / 8) % 2; // alternate 8-bar sections: build / full
      if (s % 4 === 0) this.kick(t);
      if (s % 4 === 2) this.hat(t, section === 1 && s === 14);
      if (section === 1 && s % 2 === 1) this.hat(t);
      this.bass(t, chord.bass + ARP[s]!);
      if (s === 0) this.stab(t, chord.chord, section ? STEP * 6 : STEP * 3);
      if (section === 1 && (s === 6 || s === 10)) this.stab(t, chord.chord.map((n) => n + 12), STEP * 2);
      if (s === 0 && bar % 8 === 7) this.rev(t);
      this.step++; this.nextTime += STEP;
    }
  };

  async start() {
    await this.ctx.resume();
    if (!this.timer) { this.nextTime = this.ctx.currentTime + 0.05; this.timer = setInterval(this.schedule, 25); }
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.4);
  }
  stop() {
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
    setTimeout(() => { if (this.timer) { clearInterval(this.timer); this.timer = null; } void this.ctx.suspend(); }, 600);
  }
}

const readPref = () => { try { return localStorage.getItem(PREF) === "on"; } catch { return false; } };
const writePref = (on: boolean) => { try { localStorage.setItem(PREF, on ? "on" : "off"); } catch { /* storage blocked */ } };

export function Soundtrack() {
  const engine = useRef<Engine | null>(null);
  const [on, setOn] = useState(false);

  const play = useCallback(async () => {
    try {
      engine.current ??= new Engine();
      await engine.current.start();
      setOn(true); writePref(true);
    } catch { setOn(false); }
  }, []);
  const stop = useCallback(() => { engine.current?.stop(); setOn(false); writePref(false); }, []);

  // returning visitor who left the sound on: resume at the first interaction (browsers require one)
  useEffect(() => {
    if (!readPref()) return;
    const go = () => { void play(); remove(); };
    const remove = () => ["pointerdown", "keydown"].forEach((e) => document.removeEventListener(e, go));
    ["pointerdown", "keydown"].forEach((e) => document.addEventListener(e, go, { once: true }));
    return remove;
  }, [play]);
  useEffect(() => () => { engine.current?.stop(); }, []);

  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); if (on) stop(); else void play(); }} aria-pressed={on}
      aria-label={on ? "Mute background music" : "Play background music"}
      className="fixed bottom-4 right-4 z-[500] flex h-11 items-center gap-2 rounded-lg border-2 border-border-strong bg-bg px-3 text-[11px] uppercase text-fg shadow-[4px_4px_0_var(--color-blood)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-blood)] active:translate-y-px sm:bottom-6 sm:right-6">
      <span className="flex h-4 items-end gap-[3px]" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`w-[3px] bg-accent ${on ? "eq-bar" : ""}`} style={{ height: on ? undefined : "4px", animationDelay: `${i * 0.13}s` }} />
        ))}
      </span>
      <span className="mono hidden font-bold tracking-wider sm:inline">{on ? "Sound on" : "Sound off"}</span>
      {on ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden><path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" /></svg>
      )}
    </button>
  );
}
