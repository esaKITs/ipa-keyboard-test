import json,re,math
from pathlib import Path
from shapely.geometry import Polygon,LineString
data=json.loads(Path('audit-output/v058/geometry.json').read_text())
assert len(data)==12
pattern=r'M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)'
for record in data:
 glyphs=record['audit']['glyphs'];rules=record['audit']['rules']
 assert len(glyphs)==28 and len(rules)==7
 hulls=[Polygon(g['polygon']) for g in glyphs]
 assert all(p.is_valid and p.area>0 for p in hulls)
 shortest=1e9
 for rule in rules:
  existing=list(re.finditer(pattern,rule['visible']))
  assert existing,rule['id']
  for x in existing:
   x0,y0,x1,y1=map(float,x.groups())
   ln=LineString([(x0,y0),(x1,y1)])
   for glyph,poly in zip(glyphs,hulls):
    dist=ln.distance(poly)
    shortest=min(shortest,dist)
    assert dist>=record['audit']['clearance']-.04,('insufficient clearance',record['engine'],record['size'],rule['id'],glyph['char'],dist)
 for rule in rules:
  source_segments=list(re.finditer(pattern,rule['source']))
  output_segments=list(re.finditer(pattern,rule['visible']))
  assert len(output_segments)>=len(source_segments)
  for m in output_segments:
   p=list(map(float,m.groups()))
   line=LineString([(p[0],p[1]),(p[2],p[3])])
   assert any(LineString([(float(x.group(1)),float(x.group(2))),(float(x.group(3)),float(x.group(4)))]).distance(line)<.006 for x in source_segments)
 right=next(x for x in rules if x['id']=='98')
 length=sum(math.hypot(float(m.group(3))-float(m.group(1)),float(m.group(4))-float(m.group(2))) for m in re.finditer(pattern,right['visible']))
 assert length>190,('vertical truncation',record['engine'],record['size'],length)
 print('V058_SHAPE_PASS',json.dumps({'engine':record['engine'],'width':record['width'],'size':record['size'],'shortest_distance':round(shortest,3),'right_length':round(length,3),'glyphs':28,'rules':7}))
