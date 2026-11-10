"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("V2.3 owner operations overview is wired into the app and offline shell",()=>{
 const html=read("index.html"),sw=read("sw.js");
 assert.match(html,/v2\.3-owner-operations\.css/);
 assert.match(html,/v2\.3-owner-operations\.js/);
 assert.match(sw,/mobile-ai-studio-shell-v26/);
 assert.match(sw,/v2\.3-owner-operations\.js/);
 assert.match(sw,/v2\.3-owner-operations\.css/);
});
test("V2.3 is read-only and does not create a new execution or network path",()=>{
 const source=read("v2.3-owner-operations.js");
 assert.match(source,/readOnly:true/);
 assert.doesNotMatch(source,/localStorage\.setItem\s*\(|fetch\s*\(|WebSocket\s*\(|EventSource\s*\(|\beval\s*\(|new Function\s*\(/);
 assert.match(source,/not live PC telemetry/);
 assert.match(source,/No data is changed/);
});
test("V2.3 preserves Owner approval and independent validation gates",()=>{
 const source=read("v2.3-owner-operations.js");
 assert.match(source,/pendingApprovals/);
 assert.match(source,/READY_FOR_VALIDATION/);
 assert.match(source,/PASS_RECORDED_PENDING_OWNER_APPROVAL/);
 assert.match(source,/activation authority granted/);
});

function runSnapshot(seed,catalog){
 const values=new Map(Object.entries(seed).map(([key,value])=>[key,JSON.stringify(value)]));
 const listeners={};let scheduled=0;
 const window={MOBILE_AGENT_CATALOG:catalog,addEventListener(){},setTimeout(fn){scheduled++;fn();}};
 const document={addEventListener(type,fn){(listeners[type]??=[]).push(fn);},getElementById(){return null;}};
 const context={window,document,localStorage:{getItem(key){return values.has(key)?values.get(key):null;}},setTimeout(fn){fn();}};
 vm.runInNewContext(read("v2.3-owner-operations.js"),context);
 return {api:window.MOBILE_AI_STUDIO_V23,values,listeners,get scheduled(){return scheduled;}};
}
test("V2.3.1 removes independently reviewed packages from the validation queue",()=>{
 const {api}=runSnapshot({
  "mobile-ai-studio-agent-factory-v1":{
   packages:[
    {packageId:"pkg-unreviewed",packageStatus:"BUILT_PENDING_INDEPENDENT_VALIDATION",agent:{id:"music-agent"}},
    {packageId:"pkg-reviewed",packageStatus:"BUILT_PENDING_INDEPENDENT_VALIDATION",agent:{id:"media-agent"}}
   ],
   reviews:[{packageId:"pkg-reviewed",outcome:"PASS_RECORDED_PENDING_OWNER_APPROVAL",activationAuthorized:false}]
  }
 },{agents:[{id:"music-agent",floor:"Music"},{id:"media-agent",floor:"Media"}]});
 const s=api.snapshot();
 assert.equal(s.packages,2);
 assert.equal(s.pendingPackages,1);
 assert.equal(s.ownerPending,1);
 assert.equal(s.floorData[0].packages,1);
 assert.equal(s.floorData[1].packages,1);
 assert.equal(api.readOnly,true);
});
test("V2.3.1 snapshots current local records and schedules refresh after lifecycle actions",()=>{
 // Keep timer and event assertions bound to this isolated VM fixture.
 const runtime=runSnapshot({}, {agents:[]});
 const {api,values}=runtime;
 assert.equal(api.snapshot().pendingApprovals,0);
 values.set("mobile-ai-studio-v1.2-operations",JSON.stringify({approvals:[{status:"PENDING"}]}));
 assert.equal(api.snapshot().pendingApprovals,1);
 assert.equal(api.version,"2.3.1");
 const button={id:"ccAddApproval",dataset:{},closest(){return this;}};
 runtime.listeners.click[0]({target:button});
 assert.equal(runtime.scheduled,1);
});
