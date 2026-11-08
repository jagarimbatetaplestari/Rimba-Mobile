import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { calculateFocusRewards, completeFocusSession, startFocusSession, getFocusedElapsedMs, getRemainingMs, getRemainingDisplaySeconds, getProgressRatio } from '../src/lib/game/sessionRules';
import { createInitialSaveData } from '../src/lib/game/storage';
import type { FocusSession } from '../src/types/game';
const start=new Date('2026-11-01T01:00:00Z');
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(start);});
afterEach(()=>vi.useRealTimers());
function elapsed(session:FocusSession,minutes:number){vi.setSystemTime(start.getTime()+minutes*60000);return session;}
it('does not complete a paused session even after its old deadline',()=>{const session=startFocusSession();elapsed(session,30);const result=completeFocusSession({...session,is_paused:true,paused_at:start.toISOString()},[]);expect(result.success).toBe(false);expect(result.newLedgerEntries).toEqual([]);});
it('does not count paused time as stopwatch focus',()=>{const session=startFocusSession({isStopwatch:true});elapsed(session,25);const result=completeFocusSession({...session,total_paused_ms:20*60000},[]);expect(result.updatedSession.duration_minutes).toBe(5);expect(result.rewardGold).toBe(5);expect(result.rewardXp).toBe(20);expect(result.newWorldObject?.focus_duration).toBe(5);});
it.each(['started_at','expected_end_at'])('rejects malformed %s before minting any reward',(field)=>{const session=startFocusSession();elapsed(session,30);const result=completeFocusSession({...session,[field]:'invalid-time'},[]);expect(result.success).toBe(false);expect(result.newLedgerEntries).toEqual([]);});
it('rejects a future start after the clock moves backwards',()=>{const session=startFocusSession({isStopwatch:true});vi.setSystemTime(start.getTime()-60000);expect(completeFocusSession(session,[]).success).toBe(false);});
it('rejects invalid pause accounting',()=>{const session=startFocusSession({isStopwatch:true});elapsed(session,25);expect(completeFocusSession({...session,total_paused_ms:NaN},[]).success).toBe(false);});
it('does not mint campfire bonus when the base reward is zero',()=>{const session=startFocusSession({durationSeconds:60});elapsed(session,1);const result=completeFocusSession({...session,campfire_room_code:'TEST'},[]);expect(result.rewardGold).toBe(0);expect(result.rewardXp).toBe(0);});
it('deduplicates reward and tree IDs when two devices replay the same session completion',()=>{const session=startFocusSession();elapsed(session,25);const a=completeFocusSession(session,[]);const b=completeFocusSession(session,[]);const ledger=new Map([...a.newLedgerEntries,...b.newLedgerEntries].map(entry=>[entry.id,entry]));expect(Array.from(ledger.values()).reduce((sum,entry)=>sum+(entry.currency==='gold'?entry.amount:0),0)).toBe(25);const trees=new Set([a.newWorldObject?.id,b.newWorldObject?.id]);expect(trees.size).toBe(1);});
it('does not grow a reward tree on a tile occupied after session start',()=>{const seed=createInitialSaveData();const occupied=seed.world_objects[0];const session=startFocusSession({targetTile:{grid_x:occupied.grid_x,grid_y:occupied.grid_y}});elapsed(session,25);const result=completeFocusSession(session,seed.world_objects,new Set(seed.world.unlocked_tiles));expect(result.success).toBe(true);expect(result.newWorldObject?.grid_x===occupied.grid_x&&result.newWorldObject?.grid_y===occupied.grid_y).toBe(false);});
it('does not grow a tree on a locked target tile',()=>{const seed=createInitialSaveData();const session=startFocusSession({targetTile:{grid_x:0,grid_y:0}});elapsed(session,25);const result=completeFocusSession(session,[],new Set(seed.world.unlocked_tiles));expect(result.newWorldObject).toBeDefined();expect(seed.world.unlocked_tiles).toContain(`${result.newWorldObject!.grid_x},${result.newWorldObject!.grid_y}`);});
it('rejects a repeat completion of the updated session',()=>{const session=startFocusSession();elapsed(session,25);const first=completeFocusSession(session,[]);expect(first.success).toBe(true);expect(completeFocusSession(first.updatedSession,[]).newLedgerEntries).toEqual([]);});
it('retains canonical rewards for ordinary 25-minute focus',()=>{const session=startFocusSession();elapsed(session,25);expect(completeFocusSession(session,[])).toMatchObject({success:true,rewardGold:25,rewardXp:100});expect(calculateFocusRewards(60)).toEqual({gold:65,xp:250});});
it('does not award a social bonus from an imported or stale room-code string',()=>{
 const session={...startFocusSession(),campfire_room_code:'forged-room'};elapsed(session,25);
 expect(completeFocusSession(session,[])).toMatchObject({rewardGold:25,rewardXp:100});
});
it('retains the 20 percent bonus for a verified canonical Campfire session',()=>{
 const session={...startFocusSession(),campfire_room_code:'verified-room'};elapsed(session,25);
 expect(completeFocusSession(session,[],undefined,true)).toMatchObject({rewardGold:30,rewardXp:120});
});
it('freezes elapsed display at pause time and subtracts earlier pauses',()=>{const session=startFocusSession({isStopwatch:true});elapsed(session,25);expect(getFocusedElapsedMs({...session,is_paused:true,paused_at:new Date(start.getTime()+5*60000).toISOString(),total_paused_ms:2*60000})).toBe(3*60000);});
it('renders invalid timing as zero instead of NaN',()=>{expect(getFocusedElapsedMs({...startFocusSession(),started_at:'broken'})).toBe(0);});
it('preserves exact remaining seconds across pause and resume without drift',()=>{
  // 5m session (300 seconds) started at t=0
  const session = startFocusSession({ durationSeconds: 300 });
  // Advance 10s -> remaining should be exactly 290s (4:50)
  vi.setSystemTime(start.getTime() + 10_000);
  expect(getRemainingDisplaySeconds(session)).toBe(290);
  expect(getRemainingMs(session)).toBe(290_000);

  // Pause at 4:50 (t=10s)
  const pausedNow = Date.now();
  const pausedSession: FocusSession = {
    ...session,
    is_paused: true,
    paused_at: new Date(pausedNow).toISOString(),
    paused_remaining_ms: getRemainingMs(session, pausedNow),
  };

  // Clock advances 5s to t=15s while paused
  vi.setSystemTime(start.getTime() + 15_000);
  // Remaining display MUST still be exactly 290s (4:50), not 285s (4:45)
  expect(getRemainingDisplaySeconds(pausedSession)).toBe(290);
  expect(getRemainingMs(pausedSession)).toBe(290_000);
  expect(getProgressRatio(pausedSession)).toBeCloseTo(10 / 300, 4);

  // User resumes at t=15s
  const resumeNow = Date.now();
  const pausedDuration = resumeNow - new Date(pausedSession.paused_at!).getTime();
  const remaining = pausedSession.paused_remaining_ms ?? Math.max(0, new Date(pausedSession.expected_end_at).getTime() - resumeNow);
  const resumedSession: FocusSession = {
    ...pausedSession,
    is_paused: false,
    paused_at: null,
    paused_remaining_ms: undefined,
    expected_end_at: new Date(resumeNow + remaining).toISOString(),
    total_paused_ms: (pausedSession.total_paused_ms || 0) + pausedDuration,
  };

  // Immediately on resume at t=15s, remaining MUST STILL BE 290s (4:50)
  expect(getRemainingDisplaySeconds(resumedSession)).toBe(290);
  expect(getRemainingMs(resumedSession)).toBe(290_000);
  expect(getProgressRatio(resumedSession)).toBeCloseTo(10 / 300, 4);

  // 1s later at t=16s, countdown decrements to 289s (4:49)
  vi.setSystemTime(start.getTime() + 16_000);
  expect(getRemainingDisplaySeconds(resumedSession)).toBe(289);
  expect(getRemainingMs(resumedSession)).toBe(289_000);
});
