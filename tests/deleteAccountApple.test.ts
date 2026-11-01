import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createDeleteAccountHandler } from '../supabase/functions/delete-account/handler';
const uid='00000000-0000-4000-8000-000000000001';
const enc=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
let signing:CryptoKeyPair, jwk:JsonWebKey, privateKey:string;
let claims:Record<string,unknown>, corrupt:boolean, revokeFails:boolean, omitRefresh:boolean;
beforeAll(async()=>{
 signing=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 jwk=await crypto.subtle.exportKey('jwk',signing.publicKey);
 const client=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 privateKey='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(await crypto.subtle.exportKey('pkcs8',client.privateKey)).toString('base64')+'\n-----END PRIVATE KEY-----';
});
beforeEach(()=>{const now=Math.floor(Date.now()/1000);claims={iss:'https://appleid.apple.com',aud:'com.syntheticae.rimba',sub:'linked-apple-subject',iat:now,exp:now+600};corrupt=false;revokeFails=false;omitRefresh=false;});
async function setup(){
 const payload=enc({alg:'RS256',kid:'test-apple-key'})+'.'+enc(claims);
 const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',signing.privateKey,new TextEncoder().encode(payload))).toString('base64url');
 const token=payload+'.'+(corrupt?'invalid':signature);
 const server=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:uid,identities:[{provider:'apple',identity_data:{sub:'linked-apple-subject'}}]});
  if(url==='https://appleid.apple.com/auth/token')return Response.json({id_token:token,...(omitRefresh?{}:{refresh_token:'fictional-refresh'})});
  if(url==='https://appleid.apple.com/auth/keys')return Response.json({keys:[{...jwk,kid:'test-apple-key'}]});
  if(url==='https://appleid.apple.com/auth/revoke')return new Response(null,{status:revokeFails?503:200});
  if(url.endsWith('/rest/v1/rpc/list_account_media'))return Response.json([]);
  if(url.endsWith('/auth/v1/admin/users/'+uid))return Response.json({id:uid});
  throw new Error('Unexpected test route');
 });
 const handler=createDeleteAccountHandler({supabaseUrl:'https://rimba.example.test',anonKey:'public-test',serviceRoleKey:'server-test',appleClientId:'com.syntheticae.rimba',appleTeamId:'TESTTEAM00',appleKeyId:'TESTKEY000',applePrivateKey:privateKey},server);
 const response=await handler(new Request('https://rimba.example.test/functions/v1/delete-account',{method:'POST',headers:{Authorization:'Bearer user-test-session'},body:JSON.stringify({expectedUserId:uid,authorizationCode:'fresh-code'})}));
 return {server,response};
}
const hasDeletion=(server:ReturnType<typeof vi.fn>)=>server.mock.calls.some(([url])=>String(url).includes('/auth/v1/admin/users/'));
it('verifies a signed Apple identity and revokes before deleting the account',async()=>{const {server,response}=await setup();expect(await response.json()).toEqual({deleted:true,appleRevoked:true});const urls=server.mock.calls.map(([url])=>String(url));expect(urls.indexOf('https://appleid.apple.com/auth/revoke')).toBeLessThan(urls.findIndex(url=>url.includes('/auth/v1/admin/users/')));const form=server.mock.calls.find(([url])=>String(url).endsWith('/auth/revoke'))?.[1]?.body as URLSearchParams;expect(form.get('token_type_hint')).toBe('refresh_token');expect(form.get('client_id')).toBe('com.syntheticae.rimba');});
it.each(['sub','aud','iss'])('refuses a valid signature with the wrong %s',async(field)=>{claims[field]='wrong';const {server,response}=await setup();expect(response.status).toBe(400);expect(hasDeletion(server)).toBe(false);expect(server.mock.calls.some(([url])=>String(url).endsWith('/auth/revoke'))).toBe(false);});
it('refuses an expired signed token',async()=>{claims.exp=1;const {server,response}=await setup();expect(response.status).toBe(400);expect(hasDeletion(server)).toBe(false);});
it('refuses a forged signature',async()=>{corrupt=true;const {server,response}=await setup();expect(response.status).toBe(400);expect(hasDeletion(server)).toBe(false);});
it('preserves the account when Apple revocation fails',async()=>{revokeFails=true;const {server,response}=await setup();expect(response.status).toBe(502);expect(hasDeletion(server)).toBe(false);});
it('preserves the account when no revocable refresh token is returned',async()=>{omitRefresh=true;const {server,response}=await setup();expect(response.status).toBe(502);expect(hasDeletion(server)).toBe(false);});
