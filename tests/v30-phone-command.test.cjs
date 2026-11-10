const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function loadApi(){
 const store=new Map();
 const crypto={getRandomValues(bytes){for(let i=0;i<bytes.length;i++)bytes[i]=(i*13+7)%256;}};
 const window={addEventListener(){},crypto};
 const document={readyState:"loading",addEventListener(){},getElementById(){return null;}};
 const context={window,document,localStorage:{getItem(k){return store.get(k)||null;},setItem(k,v){store.set(k,v);}},crypto,globalThis:{crypto},URL,Date,Uint8Array,TextEncoder,Blob,console};
 vm.runInNewContext(read("v3.0-phone-command.js"),context);
 return window.MOBILE_AI_STUDIO_V30;
}
test("V3.0 module is wired into the phone shell and service worker cache",()=>{
 const html=read("index.html"),sw=read("sw.js");
 assert.match(html,/<link rel="stylesheet" href="v3\.0-phone-command\.css">/);
 assert.match(html,/<script src="v3\.0-phone-command\.js"><\/script>/);
 assert.match(sw,/mobile-ai-studio-shell-v25/);
 assert.match(sw,/v3\.0-phone-command\.js/);
 assert.match(sw,/v3\.0-phone-command\.css/);
});
test("V3.0 rejects plaintext, loopback and non-origin host URLs",()=>{
 const api=loadApi();
 for(const url of ["http://192.168.1.20:8443","http://localhost:8443","https://127.0.0.1","https://127.0.0.2","https://[::1]","https://localhost./","https://host.example/path","https://user:pass@host.example","https://host.example/?token=x"])
  assert.equal(api.validateHostOrigin(url).ok,false,url);
 assert.equal(api.validateHostOrigin("https://studio.example:9443").origin,"https://studio.example:9443");
});
test("V3.0 pairing request is expiring, read-only and explicitly not paired",()=>{
 const api=loadApi(),r=api.createPairingRequest({hostOrigin:"https://studio.example",phoneLabel:"Owner phone"});
 assert.equal(r.protocol,"mobile-ai-studio-bridge/3.0");
 assert.equal(r.status,"REQUEST_CREATED_NOT_PAIRED");
 assert.equal(r.requestedMode,"READ_ONLY");
 assert.deepEqual(Array.from(r.requestedCapabilities),["health.read","telemetry.read","agent-package.preview"]);
 assert.equal(Date.parse(r.expiresAt)-Date.parse(r.createdAt),300000);
 assert.match(r.nonce,/^[a-f0-9]{48}$/);
});
test("V3.0 handoff refuses unsafe packages and labels valid export manual/inert",()=>{
 const api=loadApi();
 const safe={packageId:"p1",packageType:"AGENT_BLUEPRINT_ONLY",safety:{executable:false,dispatchEnabled:false,externalWritesEnabled:false,publishEnabled:false,deployEnabled:false,secretsIncluded:false,ownerApprovalRequiredForActivation:true}};
 const env=api.exportPackageEnvelope("p1",{packages:[safe]});
 assert.equal(env.format,"mobile-ai-studio-agent-handoff/1");
 assert.equal(env.transferMode,"MANUAL_FILE_EXPORT");
 assert.equal(env.receiverRequirements.autoInstall,false);
 assert.equal(env.receiverRequirements.autoActivate,false);
 assert.throws(()=>api.exportPackageEnvelope("bad",{packages:[{packageId:"bad",packageType:"EXECUTABLE",safety:{}}]}),/does not meet/);
});
test("V3.0 docs preserve PC host and human approval boundaries",()=>{
 const spec=read("bridge/README.md"),plan=read("V3.0-IMPLEMENTATION.md");
 assert.match(spec,/bind to loopback by default/);
 assert.match(spec,/replay/);
 assert.match(spec,/No arbitrary shell/);
 assert.match(plan,/Authenticated phone-to-PC pairing \| Not implemented/);
});

test("V3.0 creates phone-authored agent drafts with enforced read-only permissions",()=>{
 const api=loadApi();
 const draft=api.createCustomAgentDraft({name:"Sample Builder",floor:"Music",director:"Music Floor Director",manager:"Music Manager",validator:"Music Independent Validator",mission:"Design and document sound-pack workflows.",responsibilities:"Prepare structured sound design plans and review notes.",dependencies:"Requires Owner-approved source assets."});
 assert.equal(draft.lifecycleStatus,"DRAFT_NOT_PACKAGED");
 assert.equal(draft.canonicalFleetStatus,"NOT_ADDED");
 assert.equal(draft.reportingChain.independentValidator,"Music Independent Validator");
 assert.equal(draft.permissionProfile.localWrite,false);
 assert.equal(draft.permissionProfile.execute,false);
 assert.equal(draft.approval.activationAuthorized,false);
 const out=api.exportCustomDraft(draft);
 assert.equal(out.format,"mobile-ai-studio-custom-agent-draft/1");
 assert.equal(out.receiverRequirements.autoActivate,false);
 assert.throws(()=>api.createCustomAgentDraft({name:"x",floor:"Unknown",manager:"",mission:"short",responsibilities:"short"}),/Agent name/);
 assert.throws(()=>api.exportCustomDraft({...draft,permissionProfile:{execute:true}}),/safety boundary/);
});
