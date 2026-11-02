import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),xcode=require('xcode'),plist=require('plist');
const project=xcode.project('ios/App/App.xcodeproj/project.pbxproj');project.parseSync();
const objects=project.hash.project.objects;
const entries=(section:string)=>Object.entries(objects[section]||{}).filter(([,v]:any)=>v&&typeof v==='object');
const target=(name:string)=>entries('PBXNativeTarget').find(([,v]:any)=>String(v.name).replaceAll('"','')===name);
const parse=(file:string)=>plist.parse(fs.readFileSync(file,'utf8'));
describe('native widget packaging',()=>{
 it('builds and embeds a real extension as an App dependency',()=>{
  const widget=target('RimbaWidgets');expect(widget).toBeDefined();if(!widget)return;
  const [id,w]:any=widget;const [,app]:any=target('App')!;
  expect(w.productType.replaceAll('"','')).toBe('com.apple.product-type.app-extension');
  expect(app.dependencies.some((r:any)=>objects.PBXTargetDependency[r.value].target===id)).toBe(true);
  const embeds=app.buildPhases.map((r:any)=>objects.PBXCopyFilesBuildPhase?.[r.value]).filter(Boolean);
  const buildFiles=embeds.filter((p:any)=>String(p.dstSubfolderSpec)==='13').flatMap((p:any)=>p.files.map((r:any)=>objects.PBXBuildFile[r.value]));
  expect(buildFiles.some((f:any)=>f.fileRef===w.productReference&&f.settings?.ATTRIBUTES?.includes('CodeSignOnCopy'))).toBe(true);
 });
 it('shares the app group and keeps Apple sign in on the containing app',()=>{
  const app=parse('ios/App/App/App.entitlements'),widget=parse('ios/App/RimbaWidgets/RimbaWidgets.entitlements');
  expect(app['com.apple.security.application-groups']).toEqual(['group.com.syntheticae.rimba']);
  expect(widget['com.apple.security.application-groups']).toEqual(app['com.apple.security.application-groups']);
  expect(app['com.apple.developer.applesignin']).toEqual(['Default']);
 });
 it('compiles the quick-focus intent and data model into both targets',()=>{
  for(const name of ['App','RimbaWidgets']){const t:any=target(name)?.[1];expect(t).toBeDefined();if(!t)continue;
   const paths=t.buildPhases.flatMap((r:any)=>objects.PBXSourcesBuildPhase?.[r.value]?.files||[]).map((r:any)=>objects.PBXFileReference[objects.PBXBuildFile[r.value].fileRef]?.path?.replaceAll('"',''));
   expect(paths.some((p:string)=>p?.endsWith('StartRimbaFocusIntent.swift'))).toBe(true);
   expect(paths.some((p:string)=>p?.endsWith('RimbaWidgetData.swift'))).toBe(true);
  }
 });
});
