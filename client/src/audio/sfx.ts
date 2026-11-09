/**
 * Âm thanh tổng hợp bằng WebAudio: không cần file, tải tức thì.
 * GĐ7 có thể thay bằng file CC0 từ Kenney nếu muốn chân thật hơn.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;

  constructor() {
    // Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên của người dùng.
    const unlock = () => {
      this.ensure();
      void this.ctx?.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    const len = Math.floor(this.ctx.sampleRate * 0.1);
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  private tone(freqStart: number, freqEnd: number, dur: number, gain: number, type: OscillatorType): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private click(freq: number, dur: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** Tiếng "pop" khi bóng nhựa chạm vợt cứng: tiếng click sáng + tông rơi nhanh. */
  paddle(power: number, perfect: boolean): void {
    const base = perfect ? 1250 : 1000;
    this.click(2400, 0.05, 0.5 + power * 0.4);
    this.tone(base, base * 0.45, 0.07, 0.35, 'triangle');
    if (perfect) this.tone(1800, 1700, 0.12, 0.08, 'sine');
  }

  bounce(speed: number): void {
    const v = Math.min(1, speed / 8);
    this.click(900, 0.04, 0.15 + v * 0.25);
    this.tone(320, 180, 0.05, 0.12 * v + 0.04, 'sine');
  }

  net(): void {
    this.click(300, 0.12, 0.35);
  }
}
