"""Sea village, forest bridge, lighthouse entrance and sunrise harbour."""
import math
from map_model import Map, TAU, jetties, lantern, profile, sections, sky, window
from map_garden import border, foliage

STONE=(0x8d8380,0x778185,0x9b958b,0x837f76,0xa39a8e,0x707780)
SLATE=(0x59616b,0x606774,0x6d7079,0x535f6b,0x727987)
MOSS=(0x566543,0x667249,0x798249,0x485740,0x67754a)
FIR=(0x3e5646,0x475e4d,0x506750,0x56694b,0x354e44)
COAST_FLOWERS=(0xa78bac,0xbfa0bd,0xd7b9cf,0x8f7aab)
STREAM=(-4.81,-1.49)


def post_light(m,x,z,y=0):
    m.box('Lantern post footing',(x,y+.067,z),(.34,.135,.34),0x8a8278,'rock')
    m.pole('Weathered oak lamp posts',(x,y+.09,z),(x,y+2.05,z),.068,0x68533c,'wood',sides=5)
    m.pole('Lamp hanging bracket',(x,y+1.99,z),(x+.37,y+1.99,z+.065),.041,0x77604a,'wood',sides=5)
    m.pole('Lamp bracket brace',(x,y+1.66,z),(x+.26,y+1.98,z+.053),.027,0x705b49,'wood',sides=5)
    lantern(m,x+.34,y+1.69,z+.063,.22)


def barrel(m,x,y,z,s=.48):
    r=s*.35
    m.lathe('Coopered oak casks',x,z,[(y,r*.91),(y+s*.05,r),(y+s*.47,r*1.12),
              (y+s*.91,r),(y+s,r*.95),(y+s,0)],0x896e51,'wood',sides=20)
    for t in (.16,.35,.73,.87):
        r0=r*(1+.105*math.sin(math.pi*t))
        m.lathe('Iron hoops around casks',x,z,[(y+s*t,r0),(y+s*t+.021,r0)],
                0x514840,'iron',sides=18)
    for j in range(3):
        d=r*(.52+j*.11)
        points=[(x+d*math.cos(a/31*TAU),y+s+.017+j*.009,z+d*math.sin(a/31*TAU)) for a in range(32)]
        m.sweep('Coiled hemp rope',points,[.011]*len(points),0xb09a73,'wood',sides=6)


def shoreline(m):
    for side in (-1,1):
        for j in range(13):
            x=side*(10.8+j*2.23)
            z=-24-m.rand.uniform(0,12)
            width=m.rand.uniform(3.1,5.7)
            height=m.rand.uniform(1.3,3.0)
            m.rock('Broken cliffs on the far shore',(x,-.49,z),
                   (width,height,m.rand.uniform(2.7,6.2)),m.rand.choice(STONE),'rock',yaw=j*.42,soft=True,shadow=False)
            m.rock('Coastal grass on the bluffs',(x,height*.73-.55,z),
                   (width*.54,height*.14,1.78),m.rand.choice(MOSS),'leaf',soft=True,shadow=False)
    for j in range(42):
        x=m.rand.uniform(-12,13)
        z=m.rand.uniform(-22,-12)
        m.rock('Granite boulders at the tide line',(x,-.38,z),
               (m.rand.uniform(.41,1.9),m.rand.uniform(.29,1.19),m.rand.uniform(.39,1.45)),
               m.rand.choice(STONE),'rock',yaw=m.rand.uniform(0,TAU))


