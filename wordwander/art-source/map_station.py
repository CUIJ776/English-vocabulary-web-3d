"""Rocky weather station, instrument terrace, repair room, and recovery console."""
import math
from map_model import Map, TAU, indoor_floor, lantern, pendant, profile, sections, sky, window, worktable
from map_garden import foliage

CONCRETE=(0x818286,0x8a8983,0x939899,0x767f84,0xa1a39c)
SLATE=(0x637184,0x526276,0x768492,0x828b89,0x5a6972)
STEEL=0x526575
WALL=0x79909b
LINE=0x44535b


def ridge(m,z,phase,tint):
    """A connected ridge with tributary spurs and varied faces below the crest."""
    verts=[]
    faces=[]
    shades=[]
    across=96
    slopes=9
    for i in range(across):
        x=-51+i*1.08
        crest=3.7+5.8*abs(math.sin(i*.155+phase))+2.6*abs(math.sin(i*.39+phase*.31))
        crest+=.65*math.sin(i*1.31+phase)
        for j in range(slopes):
            height=j/(slopes-1)
            spur=(math.sin(i*.44+j*.76)+math.sin(i*.71-j*.57))*.71*math.sin(height*math.pi)
            y=crest*height-5.12+spur
            Z=z+(1-height)*10.5+.74*math.sin(i*.37+j*.84)+m.rand.uniform(-.34,.34)
            verts.append((x+m.rand.uniform(-.28,.28),y,Z))
            shades.append(tint if height<.76 else m.rand.choice((tint,tint,0x81909d,0xa2adb7)))
            if i and j:
                a=len(verts)-1
                b,c,d=a-1,a-slopes,a-slopes-1
                if (i+j)%2:
                    faces.extend(((d,b,a),(d,a,c)))
                else:
                    faces.extend(((d,b,c),(b,a,c)))
    m.mesh('rock','Layered mountain ridges',verts,faces,shades,soft=True,shadow=False)


def mountain_range(m,warm,*,interior=False):
    for z,phase,tint in ((-49,.28,0x8e9ba9),(-32,1.61,0x677d92),(-21,.90,0x536977)):
        ridge(m,z,phase,tint)
    for i in range(38):
        X=m.rand.choice((-1,1))*m.rand.uniform(3.18,20)
        Z=m.rand.uniform(-25,-8.12 if interior else 12)
        h=m.rand.uniform(.2,1.49)
        m.rock('Broken surface of the plateau',(X,-.02,Z),(h*.83+.24,h*.50+h*.19,h*1.11),
               m.rand.choice(SLATE),'rock',yaw=m.rand.uniform(0,TAU))
        if not interior and h>.79 and m.bounds[0]<X<m.bounds[1] and m.bounds[2]<Z<m.bounds[3]:
            m.block(X,Z,h*1.3,h*1.5)
        if abs(X)<8:
            for j in range(5):
                x=X+m.rand.uniform(-.49,.49)
                z=Z+m.rand.uniform(-.34,.34)
                foliage(m,'Plateau tussocks',(x,0,z),(x+m.rand.uniform(-.16,.17),m.rand.uniform(.13,.35),z+.05),
                        .034,m.rand.choice((0x7a815b,0x677149,0x8a8961)))
    if warm:
        for x in (-13,-10,8,11):
            m.rock('Sunlit granite ledge',(x,-1.2,-14),(2.8,1.62,3.92),0x958e78,'rock',shadow=False)


def railing(m,x,z,width,depth,y=0,front=True):
    for side in (-1,1):
        x0=x+side*width*.5
        n=math.ceil(depth/.92)
        for j in range(n+1):
            Z=z-depth*.5+j*depth/n
            m.pole('Galvanised steel railing',(x0,y,Z),(x0,y+1.08,Z),.033,STEEL)
        for Y in (y+.34,y+.73,y+1.06):
            m.pole('Galvanised horizontal rails',(x0,Y,z-depth*.5),(x0,Y,z+depth*.5),.027,STEEL)
    if front:
        Z=z-depth*.5
        for j in range(1,math.ceil(width)):
            x0=x-width*.5+j
            m.pole('Safety fence uprights',(x0,y,Z),(x0,y+1.08,Z),.028,STEEL)
        for Y in (y+.34,y+.73,y+1.06):
            m.pole('Safety fence horizontal rails',(x-width*.5,Y,Z),(x+width*.5,Y,Z),.028,STEEL)


