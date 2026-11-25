#!/usr/bin/env python3
"""Hitung kontras WCAG 2.1 untuk design/shadcn/app/globals.css (light & dark).

Pemakaian:  python3 design/scripts/contrast.py            # ringkasan + kegagalan
            python3 design/scripts/contrast.py --markdown # tabel lengkap (untuk design-system.md)
Konversi oklch → sRGB memakai matriks OKLab resmi (Björn Ottosson); warna di luar gamut di-clip.
Warna ber-alpha di-composite di atas latar sebelum dihitung.
"""
import math,re,sys
def oklch_to_srgb(L,C,H):
    h=math.radians(H); a=C*math.cos(h); b=C*math.sin(h)
    l_=L+0.3963377774*a+0.2158037573*b
    m_=L-0.1055613458*a-0.0638541728*b
    s_=L-0.0894841775*a-1.2914855480*b
    l,m,s=l_**3,m_**3,s_**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return [min(1,max(0,x)) for x in (r,g,bb)]  # linear
def lin2s(x): return 12.92*x if x<=0.0031308 else 1.055*x**(1/2.4)-0.055
def s2lin(x): return x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4
def parse(v):
    m=re.match(r'oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: / ([\d.]+)%)?\)',v.strip())
    L,C,H=float(m[1]),float(m[2]),float(m[3]); A=float(m[4])/100 if m[4] else 1
    return [lin2s(x) for x in oklch_to_srgb(L,C,H)],A
def over(fg,bg):  # srgb composite
    (c,a),(d,_)=fg,bg
    return ([a*x+(1-a)*y for x,y in zip(c,d)],1)
def lum(c): r,g,b=[s2lin(x) for x in c[0]]; return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    la,lb=lum(a),lum(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)
def hexs(c): return '#'+''.join('%02x'%round(x*255) for x in c[0])
css=open(__import__('pathlib').Path(__file__).resolve().parent.parent/'shadcn'/'app'/'globals.css').read()
css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
def block(sel):
    m=re.search(re.escape(sel)+r'\s*\{(.*?)\n\}',css,re.S); return dict(re.findall(r'--([\w-]+):\s*([^;]+);',m[1]))
root=block(':root {'.replace(' {',''));dark=block('.dark');mapping=block(':root, .dark')
def mode(base):
    d=dict(base);d.update(mapping)
    def get(k):
        v=d[k]
        while v.startswith('var('): v=d[v[6:-1]]
        return parse(v)
    return get
pairs_text=[('foreground','background'),('card-foreground','card'),('popover-foreground','popover'),('primary-foreground','primary'),
 ('secondary-foreground','secondary'),('muted-foreground','muted'),('muted-foreground','background'),('muted-foreground','card'),
 ('accent-foreground','accent'),('sidebar-foreground','sidebar'),('sidebar-primary-foreground','sidebar-primary'),
 ('sidebar-accent-foreground','sidebar-accent'),('muted-foreground','sidebar'),('primary','background'),('primary','card'),('destructive','background'),('destructive','card')]
out=[];fail=0
for name,base in [('Light',root),('Dark',dark)]:
    g=mode(base); bg=g('background'); card=g('card')
    rows=[]
    def add(kind,a,b,ca,cb,thr):
        global fail
        r=cr(ca,cb); ok=r>=thr; fail+= not ok
        rows.append(f'| {kind} | `{a}` | `{b}` | {r:.2f}:1 | {thr}:1 | {"Lulus" if ok else "GAGAL"} |')
    for a,b in pairs_text: add('Teks',a,b,g(a),g(b),4.5)
    # destructive button: text-destructive on destructive/10 (light) /20 (dark) over background
    al=0.1 if name=='Light' else 0.2
    dc,_=g('destructive'); comp=over((dc,al),bg)
    add('Teks',f'destructive',f'destructive/{int(al*100)} di atas background',g('destructive'),comp,4.5)
    # hover primary/80 over background with primary-foreground
    comp=over((g('primary')[0],0.8),bg); add('Teks (hover)','primary-foreground','primary/80 di atas background',g('primary-foreground'),comp,4.5)
    if name=='Dark':
        comp=over((g('input')[0],g('input')[1]*0.3),bg); add('Teks','foreground','input/30 (tombol outline dark)',g('foreground'),comp,4.5)
    # UI components
    for a in ['input','ring']:
        c=g(a); c=over(c,bg) if c[1]<1 else c
        add('Non-teks',a,'background',c,bg,3); add('Non-teks',a,'card',over(g(a),card) if g(a)[1]<1 else g(a),card,3)
    for i in range(1,6): add('Non-teks (grafik)',f'chart-{i}','background',g(f'chart-{i}'),bg,3)
    for grp,keys in [('task',['backlog','assigned','in-progress','founder-approval','blocked','done','cancelled']),
                     ('exec',['queued','preparing','running','waiting','completed','failed','cancelled','suspended']),
                     ('agent-status',['idle','running','blocked'])]:
        for k in keys:
            t=f'{grp}-{k}'
            add('Teks',f'{t}-foreground',f'{t}-subtle',g(f'{t}-foreground'),g(f'{t}-subtle'),4.5)
            add('Teks',f'{t}-foreground','card',g(f'{t}-foreground'),card,4.5)
            add('Teks',f'{t}-foreground','muted',g(f'{t}-foreground'),g('muted'),4.5)
            add('Non-teks',t,'card',g(t),card,3)
            add('Non-teks',t,'background',g(t),bg,3)
    for who in ['human','agent']:
        add('Teks',f'{who}-foreground',who,g(f'{who}-foreground'),g(who),4.5)
    add('Non-teks','agent (bentuk avatar)','background',g('agent'),bg,3)
    add('Non-teks','agent (bentuk avatar)','card',g('agent'),card,3)
    out.append(f'\n#### {name}\n\n| Jenis | Depan | Latar | Rasio | Minimum | Hasil |\n|---|---|---|---|---|---|\n'+'\n'.join(rows))
md='\n'.join(out)
if '--markdown' in sys.argv: print(md); sys.exit(0)
print(f'{md.count("Lulus")} lulus, {fail} gagal')
for l in md.splitlines():
    if 'GAGAL' in l: print(l)
sys.exit(1 if fail else 0)
