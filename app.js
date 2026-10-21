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