def radome(m,x,y,z,radius):
    # Geodesic shell with separate panel seams and a bolted service ring.
    from map_model import PRIMITIVES
    ico,faces=PRIMITIVES['rock']
    verts=[(x+a*radius,y+b*radius,z+c*radius) for a,b,c in ico]
    shades=(0xd4d7dc,0xbfc7d0,0xd7d9da,0xc6cbd1,0xced3d7)
    edges=set()
    for raw in faces:
        points=[verts[i] for i in raw]
        m.mesh('ceramic','Triangular radome skin',points,[(0,1,2)],m.rand.choice(shades),shadow=True)
        edges.update(tuple(sorted((a,b))) for a,b in zip(raw,(*raw[1:],raw[0])))
    for a,b in edges:
        m.pole('Radome panel seams',verts[a],verts[b],radius*.0054,0xabb5bd,'iron',sides=4,shadow=False)
    m.lathe('Radome access ring',x,z,[(y-radius*.93,radius*.48),(y-radius*.78,radius*.58),
             (y-radius*.72,radius*.61)],0x8c979e,'iron',sides=24)


def deploy_case(m,x,y,z,s=1,tint=0x82835b):
    m.box('Rugged carrying cases',(x,y+.225*s,z),(.65*s,.45*s,.47*s),tint,'iron')
    m.box('Equipment case lids',(x,y+.435*s,z),(.682*s,.07*s,.50*s),tint,'iron')
    for side in (-1,1):
        m.box('Case corner guards',(x+side*.29*s,y+.27*s,z+.24*s),(.051*s,.32*s,.037),0x455456,'iron')
        m.box('Equipment case clasps',(x+side*.14*s,y+.398*s,z+.26*s),(.057*s,.075*s,.031),0xaab1aa,'iron')
    m.sweep('Rubber case grips',[(x-.102*s,y+.47*s,z),(x-.086*s,y+.512*s,z),
             (x+.086*s,y+.512*s,z),(x+.104*s,y+.47*s,z)],[.018*s]*4,0x343d40,'iron')


def mast(m,x,z,height=2.65,base=0):
    m.box('Sensor concrete footing',(x,base+.078,z),(.40,.156,.40),0x979793,'rock')
    m.pole('Instrument mast',(x,base+.12,z),(x,base+height,z),.037,0x71818a)
    Y=base+height
    m.pole('Wind-vane crossbar',(x-.31,Y-.10,z),(x+.32,Y-.10,z),.027,STEEL)
    m.pole('Vane pin',(x+.23,Y-.09,z),(x+.23,Y+.14,z),.025,LINE)
    m.mesh('iron','Rudder of wind vane',[(x+.24,Y+.11,z),(x+.62,Y+.16,z),(x+.62,Y-.043,z),
           (x+.24,Y+.041,z)],[(0,1,2,3)],0x475860,shadow=False)
    cup=m.empty('Anemometer', (x-.24,Y+.074,z))
    m.rock('Cup hub',(0,0,0),(.055,.07,.055),STEEL,'iron',part=cup)
    for i in range(3):
        angle=i*TAU/3
        a,b=math.cos(angle),math.sin(angle)
        m.pole('Rotating cup arms',(0,0,0),(.165*a,0,.165*b),.015,LINE,part=cup,sides=6)
        m.rock('Measuring cups',(.19*a,0,.19*b),(.060,.045,.055),0x44545e,'iron',part=cup,soft=True)
    m.cycle(cup,[(1,(x-.24,Y+.074,z),(0,0,0)),(41,(x-.24,Y+.074,z),(0,0,TAU/3)),
                 (81,(x-.24,Y+.074,z),(0,0,TAU*2/3)),(121,(x-.24,Y+.074,z),(0,0,TAU))])


