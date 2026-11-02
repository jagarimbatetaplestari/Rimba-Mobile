import { expect,it,vi } from 'vitest';
vi.mock('../src/lib/mobile/nativeBridge',()=>({isNativeMobile:()=>false}));
import { validateRimbaBackup } from '../src/lib/game/backupManager';
import { makeScreenshotStorage } from '../scripts/native-screenshot-fixture.mjs';
it('uses valid fictional guest progress with no purchase or authenticated session',()=>{
 for(const language of ['en','id'])for(const scene of ['sanctuary','focus']){
  const values=makeScreenshotStorage(language,scene,new Date('2026-11-01T10:00:00Z'));
  const save=JSON.parse(values['rimba_save_v1:owner:guest']);
  const checked=validateRimbaBackup(save);expect(checked.isValid).toBe(true);
  expect(save.subscription?.isPro??false).toBe(false);
  expect(JSON.parse(values.rimba_auth_session).state.user.isGuest).toBe(true);
  expect(Object.keys(values).some(key=>key.startsWith('sb-'))).toBe(false);
  const positions=save.world_objects.map((o:any)=>o.grid_x+','+o.grid_y);
  expect(new Set(positions).size).toBe(positions.length);
  expect(save.focus_sessions.filter((s:any)=>s.status==='active')).toHaveLength(scene==='focus'?1:0);
 }
});
