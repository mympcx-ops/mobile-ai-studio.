(()=>{"use strict";
const KEY="mobile-ai-studio-command-center-v1.1", $=id=>document.getElementById(id);
const blank={tasks:[],communications:[],approvals:[],validationReviews:[]};
function load(){try{return Object.assign({},blank,JSON.parse(localStorage.getItem(KEY)||"{}"));}catch(e){return {...blank};}}
let data=load();
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function save(){try{localStorage.setItem(KEY,JSON.stringify(data));render();}catch(e){alert("Could not save Command Center data. Check phone storage.");}}
function date(v){return new Date(v).toLocaleString();}
function renderMetrics(){
 const el=$("ccMetrics");if(!el)return;
 const pending=data.approvals.filter(x=>x.status==="PENDING").length;
 const open=data.tasks.filter(x=>x.status!=="DONE").length;
 el.innerHTML=[
 ["Open tasks",open],["Pending approvals",pending],["Communication notes",data.communications.length],["Agent roles","35 planned"]
 ].map(([k,v])=>'<div class="tile" style="min-height:82px;cursor:default"><div class="small">'+esc(k)+'</div><div style="font-size:25px;font-weight:800;margin-top:7px">'+esc(v)+'</div></div>').join("");
}
function renderTasks(){
 const el=$("ccTaskList");if(!el)return;
 if(!data.tasks.length){el.innerHTML='<div class="empty">No tasks yet. Add the first Command Center task above.</div>';return;}
 el.innerHTML=data.tasks.map(t=>'<div class="item"><div class="row between"><strong>'+esc(t.title)+'</strong><span class="small">'+esc(t.priority)+'</span></div><p class="muted" style="white-space:pre-wrap;margin:6px 0">'+esc(t.details||"No details recorded.")+'</p><div class="row between"><small>'+esc(t.status)+' · '+date(t.created)+'</small><button data-cc-task="'+t.id+'">'+(t.status==="DONE"?"Reopen":"Mark done")+'</button></div></div>').join("");
}
function renderMessages(){
 const el=$("ccMessageList");if(!el)return;
 if(!data.communications.length){el.innerHTML='<div class="empty">No communication notes recorded.</div>';return;}
 el.innerHTML=data.communications.map(m=>'<div class="item"><small>'+date(m.created)+' · LOCAL NOTE</small><p style="white-space:pre-wrap;margin:7px 0">'+esc(m.text)+'</p></div>').join("");
}
function renderApprovals(){
 const el=$("ccApprovalList");if(!el)return;
 if(!data.approvals.length){el.innerHTML='<div class="empty">No proposals awaiting review.</div>';return;}
 el.innerHTML=data.approvals.map(a=>'<div class="item"><div class="row between"><strong>'+esc(a.title)+'</strong><span class="directory-state">'+esc(a.status)+'</span></div><p class="muted" style="white-space:pre-wrap;margin:7px 0">'+esc(a.reason||"No supporting details provided.")+'</p><small>Submitted '+date(a.created)+'</small>'+(a.status==="PENDING"?'<div class="modal-actions"><button data-cc-approval="'+a.id+'" data-decision="APPROVED">Record approval</button><button data-cc-approval="'+a.id+'" data-decision="REJECTED">Reject proposal</button></div>':'<p class="small">Decision recorded '+date(a.decidedAt)+'. No system action was performed.</p>')+'</div>').join("");
}
function renderValidation(){
 const select=$("ccValidationRole"),list=$("ccValidationList");if(!select||!list)return;
 const catalog=window.MOBILE_AGENT_CATALOG||{};
 const roles=[...(catalog.agents||[]),...(catalog.oversight||[])];
 const prior=select.value;
 if(roles.length){select.innerHTML='<option value="">Select a role</option>'+roles.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+' · '+esc(r.floor)+'</option>').join("");if(prior)select.value=prior;}
 if(!data.validationReviews.length){list.innerHTML='<div class="empty">No validation evidence recorded yet. All roles remain NOT_RUN until reviewed.</div>';return;}
 list.innerHTML=data.validationReviews.map(v=>'<div class="item"><div class="row between"><strong>'+esc(v.roleName)+'</strong><span class="directory-state">'+esc(v.outcome)+'</span></div><small>Reviewer: '+esc(v.reviewer)+' · '+date(v.created)+'</small><p class="muted" style="white-space:pre-wrap;margin:7px 0">'+esc(v.evidence||"No evidence details supplied.")+'</p><small>Owner-entered record; independent reviewer identity and evidence not externally verified.</small></div>').join("");
}
function renderHealth(){
 const el=$("ccHealth");if(!el)return;
 let storage="Available";try{const k="__cc_health_test__";localStorage.setItem(k,"1");localStorage.removeItem(k);}catch(e){storage="Unavailable";}
 const online=navigator.onLine?"Browser reports online":"Browser reports offline";
 el.innerHTML='<div class="item row between"><strong>Phone browser storage</strong><span class="small">'+storage+'</span></div><div class="item row between"><strong>Network indication</strong><span class="small">'+online+'</span></div><div class="item row between"><strong>PC backend</strong><span class="small">Not connected / not tested</span></div><div class="item row between"><strong>Quinn / Ollama</strong><span class="small">Not connected</span></div><div class="item row between"><strong>Agent execution</strong><span class="small">Disabled · planned only</span></div><p class="notice" style="margin-top:10px">This is a phone-side status snapshot. It cannot inspect PC hardware, local services, Quinn, Ollama, or live agent health until a secure backend connection is implemented and tested.</p>';
}
function render(){renderMetrics();renderTasks();renderMessages();renderApprovals();renderValidation();renderHealth();}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="ccAddTask"){const title=$("ccTaskTitle").value.trim();if(!title)return alert("Enter a task title.");data.tasks.unshift({id:Date.now(),title,details:$("ccTaskDetails").value.trim(),priority:$("ccTaskPriority").value,status:"OPEN",created:new Date().toISOString()});$("ccTaskTitle").value="";$("ccTaskDetails").value="";save();return;}
 if(b.id==="ccAddMessage"){const text=$("ccMessage").value.trim();if(!text)return alert("Write a communication note first.");data.communications.unshift({id:Date.now(),text,created:new Date().toISOString()});data.communications=data.communications.slice(0,100);$("ccMessage").value="";save();return;}
 if(b.id==="ccAddApproval"){const title=$("ccApprovalTitle").value.trim();if(!title)return alert("Enter the proposal that needs review.");data.approvals.unshift({id:Date.now(),title,reason:$("ccApprovalReason").value.trim(),status:"PENDING",created:new Date().toISOString()});$("ccApprovalTitle").value="";$("ccApprovalReason").value="";save();return;}
 if(b.id==="ccSaveValidation"){const roleId=$("ccValidationRole").value,reviewer=$("ccValidator").value.trim(),outcome=$("ccValidationOutcome").value,evidence=$("ccValidationEvidence").value.trim();const catalog=window.MOBILE_AGENT_CATALOG||{};const role=[...(catalog.agents||[]),...(catalog.oversight||[])].find(x=>x.id===roleId);if(!role)return alert("Select a role from the canonical fleet.");if(!reviewer)return alert("Enter the human reviewer name or role.");data.validationReviews.unshift({id:Date.now(),roleId,roleName:role.name,reviewer,outcome,evidence,created:new Date().toISOString()});$("ccValidationEvidence").value="";save();return;}
 if(b.id==="ccRefreshHealth"){renderHealth();return;}
 if(b.dataset.ccTask){const t=data.tasks.find(x=>x.id===Number(b.dataset.ccTask));if(t)t.status=t.status==="DONE"?"OPEN":"DONE";save();return;}
 if(b.dataset.ccApproval){const a=data.approvals.find(x=>x.id===Number(b.dataset.ccApproval));if(!a||a.status!=="PENDING")return;const decision=b.dataset.decision;if(!confirm("Record "+decision+" for this proposal? This only records your decision locally; it does not execute or activate anything."))return;a.status=decision;a.decidedAt=new Date().toISOString();save();}
});
window.addEventListener("online",renderHealth);window.addEventListener("offline",renderHealth);window.addEventListener("load",renderValidation);
render();
})();