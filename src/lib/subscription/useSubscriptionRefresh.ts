'use client';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useAuthStore,getAuthSessionRevision } from '@/lib/auth/useAuthStore';
import { useGameStore } from '@/lib/game/useGameStore';
import { refreshStoreKitSubscription,freeStoreSubscription,isStoreResultCurrent } from './revenueCatService';

/** Keep access current without opening a store sheet or changing owned sanctuary content. */
export function useSubscriptionRefresh(ready:boolean):void {
 const owner=useAuthStore(s=>s.user?.id),guest=useAuthStore(s=>s.user?.isGuest);
 useEffect(()=>{
  if(!ready||!owner||guest||!Capacitor.isNativePlatform())return;
  let closed=false,running=false;
  const refresh=async()=>{
   if(closed||running||document.visibilityState==='hidden')return;
   running=true;const revision=getAuthSessionRevision();
   try{
    const result=await refreshStoreKitSubscription();
    const user=useAuthStore.getState().user;
    if(closed||result.superseded||revision!==getAuthSessionRevision()||user?.id!==owner||user.isGuest||useGameStore.getState().saveData.storage_owner!==owner)return;
    if(result.success&&result.subscription&&isStoreResultCurrent(result))useGameStore.getState().updateSubscription(result.subscription);
    else useGameStore.getState().updateSubscription(freeStoreSubscription());
   }finally{running=false;}
  };
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh();};
  const onOnline=()=>{void refresh();};
  const native=App.addListener('appStateChange',({isActive})=>{if(isActive)void refresh();}).catch(()=>null);
  document.addEventListener('visibilitychange',onVisible);
  window.addEventListener('online',onOnline);
  const timer=setInterval(()=>void refresh(),300000);
  void refresh();
  return ()=>{closed=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onOnline);void native.then(handle=>handle?.remove()).catch(()=>{});};
 },[ready,owner,guest]);
}
