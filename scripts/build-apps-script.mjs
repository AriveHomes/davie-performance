import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const script=fs.readFileSync(path.join(root,"app.js"),"utf8");
const backend=fs.readFileSync(path.join(root,"apps-script","Code.gs"),"utf8");
const bridge=`<script>
"use strict";
// On Google Apps Script, run server functions as the signed-in user.
// Errors reject the Promise; green save checks happen only after a fresh read.
window.DAVIE_API = Object.fromEntries(["getAppData","saveSet","updateSet"].map(name=>[
  name, payload=>new Promise((resolve,reject)=>{
    const runner=google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(error=>reject(new Error(error?.message||String(error))));
    if(name==="getAppData")runner.getAppData();
    else if(name==="saveSet")runner.saveSet(payload);
    else runner.updateSet(payload);
  })
]));
</script>`;
const embeddedScript="<script>"+script.replaceAll("</script","<\\/script")+"</script>";
const marker='<script src="app.js"></script>';
if(!html.includes(marker))throw new Error("Expected app.js entrypoint missing");
const output=html.replace(marker,bridge+embeddedScript);
fs.mkdirSync(path.join(root,"dist"),{recursive:true});
fs.writeFileSync(path.join(root,"dist","Index.html"),output);
fs.writeFileSync(path.join(root,"dist","Code.gs"),backend);
fs.writeFileSync(path.join(root,"dist","appsscript.json"),JSON.stringify({
  timeZone:"America/Denver",
  exceptionLogging:"STACKDRIVER",
  runtimeVersion:"V8",
  webapp:{access:"MYSELF",executeAs:"USER_DEPLOYING"}
},null,2)+"\n");
for(const phrase of ["window.DAVIE_API","getAppData","updateSet","comparisonRows","allTodaySets"]){
 if(!output.includes(phrase))throw new Error("Missing built feature: "+phrase);
}
console.log("Build successful: Apps Script Index.html + Code.gs + manifest");
