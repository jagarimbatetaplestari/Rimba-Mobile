'use client';

export interface ActiveMediaInfo {
  type: 'music' | 'nature' | 'none';
  title: string;
  artist: string;
  album: string;
  isPlaying: boolean;
}

class MediaSessionManager {
  private keepAliveAudio: HTMLAudioElement | null = null;
  private isKeepAlivePlaying: boolean = false;
  private currentInfo: ActiveMediaInfo = {
    type: 'none',
    title: 'Rimba Sanctuary',
    artist: 'Rimba Mobile',
    album: 'Suaka Hening',
    isPlaying: false,
  };

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
      // Audio hening base64 WAV 1 detik
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
      .catch(() => {
        // Autoplay policy fallback
      });
  }

  private stopKeepAlive() {
    if (!this.keepAliveAudio || !this.isKeepAlivePlaying) return;
    this.keepAliveAudio.pause();
    this.isKeepAlivePlaying = false;
  }

  /**
   * Memperbarui informasi yang muncul di Apple Lock Screen & Control Center
   */
  updateSession(info: ActiveMediaInfo, handlers?: {
    onPlay?: () => void;
    onPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
  }) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    this.currentInfo = info;

    if (!info.isPlaying || info.type === 'none') {
      this.stopKeepAlive();
      navigator.mediaSession.playbackState = 'paused';
      return;
    }

    // Jika nature soundscape aktif, hidupkan keepalive agar audio context tidak mati di background
    if (info.type === 'nature') {
      this.startKeepAlive();
    } else {
      this.stopKeepAlive();
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: info.title,
        artist: info.artist || 'Rimba Sanctuary',
        album: info.album || 'Suara Alam & Hutan Rimba',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: '/logo-web.webp', sizes: '512x512', type: 'image/webp' },
        ],
      });

      navigator.mediaSession.playbackState = info.isPlaying ? 'playing' : 'paused';

      if (handlers?.onPlay) {
        navigator.mediaSession.setActionHandler('play', handlers.onPlay);
      }
      if (handlers?.onPause) {
        navigator.mediaSession.setActionHandler('pause', handlers.onPause);
      }
      if (handlers?.onNext) {
        navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
      }
      if (handlers?.onPrev) {
        navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
      }
    } catch (err) {
      console.warn('[MediaSessionManager] Gagal update MediaSession:', err);
    }
  }

  clear() {
    this.stopKeepAlive();
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }
}

export const mediaSessionManager = new MediaSessionManager();
