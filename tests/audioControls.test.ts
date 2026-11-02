import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';

vi.mock('@/lib/mobile/nativeBridge', () => ({ hapticLight: vi.fn(), hapticMedium: vi.fn() }));
vi.mock('@/lib/i18n/translations', () => ({
  useTranslation: () => ({ lang: 'en' }),
  translateSoundscape: (track: unknown) => track,
  translateMusicTrack: (track: { title: string }) => track.title,
}));

vi.mock('@/lib/audio/mediaSessionManager', () => ({
  mediaSessionManager: { updateMusicSession: vi.fn(), updateNatureSession: vi.fn() },
}));

class Param {
  value = 1;
  setValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
  cancelScheduledValues() {}
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
}
class AudioNodeFake {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  connections: unknown[] = [];
  disconnected = false;
  stopped = false;
  connect(destination: unknown) { this.connections.push(destination); }
  disconnect() { this.disconnected = true; }
  start() {}
  stop() { this.stopped = true; }
}
class ContextFake {
  static instances: ContextFake[] = [];
  currentTime = 0;
  sampleRate = 10;
  state = 'suspended';
  destination = {};
  gains: AudioNodeFake[] = [];
  sources: AudioNodeFake[] = [];
  mediaSources: AudioNodeFake[] = [];
  constructor() { ContextFake.instances.push(this); }
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createGain() { const node = new AudioNodeFake(); this.gains.push(node); return node; }
  createMediaElementSource() { const node = new AudioNodeFake(); this.mediaSources.push(node); return node; }
  createBufferSource() { const node = new AudioNodeFake(); this.sources.push(node); return node; }
  createBiquadFilter() { return new AudioNodeFake(); }
  createOscillator() { const node = new AudioNodeFake(); this.sources.push(node); return node; }
  createBuffer() { return { getChannelData: () => new Float32Array(20) }; }
}
class IOSAudio extends EventTarget {
  static instances: IOSAudio[] = [];
  muted = false;
  paused = true;
  src = '';
  currentTime = 0;
  // iOS keeps element volume at 1 regardless of script assignments.
  get volume() { return 1; }
  set volume(_value: number) {}
  constructor() { super(); IOSAudio.instances.push(this); }
  setAttribute() {}
  play = vi.fn(async () => { this.paused = false; });
  pause() { this.paused = true; }
}

