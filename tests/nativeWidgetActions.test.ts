import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({listeners:{} as Record<string,Function>,pending:vi.fn(),launch:vi.fn(),intent:null as null|Function}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios'}}));
vi.mock('@capacitor/app',()=>({App:{addListener:async(name:string,callback:Function)=>{m.listeners[name]=callback;return{remove:vi.fn()};},getLaunchUrl:m.launch}}));
vi.mock('../src/lib/mobile/widgetBridge',()=>({consumeNativeWidgetAction:m.pending,listenForNativeWidgetActions:async(callback:Function)=>{m.intent=callback;return{remove:vi.fn()};}}));
let view:ReactTestRenderer|undefined,events:string[];
beforeEach(()=>{vi.resetModules();m.listeners={};m.intent=null;m.pending.mockReset().mockResolvedValue(undefined);m.launch.mockReset().mockResolvedValue(undefined);events=[];vi.stubGlobal('window',{dispatchEvent:(event:any)=>events.push(event.detail.url)});vi.stubGlobal('CustomEvent',class{detail:any;constructor(_:string,options:any){this.detail=options.detail;}});});
afterEach(()=>{if(view)act(()=>view!.unmount());view=undefined;vi.unstubAllGlobals();});
async function mount(ready:boolean){const {useNativeWidgetActions}=await import('../src/lib/mobile/useNativeWidgetActions');function Harness({ready}:{ready:boolean}){useNativeWidgetActions(ready);return null;}await act(async()=>{view=create(React.createElement(Harness,{ready}));});return Harness;}
it('waits for save readiness before delivering a cold launch focus URL',async()=>{m.launch.mockResolvedValue({url:'rimba://focus?minutes=45'});const Harness=await mount(false);expect(events).toEqual([]);await act(async()=>{view!.update(React.createElement(Harness,{ready:true}));});expect(events).toEqual(['rimba://focus?minutes=45']);});
it('consumes an intent queued after foreground activation, once',async()=>{await mount(true);m.pending.mockResolvedValueOnce('rimba://focus?minutes=25');await act(async()=>{m.intent!();});expect(events).toEqual(['rimba://focus?minutes=25']);await act(async()=>{m.listeners.appStateChange({isActive:true});});expect(events).toHaveLength(1);});
it('rejects non-widget native URLs and does not consume a command before auth is ready',async()=>{await mount(false);await act(async()=>{m.listeners.appUrlOpen({url:'https://focus?minutes=25'});m.intent!();});expect(events).toEqual([]);expect(m.pending).not.toHaveBeenCalled();});
it('does not drop a late intent notification while a previous empty read is in flight',async()=>{
  let finish!:(value:undefined)=>void;
  m.pending.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  await mount(true);
  m.pending.mockResolvedValueOnce('rimba://focus?minutes=60');
  await act(async()=>{m.intent!();finish(undefined);});
  expect(events).toEqual(['rimba://focus?minutes=60']);
});
