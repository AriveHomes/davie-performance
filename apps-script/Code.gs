// DAVIE PERFORMANCE — Google Apps Script backend.
// Deploy from a dedicated Apps Script project. Do not overwrite the current app until verified.
const DP_SHEET_ID = '10VxZTIHVvxbj8oenzPV4YtBMJl5vJfWK5xvJ2PgD2-0';
const DP_TZ = 'America/Denver';
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('DAVIE PERFORMANCE')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function dpBook_(){return SpreadsheetApp.openById(DP_SHEET_ID);}
function dpDate_(value) {
  if(value instanceof Date)return Utilities.formatDate(value,DP_TZ,'yyyy-MM-dd');
  const str=String(value||'');
  return /^\\d{4}-\\d{2}-\\d{2}/.test(str)?str.slice(0,10):str;
}
function dpToday_(){return Utilities.formatDate(new Date(),DP_TZ,'yyyy-MM-dd');}
function dpNumber_(v){const n=Number(v);return isFinite(n)?n:0;}
function dpRows_(sheet){const n=sheet.getLastRow();return n<2?[]:sheet.getRange(2,1,n-1,12).getValues();}
function dpWorkout_(r,index) {
 return {id:String(r[10]||'legacy-'+(index+2)),date:dpDate_(r[0]),
   focus:String(r[2]||''),exercise:String(r[3]||''),set:dpNumber_(r[4]),
   weight:dpNumber_(r[5]),reps:dpNumber_(r[6]),volume:dpNumber_(r[7])};
}
function getAppData(){
 const wb=dpBook_(),sets=dpRows_(wb.getSheetByName('WORKOUT LOG'));
 const workouts=sets.filter(r=>r[0]&&r[3]).map((r,i)=>dpWorkout_(r,i));
 const lib=wb.getSheetByName('EXERCISE LIBRARY');
 const library=lib.getLastRow()>1?lib.getRange(2,1,lib.getLastRow()-1,6).getValues()
    .filter(r=>r[0]).map(r=>({name:String(r[0]),group:String(r[1]||''),notes:String(r[5]||'')})):[];
 const sessionsById={};
 workouts.forEach(r=>{const k=r.date+'|'+r.focus;const o=sessionsById[k]||(sessionsById[k]={date:r.date,focus:r.focus,sets:0,volume:0});o.sets++;o.volume+=r.volume;});
 const cardioSheet=wb.getSheetByName('CARDIO LOG');
 const cardio=cardioSheet&&cardioSheet.getLastRow()>1?
  cardioSheet.getRange(2,1,cardioSheet.getLastRow()-1,11).getValues().filter(r=>r[0]).map(r=>({
  date:dpDate_(r[0]),exercise:String(r[2]||''),minutes:dpNumber_(r[3]),distance:dpNumber_(r[4])})):[];
 return {today:dpToday_(),library:library,workouts:workouts,
    sessions:Object.keys(sessionsById).map(k=>sessionsById[k]).sort((a,b)=>b.date.localeCompare(a.date)),cardio:cardio};
}
function dpValid_(weight,reps){
 return typeof weight==='number'&&isFinite(weight)&&weight>=0&&weight<=1500
  &&typeof reps==='number'&&isFinite(reps)&&reps>=1&&reps<=500&&Math.floor(reps)===reps;
}
function dpMultiplier_(name,notes){
 if(/single dumbbell|one dumbbell held with both|single plate|weight includes bar|barbell|goblet/i.test(notes+' '+name))return 1;
 return /both arms|per arm|bilateral|both dumbbells|per hand|each hand|per dumbbell/i.test(notes)?2:1;
}
function dpVolumeFormula_(row,mult){return '=F'+row+'*G'+row+'*'+mult;}
function dpOneRMFormula_(row){return '=F'+row+'*(1+G'+row+'/30)';}
function dpNotes_(wb,exercise){
 const lib=wb.getSheetByName('EXERCISE LIBRARY'),n=lib.getLastRow();
 if(n<=1)return'';
 const rows=lib.getRange(2,1,n-1,6).getValues();
 const row=rows.find(r=>String(r[0])===exercise);
 return row?String(row[5]||''):'';
}
function saveSet(data){
 const exercise=String(data&&data.exercise||'').trim(),focus=String(data&&data.focus||'').trim();
 const weight=Number(data&&data.weight),reps=Number(data&&data.reps),req=String(data&&data.clientRequestId||'');
 if(!exercise||!focus||!dpValid_(weight,reps)||!req||req.length>100)throw Error('Invalid exercise, set, or request identifier.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try {
  const wb=dpBook_(),sheet=wb.getSheetByName('WORKOUT LOG'),records=dpRows_(sheet),today=dpToday_();
  const found=records.findIndex(r=>String(r[11]||'')===req);
  if(found>=0)return{saved:true,record:dpWorkout_(records[found],found)};
  const number=records.filter(r=>dpDate_(r[0])===today&&String(r[3])===exercise).reduce((m,r)=>Math.max(m,Number(r[4])||0),0)+1;
  const notes=dpNotes_(wb,exercise),mult=dpMultiplier_(exercise,notes),id=Utilities.getUuid(),row=sheet.getLastRow()+1;
  sheet.getRange(row,1,1,12).setValues([[today,today+'-'+focus.replace(/[^a-z0-9]/gi,''),focus,exercise,number,weight,reps,'','',notes,id,req]]);
  sheet.getRange(row,8,1,2).setFormulas([[dpVolumeFormula_(row,mult),dpOneRMFormula_(row)]]);
  SpreadsheetApp.flush();
  const saved=sheet.getRange(row,1,1,12).getValues()[0];
  return {saved:true,record:dpWorkout_(saved,row-2)};
 }finally{lock.releaseLock();}
}
function updateSet(data){
 const id=String(data&&data.id||''),weight=Number(data&&data.weight),reps=Number(data&&data.reps);
 if(!id||!dpValid_(weight,reps)||!data.expected)throw Error('Invalid correction.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const wb=dpBook_(),sheet=wb.getSheetByName('WORKOUT LOG'),records=dpRows_(sheet);
  const index=records.findIndex((r,i)=>String(r[10]||'legacy-'+(i+2))===id);
  if(index<0)throw Error('The set was not found. Refresh before editing.');
  const row=records[index];
  if(Number(row[5])!==Number(data.expected.weight)||Number(row[6])!==Number(data.expected.reps))throw Error('This set changed since you opened it. Refresh first.');
  const actual=index+2,notes=dpNotes_(wb,String(row[3]));
  sheet.getRange(actual,6,1,2).setValues([[weight,reps]]);
  sheet.getRange(actual,8,1,2).setFormulas([[dpVolumeFormula_(actual,dpMultiplier_(String(row[3]),notes)),dpOneRMFormula_(actual)]]);
  SpreadsheetApp.flush();
  return {saved:true,record:dpWorkout_(sheet.getRange(actual,1,1,12).getValues()[0],index)};
 }finally{lock.releaseLock();}
}