def gauge(m,x,y,z,s=1):
    m.pole('Weather sensor stand',(x,y,z),(x,y+1.32*s,z),.046*s,STEEL)
    m.box('Sensor junction box',(x,y+.51*s,z+.105*s),(.275*s,.30*s,.13*s),0x7d8b8d,'iron')
    for j in range(7):
        Y=y+(.91+j*.068)*s
        m.lathe('White radiation-shield plates',x,z,[(Y,.254*s),(Y+.015*s,.269*s),
                (Y+.049*s,.218*s),(Y+.057*s,.194*s)],0xd3d7d6,'ceramic',sides=22)
    m.lathe('Sensor sloping rain cap',x,z,[(y+1.371*s,.268*s),
            (y+1.418*s,.246*s),(y+1.481*s,.108*s),(y+1.482*s,.005)],
            0xe9e7df,'ceramic',sides=24)


def rain_collector(m,x,z):
    r=.243
    m.lathe('Brushed rain gauge cylinder',x,z,[(.31,.178),(.39,r),(1.13,r),
            (1.18,.254),(1.208,.254),(1.207,.213),(1.06,.202)],0xaab4b9,'iron',sides=27)
    m.lathe('Rain collector dark circular well',x,z,[(1.060,0),(1.060,.203)],0x3b4650,'iron',sides=20)
    for a in (0,TAU/3,TAU*2/3):
        m.pole('Collector stand legs',(x+r*.91*math.sin(a),.05,z+r*.91*math.cos(a)),
               (x+.16*math.sin(a),.42,z+.16*math.cos(a)),.023,STEEL)


def station(m,x,z,s=1,*,distant=False):
    def P(a,b,c):
        return x+a*s,b*s,z+c*s
    def B(name,p,size,tint,material='rock'):
        m.box(name,P(*p),tuple(v*s for v in size),tint,material)
    B('Weather station reinforced concrete', (0,1.19,0),(5.9,2.38,3.82),0x8a9296)
    B('Seamed flat roof',(0,2.43,0),(6.18,.21,4.08),0x67767e)
    B('Weathered fascia',(0,2.28,1.96),(6.09,.17,.18),0x79838b)
    for i in range(6):
        B('Vertical slab joints',(-2.66+i*1.07,1.12,1.921),(.025,2.18,.022),0x6c7478,'plaster')
    for i in range(4):
        y=.13+i*.125
        B('Ridged steel steps',(.94,.081+y*.50,2.66-i*.232),(1.42,y,.28),0x697985,'iron')
        for groove in range(5):
            B('Treads on the service steps',(.43+groove*.24,.088+y,2.684-i*.232),
              (.038,.018,.244),0x53626b,'iron')
    B('Dark observation station door',(.99,1.13,1.951),(1.07,1.89,.112),0x4d6169,'iron')
    B('Door viewing light',(.99,1.317,2.015),(.69,.36,.028),0xffc080,'lamp')
    B('Door handle',(1.32,.859,2.028),(.042,.112,.041),0xb19c75,'brass')
    X,Y,Z=P(-1.32,1.29,1.969)
    window(m,'Station front windows',X,Y,Z,1.72*s,1.10*s,0x4b5152,glow=not distant,divisions=3)
    if not distant:
        X,Y,Z=P(1.94,1.93,2.067)
        lantern(m,X,Y,Z,.20*s)
    X,Y,Z=P(.53,3.55,-.21)
    radome(m,X,Y,Z,1.04*s)
    railing(m,x,z,5.73*s,3.65*s,2.52*s)
    X,Y,Z=P(-2.03,0,.33)
    mast(m,X,Z,1.63*s,2.47*s)
    X,Y,Z=P(2.54,0,-.81)
    m.pole('Red-and-white radio aerial',(X,2.47*s,Z),(X,6.24*s,Z),.029*s,0x984d49)
    for j in range(5):
        y=(3.13+j*.55)*s
        m.pole('Radio antenna branches',(X-.238*s,y,Z),(X+.238*s,y,Z),.016*s,0xadb1a8)
    if not distant:
        m.block(x,z,6.02*s,3.97*s)
        m.block(x+.99*s,z+2.16*s,1.62*s,1.06*s)


