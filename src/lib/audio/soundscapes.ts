import { mediaSessionManager } from './mediaSessionManager';

export type SoundscapeType = 'rain' | 'wind' | 'river' | 'fire' | 'waves' | 'off';

export interface SoundscapeMeta {
  id: SoundscapeType;
  name: string;
  icon: string;
  description: string;
}

export const SOUNDSCAPES_LIST: SoundscapeMeta[] = [
  {
    id: 'rain',
    name: 'Hujan Rintik',
    icon: '🌧️',
    description: 'Derai hujan lembut menyentuh dedaunan hutan.',
  },
  {
    id: 'wind',
    name: 'Angin Pinus',
    icon: '🌲',
    description: 'Hembusan semilir angin sejuk di puncak pegunungan.',
  },
  {
    id: 'river',
    name: 'Aliran Sungai',
    icon: '💧',
    description: 'Gemericik sejuk aliran air melintasi bebatuan suaka.',
  },
  {
    id: 'fire',
    name: 'Api Unggun',
    icon: '🔥',
    description: 'Gemertak hangat kayu bakar di malam hari.',
  },
  {
    id: 'waves',
    name: 'Ombak Tenang',
    icon: '🌊',
    description: 'Deburan ombak lembut yang berulang secara ritmis.',
  },
];

class SoundscapeController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: SoundscapeType = 'off';
  private volume: number = 0.35;
  private activeNodes: (AudioNode | number)[] = [];
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private updateMediaSession(track: SoundscapeType) {
    if (track === 'off') {
      mediaSessionManager.clear();
      return;
    }

    const meta = SOUNDSCAPES_LIST.find((s) => s.id === track);
    if (!meta) return;

    mediaSessionManager.updateSession(
      {
        type: 'nature',
        title: `${meta.icon} ${meta.name}`,
        artist: 'Rimba Nature Soundscape',
        album: 'Suara Alam Suaka Rimba',
        isPlaying: true,
      },
      {
        onPause: () => this.stop(),
        onPlay: () => this.play(track),
      }
    );
  }

  getCurrentTrack(): SoundscapeType {
    return this.currentTrack;
  }

  getVolume(): number {
    return this.volume;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  stop(): void {
    this.activeNodes.forEach((node) => {
      if (typeof node === 'number') {
        clearInterval(node);
      } else {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // Clean disconnection
        }
      }
    });
    this.activeNodes = [];
    this.currentTrack = 'off';
    mediaSessionManager.clear();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rimba:soundscape_change', { detail: 'off' }));
    }
  }

  play(track: SoundscapeType): void {
    if (track === this.currentTrack && track !== 'off') return;
    this.stop();

    if (track === 'off') return;

    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    this.currentTrack = track;
    this.updateMediaSession(track);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rimba:soundscape_change', { detail: track }));
    }

    switch (track) {
      case 'rain':
        this.createRainSoundscape(ctx, this.masterGain);
        break;
      case 'wind':
        this.createWindSoundscape(ctx, this.masterGain);
        break;
      case 'river':
        this.createRiverSoundscape(ctx, this.masterGain);
        break;
      case 'fire':
        this.createFireSoundscape(ctx, this.masterGain);
        break;
      case 'waves':
        this.createWavesSoundscape(ctx, this.masterGain);
        break;
    }
  }

  // Generates 2 seconds of pink/white buffer noise
  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.25;
    }
    return buffer;
  }

  // 0. River Synthesizer (Dual resonant bandpass filtering with bubbling ripple LFO)
  private createRiverSoundscape(ctx: AudioContext, destination: GainNode): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx);
    noise.loop = true;

    // Filter 1: Low-body stream flow
    const filterLow = ctx.createBiquadFilter();
    filterLow.type = 'bandpass';
    filterLow.frequency.setValueAtTime(520, ctx.currentTime);
    filterLow.Q.setValueAtTime(1.8, ctx.currentTime);

    // Filter 2: High splash & ripple
    const filterHigh = ctx.createBiquadFilter();
    filterHigh.type = 'bandpass';
    filterHigh.frequency.setValueAtTime(1650, ctx.currentTime);
    filterHigh.Q.setValueAtTime(2.5, ctx.currentTime);

    // LFO for gentle bubbling modulation
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.35, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(220, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filterHigh.frequency);

    const gainLow = ctx.createGain();
    gainLow.gain.setValueAtTime(0.35, ctx.currentTime);

    const gainHigh = ctx.createGain();
    gainHigh.gain.setValueAtTime(0.25, ctx.currentTime);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.5, ctx.currentTime);

    noise.connect(filterLow);
    noise.connect(filterHigh);

    filterLow.connect(gainLow);
    filterHigh.connect(gainHigh);

    gainLow.connect(mainGain);
    gainHigh.connect(mainGain);

    mainGain.connect(destination);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filterLow, filterHigh, lfo, lfoGain, gainLow, gainHigh, mainGain);
  }

  // 1. Rain Synthesizer (Filtered pink noise with soft droplet variations)
  private createRainSoundscape(ctx: AudioContext, destination: GainNode): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start();

    this.activeNodes.push(noise, filter, gain);
  }

  // 2. Wind Synthesizer (Slowly modulating resonance filter)
  private createWindSoundscape(ctx: AudioContext, destination: GainNode): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, ctx.currentTime);
    filter.Q.setValueAtTime(3.2, ctx.currentTime);

    // LFO to slowly sweep wind frequency
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.18, ctx.currentTime); // ~5s cycle

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(160, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filter, lfo, lfoGain, gain);
  }

  // 3. Campfire Synthesizer (Warm low rumble + random crackles)
  private createFireSoundscape(ctx: AudioContext, destination: GainNode): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start();

    this.activeNodes.push(noise, filter, gain);

    // Random crackle generator
    const crackleInterval = window.setInterval(() => {
      if (Math.random() > 0.45) {
        const osc = ctx.createOscillator();
        const cGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800 + Math.random() * 1400, ctx.currentTime);

        cGain.gain.setValueAtTime(0.06 * Math.random(), ctx.currentTime);
        cGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

        osc.connect(cGain);
        cGain.connect(destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    }, 180);

    this.activeNodes.push(crackleInterval);
  }

  // 4. Ocean Waves Synthesizer (Periodic swell & fade)
  private createWavesSoundscape(ctx: AudioContext, destination: GainNode): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.1, ctx.currentTime);

    // LFO for periodic wave swell
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8s wave period

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.3, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(swellGain.gain);

    noise.connect(filter);
    filter.connect(swellGain);
    swellGain.connect(destination);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filter, lfo, lfoGain, swellGain);
  }
}

export const soundscapeManager = new SoundscapeController();
