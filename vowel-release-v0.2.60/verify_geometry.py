import sys,json,re,math,os
from pathlib import Path

from shapely.geometry import Polygon,LineString,Point
from shapely.ops import unary_union
pat=r'M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)'
def lines(d):return [LineString([(a,b),(c,e)]) for a,b,c,e in [list(map(float,m.groups())) for m in re.finditer(pat,d)]]
summary=[]
for f in sorted(Path(os.environ.get('ARTIFACT_DIR','audit-output/v060')).glob('*-v60-w*-s*.json')):
 r=json.loads(f.read_text());a=r['audit'];assert not r['errors'];assert len(a['glyphs'])==28 and len(a['rules'])==7 and len(r['dots'])==11;assert r['loaded'];assert r['version']=='0.2.60';assert a['baseline']=='alphabetic'
 polys=[Polygon(g['polygon']) for g in a['glyphs']];assert all(p.is_valid and p.area>0 for p in polys)
 worst=0;intersections=0;total=0
 for rule in a['rules']:
  visible=unary_union(lines(rule['visible']));source=unary_union(lines(rule['source']));assert visible.difference(source.buffer(.0001)).length<.001
  for p in polys:
   assert visible.intersection(p).length<.0001,(f,rule['id'],'line inside glyph')
   intersections+=1
  expected=[]
  for seg in lines(rule['source']):
   (x,y),(xx,yy)=seg.coords;dx=xx-x;dy=yy-y;length=seg.length
   protect=[]
   for p in polys:
    # Signed line-to-outline span: only a letter crossing this infinite
    # rule may cause a cut. Nearby unrelated letters must not split a rule.
    sides=[(dx*(py-y)-dy*(px-x))/length for px,py in p.exterior.coords]
    if min(sides)<=1e-9 and max(sides)>=-1e-9:protect.append(p.buffer(a['clearance']+rule['stroke']/2,quad_segs=256))
   expected.append(seg.difference(unary_union(protect)))
  exp=unary_union(expected)
  err=visible.hausdorff_distance(exp);worst=max(worst,err);assert err<.003,(f,rule['id'],err)
  # Compare lengths as well: Hausdorff alone could miss a tiny internal hole.
  assert abs(exp.length-visible.length)<.012,(f,rule['id'],'length mismatch')
  total+=visible.length
 axis=next(x for x in a['rules'] if x['id']=='98');assert abs(sum(x.length for x in lines(axis['visible']))-233.696)<.0001
 if r['size']==32:
  front=next(x for x in a['rules'] if x['id']=='front');assert len(lines(front['visible']))==1
 old=json.loads(f.with_name(f.name.replace('-v60-','-v57-')).read_text());assert old['dots']==r['dots']
 for g,h in zip(old['glyphs'],r['glyphs']):
  assert g['char']==h['char'];assert max(abs(g['box'][k]-h['box'][k]) for k in g['box'])<.002
 from PIL import Image,ImageChops
 assert ImageChops.difference(Image.open(f.with_suffix('').as_posix()+'-ink.png'),Image.open(f.with_name(f.name.replace('-v60-','-v57-')).with_suffix('').as_posix()+'-ink.png')).getbbox() is None
 summary.append({'engine':r['engine'],'width':r['width'],'size':r['size'],'glyph_rule_pairs':intersections,'geometric_pass':True,'ink_placement_pixel_identical':True,'max_independent_endpoint_error':worst,'axis_length':233.696,'visible_rule_length':total})
print(json.dumps(summary,indent=2));assert len(summary)==8
(Path(os.environ.get('ARTIFACT_DIR','audit-output/v060'))/'geometry-results.json').write_text(json.dumps(summary,indent=2))
