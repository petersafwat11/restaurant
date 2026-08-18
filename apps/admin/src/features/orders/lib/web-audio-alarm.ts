/**
 * Web Audio POS Alarm Synthesizer for Restaurant Orders.
 *
 * Generates an unmistakable repeating restaurant ring tone (tri-tone chime loop)
 * entirely via Web Audio API oscillators and gain envelopes without external sound files.
 */

class WebAudioAlarmEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  /**
   * Resumes the AudioContext on user interaction if it was suspended by browser autoplay policy.
   */
  public async unlock(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        return (ctx.state as string) === 'running';
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  public isUnlocked(): boolean {
    const ctx = this.getAudioContext();
    return Boolean(ctx && ctx.state === 'running');
  }

  /**
   * Plucks a synthesized melodic bell note at a given frequency.
   */
  private playBellNote(ctx: AudioContext, freq: number, startAt: number, duration = 0.28): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startAt);

      // Attack and exponential natural decay
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(0.3, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startAt);
      osc.stop(startAt + duration + 0.05);
    } catch {
      // Audio context might be suspended or blocked
    }
  }

  /**
   * Plays a single iteration of the restaurant alert chime (3 rising tones: A5 -> C6 -> E6).
   */
  private playChimePattern(): void {
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    // 3-note pleasant but attention-grabbing restaurant chime
    this.playBellNote(ctx, 880, now, 0.25); // A5
    this.playBellNote(ctx, 1046.5, now + 0.14, 0.25); // C6
    this.playBellNote(ctx, 1318.5, now + 0.28, 0.45); // E6
  }

  /**
   * Starts playing the repeating alarm loop every 2.4 seconds until stopped.
   */
  public start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const tick = () => {
      if (!this.isPlaying) return;
      this.playChimePattern();
      this.loopTimer = setTimeout(tick, 2400);
    };

    // Try to unlock context if needed and start loop
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          tick();
        })
        .catch(() => {
          tick();
        });
    } else {
      tick();
    }
  }

  /**
   * Stops the repeating alarm loop.
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  public get running(): boolean {
    return this.isPlaying;
  }
}

export const orderAlarmAudio = new WebAudioAlarmEngine();
