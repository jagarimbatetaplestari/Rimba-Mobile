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
  private currentTrack: MusicTrack | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.50;
  private isMuted: boolean = false;
  private repeatMode: MusicRepeatMode = 'all';

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rimba_music_repeat_mode');
      if (stored === 'all' || stored === 'one' || stored === 'off') {
        this.repeatMode = stored as MusicRepeatMode;
      }
      this.initAudio();

      const unlock = () => {
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
    const prefs = typeof window !== 'undefined' ? usePreferencesStore.getState() : null;
    const effectiveVol = prefs && prefs.masterAudioEnabled && prefs.ambientMusicEnabled && !this.isMuted ? this.volume : 0;
    this.audio.volume = effectiveVol;
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
    if (!this.audio) return;

    if (this.currentTrack?.id === track.id && this.isPlaying) {
      return;
    }

    const effectiveVol = (prefs.masterAudioEnabled && prefs.ambientMusicEnabled && !this.isMuted) ? this.volume : 0;
    this.currentTrack = track;
    this.audio.src = track.src;
    this.audio.volume = effectiveVol;

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
      const effectiveVol = (prefs.masterAudioEnabled && prefs.ambientMusicEnabled && !this.isMuted) ? this.volume : 0;
      if (this.audio) {
        this.audio.volume = effectiveVol;
      }
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
    const prefs = usePreferencesStore.getState();
    const effectiveVol = (prefs.masterAudioEnabled && prefs.ambientMusicEnabled && !this.isMuted) ? this.volume : 0;
    if (this.audio) {
      this.audio.volume = effectiveVol;
    }
    this.notifyState();
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    const prefs = usePreferencesStore.getState();
    const effectiveVol = (prefs.masterAudioEnabled && prefs.ambientMusicEnabled && !this.isMuted) ? this.volume : 0;
    if (this.audio) {
      this.audio.volume = effectiveVol;
    }
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
