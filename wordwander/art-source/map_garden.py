"""Botanical garden, modeled from the four garden environment paintings."""
import math
from mathutils import Vector
from map_model import Map, TAU, lantern, profile, sections, sky, worktable

LIMESTONE=(0xb1a18b,0xa49885,0xc9b8a3,0xb5a899,0x968d7d,0xbbaa93)
PAVING=(0xaaa093,0x999789,0xbbad95,0xa29888,0xa9a297,0xc8bca7)
GREEN=(0x668344,0x718944,0x456537,0x819654,0x567744,0x91a05a)
PINK=(0xc9698b,0xe98fa6,0xf4bfcc,0xef9db4)
WHITE=(0xe4e4c3,0xf3e6cb,0xe3d8b7)
BLUE=(0x767bbb,0x9d97d1,0x8fa4d2,0x646bb0)


def foliage(m,label,begin,end,width,tint,*,shadow=False,narrow=False):
    start,tip=Vector(begin),Vector(end)
    axis=tip-start
    cross=axis.normalized().cross(Vector((0,1,0))).normalized()
    if cross.length<.01:
        cross=Vector((1,0,0))
    center=start+axis*.52
    if narrow:
        rim=(start,center+cross*width,tip,center-cross*width)
    else:
        shoulder=start+axis*.26
        taper=start+axis*.80
        rim=(start,shoulder+cross*width*.71,center+cross*width,taper+cross*width*.61,
             tip,taper-cross*width*.55,center-cross*width*.92,shoulder-cross*width*.66)
    verts=[tuple(p) for p in (*rim,center+Vector((0,width*.32,0)))]
    count=len(rim)
    m.mesh('leaf',label,verts,[(i,count,(i+1)%count) for i in range(count)],tint,soft=True,shadow=shadow)


def flower(m,center,size,tints,*,petals=6,rise=.39):
    x,y,z=center
    turn=m.rand.uniform(0,TAU)
    for i in range(petals):
        a=turn+TAU*i/petals
        dx,dz=math.cos(a),math.sin(a)
        w=size*(.46 if petals<8 else .30)
        p=(x+dx*size*.58,y+size*rise*.69,z+dz*size*.58)
        verts=[
            center,(p[0]-dz*w,p[1],p[2]+dx*w),
            (x+dx*size*.95-dz*w*.62,y+size*rise,z+dz*size*.95+dx*w*.62),
            (x+dx*size*1.06,y+size*rise*.74,z+dz*size*1.06),
            (x+dx*size*.93+dz*w*.68,y+size*rise,z+dz*size*.93-dx*w*.68),
            (p[0]+dz*w,p[1],p[2]-dx*w),(p[0],p[1]+size*.20,p[2])
        ]
        m.mesh('petal','Sculpted petals',verts,[(j,(j+1)%6,6) for j in range(6)],
               m.rand.choice(tints),soft=True,shadow=False)
    m.rock('Flower centres',(x,y+size*.11,z),(size*.22,size*.14,size*.22),0xe5ad44,'petal',small=True,shadow=False)


def border(m,x,z,r=.46,base=.015,tints=PINK,count=10):
    for i in range(count):
        a=m.rand.uniform(0,TAU)
        d=m.rand.uniform(.16,1)*r
        x0,z0=x+math.cos(a)*d,z+math.sin(a)*d
        high=m.rand.uniform(.17,.52)
        width=m.rand.uniform(.055,.105)
        top=(x0+math.cos(a)*high*.24,base+high,z0+math.sin(a)*high*.24)
        m.pole('Flower stems',(x0,base,z0),top,.007,m.rand.choice(GREEN),'leaf',sides=5,shadow=False)
        for side in (-1,1):
            h=high*(.43+side*.10)
            foliage(m,'Garden leaves',(x0,base+h,z0),
                    (x0+math.cos(a+side)*width*side*2.1,base+h+.083,z0+math.sin(a+side)*width*side*2),width*.37,m.rand.choice(GREEN))
        flower(m,top,width,tints,petals=8 if tints==WHITE else 5,rise=.26 if tints==WHITE else .45)


