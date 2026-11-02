// CI fixture only. This module is never imported by the application or release workflow.
export function makeScreenshotStorage(language='en',scene='sanctuary',now=new Date()){
 if(!['en','id'].includes(language)||!['sanctuary','focus'].includes(scene))throw Error('Unknown screenshot fixture');
 const iso=now.toISOString(),minute=60000,day=86400000;
 const tiles=['3,3','3,4','3,5','4,3','4,4','4,5','5,3','5,4','5,5'];
 const sessions=[],ledger=[{id:'fixture-start-gold',currency:'gold',amount:60,reason:'starter_bonus',reference_id:'init',created_at:iso},{id:'fixture-start-xp',currency:'xp',amount:50,reason:'starter_bonus',reference_id:'init',created_at:iso}];
 const objects=[{id:'obj_tree_starter',object_type:'tree',grid_x:3,grid_y:4,rotation:0.5,scale:1.1,status:'active',created_at:new Date(+now-7*day).toISOString(),reclaimed_at:null,model_variant:'tree_oak'},{id:'obj_path_starter',object_type:'path',grid_x:4,grid_y:5,rotation:0,scale:1,status:'active',created_at:iso,reclaimed_at:null,model_variant:'path_stone'}];
 const coordinates=[[3,3],[3,5],[4,3],[5,3],[5,4],[5,5]];
 for(let i=0;i<6;i++){
  const start=new Date(+now-(6-i)*day),end=new Date(+start+25*minute),id='fixture-session-'+i;
  sessions.push({id,started_at:start.toISOString(),expected_end_at:end.toISOString(),completed_at:end.toISOString(),status:'completed',rewarded:true,tag:'Belajar',species:'oak',strict_mode:false,duration_minutes:25,task_note:language==='en'?'A quiet moment to learn':'Waktu hening untuk belajar'});
  ledger.push({id:id+'-gold',currency:'gold',amount:25,reason:'focus_complete',reference_id:id,created_at:end.toISOString()},{id:id+'-xp',currency:'xp',amount:100,reason:'focus_complete',reference_id:id,created_at:end.toISOString()});
  objects.push({id:'tree-'+id,object_type:'tree',grid_x:coordinates[i][0],grid_y:coordinates[i][1],rotation:i*0.7,scale:0.95+i*0.04,status:'active',created_at:end.toISOString(),reclaimed_at:null,model_variant:'tree_oak'});
 }
 if(scene==='focus')sessions.push({id:'fixture-active',started_at:new Date(+now-5*minute).toISOString(),expected_end_at:new Date(+now+20*minute).toISOString(),completed_at:null,status:'active',rewarded:false,tag:'Belajar',species:'oak',strict_mode:false,duration_minutes:25,task_note:language==='en'?'Make room for what matters':'Ruang untuk hal yang bermakna',target_tile:{grid_x:4,grid_y:4}});
 const save={version:1,storage_owner:'guest',profile:{id:'local-user',name:'Rimba',avatarUrl:'🍃',xp:650,goldCached:210},world:{id:'fixture-world',name:language==='en'?'My quiet sanctuary':'Suaka tenangku',last_focus_completed_at:iso,last_reclamation_at:null,unlocked_tiles:tiles},focus_sessions:sessions,world_objects:objects,currency_ledger:ledger,reclamation_events:[],todos:[{id:'fixture-task',text:language==='en'?'Create space to focus':'Sediakan ruang untuk fokus',completed:false,created_at:iso}]};
 return {
  rimba_auth_session:JSON.stringify({state:{user:{id:'rimba-screenshot-guest',email:'',name:'Rimba',isGuest:true,avatarUrl:'🍃',createdAt:iso}},version:0}),
  'rimba_save_v1:owner:guest':JSON.stringify(save),
  rimba_onboarding_completed:'true',rimba_onboarding_completed_rimba_screenshot_guest:'true',
  rimba_mobile_preferences:JSON.stringify({state:{language,graphicsQuality:'balanced',masterAudioEnabled:false,soundFxEnabled:false,ambientMusicEnabled:false,notificationsEnabled:false,notifyDailyReminder:false,notifyOnFocusComplete:false},version:0}),
 };
}
