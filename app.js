"use strict";
const $=id=>document.getElementById(id);
const app={workouts:[],library:[],sessions:[],cardio:[],today:""};
const categories={
 "Chest, Biceps & Triceps":["chest","biceps","triceps"],
 "Back & Shoulders":["back","shoulders","traps","rear delts"],
 "Leg Day":["legs","quads","hamstrings","glutes","calves"],
 "Core & Cardio":["core","abs","abdominals","cardio"],
 "Cardio":["cardio"]
};
const session={started:0,elapsed:0,restEnd:0,restRemaining:90};
const pad=n=>String(n).padStart(2,"0");
const clock=s=>`${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`;
function tick(){const now=Date.now();const sec=session.started?Math.floor((now-session.started)/1000)+session.elapsed:session.elapsed;$("workoutClock").textContent=clock(sec);if(session.restEnd){session.restRemaining=Math.max(0,Math.ceil((session.restEnd-now)/1000));if(!session.restRemaining){session.restEnd=0;$("restStart").textContent="START REST";}}$("restClock").textContent=pad(Math.floor(session.restRemaining/60))+":"+pad(session.restRemaining%60);}
function startRest(){session.restRemaining=Number($("restLength").value);session.restEnd=Date.now()+session.restRemaining*1000;$("restStart").textContent="RESTART REST";tick();}
function renderProgress(){const name=$("chartExercise").value;const months=new Map();for(const w of app.workouts.filter(w=>w.exercise===name)){const month=String(w.date||"").slice(0,7);const score=Number(w.weight)||0;if(/^\d{4}-\d{2}$/.test(month))months.set(month,Math.max(months.get(month)||0,score));}const entries=[...months].sort().slice(-6),max=Math.max(1,...entries.map(x=>x[1]));$("chart").innerHTML=entries.map(([m,v])=>`<div class="barwrap"><div class="bar" title="${safe(m)}: ${v} lb" style="height:${Math.max(3,v/max*105)}px"></div><small>${safe(m.slice(5))}<br>${fmt(v)} lb</small></div>`).join("")||"<span class=\"note\">Connect your existing workout history to see monthly progress.</span>";}
const fmt=v=>Math.round(Number(v)||0).toLocaleString();
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function status(id,message){$(id).textContent=message;}
function init(){
 document.querySelectorAll("[data-tab]").forEach(button=>button.onclick=()=>{
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===button));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("hide",p.id!==button.dataset.tab));
 });
 $("focus").onchange=updateExercises;
 $("exercise").onchange=showExercise;
 $("historyExercise").onchange=showHistory;
 $("startWorkout").onclick=()=>{if(session.started)return;session.elapsed=0;session.started=Date.now();$("startWorkout").disabled=true;$("finishWorkout").disabled=false;$("workoutState").textContent="Workout in progress";tick();};
 $("finishWorkout").onclick=()=>{if(!session.started)return;session.elapsed+=Math.floor((Date.now()-session.started)/1000);session.started=0;$("startWorkout").disabled=false;$("finishWorkout").disabled=true;$("workoutState").textContent="Session finished · "+clock(session.elapsed)+" · Duration shown here only until backend is connected.";session.restEnd=0;tick();};
 $("restStart").onclick=startRest;$("restReset").onclick=()=>{session.restEnd=0;session.restRemaining=Number($("restLength").value);$("restStart").textContent="START REST";tick();};$("restLength").onchange=()=>{if(!session.restEnd){session.restRemaining=Number($("restLength").value);tick();}};
 $("repeatSet").onclick=()=>{const name=$("exercise").value;const last=app.workouts.filter(w=>w.exercise===name).at(-1);if(!last){status("setStatus","No previous set loaded yet.");return;}$("weight").value=last.weight;$("reps").value=last.reps;status("setStatus","Last set filled in. Saving requires the backend connection.");};
 $("chartExercise").onchange=renderProgress;setInterval(tick,1000);tick();
 $("save").onclick=()=>status("setStatus","Live saving is not connected yet. Your Google Sheet was not changed.");
 $("saveCardio").onclick=()=>status("cardioStatus","Live saving is not connected yet. Your Google Sheet was not changed.");
 render();
 status("setStatus","Backend setup needed before workout logging. See README.");
}
function render(){
 $("sets").textContent=fmt(app.workouts.length);
 $("volume").textContent=fmt(app.workouts.reduce((t,w)=>t+(Number(w.volume)||0),0));
 $("days").textContent=new Set(app.workouts.map(w=>w.date)).size;
 $("count").textContent=fmt(app.library.length);
 updateExercises();
 $("chartExercise").replaceChildren(...app.library.map(e=>new Option(e.name,e.name)));$("historyExercise").replaceChildren(...app.library.map(e=>new Option(e.name,e.name)));renderProgress();
 $("sessions").textContent="Connect your Google Sheet to load previous sessions.";
 $("cardioHistory").textContent="Connect your Google Sheet to load cardio.";
}
function updateExercises(){
 const focus=$("focus").value,group=categories[focus]||[];
 const options=app.library.filter(e=>group.includes(String(e.group).trim().toLowerCase()));
 const previous=$("exercise").value;
 $("exercise").replaceChildren(...options.map(e=>new Option(e.name,e.name)));
 if(options.some(x=>x.name===previous)) $("exercise").value=previous;
 showExercise();
}
function showExercise(){
 const name=$("exercise").value;
 const old=app.workouts.filter(w=>w.exercise===name&&w.date<app.today);
 const lastDate=old.map(w=>w.date).sort().at(-1);
 const last=old.filter(w=>w.date===lastDate).sort((a,b)=>a.set-b.set);
 $("pastDate").textContent=lastDate||"";
 $("pastSets").innerHTML=last.length?last.map(w=>'<div class="row"><span>Set '+fmt(w.set)+'</span><strong>'+fmt(w.weight)+' lb × '+fmt(w.reps)+'</strong></div>').join(""):"No previous workout data loaded.";
 const best=last.slice().sort((a,b)=>b.weight-a.weight||b.reps-a.reps)[0];
 $("target").textContent=best?"BEAT LAST TIME: "+fmt(best.weight)+" lb × "+fmt(best.reps+1)+" reps":"";
 if(last.length){$("weight").value=last[0].weight;$("reps").value=last[0].reps+1;}
 const today=app.workouts.filter(w=>w.exercise===name&&w.date===app.today);
 $("todayCount").textContent=today.length+" SETS";
 $("todaySets").innerHTML=today.map(w=>'<div class="row"><span>Set '+fmt(w.set)+'</span><strong>'+fmt(w.weight)+' × '+fmt(w.reps)+'</strong></div>').join("")||"No sets logged today.";
}
function showHistory(){const rows=app.workouts.filter(w=>w.exercise===$("historyExercise").value);$("history").innerHTML=rows.slice().reverse().map(w=>'<div class="item"><strong>'+fmt(w.weight)+' lb × '+fmt(w.reps)+'</strong><p>'+safe(w.date)+'</p></div>').join("")||"No history available.";}
window.addEventListener("DOMContentLoaded",init);