def console(m,x,y,z,w=.99):
    m.box('Telemetry screen casing',(x,y,z),(w,w*.62,.107),0x333f4b,'iron',tilt=-.07)
    m.box('Blue glass of display',(x,y,z+.061),(w*.91,w*.54,.018),0x3b617e,'screen',
          bevel=False,shadow=False,tilt=-.07)
    m.box('Monitor pedestal',(x,y-w*.41,z+.015),(.095,w*.29,.17),0x4a5763,'iron')
    m.box('Monitor foot',(x,y-w*.54,z+.026),(w*.46,.049,.37),0x4a5763,'iron')
    for j in range(4):
        Y=y-.17*w+j*.105*w
        m.pole('Graph rule lines',(x-.414*w,Y,z+.078),(x+.411*w,Y,z+.078),.0029*w,0x7192a2,
               'screen',sides=4,shadow=False)
    plot=[(x+(-.39+i*.78/16)*w,y+(.032+.129*i/16+.037*math.sin(i*.81))*w,z+.089)
          for i in range(17)]
    m.sweep('Restored green telemetry trace',plot,[.008*w]*len(plot),0x9BD577,'screen',sides=4,shadow=False)
    for j in range(9):
        height=(.031+.033*math.sin(j*.48)**2)*w
        m.box('Data histogram',(x+(-.39+j*.058)*w,y-.173*w+height*.5,z+.085),
              (.036*w,height,.004),0x6cbbc8,'screen',bevel=False,shadow=False)
    Y=y-w*.53
    m.box('Keyboard body',(x-.19*w,Y,z+.51*w),(.56*w,.033,.245*w),0x444f54,'iron')
    for i in range(4):
        for j in range(12):
            m.box('Individual keyboard keys',(x+(-.427+j*.043)*w,Y+.024,z+(.412+i*.05)*w),
                  (.034*w,.011,.036*w),0x637078,'iron',bevel=False,shadow=False)


def industrial_shelf(m,x,z):
    for side in (-1,1):
        for dz in (-.25,.25):
            m.box('Slotted rack steel',(x+side*.84,1.04,z+dz),(.075,2.11,.079),0x607079,'iron')
    for row in range(4):
        Y=.19+row*.492
        m.box('Rack shelves',(x,Y,z),(1.73,.079,.62),0x68767c,'iron')
        for j in range(5):
            h=m.rand.uniform(.18,.39)
            t=m.rand.choice((0x899898,0x858b85,0x556879,0x9b8b6b,0x556950))
            m.box('Binders and weatherproof storage',(x-.67+j*.324,Y+.041+h*.5,z),
                  (m.rand.uniform(.22,.293),h,.42),t,'iron')
            m.box('Spine labels on equipment',(x-.67+j*.324,Y+.137,z+.217),(.108,.073,.013),0xc3c6bb,'paper')
    m.block(x,z,1.78,.63)


def window_wall(m,opening,z,morning=False):
    m.box('Surround below the ribbon window',(0,.48,z),(11.98,.962,.26),WALL,'rock')
    m.box('Concrete beam above station windows',(0,3.65,z),(11.98,.91,.34),WALL,'rock')
    for X in (-5.79,-3.9,-1.95,0,1.95,3.90,5.79):
        m.box('Steel mullions around the mountain view',(X,2.08,z+.021),(.126,2.37,.17),0x47545d,'iron')
    for Y in (1.014,2.69,3.17):
        m.box('Window transom rails',(0,Y,z+.018),(11.6,.115,.15),0x47545d,'iron')
    if opening:
        for i in range(6):
            X=-4.87+i*1.95
            m.box('Thin window glazing',(X,2.10,z+.028),(1.79,2.08,.045),
                  0xbbced1 if morning else 0x8bb0bf,'glass',bevel=False,shadow=False)
            if not morning:
                for j in range(18):
                    x=X+m.rand.uniform(-.83,.83)
                    y=m.rand.uniform(1.18,3.04)
                    m.pole('Streaks on rain-streaked panes',(x,y,z+.062),(x+.012,y+.11,z+.063),.003,
                           0xb4d3df,'glass',sides=4,shadow=False)


