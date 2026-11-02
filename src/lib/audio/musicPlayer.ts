import { mediaSessionManager } from './mediaSessionManager';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';

export interface MusicTrack {
  id: string;
  title: string;
  category: 'jazz' | 'chill' | 'ambient';
  categoryLabel: string;
  src: string;
  durationEstimate: string;
}

export const RIMBA_PLAYLIST: MusicTrack[] = [
  // 1. Deep Ambient Space (Default & Sanctuary Atmosphere)
  {
    id: 'amb_1',
    title: 'Embun Pagi Rimba',
    category: 'ambient',
    categoryLabel: 'Ambient',
    src: '/music/ambient/ambient_1.mp3',
    durationEstimate: '3:00',
  },
  {
    id: 'amb_2',
    title: 'Kabut Pegunungan',
    category: 'ambient',
    categoryLabel: 'Ambient',
    src: '/music/ambient/ambient_2.mp3',
    durationEstimate: '4:00',
  },
  {
    id: 'amb_3',
    title: 'Hening Lembah Pinus',
    category: 'ambient',
    categoryLabel: 'Ambient',
    src: '/music/ambient/ambient_3.mp3',
    durationEstimate: '5:45',
  },
  {
    id: 'amb_4',
    title: 'Desir Angin Dedaunan',
    category: 'ambient',
    categoryLabel: 'Ambient',
    src: '/music/ambient/ambient_4.mp3',
    durationEstimate: '2:25',
  },
  {
    id: 'amb_5',
    title: 'Langit Malam Berbintang',
    category: 'ambient',
    categoryLabel: 'Ambient',
    src: '/music/ambient/ambient_5.mp3',
    durationEstimate: '3:05',
  },

  // 2. Chill / Lo-Fi Beats
  {
    id: 'chill_1',
    title: 'Senja Santai',
    category: 'chill',
    categoryLabel: 'Lo-Fi',
    src: '/music/chill/chill_1.mp3',
    durationEstimate: '3:05',
  },
  {
    id: 'chill_3',
    title: 'Alur Fokus Menenangkan',
    category: 'chill',
    categoryLabel: 'Lo-Fi',
    src: '/music/chill/chill_3.mp3',
    durationEstimate: '3:30',
  },

  // 3. Jazz / Melodic Vibes
  {
    id: 'jazz_5',
    title: 'Melodi Hutan Kota',
    category: 'jazz',
    categoryLabel: 'Jazz',
    src: '/music/jazz/pogicity_music_005.mp3',
    durationEstimate: '3:45',
  },
];

export type MusicRepeatMode = 'all' | 'one' | 'off';

export interface MusicPlayerState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  repeatMode: MusicRepeatMode;
}

class MusicPlayerController {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private currentTrack: MusicTrack | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.50;
  private isMuted: boolean = false;
  private repeatMode: MusicRepeatMode = 'all';

  constructor() {
    if (typeof window !== 'undefined') {
      this.volume = Math.max(0, Math.min(1, usePreferencesStore.getState().ambientMusicVolume / 100));
      const stored = localStorage.getItem('rimba_music_repeat_mode');
      if (stored === 'all' || stored === 'one' || stored === 'off') {
        this.repeatMode = stored as MusicRepeatMode;
      }
      this.initAudio();
      usePreferencesStore.subscribe((prefs, previous) => {
        if (prefs.ambientMusicVolume !== previous.ambientMusicVolume) {
          this.volume = Math.max(0, Math.min(1, prefs.ambientMusicVolume / 100));
        }
        if (prefs.masterAudioEnabled !== previous.masterAudioEnabled ||
            prefs.ambientMusicEnabled !== previous.ambientMusicEnabled ||
            prefs.ambientMusicVolume !== previous.ambientMusicVolume) {
          this.applyVolume();
          this.notifyState();
        }
      });

      const unlock = () => {
        this.resumeContext();
        if (this.audio && this.isPlaying && this.audio.paused) {
          this.audio.play().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
    }
  }

  private initAudio() {
    if (this.audio) return;
    this.audio = new Audio();
    this.applyVolume();
    this.audio.preload = 'metadata';
    this.audio.setAttribute('playsinline', 'true');
    this.audio.setAttribute('webkit-playsinline', 'true');

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Music playback error:', e);
      this.isPlaying = false;
      this.notifyState();
    });
  }

  private resumeContext() {
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  private initAudioGraph() {
    if (!this.audio) return;
    if (!this.source) {
      const AudioCtx = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        let context: AudioContext | null = null;
        try {
          context = new AudioCtx();
          const gain = context.createGain();
          // One source per element; changing src keeps the same audio graph.
          const source = context.createMediaElementSource(this.audio);
          this.ctx = context;
          this.gain = gain;
          this.source = source;
          this.applyVolume();
          source.connect(gain);
          gain.connect(context.destination);
        } catch (error) {
          this.source?.disconnect();
          this.gain?.disconnect();
          context?.close().catch(() => {});
          this.ctx = null;
          this.gain = null;
          this.source = null;
          this.applyVolume();
          console.warn('Music volume routing unavailable:', error);
        }
      }
    }
    this.resumeContext();
  }

