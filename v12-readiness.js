(()=>{"use strict";
const KEY="mobile-ai-studio-v1.2-readiness";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const blank={tasks:[],checks:[],observations:[]};
function load(){try{return Object.assign({},blank,JSON.parse(localStorage.getItem(KEY)||"{}"));}catch(e){return {...blank};}}
let state=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));render();}catch(e){alert("Could not save readiness data on this phone.");}}
function audit(type,detail){state.observations.unshift({id:Date.now()+Math.random(),type,detail,at:new Date().toISOString()});state.observations=state.observations.slice(0,200);}
function inject(){
 const root=$("command");if(!root||$("v12Readiness"))return;
 const wrap=document.createElement("div");wrap.id="v12Readiness";
 wrap.innerHTML=`
 <section class="section"><div class="section-head"><h2>Dependency &amp; Readiness Tracker</h2><span class="small">V1.2 · local only</span></div>
 <div class="notice">Dependency records prevent a task from being marked ready while prerequisites remain open. This is a planning gate only: no agent dispatch or execution occurs.</div>
 <div class="panel" style="margin-top:9px"><input id="v12DepTitle" class="field" placeholder="New work item / deliverable">
 <textarea id="v12DepCriteria" class="field" style="margin-top:8px" placeholder="Acceptance criteria and evidence required"></textarea>
 <label class="small" for="v12DepPrereq" style="display:block;margin:8px 0 5px">Prerequisites (select any existing open work items)</label>
 <select id="v12DepPrereq" class="field" multiple size="4" aria-label="Prerequisite work items"></select>
 <button id="v12DepAdd" class="primary" style="width:100%;margin-top:9px">＋ Add dependency-tracked item</button></div>
 <div id="v12DepList" class="panel" style="margin-top:9px"></div></section>
 <section class="section"><div class="section-head"><h2>PC Backend Monitor</h2><span class="small">Connection truth</span></div>
 <div class="panel"><div class="row between"><strong>Phone application</strong><span class="directory-state">LOCAL</span></div>
 <div class="row between" style="margin-top:10px"><strong>Browser network indication</strong><span id="v12NetState" class="directory-state">CHECKING</span></div>
 <div class="row between" style="margin-top:10px"><strong>PC backend</strong><span class="directory-state">NOT CONFIGURED</span></div>
 <div class="row between" style="margin-top:10px"><strong>Quinn / Ollama</strong><span class="directory-state">NOT CONNECTED</span></div>
 <div class="row between" style="margin-top:10px"><strong>Telemetry / agent runtime</strong><span class="directory-state">NOT AVAILABLE</span></div>
 <p class="notice" style="margin-top:12px">The browser's online indicator does not prove that your PC is reachable. No endpoint, credentials, heartbeat or runtime connection has been configured. No connection is being simulated.</p>
 <label class="small" for="v12PcNote" style="display:block;margin:10px 0 5px">Owner's local setup note (optional)</label>
 <textarea id="v12PcNote" class="field" placeholder="Record intended host setup or what needs to be verified"></textarea>
 <button id="v12PcNoteSave" style="width:100%;margin-top:8px">Save setup note locally</button>
 <p id="v12PcNoteStatus" class="small" style="margin:8px 0 0"></p></div>
 </section>
 <section class="section"><div class="section-head"><h2>Independent Evidence Checks</h2><span class="small">Human-entered records</span></div>
 <div class="notice">A recorded check is not automatically independent or verified. The reviewer and evidence are entered by the Owner and must be checked separately.</div>
 <div class="panel" style="margin-top:9px"><input id="v12CheckScope" class="field" placeholder="Deliverable / requirement reviewed">
 <input id="v12CheckReviewer" class="field" style="margin-top:8px" placeholder="Independent reviewer">
 <select id="v12CheckResult" class="field" style="margin-top:8px"><option value="NOT_RUN">NOT RUN</option><option value="PASS_RECORDED">PASS RECORDED</option><option value="FAIL_RECORDED">FAIL RECORDED</option><option value="BLOCKED">BLOCKED</option></select>
 <textarea id="v12CheckEvidence" class="field" style="margin-top:8px" placeholder="Evidence location, test performed, result and limitations"></textarea>
 <button id="v12CheckSave" class="primary" style="width:100%;margin-top:8px">Record evidence check</button></div>
 <div id="v12CheckList" class="panel" style="margin-top:9px"></div></section>
 <section class="section"><div class="section-head"><h2>V1.2 Change &amp; Evidence Log</h2><span class="small">Local audit trail</span></div><div id="v12ReadinessAudit" class="panel"></div></section>`;
 root.appendChild(wrap);
 const note=localStorage.getItem("mobile-ai-studio-v1.2-pc-note")||"";if($("v12PcNote"))$("v12PcNote").value=note;
}
function renderTasks(){
 const select=$("v12DepPrereq"),list=$("v12DepList");if(!select||!list)return;
 const previous=[...select.selectedOptions].map(o=>o.value);
 select.innerHTML=state.tasks.filter(t=>t.status!=="DONE").map(t=>'<option value="'+t.id+'">'+esc(t.title)+'</option>').join("");
 previous.forEach(v=>{const o=[...select.options].find(x=>x.value===v);if(o)o.selected=true;});
 if(!state.tasks.length){list.innerHTML='<div class="empty">No dependency-tracked work items yet.</div>';return;}
 list.innerHTML=state.tasks.map(t=>{
  const prereqs=(t.dependsOn||[]).map(id=>state.tasks.find(x=>x.id===id)).filter(Boolean);
  const unresolved=prereqs.filter(x=>x.status!=="DONE");
  const canComplete=unresolved.length===0;
  return '<div class="item"><div class="row between"><strong>'+esc(t.title)+'</strong><span class="directory-state">'+(t.status==="DONE"?"DONE":unresolved.length?"BLOCKED":"READY TO REVIEW")+'</span></div>'+
  '<p class="muted" style="white-space:pre-wrap;margin:7px 0">'+esc(t.criteria||"Acceptance criteria not specified.")+'</p>'+
  '<small>Prerequisites: '+(prereqs.length?prereqs.map(x=>esc(x.title)+" ("+esc(x.status)+")").join(" · "):"None")+'</small>'+
  (unresolved.length?'<p class="small" style="color:#ffd58b">Blocked by '+unresolved.length+' unfinished prerequisite(s).</p>':'')+
  '<div style="margin-top:8px"><button data-v12-dep-done="'+t.id+'" '+(!canComplete&&t.status!=="DONE"?"disabled":"")+'>'+(t.status==="DONE"?"Reopen item":"Mark prerequisite complete")+'</button></div></div>';
 }).join("");
}
function renderChecks(){
 const list=$("v12CheckList");if(!list)return;
 list.innerHTML=state.checks.length?state.checks.map(c=>'<div class="item"><div class="row between"><strong>'+esc(c.scope)+'</strong><span class="directory-state">'+esc(c.result)+'</span></div><small>Reviewer: '+esc(c.reviewer)+' · '+new Date(c.at).toLocaleString()+'</small><p class="muted" style="white-space:pre-wrap">'+esc(c.evidence)+'</p><small>Owner-entered record; reviewer independence and source evidence are not externally verified.</small></div>').join(""):'<div class="empty">No evidence checks recorded. Status remains NOT RUN.</div>';
}
function render(){
 renderTasks();renderChecks();
 const net=$("v12NetState");if(net)net.textContent=navigator.onLine?"BROWSER ONLINE":"BROWSER OFFLINE";
 const auditList=$("v12ReadinessAudit");if(auditList)auditList.innerHTML=state.observations.length?state.observations.slice(0,35).map(x=>'<div class="item"><strong>'+esc(x.type)+'</strong><small>'+new Date(x.at).toLocaleString()+'</small><p class="muted">'+esc(x.detail)+'</p></div>').join(""):'<div class="empty">No V1.2 readiness events recorded.</div>';
 const noteStatus=$("v12PcNoteStatus");if(noteStatus)noteStatus.textContent=localStorage.getItem("mobile-ai-studio-v1.2-pc-note")?"A local setup note is saved on this phone.":"No local setup note saved.";
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="v12DepAdd"){
  const title=$("v12DepTitle").value.trim();if(!title)return alert("Enter a work item title.");
  const dependsOn=[...$("v12DepPrereq").selectedOptions].map(o=>Number(o.value));
  if(dependsOn.includes(Date.now()))return;
  const id=Date.now();state.tasks.unshift({id,title,criteria:$("v12DepCriteria").value.trim(),dependsOn,status:"OPEN",created:new Date().toISOString()});
  audit("DEPENDENCY ITEM CREATED",title+"; "+dependsOn.length+" prerequisite(s).");$("v12DepTitle").value="";$("v12DepCriteria").value="";save();return;
 }
 if(b.dataset.v12DepDone){
  const t=state.tasks.find(x=>x.id===Number(b.dataset.v12DepDone));if(!t)return;
  if(t.status!=="DONE"&&(t.dependsOn||[]).some(id=>state.tasks.some(x=>x.id===id&&x.status!=="DONE")))return alert("This item is blocked. Complete its prerequisites first.");
  t.status=t.status==="DONE"?"OPEN":"DONE";audit("DEPENDENCY ITEM STATUS",t.title+" → "+t.status);save();return;
 }
 if(b.id==="v12PcNoteSave"){
  localStorage.setItem("mobile-ai-studio-v1.2-pc-note",$("v12PcNote").value.trim());audit("PC SETUP NOTE SAVED","Owner setup note stored locally; no backend connection was attempted.");save();return;
 }
 if(b.id==="v12CheckSave"){
  const scope=$("v12CheckScope").value.trim(),reviewer=$("v12CheckReviewer").value.trim(),evidence=$("v12CheckEvidence").value.trim(),result=$("v12CheckResult").value;
  if(!scope||!reviewer||!evidence)return alert("Enter the scope, reviewer and evidence details.");
  state.checks.unshift({id:Date.now(),scope,reviewer,evidence,result,at:new Date().toISOString()});audit("EVIDENCE CHECK RECORDED",scope+" — "+result+"; human-entered, not independently verified.");$("v12CheckEvidence").value="";save();return;
 }
});
window.addEventListener("online",render);window.addEventListener("offline",render);
window.addEventListener("load",()=>{inject();render();});document.addEventListener("DOMContentLoaded",()=>{inject();render();});
})();
