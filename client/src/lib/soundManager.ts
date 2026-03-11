type SoundName = 'click' | 'complete' | 'error' | 'assign' | 'create';

// Simple synthesized sounds using Web Audio API
class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 0.3;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(name: SoundName) {
    if (this.muted) return;

    try {
      const ctx = this.getContext();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.value = this.volume;

      switch (name) {
        case 'click':
          this.playTone(ctx, gain, 800, 0.05, 'square');
          break;
        case 'complete':
          this.playChime(ctx, gain, [523, 659, 784], 0.15);
          break;
        case 'error':
          this.playTone(ctx, gain, 200, 0.2, 'sawtooth');
          break;
        case 'assign':
          this.playChime(ctx, gain, [440, 554], 0.1);
          break;
        case 'create':
          this.playChime(ctx, gain, [392, 494, 587, 784], 0.12);
          break;
      }
    } catch {
      // Audio not available
    }
  }

  private playTone(
    ctx: AudioContext,
    gain: GainNode,
    freq: number,
    duration: number,
    type: OscillatorType
  ) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);

    gain.gain.setValueAtTime(this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playChime(ctx: AudioContext, gain: GainNode, freqs: number[], noteLength: number) {
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const noteGain = ctx.createGain();
      noteGain.connect(gain);
      noteGain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime + i * noteLength);
      noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * noteLength + noteLength);

      osc.connect(noteGain);
      osc.start(ctx.currentTime + i * noteLength);
      osc.stop(ctx.currentTime + i * noteLength + noteLength + 0.05);
    });
  }
}

export const soundManager = new SoundManager();