  private applyVolume() {
    const prefs = usePreferencesStore.getState();
    const effectiveVolume = prefs.masterAudioEnabled && prefs.ambientMusicEnabled && !this.isMuted
      ? this.volume : 0;
    if (this.audio) {
      // iOS ignores element.volume; muted still guarantees immediate silence.
      this.audio.muted = effectiveVolume === 0;
      this.audio.volume = this.gain ? 1 : effectiveVolume;
    }
    if (this.gain && this.ctx) {
      this.gain.gain.setValueAtTime(effectiveVolume, this.ctx.currentTime);
    }
  }

  private handleTrackEnded() {
    if (this.repeatMode === 'one') {
      if (this.audio) {
        this.audio.currentTime = 0;
        this.audio
          .play()
          .then(() => {
            this.isPlaying = true;
            this.notifyState();
          })
          .catch(() => {
            this.isPlaying = false;
            this.notifyState();
          });
      }
    } else if (this.repeatMode === 'all') {
      this.next();
    } else {
      // Repeat off: play next if not at the end of playlist; else stop
      if (!this.currentTrack || RIMBA_PLAYLIST.length === 0) return;
      const currentIndex = RIMBA_PLAYLIST.findIndex(
        (t) => t.id === this.currentTrack?.id
      );
      if (currentIndex >= 0 && currentIndex < RIMBA_PLAYLIST.length - 1) {
        this.playTrack(RIMBA_PLAYLIST[currentIndex + 1]);
      } else {
        this.stop();
      }
    }
  }

  private updateMediaSession(track: MusicTrack) {
    mediaSessionManager.updateMusicSession(
      {
        title: track.title,
        artist: 'Rimba Nature & Lo-Fi',
        album: `${track.categoryLabel} Focus`,
        categoryLabel: track.categoryLabel,
      },
      this.isPlaying,
      {
        onPlay: () => {
          if (!this.isPlaying) this.togglePlay();
        },
        onPause: () => {
          if (this.isPlaying) this.togglePlay();
        },
        onNext: () => this.next(),
        onPrev: () => this.prev(),
      }
    );
  }

  private notifyState() {
    if (this.currentTrack) {
      this.updateMediaSession(this.currentTrack);
    } else {
      mediaSessionManager.updateMusicSession(null, false);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('rimba:music_update', {
          detail: this.getState(),
        })
      );
    }
  }

  getState(): MusicPlayerState {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      volume: this.volume,
      isMuted: this.isMuted,
      repeatMode: this.repeatMode,
    };
  }

  setRepeatMode(mode: MusicRepeatMode) {
    this.repeatMode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('rimba_music_repeat_mode', mode);
    }
    this.notifyState();
  }

  cycleRepeatMode(): MusicRepeatMode {
    const nextMode: MusicRepeatMode =
      this.repeatMode === 'all'
        ? 'one'
        : this.repeatMode === 'one'
        ? 'off'
        : 'all';
    this.setRepeatMode(nextMode);
    return nextMode;
  }

  playTrack(track: MusicTrack) {
    if (typeof window === 'undefined') return;
    const prefs = usePreferencesStore.getState();
    if (!prefs.masterAudioEnabled || !prefs.ambientMusicEnabled) return;

    this.initAudio();
    this.initAudioGraph();
    if (!this.audio) return;

    if (this.currentTrack?.id === track.id && this.isPlaying) {
      return;
    }

    this.currentTrack = track;
    this.audio.src = track.src;
    this.applyVolume();

    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.updateMediaSession(track);
        this.notifyState();
      })
      .catch((err) => {
        console.warn('Playback prevented or failed:', err);
        this.isPlaying = false;
        this.notifyState();
      });
  }

  togglePlay() {
    if (!this.currentTrack) {
      // Default to first track (Embun Pagi Rimba)
      this.playTrack(RIMBA_PLAYLIST[0]);
      return;
    }

    if (!this.audio) {
      this.initAudio();
    }

    const prefs = usePreferencesStore.getState();
    if (!this.isPlaying && (!prefs.masterAudioEnabled || !prefs.ambientMusicEnabled)) {
      return;
    }

    if (this.isPlaying) {
      this.audio?.pause();
      this.isPlaying = false;
      this.notifyState();
    } else {
      this.initAudioGraph();
      this.applyVolume();
      this.audio
        ?.play()
        .then(() => {
          this.isPlaying = true;
          this.notifyState();
        })
        .catch(() => {
          this.isPlaying = false;
          this.notifyState();
        });
    }
  }

  next() {
    if (RIMBA_PLAYLIST.length === 0) return;
    const currentIndex = this.currentTrack
      ? RIMBA_PLAYLIST.findIndex((t) => t.id === this.currentTrack?.id)
      : -1;
    const nextIndex = (currentIndex + 1) % RIMBA_PLAYLIST.length;
    this.playTrack(RIMBA_PLAYLIST[nextIndex]);
  }

  prev() {
    if (RIMBA_PLAYLIST.length === 0) return;
    const currentIndex = this.currentTrack
      ? RIMBA_PLAYLIST.findIndex((t) => t.id === this.currentTrack?.id)
      : 0;
    const prevIndex =
      (currentIndex - 1 + RIMBA_PLAYLIST.length) % RIMBA_PLAYLIST.length;
    this.playTrack(RIMBA_PLAYLIST[prevIndex]);
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    usePreferencesStore.getState().setAmbientMusicVolume(this.volume * 100);
    this.applyVolume();
    this.notifyState();
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.applyVolume();
    this.notifyState();
    return this.isMuted;
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.isPlaying = false;
    mediaSessionManager.updateMusicSession(null, false);
    this.notifyState();
  }
}

export const musicPlayer = new MusicPlayerController();