def pine(m,x,z,h):
    bend=m.rand.uniform(-.14,.14)*h
    nearby=abs(x)<6.8 and z>-12.7
    m.sweep('Tapered pine trunks',[(x,-.06,z),(x+bend*.23,h*.44,z-.07),(x+bend,h,z)],
            [h*.033,h*.023,h*.004],0x6e5d4e,'wood',sides=10)
    layers=9 if nearby else 7
    for layer in range(layers):
        t=.24+layer*.69/(layers-1)
        y=h*t
        for branch in range(4):
            angle=branch*TAU/4+layer*1.17+m.rand.uniform(-.27,.27)
            dx,dz=math.cos(angle),math.sin(angle)
            length=h*(1-t)*m.rand.uniform(.26,.43)
            origin=(x+bend*t,y,z)
            middle=(origin[0]+dx*length*.52,y-length*.18,z+dz*length*.52)
            end=(origin[0]+dx*length,y+length*.025,z+dz*length)
            m.sweep('Descending pine branches',[origin,middle,end],[h*.007*(1-t),h*.0035,.002],
                    0x685b44,'wood',sides=5,shadow=False)
            for ratio in (.24,.46,.69,.91) if nearby else (.36,.69,.91):
                px=origin[0]+dx*length*ratio
                pz=origin[2]+dz*length*ratio
                Y=y-length*math.sin(math.pi*ratio)*.18
                width=length*(1-ratio*.66)*.41
                m.rock('Inner pine crown', (px,Y,pz),(width*.59,width*.34,width*.78),
                       m.rand.choice(FIR),'leaf',small=True,smooth=True,shadow=False)
                for side in (-1,1):
                    for fl in range(3 if nearby else 2):
                        reach=width*(1+fl*.22)
                        tip=(px+dx*length*(.18+.04*fl)-side*dz*reach,Y+width*(fl*.41-.42),
                             pz+dz*length*(.18+.04*fl)+side*dx*reach)
                        foliage(m,'Fine pine needle sprays',(px,Y,pz),tip,width*.43,m.rand.choice(FIR),
                                shadow=nearby and fl==1,narrow=True)


def fern(m,x,z,s=.26,y=.02):
    for i in range(6):
        angle=TAU*i/6
        a,b=math.cos(angle),math.sin(angle)
        pts=[(x+a*s*t,y+s*(math.sin(t*1.6)*.92+.04),z+b*s*t) for t in (0,.27,.52,.81,1)]
        m.sweep('Fern ribs',pts,[s*.011]*5,0x738456,'leaf',sides=5,shadow=False)
        for j in range(1,7):
            t=j/7
            py=y+s*(math.sin(t*1.6)*.92+.04)
            q=(x+a*s*t,py,z+b*s*t)
            for side in (-1,1):
                w=s*(.13+.12*math.sin(t*math.pi))
                tip=(q[0]+a*s*.19-side*b*w,py+.006,q[2]+b*s*.19+side*a*w)
                foliage(m,'Fern leaflets',q,tip,w*.36,m.rand.choice(MOSS),narrow=True)


def cottage(m,x,z,w,d,height,*,brightness=True):
    m.box('Cottage stone walls',(x,height*.47,z),(w,height*.94,d),0x999083,'rock')
    for side in (-1,1):
        for row in range(math.ceil(height/.26)):
            y=.13+row*.26
            m.box('Layered corner masonry',(x+side*(w/2-.06),y,z+d*.506),(.34,.245,.24),
                  m.rand.choice(STONE),'rock')
    for i in range(6):
        z0=z-d*.45+i*d/6
        for k in range(5):
            y=.21+k*.36
            m.box('Rough cottage wall courses',(x+w*.516,y,z0),(.11,.20,d*.158),
                  m.rand.choice(STONE),'rock')
    roof=height+.84
    over=.27
    xt=w*.5+over
    rz=d*.5+over
    roof_vertices=[(x-xt,height-.06,z-rz),(x+xt,height-.06,z-rz),(x,height+.84,z-rz),
                   (x-xt,height-.06,z+rz),(x+xt,height-.06,z+rz),(x,roof,z+rz)]
    m.mesh('wood','Timber gable and slate roof',roof_vertices,
           [(0,2,1),(3,4,5),(0,3,5,2),(1,2,5,4)],0x5a5050)
    for side in (-1,1):
        for row in range(6):
            frac=(row+.48)/6
            xx=x+side*xt*frac
            yy=roof-.90*frac
            for k in range(math.ceil(d/.34)+2):
                Z=z-rz+.18+k*.33+(.156 if row%2 else 0)
                if Z<=z+rz+.03:
                    m.box('Individual slate shingles',(xx,yy+.029,Z),
                          (xt/6+.075,.073,.305),m.rand.choice(SLATE),'rock',
                          shadow=False)
    m.pole('Weathered ridge beam',(x,roof+.061,z-rz),(x,roof+.061,z+rz),.075,0x5f514b,'wood')
    m.box('Chimneys',(x+.38,height+1.04,z-d*.19),(.37,1.04,.37),0x8b766a,'rock')
    m.box('Chimney coping',(x+.38,height+1.52,z-d*.19),(.47,.126,.45),0x9b8b7d,'rock')
    front=z+d*.5+.028
    window(m,'Glazed cottage window',x-.57,1.11,front,.56,.75,0x684f3d,glow=brightness)
    m.box('Cottage doors',(x+.49,.70,front),(.57,1.40,.067),0x6d5441,'wood')
    for i in range(4):
        m.box('Door battens',(x+.26+i*.147,.70,front+.044),(.135,1.35,.039),0x806048,'wood')
    lantern(m,x+.93,1.52,front+.14,.19)
    m.box('Stone front threshold',(x+.43,.084,front+.22),(1.22,.169,.52),0x938273,'rock')
    m.block(x,z,w+.15,d+.16)


