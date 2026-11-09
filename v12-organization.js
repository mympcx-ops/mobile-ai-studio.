(()=>{"use strict";
const $=id=>document.getElementById(id),KEY="mobile-ai-studio-v1.2-operations";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function readOps(){try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch(e){return {};}}
function profile(id){if(window.openAgentDetails)window.openAgentDetails(id);}
function build(){
 const root=$("command");if(!root||$("v12Org"))return;
 const wrap=document.createElement("div");wrap.id="v12Org";
 wrap.innerHTML='<section class="section"><div class="section-head"><h2>Leadership &amp; Oversight</h2><span class="small">V1.2 organization map</span></div><div class="notice">This is the planned reporting structure. Leadership and oversight roles are not running agents. The Owner remains the final approval authority.</div><div id="v12CommandRoles" class="grid" style="margin-top:10px"></div></section><section class="section"><div class="section-head"><h2>Floor dashboards</h2><span class="small">Managers · Directors · Validators</span></div><div id="v12FloorDashboards"></div></section>';
 root.appendChild(wrap);render();
}
function render(){
 const catalog=window.MOBILE_AGENT_CATALOG;if(!catalog)return;
 const command=$("v12CommandRoles"),floors=$("v12FloorDashboards");if(!command||!floors)return;
 const roles=[{id:"owner",name:"Owner / Command",mission:"Final human authority. Approves consequential actions, activation, external writes and deployment."},{id:"secretary",name:"Secretary",mission:"Approval gate. Checks requests for scope, evidence, risk, rollback and authorization before escalation."},{id:"coo",name:"Studio Watchdog / COO",mission:"Coordinates operations, tracks floor health and blockers, and escalates issues to the Owner."}];
 command.innerHTML=roles.map(r=>'<button class="tile" data-v12-profile="'+r.id+'"><span class="directory-state">COMMAND</span><h3>'+esc(r.name)+'</h3><p>'+esc(r.mission)+'</p></button>').join("");
 const ops=readOps(),tasks=ops.tasks||[];
 floors.innerHTML=["Music","Media","Racing"].map(floor=>{
  const director=catalog.oversight.find(x=>x.floor===floor&&x.role==="Floor Director"),validator=catalog.oversight.find(x=>x.floor===floor&&x.role==="Independent Validator");
  const managers=catalog.managers.filter(m=>m.floor===floor),agents=catalog.agents.filter(a=>a.floor===floor);
  return '<div class="panel" style="margin-bottom:12px"><div class="row between"><h3 style="margin:0">'+floor+' Floor</h3><span class="directory-state">'+agents.length+' planned agents</span></div><div class="grid" style="margin-top:10px"><button class="tile" data-v12-profile="'+director.id+'"><span class="directory-state">FLOOR DIRECTOR</span><h3>'+esc(director.name)+'</h3><p>Leads floor managers, coordinates delivery and escalates to Studio Watchdog / COO.</p></button><button class="tile" data-v12-profile="'+validator.id+'"><span class="directory-state">INDEPENDENT VALIDATOR</span><h3>'+esc(validator.name)+'</h3><p>Reviews independently of builders; reports evidence and findings through the Owner / Secretary approval chain.</p></button></div><h4 style="margin:14px 0 8px">Managers</h4>'+managers.map(m=>{const workload=tasks.filter(t=>(t.owner||"").toLowerCase()===m.name.toLowerCase()).length;return '<div class="item row between"><div><strong>'+esc(m.name)+'</strong><small>'+m.manages.length+' direct reports · '+workload+' matching local tasks</small></div><button data-v12-profile="'+m.id+'">Open</button></div>';}).join("")+'<div class="row between" style="margin-top:10px"><small>'+agents.length+' agent profiles · all lifecycle PLANNED</small><button data-v12-floor="'+floor+'">View floor agents</button></div></div>';
 }).join("");
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.v12Profile){profile(b.dataset.v12Profile);return;}
 if(b.dataset.v12Floor){const nav=document.querySelector('[data-go="agents"]');if(nav)nav.click();const filter=document.querySelector('[data-agent-filter="'+b.dataset.v12Floor+'"]');if(filter)filter.click();}
});
window.addEventListener("load",()=>{build();render();});
document.addEventListener("DOMContentLoaded",()=>{build();render();});
window.addEventListener("storage",e=>{if(e.key===KEY)render();});
})();
