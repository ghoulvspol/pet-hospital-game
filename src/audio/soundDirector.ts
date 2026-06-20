import type { GameState, HospitalFxKind } from '../game/simulation/types';

export class SoundDirector {
  private context?: AudioContext;
  private handledFxIds = new Set<number>();
  private enabled = true;
  private unlocked = false;

  public attach(simulation: EventTarget): void {
    const unlock = () => {
      const context = this.ensureContext();
      this.unlocked = Boolean(context);
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    simulation.addEventListener('statechange', (event) => {
      if (!this.enabled) {
        return;
      }

      this.playNewFx((event as CustomEvent<GameState>).detail);
    });
  }

  private playNewFx(state: GameState): void {
    for (const fx of state.fxEvents) {
      if (this.handledFxIds.has(fx.id)) {
        continue;
      }
      this.handledFxIds.add(fx.id);
      if (!this.unlocked) {
        continue;
      }
      this.play(fx.kind);
    }
  }

  private play(kind: HospitalFxKind): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (kind === 'build') {
      this.chime(context, [220, 330, 440], 0.075, 'triangle', 0.06);
      return;
    }

    if (kind === 'heal') {
      this.chime(context, [523.25, 659.25, 783.99], 0.09, 'sine', 0.05);
      return;
    }

    if (kind === 'upgrade') {
      this.chime(context, [392, 523.25, 659.25, 880], 0.07, 'square', 0.035);
      return;
    }

    if (kind === 'skill') {
      this.chime(context, [349.23, 440, 587.33], 0.08, 'triangle', 0.045);
      return;
    }

    this.warning(context);
  }

  private chime(context: AudioContext, notes: number[], step: number, type: OscillatorType, volume: number): void {
    const start = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start + index * step);
      gain.gain.setValueAtTime(0, start + index * step);
      gain.gain.linearRampToValueAtTime(volume, start + index * step + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + index * step + 0.18);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + index * step);
      oscillator.stop(start + index * step + 0.2);
    });
  }

  private warning(context: AudioContext): void {
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(180, start);
    oscillator.frequency.linearRampToValueAtTime(130, start + 0.16);
    gain.gain.setValueAtTime(0.045, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.24);
  }

  private ensureContext(): AudioContext | undefined {
    if (!this.context) {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        this.enabled = false;
        return undefined;
      }
      this.context = new AudioContextConstructor();
    }

    if (this.unlocked && this.context.state === 'suspended') {
      void this.context.resume();
    }

    return this.context;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
