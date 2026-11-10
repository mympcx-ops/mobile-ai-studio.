(()=>{"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||"{}");return v&&typeof v==="object"?v:{};}catch(e){return {};}};
const arr=(v,k)=>Array.isArray(v?.[k])?v[k]:[];
const floors=["Music","Media","Racing"];
const catalog=()=>window.MOBILE_AGENT_CATALOG||{agents:[],managers:[],oversight:[]};
const stores=()=>({
 ops:read("mobile-ai-studio-v1.2-operations"),
 work:read("mobile-ai-studio-v1.2-workspaces"),
 factory:read("mobile-ai-studio-agent-factory-v1"),
 command:read("mobile-ai-studio-command-center-v1.1")
});
function snapshot(){
 const s=stores(),c=catalog(),agents=arr(c,"agents"),packages=arr(s.factory,"packages"),factoryReviews=arr(s.factory,"reviews"),assignments=arr(s.work,"assignments"),workReviews=arr(s.work,"reviews"),approvals=[...arr(s.ops,"approvals"),...arr(s.command,"approvals")],tasks=[...arr(s.ops,"tasks"),...arr(s.command,"tasks")];
 const pendingApprovals=approvals.filter(x=>String(x.status||"").toUpperCase()==="PENDING");
 const ready=assignments.filter(x=>x.status==="READY_FOR_VALIDATION");
 const reviewedPackageIds=new Set(factoryReviews.map(x=>x.packageId).filter(Boolean));
 const pendingPackages=packages.filter(x=>x.packageStatus==="BUILT_PENDING_INDEPENDENT_VALIDATION"&&!reviewedPackageIds.has(x.packageId));
 const ownerPending=factoryReviews.filter(x=>x.outcome==="PASS_RECORDED_PENDING_OWNER_APPROVAL"&&x.activationAuthorized!==true);
 const floorData=floors.map(f=>{
  const ids=new Set(agents.filter(a=>a.floor===f).map(a=>a.id));
  const work=assignments.filter(x=>ids.has(x.agentId));
  const pkgs=packages.filter(x=>ids.has(x.agent?.id));
  const revs=workReviews.filter(x=>work.some(w=>w.id===x.assignmentId));
  return {floor:f,agents:ids.size,work:work.length,open:work.filter(x=>!["ACCEPTED","CANCELLED"].includes(x.status)).length,ready:work.filter(x=>x.status==="READY_FOR_VALIDATION").length,packages:pkgs.length,reviews:revs.length};
 });
 return {agents:agents.length,packages:packages.length,factoryReviews:factoryReviews.length,pendingPackages:pendingPackages.length,ownerPending:ownerPending.length,pendingApprovals:pendingApprovals.length,assignments:assignments.length,ready:ready.length,workReviews:workReviews.length,tasks:tasks.length,openTasks:tasks.filter(x=>!["DONE","COMPLETED","CANCELLED"].includes(String(x.status||"").toUpperCase())).length,floorData,attention:pendingApprovals.length+ready.length+pendingPackages.length+ownerPending.length};
}
function inject(){
 const root=$("command");if(!root||$("v23OperationsBoard"))return;
 const section=document.createElement("section");section.id="v23OperationsBoard";section.className="section v23-section";
 section.innerHTML='<div class="section-head"><div><div class="eyebrow">V2.3 · OWNER OPERATIONS</div><h2>Studio Operations Overview</h2></div><button id="v23Refresh" type="button">Refresh</button></div><div class="notice">A read-only roll-up of phone-local work, approvals, blueprint packages and validation records. It is not live PC telemetry, authenticated reviewer verification, or proof that an agent is running.</div><div id="v23Metrics" class="v23-metrics"></div><div class="v23-attention" id="v23Attention"></div><div class="section-head v23-subhead"><h3>Floor workload</h3><span class="small">Canonical 3-floor roster</span></div><div id="v23Floors" class="v23-floors"></div><div class="section-head v23-subhead"><h3>Lifecycle checkpoints</h3><span class="small">Read-only register</span></div><div id="v23Lifecycle" class="v23-lifecycle"></div><p class="small v23-foot">No data is changed by this overview. All consequential decisions remain in their original Owner-controlled workflows.</p>';
 root.appendChild(section);
}
function metric(label,value,sub){return '<article class="v23-metric"><span>'+esc(label)+'</span><strong>'+value+'</strong><small>'+esc(sub)+'</small></article>';}
function render(){
 const root=$("v23OperationsBoard");if(!root)return;
 const s=snapshot();
 $("v23Metrics").innerHTML=metric("Planned agents",s.agents,"Canonical roster")+metric("Open work",s.openTasks,"Local task records")+metric("Awaiting validation",s.ready,"Submitted work proposals")+metric("Owner decisions",s.pendingApprovals,"Pending approval records")+metric("Factory packages",s.packages,"Blueprint-only packages")+metric("Owner review queue",s.ownerPending,"Independent reviews awaiting Owner");
 const items=[];
 if(s.pendingApprovals)items.push({label:s.pendingApprovals+" approval proposal(s) need an Owner decision",target:"v22OwnerApprovals",action:"Review approvals"});
 if(s.ready)items.push({label:s.ready+" work proposal(s) are waiting for independent validation",target:"v12Workspaces",action:"Open validation"});
 if(s.pendingPackages)items.push({label:s.pendingPackages+" blueprint package(s) await independent validation",target:"agentFactoryV19",action:"Open Agent Factory"});
 if(s.ownerPending)items.push({label:s.ownerPending+" independent review(s) are pending Owner approval",target:"agentFactoryV19",action:"Review packages"});
 $("v23Attention").innerHTML=items.length?'<div class="v23-attention-head"><strong>Items requiring attention</strong><span class="directory-state">'+items.length+' queue(s)</span></div>'+items.map(x=>'<div class="v23-attention-row"><span>'+esc(x.label)+'</span><button type="button" data-v23-target="'+esc(x.target)+'">'+esc(x.action)+'</button></div>').join(""):'<div class="v23-clear"><strong>No pending Owner or validation queues detected.</strong><small>This reflects only records currently stored on this phone.</small></div>';
 $("v23Floors").innerHTML=s.floorData.map(f=>'<article class="v23-floor"><div class="row between"><strong>'+esc(f.floor)+'</strong><span class="small">'+f.agents+' planned agents</span></div><div class="v23-floor-stats"><div><strong>'+f.work+'</strong><small>Work proposals</small></div><div><strong>'+f.open+'</strong><small>Open work</small></div><div><strong>'+f.ready+'</strong><small>Awaiting review</small></div><div><strong>'+f.packages+'</strong><small>Blueprints</small></div></div><small class="v23-floor-foot">'+f.reviews+' recorded work reviews</small></article>').join("");
 $("v23Lifecycle").innerHTML=[
 ["Work proposals",s.assignments,"Local records; not dispatched"],
 ["Independent work reviews",s.workReviews,"Reviewer-entered evidence"],
 ["Factory packages",s.packages,"Blueprints only; not executable"],
 ["Factory review records",s.factoryReviews,"Identity and evidence references are not authenticated"],
 ["Owner-pending factory reviews",s.ownerPending,"No activation authority granted"],
 ["Pending approval proposals",s.pendingApprovals,"Decisions remain in original approval queues"]
 ].map(([k,v,d])=>'<div class="v23-life-row"><span><strong>'+esc(k)+'</strong><small>'+esc(d)+'</small></span><b>'+v+'</b></div>').join("");
}
const mutationButtons=new Set(["ccAddTask","ccAddApproval","ccSaveValidation","v12AddTask","v12AddApproval","v12WsCreate","v12ReviewSave","afBuild","afReview"]);
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="v23Refresh"){render();return;}
 if(b.dataset.v23Target){const target=$(b.dataset.v23Target);if(target){target.scrollIntoView({behavior:"smooth",block:"start"});target.setAttribute("tabindex","-1");target.focus({preventScroll:true});}}
 const lifecycleAction=mutationButtons.has(b.id)||["v12Task","v12Decision","wsStatus","ccTask","ccApproval"].some(k=>b.dataset[k]!==undefined);
 if(lifecycleAction)window.setTimeout(render,250);
});
document.addEventListener("DOMContentLoaded",()=>{inject();render();});
window.addEventListener("load",()=>{inject();render();});
window.addEventListener("storage",render);
window.addEventListener("mobile-ai-studio-refresh",render);
window.MOBILE_AI_STUDIO_V23={refresh:render,snapshot,version:"2.3.1",readOnly:true};
})();