def shrub(m,x,z,r,tints=()):
    for branch in range(7):
        a=branch*2.399
        d=r*m.rand.uniform(.26,.69)
        p=(x+math.cos(a)*d,r*m.rand.uniform(.64,1.26),z+math.sin(a)*d)
        m.rock('Leaf masses inside low shrubs',p,(r*.45,r*.39,r*.45),m.rand.choice(GREEN),'leaf',small=True,smooth=True)
        for leaf in range(12):
            side=a+leaf*2.399
            lift=m.rand.uniform(-.42,.89)*r
            end=(p[0]+math.cos(side)*r*.61,p[1]+lift,p[2]+math.sin(side)*r*.58)
            start=(p[0],p[1]+lift*.39,p[2])
            foliage(m,'Oval leaves on low shrubs',start,end,r*m.rand.uniform(.12,.22),m.rand.choice(GREEN),shadow=True)
        if tints:
            head=(p[0]+math.cos(a)*r*.21,p[1]+r*.46,p[2]+math.sin(a)*r*.21)
            for fl in range(5):
                angle=fl*TAU/5+a
                p0=(head[0]+r*.20*math.cos(angle),head[1]+r*.08*(fl%3),head[2]+r*.20*math.sin(angle))
                flower(m,p0,r*m.rand.uniform(.15,.22),tints,petals=4,rise=.48)


def tree(m,x,z,h,bloom=False,base=0):
    tint=m.rand.choice((0xa0866e,0x94836d,0xa89176))
    tilt=m.rand.uniform(-.19,.25)*h
    pts=[(x,base-.09,z),(x+tilt*.19,base+h*.34,z-.09),(x+tilt*.51,base+h*.66,z-.04),
         (x+tilt,base+h*.92,z+.12)]
    m.sweep('Forked timber and bark',pts,[h*.055,h*.041,h*.027,h*.009],tint,'wood',sides=10)
    if m.bounds[0]<x<m.bounds[1] and m.bounds[2]<z<m.bounds[3]:
        m.block(x,z,h*.108,h*.106)
    for branch in range(6):
        a=branch*2.399+m.rand.uniform(-.22,.22)
        spread=m.rand.uniform(.20,.36)*h
        arc=(x+tilt*.58+math.cos(a)*spread,base+h*m.rand.uniform(.70,1.0),z+math.sin(a)*spread)
        origin=pts[1+branch%2]
        bend=(arc[0]*.49+origin[0]*.51,(arc[1]+origin[1])*.50,arc[2]*.45+origin[2]*.55)
        m.sweep('Branch forks',[origin,bend,arc],[h*.033,h*.022,h*.0051],tint,'wood',sides=7)
        for twig in range(3):
            a1=a+twig*2.10
            end=(arc[0]+h*.21*math.cos(a1),arc[1]+h*m.rand.uniform(-.06,.15),arc[2]+h*.22*math.sin(a1))
            m.pole('Branch forks',bend,end,h*.010,tint,'wood',end=h*.002,sides=6)
            sx=h*m.rand.uniform(.104,.158)
            m.rock('Inner canopy clusters',end,(sx*.73,sx*.62,sx*.68),m.rand.choice(GREEN),'leaf',
                   yaw=a1,smooth=True,shadow=True)
            for leaf in range(15):
                angle=leaf*2.399+a1
                lift=m.rand.uniform(-.75,.85)*sx
                edge=(end[0]+math.cos(angle)*sx*.40,end[1]+lift*.58,end[2]+math.sin(angle)*sx*.40)
                reach=sx*m.rand.uniform(.48,.88)
                tip=(edge[0]+math.cos(angle)*reach,end[1]+lift,edge[2]+math.sin(angle)*reach)
                foliage(m,'Canopy leaf sprays',edge,tip,sx*m.rand.uniform(.15,.29),m.rand.choice(GREEN),shadow=True)
            if bloom:
                for fl in range(4):
                    angle=fl*TAU/4+a1
                    flower(m,(end[0]+sx*math.cos(angle)*.95,end[1]+m.rand.uniform(-.39,.36)*sx,
                              end[2]+sx*math.sin(angle)*.93),h*m.rand.uniform(.020,.039),PINK,petals=5,rise=.91)


