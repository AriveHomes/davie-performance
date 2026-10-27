/** DAVIE CHRISTMAS VAULT - Google Sheets-backed web app.
 * Deploy: Execute as User accessing the web app; Access: Anyone with Google account.
 * IMPORTANT: Share Sheet with Brendan and Emily only. Google permissions +
 * the server-side family password protect every gift data operation.
 */
const VAULT_SHEET_ID = '1BJTWDLNYiZ269zHXdr0x6zdMDnej5IG46_rz65p1vBw';
const VAULT_TAB = 'Gifts';
const KIDS = ['Marley','Macyn','McCall','Emery','Grayson'];
const STATUSES = ['Idea','Ordered','Purchased','Hidden','Wrapped','Under Tree','Given'];
const COLUMNS = 13;

/**
 * ONE-TIME SETUP (DO NOT paste your password into this code):
 * Apps Script > Project Settings > Script properties > Add script property
 * Name: DAVIE_VAULT_PASSWORD
 * Value: a private family passphrase of at least 10 characters.
 * Only project editors can see the property. Never commit it to GitHub.
 */
const VAULT_PASSWORD_PROPERTY = 'DAVIE_VAULT_PASSWORD'; // Set in Script Properties, never in HTML or GitHub.

/** Require a password on EVERY data operation, not just on the login screen. */
function requireVaultPassword_(provided) {
  const configured = PropertiesService.getScriptProperties().getProperty(VAULT_PASSWORD_PROPERTY);
  if (!configured || configured.length < 10) {
    throw new Error('Setup required: add DAVIE_VAULT_PASSWORD (at least 10 characters) in Apps Script Project Settings > Script properties.');
  }
  const cache = CacheService.getUserCache();
  const attempts = Number(cache.get('davie_vault_wrong_passwords') || 0);
  if (attempts >= 8) {
    throw new Error('Too many incorrect passwords. Please try again in three minutes.');
  }
  const candidate = typeof provided === 'string' && provided.length <= 250 ? provided : '';
  // Compare digests to avoid simple length/prefix timing differences.
  const expected = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, configured, Utilities.Charset.UTF_8);
  const supplied = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, candidate, Utilities.Charset.UTF_8);
  let delta = 0;
  for (let i = 0; i < expected.length; i++) delta |= (expected[i] ^ supplied[i]);
  if (delta !== 0) {
    cache.put('davie_vault_wrong_passwords', String(attempts + 1), 180);
    throw new Error('Incorrect family password. Please try again.');
  }
  cache.remove('davie_vault_wrong_passwords');
}

/** Authenticated entry point for a new visit. */
function unlockVault(password) {
  requireVaultPassword_(password);
  return vaultSnapshot_();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Davie Christmas Vault | Brendan & Emily')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function sheet_() {
  const s=SpreadsheetApp.openById(VAULT_SHEET_ID).getSheetByName(VAULT_TAB);
  if(!s)throw Error('Gifts tab is missing. Check the shared Google Sheet.');
  return s;
}
function rowToGift_(row){return {id:String(row[0]||''),child:String(row[1]||''),name:String(row[2]||''),status:String(row[3]||''),room:String(row[4]||''),location:String(row[5]||''),price:Number(row[6]||0),buyer:String(row[7]||''),notes:String(row[8]||''),updatedAt:String(row[9]||''),updatedBy:String(row[10]||''),version:Number(row[11]||0)};}
function readAll_(){const s=sheet_(),n=s.getLastRow();if(n<2)return [];return s.getRange(2,1,n-1,COLUMNS).getValues().filter(r=>r[0]&&String(r[12]).toUpperCase()!=='TRUE').map(rowToGift_);}
function vaultSnapshot_(){return {gifts:readAll_(),updatedAt:new Date().toISOString(),identity:Session.getActiveUser().getEmail()||'Google account',kids:KIDS,statuses:STATUSES};}
function getVault(password){requireVaultPassword_(password);return vaultSnapshot_();}
function clean_(val,max){return String(val==null?'':val).trim().slice(0,max).replace(/^[=+@\-]\s*(?=\S)/,'\u2019$&');}
function validated_(g){if(!g||typeof g!=='object')throw Error('Invalid gift');const o={id:clean_(g.id,60),child:clean_(g.child,30),name:clean_(g.name,140),status:clean_(g.status,30),room:clean_(g.room,120),location:clean_(g.location,260),price:Number(g.price)||0,buyer:clean_(g.buyer,25),notes:clean_(g.notes,700),version:Number(g.version)||0};
 if(!o.name)throw Error('Please name the gift.');if(!KIDS.includes(o.child))throw Error('Choose a child.');if(!STATUSES.includes(o.status))throw Error('Choose a valid status.');if(o.price<0||o.price>999999)throw Error('Price must be between 0 and 999,999.');if(!['Brendan','Emily','Both'].includes(o.buyer))throw Error('Choose a purchaser.');if(o.status==='Hidden'&&!o.room&&!o.location)throw Error('Please record where this gift is hidden.');return o;}
function saveGift(input,password){requireVaultPassword_(password);const g=validated_(input),lock=LockService.getScriptLock();lock.waitLock(25000);try{const s=sheet_(),all=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,COLUMNS).getValues():[];const idx=g.id?all.findIndex(r=>String(r[0])===g.id):-1;let id=g.id,version=1;
 if(idx>=0){if(String(all[idx][12]).toUpperCase()==='TRUE')throw Error('This gift was deleted. Refresh before editing.');const current=Number(all[idx][11]||0);if(current!==g.version)throw Error('This gift was changed on another phone. Refresh and try again.');version=current+1;}
 else if(id){throw Error('Gift no longer exists. Refresh before editing.');}else{id=Utilities.getUuid();}
 const row=[id,g.child,g.name,g.status,g.room,g.location,g.price,g.buyer,g.notes,new Date().toISOString(),Session.getActiveUser().getEmail()||'Google account',version,false];
 if(idx>=0)s.getRange(idx+2,1,1,COLUMNS).setValues([row]);else s.appendRow(row);
 SpreadsheetApp.flush();return {gift:rowToGift_(row),gifts:readAll_(),saved:true};
}finally{lock.releaseLock();}}
function removeGift(id,version,password){requireVaultPassword_(password);id=String(id||'');const lock=LockService.getScriptLock();lock.waitLock(25000);try{const s=sheet_(),all=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,COLUMNS).getValues():[],idx=all.findIndex(r=>String(r[0])===id);if(idx<0)throw Error('Gift not found. Refresh.');if(Number(all[idx][11]||0)!==Number(version))throw Error('Gift changed on another phone. Refresh first.');s.getRange(idx+2,10,1,4).setValues([[new Date().toISOString(),Session.getActiveUser().getEmail()||'Google account',Number(version)+1,true]]);SpreadsheetApp.flush();return {deleted:true,gifts:readAll_()};}finally{lock.releaseLock();}}