def tower(m,x,z,scale=1,base=0,door=False):
    def Y(h):
        return base+h*scale

    for a,b,r,tint in ((0,1.10,1.09,0xe8ded2),(1.10,2.35,.96,0xbf614d),
                       (2.35,3.63,.87,0xeee5d8),(3.63,4.22,.78,0xbd6756)):
        m.lathe('Painted lighthouse masonry',x,z,[(Y(a),r*scale),(Y(b),r*.89*scale)],
                tint,'rock',sides=32)
    for h,r in ((.17,1.11),(1.15,1.01),(2.37,.91),(4.24,.88)):
        m.lathe('Lighthouse cornice courses',x,z,[(Y(h),r*scale),(Y(h+.10),r*scale)],
                0xc9c3af,'rock',sides=32)
    m.lathe('Beacon balcony',x,z,[(Y(4.25),.84*scale),(Y(4.29),1.00*scale),
              (Y(4.38),1.01*scale),(Y(4.40),.78*scale)],0x66615a,'iron',sides=32)
    m.lathe('Glowing beacon lens',x,z,[(Y(4.45),.59*scale),(Y(5.05),.58*scale)],
              0xffcc74,'lamp',sides=16,shadow=False)
    m.lathe('Beveled copper beacon roof',x,z,[(Y(5.05),.71*scale),(Y(5.12),.71*scale),
              (Y(5.52),.08*scale),(Y(5.64),.029*scale)],0x66594d,'iron',sides=24)
    for j in range(12):
        a=j*TAU/12
        q=(x+math.cos(a)*scale*.626,z+math.sin(a)*scale*.626)
        m.pole('Beacon mullions',(q[0],Y(4.39),q[1]),(q[0],Y(5.12),q[1]),.023*scale,0x68574a)
    m.light_at(x,Y(4.76),z+.12,0xffc16e,19*scale,8)
    if door:
        front=z+1.088*scale
        w=.63*scale
        arch=.94*scale
        m.box('Door backing',(x,base+.5*arch,front+.013),(w*1.84,arch,.195),0x594134,'wood')
        for i in range(11):
            u=((i+.5)/11*2-1)*w*.93
            top=arch+math.sqrt(max(0,w*w-u*u))*.63
            m.box('Arched lighthouse door boards',(x+u,base+top*.5,front+.095),(.108*scale,top,.112*scale),
                  m.rand.choice((0x846044,0x8c684d,0x7f5c41,0x966c4d)),'wood')
        for j in range(13):
            a=(j+.5)*math.pi/13
            m.box('Pale voussoirs over the door',(x+math.cos(a)*(w+.057*scale),base+arch+math.sin(a)*w*.76,front+.089),
                  (.26*scale,.19*scale,.245*scale),m.rand.choice(STONE),'rock')
        for side in (-1,1):
            for i in range(5):
                m.box('Stone door jambs',(x+side*(w+.071*scale),base+(i+.5)*arch/5,front+.104),
                      (.21*scale,arch*.187,.25*scale),m.rand.choice(STONE),'rock')
            m.box('Door strap hinge',(x+side*w*.46,base+.69*scale,front+.156),(.47*scale,.051,.037),0x504137,'iron')
            m.rock('Brass on door handles',(x+side*.13*scale,base+.56*scale,front+.19),
                   (.052,.055,.021),0x927041,'brass')
        lantern(m,x,Y(1.92),front+.18,.32)
        window(m,'Lighthouse side window',x+.72*scale,Y(2.79),z+.64*scale,.41,.73,0x655547,glow=True)


def beacon(m,x,y,z):
    root=m.empty('Turning lighthouse beacon',(x,y,z))
    verts=[]
    for distance,radius in ((.6,.09),(4,.28),(9,.58),(15,.89)):
        for i in range(12):
            a=TAU*i/12
            verts.append((-distance,math.sin(a)*radius,math.cos(a)*radius))
    faces=[(12*r+i,12*r+(i+1)%12,12*(r+1)+(i+1)%12,12*(r+1)+i)
           for r in range(3) for i in range(12)]
    m.mesh('beam','Soft cone above the harbour',verts,faces,0xffd69a,soft=True,shadow=False,part=root)
    pt=(x,y,z)
    m.cycle(root,[(1,pt,(0,0,-.30)),(61,pt,(0,0,.21)),(121,pt,(0,0,-.30))])