def magnolia_bough(m,z,from_x,y,reach):
    points=[(from_x,1.65,z), (from_x+.46,y-.52,z+.08),
            (from_x+reach*.61,y-.16,z+.25),(from_x+reach,y,z+.08)]
    m.sweep('Overhanging magnolia bough',points,[.104,.075,.048,.012],0x967c63,'wood',sides=9)
    for i in range(11):
        t=.37+.063*i
        x=from_x+reach*t
        Y=y-.44*(1-t)
        Z=z+.22+.49*math.sin(i*2.39)
        tip=(x+.09,Y+.23+.13*math.sin(i*.87),Z)
        m.pole('Magnolia flowering shoots',(x,Y-.13,z+.20),tip,.018,0x8e745b,'wood',end=.007)
        for j in range(4):
            a=.8+i+j*2.399
            pt=(tip[0]+.19*math.cos(a),tip[1]+.033*j,tip[2]+.17*math.sin(a))
            leaf=(pt[0]-.17*math.sin(a),pt[1]-.036,pt[2]+.16*math.cos(a))
            foliage(m,'Magnolia leaves at eye level',tip,leaf,.049,m.rand.choice(GREEN),shadow=True)
            flower(m,pt,m.rand.uniform(.088,.156),PINK,petals=6,rise=.87)


def pot(m,x,y,z,r=.23,tints=PINK):
    m.lathe('Terracotta planters',x,z,[(y,r*.53),(y+.035,r*.68),(y+r*.86,r*.87),
            (y+r*1.02,r),(y+r*1.15,r),(y+r*1.16,r*.82),(y+r*.94,r*.79)],
            m.rand.choice((0xae7553,0xb78865,0x9d6446)),'ceramic',sides=16)
    m.lathe('Soil in planters',x,z,[(y+r,r*.79),(y+r,0)],0x6c5740,'earth',sides=16)
    border(m,x,z,r*.81,y+r,tints,6)
    if y==0:
        m.block(x,z,r*1.8,r*1.8)


def gate(m,z,*,timber=False):
    pillar=1.65 if timber else 1.47
    for sign in (-1,1):
        x=pillar*sign
        for i in range(8 if not timber else 6):
            y=i*.285+.141
            for j in (-1,1):
                m.box('Quarried gate masonry',(x+j*.139,y,z+m.rand.uniform(-.025,.025)),
                      (.290,.279,.53),m.rand.choice(LIMESTONE),'rock',yaw=m.rand.uniform(-.022,.022))
        top=2.29 if not timber else 1.72
        m.box('Gate capstones',(x,top,z),(.68,.141,.65),0xc0b39f,'rock')
        m.block(x,z,.61,.64)
        offset=(x-sign*.24,0,z-.18)
        angle=sign*1.10
        def point(u,y,depth=0):
            return (offset[0]-sign*u*math.cos(angle)+depth*math.sin(angle),y,
                    offset[2]+u*math.sin(-abs(angle))+depth*math.cos(angle))
        if timber:
            for i in range(8):
                u=.09+i*.116
                height=1.09+.11*math.sin(i*math.pi/8)
                m.box('Open oak gate boards',point(u,height*.5+.10),(.108,height,.058),0x95734f,'wood',yaw=angle)
            for y in (.30,.90):
                m.pole('Oak gate ledges',point(.02,y,.054),point(.98,y,.054),.047,0x735135,'wood',sides=4)
        else:
            for i in range(10):
                u=.035+i*.109
                h=1.25+.12*math.sin(i*math.pi/9)
                m.pole('Open wrought-iron gate',point(u,.16),point(u,h),.015,0x495e4f)
                m.pole('Iron spear finials',point(u,h),point(u,h+.068),.035,0x4e6351,end=.005)
            for y in (.23,.56,1.17):
                m.pole('Iron cross bars',point(0,y),point(1.03,y),.022,0x43584a)
            for i in range(3):
                scroll=[point(.25+.29*i+.09*(1-j/25)*math.cos(j*.34),
                              1.01+.10*(1-j/25)*math.sin(j*.34),.010) for j in range(25)]
                m.sweep('Gate curls',scroll,[.011]*len(scroll),0x606c58,'iron')
        for u in (.23,.53,.83):
            X,_,Z=point(u,.3)
            m.block(X,Z,.19,.28)
        lantern(m,x,top+.17 if timber else 1.85,z+.39,.23,power=.62 if timber else .24)
    if timber:
        return
    for dz in (-.27,.28):
        m.box('Pergola cross beams',(0,2.48,z+dz),(3.60,.206,.195),0x69503a,'wood')
    for i in range(11):
        m.box('Twin timber rafters',((i-5)*.327,2.60,z),(.135,.119,.93),0x7a6249,'wood')
    for i in range(31):
        x=-1.63+i*.109+m.rand.uniform(-.025,.025)
        z0=z+m.rand.uniform(.33,.53)
        length=m.rand.uniform(.25,.61)
        m.pole('Wisteria tendrils',(x,2.68,z0),(x+.044,2.62-length,z0+.065),.008,0x647744,'leaf',sides=5)
        for j in range(7):
            t=j/6
            for fl in range(3):
                a=fl*TAU/3+j*1.13
                width=.080*(1-t*.77)
                p=(x+.042*t+math.cos(a)*width,2.61-length*t,z0+.052*t+math.sin(a)*width)
                m.rock('Hanging purple wisteria florets',p,(width*.58,.042*(1-t*.48),width*.55),
                       m.rand.choice((0x9772bd,0xb58cd3,0xcfa4df,0xa47ac4)),'petal',small=True,smooth=True,shadow=False)
        foliage(m,'Pergola foliage',(x,2.60,z0),(x+.18,2.71,z0+.21),.091,m.rand.choice(GREEN))


