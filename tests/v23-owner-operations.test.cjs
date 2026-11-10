"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("V2.3 owner operations overview is wired into the app and offline shell",()=>{
 const html=read("index.html"),sw=read("sw.js");
 assert.match(html,/v2\.3-owner-operations\.css/);
 assert.match(html,/v2\.3-owner-operations\.js/);
 assert.match(sw,/mobile-ai-studio-shell-v17/);
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
