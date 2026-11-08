import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useTourStore, getTourStorageKey } from '../src/lib/tour/useTourStore';

describe('useTourStore & GuidedTour invariants', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        for (const k of Object.keys(mockStorage)) delete mockStorage[k];
      },
    });

    useTourStore.setState({
      isTourActive: false,
      currentStepIndex: 0,
      currentOwner: 'guest',
    });
  });

  it('generates per-owner isolated storage keys', () => {
    expect(getTourStorageKey('guest')).toBe('rimba_tour_v1_guest');
    expect(getTourStorageKey('user-123')).toBe('rimba_tour_v1_user-123');
    expect(getTourStorageKey('')).toBe('rimba_tour_v1_guest');
    expect(getTourStorageKey(undefined)).toBe('rimba_tour_v1_guest');
  });

  it('manages tour step progression and prevents negative indexing', () => {
    const store = useTourStore.getState();
    store.startTour('user-alpha');

    expect(useTourStore.getState().isTourActive).toBe(true);
    expect(useTourStore.getState().currentStepIndex).toBe(0);
    expect(useTourStore.getState().currentOwner).toBe('user-alpha');

    // prev at 0 should stay 0
    useTourStore.getState().prevStep();
    expect(useTourStore.getState().currentStepIndex).toBe(0);

    // advance steps
    useTourStore.getState().nextStep();
    expect(useTourStore.getState().currentStepIndex).toBe(1);

    useTourStore.getState().nextStep();
    expect(useTourStore.getState().currentStepIndex).toBe(2);

    useTourStore.getState().prevStep();
    expect(useTourStore.getState().currentStepIndex).toBe(1);
  });

  it('marks tour completed upon skip and closes tour', () => {
    const store = useTourStore.getState();
    store.startTour('user-beta');

    expect(store.hasCompletedTour('user-beta')).toBe(false);
    useTourStore.getState().skipTour();

    expect(useTourStore.getState().isTourActive).toBe(false);
    expect(useTourStore.getState().hasCompletedTour('user-beta')).toBe(true);
    expect(mockStorage['rimba_tour_v1_user-beta']).toBe('true');
  });

  it('marks tour completed upon completeTour and closes tour', () => {
    const store = useTourStore.getState();
    store.startTour('guest');

    expect(store.hasCompletedTour('guest')).toBe(false);
    useTourStore.getState().completeTour();

    expect(useTourStore.getState().isTourActive).toBe(false);
    expect(useTourStore.getState().hasCompletedTour('guest')).toBe(true);
    expect(mockStorage['rimba_tour_v1_guest']).toBe('true');
  });

  it('resets tour for specific owner allowing replay without affecting others', () => {
    const store = useTourStore.getState();
    store.markTourCompleted('user-one');
    store.markTourCompleted('user-two');

    expect(store.hasCompletedTour('user-one')).toBe(true);
    expect(store.hasCompletedTour('user-two')).toBe(true);

    store.resetTourForOwner('user-one');
    expect(store.hasCompletedTour('user-one')).toBe(false);
    expect(store.hasCompletedTour('user-two')).toBe(true);
  });
});
