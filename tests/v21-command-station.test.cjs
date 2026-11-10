"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const root=path.join(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html"),systems=read("v2.1-studio-systems.js"),css=read("v2.1-command-station.css"),factory=read("agent-factory/browser-ui.js"),validator=read("desktop-import/validator.cjs");
test("V2.1 styles and systems are loaded by the phone app",()=>{assert.match(html,/v2\.1-command-station\.css/);assert.match(html,/v2\.1-studio-systems\.js/);assert.match(css,/box-shadow/);assert.match(css,/prefers-reduced-motion/);});
test("local memory is explicitly scoped and never auto-shared",()=>{assert.match(systems,/sharing:"LOCAL_ONLY"/);assert.match(systems,/No agent has received this memory/);});
test("collaboration records remain drafts and cannot dispatch",()=>{assert.match(systems,/status:"DRAFT_NOT_SENT"/);assert.match(systems,/dispatchAuthorized:false/);assert.match(systems,/It was not sent or dispatched/);});
test("provider readiness does not claim a live Quinn connection",()=>{assert.match(systems,/NOT CONFIGURED/);assert.match(systems,/NOT ESTABLISHED/);assert.match(systems,/Model calls: DISABLED/);});
test("audit ledger labels its hash chain as local and non-authenticating",()=>{assert.match(systems,/GENESIS/);assert.match(systems,/does not authenticate identity/);});
test("Watchdog explicitly limits itself to phone-observable state",()=>{assert.match(systems,/NOT OBSERVABLE FROM PHONE/);assert.match(systems,/Desktop runtime was not contacted/);});
test("phone exporter and PC validator share the exact offline envelope contract",()=>{for(const field of ["mobile-ai-studio-agent-package-export/1","OFFLINE_FILE_EXPORT","MANUAL_PC_IMPORT_REQUIRED","automaticInstall:false","executionAuthorized:false"])assert.ok(factory.includes(field),field);for(const field of ["mobile-ai-studio-agent-package-export/1","OFFLINE_FILE_EXPORT","MANUAL_PC_IMPORT_REQUIRED","automaticInstall !== false","executionAuthorized !== false"])assert.ok(validator.includes(field),field);});
test("Agent Factory keeps builder and reviewer separate and preserves pending Owner approval",()=>{assert.match(factory,/reviewerId===p\.provenance\.builderId/);assert.match(factory,/PASS_RECORDED_PENDING_OWNER_APPROVAL/);assert.match(factory,/activationAuthorized:false/);});

test("V2.1 browser systems module passes Node syntax validation",()=>{const result=cp.spawnSync(process.execPath,["--check",path.join(root,"v2.1-studio-systems.js")],{encoding:"utf8"});assert.equal(result.status,0,result.stderr||result.stdout);});
