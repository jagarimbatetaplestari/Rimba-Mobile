'use client';

export interface ActiveMusicInfo {
  title: string;
  artist: string;
  album: string;
  categoryLabel?: string;
}

export interface ActiveNatureInfo {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface MusicHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export interface NatureHandlers {
  onPlay?: () => void;
  onPause?: () => void;
}

class MediaSessionManager {
  private keepAliveAudio: HTMLAudioElement | null = null;
  private isKeepAlivePlaying: boolean = false;

  private activeMusic: ActiveMusicInfo | null = null;
  private isMusicPlaying: boolean = false;
  private musicHandlers?: MusicHandlers;

  private activeNature: ActiveNatureInfo | null = null;
  private isNaturePlaying: boolean = false;
  private natureHandlers?: NatureHandlers;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initKeepAlive();
    }
  }

  /**
   * Menginisialisasi audio loop hening berdurasi pendek untuk menjaga agar
   * iOS WKWebView tidak menghentikan AudioContext saat layar iPhone terkunci.
   */
  private initKeepAlive() {
    if (this.keepAliveAudio) return;
    try {
      const silentWavBase64 =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      this.keepAliveAudio = new Audio(silentWavBase64);
      this.keepAliveAudio.loop = true;
      this.keepAliveAudio.volume = 0.001; // nyaris senyap
      this.keepAliveAudio.setAttribute('playsinline', 'true');
      this.keepAliveAudio.setAttribute('webkit-playsinline', 'true');
    } catch {
      // Fallback
    }
  }

  private startKeepAlive() {
    if (!this.keepAliveAudio || this.isKeepAlivePlaying) return;
    this.keepAliveAudio
      .play()
      .then(() => {
        this.isKeepAlivePlaying = true;
      })
      .catch(() => {});
  }

  private stopKeepAlive() {
    if (!this.keepAliveAudio || !this.isKeepAlivePlaying) return;
    this.keepAliveAudio.pause();
    this.isKeepAlivePlaying = false;
  }

  updateMusicSession(
    track: ActiveMusicInfo | null,
    isPlaying: boolean,
    handlers?: MusicHandlers
  ) {
    this.activeMusic = track;
    this.isMusicPlaying = isPlaying;
    if (handlers) this.musicHandlers = handlers;
    this.renderSession();
  }

  updateNatureSession(
    track: ActiveNatureInfo | null,
    isPlaying: boolean,
    handlers?: NatureHandlers
  ) {
    this.activeNature = track;
    this.isNaturePlaying = isPlaying;
    if (handlers) this.natureHandlers = handlers;
    this.renderSession();
  }

  private renderSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const hasMusic = Boolean(this.activeMusic && this.isMusicPlaying);
    const hasNature = Boolean(this.activeNature && this.isNaturePlaying);

    if (!hasMusic && !hasNature) {
      this.stopKeepAlive();
      navigator.mediaSession.playbackState = 'paused';
      return;
    }

    // Keepalive diperlukan agar Web Audio sintetis alam tidak dimatikan iOS saat layar terkunci
    if (hasNature) {
      this.startKeepAlive();
    } else {
      this.stopKeepAlive();
    }

    let title = 'Rimba Sanctuary';
    let artist = 'Rimba Focus & Peace';
    let album = 'Suaka Rimba';

    if (hasMusic && hasNature) {
      const nName = this.activeNature?.name.split(' ')[0] || 'Alam';
      const nIcon = this.activeNature?.icon || '🌧️';
      title = `${nIcon} ${nName} + ${this.activeMusic?.title}`;
      artist = 'Rimba Nature & Lo-Fi Mix';
      album = 'Dual-Track Sanctuary Mixer';
    } else if (hasMusic) {
      title = this.activeMusic?.title || 'Musik Fokus';
      artist = 'Rimba Lo-Fi & Ambient';
      album = this.activeMusic?.album || 'Rimba Sanctuary';
    } else if (hasNature) {
      title = `${this.activeNature?.icon || '🌲'} ${this.activeNature?.name}`;
      artist = 'Rimba Nature Soundscape';
      album = 'Suara Suaka Rimba';
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: '/logo-web.webp', sizes: '512x512', type: 'image/webp' },
        ],
      });

      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('play', () => {
        if (this.musicHandlers?.onPlay) this.musicHandlers.onPlay();
        if (this.natureHandlers?.onPlay) this.natureHandlers.onPlay();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.musicHandlers?.onPause) this.musicHandlers.onPause();
        if (this.natureHandlers?.onPause) this.natureHandlers.onPause();
      });

      if (this.musicHandlers?.onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', this.musicHandlers.onNext);
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      if (this.musicHandlers?.onPrev) {
        navigator.mediaSession.setActionHandler('previoustrack', this.musicHandlers.onPrev);
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    } catch (err) {
      console.warn('[MediaSessionManager] Gagal update MediaSession:', err);
    }
  }

  clear() {
    this.stopKeepAlive();
    this.activeMusic = null;
    this.isMusicPlaying = false;
    this.activeNature = null;
    this.isNaturePlaying = false;
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }
}

export const mediaSessionManager = new MediaSessionManager();
