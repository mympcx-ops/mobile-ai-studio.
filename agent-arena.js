(function(root){"use strict";
const IDENTITY_STORE="mobile-ai-studio-agent-identities-v1",IMPORT_STORE="mobile-ai-studio-agent-imports-v1",FORMAT="mobile-ai-studio-agent-package/1";
const PALETTES={gold:{label:"Solar Gold",accent:"#f5c66b"},blue:{label:"Ion Blue",accent:"#73d9ff"},violet:{label:"Nebula Violet",accent:"#b8a0ff"},crimson:{label:"Ember Crimson",accent:"#ff8c83"},emerald:{label:"Emerald",accent:"#70e0b0"},silver:{label:"Lunar Silver",accent:"#c5d2e6"},rose:{label:"Rose Quartz",accent:"#ff9dc9"},amber:{label:"Solar Amber",accent:"#ffad62"}};
const AVATARS=["orb","particle","sigil","crystal","halo","prism","comet","core"],GLYPHS={orb:"◉",particle:"✧",sigil:"⌘",crystal:"◇",halo:"◎",prism:"△",comet:"✦",core:"⬡"};
const FLOOR_PLAN=[
[0,"Owner Command","Owner authority, approvals and studio-wide direction","EXISTING FOUNDATION"],
[1,"Administration & Operations","Secretary gate, Watchdog/COO, coordination and audit","EXISTING FOUNDATION"],
[2,"Music Production","Music agents, managers and production workflows","EXISTING FLEET"],
[3,"Media Production","Media agents, managers and creative workflows","EXISTING FLEET"],
[4,"Racing & Simulation","Racing agents, telemetry and coaching workflows","EXISTING FLEET"],
[5,"Simulation & Certification","Agent Arena, test chambers, evidence review and qualification","PROPOSED ADDITION"],
[6,"Intelligence Research & Training","Research, training curricula and model evaluation proposals","PROPOSED ADDITION"],
[7,"Agent Development & Engineering","Agent Factory, Identity Studio, versioning and package exchange","PROPOSED ADDITION"],
[8,"Collective Intelligence","Controlled collaboration, delegation and shared project context","PROPOSED ADDITION"],
[9,"Observatory & Optimization","Studio health, benchmarks, resource use and fleet analytics","PROPOSED ADDITION"]
].map(x=>({floor:x[0],name:x[1],purpose:x[2],status:x[3]}));
const $=id=>root.document&&root.document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function read(key,fallback){try{return JSON.parse(root.localStorage.getItem(key)||"null")??fallback}catch(e){return fallback}}
function write(key,value){root.localStorage.setItem(key,JSON.stringify(value))}
function hashText(s){let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function identityMap(list,store){
 const roster=Array.isArray(list)?list:records(),savedStore=store||{},keys=Object.keys(PALETTES),used=new Set(),result={};
 roster.forEach(agent=>{
  const saved=savedStore[agent.id]||{};let palette=PALETTES[saved.palette]?saved.palette:null,avatar=AVATARS.includes(saved.avatar)?saved.avatar:null;
  let pair=palette&&avatar?palette+":"+avatar:null;
  if(!pair||used.has(pair)){
   const start=hashText(agent.id)%64;let found=false;
   for(let offset=0;offset<64;offset++){const slot=(start+offset)%64,p=keys[slot%keys.length],a=AVATARS[Math.floor(slot/keys.length)],candidate=p+":"+a;if(!used.has(candidate)){palette=p;avatar=a;pair=candidate;found=true;break}}
   if(!found)throw new Error("The visual identity catalog has no unused palette/avatar combinations.");
  }
  used.add(pair);result[agent.id]={palette,avatar,accent:PALETTES[palette].accent,glyph:GLYPHS[avatar]};
 });
 return result;
}
function identityFor(agent,store){const map=identityMap(records(),store);if(map[agent.id])return map[agent.id];const keys=Object.keys(PALETTES),palette=keys[hashText(agent.id)%keys.length],avatar=AVATARS[hashText(agent.id+"avatar")%AVATARS.length];return {palette,avatar,accent:PALETTES[palette].accent,glyph:GLYPHS[avatar]}}
function stableJson(v){if(Array.isArray(v))return "["+v.map(stableJson).join(",")+"]";if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stableJson(v[k])).join(",")+"}";return JSON.stringify(v)}
function packagePayload(agent,identity){
 if(!agent||!agent.id||!agent.name||!agent.floor)throw new Error("A canonical agent record is required.");
 return {format:FORMAT,schemaVersion:"1.0.0",packageType:"BLUEPRINT_ONLY",createdAt:new Date().toISOString(),
 agent:{id:String(agent.id),name:String(agent.name),floor:String(agent.floor),role:String(agent.role||"Agent"),mission:String(agent.mission||""),responsibilities:String(agent.responsibilities||""),manager:String(agent.manager||agent.reportsTo||"Owner review required"),lifecycleStatus:"PLANNED"},
 identity:{palette:PALETTES[identity?.palette]?identity.palette:"blue",avatar:AVATARS.includes(identity?.avatar)?identity.avatar:"orb"},
 toolRequirements:[],memoryTemplate:{schemaVersion:"1.0.0",entries:[]},
 security:{credentialsIncluded:false,privateMemoryIncluded:false,executable:false,executionEnabled:false,activationAuthorized:false,externalWritesEnabled:false,publishingEnabled:false,deploymentEnabled:false}};
}
async function createPackage(agent,identity,cryptoApi){const c=cryptoApi||root.crypto;if(!c?.subtle)throw new Error("Secure SHA-256 is unavailable. Open the studio over HTTPS to export a verified package.");const payload=packagePayload(agent,identity),digest=await c.subtle.digest("SHA-256",new TextEncoder().encode(stableJson(payload))),hex=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");return {...payload,integrity:{algorithm:"SHA-256",digest:hex}}}
async function verifyPackage(pkg,cryptoApi){
 const errors=[];if(!pkg||typeof pkg!=="object"||Array.isArray(pkg))return {valid:false,errors:["Package must be a JSON object."]};
 if(pkg.format!==FORMAT)errors.push("Unsupported package format.");if(pkg.schemaVersion!=="1.0.0")errors.push("Unsupported schema version.");if(pkg.packageType!=="BLUEPRINT_ONLY")errors.push("Only blueprint-only packages are accepted.");
 if(!pkg.agent||!["id","name","floor","role","mission","responsibilities","manager","lifecycleStatus"].every(k=>typeof pkg.agent[k]==="string"))errors.push("Agent blueprint fields are incomplete.");
 if(!pkg.identity||!PALETTES[pkg.identity.palette]||!AVATARS.includes(pkg.identity.avatar))errors.push("Agent visual identity is invalid.");
 if(!Array.isArray(pkg.toolRequirements)||pkg.toolRequirements.length!==0)errors.push("Imported packages may grant no tools; rebuild requirements locally.");
 if(!pkg.memoryTemplate||!Array.isArray(pkg.memoryTemplate.entries)||pkg.memoryTemplate.entries.length!==0)errors.push("Private memory is not importable.");
 const flags=["credentialsIncluded","privateMemoryIncluded","executable","executionEnabled","activationAuthorized","externalWritesEnabled","publishingEnabled","deploymentEnabled"];
 if(!pkg.security||flags.some(k=>pkg.security[k]!==false))errors.push("Package security flags are missing or unsafe.");
 if(!pkg.integrity||pkg.integrity.algorithm!=="SHA-256"||!/^[a-f0-9]{64}$/.test(pkg.integrity.digest||""))errors.push("Package integrity metadata is missing.");
 if(errors.length)return {valid:false,errors};const c=cryptoApi||root.crypto;if(!c?.subtle)return {valid:false,errors:["Secure SHA-256 verification is unavailable."]};
 const payload={};Object.keys(pkg).filter(k=>k!=="integrity").forEach(k=>payload[k]=pkg[k]);const digest=await c.subtle.digest("SHA-256",new TextEncoder().encode(stableJson(payload))),actual=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");if(actual!==pkg.integrity.digest)errors.push("Package fingerprint does not match its contents.");return {valid:!errors.length,errors,verifiedDigest:actual};
}
function downloadJson(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=root.document.createElement("a");a.href=url;a.download=filename;root.document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function records(){const c=root.MOBILE_AGENT_CATALOG||{};return [...(c.agents||[]),...(c.oversight||[])]}
let selectedId=null;
function renderProfile(agent,store){const el=$("arenaProfile");if(!el)return;const id=identityFor(agent,store);el.innerHTML='<div class="arena-profile-head" style="--agent-accent:'+id.accent+'"><span class="agent-avatar agent-avatar-large avatar-'+id.avatar+'">'+id.glyph+'</span><div><strong>'+esc(agent.name)+'</strong><small>'+esc(agent.floor)+' · '+esc(agent.role||"Agent")+'</small><span class="arena-plan-tag">PLANNED · NOT RUNNING</span></div></div><p class="muted">'+esc(agent.mission||agent.responsibilities||"Mission description pending Owner review.")+'</p><div class="arena-edit-grid"><label>Visual palette<select id="arenaPalette" class="field">'+Object.keys(PALETTES).map(k=>'<option value="'+k+'" '+(id.palette===k?"selected":"")+'>'+PALETTES[k].label+'</option>').join("")+'</select></label><label>Avatar form<select id="arenaAvatar" class="field">'+AVATARS.map(k=>'<option value="'+k+'" '+(id.avatar===k?"selected":"")+'>'+k.charAt(0).toUpperCase()+k.slice(1)+'</option>').join("")+'</select></label></div><button id="arenaSaveIdentity" class="primary" style="width:100%;margin-top:10px">Save visual identity</button><button id="arenaExportAgent" style="width:100%;margin-top:8px">Export portable agent package</button>'}
function render(){const roster=$("arenaRoster"),floors=$("arenaFloors");if(!roster||!floors)return;const store=read(IDENTITY_STORE,{}),list=records();roster.innerHTML=list.map(a=>{const id=identityFor(a,store);return '<button class="arena-agent" data-agent-id="'+esc(a.id)+'" style="--agent-accent:'+id.accent+'"><span class="agent-avatar avatar-'+id.avatar+'">'+id.glyph+'</span><span class="arena-agent-copy"><strong>'+esc(a.name)+'</strong><small>'+esc(a.floor)+' · '+esc(a.role||"Agent")+'</small></span><span class="arena-plan-tag">PLANNED</span></button>'}).join("")||'<p class="notice">Import the canonical agent directory to populate the Arena roster.</p>';floors.innerHTML=FLOOR_PLAN.map(f=>'<div class="arena-floor-row"><strong>F'+f.floor+' · '+esc(f.name)+'</strong><small>'+esc(f.purpose)+'</small><span>'+esc(f.status)+'</span></div>').join("");const selected=list.find(a=>a.id===selectedId)||list[0];if(selected){selectedId=selected.id;renderProfile(selected,store)}}
function message(s){const el=$("arenaMessage");if(el)el.textContent=s}
async function exportSelected(){const a=records().find(x=>x.id===selectedId);if(!a)throw new Error("Select an agent first.");const pkg=await createPackage(a,identityFor(a,read(IDENTITY_STORE,{})));downloadJson(a.id+"-agent-blueprint.json",pkg);message("Verified blueprint exported. No credentials, private memory, tool grants or executable code included.")}
async function importFile(file){if(!file)throw new Error("Choose a package file.");if(file.size>1048576)throw new Error("Package exceeds the 1 MB import limit.");const pkg=JSON.parse(await file.text()),check=await verifyPackage(pkg);if(!check.valid)throw new Error(check.errors.join(" "));const items=read(IMPORT_STORE,[]),record={packageId:pkg.integrity.digest,agent:pkg.agent,identity:pkg.identity,importedAt:new Date().toISOString(),status:"IMPORTED_DRAFT_NOT_INSTALLED",executionEnabled:false,activationAuthorized:false};if(!items.some(x=>x.packageId===record.packageId))items.push(record);write(IMPORT_STORE,items);renderImports();message("Fingerprint verified. Imported as a local draft only; no tools granted and nothing activated.")}
function renderImports(){const el=$("arenaImports");if(!el)return;const items=read(IMPORT_STORE,[]);el.innerHTML=items.length?items.map(x=>'<div class="arena-import-row"><strong>'+esc(x.agent.name)+'</strong><small>'+esc(x.agent.floor)+' · '+esc(x.status)+'</small><small>SHA-256 '+esc(x.packageId.slice(0,16))+'…</small></div>').join(""):'<p class="small">No imported packages yet.</p>'}
function bind(){if(!root.document||!$("arenaRoster"))return;$("arenaRoster").addEventListener("click",e=>{const b=e.target.closest("[data-agent-id]");if(b){selectedId=b.dataset.agentId;render()}});$("arenaProfile").addEventListener("click",async e=>{if(e.target.id==="arenaSaveIdentity"){const store=read(IDENTITY_STORE,{}),palette=$("arenaPalette").value,avatar=$("arenaAvatar").value,collision=records().find(a=>a.id!==selectedId&&identityFor(a,store).palette===palette&&identityFor(a,store).avatar===avatar);if(collision){message("That palette/avatar combination is already assigned to "+collision.name+". Choose a different combination.");return}store[selectedId]={palette,avatar};write(IDENTITY_STORE,store);render();message("Unique visual identity saved on this phone. Agent behavior and permissions were not changed.")}if(e.target.id==="arenaExportAgent"){try{await exportSelected()}catch(err){message(err.message)}}});$("arenaImportFile").addEventListener("change",async e=>{try{await importFile(e.target.files[0])}catch(err){message("Import rejected: "+err.message)}finally{e.target.value=""}});root.document.querySelectorAll('[data-go="arena"]').forEach(el=>el.addEventListener("click",render));render();renderImports()}
const api={FORMAT,PALETTES,AVATARS,FLOOR_PLAN,stableJson,packagePayload,createPackage,verifyPackage,identityMap,identityFor,render,renderImports,init:bind};root.AgentArena=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root.document){if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",bind);else bind()}
})(typeof window!=="undefined"?window:globalThis);