beforeEach(() => {
  vi.resetModules();
  ContextFake.instances = [];
  IOSAudio.instances = [];
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  vi.stubGlobal('window', Object.assign(new EventTarget(), { AudioContext: ContextFake, localStorage: storage }));
  vi.stubGlobal('Audio', IOSAudio);
  vi.stubGlobal('localStorage', storage);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function setupMusic() {
  const { usePreferencesStore: prefs } = await import('@/lib/settings/usePreferencesStore');
  const { musicPlayer: player, RIMBA_PLAYLIST: tracks } = await import('@/lib/audio/musicPlayer');
  return { prefs, player, tracks, audio: IOSAudio.instances[0] };
}

describe('iOS music controls', () => {
  it.each(['context', 'source'])('keeps playback and hard mute available if Web Audio %s initialization fails', async (failure) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class UnavailableContext extends ContextFake {
      constructor() {
        if (failure === 'context') throw new Error('Audio context unavailable');
        super();
      }
      createMediaElementSource(): never { throw new Error('Media element routing unavailable'); }
    }
    Object.assign(window, { AudioContext: UnavailableContext });
    const { player, tracks, audio } = await setupMusic();
    expect(() => player.playTrack(tracks[0])).not.toThrow();
    await Promise.resolve();
    expect(audio.play).toHaveBeenCalled();
    player.toggleMute();
    expect(audio.muted).toBe(true);
    if (failure === 'source') expect(ContextFake.instances[0].close).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps an initial stored zero volume silent through track selection', async () => {
    const { usePreferencesStore: prefs } = await import('@/lib/settings/usePreferencesStore');
    prefs.getState().setAmbientMusicVolume(0);
    const { musicPlayer: player, RIMBA_PLAYLIST: tracks } = await import('@/lib/audio/musicPlayer');
    player.playTrack(tracks[0]);
    expect(player.getState().volume).toBe(0);
    expect(IOSAudio.instances[0].muted).toBe(true);
    expect(ContextFake.instances[0].gains[0].gain.value).toBe(0);
  });

  it('adjusts audible volume through one reused Web Audio path when element volume is ignored', async () => {
    const { player, tracks, audio } = await setupMusic();
    player.playTrack(tracks[0]);
    await Promise.resolve();
    player.setVolume(0.2);
    const ctx = ContextFake.instances[0];
    expect(ctx).toBeDefined();
    expect(ctx.gains[0].gain.value).toBe(0.2);
    expect(audio.volume).toBe(1);
    expect(ctx.mediaSources[0].connections).toContain(ctx.gains[0]);
    expect(ctx.gains[0].connections).toContain(ctx.destination);
    player.next();
    await Promise.resolve();
    player.togglePlay();
    player.togglePlay();
    expect(ContextFake.instances).toHaveLength(1);
    expect(ctx.mediaSources).toHaveLength(1);
    expect(ctx.resume).toHaveBeenCalled();
  });

  it('hard mutes and preserves mute across track changes and playback restart', async () => {
    const { player, tracks, audio } = await setupMusic();
    player.toggleMute();
    player.playTrack(tracks[0]);
    await Promise.resolve();
    expect(audio.muted).toBe(true);
    player.next();
    await Promise.resolve();
    player.stop();
    player.togglePlay();
    await Promise.resolve();
    expect(audio.muted).toBe(true);
    expect(ContextFake.instances[0].gains[0].gain.value).toBe(0);
    player.toggleMute();
    expect(audio.muted).toBe(false);
    expect(ContextFake.instances[0].gains[0].gain.value).toBe(0.5);
  });

  it('applies persisted and changed music preferences while master disable always stays silent', async () => {
    const { player, tracks, audio, prefs } = await setupMusic();
    prefs.getState().setAmbientMusicVolume(25);
    player.playTrack(tracks[0]);
    await Promise.resolve();
    expect(ContextFake.instances[0]?.gains[0].gain.value).toBe(0.25);
    prefs.getState().setMasterAudioEnabled(false);
    expect(audio.muted).toBe(true);
    player.setVolume(0.8);
    player.toggleMute();
    player.toggleMute();
    expect(audio.muted).toBe(true);
    expect(ContextFake.instances[0].gains[0].gain.value).toBe(0);
    prefs.getState().setMasterAudioEnabled(true);
    expect(audio.muted).toBe(false);
    prefs.getState().setAmbientMusicEnabled(false);
    expect(audio.muted).toBe(true);
  });
});

describe('nature audio controls', () => {
  it('starts muted when muted before first playback and keeps mute across track changes', async () => {
    const { soundscapeManager: player } = await import('@/lib/audio/soundscapes');
    player.toggleMute();
    player.play('rain');
    const ctx = ContextFake.instances[0];
    expect(ctx.gains[0].gain.value).toBe(0);
    const oldSources = [...ctx.sources];
    player.play('wind');
    expect(oldSources.every(source => source.stopped && source.disconnected)).toBe(true);
    expect(ctx.gains[0].gain.value).toBe(0);
    player.toggleMute();
    expect(ctx.gains[0].gain.value).toBe(0.35);
    player.stop();
  });

  it('immediately silences active nature audio when global audio is disabled', async () => {
    const { usePreferencesStore: prefs } = await import('@/lib/settings/usePreferencesStore');
    const { soundscapeManager: player } = await import('@/lib/audio/soundscapes');
    player.play('rain');
    prefs.getState().setMasterAudioEnabled(false);
    expect(ContextFake.instances[0].gains[0].gain.value).toBe(0);
    player.setVolume(0.8);
    player.toggleMute();
    player.toggleMute();
    expect(ContextFake.instances[0].gains[0].gain.value).toBe(0);
    prefs.getState().setMasterAudioEnabled(true);
    expect(ContextFake.instances[0].gains[0].gain.value).toBe(0.8);
    player.stop();
  });
});

it('silences an already ringing sound effect when master audio or sound effects are disabled', async () => {
  const { usePreferencesStore: prefs } = await import('@/lib/settings/usePreferencesStore');
  const { soundManager } = await import('@/lib/audio/sounds');
  soundManager.playZenBell();
  const ctx = ContextFake.instances[0];
  const master = ctx.gains.find(gain => gain.connections.includes(ctx.destination));
  prefs.getState().setMasterAudioEnabled(false);
  expect(master?.gain.value).toBe(0);
  prefs.getState().setMasterAudioEnabled(true);
  expect(master?.gain.value).toBe(1);
  prefs.getState().setSoundFxEnabled(false);
  expect(master?.gain.value).toBe(0);
});

it('shows mute and lets the capsule unmute when only music is active', async () => {
  const { player, tracks } = await setupMusic();
  const { UnifiedAudioCapsule } = await import('@/components/hud/UnifiedAudioCapsule');
  player.playTrack(tracks[0]);
  await Promise.resolve();
  let view: ReturnType<typeof create>;
  act(() => { view = create(React.createElement(UnifiedAudioCapsule)); });
  act(() => { player.toggleMute(); });
  expect(view!.root.findByType('button').props['aria-label']).toBe('Unmute Audio');
  act(() => { view!.root.findByType('button').props.onClick({ stopPropagation() {} }); });
  expect(player.getState().isMuted).toBe(false);
  act(() => view!.unmount());
});
