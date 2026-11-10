const {chromium}=require('playwright'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const version of [55,56])for(const size of [32,48]){
  const page=await browser.newPage({viewport:{width:390,height:900}});
  await page.goto('file://'+path.resolve('vowel-release-v0.2.'+version+'/index.html'),{waitUntil:'load'});
  const d=await page.evaluate(async size=>{
   const field=document.getElementById('vowelFontSize');field.value=String(size);field.dispatchEvent(new Event('input',{bubbles:true}));
   if(document.fonts)await document.fonts.ready;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const svg=document.querySelector('#vowelQuadrilateral svg');
   const rects=[...svg.querySelectorAll('#vowelCutouts rect')].map((el,i)=>({char:[...svg.querySelectorAll('.vowel-dynamic-glyph')][i].textContent,l:+el.getAttribute('x'),r:+el.getAttribute('x')+(+el.getAttribute('width')),t:+el.getAttribute('y'),b:+el.getAttribute('y')+(+el.getAttribute('height'))}));
   function between(p0,p1,b){
    const dx=p1[0]-p0[0],dy=p1[1]-p0[1];let lo=0,hi=1;
    for(const [p,q] of [[-dx,p0[0]-b.l],[dx,b.r-p0[0]],[-dy,p0[1]-b.t],[dy,b.b-p0[1]]]){
     if(Math.abs(p)<1e-12){if(q<0)return null;continue;}
     const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
     if(lo>=hi)return null;
    }
    return [lo,hi];
   }
   const f=n=>Math.round(n*1000)/1000;
   const output=[];
   for(const rule of svg.querySelectorAll('path.official-vowel-rule')){
    const name=rule.dataset.officialDrawing||'front';
    const masked=!!rule.closest('g[mask]');
    const nums=[...rule.getAttribute('d').matchAll(/[ML]\s*([-\d.]+)\s+([-\d.]+)/g)].map(m=>[+m[1],+m[2]]);
    if(nums.length%2)throw Error('bad path');
    const gaps=[];
    if(masked){
     for(let i=0;i<nums.length;i+=2){
      const p0=nums[i],p1=nums[i+1];const dx=p1[0]-p0[0],dy=p1[1]-p0[1];
      const collisions=rects.map(b=>({char:b.char,t:between(p0,p1,b)})).filter(x=>x.t);
      const cuts=collisions.flatMap(c=>[{a:c.t[0],b:c.t[1],char:c.char}]).sort((a,b)=>a.a-b.a);
      const union=[];for(const c of cuts){const prev=union.at(-1);if(prev&&c.a<=prev.b+1e-7){prev.b=Math.max(prev.b,c.b);prev.chars.push(c.char);}else union.push({a:c.a,b:c.b,chars:[c.char]});}
      for(const u of union)gaps.push({from:[f(p0[0]+dx*u.a),f(p0[1]+dy*u.a)],to:[f(p0[0]+dx*u.b),f(p0[1]+dy*u.b)],chars:[...new Set(u.chars)],length:f((u.b-u.a)*Math.hypot(dx,dy))});
     }
    }
    output.push({line:name,masked,segmentCount:nums.length/2,maskGaps:gaps,geometry:rule.getAttribute('d')});
   }
   return output;
  },size);
  console.log('VISIBLE_GAPS '+JSON.stringify({version,size,lines:d}));
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
