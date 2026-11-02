import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {makeScreenshotStorage} from './native-screenshot-fixture.mjs';
import sharp from 'sharp';
if(process.platform!=='darwin'||process.env.GITHUB_ACTIONS!=='true')throw Error('Native screenshots run only in isolated macOS CI');
const original=path.resolve(process.argv[2]||'');
if(!original.endsWith('.app')||!fs.existsSync(path.join(original,'Info.plist')))throw Error('Simulator app is required');
const platform=execFileSync('/usr/libexec/PlistBuddy',['-c','Print :DTPlatformName',path.join(original,'Info.plist')],{encoding:'utf8'}).trim();
if(platform!=='iphonesimulator')throw Error('Refusing to modify a device/release application');
const output=path.resolve('build/store-screenshots'),fixture=path.resolve('build/screenshot-fixture/App.app');
if(fs.existsSync(fixture))throw Error('Use a fresh isolated screenshot workspace');
fs.mkdirSync(path.dirname(fixture),{recursive:true});fs.mkdirSync(output,{recursive:true});
fs.cpSync(original,fixture,{recursive:true,force:false,errorOnExist:true});
const index=path.join(fixture,'public/index.html'),originalHtml=fs.readFileSync(index,'utf8');
const sim=(...args)=>{
 console.log('simctl '+args.join(' '));
 const timeout=args[0]==='bootstatus'?180000:['shutdown','delete'].includes(args[0])?30000:120000;
 return execFileSync('xcrun',['simctl',...args],{encoding:'utf8',maxBuffer:10*1024*1024,timeout,killSignal:'SIGKILL'});
};
const {runtimes}=JSON.parse(sim('list','runtimes','-j'));
const runtime=runtimes.filter(r=>r.isAvailable&&r.identifier.includes('.iOS-')).sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true}))[0];
if(!runtime)throw Error('An available iOS simulator runtime is required');
const {devicetypes}=JSON.parse(sim('list','devicetypes','-j'));
const find=names=>names.map(name=>devicetypes.find(t=>t.name===name)).find(Boolean);
const devices=[
 {kind:'iphone-medium',type:find(['iPhone 16 Pro','iPhone 17 Pro','iPhone 15 Pro']),sizes:['1206x2622','1179x2556']},
 {kind:'iphone-large',type:find(['iPhone 16 Pro Max','iPhone 17 Pro Max','iPhone 15 Pro Max']),sizes:['1320x2868','1290x2796','1260x2736']},
 {kind:'ipad-13',type:find(['iPad Pro 13-inch (M4)','iPad Pro 13-inch (M5)','iPad Pro (12.9-inch) (6th generation)']),sizes:['2064x2752','2048x2732']},
];
if(devices.some(d=>!d.type))throw Error('Required screenshot device type is unavailable');
const manifest=[];
for(const device of devices){
 const id=sim('create','Rimba-'+device.kind,device.type.identifier,runtime.identifier).trim();
 try{
  sim('boot',id);sim('bootstatus',id,'-b');
  sim('ui',id,'appearance','light');
  sim('status_bar',id,'override','--time','9:41','--dataNetwork','wifi','--wifiMode','active','--wifiBars','3','--batteryState','charged','--batteryLevel','100');
  for(const language of ['en','id'])for(const scene of ['sanctuary','focus']){
   const storage=makeScreenshotStorage(language,scene);
   const seed='<meta http-equiv="Content-Security-Policy" content="connect-src &#39;self&#39; blob: data:"><script>for(const [key,value] of Object.entries('+JSON.stringify(storage).replaceAll('<','\\u003c')+'))localStorage.setItem(key,value);</script>';
   fs.writeFileSync(index,originalHtml.replace('<head>','<head>'+seed));
   try{sim('uninstall',id,'com.syntheticae.rimba');}catch{}
   sim('install',id,fixture);sim('launch',id,'com.syntheticae.rimba');
   await new Promise(resolve=>setTimeout(resolve,25000));
   const file=path.join(output,device.kind+'-'+language+'-'+scene+'.jpg');
   sim('io',id,'screenshot','--type=jpeg',file);
   const metadata=await sharp(file).metadata(),size=metadata.width+'x'+metadata.height;
   if(!device.sizes.includes(size)||metadata.hasAlpha)throw Error('Invalid App Store screenshot: '+size);
   manifest.push({file:path.basename(file),device:device.type.name,runtime:runtime.version,language,scene,width:metadata.width,height:metadata.height,native:true,fictionalGuestData:true});
   console.log(JSON.stringify(manifest.at(-1)));
  }
 }finally{try{sim('shutdown',id);}catch(error){console.warn('Simulator shutdown failed: '+error.message);}try{sim('delete',id);}catch(error){console.warn('Simulator deletion failed: '+error.message);}}
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({commit:process.env.GITHUB_SHA,capturedAt:new Date().toISOString(),screenshots:manifest},null,2));