def bench(m,x,z):
    for i in range(4):
        m.box('Bench seat slats',(x,.435,z-.24+i*.144),(1.99,.073,.128),0x9c6a49,'wood')
        m.box('Bench back slats',(x,.58+i*.115,z-.36-i*.027),(1.98,.095,.071),
              (0x926448,0xa47656)[i%2],'wood',tilt=-.16)
    for side in (-1,1):
        x0=x+side*.85
        arcs=[[(x0,.022,z+.23),(x0,.15,z+.16),(x0,.37,z+.16),(x0,.51,z+.24),
               (x0,.63,z+.18),(x0,.654,z-.056),(x0,.65,z-.37),(x0,.94,z-.44)],
              [(x0,.022,z-.40),(x0,.24,z-.31),(x0,.47,z-.33),(x0,.74,z-.40)]]
        for points in arcs:
            m.sweep('Curved cast-iron bench ends',points,[.032]*len(points),0x42584d,'iron',sides=9)
        spiral=[(x0,.591+.116*(1-j/31)*math.sin(j*.29),z+.08+.13*(1-j/31)*math.cos(j*.29)) for j in range(31)]
        m.sweep('Scrollwork on bench arms',spiral,[.018]*len(spiral),0x455e55,'iron',sides=7)
        for Y,Z in ((.438,.16),(.681,-.38),(.903,-.46)):
            m.rock('Bench rivets',(x0,Y,z+Z),(.019,.017,.019),0xb39766,'brass',shadow=False)
    m.block(x,z,2.10,.86)


def greenhouse(m,z,wide=False):
    width=6.10 if wide else 4.12
    depth=8.20 if wide else 4.72
    over=width*.5
    top=2.38 if wide else 1.83
    peak=1.39 if wide else .94
    iron=0x647b61
    segments=12
    count=9 if wide else 6
    roof=[]
    for j in range(count):
        z0=z+depth*.5-depth*j/(count-1)
        arches=[(over*math.cos(a*math.pi/segments),top+peak*math.sin(a*math.pi/segments),z0)
                for a in range(segments+1)]
        roof.append(arches)
        m.sweep('Curved greenhouse ribs',arches,[.035]*len(arches),iron,'iron',sides=7)
        for side in (-1,1):
            x=side*over
            m.pole('Orangery mullions',(x,.18,z0),(x,top,z0),.037,iron,'iron',sides=6)
            if j:
                prev=roof[j-1][0][2]
                for lo,hi in ((.43,1.43),(1.47,top)):
                    m.mesh('glass','Greenhouse glazing',[(x,lo,z0),(x,lo,prev),(x,hi,prev),(x,hi,z0)],
                           [(0,1,2,3)],0xc7e3dc,shadow=False)
    for a in range(segments+1):
        if a%2==0:
            m.pole('Long glazing bars',roof[0][a],roof[-1][a],.025,iron,'iron',sides=6)
        if a<segments:
            for j in range(count-1):
                m.mesh('glass','Roof glazing',[roof[j][a],roof[j+1][a],roof[j+1][a+1],roof[j][a+1]],
                       [(0,1,2,3)],0xc4e4dc,shadow=False)
    for side in (-1,1):
        x=side*over
        m.box('Stone greenhouse plinth',(x,.172,z),(.23,.345,depth+.1),0xb0a28e,'rock')
        m.box('Side glazing transom',(x,1.45,z),(.056,.062,depth),iron,'iron')
        m.block(x,z,.16,depth)
        if wide:
            worktable(m,x*.79,z-.82,.65,depth*.69,.80)
            for j in range(8):
                pot(m,x*.79,.856,z+1.41-j*.66,.18+m.rand.uniform(0,.066),[PINK,WHITE,BLUE][j%3])
    half_door=1.21 if wide else .78
    for side in (-1,1):
        edge=z+side*depth*.5
        for x in (-over,-over*.68,-half_door,half_door,over*.68,over):
            m.pole('Front greenhouse mullions',(x,.10,edge),(x,top+peak*math.sqrt(max(0,1-(x/over)**2)),edge),
                   .034,iron,'iron')
        for a,b in ((-over,-half_door),(half_door,over)):
            m.mesh('glass','Open-ended greenhouse glazing',[(a,.34,edge),(b,.34,edge),(b,top,edge),(a,top,edge)],
                   [(0,1,2,3)],0xc5ded6,shadow=False)
            m.box('Orangery end sill',((a+b)*.5,.169,edge),(b-a,.338,.22),0xaca592,'rock')
            m.block((a+b)*.5,edge,b-a,.15)
        m.box('Orangery door header',(0,2.39 if wide else 1.72,edge),(half_door*2+.027,.072,.085),iron,'iron')


