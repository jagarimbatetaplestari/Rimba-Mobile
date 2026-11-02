import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({purchase:vi.fn(),restore:vi.fn(),current:true,lang:'en' as 'en'|'id',owner:'owner-a',update:vi.fn(),close:vi.fn(),subscription:null as any}));
vi.mock('../src/lib/audio/sounds',()=>({soundManager:{playPop:vi.fn(),playComplete:vi.fn(),playError:vi.fn()}}));
vi.mock('../src/lib/mobile/nativeBridge',()=>({hapticLight:vi.fn(),hapticSuccess:vi.fn(),hapticWarning:vi.fn()}));
vi.mock('../src/lib/auth/useAuthStore',()=>({useAuthStore:(select:any)=>select({user:{id:m.owner,isGuest:false}}),getAuthSessionRevision:()=>0}));
vi.mock('../src/lib/game/useGameStore',()=>({useGameStore:(select:any)=>select({saveData:{subscription:m.subscription},updateSubscription:m.update,notify:vi.fn()})}));
vi.mock('../src/lib/subscription/useEntitlements',()=>({useEntitlements:()=>({isPro:!!m.subscription?.isPro})}));
vi.mock('../src/lib/subscription/revenueCatService',()=>({purchaseSubscriptionTier:m.purchase,restoreStoreKitPurchases:m.restore,isStoreResultCurrent:()=>m.current,getStoreProducts:async()=>[{identifier:'rimba_pro_annual',priceString:'Rp179.000'}]}));
vi.mock('../src/components/modals/LegalModal',()=>({LegalModal:()=>null}));
vi.mock('../src/lib/i18n/translations',async(original)=>{const actual=await original<typeof import('../src/lib/i18n/translations')>();return {...actual,useTranslation:()=>({language:m.lang,t:actual.translations[m.lang]})};});
import { RimbaProPaywallModal } from '../src/components/modals/RimbaProPaywallModal';
const verified={success:true,ownerId:'owner-a',sessionRevision:0,subscription:{tier:'pro_annual',status:'active',isPro:true,expiresAt:'2099-01-01'}};
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join(' ');
let view:ReactTestRenderer;
async function open(){await act(async()=>{view=create(React.createElement(RimbaProPaywallModal,{isOpen:true,onClose:m.close}));});}
async function click(label:string){const button=view.root.findAllByType('button').find(b=>text(b).includes(label));if(!button)throw Error('Missing button '+label);await act(async()=>{await button.props.onClick();});}
beforeEach(()=>{vi.clearAllMocks();m.current=true;m.lang='en';m.owner='owner-a';m.subscription=null;m.purchase.mockResolvedValue(verified);m.restore.mockResolvedValue(verified);m.update.mockImplementation(s=>{m.subscription=s;});});
afterEach(()=>{if(view)act(()=>view.unmount());});
it('shows a lasting purchase welcome only after verified Pro is applied',async()=>{await open();await click('Continue');expect(m.update).toHaveBeenCalledWith(verified.subscription);expect(text(view.root)).toContain('Welcome to Rimba Pro');expect(m.close).not.toHaveBeenCalled();await click('Return to Sanctuary');expect(m.close).toHaveBeenCalledOnce();});
it('shows a visible pending verification state without granting Pro or charging again',async()=>{m.purchase.mockResolvedValue({success:false,pendingConfirmation:true,error:'Store accepted the purchase. Verification is pending.'});await open();await click('Continue');expect(view.root.findAllByProps({role:'alert'}).map(text).join(' ')).toContain('Verification is pending');expect(m.update).not.toHaveBeenCalled();await click('Verify purchase');expect(m.purchase).toHaveBeenCalledOnce();expect(m.restore).toHaveBeenCalledOnce();});
it('keeps errors visible inside the paywall',async()=>{m.purchase.mockResolvedValue({success:false,error:'Store connection unavailable'});await open();await click('Continue');expect(view.root.findAllByProps({role:'alert'}).map(text).join(' ')).toContain('Store connection unavailable');expect(m.close).not.toHaveBeenCalled();});
it('distinguishes a successful Restore from a new purchase',async()=>{await open();await click('Restore Purchases');expect(text(view.root)).toContain('Rimba Pro restored');expect(text(view.root)).not.toContain('Welcome to Rimba Pro');expect(m.purchase).not.toHaveBeenCalled();});
it('does not celebrate or grant a result from a different account',async()=>{m.current=false;await open();await click('Continue');expect(m.update).not.toHaveBeenCalled();expect(text(view.root)).not.toContain('Welcome to Rimba Pro');});
it('does not celebrate a canceled purchase',async()=>{m.purchase.mockResolvedValue({success:false,cancelled:true});await open();await click('Continue');expect(m.update).not.toHaveBeenCalled();expect(text(view.root)).not.toContain('Welcome to Rimba Pro');});
it('shows the verified purchase welcome in Indonesian',async()=>{m.lang='id';await open();await click('Lanjutkan');expect(text(view.root)).toContain('Selamat datang di Rimba Pro');expect(text(view.root)).not.toContain('Welcome to Rimba Pro');});
it('does not start a second store request on rapid repeated taps',async()=>{await open();const button=view.root.findAllByType('button').find(b=>text(b).includes('Continue'))!;await act(async()=>{await Promise.all([button.props.onClick(),button.props.onClick()]);});expect(m.purchase).toHaveBeenCalledOnce();});