def workshop(m,morning):
    m.ground('tile',0xb9b1a5 if morning else 0x969b9c,-.028,12.35,14.17,-.55)
    indoor_floor(m,'Square workshop floor tiles',CONCRETE,-6.8,rows=14)
    m.box('Workshop ceiling',(0,4.15,-.74),(11.94,.24,13.8),0x737c7e,'rock',shadow=not morning)
    for side in (-1,1):
        m.box('Concrete workshop side walls',(side*5.94,2.10,-.74),(.25,4.21,13.94),WALL,'rock')
        m.box('Workshop steel skirting',(side*5.79,.126,-.73),(.10,.252,13.94),LINE,'iron')
    m.box('Workshop entrance wall',(0,2.12,6.28),(12.2,4.23,.25),WALL,'rock')
    z=-6.78
    window_wall(m,True,z,morning)
    for i in range(5):
        Z=z+.53+i*2.48
        m.box('Steel beams beneath ceiling',(0,3.97,Z),(11.78,.186,.195),0x50616a,'iron',shadow=False)
        m.pole('Ceiling exposed power conduit',(-5.69,3.81,Z-.29),(5.69,3.81,Z-.29),.030,0x5a6970)
    for x,Z in ((-.46,-.69),(-3.86,-4.7),(3.68,-4.33)):
        pendant(m,x,Z,2.79 if morning else 2.61,4.01)
    industrial_shelf(m,-4.27,-5.40)
    industrial_shelf(m,4.28,-5.23)
    worktable(m,.08 if not morning else 1.47,-.62,3.17,1.02,steel=True)
    if morning:
        console(m,2.00,1.52,-.72,1.29)
        deploy_case(m,1.07,.966,-.74,.79,0x6d7c83)
        deploy_case(m,-3.69,0,-3.90,1.19)
        station(m,4.69,-13.91,.77,distant=True)
        mast(m,2.47,-12.09,2.94)
    else:
        gauge(m,-.91,.957,-.56,.54)
        m.box('Instrument test chassis',(.15,1.033,-.56),(.58,.159,.34),0x81958d,'iron')
        for j in range(11):
            m.box('Terminal blocks',(-.083+j*.045,1.122,-.56),(.028,.045,.055),0x526f58,'ceramic')
        m.box('Rubber multimeter',(1.01,1.158,-.54),(.415,.383,.146),0xc39638,'iron',tilt=.34)
        m.box('Multimeter LCD',(1.01,1.219,-.452),(.274,.151,.014),0x455b60,'screen',tilt=.34)
        m.lathe('Selector dial',1.01,-.447,[(1.113,.040),(1.143,.043)],0x4b5450,'iron',sides=12)
        for a,tint in ((-.05,0xa85d53),(.08,0x3c4d53)):
            pts=[(.19+a,1.10,-.39),(.47+a,1.18,-.27),(.84+a,1.21,-.29),(1.03+a,1.08,-.411)]
            m.sweep('Meter leads and test probes',pts,[.011]*4,tint,'iron',sides=6)
        console(m,3.63,1.45,-3.89,1.03)
        worktable(m,3.61,-3.83,1.84,1.07,.90,steel=True)
        deploy_case(m,-3.8,0,-2.8,1.0,0x637672)


def puddles(m,x,z,span,depth):
    for i in range(34):
        X=x+m.rand.uniform(-span*.5,span*.5)
        Z=z+m.rand.uniform(-depth*.5,depth*.5)
        size=m.rand.uniform(.14,.47)
        verts=[(X,.024,Z)]
        for j in range(11):
            a=TAU*j/11
            q=size*m.rand.uniform(.64,1.21)
            verts.append((X+q*math.cos(a),.024,Z+q*.61*math.sin(a)))
        m.mesh('puddle','Irregular shallow rain puddles',verts,[(0,(j+1)%11+1,j+1) for j in range(11)],
               0x6e899a,shadow=False)