def basket(m,x,y,z):
    for i in range(9):
        a=i/8
        radius=.214+.069*a
        Y=y+.027+i*.024
        points=[(x+radius*math.cos(j*TAU/32),Y+.003*math.sin(j*TAU/4+i),z+radius*math.sin(j*TAU/32))
                for j in range(33)]
        m.sweep('Braided horizontal wicker',points,[.011]*len(points),0xb28448 if i%2 else 0x9d713c,'wood',sides=6)
    for i in range(31):
        angle=i*TAU/31
        a,b=math.cos(angle),math.sin(angle)
        weave=[(x+a*(.213+j*.0085+.007*math.sin(j*math.pi+i)),y+.024+j*.024,
                z+b*(.213+j*.0085+.007*math.sin(j*math.pi+i))) for j in range(9)]
        m.sweep('Vertical wicker stakes',weave,[.007]*len(weave),0xbb925b,'wood',sides=5)
    handle=[(x+.262*math.cos(j*math.pi/24),y+.193+.238*math.sin(j*math.pi/24),z-.056)
            for j in range(25)]
    m.sweep('Basket handle',handle,[.017]*len(handle),0xbc975d,'wood',sides=8)
    vertices=[]; faces=[]
    for row in range(19):
        t=row/18
        for k in range(18):
            u=k/17
            X=(u-.5)*.377
            Z=-.173+t*.475
            lifted=min(1,max(0,(t-.65)/.13))
            fold=.006*math.sin(u*37+t*14)
            drop=max(0,(t-.83)/.17)
            Y=.189+.046*lifted-.119*drop+fold
            vertices.append((x+X,y+Y,z+Z))
            if row and k:
                i=len(vertices)-1
                faces.append((i,i-1,i-19,i-18))
    m.mesh('paper','Folded indigo blanket',vertices,faces,0x4d6190,soft=True)


