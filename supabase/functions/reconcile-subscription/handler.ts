import { mapRevenueCatEntitlement, type BillingEnvironment } from '../_shared/revenueCatEntitlement.ts';
interface BillingConfig {supabaseUrl:string;anonKey:string;serviceRoleKey:string;revenueCatKey:string;webhookAuthorization:string;appId:string;}
type Fetcher=(url:string,init?:RequestInit)=>Promise<Response>;
class BillingError extends Error {constructor(public status:number,message:string){super(message);}}
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}});
async function equalSecret(actual:string,expected:string):Promise<boolean>{
 if(expected.length<40)return false;
 const hash=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const [a,b]=await Promise.all([hash(actual),hash(expected)]);let difference=0;
 for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;
}
async function requestJson(request:Request):Promise<Record<string,unknown>>{
 const reader=request.body?.getReader();if(!reader)return {};
 const chunks:Uint8Array[]=[];let length=0;
 for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;
  if(length>65536){await reader.cancel();throw new BillingError(413,'Request too large');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const parsed=JSON.parse(new TextDecoder().decode(bytes)||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();return parsed;}
 catch{throw new BillingError(400,'Invalid request');}
}
export function createBillingHandler(config:BillingConfig,fetcher:Fetcher=fetch){
 const call=async(url:string,init?:RequestInit)=>fetcher(url,{...init,signal:AbortSignal.timeout(10000)});
 const rpc=async(name:string,body:Record<string,unknown>)=>{
  const result=await call(config.supabaseUrl+'/rest/v1/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+config.serviceRoleKey,apikey:config.serviceRoleKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!result.ok)throw new BillingError(503,'Billing state unavailable. Retry later.');return result.json();
 };
 async function reconcile(owner:string,environment:BillingEnvironment,eventId:string|null){
  const args={p_owner:owner,p_environment:environment,p_event_id:eventId};
  const reservation=await rpc('begin_billing_sync_v1',args);
  if(reservation.duplicate===true||reservation.missing===true)return null;
  if(typeof reservation.lease!=='string')throw new BillingError(503,'Billing update in progress. Retry later.');
  const lease=reservation.lease;
  try{
   const result=await call('https://api.revenuecat.com/v1/subscribers/'+encodeURIComponent(owner),{headers:{Authorization:'Bearer '+config.revenueCatKey,'Content-Type':'application/json'}});
   if(!result.ok)throw new BillingError(503,'Purchase verification unavailable. Retry later.');
   const state=mapRevenueCatEntitlement(await result.json(),environment);
   const committed=await rpc('finish_billing_sync_v1',{...args,p_lease:lease,p_state:state});
   if(committed.applied!==true)throw new BillingError(503,'Billing update changed. Retry later.');
   return state;
  }catch(error){
   // Release only this lease. A timed-out worker must never release a newer worker's lease.
   await rpc('cancel_billing_sync_v1',{...args,p_lease:lease}).catch(()=>{});throw error;
  }
 }
 return async(request:Request):Promise<Response>=>{
  if(request.method==='OPTIONS')return response({});
  if(request.method!=='POST')return response({error:'Method not allowed'},405);
  try{
   if(!config.revenueCatKey||!config.serviceRoleKey||!config.anonKey||!config.supabaseUrl||!config.appId)throw new BillingError(503,'Billing is not configured');
   const webhook=new URL(request.url).pathname.endsWith('/revenuecat-webhook');
   const authorization=request.headers.get('Authorization')||'';
   if(webhook){
    if(!await equalSecret(authorization,config.webhookAuthorization))throw new BillingError(401,'Unauthorized');
    const payload=await requestJson(request),event=payload.event as Record<string,unknown>|undefined;
    if(!event||typeof event!=='object'||Array.isArray(event)||event.app_id!==config.appId||typeof event.id!=='string'||!event.id||event.id.length>256)throw new BillingError(400,'Invalid webhook');
    if(event.type==='TEST')return response({received:true});
    const environment=event.environment==='PRODUCTION'?'production':event.environment==='SANDBOX'?'sandbox':null;
    if(!environment)throw new BillingError(400,'Invalid environment');
    const values=[event.app_user_id,...(Array.isArray(event.aliases)?event.aliases:[]),...(Array.isArray(event.transferred_from)?event.transferred_from:[]),...(Array.isArray(event.transferred_to)?event.transferred_to:[])];
    const owners=Array.from(new Set(values.filter(uuid))).sort();
    if(owners.length>20)throw new BillingError(400,'Too many affected accounts');
    for(const owner of owners)await reconcile(owner,environment,event.id);
    return response({received:true});
   }
   if(!authorization.startsWith('Bearer '))throw new BillingError(401,'Sign in required');
   const auth=await call(config.supabaseUrl+'/auth/v1/user',{headers:{Authorization:authorization,apikey:config.anonKey}});
   if(!auth.ok)throw new BillingError(401,'Sign in required');
   const user=await auth.json();if(!uuid(user.id))throw new BillingError(401,'Sign in required');
   const body=await requestJson(request);
   const environment:BillingEnvironment=body.environment==='sandbox'?'sandbox':'production';
   const state=await reconcile(user.id,environment,null);
   if(!state)throw new BillingError(503,'Billing account unavailable');
   return response({subscription:state});
  }catch(error){return response({error:error instanceof BillingError?error.message:'Purchase verification unavailable. Retry later.'},error instanceof BillingError?error.status:503);}
 };
}
