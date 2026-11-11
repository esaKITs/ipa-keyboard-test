import json,sys,re,math,os
from pathlib import Path

from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
rows=json.loads(Path('vowel-release-v0.2.60/checklist-24.json').read_text());results=[]
for f in sorted(Path(os.environ.get('ARTIFACT_DIR','audit-output/v060')).glob('*-v60-w*-s*.json')):
 r=json.loads(f.read_text());audit=r['audit'];pair=[]
 for item in rows:
  rule=next(x for x in audit['rules'] if x['id']==item['rule']);coords=[list(map(float,m.groups())) for m in re.finditer(r'M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)',rule['visible'])];segments=[LineString([(x,y),(xx,yy)]) for x,y,xx,yy in coords];vis=unary_union(segments)
  if item['glyph']:
   poly=Polygon(next(x for x in audit['glyphs'] if x['char']==item['glyph'])['polygon']);distance=vis.distance(poly)-rule['stroke']/2;inside=vis.intersection(poly).length
   if item['classification'] in ['A','B']:
    ok=abs(distance-audit['clearance'])<.003;measurement={'measured_gap_svg':distance,'target_gap_svg':audit['clearance'],'difference':distance-audit['clearance']}
   else:ok=inside<.00001;measurement={'remaining_rule_length_in_protected_envelope':inside}
  else:
   # A cut is justified only by an actual intersection of the infinite rule
   # and a letter envelope. At 32 the entire front diagonal is continuous;
   # enlarged glyphs can require cuts at 48, never an unrelated middle hole.
   if r['size']==32:ok=len(segments)==1;measurement={'visible_subpaths':len(segments)}
   else:
    ok=True
    for seg in rule['segments']:
     (x,y),(xx,yy)=seg['base'];dx=xx-x;dy=yy-y
     for cut in seg['cuts']:
      poly=next(g['polygon'] for g in audit['glyphs'] if g['char']==cut['char']);sides=[dx*(py-y)-dy*(px-x) for px,py in poly];ok&=min(sides)<=0<=max(sides)
    measurement={'necessary_enlarged_glyph_cuts':[c['char'] for s in rule['segments'] for c in s['cuts']]}
  assert ok,(f,item,measurement)
  pair.append({**item,'calculation_pass':bool(ok),**measurement})
 results.append({'engine':r['engine'],'width':r['width'],'size':r['size'],'items':pair})
(Path(os.environ.get('ARTIFACT_DIR','audit-output/v060'))/'results-24.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('24 x',len(results),'=',sum(len(x['items']) for x in results),'CHECKS PASS')
