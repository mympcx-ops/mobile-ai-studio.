"use strict";
const crypto = require("node:crypto");
const FACTORY_VERSION = "1.0.0";
const FLOORS = new Set(["Music", "Media", "Racing"]);
const REQUIRED_PROFILE = Object.freeze({localRead:true,localWrite:false,externalNetwork:false,execute:false,publish:false,deploy:false,humanApprovalRequired:true});
const REQUIRED_CHECKS = Object.freeze(["IDENTITY_AND_ROLE_MATCH","MISSION_AND_RESPONSIBILITIES_PRESENT","FLOOR_AND_MANAGER_RELATIONSHIP_VALID","LEAST_PRIVILEGE_PROFILE_VALID","NO_EXECUTION_OR_EXTERNAL_WRITE_CAPABILITY","DEPENDENCIES_AND_OUTPUTS_DOCUMENTED","OWNER_REVIEW_REQUIRED"]);
const FORBIDDEN = new Set(["execute","shell","powershell","processLaunch","arbitraryFilesystem","externalNetwork","publish","deploy","agentDispatch","credentialAccess"]);
const fail=(code,message,details={})=>({ok:false,code,message,details});
const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const str=v=>typeof v==="string"?v.trim():"";
function canonical(v){if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";if(obj(v))return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";return JSON.stringify(v);}
function hash(v){return crypto.createHash("sha256").update(canonical(v)).digest("hex");}
const agentOf=(c,id)=>Array.isArray(c?.agents)?c.agents.find(a=>a.id===id):undefined;
const managerOf=(c,name,floor)=>Array.isArray(c?.managers)?c.managers.find(m=>m.name===name&&m.floor===floor):undefined;
function validateBlueprint(b,c){
 if(!obj(b))return fail("INVALID_BLUEPRINT","Blueprint must be an object.");
 const missing=["id","name","floor","manager","mission","responsibilities"].filter(k=>!str(b[k]));
 if(missing.length)return fail("MISSING_REQUIRED_FIELDS","Required fields are missing.",{missing});
 if(!FLOORS.has(b.floor))return fail("INVALID_FLOOR","Floor is not canonical.");
 const a=agentOf(c,b.id);if(!a)return fail("UNKNOWN_AGENT","ID is not in the canonical 29-agent roster.",{agentId:b.id});
 if(a.name!==b.name||a.floor!==b.floor||a.manager!==b.manager)return fail("CANONICAL_IDENTITY_MISMATCH","Name, floor and manager must match the canonical roster.");
 if(!managerOf(c,b.manager,b.floor))return fail("INVALID_MANAGER_RELATIONSHIP","Manager must belong to the same floor.");
 if(b.lifecycleStatus!=="PLANNED")return fail("LIFECYCLE_CHANGE_FORBIDDEN","Factory cannot activate or change lifecycle.");
 if(b.validationStatus!=="NOT_RUN")return fail("VALIDATION_STATUS_FORGERY","Builder cannot set independent validation status.");
 if(!Array.isArray(b.dependencies)||!Array.isArray(b.toolsSkills)||!Array.isArray(b.knowledgeSources))return fail("INVALID_BLUEPRINT_COLLECTIONS","Dependencies, toolsSkills and knowledgeSources must be arrays.");
 if(!obj(b.permissionProfile))return fail("MISSING_PERMISSION_PROFILE","Permission profile is required.");
 const forbidden=Object.keys(b.permissionProfile).filter(k=>FORBIDDEN.has(k)&&b.permissionProfile[k]===true);
 if(forbidden.length)return fail("FORBIDDEN_CAPABILITY","Blueprint requests prohibited capabilities.",{forbidden});
 for(const [key,value] of Object.entries(REQUIRED_PROFILE))if(b.permissionProfile[key]!==value)return fail("PERMISSION_PROFILE_MISMATCH","Safe default permission profile is mandatory.",{key,expected:value,actual:b.permissionProfile[key]});
 return {ok:true,code:"BLUEPRINT_VALID",canonicalAgentId:a.id};
}
function buildAgentPackage({agentId,catalog,builderId,builderLabel,scopeNotes=""}){
 if(!str(builderId)||!str(builderLabel))return fail("BUILDER_IDENTITY_REQUIRED","Builder identity and label are required.");
 const a=agentOf(catalog,agentId);if(!a)return fail("UNKNOWN_AGENT","ID is not in the canonical 29-agent roster.",{agentId});
 const blueprint=JSON.parse(JSON.stringify(a));blueprint.lifecycleStatus="PLANNED";blueprint.builderStatus="BUILT_PENDING_VALIDATION";blueprint.validationStatus="NOT_RUN";blueprint.permissionProfile={...REQUIRED_PROFILE};
 const valid=validateBlueprint(blueprint,catalog);if(!valid.ok)return valid;
 const body={factoryVersion:FACTORY_VERSION,packageType:"AGENT_BLUEPRINT_ONLY",packageStatus:"BUILT_PENDING_INDEPENDENT_VALIDATION",agent:blueprint,provenance:{builderId:str(builderId),builderLabel:str(builderLabel),builtAt:new Date().toISOString(),scopeNotes:str(scopeNotes)},acceptanceChecks:REQUIRED_CHECKS.map(checkId=>({checkId,status:"NOT_RUN"})),safety:{executable:false,dispatchEnabled:false,externalWritesEnabled:false,publishEnabled:false,deployEnabled:false,secretsIncluded:false,ownerApprovalRequiredForActivation:true}};
 return {ok:true,code:"PACKAGE_BUILT_PENDING_VALIDATION",package:{...body,integritySha256:hash(body)}};
}
function validateAgentPackage(input,catalog){
 if(!obj(input)||!obj(input.package))return fail("INVALID_PACKAGE","Generated package is required.");
 const p=input.package,{integritySha256,...body}=p;
 if(!str(integritySha256)||hash(body)!==integritySha256)return fail("PACKAGE_INTEGRITY_MISMATCH","Package content changed after build.");
 if(p.packageType!=="AGENT_BLUEPRINT_ONLY"||p.safety?.executable!==false||p.safety?.dispatchEnabled!==false||p.safety?.externalWritesEnabled!==false||p.safety?.publishEnabled!==false||p.safety?.deployEnabled!==false)return fail("PACKAGE_SAFETY_POLICY_FAILED","Package safety flags are missing or unsafe.");
 const b=validateBlueprint(p.agent,catalog);if(!b.ok)return b;
 if(!Array.isArray(p.acceptanceChecks)||p.acceptanceChecks.map(x=>x.checkId).join("|")!==REQUIRED_CHECKS.join("|"))return fail("ACCEPTANCE_PLAN_INVALID","Required acceptance checks are missing or reordered.");
 return {ok:true,code:"PACKAGE_INTEGRITY_AND_POLICY_VALID",agentId:p.agent.id,checks:p.acceptanceChecks.length};
}
function recordIndependentReview({agentPackage,catalog,reviewerId,reviewerLabel,checks,evidence}){
 const valid=validateAgentPackage(agentPackage,catalog);if(!valid.ok)return valid;
 const p=agentPackage.package;
 if(!str(reviewerId)||!str(reviewerLabel))return fail("REVIEWER_IDENTITY_REQUIRED","Reviewer identity and label are required.");
 if(reviewerId===p.provenance.builderId)return fail("REVIEWER_NOT_INDEPENDENT","Builder cannot validate their own package.");
 if(!Array.isArray(checks)||!Array.isArray(evidence))return fail("REVIEW_EVIDENCE_REQUIRED","Checks and evidence must be arrays.");
 const supplied=new Map(checks.map(x=>[x?.checkId,x?.status]));
 const missing=REQUIRED_CHECKS.filter(id=>supplied.get(id)!=="PASS");
 if(missing.length)return fail("VALIDATION_INCOMPLETE_OR_FAILED","Every required check must explicitly PASS.",{missing});
 const validEvidence=evidence.filter(x=>obj(x)&&str(x.reference)&&str(x.description));
 if(validEvidence.length<REQUIRED_CHECKS.length)return fail("INSUFFICIENT_EVIDENCE","Provide evidence reference and description for each required check.",{required:REQUIRED_CHECKS.length,supplied:validEvidence.length});
 return {ok:true,code:"INDEPENDENT_REVIEW_RECORDED_PENDING_OWNER_APPROVAL",review:{packageIntegritySha256:p.integritySha256,agentId:p.agent.id,reviewerId:str(reviewerId),reviewerLabel:str(reviewerLabel),reviewedAt:new Date().toISOString(),outcome:"PASS_RECORDED_PENDING_OWNER_APPROVAL",checks:REQUIRED_CHECKS.map(checkId=>({checkId,status:"PASS"})),evidence:validEvidence.slice(0,REQUIRED_CHECKS.length),limitations:["Reviewer identity is caller-supplied and not authenticated by this library.","Evidence references are recorded, not independently fetched or verified.","A passing review does not activate, dispatch, publish, deploy or execute the agent."],ownerApprovalRequired:true,activationAuthorized:false}};
}
module.exports={FACTORY_VERSION,REQUIRED_ACCEPTANCE_CHECKS:REQUIRED_CHECKS,REQUIRED_PERMISSION_PROFILE:REQUIRED_PROFILE,buildAgentPackage,recordIndependentReview,validateAgentPackage,validateBlueprint};
