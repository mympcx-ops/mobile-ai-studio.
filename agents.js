(()=>{"use strict";
const agents=[];
function add(id,name,floor,manager,mission,responsibilities,short){
 agents.push({id,name,floor,manager,role:name,mission,responsibilities,shortLabel:short||name,definitionStatus:"INITIAL_DRAFT_REQUIRES_OWNER_REVIEW",
  permissionProfile:{localRead:true,localWrite:false,externalNetwork:false,execute:false,publish:false,deploy:false,humanApprovalRequired:true},
  dependencies:[manager+" Manager",floor+" Floor Director","Independent "+floor+" Validator"],
  toolsSkills:[],knowledgeSources:[],lifecycleStatus:"PLANNED",builderStatus:"NOT_STARTED",validationStatus:"NOT_RUN"});
}
const music=[
["midi-arranger","MIDI Arranger","Creative Director","Arrange MIDI parts, structure and musical performances for approved productions.","Create and revise MIDI arrangements; preserve song structure and groove intent; prepare editable arrangement outputs.","MIDI"],
["sound-designer","Sound Designer","Creative Director","Design original sounds and patches for the studio's supported instruments and sound libraries.","Create patch concepts; document synthesis parameters; organize sound variations and pack-ready presets.","Sound Design"],
["groove-bot","Groove Bot","Creative Director","Develop rhythmic patterns, grooves and variations that support the approved production direction.","Generate groove ideas; create pattern variations; maintain tempo and feel consistency.","Groove"],
["mpc-live-3-link","MPC Live 3 Link","Hardware Engineer","Support approved workflows and integration planning for MPC Live 3 hardware.","Document device workflows; map supported connections; prepare controlled hardware-integration instructions.","MPC Live 3"],
["moog-matriarch-route","Moog Matriarch Route","Hardware Engineer","Plan signal routing and integration workflows for the Moog Matriarch.","Document audio and CV routing; track patch dependencies; prepare reproducible routing plans.","Matriarch"],
["yamaha-montage-engine","Yamaha Montage Engine","Hardware Engineer","Support sound and workflow integration planning for Yamaha Montage instruments.","Catalog sound-engine capabilities; map performance workflows; prepare patch and integration notes.","Montage"],
["nord-lead-node","Nord Lead Node","Hardware Engineer","Support sound and workflow integration planning for Nord Lead instruments.","Catalog synthesis capabilities; map performance workflows; prepare sound-design and integration notes.","Nord Lead"],
["vocal-tuner","Vocal Tuner","Production Engine","Prepare vocal tuning and pitch-correction workflows for approved recordings.","Analyze vocal pitch; propose correction settings; preserve source recordings and require approval for edits.","Vocal Tuner"],
["mix-engineer","Mix Engineer","Production Engine","Prepare mix analysis and engineering recommendations for approved productions.","Review balance, EQ, dynamics and spatial placement; produce mix notes and revision plans.","Mix Engineer"],
["mastering-deck","Mastering Deck","Production Engine","Prepare mastering analysis and delivery recommendations for approved productions.","Review loudness and tonal balance; propose mastering chains; verify delivery targets without publishing.","Mastering"],
["sonic-dna-analyzer","Sonic DNA Analyzer","Metadata Archivist","Analyze and maintain structured sonic identity and metadata for sounds and productions.","Extract descriptive sound attributes; maintain tags and provenance; connect metadata to approved assets.","Sonic DNA"],
["elasticstage-portal","elasticStage Portal","Metadata Archivist","Maintain the studio's elasticStage metadata and asset-organization workflows.","Prepare metadata records; track asset versions; organize approved catalog information.","elasticStage"],
["shopify-apparel-sync","Shopify Apparel Sync","Business & Growth Studio","Prepare product-catalog and apparel workflow synchronization for Shopify.","Map approved product metadata; prepare catalog updates; require human approval before external writes.","Shopify"],
["tiktok-hook-clipper","TikTok Hook Clipper","Business & Growth Studio","Identify and prepare short-form hooks and clip concepts for TikTok growth workflows.","Find candidate hooks; draft clip timing and captions; prepare review-ready assets without publishing.","TikTok"]
];
music.forEach(x=>add(x[0],x[1],"Music",x[2],x[3],x[4],x[5]));
const media=[
["obs-capture","OBS / Capture","Media Production","Capture screen, game, camera, hardware and audio sources for approved media workflows.","Prepare capture profiles; coordinate source and audio checks; preserve capture-session metadata.","OBS / Capture"],
["video-analyzer","Video Analyzer","Media Production","Analyze visual content, demonstrations, gameplay and scenes.","Inspect footage; identify visual events and content structure; produce timestamped observations.","Video Analyzer"],
["transcript-analyzer","Transcript Analyzer","Media Production","Analyze transcript structure, statements, questions, jokes, stories and payoffs.","Extract topics and key moments; identify dialogue structure; produce searchable transcript notes.","Transcript Analyzer"],
["scene-detection","Scene Detection","Media Production","Detect scene changes, transitions and meaningful events in video.","Identify scene boundaries; timestamp transitions; provide candidate segments for human review.","Scene Detection"],
["shorts-editor","Shorts Editor","Media Production","Prepare approved vertical 9:16 short-form clip plans and edits.","Find candidate moments; propose vertical framing and pacing; prepare review-ready shorts.","Shorts Editor"],
["long-form-editor","Long-Form Editor","Media Production","Prepare long-form video edit structures from approved source footage.","Organize story beats; propose sequence and pacing; track edit versions and review notes.","Long-Form Editor"],
["thumbnail-title-intelligence","Thumbnail / Title Intelligence","Media Production","Analyze titles, hooks, thumbnails and creator patterns to inform packaging decisions.","Compare packaging concepts; identify patterns; prepare title and thumbnail recommendations.","Thumbnail / Title"],
["analytics","Analytics","Media Production","Track views, retention, watch time, engagement, clicks and revenue.","Organize performance metrics; compare content outcomes; prepare evidence-based reports.","Analytics"],
["archive","Archive","Media Production","Maintain video, transcript, clip, edit-version and genealogy records.","Catalog media assets; track provenance and versions; preserve links between source and derivative files.","Archive"]
];
media.forEach(x=>add(x[0],x[1],"Media",x[2],x[3],x[4],x[5]));
const racing=[
["poli-racing-coach","PoliAI Racing Coach","Racing Intelligence","Deliver racing coaching based on the driver's goals, session context and available evidence.","Prepare coaching guidance; summarize session priorities; distinguish observed telemetry from inference.","Racing Coach"],
["telemetry","Telemetry","Racing Intelligence","Collect, organize and interpret simulator telemetry for approved coaching workflows.","Analyze speed, throttle, brake, steering and timing channels; report data quality and comparisons.","Telemetry"],
["corner-intelligence","Corner Intelligence","Racing Intelligence","Analyze corner-by-corner behavior and identify repeatable driving opportunities.","Compare entry, apex and exit behavior; identify braking and throttle patterns; suggest review points.","Corner Intel"],
["driver-memory","Driver Memory","Racing Intelligence","Maintain the driver's approved profile, preferences, tendencies and historical context.","Record approved driver notes; track recurring tendencies; use relevant history without inventing data.","Driver Memory"],
["lap-analysis","Lap Analysis","Racing Intelligence","Compare laps and identify where time is gained or lost.","Compare sectors and corners; identify deltas; separate measured results from hypotheses.","Lap Analysis"],
["voice-coach","Voice Coach","Racing Intelligence","Provide concise on-demand spoken coaching responses, including the F9 question workflow.","Prepare short coaching responses; prioritize safety and clarity; speak only when requested or authorized.","Voice Coach"]
];
racing.forEach(x=>add(x[0],x[1],"Racing",x[2],x[3],x[4],x[5]));
const managers=[
{id:"music-creative-director",name:"Creative Director",floor:"Music",reportsTo:"Music Floor Director",manages:["MIDI Arranger","Sound Designer","Groove Bot"]},
{id:"music-hardware-engineer",name:"Hardware Engineer",floor:"Music",reportsTo:"Music Floor Director",manages:["MPC Live 3 Link","Moog Matriarch Route","Yamaha Montage Engine","Nord Lead Node"]},
{id:"music-production-engine",name:"Production Engine",floor:"Music",reportsTo:"Music Floor Director",manages:["Vocal Tuner","Mix Engineer","Mastering Deck"]},
{id:"music-metadata-archivist",name:"Metadata Archivist",floor:"Music",reportsTo:"Music Floor Director",manages:["Sonic DNA Analyzer","elasticStage Portal"]},
{id:"music-business-growth",name:"Business & Growth Studio",floor:"Music",reportsTo:"Music Floor Director",manages:["Shopify Apparel Sync","TikTok Hook Clipper"]},
{id:"media-production",name:"Media Production",floor:"Media",reportsTo:"Media Floor Director",manages:media.map(x=>x[1])},
{id:"racing-intelligence",name:"Racing Intelligence",floor:"Racing",reportsTo:"Racing Floor Director",manages:racing.map(x=>x[1])}
];
const oversight=["Music","Media","Racing"].flatMap(floor=>[
{id:floor.toLowerCase()+"-director",name:floor+" Floor Director",floor,role:"Floor Director",mission:"Lead the "+floor+" floor, delegate work to its managers and coordinate outputs with the studio command hierarchy.",reportsTo:"Studio Watchdog / COO",status:"PLANNED",validationStatus:"NOT_RUN"},
{id:floor.toLowerCase()+"-validator",name:floor+" Independent Validator",floor,role:"Independent Validator",mission:"Independently review the "+floor+" floor's agent blueprints, tests, permissions and evidence; report findings separately from builders.",reportsTo:"Owner / Secretary approval chain",status:"PLANNED",validationStatus:"NOT_RUN"}
]);
const catalog={schemaVersion:"1.0.0",catalogId:"mobile-ai-studio-canonical-fleet",source:"Roster and manager assignments reconstructed from prior project context; mission and responsibility text is an initial draft requiring owner review.",importedAt:null,policy:{defaultLifecycleStatus:"PLANNED",builderStatus:"NOT_STARTED",validationStatus:"NOT_RUN",executionEnabled:false,externalWritesEnabled:false,publishingEnabled:false,deploymentEnabled:false,humanApprovalRequired:true,permissionNote:"Provisional least-privilege planning profile only. Tool access and skills remain unassigned until separately specified and validated.",definitionNote:"Agent names and manager assignments are recovered from the project plan; mission and responsibility wording is an initial draft, not a verified verbatim specification."},counts:{agents:agents.length,managers:managers.length,oversight:oversight.length},agents,managers,oversight};
window.MOBILE_AGENT_CATALOG=catalog;
const STORAGE="mobile-ai-studio-agent-registry-v1";
let filter="All",selected=null;
const $=id=>document.getElementById(id);
function esc(v){return String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function loadImported(){try{return JSON.parse(localStorage.getItem(STORAGE)||"null");}catch(e){return null;}}
function render(){
 const list=$("canonicalAgentList"),summary=$("agentImportSummary"),detail=$("agentProfile");
 if(!list||!summary||!detail)return;
 const saved=loadImported(),isImported=!!(saved&&saved.agents&&saved.agents.length===29);
 summary.innerHTML="<strong>"+agents.length+" agents</strong> · "+managers.length+" managers · "+oversight.length+" directors / validators · <span>"+(isImported?"Imported on this phone":"Ready to import")+"</span>";
 const shown=agents.filter(a=>filter==="All"||a.floor===filter);
 list.innerHTML=shown.map(a=>"<button class='directory-card' data-agent-id='"+a.id+"'><span class='directory-floor'>"+esc(a.floor)+" · "+esc(a.manager)+"</span><strong>"+esc(a.name)+"</strong><small>PLANNED · NOT VALIDATED</small></button>").join("");
 const current=agents.find(a=>a.id===selected)||agents[0];
 if(current){detail.innerHTML="<div class='row between'><strong>"+esc(current.name)+"</strong><span class='directory-state'>PLANNED</span></div><p class='muted'>"+esc(current.mission)+"</p><div class='directory-meta'><b>Floor</b><span>"+esc(current.floor)+"</span><b>Manager</b><span>"+esc(current.manager)+"</span><b>Responsibilities</b><span>"+esc(current.responsibilities)+"</span><b>Permissions</b><span>Local read only; no execution, external writes, publishing or deployment. Human approval required.</span><b>Dependencies</b><span>"+current.dependencies.map(esc).join(" · ")+"</span><b>Builder</b><span>Not started</span><b>Independent validation</b><span>Not run</span></div>";}
 const btn=$("importCanonicalAgents");if(btn)btn.textContent=isImported?"Refresh canonical import":"Import 29 agents + 6 oversight roles";
}
document.addEventListener("click",e=>{
 const f=e.target.closest("[data-agent-filter]");if(f){filter=f.dataset.agentFilter;document.querySelectorAll("[data-agent-filter]").forEach(b=>b.classList.toggle("selected",b===f));render();return;}
 const card=e.target.closest("[data-agent-id]");if(card){selected=card.dataset.agentId;render();if(window.openAgentDetails)window.openAgentDetails(selected);return;}
 if(e.target.closest("#importCanonicalAgents")){
  const payload={...catalog,importedAt:new Date().toISOString(),agents:agents.map(a=>({...a,dependencies:[...a.dependencies],permissionProfile:{...a.permissionProfile}})),managers:managers.map(m=>({...m,manages:[...m.manages]})),oversight:oversight.map(o=>({...o}))};
  try{localStorage.setItem(STORAGE,JSON.stringify(payload));render();const s=$("agentImportFeedback");if(s)s.textContent="Imported successfully. All records remain Planned; builders have not run and validators have not approved anything.";}catch(err){const s=$("agentImportFeedback");if(s)s.textContent="Import failed: phone storage is unavailable or full.";}
 }
});
render();
})();