(()=>{"use strict";
const STORE="mobile-ai-studio-agent-factory-v1";
const CHECKS=[
["IDENTITY_AND_ROLE_MATCH","Agent identity and canonical role match"],
["MISSION_AND_RESPONSIBILITIES_PRESENT","Mission and responsibilities are complete"],
["FLOOR_AND_MANAGER_RELATIONSHIP_VALID","Floor and manager relationship are valid"],
["LEAST_PRIVILEGE_PROFILE_VALID","Permission profile follows least privilege"],
["NO_EXECUTION_OR_EXTERNAL_WRITE_CAPABILITY","No execution or external-write capability exists"],
["DEPENDENCIES_AND_OUTPUTS_DOCUMENTED","Dependencies and expected outputs are documented"],
["OWNER_REVIEW_REQUIRED","Owner review remains required"]
];
const PROFILE={localRead:true,localWrite:false,externalNetwork:false,execute:false,publish:false,deploy:false,humanApprovalRequired:true};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const catalog=()=>window.MOBILE_AGENT_CATALOG||{agents:[],managers:[],oversight:[]};
function load(){try{const x=JSON.parse(localStorage.getItem(STORE)||"{}");return {packages:Array.isArray(x.packages)?x.packages:[],reviews:Array.isArray(x.reviews)?x.reviews:[]};}catch(e){return {packages:[],reviews:[]};}}
let state=load();
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));render();return true;}catch(e){alert("Agent Factory data could not be saved on this phone. Export or free storage before continuing.");return false;}}
function canonical(v){if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";return JSON.stringify(v);}
async function fingerprint(value){if(!window.crypto?.subtle)throw new Error("Secure browser cryptography is unavailable. Open the app in its HTTPS context.");const bytes=new TextEncoder().encode(canonical(value));const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function inject(){
 const root=$("agents");if(!root||$("agentFactoryV19"))return;
 const section=document.createElement("section");section.id="agentFactoryV19";section.className="section";
 section.innerHTML='<div class="section-head"><h2>Agent Factory</h2><span class="small">V1.9 · Blueprint builder</span></div>'+
 '<div class="notice">Build a structured blueprint from the canonical roster, then send it through the independent validation checklist. This creates a review package only. It does not run an agent, call a model, dispatch work, or connect to your PC.</div>'+
 '<div class="panel" style="margin-top:9px"><h3>1 · Build an agent blueprint</h3><select id="afAgent" class="field"><option value="">Select a canonical agent</option></select><input id="afBuilderId" class="field" style="margin-top:8px" placeholder="Builder ID / role (for audit attribution)"><input id="afBuilderLabel" class="field" style="margin-top:8px" placeholder="Builder display label"><textarea id="afScope" class="field" style="margin-top:8px" placeholder="Build notes or scope refinements (optional)"></textarea><button id="afBuild" class="primary" style="width:100%;margin-top:9px">Build blueprint package</button><p id="afBuildStatus" class="small" aria-live="polite"></p></div>'+
 '<div class="panel" style="margin-top:9px"><h3>2 · Independent validation</h3><select id="afPackage" class="field"><option value="">Select a built package</option></select><input id="afReviewerId" class="field" style="margin-top:8px" placeholder="Independent reviewer ID"><input id="afReviewerLabel" class="field" style="margin-top:8px" placeholder="Independent reviewer display label"><p class="small">Mark each check PASS only after reviewing the package and its source evidence.</p><div id="afChecks"></div><textarea id="afEvidence" class="field" style="margin-top:8px" rows="5" placeholder="Enter 7 evidence lines, one per check: evidence-reference | what you inspected and observed"></textarea><button id="afReview" class="primary" style="width:100%;margin-top:9px">Record independent review</button><p id="afReviewStatus" class="small" aria-live="polite"></p></div>'+
 '<div class="panel" style="margin-top:9px"><div class="row between"><h3>3 · Factory packages</h3><span id="afCounts" class="small"></span></div><div id="afPackageList"></div><pre id="afPreview" class="item" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:340px;overflow:auto">Build a blueprint to preview its package.</pre><button id="afCopy" style="width:100%">Copy selected package JSON</button></div>';
 root.appendChild(section);
 $("afChecks").innerHTML=CHECKS.map(([id,label])=>'<label class="item" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" data-af-check="'+id+'" style="width:auto;margin-top:3px"><span>'+esc(label)+'</span></label>').join("");
 $("afAgent").innerHTML='<option value="">Select a canonical agent</option>'+catalog().agents.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.floor+" · "+a.name)+'</option>').join("");
}
function selectedPackage(){return state.packages.find(p=>p.packageId===$("afPackage")?.value);}
function render(){
 const select=$("afPackage"),list=$("afPackageList");if(!select||!list)return;
 const previous=select.value;
 select.innerHTML='<option value="">Select a built package</option>'+state.packages.map(p=>'<option value="'+esc(p.packageId)+'">'+esc(p.agent.name+" · "+p.packageStatus)+'</option>').join("");
 if(previous&&state.packages.some(p=>p.packageId===previous))select.value=previous;
 $("afCounts").textContent=state.packages.length+" packages · "+state.reviews.length+" reviews";
 list.innerHTML=state.packages.length?state.packages.map(p=>'<div class="item"><strong>'+esc(p.agent.name)+'</strong><small>'+esc(p.packageStatus)+' · '+esc(p.packageId)+'</small></div>').join(""):'<div class="empty">No packages built yet.</div>';
 const p=selectedPackage();$("afPreview").textContent=p?JSON.stringify(p,null,2):"Select or build a package to preview its JSON.";
}
async function build(){
 const agent=catalog().agents.find(a=>a.id===$("afAgent").value),builderId=$("afBuilderId").value.trim(),builderLabel=$("afBuilderLabel").value.trim();
 if(!agent||!builderId||!builderLabel){$("afBuildStatus").textContent="Select an agent and enter builder ID and display label.";return;}
 if(!catalog().managers.some(m=>m.name===agent.manager&&m.floor===agent.floor)){ $("afBuildStatus").textContent="Blocked: canonical manager/floor relationship is invalid.";return;}
 const blueprint=JSON.parse(JSON.stringify(agent));blueprint.lifecycleStatus="PLANNED";blueprint.builderStatus="BUILT_PENDING_VALIDATION";blueprint.validationStatus="NOT_RUN";blueprint.permissionProfile={...PROFILE};
 const body={factoryVersion:"1.0.0",packageType:"AGENT_BLUEPRINT_ONLY",packageStatus:"BUILT_PENDING_INDEPENDENT_VALIDATION",agent:blueprint,provenance:{builderId,builderLabel,builtAt:new Date().toISOString(),scopeNotes:$("afScope").value.trim()},acceptanceChecks:CHECKS.map(([checkId])=>({checkId,status:"NOT_RUN"})),safety:{executable:false,dispatchEnabled:false,externalWritesEnabled:false,publishEnabled:false,deployEnabled:false,secretsIncluded:false,ownerApprovalRequiredForActivation:true}};
 try{const integritySha256=await fingerprint(body);const pkg={packageId:"AGENT-PKG-"+Date.now(),...body,integritySha256};state.packages.unshift(pkg);if(save())$("afBuildStatus").textContent="Blueprint built. Status: pending independent validation. No agent was started."; }catch(e){$("afBuildStatus").textContent=e.message;}
}
async function review(){
 const p=selectedPackage(),reviewerId=$("afReviewerId").value.trim(),reviewerLabel=$("afReviewerLabel").value.trim();
 if(!p||!reviewerId||!reviewerLabel){$("afReviewStatus").textContent="Select a package and enter reviewer identity.";return;}
 if(reviewerId===p.provenance.builderId){$("afReviewStatus").textContent="Blocked: builder cannot independently review their own package.";return;}
 const marked=CHECKS.filter(([id])=>document.querySelector('[data-af-check="'+id+'"]')?.checked);
 if(marked.length!==CHECKS.length){$("afReviewStatus").textContent="Blocked: all seven acceptance checks must be marked PASS after review.";return;}
 const evidence=$("afEvidence").value.split("\n").map(line=>{const i=line.indexOf("|");return i<0?null:{reference:line.slice(0,i).trim(),description:line.slice(i+1).trim()};}).filter(x=>x&&x.reference&&x.description);
 if(evidence.length<CHECKS.length){$("afReviewStatus").textContent="Blocked: provide seven evidence-reference | description lines.";return;}
 try{
  const {packageId,integritySha256,...body}=p;if(await fingerprint(body)!==integritySha256){$("afReviewStatus").textContent="Blocked: package integrity check failed.";return;}
  const record={packageId,integritySha256,agentId:p.agent.id,reviewerId,reviewerLabel,reviewedAt:new Date().toISOString(),outcome:"PASS_RECORDED_PENDING_OWNER_APPROVAL",checks:CHECKS.map(([checkId])=>({checkId,status:"PASS"})),evidence:evidence.slice(0,CHECKS.length),limitations:["Reviewer identity is user-entered and not authenticated by this phone UI.","Evidence references are recorded, not independently fetched or verified.","This review does not activate, dispatch, publish, deploy or execute the agent."],ownerApprovalRequired:true,activationAuthorized:false};
  state.reviews.unshift(record);p.packageStatus="PASS_RECORDED_PENDING_OWNER_APPROVAL";p.reviewId="REVIEW-"+Date.now();p.reviewSummary={reviewerLabel,outcome:record.outcome};if(save())$("afReviewStatus").textContent="Review recorded as pending Owner approval. Agent remains PLANNED and inactive.";
 }catch(e){$("afReviewStatus").textContent=e.message;}
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="afBuild")build();
 if(b.id==="afReview")review();
 if(b.id==="afCopy"){const p=selectedPackage();if(!p){$("afReviewStatus").textContent="Select a package first.";return;}if(navigator.clipboard?.writeText)navigator.clipboard.writeText(JSON.stringify(p,null,2)).then(()=>$("afReviewStatus").textContent="Package JSON copied.").catch(()=>$("afReviewStatus").textContent="Clipboard unavailable; select the preview text to copy.");else $("afReviewStatus").textContent="Clipboard unavailable; select the preview text to copy.";}
});
document.addEventListener("change",e=>{if(e.target.id==="afPackage")render();});
window.addEventListener("load",()=>{inject();render();});
document.addEventListener("DOMContentLoaded",()=>{inject();render();});
})();