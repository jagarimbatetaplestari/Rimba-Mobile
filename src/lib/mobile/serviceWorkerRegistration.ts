'use client';

/**
 * Registers the Rimba Service Worker in browser client environments for offline 3D caching.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[Rimba PWA] Service Worker registered successfully:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[Rimba PWA] New content is available; please refresh to update.');
              } else {
                console.log('[Rimba PWA] Content is cached for offline use.');
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[Rimba PWA] Service Worker registration failed:', err);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register);
  }
}
