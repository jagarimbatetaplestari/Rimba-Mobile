'use client';
import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { consumeNativeWidgetAction, listenForNativeWidgetActions } from './widgetBridge';
import { parseWidgetAction } from './widgetActions';

let launchURLChecked = false;

export function useNativeWidgetActions(ready: boolean) {
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const queued = useRef<{ url: string; time: number } | null>(null);
  const deliver = useRef((url: string) => {
    if (!parseWidgetAction(url)) return;
    if (!readyRef.current) { queued.current = { url, time: Date.now() }; return; }
    window.dispatchEvent(new CustomEvent('rimba:deep_link', { detail: { url } }));
  });
  const consuming = useRef(false);
  const consumeAgain = useRef(false);
  const consume = useRef(async () => {
    if (!readyRef.current) return;
    if (consuming.current) { consumeAgain.current = true; return; }
    consuming.current = true;
    try {
      const url = await consumeNativeWidgetAction();
      if (url) deliver.current(url);
    } finally {
      consuming.current = false;
      if (consumeAgain.current) { consumeAgain.current = false; void consume.current(); }
    }
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;
    let disposed = false;
    const links = App.addListener('appUrlOpen', ({ url }) => { if (!disposed) deliver.current(url); });
    const state = App.addListener('appStateChange', ({ isActive }) => { if (isActive && !disposed) void consume.current(); });
    const intents = listenForNativeWidgetActions(() => { if (!disposed) void consume.current(); });
    if (!launchURLChecked) {
      void App.getLaunchUrl().then(value => {
        if (disposed) return;
        launchURLChecked = true;
        if (value?.url) deliver.current(value.url);
      }).catch(() => {});
    }
    return () => {
      disposed = true;
      void links.then(h => h.remove()).catch(() => {});
      void state.then(h => h.remove()).catch(() => {});
      void intents.then(h => h?.remove()).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const action = queued.current;
    queued.current = null;
    if (action && Date.now() - action.time < 300_000) deliver.current(action.url);
    void consume.current();
  }, [ready]);
}