def build(scene,act):
    rain=act<3
    outdoors=act<2
    name=['Summit observatory','Sheltered sensor terrace','Calibration workshop','Recovered telemetry'][act]
    looks=[(.47,1.44,-6.91),(-.36,1.23,-4.82),(.02,1.22,-3.2),(1.09,1.32,-3.63)]
    spawn=[(0,1.66,5.65),(.52,1.65,4.28),(.12,1.66,4.49),(.12,1.66,4.47)]
    bounds=[[-6.6,6.6,-9.3,8.0],[-5.4,5.2,-6.31,7.25],
            [-5.52,5.52,-6.43,5.85],[-5.52,5.52,-6.43,5.85]][act]
    lighting=profile(
        sky(0x364960,0x93a7b7,0x8a9fb4,0x303e54,cover=.31,glow=.035,drift=1.6) if rain else
        sky(0x6f97bf,0xffc997,0xffd6b0,0x8392a9,glow=.65,solar=.11,sun=.54),
        0xbad4ef if outdoors else 0xffd5b3 if rain else 0xffc889,
        [-6,8,0] if rain else [-7,7,-9],strength=[1.94,1.68,1.33,3.80][act],
        haze=.027 if outdoors else .012,ground=0x7d8b90,fill=0xb8cfe3 if rain else 0xe6edfb,
        ambient=[1.46,1.49,1.15,1.34][act],bounce=[.84,.83,.75,1.08][act])
    lighting['rain']=outdoors
    m=Map(scene,'station',act,name,spawn[act],looks[act],bounds,lighting)
    mountain_range(m,not rain,interior=not outdoors)
    if act==0:
        m.ground('rock',0x8b9197,-.029,23,23,-1.02)
        sections(m,'Uneven approach flags',3.62,-9.36,8.65,.005,.49,SLATE,'paving')
        station(m,.78,-6.49)
        mast(m,2.94,-4.02,2.86)
        deploy_case(m,1.68,-.02,1.83,.92)
        deploy_case(m,-1.84,-.02,-2.78,1.19)
        puddles(m,0,-.67,3.18,14.01)
        for x,z in ((2.94,-4.02),(1.68,1.83),(-1.84,-2.78)):
            m.block(x,z,.43,.43)
    elif act==1:
        m.ground('rock',0x848b90,-.065,17.1,18.79,.01)
        indoor_floor(m,'Wet concrete instrument terrace',CONCRETE,-6.6,columns=11,rows=15)
        m.box('Instrument-deck station wall',(-4.59,1.84,-1.02),(.26,3.69,10.2),WALL,'rock')
        m.box('Steel canopy above the sensor terrace',(-3.13,3.65,-1.55),(3.15,.22,8.95),0x757b7c,'rock')
        for j in range(5):
            z=-5.9+j*1.88
            m.box('Deck overhang crossbars',(-3.09,3.48,z),(3.2,.153,.19),0x58636a,'iron')
            m.pole('Service conduits on station wall',(-4.44,.17,z),(-4.44,3.45,z),.038,0x4e626c)
        lantern(m,-3.99,2.58,-.87,.26)
        railing(m,.31,-.79,9.45,11.4)
        m.block(-4.47,-.89,.25,10.65)
        gauge(m,-1.35,0,-1.63)
        rain_collector(m,.95,-2.59)
        mast(m,2.61,-3.89,2.52)
        for x,z in ((-1.35,-1.63),(.95,-2.59),(2.61,-3.89)):
            m.block(x,z,.54,.58)
            m.sweep('Rubber cables crossing cable tray',[(x,.62,z),(x-.06,.20,z+.06),
                    (x-.22,.04,z+.20),(x-1.35,.036,z+.20),(x-2,.22,z+.37)],
                    [.019]*5,0x485860,'iron')
        for X,Z in ((-3.96,1.69),(-3.97,-2.76),(3.16,-5.33)):
            deploy_case(m,X,0,Z,1.05,0xb49954)
            m.block(X,Z,.69,.49)
        puddles(m,.16,-.50,7.33,11.72)
    else:
        workshop(m,act==3)
    return m
