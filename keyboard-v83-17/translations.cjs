const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.TEST_BASE||'http://127.0.0.1:8765/';fs.mkdirSync('qa8317',{recursive:true});
async function chart(p){await p.frameLocator('#v83ChartFrame').locator('.v83-ipa-key').first().waitFor();const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof window.esaSetLocale==='function');return f;}
async function snapshot(p,f){
 const ui=await p.evaluate(()=>['.app-header','#floatingEditor','.v83-label'].map(selector=>{const root=document.querySelector(selector);return{text:root.textContent.replace(/83\.(16|17)/g,'VERSION'),attrs:[root,...root.querySelectorAll('*')].map(el=>['title','aria-label','placeholder','alt'].map(a=>el.getAttribute(a)))};}));
 const text=await f.evaluate(()=>{const walker=document.createTreeWalker(document.getElementById('chart'),NodeFilter.SHOW_TEXT),values=[];while(walker.nextNode()){const n=walker.currentNode;if(!n.parentElement?.closest('.v83-ipa-key,svg,.source-note,details,a')&&n.nodeValue.trim())values.push(n.nodeValue);}return values;});
 return{ui,text};
}
(async()=>{for(const[name,type]of Object.entries({chromium,webkit})){
 const b=await type.launch({headless:true});
 for(const width of [390,1280]){
  const p=await b.newPage({viewport:{width,height:844},hasTouch:true}),old=await b.newPage({viewport:{width,height:844},hasTouch:true});
  const errors=[];p.on('pageerror',e=>errors.push(String(e)));let downloads=0;p.on('request',r=>{if(r.url().split('?')[0].endsWith('/translations.csv'))downloads++;});
  await p.goto(base+'keyboard-v83-17/');const f=await chart(p);await p.evaluate(()=>esaI18n.ready);await old.goto(base+'keyboard-v83-16/');const of=await chart(old);
  assert(await f.evaluate(()=>esaI18n===parent.esaI18n),'chart and panel share one catalog object');
  assert.equal(await p.evaluate(async()=>{await esaI18n.ready;return new Set(['ui','chart','panel'].flatMap(s=>esaI18n.rows(s).map(r=>r.ja))).size;}),183);
  for(const locale of ['ja','en','pt-BR','fa','ja-osaka','en','ja']){
   await old.locator('#languageSelect').selectOption(locale);await p.locator('#languageSelect').selectOption(locale);
   await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await old.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.deepEqual(await snapshot(p,f),await snapshot(old,of),'all translated UI/attributes/chart labels match approved v83.16: '+name+'/'+width+'/'+locale);
  }
  assert.equal(downloads,1,'one CSV download per app load, including all language switches');assert.deepEqual(errors,[]);
  await p.locator('#languageSelect').selectOption('fa');await p.screenshot({path:`qa8317/${name}-${width}-shared-persian.png`});
  await p.close();await old.close();console.log(`PASS TRANSLATIONS ${name} ${width}: 183 shared entries, all 5 languages match v83.16, UI and chart share a single CSV fetch`);
 }
 // Changing only the CSV must update both surfaces, including escaped commas, quotes and line breaks.
 const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 const csv=fs.readFileSync('keyboard-v83-17/translations.csv','utf8');let release;const gate=new Promise(r=>release=r);
 await p.route('**/translations.csv',async route=>{await gate;await route.fulfill({contentType:'text/csv; charset=utf-8',body:csv.replace('"Glow strength"','"CSV, ""quoted""\nGlow"').replace('"VOWELS"','"CSV VOWELS"')});});
 await p.goto(base+'keyboard-v83-17/',{waitUntil:'domcontentloaded'});await p.locator('#languageSelect').selectOption('en');release();const f=await chart(p);await p.evaluate(()=>esaI18n.ready);
 await p.waitForFunction(()=>document.querySelector('.glow-setting-row .setting-label').textContent==='CSV, "quoted"\nGlow');
 assert((await f.locator('#vowels h2').textContent()).includes('CSV VOWELS'));assert.deepEqual(errors,[]);await p.close();
 const missing=await b.newPage({viewport:{width:390,height:844},hasTouch:true});const missingErrors=[];missing.on('pageerror',e=>missingErrors.push(String(e)));
 await missing.route('**/translations.csv',r=>r.abort());await missing.goto(base+'keyboard-v83-17/');const mf=await chart(missing);assert(await missing.evaluate(()=>esaI18n.failed));assert(await missing.locator('#languageSelect').isDisabled());
 await mf.locator('.v83-ipa-key').first().click();assert.equal(await missing.locator('#out').inputValue(),'p','missing translation file does not stop IPA input');assert.deepEqual(missingErrors,[]);await missing.close();
 const direct=await b.newPage();await direct.goto(base+'keyboard-v83-17/chart.html');await direct.waitForFunction(()=>typeof esaSetLocale==='function');await direct.evaluate(()=>esaSetLocale('en'));assert((await direct.locator('#vowels h2').textContent()).includes('VOWELS'));await direct.close();
 console.log(`PASS CATALOG ${name}: CSV edits update both surfaces, slow-load language selection, escaped CSV fields, Japanese fallback on download failure, standalone chart`);await b.close();
}})().catch(e=>{console.error(e);process.exit(1)});
