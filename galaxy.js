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
const floors=[{name:"Music",x:150,color:colors.Music,n:14,dir:"MUSIC DIRECTOR",val:"MUSIC VALIDATOR"},{name:"Media",x:360,color:colors.Media,n:9,dir:"MEDIA DIRECTOR",val:"MEDIA VALIDATOR"},{name:"Racing",x:570,color:colors.Racing,n:6,dir:"RACING DIRECTOR",val:"RACING VALIDATOR"}];
floors.forEach((f,fi)=>{add(f.name+"-director",f.dir,f.name,"Floor Director",f.name+" floor leadership; delegates work and reviews agent outputs.",f.x,280,"Director");add(f.name+"-validator",f.val,f.name,"Independent Validator","Independent review role; reports validation findings separately from the builder.",f.x,535,"Validator");for(let i=0;i<f.n;i++){const col=i%4,row=Math.floor(i/4);add(f.name+"-agent-"+(i+1), "AGENT "+String(i+1).padStart(2,"0"),f.name,"Planned agent role","Role details are retained for the approved fleet specification and will be populated from the canonical agent directory.",f.x-68+col*45,370+row*47,"Agent");}});
const links=[];
links.push(["owner","secretary"],["secretary","coo"]);
floors.forEach(f=>{links.push(["coo",f.name+"-director"],[f.name+"-director",f.name+"-validator"]);for(let i=1;i<=f.n;i++)links.push([f.name+"-director",f.name+"-agent-"+i]);});
let scale=1,tx=0,ty=0,activeFilter="All",selected="owner",drag=null,pinch=null;
const positions=Object.fromEntries(nodes.map(n=>[n.id,n]));
function el(tag,attrs={}){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;}
function draw(){world.replaceChildren();const lines=el("g",{class:"galaxy-links"});links.forEach(([a,b])=>{const p=positions[a],q=positions[b];lines.appendChild(el("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y}));});world.appendChild(lines);
nodes.filter(n=>activeFilter==="All"||n.group===activeFilter||n.group==="Command").forEach(n=>{const g=el("g",{class:"galaxy-node"+(n.id===selected?" selected":""),transform:"translate("+n.x+" "+n.y+")",tabindex:"0",role:"button","aria-label":n.label});const c=colors[n.group]||colors.Oversight;g.appendChild(el("circle",{r:n.kind==="Owner"?22:n.kind==="Director"||n.kind==="Validator"?16:10,fill:c,"fill-opacity":".18",stroke:c}));const t=el("text",{y:n.kind==="Owner"?4:3});t.textContent=n.kind==="Owner"?"★":n.kind==="Director"?"D":n.kind==="Validator"?"V":"•";g.appendChild(t);const label=el("text",{y:n.kind==="Owner"?36:25});label.textContent=n.label;g.appendChild(label);g.addEventListener("click",()=>select(n));g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(n);}});world.appendChild(g);});applyTransform();}
function applyTransform(){world.setAttribute("transform","translate("+tx+" "+ty+") scale("+scale+")");}
function select(n){selected=n.id;detail.innerHTML="<strong>"+n.label+"</strong><p style='margin:6px 0'>"+n.role+"</p><small>"+n.mission+"</small><p style='margin:7px 0 0'><small>Group: "+n.group+" · Status: Planned / not connected</small></p>";draw();}
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