def bridge(m):
    start,end=STREAM
    deck=2.42
    for side in (-1,1):
        x=side*(deck*.50+.20)
        for row in range(3):
            for i in range(10):
                t=(i+.5)/10
                z=start+(end-start)*t
                y=(row+.5)*.266+.096*math.sin(math.pi*t)
                m.box('Masonry parapets on the stone bridge',(x,y,z),(.35,.276,.345),
                      m.rand.choice(STONE),'rock',yaw=m.rand.uniform(-.063,.063))
                if row==2 and i%2:
                    m.rock('Moss in parapet crevices',(x,.80+.096*math.sin(math.pi*t),z),
                           (.168,.062,.159),m.rand.choice(MOSS),'leaf',smooth=True)
        # The exposed side cheeks follow the arch below the walking surface.
        for j in range(12):
            t=(j+.5)/12
            z=start+(end-start)*t
            depth=.69-.44*math.sin(math.pi*t)
            m.box('Bridge arch stonework',(x,-depth*.49,z),(.31,depth,.271),m.rand.choice(STONE),'rock')
    m.ground('rock',0x817d74,-.014,deck,end-start+.13,(start+end)/2,name='Walkable bridge deck')
    m.blocks.extend([[-7.20,-deck/2,start,end],[deck/2,7.20,start,end]])


def harbour_boat(m):
    boat=m.empty('Returning wooden fishing boat')
    hull=[]
    for y,width,length in ((-.12,.36,1.17),(.06,.53,1.47),(.32,.63,1.53),(.38,.62,1.53)):
        for j in range(24):
            a=j*TAU/24
            z=length*math.cos(a)
            x=width*math.sin(a)*(.90-.10*math.cos(a))
            hull.append((x,y+.062*math.cos(a),z))
    faces=[(24*i+j,24*i+(j+1)%24,24*(i+1)+(j+1)%24,24*(i+1)+j)
           for i in range(3) for j in range(24)]
    m.mesh('wood','Shaped clinker-built hull',hull,faces,0xa86c4f,soft=True,part=boat)
    m.box('Fishing boat deck',(0,.342,0),(1.05,.08,2.64),0xb39972,'wood',part=boat)
    m.box('Wheelhouse painted cedar',(0,.65,-.20),(.78,.59,.78),0xdbc29b,'wood',part=boat)
    m.box('Wheelhouse roof',(0,.978,-.20),(.94,.105,.95),0x5a6461,'iron',part=boat)
    m.box('Warm wheelhouse window',(0,.775,.203),(.58,.223,.026),0xffbd69,'lamp',part=boat,shadow=False)
    m.pole('Fishing mast',(.18,.44,.66),(.18,1.89,.66),.036,0x8a6c52,'wood',part=boat)
    m.pole('Fore mast beam',(-.31,1.55,.66),(.44,1.55,.66),.021,0x8a6c52,'wood',part=boat)
    m.pole('Standing rigging',(.18,1.75,.66),(-.34,.37,1.19),.012,0x9a8665,'wood',part=boat)
    m.pole('Standing rigging',(.18,1.75,.66),(.45,.37,-.72),.012,0x9a8665,'wood',part=boat)
    m.box('Faded pennant',(.31,1.77,.66),(.26,.13,.019),0xa05a51,'paper',part=boat,shadow=False)
    m.cycle(boat,[(1,(.46,-.50,-10.5),(0,0,.55)),(41,(.62,-.47,-10.22),(.035,-.045,.58)),
                  (81,(.70,-.53,-10.21),(-.022,.034,.51)),(121,(.46,-.50,-10.5),(0,0,.55))])


