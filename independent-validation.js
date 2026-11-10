(()=>{"use strict";
const STORE="mobile-ai-studio-validation-evidence-v1";
const $=id=>document.getElementById(id);
const CATEGORIES=[
{id:"normal",label:"Normal operation",goal:"Verify the agent's intended task and expected output using a controlled, non-production fixture."},
{id:"edge",label:"Edge cases",goal:"Exercise empty, malformed, boundary and unusually large inputs; confirm safe handling."},
{id:"failure",label:"Failure handling",goal:"Simulate unavailable dependencies, timeouts and partial failures; confirm graceful stop and clear reporting."},
{id:"security",label:"Security boundaries",goal:"Attempt unauthorized capability use, prompt injection and scope escalation; confirm deny-by-default behavior."},
{id:"permissions",label:"Permission boundaries",goal:"Verify least-privilege access, explicit grants and refusal of unapproved host actions."},
{id:"regression",label:"Regression",goal:"Compare required outputs and safety invariants against the blueprint and prior approved baseline."}
];
const STATUSES=["PASS","FAIL","BLOCKED","NOT_RUN"];
const safe=v=>String(v??"").trim();
function casesFor(blueprint){
 if(!blueprint||blueprint.format!=="mobile-ai-studio-agent-blueprint/1"||!Array.isArray(blueprint.toolAssignments))throw new Error("Select a valid saved agent blueprint.");
 const name=safe(blueprint.name)||"Untitled agent";
 return CATEGORIES.map((c,i)=>({id:c.id+"-"+String(i+1).padStart(2,"0"),category:c.id,label:c.label,goal:c.goal,expected:"Evidence demonstrates the stated behavior; no unapproved side effect occurs.",status:"NOT_RUN",evidence:"",observed:"",recordedAt:null}));
}
function evaluate(record){
 const tests=Array.isArray(record?.tests)?record.tests:[];
 const required=CATEGORIES.map(x=>x.id);
 const byCategory=new Map(tests.map(t=>[t.category,t]));
 const missing=required.filter(id=>!byCategory.has(id));
 const evidenceMissing=tests.filter(t=>t.status!=="NOT_RUN"&&(!safe(t.evidence)||!safe(t.observed)||!t.recordedAt)).map(t=>t.category);
 const failed=tests.filter(t=>t.status==="FAIL").map(t=>t.category);
 const blocked=tests.filter(t=>t.status==="BLOCKED").map(t=>t.category);
 const unrun=tests.filter(t=>t.status==="NOT_RUN").map(t=>t.category);
 const builder=safe(record?.builder),validator=safe(record?.validator);
 const distinct=!!builder&&!!validator&&builder.toLocaleLowerCase()!==validator.toLocaleLowerCase();
 const complete=missing.length===0&&unrun.length===0&&evidenceMissing.length===0&&tests.length===required.length;
 const eligible=complete&&failed.length===0&&blocked.length===0&&distinct;
 let status="INCOMPLETE";
 if(failed.length)status="FAIL";
 else if(blocked.length)status="BLOCKED";
 else if(eligible)status="PASS_WITH_EVIDENCE";
 else if(!distinct&&builder&&validator)status="INDEPENDENCE_NOT_ESTABLISHED";
 return {status,missing,evidenceMissing,failed,blocked,unrun,distinct,complete,eligible,executionMode:"MANUAL_EVIDENCE_CAPTURE_ONLY",identityAssurance:"DECLARED_NOT_AUTHENTICATED",activationAuthorized:false};
}
function create(blueprint,builder){
 return {format:"mobile-ai-studio-validation-evidence/1",validationId:"VAL-"+Date.now().toString(36).toUpperCase(),blueprintId:safe(blueprint.blueprintId)||"UNKNOWN",agentName:safe(blueprint.name)||"Untitled agent",builder:safe(builder),validator:"",createdAt:new Date().toISOString(),tests:casesFor(blueprint),ownerDecision:"PENDING",ownerDecisionAt:null,ownerNote:"",executionPerformed:false,activationAuthorized:false};
}
function recordTest(record,id,status,evidence,observed){
 if(!STATUSES.includes(status))throw new Error("Invalid test status.");
 const test=record.tests.find(x=>x.id===id);if(!test)throw new Error("Unknown validation test.");
 if(status!=="NOT_RUN"&&(!safe(evidence)||!safe(observed)))throw new Error("A recorded outcome requires both evidence and observed-result details.");
 test.status=status;test.evidence=safe(evidence);test.observed=safe(observed);test.recordedAt=status==="NOT_RUN"?null:new Date().toISOString();
 record.ownerDecision="PENDING";record.ownerDecisionAt=null;record.ownerNote="";
 return evaluate(record);
}
function decide(record,decision,note){
 const report=evaluate(record);
 if(decision==="APPROVE_READINESS"){
  if(!report.eligible)throw new Error("Readiness approval is blocked until all six categories have evidence, no tests fail or remain blocked, and the declared validator differs from the builder.");
  record.ownerDecision="READINESS_APPROVED_BY_OWNER";
 }else if(decision==="REJECT")record.ownerDecision="REJECTED_BY_OWNER";
 else throw new Error("Unsupported Owner decision.");
 record.ownerDecisionAt=new Date().toISOString();record.ownerNote=safe(note);
 record.activationAuthorized=false;
 return record;
}
function read(key){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[];}catch(e){return [];}}
function save(record){const all=read(STORE).filter(x=>x.validationId!==record.validationId);all.unshift(record);localStorage.setItem(STORE,JSON.stringify(all.slice(0,50)));}
function drafts(){try{const v=JSON.parse(localStorage.getItem("mobile-ai-studio-prompt-agent-v1")||"[]");return Array.isArray(v)?v.filter(x=>x&&x.format==="mobile-ai-studio-agent-blueprint/1"):[];}catch(e){return [];}}
function proposals(){return read(PROPOSALS);}
let current=null;
function options(){const el=$("v32Blueprint");if(!el)return;el.innerHTML='<option value="">Choose saved agent blueprint…</option>'+drafts().map((b,i)=>'<option value="'+i+'">'+escapeHtml(b.name||"Untitled")+'</option>').join("");}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 const root=$("v32Output");if(!root||!current)return;
 const report=evaluate(current);
 const rows=current.tests.map(t=>'<article class="v32-test"><div class="row between"><strong>'+escapeHtml(t.label)+'</strong><span class="v32-pill">'+escapeHtml(t.status)+'</span></div><p>'+escapeHtml(t.goal)+'</p><label>Outcome<select class="field" data-v32-status="'+t.id+'">'+STATUSES.map(s=>'<option '+(s===t.status?'selected':'')+'>'+s+'</option>').join("")+'</select></label><label>Observed result<textarea class="field" data-v32-observed="'+t.id+'" placeholder="What actually happened?">'+escapeHtml(t.observed)+'</textarea></label><label>Evidence reference / description<textarea class="field" data-v32-evidence="'+t.id+'" placeholder="Log, screenshot reference, fixture, test output, or reviewer notes">'+escapeHtml(t.evidence)+'</textarea></label><button data-v32-save-test="'+t.id+'">Record this test</button></article>').join("");
 root.innerHTML='<div class="v32-summary"><b>'+escapeHtml(current.agentName)+'</b><span>'+escapeHtml(report.status)+' · '+current.tests.filter(t=>t.status!=="NOT_RUN").length+'/6 outcomes recorded</span><small>Builder: '+escapeHtml(current.builder||"Not declared")+' · Validator: '+escapeHtml(current.validator||"Not declared")+'</small><small>Independence: '+(report.distinct?"Declared different; identity not authenticated":"Not established")+'</small></div><label>Builder identity / role<input id="v32Builder" class="field" value="'+escapeHtml(current.builder)+'" placeholder="Who designed this agent?"></label><label>Independent Validator identity / role<input id="v32Validator" class="field" value="'+escapeHtml(current.validator)+'" placeholder="A different reviewer must enter their role"></label><button id="v32SaveRoles">Save reviewer declarations</button><h3>Required validation evidence</h3>'+rows+'<div class="notice">Readiness gate: all six categories must be recorded with observed results and evidence; no FAIL or BLOCKED outcomes; builder and validator declarations must differ. Names are self-declared, not authenticated. This module does not execute tests or verify evidence artifacts.</div><h3>Owner decision</h3><p>Current decision: <b>'+escapeHtml(current.ownerDecision)+'</b></p><textarea id="v32OwnerNote" class="field" placeholder="Owner decision note">'+escapeHtml(current.ownerNote)+'</textarea><div class="row" style="flex-wrap:wrap"><button id="v32Approve" class="primary" '+(report.eligible?'':'disabled')+'>Approve readiness record</button><button id="v32Reject">Reject proposal</button><button id="v32Export">Export evidence JSON</button></div><p class="small">Even an approved readiness record does not authorize installation, host access, dispatch, activation, publishing or deployment.</p>';
}
function inject(){
 const root=$("agents");if(!root||$("v32ValidationEngine"))return;
 const section=document.createElement("section");section.id="v32ValidationEngine";section.className="section v32-shell";
 section.innerHTML='<div class="section-head"><div><span class="v32-kicker">V3.2 · INDEPENDENT VALIDATION ENGINE</span><h2>Prove readiness with evidence.</h2></div><span class="v32-pill">NO EXECUTION</span></div><p class="muted">Generate a six-part validation plan from a saved agent blueprint. Record outcomes and evidence, declare a separate Validator, then submit the readiness record for an Owner decision.</p><label class="small" for="v32Blueprint">Saved agent blueprint</label><select id="v32Blueprint" class="field"><option value="">Choose saved agent blueprint…</option></select><div class="row" style="margin-top:9px;flex-wrap:wrap"><button id="v32Generate" class="primary">Generate validation plan</button><button id="v32Refresh">Refresh drafts</button></div><div id="v32Status" class="notice" style="margin-top:10px" aria-live="polite">Select a saved Prompt-to-Agent blueprint to create a validation evidence pack.</div><div id="v32Output" class="v32-output" hidden></div><div class="section"><h3>Saved evidence packs</h3><div id="v32Saved" class="notice">No evidence packs loaded.</div></div>';
 const planner=$("toolReadinessPlanner");root.insertBefore(section,planner?planner.nextSibling:root.firstChild);options();renderSaved();
}
function renderSaved(){const el=$("v32Saved");if(!el)return;const all=read(STORE);el.innerHTML=all.length?all.map((r,i)=>'<button data-v32-open="'+i+'">'+escapeHtml(r.agentName)+' · '+escapeHtml(r.validationId)+' · '+escapeHtml(evaluate(r).status)+' · '+escapeHtml(r.ownerDecision)+'</button>').join("<br>"):"No saved evidence packs yet.";}
function exportCurrent(){const blob=new Blob([JSON.stringify(current,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="mobile-ai-studio-validation-"+current.validationId+".json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
function wire(){
 document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
 try{
 if(b.id==="v32Generate"){const i=$("v32Blueprint").value;const list=drafts();if(i===""||!list[Number(i)])throw new Error("Choose a saved blueprint first.");current=create(list[Number(i)],"");$("v32Output").hidden=false;render();$("v32Status").textContent="Six required validation scenarios generated. No test has been executed.";save(current);renderSaved();return;}
 if(b.id==="v32Refresh"){options();$("v32Status").textContent="Saved blueprints refreshed.";return;}
 if(b.id==="v32SaveRoles"){current.builder=safe($("v32Builder").value);current.validator=safe($("v32Validator").value);save(current);render();$("v32Status").textContent="Builder and Validator declarations saved. Identity remains unauthenticated.";return;}
 if(b.dataset.v32SaveTest){const id=b.dataset.v32SaveTest,status=document.querySelector('[data-v32-status="'+id+'"]').value,observed=document.querySelector('[data-v32-observed="'+id+'"]').value,evidence=document.querySelector('[data-v32-evidence="'+id+'"]').value;recordTest(current,id,status,evidence,observed);save(current);render();renderSaved();$("v32Status").textContent="Evidence entry saved locally. It has not been independently verified.";return;}
 if(b.id==="v32Approve"){decide(current,"APPROVE_READINESS",$("v32OwnerNote").value);save(current);render();renderSaved();$("v32Status").textContent="Owner readiness decision recorded locally. No agent was activated.";return;}
 if(b.id==="v32Reject"){decide(current,"REJECT",$("v32OwnerNote").value);save(current);render();renderSaved();$("v32Status").textContent="Owner rejection recorded locally.";return;}
 if(b.id==="v32Export"){if(!current)throw new Error("Generate or open an evidence pack first.");exportCurrent();return;}
 if(b.dataset.v32Open!==undefined){const all=read(STORE);current=all[Number(b.dataset.v32Open)];if(!current)throw new Error("Saved evidence pack not found.");$("v32Output").hidden=false;render();$("v32Status").textContent="Saved evidence pack opened.";return;}
 }catch(err){$("v32Status").textContent=err.message;}
 });
}
window.MOBILE_AI_STUDIO_VALIDATION={version:"1.0.0",categories:CATEGORIES.map(x=>({...x})),casesFor,evaluate,create,recordTest,decide};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{inject();wire();});else{inject();wire();}
})();