(()=>{"use strict";
const KEY="mobile-ai-studio-v1.2-workspaces", $=id=>document.getElementById(id);
const blank={assignments:[],reviews:[]};
function load(){try{return Object.assign({},blank,JSON.parse(localStorage.getItem(KEY)||"{}"));}catch(e){return {...blank};}}
let data=load();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function save(){try{localStorage.setItem(KEY,JSON.stringify(data));render();}catch(e){alert("Workspace data could not be saved on this phone.");}}
function catalog(){return window.MOBILE_AGENT_CATALOG||{agents:[],managers:[],oversight:[]};}
function render(){
 const c=catalog(), agent=$("v12WsAgent"), manager=$("v12WsManager"), dep=$("v12WsDependency"), reviewRole=$("v12ReviewRole"), queue=$("v12WsQueue"), reviews=$("v12WsReviews"), summary=$("v12WsSummary");
 if(!agent||!manager||!dep||!reviewRole||!queue||!reviews)return;
 const fill=(el,items,placeholder,fn)=>{const old=el.value;el.innerHTML='<option value="">'+placeholder+'</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(fn(x))+'</option>').join("");if(old)el.value=old;};
 fill(agent,c.agents,"Select agent",x=>x.floor+" · "+x.name);
 fill(manager,c.managers,"Select manager",x=>x.floor+" · "+x.name);
 fill(reviewRole,c.agents,"Select agent to validate",x=>x.floor+" · "+x.name);
 fill(dep,data.assignments.filter(x=>x.status!=="ACCEPTED"&&x.status!=="CANCELLED"),"No prerequisite",x=>x.title);
 const pending=data.assignments.filter(x=>x.status!=="ACCEPTED"&&x.status!=="CANCELLED").length;
 if(summary)summary.innerHTML='<div class="tile"><div class="small">Proposed / active work</div><strong>'+pending+'</strong></div><div class="tile"><div class="small">Awaiting validation</div><strong>'+data.assignments.filter(x=>x.status==="READY_FOR_VALIDATION").length+'</strong></div><div class="tile"><div class="small">Validation records</div><strong>'+data.reviews.length+'</strong></div>';
 queue.innerHTML=data.assignments.length?data.assignments.map(t=>{const a=c.agents.find(x=>x.id===t.agentId),m=c.managers.find(x=>x.id===t.managerId),d=data.assignments.find(x=>x.id===t.dependsOn);return '<div class="item"><div class="row between"><strong>'+esc(t.title)+'</strong><span class="directory-state">'+esc(t.status)+'</span></div><small>'+esc(a?.name||"Unknown agent")+' · Manager: '+esc(m?.name||"Unassigned")+' · '+esc(t.priority)+'</small><p class="muted">'+esc(t.scope)+'</p><small>Acceptance: '+esc(t.acceptance)+'</small><small>Prerequisite: '+esc(d?.title||"None")+'</small><div class="row" style="margin-top:8px;flex-wrap:wrap">'+(t.status==="PROPOSED"?'<button data-ws-status="ASSIGNED" data-ws-id="'+t.id+'">Assign locally</button>':"")+(t.status==="ASSIGNED"?'<button data-ws-status="IN_PROGRESS" data-ws-id="'+t.id+'">Start work (record only)</button>':"")+(t.status==="IN_PROGRESS"?'<button data-ws-status="READY_FOR_VALIDATION" data-ws-id="'+t.id+'">Submit for validation</button>':"")+(t.status==="READY_FOR_VALIDATION"?'<span class="small">Awaiting independent review</span>':"")+(t.status==="CHANGES_REQUESTED"?'<button data-ws-status="IN_PROGRESS" data-ws-id="'+t.id+'">Reopen for changes</button>':"")+'</div></div>';}).join(""):'<div class="empty">No agent work proposals yet.</div>';
 reviews.innerHTML=data.reviews.length?data.reviews.map(r=>'<div class="item"><div class="row between"><strong>'+esc(r.assignmentTitle)+'</strong><span class="directory-state">'+esc(r.outcome)+'</span></div><small>Agent: '+esc(r.agentName)+' · Reviewer: '+esc(r.reviewer)+' · '+new Date(r.at).toLocaleString()+'</small><p class="muted">'+esc(r.evidence)+'</p></div>').join(""):'<div class="empty">No independent validation evidence recorded.</div>';
}
function inject(){
 const root=$("command");if(!root||$("v12Workspaces"))return;
 const wrap=document.createElement("div");wrap.id="v12Workspaces";
 wrap.innerHTML='<section class="section"><div class="section-head"><h2>Agent Workspaces &amp; Task Orchestration</h2><span class="small">Local planning only</span></div><div class="notice">Assignments below are proposals and local workflow records. They do not dispatch work, start agents or execute tools. A task must pass its prerequisite before it can advance.</div><div id="v12WsSummary" class="grid" style="margin:10px 0"></div><div class="panel"><h3>New agent work proposal</h3><input id="v12WsTitle" class="field" placeholder="Task / deliverable title"><div class="row" style="margin-top:8px"><select id="v12WsAgent" class="field"><option value="">Select agent</option></select><select id="v12WsManager" class="field"><option value="">Select manager</option></select></div><div class="row" style="margin-top:8px"><select id="v12WsDependency" class="field"><option value="">No prerequisite</option></select><select id="v12WsPriority" class="field"><option>Normal</option><option>High</option><option>Critical</option><option>Low</option></select></div><textarea id="v12WsScope" class="field" style="margin-top:8px" placeholder="Scope, constraints and required output"></textarea><textarea id="v12WsAcceptance" class="field" style="margin-top:8px" placeholder="Acceptance criteria / evidence required"></textarea><button id="v12WsCreate" class="primary" style="width:100%;margin-top:8px">Save work proposal</button></div><div id="v12WsQueue" style="margin-top:10px"></div></section><section class="section"><div class="section-head"><h2>Independent Validator Workspace</h2></div><div class="notice">The reviewer must be different from the recorded builder. This is a user-entered declaration, not identity verification. Validation outcomes do not activate or deploy agents.</div><div class="panel"><select id="v12ReviewTask" class="field"><option value="">Select submitted task</option></select><select id="v12ReviewRole" class="field" style="margin-top:8px"><option value="">Select agent to validate</option></select><input id="v12Reviewer" class="field" style="margin-top:8px" placeholder="Independent reviewer name / role"><textarea id="v12ReviewEvidence" class="field" style="margin-top:8px" placeholder="Test steps, results, evidence references and findings"></textarea><select id="v12ReviewOutcome" class="field" style="margin-top:8px"><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="CHANGES_REQUESTED">CHANGES REQUESTED</option></select><button id="v12ReviewSave" class="primary" style="width:100%;margin-top:8px">Record validation evidence</button></div><div id="v12WsReviews" style="margin-top:10px"></div></section>';
 root.appendChild(wrap);
 const oldRender=render;render=()=>{oldRender();const task=$("v12ReviewTask");if(task){const prior=task.value;const ready=data.assignments.filter(x=>x.status==="READY_FOR_VALIDATION");task.innerHTML='<option value="">Select submitted task</option>'+ready.map(x=>'<option value="'+x.id+'">'+esc(x.title)+'</option>').join("");if(prior)task.value=prior;}};
 render();
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="v12WsCreate"){
  const c=catalog(),agent=c.agents.find(x=>x.id===$("v12WsAgent").value),manager=c.managers.find(x=>x.id===$("v12WsManager").value),title=$("v12WsTitle").value.trim();
  if(!title||!agent||!manager)return alert("Enter a title and select an agent and manager.");
  if(agent.floor!==manager.floor)return alert("The selected manager must belong to the agent's floor.");
  data.assignments.unshift({id:Date.now(),title,agentId:agent.id,agentName:agent.name,managerId:manager.id,managerName:manager.name,dependsOn:Number($("v12WsDependency").value)||null,priority:$("v12WsPriority").value,scope:$("v12WsScope").value.trim(),acceptance:$("v12WsAcceptance").value.trim(),status:"PROPOSED",builder:manager.name,created:new Date().toISOString()});
  $("v12WsTitle").value="";$("v12WsScope").value="";$("v12WsAcceptance").value="";save();return;
 }
 if(b.dataset.wsStatus){
  const t=data.assignments.find(x=>x.id===Number(b.dataset.wsId));if(!t)return;
  if(b.dataset.wsStatus==="ASSIGNED"&&t.dependsOn){const d=data.assignments.find(x=>x.id===t.dependsOn);if(d&&d.status!=="ACCEPTED")return alert("This proposal is blocked until its prerequisite is accepted.");}
  t.status=b.dataset.wsStatus;t.updated=new Date().toISOString();save();return;
 }
 if(b.id==="v12ReviewSave"){
  const t=data.assignments.find(x=>x.id===Number($("v12ReviewTask").value)),role=catalog().agents.find(x=>x.id===$("v12ReviewRole").value),reviewer=$("v12Reviewer").value.trim(),evidence=$("v12ReviewEvidence").value.trim(),outcome=$("v12ReviewOutcome").value;
  if(!t||!role||!reviewer||!evidence)return alert("Select a submitted task and agent, and provide reviewer and evidence.");
  if(t.status!=="READY_FOR_VALIDATION"||t.agentId!==role.id)return alert("The selected role must match a task currently awaiting validation.");
  if(reviewer.toLowerCase()===String(t.builder).toLowerCase())return alert("The builder cannot validate their own work. Assign a different reviewer.");
  data.reviews.unshift({id:Date.now(),assignmentId:t.id,assignmentTitle:t.title,agentName:role.name,reviewer,evidence,outcome,at:new Date().toISOString()});
  t.status=outcome==="PASS"?"ACCEPTED":"CHANGES_REQUESTED";t.validation=outcome;t.validatedAt=new Date().toISOString();$("v12ReviewEvidence").value="";save();return;
 }
});
window.addEventListener("load",()=>{inject();render();});
document.addEventListener("DOMContentLoaded",()=>{inject();render();});
window.addEventListener("storage",e=>{if(e.key===KEY){data=load();render();}});
})();
