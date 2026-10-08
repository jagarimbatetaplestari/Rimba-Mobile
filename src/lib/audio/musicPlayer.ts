'use client';

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

export interface MusicPlayerState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

class MusicPlayerController {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.50;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio() {
    if (this.audio) return;
    this.audio = new Audio();
    this.audio.volume = this.volume;
    this.audio.preload = 'metadata';
    this.audio.setAttribute('playsinline', 'true');
    this.audio.setAttribute('webkit-playsinline', 'true');

    this.audio.addEventListener('ended', () => {
      this.next();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Music playback error:', e);
      this.isPlaying = false;
      this.notifyState();
    });
  }

  private updateMediaSession(track: MusicTrack) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: 'Rimba Nature & Lo-Fi',
        album: `${track.categoryLabel} Focus`,
        artwork: [
          { src: '/logo-web.webp', sizes: '512x512', type: 'image/webp' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (!this.isPlaying) this.togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.isPlaying) this.togglePlay();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.next();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.prev();
      });
    } catch (err) {
      // Ignore if MediaSession fails
    }
  }

  private notifyState() {
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
    };
  }

  playTrack(track: MusicTrack) {
    if (typeof window === 'undefined') return;
    this.initAudio();
    if (!this.audio) return;

    if (this.currentTrack?.id === track.id && this.isPlaying) {
      return;
    }

    this.currentTrack = track;
    this.audio.src = track.src;
    this.audio.volume = this.isMuted ? 0 : this.volume;

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

    if (this.isPlaying) {
      this.audio?.pause();
      this.isPlaying = false;
      this.notifyState();
    } else {
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
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    this.notifyState();
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
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
    this.notifyState();
  }
}

export const musicPlayer = new MusicPlayerController();
