/**
 * socratic-monorepo/apps/teacher-board/src/utils/audioFeedback.ts
 * Hệ thống Phản hồi Âm thanh Thủ tục Web Audio API (Procedural Micro-Acoustics)
 * Zero Asset (Không dùng file MP3 ngoại vi), Zero Latency (< 2ms)
 * Đặc tả theo Nghiên cứu Hoàn thiện Hệ thống STEM Holographic §5
 */

export class ProceduralAudioEngine {
  private static ctx: AudioContext | null = null;
  private static enabled: boolean = true;

  private static getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === "undefined") return null;
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.ctx) {
      try {
        this.ctx = new AudioContextClass();
      } catch {
        return null;
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  public static resetContextForTesting(): void {
    this.ctx = null;
  }

  /**
   * 1. Âm thanh "Snap Click" khi bắt dính vào điểm cực trị, điểm bất động, hoặc góc lượng giác
   * Sine wave quét nhanh tần số từ 1400Hz -> 300Hz trong 18ms, suy hao hàm mũ
   */
  public static playSnapClick(volume: number = 0.25): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.018);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.019);
    } catch {
      // Graceful fallback if Web Audio is restricted
    }
  }

  /**
   * 2. Âm thanh Cộng hưởng RLC & Sóng dừng (Resonance Acoustic Hum)
   * Tần số tính theo f = 1 / (2*pi*sqrt(L*C)), âm lượng tỉ lệ với độ tiệm cận cộng hưởng
   */
  public static playResonanceHum(frequency: number = 440, durationMs: number = 200, volume: number = 0.2): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const clampedFreq = Math.max(60, Math.min(3000, frequency));
      osc.type = "sine";
      osc.frequency.setValueAtTime(clampedFreq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec + 0.01);
    } catch {
      // Graceful fallback
    }
  }

  /**
   * 3. Âm thanh Bọt khí Phản ứng Hóa học (Bubble Burst)
   * Tạo tiếng lách tách ngẫu nhiên khi bọt khí sủi trong ống nghiệm
   */
  public static playBubbleBurst(volume: number = 0.15): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const baseFreq = 400 + Math.random() * 600;
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.035);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.036);
    } catch {
      // Graceful fallback
    }
  }

  /**
   * 4. Âm thanh Thành tựu / Khám phá Socratic (Eureka Chime)
   * Chùm hợp âm Arpeggio thanh thoát khi người dùng tìm ra thông số tối ưu
   */
  public static playEurekaChime(volume: number = 0.2): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6

      notes.forEach((freq, idx) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.06;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(volume, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.36);
      });
    } catch {
      // Graceful fallback
    }
  }
}
