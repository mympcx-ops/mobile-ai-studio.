"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("master pass board is wired into the phone application and offline shell",()=>{
 const html=read("index.html"),sw=read("sw.js");
 assert.match(html,/<script[^>]+src=["']master-pass\.js["']/i);
 assert.match(sw,/(["'])\.\/master-pass\.js\1/);
 assert.match(sw,/mobile-ai-studio-shell-v14/);
});
test("master pass status is truthful about disconnected PC and prohibited execution",()=>{
 const source=read("master-pass.js");
 assert.match(source,/DISABLED · NOT CONNECTED/);
 assert.match(source,/PROHIBITED/);
 assert.match(source,/Physical Android tests and independent security review remain separate release gates/);
 assert.doesNotMatch(source,/fetch\s*\(|WebSocket\s*\(|EventSource\s*\(/);
});
test("master pass only reads existing workflow stores and does not mutate agent lifecycle",()=>{
 const source=read("master-pass.js");
 assert.match(source,/mobile-ai-studio-v1\.2-operations/);
 assert.match(source,/mobile-ai-studio-v1\.2-workspaces/);
 assert.match(source,/mobile-ai-studio-agent-factory-v1/);
 assert.doesNotMatch(source,/localStorage\.setItem\s*\(/);
});
test("development documentation preserves Owner and release gates",()=>{
 const doc=read("docs/MASTER_PASS_INTEGRATION_AND_ACCEPTANCE.md");
 for(const phrase of ["Owner remains the final approval authority","PR #6 remains draft/unmerged","Physical Android Chrome/PWA tests","Independent security reviewer","No arbitrary shell"])assert.ok(doc.includes(phrase),"missing: "+phrase);
});
