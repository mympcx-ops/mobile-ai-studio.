(function(root){"use strict";
const FORMAT="mobile-ai-studio-arena-evidence-report/1";
function createReport(session,chambers,labApi){
 if(!session||session.format!=="mobile-ai-studio-arena-session/1")throw new Error("A valid Arena session is required.");
 if(session.ownerDecision!=="ACCEPTED")throw new Error("Owner acceptance is required before exporting a comparison report.");
 if(!session.evidence||!session.evidence.baselineChamberId||!session.evidence.candidateChamberId)throw new Error("Attach both manual Test Chamber records first.");
 const participants=Array.isArray(session.participants)?session.participants:[];
 if(participants.length!==2||participants.some(p=>!p||!p.id||!p.name))throw new Error("The report requires exactly two valid challenge participants.");
 const rows=Array.isArray(chambers)?chambers:[],a=rows.find(x=>x.chamberId===session.evidence.baselineChamberId),b=rows.find(x=>x.chamberId===session.evidence.candidateChamberId);
 if(!a||!b)throw new Error("One or both linked Test Chamber records are unavailable.");
 const lab=labApi||root.AgentArenaLab;if(!lab||typeof lab.compareChambers!=="function"||typeof lab.evaluateChamber!=="function"||!Array.isArray(lab.SCENARIOS)||!lab.SCENARIOS.length)throw new Error("The Test Chamber review engine is unavailable.");
 const allowed=["NOT_RUN","PASS","FAIL","BLOCKED"];
 const validate=(ch,participant,label)=>{
  if(!ch||ch.format!=="mobile-ai-studio-arena-chamber/1"||!ch.agent||String(ch.agent.id)!==String(participant.id))throw new Error(label+" evidence records do not match the challenge participants.");
  if(!Array.isArray(ch.scenarios)||ch.scenarios.length!==lab.SCENARIOS.length)throw new Error(label+" Test Chamber must contain the complete canonical scenario set.");
  const ids=new Set(ch.scenarios.map(s=>s&&s.id));
  if(ids.size!==lab.SCENARIOS.length||lab.SCENARIOS.some(s=>!ids.has(s.id)))throw new Error(label+" Test Chamber contains missing, duplicate or unsupported scenarios.");
  if(ch.scenarios.some(s=>!allowed.includes(s.status)))throw new Error(label+" Test Chamber contains an unsupported outcome status.");
 };
 validate(a,participants[0],"Baseline");validate(b,participants[1],"Candidate");
 const comparison=lab.compareChambers(a,b),summary=ch=>{const r=lab.evaluateChamber(ch);return {chamberId:ch.chamberId,agentId:ch.agent.id,agentName:ch.agent.name,status:r.status,total:r.total,counts:r.counts,scenarios:ch.scenarios.map(s=>({scenarioId:s.id,label:lab.SCENARIOS.find(x=>x.id===s.id).label,status:s.status}))}};
 return {format:FORMAT,generatedAt:new Date().toISOString(),session:{sessionId:session.sessionId,title:session.title,mission:session.mission,scenarioId:session.scenarioId,scenarioLabel:session.scenarioLabel,ownerDecision:session.ownerDecision,ownerDecisionAt:session.ownerDecisionAt},participants:participants.map(p=>({id:p.id,name:p.name,floor:p.floor,role:p.role})),environment:"PHONE_LOCAL_MANUAL_EVIDENCE_ONLY",baseline:summary(a),candidate:summary(b),comparison:{baselinePasses:comparison.baseline.passes,candidatePasses:comparison.candidate.passes,passDifference:comparison.passDifference,rows:comparison.rows},assurance:{agentExecution:"NOT_PERFORMED",agentDispatch:"NOT_PERFORMED",independentEvidenceAuthentication:"NOT_PERFORMED",certification:"NOT_GRANTED",activation:"NOT_AUTHORIZED"},limitations:["This report summarizes manually entered Test Chamber outcomes only.","Observations, evidence text, private notes, credentials and private memory are intentionally excluded.","A PASS count is not a model-intelligence score, independent validation or certification.","Owner acceptance authorizes local planning only; it does not authorize agent execution or deployment."]};
}
function download(session,chambers,labApi){
 const report=createReport(session,chambers,labApi);if(!root.document||!root.Blob||!root.URL||typeof root.URL.createObjectURL!=="function")throw new Error("File download is unavailable in this environment.");
 const blob=new root.Blob([JSON.stringify(report,null,2)],{type:"application/json"}),url=root.URL.createObjectURL(blob),a=root.document.createElement("a");
 a.href=url;a.download="arena-evidence-"+String(session.sessionId).replace(/[^a-z0-9_-]/gi,"-")+".json";root.document.body.appendChild(a);a.click();a.remove();root.URL.revokeObjectURL(url);return report;
}
const api={FORMAT,createReport,download};root.AgentArenaReport=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