def build(scene,act):
    dusk=act==3
    names=['Wisteria gate','Magnolia bench','Victorian greenhouse','Garden gate at sunset']
    spawns=[(0,1.66,5.50),(.20,1.65,3.26),(0,1.66,3.78),(.05,1.65,4.20)]
    looks=[(-.14,1.30,-4.),(-.10,.83,-1.32),(.02,1.25,-4.4),(0,1.19,-4.1)]
    light=profile(sky(0x85a5c0,0xffd4a3,0xffd5ae,0xa697a5,glow=.49,solar=.15) if dusk else
                  sky(0x7cb5d1,0xe2e8d1,0xfff5da,0xa9b4b5,glow=.30),
                  0xffba78 if dusk else 0xffe1b5,
                  [-8,6,-9] if dusk else [-7,11,4],strength=3.25 if dusk else 2.67,
                  haze=.021,ground=0x8c9676,ambient=1.53,bounce=1.12)
    m=Map(scene,'garden',act,names[act],spawns[act],looks[act],[-6.05,6.05,-12.7,8.6],light)
    m.ground('earth',0xb2b38a,-.012,38,46,-3)
    m.ground('rock',0x9e967b,-.017,3.11 if act!=2 else 5.92,24.2,-2.6,name='Base under the garden pavers')
    sections(m,'Individual garden flagstones',3.07 if act!=2 else 5.89,-15,9.6,.004,.51,PAVING,'paving')
    for side in (-1,1):
        edge=(1.58 if act!=2 else 2.99)*side
        for j in range(47):
            z=-13.6+j*.48
            m.box('Worn border stones',(edge,.042,z),(.22,.151,.467),m.rand.choice(LIMESTONE),
                  'rock',yaw=m.rand.uniform(-.074,.074))
            if act!=2 or z>3 or z<-7:
                if j%2==0:
                    border(m,edge+side*m.rand.uniform(.26,.77),z,.45,tints=[PINK,BLUE,WHITE][(j//2)%3],count=8)
                if j%3==0 and not (act==1 and side==-1 and -1.67<z<.84):
                    x=edge+side*m.rand.uniform(.63,1.13)
                    tints=[PINK,BLUE,WHITE][(j//3)%3] if j%2==0 else ()
                    shrub(m,x,z,m.rand.uniform(.32,.53),tints)
        for j in range(17):
            z=-17+j*1.66
            x=side*m.rand.uniform(3.8,8.5)
            tree(m,x,z,m.rand.uniform(2.65,4.76),j%4==act,0)
        for j in range(15):
            x=side*7.13
            Z=-15+j*1.42
            m.box('Garden fence posts',(x,.51,Z),(.13,1.09,.14),0x9d8b70,'wood')
            for h in (.38,.73):
                m.box('Garden fence rails',(x,h,Z+.69),(.079,.115,1.4),0xb2a084,'wood')
        for j in range(39):
            x=edge+side*m.rand.uniform(1.22,3.92)
            z=m.rand.uniform(-13,8)
            if act==2 and -6.6<z<2.3:
                continue
            for tuft in range(11):
                angle=m.rand.uniform(0,TAU)
                length=m.rand.uniform(.10,.29)
                origin=(x+.13*math.cos(angle),.014,z+.13*math.sin(angle))
                end=(origin[0]+length*math.cos(angle)*.66,length*.73,origin[2]+length*math.sin(angle)*.66)
                foliage(m,'Tufts of fine garden grass',origin,end,length*.061,m.rand.choice(GREEN))
    for j in range(11):
        m.rock('Distant garden ridges',(-20+j*4.3,-.55,-21-m.rand.uniform(0,3)),
               (5.4,m.rand.uniform(1.9,4.1),5.2),0xa2aa81,'leaf',soft=True,shadow=False)
    if act==0:
        gate(m,-.30)
        greenhouse(m,-9.1)
        pot(m,-2.03,0,.12,.35,BLUE)
        pot(m,1.98,0,-.33,.32,PINK)
        for x,z in ((1.85,6.4),(-2.8,3.4),(-2.15,-4.5)):
            tree(m,x,z,3.65,True)
        magnolia_bough(m,-.18,-2.25,3.17,1.83)
    elif act==1:
        bench(m,-1.58,-.51)
        tree(m,-2.58,-.84,3.88,True)
        greenhouse(m,-9.12)
        pot(m,-2.28,0,1.42,.23,WHITE)
        pot(m,1.84,0,-.89,.27,BLUE)
        magnolia_bough(m,-.70,-2.60,2.92,2.29)
        for i in range(7):
            border(m,-2.36+i*.45,-1.54,.29,tints=[PINK,BLUE,WHITE][i%3],count=6)
    elif act==2:
        greenhouse(m,-2.30,True)
        worktable(m,0,.22,.75,.54,.746)
        basket(m,-.01,.821,.225)
        lantern(m,0,2.64,-2.52,.35)
        for x,z in ((-3.2,2.83),(3.4,2.89),(-3.27,-6.9),(3.32,-6.8)):
            pot(m,x,0,z,.31,BLUE)
    else:
        gate(m,-3.38,timber=True)
        tree(m,-2.80,-.58,4.81,True)
        bench(m,-2.68,-3.55)
        for x in (-2.35,2.64):
            pot(m,x,0,-2.35,.27,WHITE)
        magnolia_bough(m,-.80,-2.80,3.05,2.38)
    return m
