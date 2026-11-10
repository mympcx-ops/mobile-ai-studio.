(()=>{"use strict";
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||"{}");return x&&typeof x==="object"?x:{};}catch(e){return {};}};
const floors=["Music","Media","Racing"];
const catalog=()=>window.MOBILE_AGENT_CATALOG||{agents:[],managers:[],oversight:[]};
function nav(id){const b=document.querySelector('[data-go="'+id+'"]');if(b)b.click();}
function inject(){
 const root=$("command");if(!root||$("v22OwnerFloorControl"))return;
 const w=document.createElement("div");w.id="v22OwnerFloorControl";
 w.innerHTML='<section class="section v22-section" id="v22OwnerApprovals"><div class="section-head"><h2>Owner Approval Center</h2><span class="small">V2.2 · decision authority</span></div><div class="notice">One consolidated view of pending human decisions. Recording approval or rejection remains a local decision record only; it never activates agents, dispatches work, executes tools, publishes, or deploys.</div><div id="v22ApprovalMetrics" class="grid v22-metrics"></div><div id="v22ApprovalQueue" class="v22-queue"></div></section><section class="section v22-section" id="v22FloorControl"><div class="section-head"><h2>Floor Operations Dashboards</h2><span class="small">Music · Media · Racing</span></div><div class="notice">Each floor dashboard combines canonical leadership, planned agents, local work proposals, recorded validation and blueprint package counts. These are phone-local records, not live agent health.</div><div id="v22FloorCards" class="v22-floors"></div></section>';
 root.appendChild(w);render();
}
function approvalRecords(){
 const a=read("mobile-ai-studio-v1.2-operations"),b=read("mobile-ai-studio-command-center-v1.1");
 return [
 ...(Array.isArray(a.approvals)?a.approvals.map(x=>({...x,source:"V1.2 Operations",title:x.title||"Untitled proposal",created:x.at||x.created})):[]),
 ...(Array.isArray(b.approvals)?b.approvals.map(x=>({...x,source:"Command Center",risk:"Not specified",evidence:x.reason||"",created:x.created})):[])
 ].sort((x,y)=>String(y.created||"").localeCompare(String(x.created||"")));
}
function renderApprovals(){
 const host=$("v22ApprovalQueue"),metrics=$("v22ApprovalMetrics");if(!host||!metrics)return;
 const all=approvalRecords(),pending=all.filter(x=>x.status==="PENDING"),decided=all.filter(x=>x.status!=="PENDING");
 metrics.innerHTML=[["Awaiting Owner",pending.length],["Decisions recorded",decided.length],["Total proposals",all.length]].map(([k,v])=>'<div class="tile v22-metric"><small>'+esc(k)+'</small><strong>'+v+'</strong></div>').join("");
 if(!all.length){host.innerHTML='<div class="panel empty">No approval proposals recorded yet. New proposals will appear here when submitted through the existing approval forms.</div>';return;}
 host.innerHTML=all.slice(0,30).map(x=>'<article class="v22-approval"><div class="row between"><strong>'+esc(x.title)+'</strong><span class="directory-state">'+esc(x.status||"UNKNOWN")+'</span></div><div class="v22-meta">'+esc(x.source)+' · '+esc(x.risk||"Risk not specified")+' · '+esc(x.created?new Date(x.created).toLocaleString():"Date unavailable")+'</div><p>'+esc(x.evidence||"No supporting evidence recorded.")+'</p><small>'+(x.status==="PENDING"?"Owner decision required. Use the original queue below to record the decision.":"Decision record only; no system action was performed.")+'</small><div class="v22-actions"><button data-v22-approval-source="'+(x.source==="V1.2 Operations"?"v12":"cc")+'">Open source queue</button></div></article>').join("");
}
function renderFloors(){
 const host=$("v22FloorCards");if(!host)return;
 const c=catalog(),ws=read("mobile-ai-studio-v1.2-workspaces"),factory=read("mobile-ai-studio-agent-factory-v1"),ops=read("mobile-ai-studio-v1.2-operations"),cc=read("mobile-ai-studio-command-center-v1.1");
 const assignments=Array.isArray(ws.assignments)?ws.assignments:[],reviews=Array.isArray(ws.reviews)?ws.reviews:[],packages=Array.isArray(factory.packages)?factory.packages:[],validations=Array.isArray(cc.validationReviews)?cc.validationReviews:[];
 host.innerHTML=floors.map(f=>{
  const agents=c.agents.filter(a=>a.floor===f),managers=c.managers.filter(m=>m.floor===f),director=c.oversight.find(x=>x.floor===f&&x.role==="Floor Director"),validator=c.oversight.find(x=>x.floor===f&&x.role==="Independent Validator");
  const ids=new Set(agents.map(a=>a.id)),floorWork=assignments.filter(t=>ids.has(t.agentId)),floorPackages=packages.filter(p=>ids.has(p.agent?.id)),floorReviews=reviews.filter(r=>floorWork.some(t=>t.id===r.assignmentId)),open=floorWork.filter(t=>!["ACCEPTED","CANCELLED"].includes(t.status)).length,ready=floorWork.filter(t=>t.status==="READY_FOR_VALIDATION").length;
  const oversightStatus=(x)=>x?esc(x.validationStatus||x.status||"PLANNED"):"NOT FOUND";
  return '<article class="v22-floor"><div class="row between"><div><div class="eyebrow">'+esc(f.toUpperCase())+' FLOOR</div><h3>'+esc(f)+' Operations</h3></div><span class="directory-state">'+agents.length+' agents planned</span></div><div class="v22-stats"><div><strong>'+managers.length+'</strong><small>Managers</small></div><div><strong>'+open+'</strong><small>Open proposals</small></div><div><strong>'+ready+'</strong><small>Awaiting validation</small></div><div><strong>'+floorPackages.length+'</strong><small>Blueprint packages</small></div></div><div class="v22-lead"><div><small>Floor Director</small><strong>'+esc(director?.name||"Not found")+'</strong><em>'+oversightStatus(director)+'</em></div><div><small>Independent Validator</small><strong>'+esc(validator?.name||"Not found")+'</strong><em>'+oversightStatus(validator)+'</em></div></div><div class="v22-managers"><strong>Manager teams</strong>'+managers.map(m=>'<div class="v22-manager"><span>'+esc(m.name)+' <small>· '+m.manages.length+' direct reports</small></span><button data-v22-profile="'+esc(m.id)+'">View</button></div>').join("")+'</div><div class="v22-footer"><small>'+floorReviews.length+' work reviews · '+validations.filter(v=>agents.some(a=>a.id===v.roleId)).length+' role checks recorded · '+(Array.isArray(ops.tasks)?ops.tasks.filter(t=>managers.some(m=>String(t.owner||"").toLowerCase()===m.name.toLowerCase())).length:0)+' manager task matches</small><button data-v22-floor="'+esc(f)+'">Open floor directory</button></div></article>';
 }).join("");
}
function render(){renderApprovals();renderFloors();}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.v22ApprovalSource){const id=b.dataset.v22ApprovalSource==="v12"?"v12ApprovalList":"ccApprovalList";const el=$(id);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.style.outline="2px solid #91a5ff";setTimeout(()=>el.style.outline="",1600);}return;}
 if(b.dataset.v22Profile){if(window.openAgentDetails)window.openAgentDetails(b.dataset.v22Profile);return;}
 if(b.dataset.v22Floor){nav("agents");const f=document.querySelector('[data-agent-filter="'+b.dataset.v22Floor+'"]');if(f)f.click();return;}
});
window.addEventListener("load",()=>{inject();render();});
document.addEventListener("DOMContentLoaded",()=>{inject();render();});
window.addEventListener("storage",render);
window.addEventListener("mobile-ai-studio-refresh",render);
window.MOBILE_AI_STUDIO_V22={refresh:render,version:"2.2.0"};
})();