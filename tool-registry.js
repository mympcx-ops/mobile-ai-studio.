(()=>{"use strict";
const STORE="mobile-ai-studio-prompt-agent-v1";
const REVIEW_STORE="mobile-ai-studio-tool-proposals-v1";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const REGISTRY=[
{id:"python.analysis",name:"Python analysis",availability:"NOT_CONNECTED",mode:"SANDBOX_ONLY",dependencies:["python-runtime","approved-analysis-libraries"],note:"Local sandbox runtime and pinned analysis packages"},
{id:"telemetry.reader",name:"Telemetry reader",availability:"NOT_CONNECTED",mode:"READ_ONLY",dependencies:["telemetry-adapter","approved-telemetry-schema"],note:"Allowlisted telemetry adapter and schema validation"},
{id:"git.review",name:"Git and change review",availability:"NOT_CONNECTED",mode:"READ_ONLY",dependencies:["git-client","repository-read-connector"],note:"Read-only repository connector"},
{id:"test.runner",name:"Test runner",availability:"NOT_CONNECTED",mode:"SANDBOX_ONLY",dependencies:["node-runtime","isolated-test-workspace"],note:"Pinned test runtime inside an isolated workspace"},
{id:"document.reader",name:"Document reader",availability:"NOT_CONNECTED",mode:"READ_ONLY",dependencies:["document-parser","user-selected-file-grant"],note:"Parser plus explicit user-selected file access"},
{id:"web.research",name:"Web research",availability:"NOT_CONNECTED",mode:"EXTERNAL_READ",dependencies:["approved-research-connector","source-capture"],note:"Read-only research connector with source capture"},
{id:"audio.asset.reader",name:"Audio and sample analysis",availability:"NOT_CONNECTED",mode:"READ_ONLY",dependencies:["audio-metadata-parser","media-analysis-runtime"],note:"User-selected audio assets only"},
{id:"midi.utility",name:"MIDI utilities",availability:"NOT_CONNECTED",mode:"SANDBOX_ONLY",dependencies:["midi-parser-writer","sandbox-output-directory"],note:"Generate MIDI drafts; no hardware transmission"},
{id:"report.writer",name:"Report generator",availability:"NOT_CONNECTED",mode:"SANDBOX_ONLY",dependencies:["report-template-engine","evidence-bundle-schema"],note:"Structured report generation and evidence packaging"},
{id:"browser.automation",name:"Browser automation",availability:"BLOCKED_PENDING_APPROVAL",mode:"REQUIRES_APPROVAL",dependencies:["approved-browser-session","per-task-authorization"],note:"No browser session or actions until separately authorized"},
{id:"shell.execution",name:"Host shell execution",availability:"DISABLED",mode:"DENY",dependencies:[],note:"Disabled; not eligible for automatic assignment"},
{id:"filesystem.write",name:"Host filesystem write",availability:"DISABLED",mode:"DENY",dependencies:[],note:"Disabled; not eligible for automatic assignment"},
{id:"model.dispatch",name:"Local model dispatch",availability:"BLOCKED_PENDING_HOST_SECURITY",mode:"DENY",dependencies:["authenticated-host-pairing","quinn-tool-broker","independent-protocol-review"],note:"Requires authenticated pairing and reviewed broker; no host dispatch"},
{id:"publish.deploy",name:"Publish and deploy",availability:"OWNER_APPROVAL_REQUIRED",mode:"DENY_BY_DEFAULT",dependencies:["release-validation","owner-release-approval"],note:"Never auto-install or auto-execute; explicit release gates"}
];
const DEPENDENCIES=[
{id:"python-runtime",name:"Python runtime",kind:"runtime",risk:"SANDBOX_ONLY"},
{id:"approved-analysis-libraries",name:"Pinned analysis libraries",kind:"package-set",risk:"SANDBOX_ONLY"},
{id:"telemetry-adapter",name:"Allowlisted telemetry adapter",kind:"connector",risk:"READ_ONLY"},
{id:"approved-telemetry-schema",name:"Telemetry schema contract",kind:"schema",risk:"READ_ONLY"},
{id:"git-client",name:"Git client",kind:"runtime",risk:"READ_ONLY"},
{id:"repository-read-connector",name:"Repository read connector",kind:"connector",risk:"READ_ONLY"},
{id:"node-runtime",name:"Node.js test runtime",kind:"runtime",risk:"SANDBOX_ONLY"},
{id:"isolated-test-workspace",name:"Isolated test workspace",kind:"sandbox",risk:"SANDBOX_ONLY"},
{id:"document-parser",name:"Document parser",kind:"package",risk:"READ_ONLY"},
{id:"user-selected-file-grant",name:"User-selected file permission",kind:"permission",risk:"EXPLICIT_GRANT"},
{id:"approved-research-connector",name:"Approved research connector",kind:"connector",risk:"EXTERNAL_READ"},
{id:"source-capture",name:"Source and citation capture",kind:"capability",risk:"READ_ONLY"},
{id:"audio-metadata-parser",name:"Audio metadata parser",kind:"package",risk:"READ_ONLY"},
{id:"media-analysis-runtime",name:"Media analysis runtime",kind:"runtime",risk:"READ_ONLY"},
{id:"midi-parser-writer",name:"MIDI draft parser/writer",kind:"package",risk:"SANDBOX_ONLY"},
{id:"sandbox-output-directory",name:"Sandbox output directory",kind:"sandbox",risk:"SANDBOX_ONLY"},
{id:"report-template-engine",name:"Report template engine",kind:"package",risk:"SANDBOX_ONLY"},
{id:"evidence-bundle-schema",name:"Evidence bundle schema",kind:"schema",risk:"SANDBOX_ONLY"},
{id:"approved-browser-session",name:"Approved browser session",kind:"connector",risk:"REQUIRES_APPROVAL"},
{id:"per-task-authorization",name:"Per-task browser authorization",kind:"permission",risk:"EXPLICIT_GRANT"},
{id:"authenticated-host-pairing",name:"Authenticated phone-to-PC pairing",kind:"security-gate",risk:"BLOCKING"},
{id:"quinn-tool-broker",name:"Quinn Tool Broker",kind:"host-service",risk:"BLOCKING"},
{id:"independent-protocol-review",name:"Independent protocol review",kind:"security-gate",risk:"BLOCKING"},
{id:"release-validation",name:"Release validation evidence",kind:"approval-gate",risk:"BLOCKING"},
{id:"owner-release-approval",name:"Owner release approval",kind:"approval-gate",risk:"BLOCKING"}
];
function analyze(blueprint){
 if(!blueprint||blueprint.format!=="mobile-ai-studio-agent-blueprint/1"||!Array.isArray(blueprint.toolAssignments))throw new Error("Select a valid Prompt-to-Agent blueprint first.");
 const ids=[...new Set(blueprint.toolAssignments.map(x=>String(x.id||"")))];
 const tools=ids.map(id=>REGISTRY.find(x=>x.id===id)).filter(Boolean);
 const dependencies=[...new Set(tools.flatMap(t=>t.dependencies))].map(id=>{const d=DEPENDENCIES.find(x=>x.id===id);return {...d,availability:"NOT_CHECKED",proposal:"REVIEW_REQUIRED"};});
 const blocked=tools.filter(t=>t.mode==="DENY"||t.mode==="DENY_BY_DEFAULT"||t.mode==="REQUIRES_APPROVAL"||t.mode==="DENY"&&t.availability==="DISABLED");
 return {format:"mobile-ai-studio-tool-readiness/1",blueprintId:blueprint.blueprintId||"UNKNOWN",agentName:String(blueprint.name||"Untitled agent"),createdAt:new Date().toISOString(),toolChecks:tools.map(t=>({...t,availability:t.availability,executionEnabled:false})),dependencies,blockedCapabilities:blocked.map(t=>({id:t.id,name:t.name,reason:t.note})),summary:{toolsRequested:ids.length,knownTools:tools.length,dependenciesToReview:dependencies.length,blockedCapabilities:blocked.length,availableTools:0},status:"PROPOSAL_ONLY",executionEnabled:false,installationEnabled:false,hostConnected:false};
}
function readDrafts(){try{const x=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(x)?x.filter(b=>b&&b.format==="mobile-ai-studio-agent-blueprint/1"):[];}catch(e){return [];}}
function readReviews(){try{const x=JSON.parse(localStorage.getItem(REVIEW_STORE)||"[]");return Array.isArray(x)?x:[];}catch(e){return [];}}
function renderDraftOptions(){const s=$("trpBlueprint");if(!s)return;const drafts=readDrafts();s.innerHTML='<option value="">Choose a saved agent blueprint…</option>'+drafts.map((b,i)=>'<option value="'+i+'">'+esc(b.name)+' · '+esc(b.floor)+'</option>').join("");}
function inject(){const root=$("agents");if(!root||$("toolReadinessPlanner"))return;const section=document.createElement("section");section.id="toolReadinessPlanner";section.className="section trp-shell";section.innerHTML='<div class="section-head"><div><span class="trp-kicker">V3.1 · TOOL REGISTRY & DEPENDENCY PLANNER</span><h2>Discover tools. Map what is missing.</h2></div><span class="trp-tag">PROPOSAL ONLY</span></div><p class="muted">Select a saved prompt-generated blueprint. The planner maps requested capabilities to a local registry, lists required dependencies and flags security gates. It cannot inspect the PC, install software, connect Quinn or execute tools.</p><label class="small" for="trpBlueprint">Saved agent blueprint</label><select id="trpBlueprint" class="field"><option value="">Choose a saved agent blueprint…</option></select><div class="row" style="margin-top:9px;flex-wrap:wrap"><button id="trpAnalyze" class="primary">Analyze tool readiness</button><button id="trpRefresh">Refresh saved drafts</button></div><div id="trpStatus" class="notice" style="margin-top:10px" aria-live="polite">Save a blueprint in Prompt-to-Agent first, then analyze it here.</div><div id="trpOutput" class="trp-output" hidden></div><div class="section"><div class="section-head"><h3>Local capability registry</h3><span class="small">'+REGISTRY.length+' definitions</span></div><div id="trpRegistry" class="trp-registry"></div></div><div class="notice">Availability is deliberately marked NOT_CONNECTED or NOT_CHECKED until a trusted host registry exists. Dependency entries are proposals, not installation instructions. Host shell, host writes and model dispatch remain blocked.</div>';const planner=$("promptToAgent");root.insertBefore(section,planner?planner.nextSibling:root.firstChild);renderDraftOptions();renderRegistry();}
function renderRegistry(){const el=$("trpRegistry");if(!el)return;el.innerHTML=REGISTRY.map(t=>'<div class="trp-registry-row"><span><strong>'+esc(t.name)+'</strong><small>'+esc(t.id)+' · '+esc(t.mode)+'</small></span><em>'+esc(t.availability)+'</em></div>').join("");}
function renderPlan(plan){const tools=plan.toolChecks.map(t=>'<div class="trp-row"><div><strong>'+esc(t.name)+'</strong><small>'+esc(t.id)+' · '+esc(t.mode)+'</small><small>'+esc(t.note)+'</small></div><span class="trp-state">'+esc(t.availability)+'</span></div>').join("");const deps=plan.dependencies.map(d=>'<div class="trp-row"><div><strong>'+esc(d.name)+'</strong><small>'+esc(d.kind)+' · '+esc(d.risk)+'</small></div><span class="trp-state">'+esc(d.proposal)+'</span></div>').join("");const blocked=plan.blockedCapabilities.length?plan.blockedCapabilities.map(x=>'<li><b>'+esc(x.name)+'</b> — '+esc(x.reason)+'</li>').join(""):"<li>No restricted capability was requested.</li>";return '<div class="trp-summary"><b>'+esc(plan.agentName)+'</b><span>'+plan.summary.knownTools+' mapped tools · '+plan.summary.dependenciesToReview+' dependency proposals · '+plan.summary.blockedCapabilities+' restricted capabilities</span><strong>0 tools available · 0 installed · 0 executed</strong></div><h3>Tool readiness</h3>'+tools+'<h3>Dependency proposals</h3>'+(deps||'<p class="muted">No dependencies mapped.</p>')+'<h3>Security gates / restricted capabilities</h3><ul>'+blocked+'</ul><div class="notice">This is a local planning report only. No live availability check occurred and no dependency was installed.</div><div class="row" style="margin-top:10px;flex-wrap:wrap"><button id="trpSaveProposal" class="primary">Save review proposal</button><button id="trpExport">Export readiness JSON</button></div>';}
let current=null;
function saveProposal(){if(!current)throw new Error("Analyze a blueprint first.");const all=readReviews();all.unshift({...current,ownerReview:"PENDING",reviewNote:"",savedAt:new Date().toISOString()});localStorage.setItem(REVIEW_STORE,JSON.stringify(all.slice(0,30)));$("trpStatus").textContent="Proposal saved on this phone for Owner review. Nothing was installed, connected or executed.";}
function wire(){document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.id==="trpAnalyze"){try{const i=Number($("trpBlueprint").value);const drafts=readDrafts();if(!$("trpBlueprint").value||!drafts[i])throw new Error("Choose a saved blueprint. Return to Prompt-to-Agent and save one if needed.");current=analyze(drafts[i]);$("trpOutput").hidden=false;$("trpOutput").innerHTML=renderPlan(current);$("trpStatus").textContent="Readiness plan generated locally. All availability checks remain unverified."; }catch(err){$("trpStatus").textContent=err.message;}return;}if(b.id==="trpRefresh"){renderDraftOptions();$("trpStatus").textContent="Saved blueprint list refreshed from this phone.";return;}if(b.id==="trpSaveProposal"){try{saveProposal();}catch(err){$("trpStatus").textContent=err.message;}return;}if(b.id==="trpExport"){if(!current)return;const blob=new Blob([JSON.stringify(current,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="mobile-ai-studio-tool-readiness.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);$("trpStatus").textContent="Readiness JSON export started. This does not authorize installation.";return;}});}
window.MOBILE_AI_STUDIO_TOOL_REGISTRY={version:"1.0.0",registry:REGISTRY.map(x=>({...x,dependencies:[...x.dependencies]})),dependencies:DEPENDENCIES.map(x=>({...x})),analyze};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{inject();wire();});else{inject();wire();}
})();