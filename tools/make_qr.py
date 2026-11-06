"""Create a clockwork QR poster from the verified public game URL."""
from pathlib import Path
import argparse, math, html
import qrcode
from PIL import Image, ImageDraw, ImageFont
import cv2

parser=argparse.ArgumentParser()
parser.add_argument('url')
parser.add_argument('--output',default='artifacts/clockwork-qr')
args=parser.parse_args()
if not args.url.startswith('https://'): raise SystemExit('Use the verified HTTPS game URL.')
out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,border=4,box_size=16)
qr.add_data(args.url);qr.make(fit=True);matrix=qr.get_matrix();n=len(matrix);module=16;size=n*module
paper='#fcf3dc';ink='#123a3d';navy='#0c1824';gold='#caa35d';pale='#eed29a'
qr_image=Image.new('RGB',(size,size),paper);d=ImageDraw.Draw(qr_image)
def finder(x,y):
    for xx,yy in [(4,4),(n-11,4),(4,n-11)]:
        if xx<=x<xx+7 and yy<=y<yy+7:return True
    return False
svg_modules=[]
for y,row in enumerate(matrix):
    for x,bit in enumerate(row):
        if bit:
            radius=0 if finder(x,y) else 3
            d.rounded_rectangle((x*module,y*module,(x+1)*module-1,(y+1)*module-1),radius=radius,fill=ink)
            svg_modules.append(f'<rect x="{x*module}" y="{y*module}" width="{module}" height="{module}" rx="{radius}"/>')
width=max(1200,size+240);height=max(width+100,size+490);x=(width-size)//2;y=230
poster=Image.new('RGB',(width,height),navy);draw=ImageDraw.Draw(poster)
def font(size,serif=False):
    paths=['C:/Windows/Fonts/msyh.ttc','C:/Windows/Fonts/simhei.ttf'] if not serif else ['C:/Windows/Fonts/georgia.ttf']
    for p in paths:
        if Path(p).exists():return ImageFont.truetype(p,size)
    return ImageFont.load_default()
draw.rounded_rectangle((28,28,width-29,height-29),radius=45,outline=gold,width=3)
draw.rounded_rectangle((41,41,width-42,height-42),radius=34,outline='#6d5939',width=1)
draw.text((width/2,100),'午夜落星',font=font(58),anchor='mm',fill=pale)
draw.text((width/2,162),'CLOCKWORK OBSERVATORY',font=font(23,True),anchor='mm',fill=gold)
draw.rounded_rectangle((x-18,y-18,x+size+18,y+size+18),radius=24,fill=paper,outline=gold,width=5)
poster.paste(qr_image,(x,y))
def gear(cx,cy,r):
    points=[]
    for i in range(64):
        a=i*math.tau/64;rr=r if i%4<2 else r*.86;points.append((cx+math.cos(a)*rr,cy+math.sin(a)*rr))
    draw.polygon(points,fill=gold);draw.ellipse((cx-r*.65,cy-r*.65,cx+r*.65,cy+r*.65),fill=navy,outline=gold,width=2)
    for i in range(8):
        a=i*math.tau/8;draw.line((cx+math.cos(a)*r*.22,cy+math.sin(a)*r*.22,cx+math.cos(a)*r*.61,cy+math.sin(a)*r*.61),fill=gold,width=3)
    draw.ellipse((cx-r*.18,cy-r*.18,cx+r*.18,cy+r*.18),fill=pale)
for cx,cy in [(65,65),(width-65,65),(65,height-65),(width-65,height-65)]:gear(cx,cy,23)
draw.text((width/2,y+size+75),'扫码进入钟楼',font=font(35),anchor='mm',fill=pale)
draw.text((width/2,y+size+132),'旋转机关 · 接住每一次下落',font=font(23),anchor='mm',fill=gold)
draw.text((width/2,height-80),args.url,font=font(min(20,max(13,int(width/(len(args.url)*.65))))),anchor='mm',fill='#9cb7af')
png=out.with_suffix('.png');poster.save(png)
decoded,_,_=cv2.QRCodeDetector().detectAndDecode(cv2.imread(str(png)))
if decoded!=args.url:raise SystemExit('QR decode check failed; do not deliver this image.')
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"><rect width="100%" height="100%" fill="{navy}"/><rect x="28" y="28" width="{width-56}" height="{height-56}" rx="45" fill="none" stroke="{gold}" stroke-width="3"/><g text-anchor="middle" fill="{pale}" font-family="Microsoft YaHei,sans-serif"><text x="{width/2}" y="120" font-size="58">午夜落星</text><text x="{width/2}" y="170" font-family="Georgia,serif" font-size="23" fill="{gold}">CLOCKWORK OBSERVATORY</text></g><rect x="{x-18}" y="{y-18}" width="{size+36}" height="{size+36}" rx="24" fill="{paper}" stroke="{gold}" stroke-width="5"/><g transform="translate({x},{y})"><rect width="{size}" height="{size}" fill="{paper}"/><g fill="{ink}">{''.join(svg_modules)}</g></g><g text-anchor="middle" font-family="Microsoft YaHei,sans-serif"><text x="{width/2}" y="{y+size+88}" font-size="35" fill="{pale}">扫码进入钟楼</text><text x="{width/2}" y="{y+size+142}" font-size="23" fill="{gold}">旋转机关 · 接住每一次下落</text><text x="{width/2}" y="{height-76}" font-size="18" fill="#9cb7af">{html.escape(args.url)}</text></g></svg>'''
out.with_suffix('.svg').write_text(svg,encoding='utf-8')
print({'png':str(png.resolve()),'svg':str(out.with_suffix('.svg').resolve()),'decoded_url':decoded,'verified':True})
