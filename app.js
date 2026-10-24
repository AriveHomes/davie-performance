"use strict";
// DAVIE PERFORMANCE frontend. Backend contract is documented in README.
// Never treat local screen state as proof a workout was saved.
const $=id=>document.getElementById(id);
const app={workouts:[],library:[],sessions:[],cardio:[],today:"",online:false,busy:false};
const categories={"Chest, Biceps & Triceps":["chest","biceps","triceps"],"Back & Shoulders":["back","shoulders","traps","rear delts"],"Leg Day":["legs","quads","hamstrings","glutes","calves"],"Core & Cardio":["core","abs","abdominals","cardio"],"Cardio":["cardio"]};
const session={started:0,elapsed:0,restEnd:0,restRemaining:90};
const pad=n=>String(n).padStart(2,"0"),clock=s=>pad(Math.floor(s/3600))+":"+pad(Math.floor(s/60)%60)+":"+pad(s%60),fmt=v=>Number(v||0).toLocaleString("en-US",{maximumFractionDigits:2});
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const text=(id,v)=>{$(id).textContent=v};
const key=r=>r.id??r.rowId??null;
const isToday=r=>r.date===app.today;
const exerciseSets=name=>app.workouts.filter(r=>isToday(r)&&r.exercise===name).sort((a,b)=>Number(a.set)-Number(b.set));
function activeTab(name){document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("hide",p.id!==name))}
function message(id,msg,kind=""){const node=$(id);node.textContent=msg;node.classList.toggle("success",kind==="success");node.classList.toggle("error",kind==="error");}
async function invoke(method,payload){
 // A secure backend adapter may be injected by a trusted same-origin host;
 // otherwise call a same-origin authenticated endpoint. GitHub Pages alone cannot write Sheets.
 if(window.DAVIE_API&&typeof window.DAVIE_API[method]==="function")return await window.DAVIE_API[method](payload);
 if(!location.pathname.startsWith("/api/")&&location.hostname.endsWith("github.io"))throw Error("Google Sheets connection is not configured. No changes were saved.");
 const response=await fetch("/api/workouts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({method,payload})});
 if(!response.ok)throw Error("Server did not confirm the request (HTTP "+response.status+").");
 const result=await response.json();if(result.error)throw Error(result.error);return result.data;
}
async function refresh(){const raw=await invoke("getAppData",{});if(!raw||!Array.isArray(raw.workouts)||!Array.isArray(raw.library)||typeof raw.today!=="string")throw Error("Backend returned incomplete workout data.");app.workouts=raw.workouts;app.library=raw.library;app.sessions=raw.sessions||[];app.cardio=raw.cardio||[];app.today=raw.today;app.online=true;render();}
async function verifySet(saved){
 const identifier=key(saved);await refresh();
 const match=app.workouts.some(r=>identifier!==null?String(key(r))===String(identifier):r.date===saved.date&&r.exercise===saved.exercise&&Number(r.set)===Number(saved.set)&&Number(r.weight)===Number(saved.weight)&&Number(r.reps)===Number(saved.reps));
 if(!match)throw Error("The server responded, but the set was not found on reload. Please check the sheet before retrying.");
}
async function guarded(fn){if(app.busy)return;app.busy=true;["save","saveCardio"].forEach(id=>$(id).disabled=true);try{await fn()}finally{app.busy=false;["save","saveCardio"].forEach(id=>$(id).disabled=false)}}
function showNumbers(){
 text("sets",fmt(app.workouts.length));text("volume",fmt(app.workouts.reduce((a,r)=>a+(Number(r.volume)||0),0)));text("days",new Set(app.workouts.map(r=>r.date)).size);text("count",fmt(app.library.length));
}
function render(){showNumbers();updateExercises(false);showSessions();showChartChoices();showCardio();showWholeDay()}
function updateExercises(keep=true){
 const list=$("exercise"),old=keep?list.value:"",focus=$("focus").value;
 const allowed=categories[focus]||[];
 const options=app.library.filter(e=>allowed.includes(String(e.group||"").trim().toLowerCase()));
 list.replaceChildren(...options.map(e=>new Option(e.name,e.name)));
 if(options.some(e=>e.name===old))list.value=old;
 showExercise();
}
function previousSets(name){
 const eligible=app.workouts.filter(r=>r.exercise===name&&r.date<app.today);
 const date=eligible.map(r=>r.date).sort().at(-1);
 return {date:date||"",rows:eligible.filter(r=>r.date===date).sort((a,b)=>Number(a.set)-Number(b.set))};
}
function showExercise(){
 const name=$("exercise").value,{date,rows:old}=previousSets(name),today=exerciseSets(name);
 text("pastDate",date?"· "+date:"");
 const maximum=Math.max(old.length,today.length,1),pairs=[];
 for(let i=0;i<maximum;i++){
  const p=old[i],t=today[i],improved=p&&t&&(Number(t.weight)>Number(p.weight)||(Number(t.weight)===Number(p.weight)&&Number(t.reps)>Number(p.reps)));
  pairs.push('<div class="compare-row"><b>'+(i+1)+'</b><span class="prior">'+(p?fmt(p.weight)+' lb × '+fmt(p.reps):'—')+'</span><span class="current">'+(t?fmt(t.weight)+' lb × '+fmt(t.reps)+(improved?' <em>↑ PR</em>':''):'—')+'</span></div>');
 }
 $("comparisonRows").innerHTML=pairs.join("");
 const next=old[today.length],best=old.slice().sort((a,b)=>Number(b.weight)-Number(a.weight)||Number(b.reps)-Number(a.reps))[0];
 text("target",next?"BEAT NEXT SET: "+fmt(next.weight)+" lb × "+fmt(Number(next.reps)+1):best?"BEAT LAST TIME: "+fmt(best.weight)+" lb × "+fmt(Number(best.reps)+1):"No previous session — establish your baseline.");
 text("todayCount",today.length+" SETS");
 $("todaySets").innerHTML=today.length?today.map((r,i)=>'<div class="set-row"><span class="check">✓</span><span class="metric">'+fmt(r.weight)+' lb</span><span class="metric">'+fmt(r.reps)+' reps</span><button type="button" class="editbtn mini" data-edit-current="'+i+'">Edit</button></div>').join(""):'<span class="note">No sets saved for this exercise yet.</span>';
 $("todaySets").querySelectorAll("[data-edit-current]").forEach(btn=>btn.onclick=()=>editSet(today[Number(btn.dataset.editCurrent)],"editStatus"));
 if(today.length){$("weight").value=today.at(-1).weight;$("reps").value=today.at(-1).reps}
 else if(old.length){$("weight").value=old[0].weight;$("reps").value=old[0].reps}
 else{$("weight").value="";$("reps").value=""}
}
function closeEditors(){document.querySelectorAll(".edit-pane").forEach(p=>p.remove())}
function editSet(row,statusId){
 closeEditors();const container=statusId==="editStatus"?$("todaySets"):$("allTodaySets");
 const pane=document.createElement("section");pane.className="edit-pane";
 pane.innerHTML='<h3>Correct Set '+safe(row.set)+' · '+safe(row.exercise)+'</h3><div class="pair"><div class="field"><label>WEIGHT (LB)</label><input aria-label="Corrected weight" type="number" min="0" max="1500" step="0.5"></div><div class="field"><label>REPS</label><input aria-label="Corrected reps" type="number" min="1" max="500" step="1"></div></div><div class="editbar"><button class="secondary" type="button">Cancel</button><button class="primary" type="button">SAVE CORRECTION</button></div>';
 const inputs=pane.querySelectorAll("input");inputs[0].value=row.weight;inputs[1].value=row.reps;
 pane.querySelector(".secondary").onclick=()=>pane.remove();
 pane.querySelector(".primary").onclick=()=>guarded(async()=>{
  const weight=Number(inputs[0].value),reps=Number(inputs[1].value);
  if(inputs[0].value===""||!Number.isFinite(weight)||weight<0||!Number.isInteger(reps)||reps<=0){message(statusId,"Enter valid weight and reps.","error");return}
  const id=key(row);if(id===null){message(statusId,"Editing requires a stable row ID from the backend to prevent changing the wrong set.","error");return}
  try{
   const confirmed=await invoke("updateSet",{id,weight,reps,expected:{weight:Number(row.weight),reps:Number(row.reps)}});
   if(!confirmed||!confirmed.saved||String(key(confirmed.record))!==String(id))throw Error("The backend did not confirm the edit.");
   await verifySet(confirmed.record);
   closeEditors();message(statusId,"✓ Correction saved and verified.","success");
  }catch(e){message(statusId,e.message,"error")}
 });
 container.appendChild(pane);pane.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function showWholeDay(){
 const rows=app.workouts.filter(isToday),groups=new Map();
 for(const r of rows){if(!groups.has(r.exercise))groups.set(r.exercise,[]);groups.get(r.exercise).push(r)}
 text("todaySummary",rows.length+" SETS");text("todayTabCount",rows.length?"("+rows.length+")":"");
 $("allTodaySets").innerHTML=groups.size?[...groups].map(([name,sets],groupIndex)=>'<div class="today-group"><div class="labelrow"><h3>'+safe(name)+'</h3><span class="persistent-tag">'+sets.length+' SETS</span></div>'+sets.map((r,i)=>'<div class="entry"><span class="saved">✓ '+safe(r.set)+'</span><strong>'+fmt(r.weight)+' lb</strong><strong>'+fmt(r.reps)+' reps</strong><button class="mini" type="button" data-group="'+groupIndex+'" data-row="'+i+'">Edit</button></div>').join("")+'</div>').join(""):'<p class="note">No confirmed sets today.</p>';
 const items=[...groups];$("allTodaySets").querySelectorAll("[data-group]").forEach(button=>button.onclick=()=>editSet(items[Number(button.dataset.group)][1][Number(button.dataset.row)],"todayEditStatus"));
}
async function saveSet(){await guarded(async()=>{
 const name=$("exercise").value,weight=Number($("weight").value),reps=Number($("reps").value);
 if(!name||$("weight").value===""||$("reps").value===""||!Number.isFinite(weight)||weight<0||!Number.isInteger(reps)||reps<1){message("setStatus","Choose an exercise and enter a valid weight and rep count.","error");return}
 const focus=$("focus").value;
 try{
  const confirmation=await invoke("saveSet",{exercise:name,focus,weight,reps,clientRequestId:crypto.randomUUID()});
  if(!confirmation||!confirmation.saved||!confirmation.record)throw Error("The backend did not confirm the save.");
  await verifySet(confirmation.record);
  message("setStatus","✓ Set saved and verified in your workout history.","success");startRest();
 }catch(e){message("setStatus",e.message,"error")}
})}
function showSessions(){
 $("sessions").innerHTML=app.sessions.slice(0,10).map(s=>'<div class="item"><strong>'+safe(s.focus)+'</strong><p>'+safe(s.date)+' · '+fmt(s.sets)+' sets · '+fmt(s.volume)+' lb</p></div>').join("")||'<p class="note">Connect the backend to load sessions.</p>';
}
function showChartChoices(){
 const existing=$("chartExercise").value,history=$("historyExercise").value;
 for(const id of ["chartExercise","historyExercise"]){$(id).replaceChildren(...app.library.map(e=>new Option(e.name,e.name)));}
 if(app.library.some(e=>e.name===existing))$("chartExercise").value=existing;
 if(app.library.some(e=>e.name===history))$("historyExercise").value=history;
 drawChart();showHistory();
}
function drawChart(){
 const name=$("chartExercise").value,months=new Map();
 for(const r of app.workouts.filter(r=>r.exercise===name)){const month=String(r.date||"").slice(0,7);if(/^\d{4}-\d{2}$/.test(month))months.set(month,Math.max(Number(r.weight)||0,months.get(month)||0))}
 const recent=[...months].sort().slice(-6),max=Math.max(1,...recent.map(x=>x[1]));
 $("chart").innerHTML=recent.map(([month,value])=>'<div class="barwrap"><div class="bar" title="'+safe(month)+': '+fmt(value)+' lb" style="height:'+Math.max(3,value/max*105)+'px"></div><small>'+safe(month)+'<br>'+fmt(value)+' lb</small></div>').join("")||'<p class="note">No historical chart data loaded.</p>';
}
function showHistory(){$("history").innerHTML=app.workouts.filter(r=>r.exercise===$("historyExercise").value).slice().reverse().map(r=>'<div class="item"><strong>'+fmt(r.weight)+' lb × '+fmt(r.reps)+'</strong><p>'+safe(r.date)+' · Set '+fmt(r.set)+'</p></div>').join("")||'<p class="note">No exercise history loaded.</p>'}
function showCardio(){$("cardioHistory").innerHTML=app.cardio.slice().reverse().slice(0,20).map(r=>'<div class="item"><strong>'+safe(r.exercise)+'</strong><p>'+safe(r.date)+' · '+fmt(r.minutes)+' min · '+fmt(r.distance)+' mi</p></div>').join("")||'<p class="note">No cardio history loaded.</p>'}
function tick(){
 const now=Date.now(),elapsed=session.started?session.elapsed+Math.floor((now-session.started)/1000):session.elapsed;
 text("workoutClock",clock(elapsed));
 if(session.restEnd){session.restRemaining=Math.max(0,Math.ceil((session.restEnd-now)/1000));if(!session.restRemaining){session.restEnd=0;text("restStart","START REST")}}
 text("restClock",pad(Math.floor(session.restRemaining/60))+":"+pad(session.restRemaining%60));
}
function startRest(){session.restRemaining=Number($("restLength").value);session.restEnd=Date.now()+session.restRemaining*1000;text("restStart","RESTART REST");tick()}
function init(){
 document.querySelectorAll("[data-tab]").forEach(button=>button.onclick=()=>activeTab(button.dataset.tab));
 $("viewToday").onclick=()=>{showWholeDay();activeTab("today")};
 $("focus").onchange=()=>updateExercises(true);
 $("exercise").onchange=()=>{closeEditors();showExercise()};
 $("historyExercise").onchange=showHistory;$("chartExercise").onchange=drawChart;
 $("save").onclick=saveSet;
 $("saveCardio").onclick=()=>message("cardioStatus","Cardio saving is disabled until an authenticated backend is verified.","error");
 $("startWorkout").onclick=()=>{session.elapsed=0;session.started=Date.now();$("startWorkout").disabled=true;$("finishWorkout").disabled=false;text("workoutState","Workout in progress");tick()};
 $("finishWorkout").onclick=()=>{if(!session.started)return;session.elapsed+=Math.floor((Date.now()-session.started)/1000);session.started=0;$("startWorkout").disabled=false;$("finishWorkout").disabled=true;text("workoutState","Session finished. Only confirmed sets are stored.");session.restEnd=0;tick()};
 $("restStart").onclick=startRest;$("restReset").onclick=()=>{session.restEnd=0;session.restRemaining=Number($("restLength").value);text("restStart","START REST");tick()};
 $("restLength").onchange=()=>{if(!session.restEnd){session.restRemaining=Number($("restLength").value);tick()}};
 $("repeatSet").onclick=()=>{const list=exerciseSets($("exercise").value),old=previousSets($("exercise").value).rows,last=list.at(-1)||old.at(-1);if(!last){message("setStatus","No previous set loaded.","error");return}$("weight").value=last.weight;$("reps").value=last.reps};
 setInterval(tick,1000);tick();
 message("setStatus","Connecting to workout history…");
 refresh().then(()=>message("setStatus","Workout history loaded.")).catch(e=>message("setStatus",e.message,"error"));
}
window.addEventListener("DOMContentLoaded",init);
