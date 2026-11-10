(()=>{"use strict";
const STORE="mobile-ai-studio-prompt-agent-v1";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const CATALOG=[
{id:"python.analysis",name:"Python analysis",description:"Structured calculations, data processing and repeatable analysis",scopes:["workspace.read","sandbox.execute"],risk:"SANDBOX_ONLY",triggers:["python","data","calculate","analysis","analyze","csv","spreadsheet","statistics","telemetry"]},
{id:"telemetry.reader",name:"Telemetry reader",description:"Read allowlisted racing telemetry snapshots",scopes:["telemetry.read"],risk:"READ_ONLY",triggers:["racing","iracing","braking","lap","telemetry","motorsport","sim"]},
{id:"git.review",name:"Git and change review",description:"Inspect diffs, branches, commits and repository status",scopes:["repository.read"],risk:"READ_ONLY",triggers:["code","software","developer","engineer","repository","git","bug","build","test"]},
{id:"test.runner",name:"Test runner",description:"Run approved project test suites inside an isolated workspace",scopes:["sandbox.execute","workspace.read"],risk:"SANDBOX_ONLY",triggers:["test","testing","validate","validation","debug","engineer","build","code"]},
{id:"document.reader",name:"Document reader",description:"Read user-selected documents and extract structured information",scopes:["workspace.read"],risk:"READ_ONLY",triggers:["document","pdf","manual","specification","requirements","contract","research","summarize"]},
{id:"web.research",name:"Web research",description:"Research public sources and retain source references",scopes:["network.research"],risk:"EXTERNAL_READ",triggers:["research","latest","sources","web","internet","competitor","market"]},
{id:"audio.asset.reader",name:"Audio and sample analysis",description:"Inspect user-provided audio assets and metadata",scopes:["workspace.read","media.analyze"],risk:"READ_ONLY",triggers:["music","audio","sound","sample","midi","synth","producer","mix","master"]},
{id:"midi.utility",name:"MIDI utilities",description:"Inspect and generate MIDI drafts without sending to hardware",scopes:["workspace.read","sandbox.write"],risk:"SANDBOX_ONLY",triggers:["music","midi","composition","arrangement","piano","sequencer"]},
{id:"report.writer",name:"Report generator",description:"Produce structured summaries, evidence reports and handoff documents",scopes:["sandbox.write"],risk:"SANDBOX_ONLY",triggers:["report","summary","research","analysis","audit","review","business","manager"]},
{id:"browser.automation",name:"Browser automation",description:"Navigate approved web workflows after explicit scoped authorization",scopes:["network.research"],risk:"REQUIRES_APPROVAL",triggers:["browser","website","web form","online workflow"]},
{id:"shell.execution",name:"Host shell execution",description:"Execute commands on the PC host",scopes:["host.execute"],risk:"DISABLED_PENDING_SECURITY_REVIEW",triggers:["powershell","shell","command line","host"]},
{id:"filesystem.write",name:"Host filesystem write",description:"Modify files on the PC host",scopes:["host.filesystem.write"],risk:"DISABLED_PENDING_SECURITY_REVIEW",triggers:["write files","modify files","edit files","filesystem"]},
{id:"model.dispatch",name:"Local model dispatch",description:"Send tasks to local models through an authenticated host broker",scopes:["model.dispatch"],risk:"DISABLED_PENDING_HOST_INTEGRATION",triggers:["qwen","ollama","local model","quinn"]},
{id:"publish.deploy",name:"Publish and deploy",description:"Publish or deploy approved deliverables",scopes:["publish","deploy"],risk:"OWNER_APPROVAL_REQUIRED",triggers:["publish","deploy","release","production"]}
];
const TEST_TEMPLATES=[
{kind:"NORMAL",name:"Happy-path task",expectation:"Agent completes its stated mission using only assigned, approved tools."},
{kind:"EDGE",name:"Missing or malformed input",expectation:"Agent requests clarification or safely reports invalid input without guessing."},
{kind:"FAILURE",name:"Tool unavailable",expectation:"Agent reports BLOCKED, preserves evidence and does not claim success."},
{kind:"SECURITY",name:"Out-of-scope action",expectation:"Agent denies the action and records the permission boundary."},
{kind:"REGRESSION",name:"Repeatability check",expectation:"Same controlled input produces a consistent, traceable result."}
];
function classify(prompt){
 const p=String(prompt||"").trim().toLowerCase();
 if(p.length<8)throw new Error("Describe the agent's job in at least 8 characters.");
 if(p.length>3000)throw new Error("Keep the prompt under 3,000 characters.");
 const scores=Object.create(null);
 for(const item of CATALOG){let n=0;for(const word of item.triggers){if(p.includes(word))n+=word.includes(" ")?2:1;}scores[item.id]=n;}
 const selected=CATALOG.filter(x=>scores[x.id]>0 && !x.id.startsWith("shell.") && !x.id.startsWith("filesystem.") && !x.id.startsWith("model.") && !x.id.startsWith("publish."));
 if(!selected.some(x=>x.id==="report.writer"))selected.push(CATALOG.find(x=>x.id==="report.writer"));
 const domain=p.match(/racing|iracing|telemetry|braking|lap/i)?"Racing":p.match(/music|audio|sound|midi|synth|sample/i)?"Music":p.match(/media|video|photo|social|content/i)?"Media":"General";
 const role=domain==="Racing"?"Racing":domain==="Music"?"Music":domain==="Media"?"Media":"General";
 const title=p.split(/[.!?\n]/)[0].replace(/^(build|create|make|design)\s+(me\s+)?/i,"").trim().slice(0,72)||"Custom Agent";
 const tests=TEST_TEMPLATES.map((t,i)=>({...t,id:"T"+String(i+1).padStart(2,"0")}));
 const assigned=selected.map(x=>({id:x.id,name:x.name,description:x.description,scopes:[...x.scopes],risk:x.risk,assignmentReason:"Matched to the prompt; requires availability and policy approval."}));
 return {format:"mobile-ai-studio-agent-blueprint/1",blueprintId:"DRAFT-"+Date.now().toString(36).toUpperCase(),createdAt:new Date().toISOString(),name:title.charAt(0).toUpperCase()+title.slice(1),floor:role,prompt:String(prompt).trim(),mission:String(prompt).trim(),toolAssignments:assigned,toolAssignmentMode:"LOCAL_RULE_BASED_RECOMMENDATION",requiredSkills:[...new Set(assigned.map(x=>x.id.split(".")[0]))],permissionProfile:{defaultDeny:true,readOnlyByDefault:true,localWorkspaceRead:true,sandboxExecution:assigned.some(x=>x.risk==="SANDBOX_ONLY"),externalNetwork:false,hostShell:false,hostFilesystemWrite:false,modelDispatch:false,publish:false,deploy:false,humanApprovalRequired:true},workflow:["Parse assignment and clarify acceptance criteria","Inspect only explicitly approved inputs","Execute approved tools within an isolated workspace","Capture logs, outputs and evidence","Diagnose failures and propose bounded repairs","Rerun tests and regression checks","Independent Validator reviews evidence","Submit final package for Owner approval"],testPlan:tests,reporting:{manager:"Assigned floor manager (to be selected)",independentValidator:"Separate Validator required",owner:"Owner approval required"},lifecycle:{status:"DRAFT",validation:"NOT_RUN",canonicalFleet:"NOT_ADDED",activationAuthorized:false},limitations:["Recommendations are generated locally by deterministic keyword matching, not by Quinn or an LLM.","Tool names describe planned capabilities; this phone app does not install, grant or execute them.","Host shell, filesystem writes, model dispatch, publishing and deployment remain unavailable pending separate implementation and approval.","A generated test plan is not evidence that tests have been executed."]};
}
function renderBlueprint(b){
 const tools=b.toolAssignments.map(t=>'<div class="pta-tool"><div><strong>'+esc(t.name)+'</strong><small>'+esc(t.description)+'</small><small>Scopes: '+esc(t.scopes.join(", "))+'</small></div><span class="pta-risk">'+esc(t.risk)+'</span></div>').join("");
 const tests=b.testPlan.map(t=>'<div class="pta-test"><b>'+esc(t.kind)+'</b><strong>'+esc(t.name)+'</strong><small>'+esc(t.expectation)+'</small></div>').join("");
 return '<div class="pta-result-head"><div><span class="pta-kicker">GENERATED BLUEPRINT · NOT ACTIVE</span><h3>'+esc(b.name)+'</h3><p>'+esc(b.floor)+' · '+b.toolAssignments.length+' suggested tools · '+b.testPlan.length+' planned tests</p></div><span class="pta-draft">DRAFT</span></div><h4>Automatically assigned tools</h4>'+tools+'<h4>Workflow</h4><ol class="pta-workflow">'+b.workflow.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol><h4>Generated test plan</h4>'+tests+'<h4>Permission profile</h4><div class="pta-perms"><span>Default deny: <b>ON</b></span><span>Sandbox execution: <b>'+(b.permissionProfile.sandboxExecution?"Proposed":"Not requested")+'</b></span><span>Host shell: <b>DENIED</b></span><span>Host file writes: <b>DENIED</b></span><span>Model dispatch: <b>DENIED</b></span><span>Publish / deploy: <b>DENIED</b></span><span>Owner approval: <b>REQUIRED</b></span></div><div class="notice">'+b.limitations.map(esc).join("<br>")+'</div>';
}
function inject(){
 const root=$("agents");if(!root||$("promptToAgent"))return;
 const section=document.createElement("section");section.id="promptToAgent";section.className="section pta-shell";
 section.innerHTML='<div class="section-head"><div><span class="pta-kicker">PROMPT-TO-AGENT INTELLIGENCE</span><h2>Describe it. Build its blueprint.</h2></div><span class="pta-draft">LOCAL PLANNER</span></div><p class="muted">Enter the agent&#39;s mission in plain language. The planner recommends tools, permissions, workflow and tests automatically.</p><label class="small" for="ptaPrompt">What should this agent do?</label><textarea id="ptaPrompt" class="field" maxlength="3000" placeholder="Example: Build a racing telemetry analyst that identifies braking mistakes, compares laps and recommends improvements."></textarea><div class="row between" style="margin-top:9px;flex-wrap:wrap"><span class="small">8–3,000 characters · no backend connection required</span><button id="ptaGenerate" class="primary">✦ Generate agent blueprint</button></div><div id="ptaStatus" class="notice" style="margin-top:10px" aria-live="polite">Ready. Generation is local and does not connect to Quinn or execute tools.</div><div id="ptaOutput" class="pta-output" hidden></div><div class="section"><h3>Saved prompt-generated drafts</h3><div id="ptaSaved" class="notice">No generated drafts saved on this phone.</div></div>';
 root.insertBefore(section,root.firstChild);
}
let current=null;
function saveDraft(){
 if(!current)throw new Error("Generate a blueprint first.");
 let items=[];try{items=JSON.parse(localStorage.getItem(STORE)||"[]");}catch(e){}
 items=Array.isArray(items)?items:[];
 items.unshift(current);items=items.slice(0,30);
 localStorage.setItem(STORE,JSON.stringify(items));renderSaved();
}
function renderSaved(){
 const root=$("ptaSaved");if(!root)return;
 let items=[];try{items=JSON.parse(localStorage.getItem(STORE)||"[]");}catch(e){}
 root.innerHTML=Array.isArray(items)&&items.length?items.map((b,i)=>'<div class="pta-saved-row"><span><strong>'+esc(b.name)+'</strong><small>'+esc(b.floor)+' · '+esc(b.lifecycle?.status||"DRAFT")+'</small></span><button data-pta-load="'+i+'">View</button></div>').join(""):"No generated drafts saved on this phone.";
}
function wire(){
 document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="ptaGenerate"){try{current=classify($("ptaPrompt").value);$("ptaOutput").hidden=false;$("ptaOutput").innerHTML=renderBlueprint(current)+'<div class="row" style="margin-top:12px;flex-wrap:wrap"><button id="ptaSave" class="primary">Save draft on this phone</button><button id="ptaExport">Export blueprint JSON</button></div>';$("ptaStatus").textContent="Blueprint generated locally. Tool assignments are recommendations only; no tools were installed or executed.";}catch(err){$("ptaStatus").textContent=err.message;}return;}
 if(b.id==="ptaSave"){try{saveDraft();$("ptaStatus").textContent="Draft saved locally. It remains inactive, unvalidated and outside the canonical fleet.";}catch(err){$("ptaStatus").textContent=err.message;}return;}
 if(b.id==="ptaExport"){if(!current)return;const blob=new Blob([JSON.stringify(current,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="mobile-ai-studio-agent-blueprint.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);$("ptaStatus").textContent="Manual blueprint export started. No installation or activation occurred.";return;}
 if(b.dataset.ptaLoad!==undefined){let items=[];try{items=JSON.parse(localStorage.getItem(STORE)||"[]");}catch(err){}current=items[Number(b.dataset.ptaLoad)]||null;if(current){$("ptaPrompt").value=current.prompt;$("ptaOutput").hidden=false;$("ptaOutput").innerHTML=renderBlueprint(current);$("ptaStatus").textContent="Loaded saved draft. It remains inactive.";}return;}
 });
}
window.MOBILE_AI_STUDIO_PROMPT_AGENT={version:"1.0.0",catalog:CATALOG.map(x=>({...x,triggers:[...x.triggers]})),classify,tests:TEST_TEMPLATES.map(x=>({...x}))};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{inject();renderSaved();wire();});else{inject();renderSaved();wire();}
})();
