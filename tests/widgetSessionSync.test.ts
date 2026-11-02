import { beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({sync:vi.fn(),save:vi.fn()}));
vi.mock('../src/lib/mobile/widgetBridge',()=>({syncWidgetsWithSaveData:m.sync}));
vi.mock('../src/lib/mobile/nativeBridge',()=>({requestScreenWakeLock:vi.fn(),releaseScreenWakeLock:vi.fn()}));
vi.mock('../src/lib/mobile/notificationManager',()=>({cancelPendingFocusNotifications:vi.fn(),scheduleFocusCompletionNotification:vi.fn().mockResolvedValue(undefined)}));
vi.mock('../src/lib/supabase/cloudSync',()=>({scheduleDebouncedCloudSync:vi.fn(),syncProfileUpdate:vi.fn()}));
vi.mock('../src/lib/game/storage',async original=>({...await original<any>(),saveSaveData:m.save}));
import {useGameStore} from '../src/lib/game/useGameStore';
import {createInitialSaveData} from '../src/lib/game/storage';
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('localStorage',{getItem:()=>null,setItem:vi.fn(),removeItem:vi.fn()});useGameStore.setState({saveData:createInitialSaveData(),activeSession:null,devFastMode:false});});
it('publishes the newly started session, paused state, resumed deadline and cancellation',()=>{
 const store=()=>useGameStore.getState();
 store().setFocusSetup({minutes:25});store().startFocus();
 expect(store().activeSession?.duration_minutes).toBe(25);
 expect(m.sync.mock.lastCall?.[1]).toEqual(store().activeSession);
 store().pauseFocus();expect(m.sync.mock.lastCall?.[1].is_paused).toBe(true);
 store().resumeFocus();expect(m.sync.mock.lastCall?.[1].is_paused).toBe(false);
 store().abandonFocus();expect(m.sync.mock.lastCall?.[1]).toBeNull();
});
