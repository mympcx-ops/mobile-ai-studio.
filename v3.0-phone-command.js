(()=>{"use strict";
const STORE="mobile-ai-studio-v3-bridge-v1",FACTORY_STORE="mobile-ai-studio-agent-factory-v1",$=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const CAPABILITIES=["health.read","telemetry.read","agent-package.preview"];
function load(){try{const v=JSON.parse(localStorage.getItem(STORE)||"{}");return {pairingRequest:v.pairingRequest||null,lastExport:v.lastExport||null};}catch(e){return {pairingRequest:null,lastExport:null};}}
let state=load();
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));return true;}catch(e){return false;}}
function validateHostOrigin(raw){
 let u;try{u=new URL(String(raw||"").trim());}catch(e){return {ok:false,reason:"Enter a valid HTTPS host URL."};}
 if(u.protocol!=="https:")return {ok:false,reason:"The phone-to-PC bridge requires HTTPS. Plain HTTP is not accepted."};
 if(u.username||u.password||u.search||u.hash||u.pathname!=="/")return {ok:false,reason:"Enter only the HTTPS origin: scheme, host and optional port."};
 if(u.hostname==="localhost"||u.hostname==="127.0.0.1"||u.hostname==="::1")return {ok:false,reason:"Loopback addresses point to this phone, not your separate PC."};
 return {ok:true,origin:u.origin};
}
function randomHex(bytes=16){
 if(!globalThis.crypto?.getRandomValues)throw new Error("Secure random generation is unavailable in this browser.");
 const data=new Uint8Array(bytes);globalThis.crypto.getRandomValues(data);
 return [...data].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function createPairingRequest(input){
 const checked=validateHostOrigin(input?.hostOrigin);if(!checked.ok)throw new Error(checked.reason);
 const now=new Date().toISOString();
 return {protocol:"mobile-ai-studio-bridge/3.0",requestId:"PAIR-"+randomHex(12),nonce:randomHex(24),createdAt:now,expiresAt:new Date(Date.now()+5*60*1000).toISOString(),phoneLabel:String(input?.phoneLabel||"Mobile AI Studio phone").trim().slice(0,80),hostOrigin:checked.origin,requestedCapabilities:[...CAPABILITIES],requestedMode:"READ_ONLY",status:"REQUEST_CREATED_NOT_PAIRED",securityNotice:"This is an unsigned pairing request. It is not proof of identity, does not establish a session, and grants no access."};
}
function exportPackageEnvelope(packageId,storeValue){
 const raw=storeValue===undefined?localStorage.getItem(FACTORY_STORE):storeValue;
 let factory;try{factory=typeof raw==="string"?JSON.parse(raw||"{}"):raw||{};}catch(e){throw new Error("Agent Factory storage is not valid JSON.");}
 const pkg=(factory.packages||[]).find(p=>p.packageId===packageId);
 if(!pkg)throw new Error("Select an existing Agent Factory package.");
 if(pkg.packageType!=="AGENT_BLUEPRINT_ONLY"||pkg.safety?.executable!==false||pkg.safety?.dispatchEnabled!==false||pkg.safety?.externalWritesEnabled!==false||pkg.safety?.publishEnabled!==false||pkg.safety?.deployEnabled!==false||pkg.safety?.secretsIncluded!==false||pkg.safety?.ownerApprovalRequiredForActivation!==true)throw new Error("Package does not meet the V3.0 non-executable handoff contract.");
 return {format:"mobile-ai-studio-agent-handoff/1",exportedAt:new Date().toISOString(),transferMode:"MANUAL_FILE_EXPORT",package:pkg,receiverRequirements:{mustRecomputeSha256:true,mustRunIndependentValidation:true,ownerApprovalRequired:true,autoInstall:false,autoActivate:false,executeOnImport:false}};
}
function download(name,value){
 const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function inject(){
 const root=$("command");if(!root||$("v30Bridge"))return;
 const section=document.createElement("section");section.id="v30Bridge";section.className="section v30-shell";
 section.innerHTML='<div class="section-head"><h2>V3.0 · Phone-to-PC bridge</h2><span class="v30-state">NOT PAIRED</span></div>'+
 '<p class="muted">Phone-first control surface and secure-host integration foundation. This build creates pairing requests and manual handoff files only; it does not contact your PC.</p>'+
 '<div class="v30-grid"><div class="panel"><h3>1 · Request secure pairing</h3><label class="small" for="v30PhoneLabel">Phone label</label><input id="v30PhoneLabel" class="field" value="Mobile AI Studio phone" maxlength="80"><label class="small" for="v30HostOrigin">PC bridge HTTPS origin</label><input id="v30HostOrigin" class="field" placeholder="https://your-pc-bridge.example" inputmode="url"><p class="small">Use the HTTPS origin provided by the future PC host. Do not enter a password, token or secret here.</p><button id="v30CreatePairing" class="primary" style="width:100%">Create pairing request</button><p id="v30PairingStatus" class="notice" aria-live="polite">No pairing request exists. PC host is not connected.</p><button id="v30DownloadPairing" style="width:100%" disabled>Export pairing request JSON</button></div>'+
 '<div class="panel"><h3>2 · Agent package handoff</h3><label class="small" for="v30Package">Agent Factory package</label><select id="v30Package" class="field"><option value="">Select a built blueprint</option></select><p class="small">Exports a non-executable blueprint for manual transfer to the PC. The receiving validator must recompute its hash and perform independent review.</p><button id="v30ExportPackage" class="primary" style="width:100%">Export agent handoff JSON</button><p id="v30ExportStatus" class="notice" aria-live="polite">No package exported.</p></div></div>'+
 '<div class="panel v30-capabilities"><h3>3 · Capability boundary</h3><div class="v30-cap"><span>Host health read</span><b>Requested only</b></div><div class="v30-cap"><span>Telemetry read</span><b>Requested only</b></div><div class="v30-cap"><span>Agent package preview</span><b>Manual file only</b></div><div class="v30-cap"><span>Filesystem write / shell / process execution</span><b class="blocked">DENIED</b></div><div class="v30-cap"><span>Model dispatch / publish / deploy</span><b class="blocked">DENIED</b></div><div class="notice">Pairing is not authentication. A real connection requires a PC-side host, TLS certificate validation, authenticated device enrollment, replay protection, scoped authorization, audit logging and explicit Owner approval. None is active in this phone-only build.</div></div>';
 root.insertBefore(section,root.firstChild);
}
function render(){
 const status=$("v30PairingStatus"),downloadPair=$("v30DownloadPairing");
 if(status)status.textContent=state.pairingRequest?"Request "+state.pairingRequest.requestId+" created locally. Status: NOT PAIRED. Expires "+new Date(state.pairingRequest.expiresAt).toLocaleString()+". No PC contact occurred.":"No pairing request exists. PC host is not connected.";
 if(downloadPair)downloadPair.disabled=!state.pairingRequest;
 const select=$("v30Package");if(select){const prior=select.value;let factory={};try{factory=JSON.parse(localStorage.getItem(FACTORY_STORE)||"{}");}catch(e){}const packages=Array.isArray(factory.packages)?factory.packages:[];select.innerHTML='<option value="">Select a built blueprint</option>'+packages.map(p=>'<option value="'+esc(p.packageId)+'">'+esc(p.agent?.name||p.packageId)+' · '+esc(p.packageStatus)+'</option>').join("");if(packages.some(p=>p.packageId===prior))select.value=prior;}
}
function wire(){
 document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  if(b.id==="v30CreatePairing"){try{state.pairingRequest=createPairingRequest({hostOrigin:$("v30HostOrigin").value,phoneLabel:$("v30PhoneLabel").value});if(!save())throw new Error("Could not save the request on this phone.");render();}catch(x){$("v30PairingStatus").textContent=x.message;}return;}
  if(b.id==="v30DownloadPairing"){if(!state.pairingRequest)return;download("mobile-ai-studio-pairing-request.json",state.pairingRequest);return;}
  if(b.id==="v30ExportPackage"){try{const envelope=exportPackageEnvelope($("v30Package").value);download("mobile-ai-studio-agent-handoff.json",envelope);state.lastExport={packageId:envelope.package.packageId,at:new Date().toISOString()};save();$("v30ExportStatus").textContent="Manual JSON export started. Package remains uninstalled, inactive and unapproved.";}catch(x){$("v30ExportStatus").textContent=x.message;}return;}
 });
}
window.MOBILE_AI_STUDIO_V30={version:"3.0.0-foundation",readOnly:true,validateHostOrigin,createPairingRequest,exportPackageEnvelope,capabilities:[...CAPABILITIES]};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{inject();render();wire();});else{inject();render();wire();}
window.addEventListener("load",()=>{inject();render();});
})();