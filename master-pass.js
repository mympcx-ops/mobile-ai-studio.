(()=>{"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function read(key){try{const v=JSON.parse(localStorage.getItem(key)||"null");return v&&typeof v==="object"?v:{};}catch(e){return {};}}
function catalog(){return window.MOBILE_AGENT_CATALOG||{agents:[],managers:[],oversight:[]};}
function statusRows(){
 const c=catalog(),ops=read("mobile-ai-studio-v1.2-operations"),ws=read("mobile-ai-studio-v1.2-workspaces"),factory=read("mobile-ai-studio-agent-factory-v1");
 const storageOk=(()=>{try{const k="__mas_master_probe";localStorage.setItem(k,"1");localStorage.removeItem(k);return true;}catch(e){return false;}})();
 const assignments=Array.isArray(ws.assignments)?ws.assignments:[];
 const pending=(Array.isArray(ops.approvals)?ops.approvals:[]).filter(x=>x.status==="PENDING").length;
 const packages=Array.isArray(factory.packages)?factory.packages.length:0;
 const reviews=Array.isArray(factory.reviews)?factory.reviews.length:0;
 return [
  {name:"Phone command station",state:"AVAILABLE",detail:"This browser is the user-facing workspace"},
  {name:"Local storage",state:storageOk?"AVAILABLE":"UNAVAILABLE",detail:"Phone-local records only; export backups before clearing browser data"},
  {name:"Canonical organization",state:c.agents.length===29&&c.managers.length===7&&c.oversight.length===6?"ROSTER LOADED":"ROSTER CHECK NEEDED",detail:c.agents.length+" agents · "+c.managers.length+" managers · "+c.oversight.length+" oversight roles"},
  {name:"Agent Factory",state:document.getElementById("afBuild")?"UI PRESENT":"MODULE / VIEW CHECK",detail:packages+" local blueprint packages · "+reviews+" local review records"},
  {name:"Work and validation",state:"LOCAL WORKFLOW",detail:assignments.length+" work proposals · "+assignments.filter(x=>x.status==="READY_FOR_VALIDATION").length+" awaiting review"},
  {name:"Owner approval queue",state:pending?"OWNER REVIEW NEEDED":"NO PENDING REQUESTS",detail:pending+" local approval records pending"},
  {name:"Offline shell",state:"SERVICE WORKER CONFIGURED",detail:"Physical Android offline acceptance still required"},
  {name:"PC bridge / Quinn / Ollama",state:"DISABLED · NOT CONNECTED",detail:"No live listener, credentials, authenticated heartbeat, or model connection"},
  {name:"Remote execution / dispatch",state:"PROHIBITED",detail:"No shell, process launch, agent dispatch, publishing, or deployment"}
 ];
}
function render(){
 const host=$("masterPassBoard");if(!host)return;
 const rows=statusRows();
 host.innerHTML='<div class="panel" style="border-color:#46557b;background:linear-gradient(145deg,#18243c,#121925)"><div class="row between"><div><div class="eyebrow">COORDINATED DEVELOPMENT MILESTONE</div><h2 style="margin:5px 0 3px">Master Pass Control Board</h2><div class="small">Phone-first · local records · Owner-controlled</div></div><span class="galaxy-status">MASTER VIEW</span></div><div class="grid" style="margin-top:12px">'+rows.map(r=>'<div class="tile" style="min-height:100px;cursor:default"><div class="small">'+esc(r.name)+'</div><strong style="display:block;font-size:12px;margin:8px 0;color:'+(r.state==="PROHIBITED"?"#ff9d9d":r.state.includes("DISABLED")?"#ffd58b":"#a8e5cb")+'">'+esc(r.state)+'</strong><small>'+esc(r.detail)+'</small></div>').join("")+'</div><div class="notice" style="margin-top:12px">This board consolidates phone-side status. Browser connectivity is not proof of PC connectivity. Local approvals are records only; they do not execute actions. Physical Android tests and independent security review remain separate release gates.</div><div class="row" style="flex-wrap:wrap;margin-top:10px"><button data-master-go="agents">Agent Factory & Directory</button><button data-master-go="galaxy">Organization Map</button><button data-master-go="testing">Validation Center</button><button id="masterPassRefresh">Refresh status</button></div></div>';
}
function navigate(id){const b=document.querySelector('[data-go="'+id+'"]');if(b)b.click();}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.masterGo){navigate(b.dataset.masterGo);return;}if(b.id==="masterPassRefresh")render();});
window.addEventListener("online",render);window.addEventListener("offline",render);window.addEventListener("storage",render);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
window.MOBILE_AI_STUDIO_MASTER_PASS={version:1,refresh:render,statusRows};
})();