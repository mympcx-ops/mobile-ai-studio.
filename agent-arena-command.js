(function(root){
"use strict";
const STORE="mobile-ai-studio-arena-sessions-v1";
const SCENARIOS=(root.AgentArenaLab&&root.AgentArenaLab.SCENARIOS)||[
{id:"mission",label:"Mission fidelity"},{id:"boundaries",label:"Permission boundaries"},{id:"evidence",label:"Evidence discipline"},{id:"tools",label:"Tool discipline"},{id:"recovery",label:"Failure recovery"},{id:"privacy",label:"Memory and privacy"},{id:"collaboration",label:"Handoff quality"},{id:"owner",label:"Owner authority"}
];
const now=()=>new Date().toISOString();
const clean=(v,n)=>String(v??"").trim().slice(0,n||500);
function createSession(agentA,agentB,input){
 if(!agentA||!agentA.id||!agentA.name||!agentB||!agentB.id||!agentB.name)throw new Error("Choose two valid agent blueprints.");
 if(String(agentA.id)===String(agentB.id))throw new Error("Choose two different agents for a head-to-head session.");
 const title=clean(input&&input.title,120),mission=clean(input&&input.mission,2000),scenarioId=clean(input&&input.scenarioId,80);
 if(!title)throw new Error("Enter a session title.");
 if(!mission)throw new Error("Describe the challenge mission.");
 if(!SCENARIOS.some(s=>s.id===scenarioId))throw new Error("Choose a supported test focus.");
 const createdAt=now();
 return {format:"mobile-ai-studio-arena-session/1",sessionId:"AR-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7).toUpperCase(),createdAt,updatedAt:createdAt,title,mission,scenarioId,scenarioLabel:SCENARIOS.find(s=>s.id===scenarioId).label,participants:[agentA,agentB].map(a=>({id:String(a.id),name:String(a.name),floor:String(a.floor||"Unassigned"),role:String(a.role||"Agent")})),environment:"PHONE_LOCAL_SESSION_PLANNING",status:"AWAITING_OWNER_ACCEPTANCE",ownerDecision:"PENDING",ownerDecisionAt:null,ownerDecisionNote:"",agentDispatched:false,executionPerformed:false,dispatchAuthorized:false,certified:false};
}
function decideSession(session,decision,note){
 if(!session||session.format!=="mobile-ai-studio-arena-session/1")throw new Error("A valid Arena session is required.");
 if(session.ownerDecision!=="PENDING")throw new Error("This session already has an Owner decision.");
 if(!["ACCEPT","DECLINE"].includes(decision))throw new Error("Choose ACCEPT or DECLINE.");
 session.ownerDecision=decision==="ACCEPT"?"ACCEPTED":"DECLINED";
 session.status=decision==="ACCEPT"?"OWNER_ACCEPTED_LOCAL":"DECLINED";
 session.ownerDecisionAt=now();session.ownerDecisionNote=clean(note,1000);session.updatedAt=session.ownerDecisionAt;
 session.dispatchAuthorized=false;session.agentDispatched=false;session.executionPerformed=false;session.certified=false;
 return session;
}
function attachEvidence(session,chamberA,chamberB){
 if(!session||session.format!=="mobile-ai-studio-arena-session/1")throw new Error("A valid Arena session is required.");
 if(session.ownerDecision!=="ACCEPTED")throw new Error("Owner must accept the planning proposal before evidence can be attached.");
 if(!chamberA||!chamberA.chamberId||!chamberA.agent||!chamberB||!chamberB.chamberId||!chamberB.agent)throw new Error("Choose two valid saved Test Chamber records.");
 if(chamberA.agent.id!==session.participants[0].id)throw new Error("Baseline evidence must belong to "+session.participants[0].name+".");
 if(chamberB.agent.id!==session.participants[1].id)throw new Error("Candidate evidence must belong to "+session.participants[1].name+".");
 session.evidence={baselineChamberId:chamberA.chamberId,candidateChamberId:chamberB.chamberId,attachedAt:now()};
 session.updatedAt=session.evidence.attachedAt;return session;
}
function compareSessionEvidence(session,chambers,labApi){
 if(!session||!session.evidence)throw new Error("Attach both Test Chamber records first.");
 const rows=Array.isArray(chambers)?chambers:[],a=rows.find(x=>x.chamberId===session.evidence.baselineChamberId),b=rows.find(x=>x.chamberId===session.evidence.candidateChamberId);
 if(!a||!b)throw new Error("One or both linked Test Chamber records are no longer available.");
 const lab=labApi||root.AgentArenaLab;if(!lab||typeof lab.compareChambers!=="function")throw new Error("The Test Chamber comparison engine is unavailable.");
 return lab.compareChambers(a,b);
}
function readAll(storage){try{const s=storage||root.localStorage,v=JSON.parse(s.getItem(STORE)||"[]");return Array.isArray(v)?v:[]}catch(e){return []}}
function save(session,storage){
 if(!session||!session.sessionId)throw new Error("A valid Arena session is required.");
 const s=storage||root.localStorage,items=readAll(s).filter(x=>x.sessionId!==session.sessionId);
 items.unshift(session);s.setItem(STORE,JSON.stringify(items.slice(0,100)));return session;
}
function remove(sessionId,storage){
 const s=storage||root.localStorage,items=readAll(s).filter(x=>x.sessionId!==sessionId);s.setItem(STORE,JSON.stringify(items));return items;
}
function roster(){const c=root.MOBILE_AGENT_CATALOG||{};return [...(c.agents||[]),...(c.oversight||[])];}
function countRoster(list,managerCount){const rows=Array.isArray(list)?list:[],oversight=rows.filter(a=>a.role==="Floor Director"||a.role==="Independent Validator").length,managers=Number.isInteger(managerCount)?managerCount:(root.MOBILE_AGENT_CATALOG?.managers||[]).length;return {agents:rows.length-oversight,oversight,managers};}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function readIdentityStore(){try{return JSON.parse(root.localStorage.getItem("mobile-ai-studio-agent-identities-v1")||"{}")}catch(e){return {}}}
function avatarMarkup(agent){
 let identity={palette:"blue",avatar:"orb",accent:"#73d9ff",glyph:"◉"};
 try{if(root.AgentArena&&root.AgentArena.identityFor)identity=root.AgentArena.identityFor(agent,readIdentityStore())}catch(e){}
 return '<span class="agent-avatar avatar-'+esc(identity.avatar)+'" style="--agent-accent:'+esc(identity.accent)+'">'+esc(identity.glyph)+'</span>';
}
function inject(){
 const host=root.document&&root.document.getElementById("arena");if(!host||root.document.getElementById("arenaCommandCenter"))return;
 const section=root.document.createElement("section");section.id="arenaCommandCenter";section.className="section arena-command";
 section.innerHTML='<div class="arena-command-head"><div><span class="small">FLOOR 5 · ARENA OPERATIONS</span><h2>Arena Command Center</h2><p class="muted">Plan head-to-head evaluations, assign two agent blueprints to a challenge, and track Owner decisions.</p></div><span class="arena-plan-tag">LOCAL PLANNING</span></div><div class="arena-command-metrics" id="arenaCommandMetrics"></div><div class="arena-command-compose"><h3>Prepare a new challenge</h3><label>Session title<input id="arenaSessionTitle" class="field" maxlength="120" placeholder="Example: Music arrangement challenge"></label><div class="arena-command-pair"><label>Agent A<select id="arenaSessionAgentA" class="field"></select></label><label>Agent B<select id="arenaSessionAgentB" class="field"></select></label></div><label>Test focus<select id="arenaSessionScenario" class="field">'+SCENARIOS.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.label)+'</option>').join("")+'</select></label><label>Challenge mission<textarea id="arenaSessionMission" class="field" rows="3" maxlength="2000" placeholder="Define the same bounded task both agents would be evaluated against."></textarea></label><button id="arenaCreateSession" class="primary" style="width:100%">＋ Create challenge proposal</button><div id="arenaCommandMessage" class="notice" aria-live="polite">Creating a proposal does not run or dispatch either agent.</div></div><div class="arena-command-session-head"><h3>Challenge board</h3><span class="small">Saved on this phone</span></div><div id="arenaCommandSessions"></div><div class="notice">Owner acceptance records local consent to continue planning only. It does not authorize agent execution, tool use, external writes, certification, activation, publishing or deployment. The current Test Chambers remain manual evidence-capture workflows.</div>';
 const anchor=host.querySelector(".arena-shell");if(anchor)host.insertBefore(section,anchor);else host.prepend(section);
 populateAgents();render();
}
function populateAgents(){
 const list=roster(),options='<option value="">Choose an agent…</option>'+list.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+' · '+esc(a.floor||"Unassigned")+'</option>').join("");
 ["arenaSessionAgentA","arenaSessionAgentB"].forEach(id=>{const el=root.document.getElementById(id);if(el)el.innerHTML=options});
}
function metric(label,value,detail){return '<div class="arena-command-metric"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span><small>'+esc(detail)+'</small></div>'}
function render(){
 const metrics=root.document&&root.document.getElementById("arenaCommandMetrics"),out=root.document&&root.document.getElementById("arenaCommandSessions");if(!metrics||!out)return;
 const agents=roster(),sessions=readAll(),pending=sessions.filter(s=>s.ownerDecision==="PENDING").length,accepted=sessions.filter(s=>s.ownerDecision==="ACCEPTED").length;
 const chambers=root.AgentArenaLab&&root.AgentArenaLab.readAll?root.AgentArenaLab.readAll():[];
 metrics.innerHTML=(()=>{const counts=countRoster(agents);return metric("Canonical agents",counts.agents,"Planning roster")+metric("Oversight roles",counts.oversight,"Directors / Validators")+metric("Managers",counts.managers,"Reporting layer")+metric("Saved chambers",chambers.length,"Manual evidence records")+metric("Challenge proposals",sessions.length,pending+" awaiting Owner · "+accepted+" accepted locally")})();
 const chamberOptions=(agentId,selectedId)=>chambers.filter(c=>c.agent&&c.agent.id===agentId).map(c=>'<option value="'+esc(c.chamberId)+'" '+(c.chamberId===selectedId?"selected":"")+'>'+esc(c.agent.name)+' · '+esc(root.AgentArenaLab.evaluateChamber(c).status)+'</option>').join("");
 out.innerHTML=sessions.length?sessions.map(s=>{
  const evidence=s.ownerDecision==="ACCEPTED"?'<div class="arena-command-evidence"><strong>Attach manual Test Chamber evidence</strong><div class="arena-command-pair"><label>Baseline · '+esc(s.participants[0].name)+'<select class="field" data-evidence-a="'+esc(s.sessionId)+'"><option value="">Choose saved chamber…</option>'+chamberOptions(s.participants[0].id,s.evidence?.baselineChamberId)+'</select></label><label>Candidate · '+esc(s.participants[1].name)+'<select class="field" data-evidence-b="'+esc(s.sessionId)+'"><option value="">Choose saved chamber…</option>'+chamberOptions(s.participants[1].id,s.evidence?.candidateChamberId)+'</select></label></div><button data-arena-attach-evidence="'+esc(s.sessionId)+'" style="width:100%">Attach and compare manual evidence</button><div data-evidence-result="'+esc(s.sessionId)+'" class="arena-command-evidence-result"></div></div>':'';
  let comparison="";
  if(s.evidence&&root.AgentArenaLab){try{const report=compareSessionEvidence(s,chambers);comparison='<div class="arena-command-evidence-result"><strong>'+esc(report.baseline.agent)+' '+report.baseline.passes+'/'+report.baseline.total+' PASS</strong><strong>'+esc(report.candidate.agent)+' '+report.candidate.passes+'/'+report.candidate.total+' PASS</strong><span>Difference: '+(report.passDifference>0?"+":"")+report.passDifference+' recorded PASS outcomes</span><small>'+esc(report.meaning)+'</small></div>'}catch(e){comparison='<small class="muted">'+esc(e.message)+'</small>'}}
  return '<article class="arena-command-session"><div class="row between"><strong>'+esc(s.title)+'</strong><span class="arena-plan-tag">'+esc(s.status.replaceAll("_"," "))+'</span></div><p>'+esc(s.mission)+'</p><div class="arena-command-duel">'+s.participants.map(p=>'<div>'+avatarMarkup({id:p.id,name:p.name,floor:p.floor,role:p.role})+'<span><strong>'+esc(p.name)+'</strong><small>'+esc(p.floor)+'</small></span></div>').join('<b class="arena-command-vs">VS</b>')+'</div><small class="muted">Focus: '+esc(s.scenarioLabel)+' · '+esc(new Date(s.createdAt).toLocaleString())+'</small>'+(s.evidence?'<button data-arena-export-report="'+esc(s.sessionId)+'" style="width:100%">Export evidence report</button>':'')+(s.ownerDecision==="PENDING"?'<div class="arena-command-actions"><button data-arena-decision="ACCEPT" data-session-id="'+esc(s.sessionId)+'" class="primary">Accept planning proposal</button><button data-arena-decision="DECLINE" data-session-id="'+esc(s.sessionId)+'">Decline</button></div>':'<div class="arena-command-decision">Owner decision: '+esc(s.ownerDecision)+' · '+esc(s.ownerDecisionAt||"")+'</div>')+evidence+comparison+'<small class="arena-command-safety">Dispatch: disabled · Execution: not performed · Certification: not granted</small></article>';
 }).join(""):'<div class="empty">No challenge proposals yet. Create one above to start the Arena planning board.</div>';
}
function message(value){const el=root.document&&root.document.getElementById("arenaCommandMessage");if(el)el.textContent=value}
function bind(){
 const host=root.document&&root.document.getElementById("arenaCommandCenter");if(!host||host.dataset.bound)return;host.dataset.bound="1";
 host.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  try{
   if(b.id==="arenaCreateSession"){
    const list=roster(),a=list.find(x=>x.id===host.querySelector("#arenaSessionAgentA").value),d=list.find(x=>x.id===host.querySelector("#arenaSessionAgentB").value);
    const session=createSession(a,d,{title:host.querySelector("#arenaSessionTitle").value,mission:host.querySelector("#arenaSessionMission").value,scenarioId:host.querySelector("#arenaSessionScenario").value});
    save(session);render();message("Challenge proposal saved. It is awaiting your decision; neither agent was dispatched.");return;
   }
   if(b.dataset.arenaDecision){
    const items=readAll(),s=items.find(x=>x.sessionId===b.dataset.sessionId);if(!s)throw new Error("Session proposal not found.");
    decideSession(s,b.dataset.arenaDecision);save(s);render();message(s.ownerDecision==="ACCEPTED"?"Owner acceptance recorded locally. Execution remains disabled.":"Proposal declined and retained in the local record.");return;
   }
   if(b.dataset.arenaExportReport){const items=readAll(),s=items.find(x=>x.sessionId===b.dataset.arenaExportReport);if(!s)throw new Error("Session proposal not found.");const chambers=root.AgentArenaLab&&root.AgentArenaLab.readAll?root.AgentArenaLab.readAll():[];if(!root.AgentArenaReport||typeof root.AgentArenaReport.download!=="function")throw new Error("Evidence report exporter is unavailable.");const includeSessionText=typeof root.confirm==="function"&&root.confirm("Include the challenge title and mission in this exported report? These fields may contain private details. Choose Cancel to keep them excluded.");root.AgentArenaReport.download(s,chambers,root.AgentArenaLab,{includeSessionText});message(includeSessionText?"Evidence report exported with challenge title and mission after explicit confirmation.":"Evidence report exported with challenge title and mission excluded.");return;}if(b.dataset.arenaAttachEvidence){
    const items=readAll(),s=items.find(x=>x.sessionId===b.dataset.arenaAttachEvidence);if(!s)throw new Error("Session proposal not found.");
    const chambers=root.AgentArenaLab&&root.AgentArenaLab.readAll?root.AgentArenaLab.readAll():[];
    const a=chambers.find(x=>x.chamberId===host.querySelector('[data-evidence-a="'+s.sessionId+'"]').value),d=chambers.find(x=>x.chamberId===host.querySelector('[data-evidence-b="'+s.sessionId+'"]').value);
    attachEvidence(s,a,d);save(s);const report=compareSessionEvidence(s,chambers);
    const target=host.querySelector('[data-evidence-result="'+s.sessionId+'"]');if(target)target.innerHTML='<strong>'+esc(report.baseline.agent)+' '+report.baseline.passes+'/'+report.baseline.total+' PASS</strong><strong>'+esc(report.candidate.agent)+' '+report.candidate.passes+'/'+report.candidate.total+' PASS</strong><span>Difference: '+(report.passDifference>0?"+":"")+report.passDifference+' recorded PASS outcomes</span><small>'+esc(report.meaning)+'</small>';
    render();message("Manual Test Chamber evidence linked and compared. No agent was run; no certification was granted.");return;
   }
  }catch(err){message(err.message)}
 });
}
const api={STORE,SCENARIOS,createSession,decideSession,attachEvidence,compareSessionEvidence,countRoster,readAll,save,remove,render,init:function(){inject();bind();render()}};
root.AgentArenaCommand=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(root.document){const start=()=>api.init();if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",start);else start()}
})(typeof window!=="undefined"?window:globalThis);
