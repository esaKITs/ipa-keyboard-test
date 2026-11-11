const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path');
const engine=process.argv[2]||'chromium';
const outDir=process.env.ARTIFACT_DIR||'audit-output/v060';fs.mkdirSync(outDir,{recursive:true});
(async()=>{
let b;
for(const version of ['57','60'])for(const width of [390,1280])for(const size of [32,48]){
b=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true,...(process.env.WEBKIT_EXECUTABLE_PATH?{executablePath:process.env.WEBKIT_EXECUTABLE_PATH}:{})}:{headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']}:{})});
 const page=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve('vowel-release-v0.2.'+version+'/index.html'));
 await page.evaluate(()=>document.fonts.ready);await page.evaluate(s=>{const e=document.getElementById('vowelFontSize');e.value=s;e.dispatchEvent(new Event('input',{bubbles:true}))},size);
 await page.waitForFunction(s=>+(document.querySelector('#vowelFontValue').textContent)===s,size);await page.waitForTimeout(180);
 const name=`${engine}-v${version}-w${width}-s${size}`,out=outDir+'/'+name;
 await page.locator('#vowelQuadrilateral svg').screenshot({path:out+'.png'});
 const data=await page.evaluate(()=>{
 const svg=document.querySelector('#vowelQuadrilateral svg');
 return {audit:window.__ipaLineAudit||null,legacyAudit:window.__ipaGlyphClipAudit||null,
 glyphs:[...svg.querySelectorAll('.vowel-dynamic-glyph')].map(e=>{const b=e.getBBox();return {char:e.textContent,baseline:getComputedStyle(e).dominantBaseline,x:+e.getAttribute('x'),y:+e.getAttribute('y'),dy:+e.getAttribute('dy'),box:{x:b.x,y:b.y,width:b.width,height:b.height}}}),
 dots:[...svg.querySelectorAll('.vowel-dots circle')].map(e=>e.outerHTML),labels:[...svg.querySelectorAll('.vowel-measured-label')].map(e=>e.outerHTML),
 rules:[...svg.querySelectorAll('.official-vowel-rule')].map(e=>e.getAttribute('d')),loaded:document.fonts.check('32px "Doulos SIL Local"'),version:document.getElementById('appVersion').textContent};
 });
 // Separate ink layer is a browser screenshot, for image-level placement regression.
 await page.addStyleTag({content:'.official-vowel-rule{visibility:hidden!important}'});await page.locator('#vowelQuadrilateral svg').screenshot({path:out+'-ink.png'});
 fs.writeFileSync(out+'.json',JSON.stringify({engine,width,size,version,errors,...data},null,2));
 console.log(name,'errors:',JSON.stringify(errors),'audit:',!!data.audit);await b.close();
}
})().catch(e=>{console.error(e);process.exitCode=1});
