(()=>{"use strict";
const STORE="mobile-ai-studio-workflows-v1";
const DRAFTS="mobile-ai-studio-prompt-agent-v1";
const PROPOSALS="mobile-ai-studio-tool-proposals-v1";
const EVIDENCE="mobile-ai-studio-validation-evidence-v1";
const $=id=>document.getElementById(id);
const safe=v=>String(v??"").trim();
const now=()=>new Date().toISOString();
function read(key){try{const x=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(x)?x:[];}catch(e){return [];}}
function write(key,items){localStorage.setItem(key,JSON.stringify(items));}
function saveOne(key,item,idKey){const items=read(key).filter(x=>x[idKey]!==item[idKey]);items.unshift(item);write(key,items.slice(0,60));}
function stageFor(w,validation){
 if(!w||!validation)return "NEEDS_VALIDATION";
 const v=window.MOBILE_AI_STUDIO_VALIDATION.evaluate(validation);
 if(validation.ownerDecision==="REJECTED_BY_OWNER")return "OWNER_REJECTED";
 if(validation.ownerDecision==="READINESS_APPROVED_BY_OWNER")return "OWNER_APPROVED_READINESS";
 if(v.status==="FAIL")return "REPAIR_REQUIRED";
 if(v.status==="BLOCKED")return "SECURITY_REVIEW_REQUIRED";
 if(v.eligible)return "AWAITING_OWNER_APPROVAL";
 if(validation.tests.some(t=>t.status!=="NOT_RUN"))return "VALIDATION_IN_PROGRESS";
 return "AWAITING_INDEPENDENT_VALIDATION";
}
function createWorkflow(prompt,apis){
 const text=safe(prompt);if(text.length<8)throw new Error("Describe the agent's mission in at least 8 characters.");
 if(text.length>3000)throw new Error("Keep the mission under 3,000 characters.");
 const p=apis||window;
 const blueprint=p.MOBILE_AI_STUDIO_PROMPT_AGENT.classify(text);
 const proposal=p.MOBILE_AI_STUDIO_TOOL_REGISTRY.analyze(blueprint);
 const validation=p.MOBILE_AI_STUDIO_VALIDATION.create(blueprint,"");
 const workflow={format:"mobile-ai-studio-agent-workflow/1",workflowId:"FLOW-"+Date.now().toString(36).toUpperCase(),createdAt:now(),updatedAt:now(),prompt:text,agentName:blueprint.name,blueprintId:blueprint.blueprintId,blueprintKey:DRAFTS,proposalId:blueprint.blueprintId,validationId:validation.validationId,stages:[
 {id:"design",label:"Agent blueprint",status:"GENERATED",detail:"Mission, role, workflow, suggested capabilities and default-deny permissions generated locally."},
 {id:"tools",label:"Tool & dependency map",status:"PROPOSED",detail:proposal.summary.knownTools+" known tool mappings and "+proposal.summary.dependenciesToReview+" dependency proposals; nothing connected or installed."},
 {id:"validation",label:"Independent validation",status:"NOT_STARTED",detail:"Six required validation scenarios created; no tests executed."},
 {id:"owner",label:"Owner decision",status:"LOCKED",detail:"Requires complete evidence and a distinct declared Validator before Owner readiness review."},
 {id:"activation",label:"Activation / host connection",status:"DISABLED",detail:"Not part of this workflow. Separate secure host integration and authorization are required."}
 ],status:"AWAITING_INDEPENDENT_VALIDATION",executionMode:"PHONE_LOCAL_PLANNING_ONLY",executionPerformed:false,activationAuthorized:false,ownerApproval:"PENDING"};
 const drafts=read(DRAFTS);drafts.unshift(blueprint);write(DRAFTS,drafts.slice(0,60));
 saveOne(PROPOSALS,{...proposal,ownerReview:"PENDING",reviewNote:"",savedAt:now()}, "blueprintId");
 saveOne(EVIDENCE,validation,"validationId");
 saveOne(STORE,workflow,"workflowId");
 return {workflow,blueprint,proposal,validation};
}
function refreshWorkflow(workflow,validation){
 if(!workflow)throw new Error("No workflow selected.");
 const next={...workflow,updatedAt:now(),status:stageFor(workflow,validation),ownerApproval:validation.ownerDecision||"PENDING",executionPerformed:false,activationAuthorized:false};
 next.stages=workflow.stages.map(s=>{
  if(s.id==="design")return {...s,status:"GENERATED"};
  if(s.id==="tools")return {...s,status:"PROPOSED"};
  if(s.id==="validation"){const report=window.MOBILE_AI_STUDIO_VALIDATION.evaluate(validation);return {...s,status:report.eligible?"EVIDENCE_COMPLETE":report.status,detail:report.status+" · "+validation.tests.filter(t=>t.status!=="NOT_RUN").length+"/6 outcomes recorded. Evidence is manually entered and not authenticated."};}
  if(s.id==="owner"){return {...s,status:validation.ownerDecision==="READINESS_APPROVED_BY_OWNER"?"READINESS_APPROVED":validation.ownerDecision==="REJECTED_BY_OWNER"?"REJECTED":stageFor(workflow,validation)==="AWAITING_OWNER_APPROVAL"?"READY_FOR_REVIEW":"LOCKED"};}
  return {...s,status:"DISABLED"};
 });
 saveOne(STORE,next,"workflowId");return next;
}
function statusLabel(s){return ({AWAITING_INDEPENDENT_VALIDATION:"Awaiting independent validation",VALIDATION_IN_PROGRESS:"Validation in progress",AWAITING_OWNER_APPROVAL:"Awaiting Owner readiness review",OWNER_APPROVED_READINESS:"Owner approved readiness record",OWNER_REJECTED:"Rejected by Owner",REPAIR_REQUIRED:"Repair required",SECURITY_REVIEW_REQUIRED:"Security review required",NEEDS_VALIDATION:"Needs validation"})[s]||s;}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
let current=null;
function loadValidation(){return read(EVIDENCE).find(x=>x.validationId===current?.validationId)||null;}
function render(){
 const out=$("v33Output");if(!out||!current)return;
 const validation=loadValidation();if(!validation){out.innerHTML='<div class="notice">The linked validation evidence pack is missing. Recreate the workflow from its prompt.</div>';return;}
 current=refreshWorkflow(current,validation);
 const steps=current.stages.map((s,i)=>'<article class="v33-step"><div class="v33-step-index">'+String(i+1).padStart(2,"0")+'</div><div><strong>'+esc(s.label)+'</strong><span class="v33-status">'+esc(s.status)+'</span><p>'+esc(s.detail)+'</p></div></article>').join("");
 out.innerHTML='<div class="v33-overview"><strong>'+esc(current.agentName)+'</strong><span>'+esc(statusLabel(current.status))+'</span><small>Workflow '+esc(current.workflowId)+' · '+esc(current.blueprintId)+'</small></div><div class="v33-timeline">'+steps+'</div><div class="v33-boundary">This orchestrator coordinates local planning records only. It does not call external tools, run tests, verify evidence, authenticate reviewers, connect Quinn, or activate agents.</div><div class="row" style="flex-wrap:wrap;margin-top:12px"><button id="v33OpenBlueprint">Open blueprint</button><button id="v33OpenTools">Open tool planner</button><button id="v33OpenValidation" class="primary">Open validation evidence</button><button id="v33Export">Export full workflow package</button></div>';
}
function renderSaved(){
 const el=$("v33Saved");if(!el)return;const items=read(STORE);
 el.innerHTML=items.length?items.map((w,i)=>'<button data-v33-load="'+i+'">'+esc(w.agentName)+' · '+esc(statusLabel(w.status))+'</button>').join("<br>"):"No workflows generated yet.";
}
function inject(){
 const root=$("agents");if(!root||$("agentWorkflowOrchestrator"))return;
 const section=document.createElement("section");section.id="agentWorkflowOrchestrator";section.className="section v33-shell";
 section.innerHTML='<div class="section-head"><div><span class="v33-kicker">V3.3 · AGENT WORKFLOW ORCHESTRATOR</span><h2>One prompt. One coordinated workflow.</h2></div><span class="v33-tag">PHONE-LOCAL</span></div><p class="muted">Describe an agent once. The Studio chains blueprint design, tool/dependency mapping and a six-part validation pack, then tracks the independent review and Owner decision gates.</p><label for="v33Prompt" class="small">What should this agent do?</label><textarea id="v33Prompt" class="field" rows="4" maxlength="3000" placeholder="Example: Build a racing telemetry analyst that reviews braking traces, identifies lost time and prepares evidence-backed coaching reports."></textarea><div class="row" style="flex-wrap:wrap;margin-top:9px"><button id="v33Create" class="primary">Build complete workflow</button><button id="v33Refresh">Refresh saved workflows</button></div><div id="v33Status" class="notice" aria-live="polite" style="margin-top:10px">Your prompt will create a blueprint, capability/dependency proposal and validation evidence pack in one action.</div><div id="v33Output" class="v33-output" hidden></div><div class="section"><h3>Saved workflows</h3><div id="v33Saved" class="notice">No workflows generated yet.</div></div>';
 const planner=$("promptToAgent");root.insertBefore(section,planner?planner:root.firstChild);renderSaved();
}
function exportPackage(){
 if(!current)throw new Error("Create or open a workflow first.");
 const validation=loadValidation(),draft=read(DRAFTS).find(x=>x.blueprintId===current.blueprintId),proposal=read(PROPOSALS).find(x=>x.blueprintId===current.blueprintId);
 const payload={format:"mobile-ai-studio-agent-workflow-package/1",workflow:current,blueprint:draft||null,toolReadinessProposal:proposal||null,validationEvidence:validation||null,exportedAt:now(),trustNotice:"Local planning and manually entered evidence only. No tool execution, identity authentication, host connection or activation is represented."};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="mobile-ai-studio-workflow-"+current.workflowId+".json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function wire(){
 document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;try{
 if(b.id==="v33Create"){const result=createWorkflow($("v33Prompt").value);current=result.workflow;$("v33Output").hidden=false;render();renderSaved();$("v33Status").textContent="Complete local workflow generated. Blueprint, tool proposal and validation pack saved. No tests were executed and no tools were connected.";return;}
 if(b.id==="v33Refresh"){renderSaved();$("v33Status").textContent="Saved workflow list refreshed.";return;}
 if(b.dataset.v33Load!==undefined){current=read(STORE)[Number(b.dataset.v33Load)]||null;if(!current)throw new Error("Saved workflow not found.");$("v33Prompt").value=current.prompt;$("v33Output").hidden=false;render();$("v33Status").textContent="Saved workflow opened. Status recalculated from its linked validation record.";return;}
 if(b.id==="v33Export"){exportPackage();return;}
 if(b.id==="v33OpenBlueprint"||b.id==="v33OpenTools"||b.id==="v33OpenValidation"){const id=b.id==="v33OpenBlueprint"?"promptToAgent":b.id==="v33OpenTools"?"toolReadinessPlanner":"v32ValidationEngine";$(id)?.scrollIntoView({behavior:"smooth",block:"start"});return;}
 }catch(err){$("v33Status").textContent=err.message;}});
}
window.MOBILE_AI_STUDIO_WORKFLOW={version:"1.0.0",createWorkflow,refreshWorkflow,stageFor,statusLabel,read};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{inject();wire();renderSaved();});else{inject();wire();renderSaved();}
})();