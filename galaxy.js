(()=>{"use strict";
const stage=document.getElementById("galaxyStage"),world=document.getElementById("galaxyWorld"),svg=document.getElementById("galaxySvg"),detail=document.getElementById("galaxyDetail");
if(!stage||!world||!svg||!detail)return;
const NS="http://www.w3.org/2000/svg";
const colors={Owner:"#ffd36a",Oversight:"#63d9ff",Music:"#a78bfa",Media:"#f472b6",Racing:"#6ee7a8"};
const nodes=[];
function add(id,label,group,role,mission,x,y,kind="Agent"){nodes.push({id,label,group,role,mission,x,y,kind});}
add("owner","OWNER","Command","User / Owner","Final authority. Approves high-impact changes, activation and deployment.",360,38,"Owner");
add("secretary","SECRETARY","Command","Secretary approval gate","Receives requests, checks completeness and routes work for authorization.",360,112,"Oversight");
add("coo","WATCHDOG / COO","Command","Studio Watchdog / COO","Coordinates studio operations, monitors floor status and escalates issues.",360,190,"Oversight");
const catalogSource=window.MOBILE_AGENT_CATALOG;const catalog=typeof catalogSource==="function"?catalogSource():(catalogSource||{});
const floorDefs=[
{name:"Music",x:150,color:colors.Music,n:14,dir:"MUSIC DIRECTOR",val:"MUSIC VALIDATOR"},
{name:"Media",x:360,color:colors.Media,n:9,dir:"MEDIA DIRECTOR",val:"MEDIA VALIDATOR"},
{name:"Racing",x:570,color:colors.Racing,n:6,dir:"RACING DIRECTOR",val:"RACING VALIDATOR"}];
const floors=floorDefs.map(f=>({...f,agents:(catalog?.agents||[]).filter(a=>a.floor===f.name),managers:(catalog?.managers||[]).filter(m=>m.floor===f.name)}));
floors.forEach(f=>{
 add(f.name.toLowerCase()+"-director",f.dir,f.name,"Floor Director",f.name+" floor leadership; delegates work and reviews agent outputs.",f.x,280,"Director");
 add(f.name.toLowerCase()+"-validator",f.val,f.name,"Independent Validator","Independent review role; reports validation findings separately from the builder.",f.x,550,"Validator");
 const ms=f.managers.length?f.managers:[];
 ms.forEach((m,i)=>{const mx=f.x-((ms.length-1)*28)/2+i*28;add(m.id,m.name,f.name,"Manager","Manages: "+m.manages.join(", "),mx,330,"Manager");});
 f.agents.forEach((a,i)=>{const col=i%4,row=Math.floor(i/4);add(a.id,a.name,f.name,a.manager,a.mission,f.x-68+col*45,390+row*39,"Agent");});
});
const links=[];
links.push(["owner","secretary"],["secretary","coo"]);
floors.forEach(f=>{links.push(["coo",f.name.toLowerCase()+"-director"],[f.name.toLowerCase()+"-director",f.name.toLowerCase()+"-validator"]);f.managers.forEach(m=>{links.push([f.name.toLowerCase()+"-director",m.id]);m.manages.forEach(name=>{const a=f.agents.find(x=>x.name===name);if(a)links.push([m.id,a.id]);});});if(!f.managers.length)f.agents.forEach(a=>links.push([f.name.toLowerCase()+"-director",a.id]));});
let scale=1,tx=0,ty=0,activeFilter="All",selected="owner",drag=null,pinch=null;
const positions=Object.fromEntries(nodes.map(n=>[n.id,n]));
function el(tag,attrs={}){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;}
function draw(){world.replaceChildren();const lines=el("g",{class:"galaxy-links"});links.forEach(([a,b])=>{const p=positions[a],q=positions[b];lines.appendChild(el("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y}));});world.appendChild(lines);
nodes.filter(n=>activeFilter==="All"||n.group===activeFilter||n.group==="Command").forEach(n=>{const g=el("g",{class:"galaxy-node"+(n.id===selected?" selected":""),transform:"translate("+n.x+" "+n.y+")",tabindex:"0",role:"button","aria-label":n.label});const c=colors[n.group]||colors.Oversight;g.appendChild(el("circle",{r:n.kind==="Owner"?22:n.kind==="Director"||n.kind==="Validator"?16:n.kind==="Manager"?13:9,fill:c,"fill-opacity":".18",stroke:c}));const t=el("text",{y:n.kind==="Owner"?4:3});t.textContent=n.kind==="Owner"?"★":n.kind==="Director"?"D":n.kind==="Validator"?"V":n.kind==="Manager"?"M":"•";g.appendChild(t);const label=el("text",{y:n.kind==="Owner"?36:n.kind==="Manager"?21:25});label.textContent=n.label;g.appendChild(label);g.addEventListener("click",()=>select(n,true));g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(n,true);}});world.appendChild(g);});applyTransform();}
function applyTransform(){world.setAttribute("transform","translate("+tx+" "+ty+") scale("+scale+")");}
function select(n,openWindow=false){selected=n.id;detail.innerHTML="<strong>"+n.label+"</strong><p style='margin:6px 0'>"+n.role+"</p><small>"+n.mission+"</small><p style='margin:7px 0 0'><small>Group: "+n.group+" · Status: Planned / not connected</small></p>";draw();if(openWindow&&window.openAgentDetails)window.openAgentDetails(n.id);}
function zoom(f){scale=Math.max(.65,Math.min(2.8,scale*f));applyTransform();}
document.getElementById("galaxyFilters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;activeFilter=b.dataset.filter;document.querySelectorAll("#galaxyFilters [data-filter]").forEach(x=>x.classList.toggle("selected",x===b));draw();});
document.getElementById("galaxyZoomIn").addEventListener("click",()=>zoom(1.2));document.getElementById("galaxyZoomOut").addEventListener("click",()=>zoom(.83));
document.getElementById("galaxyReset").addEventListener("click",()=>{scale=1;tx=0;ty=0;applyTransform();});
stage.addEventListener("pointerdown",e=>{if(e.target.closest(".galaxy-node"))return;stage.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,tx,ty};});
stage.addEventListener("pointermove",e=>{if(!drag)return;tx=drag.tx+(e.clientX-drag.x)*720/stage.clientWidth;ty=drag.ty+(e.clientY-drag.y)*620/stage.clientHeight;applyTransform();});
stage.addEventListener("pointerup",()=>drag=null);stage.addEventListener("pointercancel",()=>drag=null);
stage.addEventListener("wheel",e=>{e.preventDefault();zoom(e.deltaY<0?1.08:.92);},{passive:false});
draw();select(positions.owner);
})();