def build(scene,act):
    name=['Clifftop cottages','Forest stream crossing','The lighthouse threshold','Harbour at sunrise'][act]
    look=[(.34,1.33,-5.45),(-.02,1.12,-4.62),(0,1.61,-4.36),(.78,1.48,-13.2)][act]
    bounds=[[-7.1,2.35,-10.9,8.0],[-7.1,7.1,-12.1,8.],
            [-4.72,4.72,-8.9,8.0],[-3.06,3.06,-3.01,8.]][act]
    palettes=[
        sky(0x4e557d,0xc6a0aa,0xf0a8a2,0x5d6580,glow=.38,solar=.14),
        sky(0x627885,0xa8b6b6,0xa9bebf,0x5a6e76,cover=.35,glow=.03),
        sky(0x4a5b84,0xbe9d9f,0xd4a0aa,0x52617d,glow=.34,solar=.14),
        sky(0x7285a9,0xffbd8d,0xfac18f,0x9a8198,glow=.67,solar=.099,sun=.49),
    ]
    sunset=act==3
    lighting=profile(palettes[act],0xffc18c if act!=1 else 0xe2e3d1,
                     [-6,6,-12] if sunset else [-6,8,4],
                     strength=3.05 if sunset else 1.65 if act==1 else 2.02,
                     haze=[.026,.044,.028,.026][act],ground=0x758278,
                     fill=0xc9d5e9,ambient=1.36,bounce=.98 if act==3 else .85)
    if act in (0,2,3):
        lighting['coast']=True
    if act==1:
        lighting['waterBanks']=STREAM
    m=Map(scene,'lighthouse',act,name,(0,1.67,3.75 if act==1 else 5.48),look,bounds,lighting)
    if act!=1:
        shoreline(m)
    if act==0:
        m.ground('earth',0x85867a,-.082,15.2,25,-1.3,x=-5.16)
        m.ground('paving',0x9a8e81,-.018,3.38,23.0,-1.9,name='Cobbled lane bed')
        sections(m,'Cobbles along the sea village',3.37,-13.1,9.53,.008,.42,STONE,'paving')
        for i,z in enumerate((3.3,-1.0,-5.6,-10.1)):
            cottage(m,-3.50-.17*i,z,2.94,3.10,2.27+(.18 if i%2 else .02))
        for j in range(17):
            z=6.1-j*.93
            x=2.10+.19*math.sin(z*.33)
            m.box('Coastal path oak rail posts',(x,.48,z),(.145,.98,.15),0x82674d,'wood')
            m.box('Oak railing overlooking the bay',(x,.68,z-.44),(.096,.149,.91),0x94785a,'wood')
        m.block(2.09,-1.4,.19,14.6)
        m.water('Open sea',0x4e6a80,-.53,70,58,-13.3,x=16)
        for j in range(29):
            Z=7.1-j*.66
            m.rock('Rocky shelf below the village lane',(2.45+m.rand.uniform(-.13,.42),-.39,Z),
                   (.73,m.rand.uniform(.23,.39),.42),m.rand.choice(STONE),'rock',yaw=j*.41,smooth=True)
        m.rock('Lighthouse headland',(7.6,-.32,-18.6),(5.4,1.77,4.0),0x7e7a6d,'rock')
        tower(m,7.46,-18.8,.98,1.13)
        post_light(m,-1.92,2.15)
        for x,z in ((-2.38,3.6),(-2.06,-2.88),(1.83,-2.2)):
            barrel(m,x,0,z,.61)
        for i in range(27):
            z=m.rand.uniform(-12.4,8.7)
            x=m.rand.choice((-1,1))*m.rand.uniform(1.79,3.45)
            border(m,x,z,.40,tints=COAST_FLOWERS,count=6)
    elif act==1:
        start,end=STREAM
        m.ground('earth',0x8b926c,-.039,34,15.1,end+7.55,name='Near forest bank')
        m.ground('earth',0x7f886c,-.041,34,14.4,start-7.2,name='Far forest bank')
        m.water('Rocky forest stream',0x45797a,-.44,43,end-start+.34,(start+end)*.5)
        sections(m,'Stones in the forest crossing',2.40,-13.0,9.0,.006,.43,STONE,'paving')
        bridge(m)
        post_light(m,1.61,end+.30)
        post_light(m,-1.75,start-1.88)
        for i in range(49):
            z=m.rand.uniform(-20,9)
            x=m.rand.choice((-1,1))*m.rand.uniform(2.3,15)
            if start-.065<z<end+.05:
                continue
            h=m.rand.uniform(3.10,7.90)
            pine(m,x,z,h)
            if m.bounds[0]<x<m.bounds[1] and m.bounds[2]<z<m.bounds[3]:
                m.block(x,z,h*.065,h*.065)
        for side in (-1,1):
            for i in range(16):
                x=side*m.rand.uniform(3.1,9.3)
                z=m.rand.uniform(-13.7,7.4)
                if start-1.0<z<end+.9:
                    continue
                sx=m.rand.uniform(.51,1.19)
                m.rock('Lichen-covered forest boulders',(x,-.18,z),(sx,.55,sx*.68),m.rand.choice(STONE),'rock',
                       yaw=i*1.4,soft=True)
                m.rock('Moss clinging to boulder tops',(x,.24,z),(sx*.72,.11,sx*.53),
                       m.rand.choice(MOSS),'leaf',soft=True)
                fern(m,x+side*sx*.41,z+.12,m.rand.uniform(.29,.56),.20)
        for i in range(68):
            z=m.rand.choice((end+.09,start-.13))+m.rand.uniform(-.40,.38)
            x=m.rand.choice((-1,1))*m.rand.uniform(1.61,11.2)
            m.rock('Fractured mossy riverbank slabs',(x,-.11,z),
                   (m.rand.uniform(.28,.76),m.rand.uniform(.22,.61),m.rand.uniform(.34,.65)),
                   m.rand.choice(STONE),'rock',yaw=m.rand.uniform(0,TAU))
            if i%2==0:
                fern(m,x,z,m.rand.uniform(.21,.46),.27)
        for i in range(19):
            z=m.rand.uniform(start+.30,end-.30)
            x=m.rand.choice((-1,1))*m.rand.uniform(1.72,9.8)
            scale=m.rand.uniform(.17,.56)
            m.rock('Partially submerged river stones',(x,-.54,z),(scale,scale*.62,scale*.69),
                   m.rand.choice(STONE),'rock',yaw=i*1.2,smooth=True)
    elif act==2:
        m.ground('paving',0xa39c8a,-.019,10.8,19,-1.7,name='Stone headland courtyard')
        m.water('Ocean beside the tower',0x4a687c,-.63,83,47,-11,x=-14)
        sections(m,'Lighthouse approach slabs',4.45,-8.5,8.5,.008,.47,STONE,'paving')
        tower(m,0,-6.58,1.75,0,True)
        m.block(0,-6.72,4.09,4.15)
        for side in (-1,1):
            for j in range(28):
                z=-8.7+j*.60
                m.box('Courtyard granite sea wall',(side*4.33,.40,z),(.31,.80,.582),
                      m.rand.choice(STONE),'rock',yaw=m.rand.uniform(-.028,.028))
            m.block(side*4.33,-.12,.36,17.4)
        for x,z,s in ((-1.89,-3.18,.66),(-2.20,-3.26,.48),(1.99,-2.11,.63),(2.43,.97,.52)):
            barrel(m,x,0,z,s)
            m.block(x,z,s*.78,s*.75)
    else:
        m.ground('rock',0x968876,-.08,11,13.4,5.02,name='Shoreline approach')
        m.water('Harbour water',0x4a7a91,-.55,78,55,-22)
        jetties(m,0,.26,6.68,9.4)
        for side in (-1,1):
            for j in range(8):
                z=-3.55+j*.92
                x=side*3.08
                m.pole('Octagonal oak bollards',(x,-.31,z),(x,.75,z),.114,0x81664d,'wood',sides=8)
                if j<7:
                    m.sweep('Hemp quay ropes',[(x,.56,z),(x,.42,z+.24),(x,.39,z+.46),
                           (x,.44,z+.70),(x,.56,z+.92)],[.022]*5,0xb4986a,'wood',sides=7)
        m.rock('Sunlit lighthouse bluff',(6.5,-.52,-19.25),(5.9,3.56,5.01),0x8a8171,'rock',soft=True)
        for i in range(15):
            z=-16.0+m.rand.uniform(-4.2,1.7)
            x=m.rand.uniform(3.3,11.4)
            extent=m.rand.uniform(.57,1.80)
            m.rock('Split rock ledges above the tide',(x,-.53,z),(extent,m.rand.uniform(.5,2.14),extent*.77),
                   m.rand.choice(STONE),'rock',soft=True,yaw=i*.41)
        cottage(m,-4.89,-1.48,3.70,4.12,2.54)
        for i in range(5):
            x=-3.45+i*.18
            z=-3.10+i*.34
            m.box('Harbour masonry apron',(x,-.24,z),(1.26,.35,.43),m.rand.choice(STONE),'rock')
        tower(m,6.30,-19.05,1.20,2.39)
        beacon(m,6.30,8.15,-19.05)
        harbour_boat(m)
        post_light(m,-2.77,-2.36)
        barrel(m,-2.78,.02,2.52,.66)
        for x,z in ((-2.9,5.37),(2.87,4.86),(2.74,3.85)):
            border(m,x,z,.35,tints=COAST_FLOWERS,count=7)
    return m
