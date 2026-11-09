(()=>{"use strict";
const catalog=()=>window.MOBILE_AGENT_CATALOG||{agents:[],managers:[],oversight:[]};
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const command={
 owner:{name:"Owner / Command",role:"User / Owner",group:"Command",mission:"Final authority for the studio. Reviews proposals and approves high-impact changes, activation and deployment.",status:"OWNER CONTROL",reportsTo:"—"},
 secretary:{name:"Secretary",role:"Secretary approval gate",group:"Command",mission:"Receives requests, checks completeness, routes work for authorization and keeps approval records.",status:"PLANNED",reportsTo:"Owner"},
 coo:{name:"Studio Watchdog / COO",role:"Studio operations oversight",group:"Command",mission:"Coordinates studio operations, monitors floor status, tracks blockers and escalates issues to the Owner.",status:"PLANNED",reportsTo:"Secretary / Owner"}
};
let overlay,content;
function ensure(){
 if(overlay)return;
 const style=document.createElement("style");
 style.textContent=`
 #agentDetailOverlay{position:fixed;inset:0;z-index:1000;background:rgba(3,6,14,.82);backdrop-filter:blur(9px);display:none;align-items:flex-end;justify-content:center;padding:12px}
 #agentDetailOverlay.open{display:flex}
 #agentDetailWindow{width:min(760px,100%);max-height:min(88dvh,900px);overflow:auto;background:linear-gradient(160deg,#1a2335,#101620);border:1px solid #52638a;border-radius:22px 22px 16px 16px;box-shadow:0 24px 90px #000b;padding:18px;color:#f3f5fb}
 #agentDetailWindow .ad-top{display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:-18px;margin:-18px -18px 14px;padding:16px 18px;background:#151d2cf2;border-bottom:1px solid #303d56;border-radius:22px 22px 0 0}
 #agentDetailWindow .ad-kicker{font-size:10px;letter-spacing:1.5px;color:#aab9e5;font-weight:800}
 #agentDetailWindow h2{font-size:23px;line-height:1.2;margin:5px 0}
 #agentDetailWindow .ad-close{flex:0 0 auto;font-size:20px;width:42px;height:42px;padding:0;border-radius:13px}
 #agentDetailWindow .ad-status{display:inline-block;border:1px solid #8a6b36;color:#ffdb91;border-radius:99px;padding:6px 10px;font-size:11px;font-weight:700}
 #agentDetailWindow .ad-section{margin-top:17px;padding-top:14px;border-top:1px solid #2c374c}
 #agentDetailWindow .ad-section h3{font-size:12px;color:#aebde0;letter-spacing:1px;text-transform:uppercase;margin:0 0 9px}
 #agentDetailWindow .ad-copy{font-size:14px;line-height:1.55;color:#e2e8f5;margin:0;white-space:pre-wrap}
 #agentDetailWindow .ad-grid{display:grid;grid-template-columns: minmax(104px,.7fr) 1.5fr;gap:10px 12px;font-size:13px;line-height:1.45}
 #agentDetailWindow .ad-grid b{color:#aebde0;font-weight:650}
 #agentDetailWindow .ad-grid span{overflow-wrap:anywhere}
 #agentDetailWindow .ad-foot{font-size:11px;color:#9aa6ba;line-height:1.5;margin-top:18px}
 @media(max-width:480px){#agentDetailOverlay{padding:0}#agentDetailWindow{max-height:92dvh;border-radius:22px 22px 0 0;padding:16px}#agentDetailWindow .ad-top{top:-16px;margin:-16px -16px 12px;padding:14px 16px}#agentDetailWindow .ad-grid{grid-template-columns:1fr;gap:3px}#agentDetailWindow .ad-grid span{margin-bottom:8px}}
 `;
 document.head.appendChild(style);
 overlay=document.createElement("div");overlay.id="agentDetailOverlay";overlay.setAttribute("aria-hidden","true");
 overlay.innerHTML='<section id="agentDetailWindow" role="dialog" aria-modal="true" aria-labelledby="agentDetailTitle"><div class="ad-top"><div><div class="ad-kicker">MOBILE AI STUDIO · ROLE PROFILE</div><h2 id="agentDetailTitle">Agent details</h2></div><button class="ad-close" type="button" aria-label="Close agent details">✕</button></div><div id="agentDetailContent"></div></section>';
 document.body.appendChild(overlay);content=overlay.querySelector("#agentDetailContent");
 overlay.querySelector(".ad-close").addEventListener("click",close);
 overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay.classList.contains("open"))close();});
}
function close(){if(!overlay)return;overlay.classList.remove("open");overlay.setAttribute("aria-hidden","true");}
function open(id){
 ensure();const c=catalog();
 const record=c.agents.find(x=>x.id===id)||c.managers.find(x=>x.id===id)||c.oversight.find(x=>x.id===id)||command[id];
 if(!record)return;
 const isAgent=!!record.responsibilities,isManager=Array.isArray(record.manages),isOversight=!!record.validationStatus&&!isAgent&&!isManager;
 const title=record.name||record.label||id,role=record.role|| (isManager?"Manager":isOversight?"Oversight role":"Agent");
 const floor=record.floor||record.group||"Command";
 const status=record.lifecycleStatus||record.status||"PLANNED";
 const validation=record.validationStatus|| (isOversight?"NOT_RUN":"NOT_APPLICABLE");
 const manager=record.manager||record.reportsTo||"Not assigned";
 const permissions=isAgent?"Local read only. No local writes, execution, external network access, publishing or deployment. Human approval required.":isManager?"Manager coordination only in this planning blueprint; no tools or execution access assigned.":"Oversight / approval role only. No execution or external-write permissions are active.";
 const rows=[
 ["Floor / group",floor],["Role",role],["Reports to / manager",manager],
 ["Lifecycle status",status],["Builder status",record.builderStatus||"NOT_STARTED"],
 ["Independent validation",validation],["Permissions",permissions]
 ];
 if(record.dependencies?.length)rows.push(["Dependencies",record.dependencies.join(" · ")]);
 if(record.toolsSkills)rows.push(["Tools / skills",record.toolsSkills.length?record.toolsSkills.join(", "):"None assigned"]);
 if(record.knowledgeSources)rows.push(["Knowledge sources",record.knowledgeSources.length?record.knowledgeSources.join(", "):"None assigned"]);
 if(record.manages)rows.push(["Direct reports",record.manages.join(" · ")]);
 if(record.reportsTo&&isOversight)rows.push(["Escalation path",record.reportsTo]);
 const rowHtml=rows.map(([k,v])=>"<b>"+esc(k)+"</b><span>"+esc(v)+"</span>").join("");
 const mission=record.mission||"No mission description is recorded.";
 const duties=record.responsibilities|| (record.manages?"Coordinates and supervises the listed direct reports.":record.kind==="Owner"?"Final human approval authority.":"See role mission and reporting chain.");
 const note=isAgent?"Definition text is an initial draft requiring Owner review. The record is planned only; this view does not mean an agent is running.": "This is a planned organizational role. Live backend status is not connected.";
 const ops=(()=>{try{return JSON.parse(localStorage.getItem("mobile-ai-studio-v1.2-workspaces")||'{"assignments":[],"reviews":[]}')}catch(e){return {assignments:[],reviews:[]}}})();
 const assigned=ops.assignments.filter(t=>isAgent?t.agentId===record.id:t.managerId===record.id);
 const workHtml=assigned.length?assigned.map(t=>'<div class="ad-grid"><b>'+esc(t.title)+'</b><span>'+esc(t.status)+' · '+esc(t.priority)+'</span></div>').join(""):'<p class="ad-copy">No local work proposals assigned yet.</p>';
 const workspaceButton=isAgent?'<button type="button" id="adOpenWorkspace" style="width:100%;margin-top:12px">Open agent workspace</button>':isManager?'<button type="button" id="adOpenWorkspace" style="width:100%;margin-top:12px">Open manager workspace</button>':'';
 content.innerHTML='<span class="ad-status">'+esc(status.replaceAll("_"," "))+'</span><div class="ad-section"><h3>Mission</h3><p class="ad-copy">'+esc(mission)+'</p></div><div class="ad-section"><h3>Responsibilities</h3><p class="ad-copy">'+esc(duties)+'</p></div><div class="ad-section"><h3>Status &amp; permissions</h3><div class="ad-grid">'+rowHtml+'</div></div><p class="ad-foot">'+esc(note)+'</p>';
 content.insertAdjacentHTML("beforeend",'<div class="ad-section"><h3>Work &amp; activity</h3>'+workHtml+workspaceButton+'<p class="ad-foot">Local proposals only. No task is dispatched and no agent is running.</p></div>');
 const wsButton=content.querySelector("#adOpenWorkspace");if(wsButton)wsButton.addEventListener("click",()=>{close();if(window.openV12Workspace)window.openV12Workspace(isAgent?record.id:null,isManager?record.id:null);});
 overlay.classList.add("open");overlay.setAttribute("aria-hidden","false");overlay.querySelector(".ad-close").focus();
}
window.openAgentDetails=open;window.closeAgentDetails=close;
})();