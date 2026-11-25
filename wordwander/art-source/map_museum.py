"""A heritage gallery by night and dawn, with archive and conservation rooms."""
import math
from map_model import Map, TAU, indoor_floor, pendant, profile, sky, worktable

TEAL=0x314750
WALNUT=0x77543b
OAK=0x966e4f
BRASS=0xb48e51
IVORY=0xe8d6a9
TILES=(0xc1b5a3,0xa6a594,0xc0b39d,0xb6ae9d,0xaca397,0xa6a499,0xc8bca9)
BOOKS=(0x67584a,0x7d6147,0x8b7358,0x916c4c,0x676f68,0x6d756f,0x646675,0xa18b70)


def label(m,x,y,z,code,detail):
    m.box('Ivory exhibit label',(x,y,z),(.64,.24,.035),IVORY,'paper')
    for side in (-1,1):
        m.pole('Bronze text frame',(x-.303,y+side*.102,z+.021),(x+.303,y+side*.102,z+.021),.004,BRASS,'brass',sides=5)
        m.pole('Bronze text frame',(x+side*.303,y-.102,z+.021),(x+side*.303,y+.102,z+.021),.004,BRASS,'brass',sides=5)
    m.text('Exhibit code '+code,code,(x,y-.014,z+.025),0x43382c,.082)
    m.text('Collection name '+code,detail,(x,y-.059,z+.025),0x4e4134,.033)


def compass(m,x,y,z,s=1):
    # Open groove on the chipped rim, so the identification clue is reflected in the model.
    tilt=.252
    def point(dx,h,dz):
        return x+dx*s,y+(h*math.cos(tilt)-dz*math.sin(tilt))*s,z+(dz*math.cos(tilt)+h*math.sin(tilt))*s
    for r,high,c,mat in ((.315,-.012,0xa4814a,'brass'),(.274,.024,0xe5d5ad,'paper')):
        verts=[point(0,high,0)]+[point(r*math.cos(i*TAU/54),high,r*math.sin(i*TAU/54)) for i in range(54)]
        m.mesh(mat,'Antique compass face and case',verts,[(0,(i+1)%54+1,i+1) for i in range(54)],c)
    turn=.36
    path=[point(.296*math.cos(turn+i*5.99/54),.043,.296*math.sin(turn+i*5.99/54)) for i in range(55)]
    m.sweep('W07 chipped brass compass rim',path,[.024*s]*len(path),0xc49d59,'brass',sides=8)
    for i in range(36):
        a=i*TAU/36
        dr=.209 if i%3 else .187
        m.pole('Compass face radial indices',point(dr*math.sin(a),.029,dr*math.cos(a)),
               point(.238*math.sin(a),.029,.238*math.cos(a)),
               .0031*s,0x62553f,'paper',sides=4,shadow=False)
    for dy,tint in ((1,0x9d513d),(-1,0x617279)):
        m.mesh('ceramic','Two-colour compass needle',[point(0,.040,-.205*dy),
               point(-.033,.040,0),point(.032,.040,0)],[(0,1,2)],tint,shadow=False)
    m.rock('Compass needle hub',point(0,.045,0),(.026*s,.012*s,.026*s),0x9c7647,'brass')


def tile(m,x,y,z,s=1):
    m.box('E12 blue ceramic tile',(x,y,z),(.61*s,.053*s,.58*s),0x4d89a2,'ceramic')
    for i in range(8):
        a=TAU/8*i
        points=[(x+math.cos(a+t)*s*r,y+.028*s,z+math.sin(a+t)*s*r)
                for t,r in ((0,.028),(.23,.138),(0,.232),(-.23,.138),(0,.028))]
        m.sweep('Raised glaze on the blue tile',points,[.0075*s]*5,0xd6d6bd,'ceramic',sides=5,shadow=False)
    for side in (-1,1):
        m.pole('Blue tile border',(x-.259*s,y+.031*s,z+side*.248*s),
               (x+.259*s,y+.031*s,z+side*.248*s),.006*s,0xa8c2cb,'ceramic',sides=5,shadow=False)
        m.pole('Blue tile border',(x+side*.268*s,y+.031*s,z-.244*s),
               (x+side*.268*s,y+.031*s,z+.244*s),.006*s,0xa8c2cb,'ceramic',sides=5,shadow=False)


def case(m,x,z,kind,code,collection):
    m.box('Walnut display base',(x,.437,z),(1.40,.856,1.07),WALNUT,'wood')
    for j in range(19):
        shade=(0x7d573b,0x836045,0x6a4a37)[j%3]
        m.box('Fluted walnut pedestal fascia',(x,.069+j*.041,z+.545),(1.38,.027,.028),shade,'wood',shadow=False)
    m.box('Bronze case sill',(x,.868,z),(1.45,.096,1.14),BRASS,'brass')
    m.box('Felt object tray',(x,.928,z),(1.32,.069,1.01),0x71594d,'paper')
    for side in (-1,1):
        for dz in (-1,1):
            m.pole('Bronze case uprights',(x+side*.66,.932,z+dz*.509),
                   (x+side*.66,1.625,z+dz*.509),.013,BRASS,'brass')
        m.pole('Upper case frame',(x-.66,1.625,z+side*.509),(x+.66,1.625,z+side*.509),.018,BRASS,'brass')
        m.pole('Upper case frame',(x+side*.66,1.625,z-.509),(x+side*.66,1.625,z+.509),.018,BRASS,'brass')
        m.mesh('glass','Glazed display box',[(x+side*.66,.941,z-.51),(x+side*.66,.941,z+.51),
               (x+side*.66,1.618,z+.51),(x+side*.66,1.618,z-.51)],[(0,1,2,3)],0xa6b7bd,shadow=False)
        m.mesh('glass','Glazed display box',[(x-.66,.94,z+side*.51),(x+.66,.94,z+side*.51),
               (x+.66,1.617,z+side*.51),(x-.66,1.617,z+side*.51)],[(0,1,2,3)],0xbcc7c6,shadow=False)
    m.mesh('glass','Glazed display box',[(x-.66,1.619,z-.51),(x+.66,1.619,z-.51),
           (x+.66,1.619,z+.51),(x-.66,1.619,z+.51)],[(0,1,2,3)],0xbcc7c6,shadow=False)
    label(m,x,.695,z+.575,code,collection)
    if kind=='compass':
        compass(m,x,1.052,z,1.12)
    else:
        tile(m,x,.990,z,1.08)
    m.block(x,z,1.43,1.14)


def arch_window(m,x,z,dawn):
    w=.68
    lo,base=1.05,2.64
    cap=base+.56
    points=[(x-w,lo,z),(x+w,lo,z)]+[
        (x+w*math.cos(j*math.pi/12),base+(cap-base)*math.sin(j*math.pi/12),z) for j in range(13)]
    tint=0xe6bd83 if dawn else 0x5b819e
    m.mesh('glass','Arched glazed windows',points,[tuple(range(len(points)))],tint,shadow=False)
    path=points+[points[0]]
    m.sweep('Sculpted walnut window trim',path,[.053]*len(path),OAK,'wood',sides=6)
    m.box('Arched window sill',(x,lo-.085,z+.04),(1.59,.098,.26),0xa58a68,'wood')
    m.pole('Window mullions',(x,lo,z+.057),(x,cap,z+.057),.022,WALNUT,'wood',sides=5)
    for y in (1.72,2.32,2.62):
        m.pole('Window transoms',(x-w,y,z+.057),(x+w,y,z+.057),.021,WALNUT,'wood',sides=5)


def room(m,windows,dawn):
    m.ground('tile',0xa79c8b,-.030,13.5,16.9,-1.75)
    indoor_floor(m,'Hand-laid limestone square tiles',TILES,-8.90)
    for side in (-1,1):
        x=side*5.82
        m.box('Deep teal gallery side walls',(x,2.12,-1.59),(.30,4.25,15.76),TEAL,'plaster',shadow=not dawn)
        m.box('Walnut wall panels',(x-side*.135,.57,-1.59),(.18,1.095,15.83),WALNUT,'wood')
        for y in (.10,1.14):
            m.box('Walnut wainscoting rails',(x-side*.236,y,-1.59),(.12,.104,15.93),OAK,'wood')
        for i in range(12):
            z=-8.83+i*1.32
            m.box('Raised walnut wall panel',(x-side*.243,.56,z),(.091,.73,1.14),0x785537,'wood')
            m.box('Recessed walnut wall panel',(x-side*.298,.56,z),(.042,.565,.97),0x64462f,'wood')
    m.box('Walnut ceiling',(0,4.24,-1.67),(11.81,.21,15.91),0x74583e,'wood',shadow=not dawn)
    m.box('Entry wall',(0,2.11,6.43),(11.83,4.21,.26),TEAL,'plaster')
    m.box('Rear wall under windows',(0,.525,-9.32),(11.80,1.05,.22),TEAL,'plaster',bevel=False)
    m.box('Rear wall over arched windows',(0,3.72,-9.32),(11.81,1.08,.22),TEAL,'plaster',bevel=False)
    edge=-5.90
    for x in (*windows,6.62):
        right=x-.68
        m.box('Rear wall between the windows',((edge+right)*.5,2.11,-9.32),
              (max(.016,right-edge),2.17,.225),TEAL,'plaster',bevel=False)
        if x<6:
            arch_window(m,x,-9.25,dawn)
            # Separate arch shoulders close the wall around the curved window head.
            arc=[(x+.68*math.cos(j*math.pi/14),2.64+.56*math.sin(j*math.pi/14),-9.28)
                 for j in range(15)]
            for i in range(14):
                a,b=arc[i:i+2]
                m.mesh('plaster','Plaster above window arch',[a,b,(b[0],3.29,-9.28),(a[0],3.29,-9.28)],
                       [(0,1,2,3)],TEAL,shadow=not dawn)
        edge=x+.68
    for k in range(13):
        X=-13+k*2.2
        m.rock('Distant view beyond gallery windows',(X,-.38,-16),
               (m.rand.uniform(.95,2.2),m.rand.uniform(.91,2.35),m.rand.uniform(.9,2.9)),
               0x808286 if dawn else 0x344c63,'rock',shadow=False)


def shelf(m,x,z,width=2.18):
    h=2.53
    m.box('Walnut bookcase backing',(x,h/2,z-.29),(width,h,.10),WALNUT,'wood')
    for sign in (-1,1):
        m.box('Walnut bookcase sides',(x+sign*(width/2-.054),h/2,z),(.106,h,.62),WALNUT,'wood')
    for row in range(6):
        Y=.136+row*.439
        m.box('Walnut book shelves',(x,Y,z),(width,.072,.60),OAK,'wood')
        if row==5:
            continue
        # Volumes have individual widths, cloth colours, page blocks, and spine rules.
        X=x-width/2+.128
        while X<x+width/2-.15:
            w=m.rand.uniform(.077,.171)
            h=m.rand.uniform(.205,.364)
            d=m.rand.uniform(.27,.391)
            z0=z+.06+m.rand.uniform(-.04,.045)
            c=m.rand.choice(BOOKS)
            m.box('Individual cloth book spines',(X+w*.5,Y+.039+h*.5,z0),(w,h,d),c,'paper',bevel=False,shadow=False)
            m.box('Fore edge of book pages',(X+w*.5,Y+.041+h*.51,z0-d*.34),(w*.76,h*.90,d*.42),
                  0xb5a78c,'paper',bevel=False,shadow=False)
            for v in (.78,.90):
                m.box('Faded spine gilding',(X+w*.5,Y+.041+h*v,z0+d*.51),(w*.69,.009,.007),
                      0xb9a17c,'brass',bevel=False,shadow=False)
            X+=w+m.rand.uniform(.016,.047)
    m.block(x,z,width,.64)


def sheets(m,x,y,z):
    cover=0x4d5142
    m.box('Green cover of accession ledger',(x,y,z),(1.26,.051,.74),cover,'paper')
    for side in (-1,1):
        for page in (0,1,2,3):
            Y=y+.027+page*.005
            vertices=[]
            faces=[]
            for i in range(9):
                u=i/8
                X=x+side*(.023+u*.575)
                arch=.065*math.sin(u*math.pi)*.54+.016*(1-u)
                vertices.extend([(X,Y+arch,z-.341),(X,Y+arch,z+.341)])
                if i:
                    end=len(vertices)-1
                    faces.append((end,end-1,end-3,end-2))
            m.mesh('paper','Curved pages of the original register',vertices,faces,
                   (0x887752,0xb6a47c,0xcbb68a,IVORY)[page],soft=True,shadow=False)
        for row in range(11):
            Z=z-.280+row*.051
            for u,w in ((.15,.148),(.438,.054)):
                X=x+side*u
                Y=y+.064+.031*math.sin(u/.575*math.pi)
                m.box('Register ruled lines',(X,Y,Z),(w,.002,.0033),0x9f8c69,'paper',bevel=False,shadow=False)
    for side,code in ((-1,'W07'),(1,'E12')):
        m.text('Ledger accession '+code,code,(x+side*.255,y+.078,z-.235),0x554a37,.076,tilt=-math.pi/2)


def conservation_desk(m):
    worktable(m,.18,-.37,3.20,1.30,.93)
    m.box('Gray conservation mat',(.18,.996,-.37),(2.92,.023,1.087),0x596065,'paper')
    compass(m,-.69,1.091,-.41,1.0)
    tile(m,.01,1.034,-.39,.80)
    for j,when in enumerate(('20:10','20:20')):
        x=.62+j*.42
        z=-.42+.10*j
        m.box('Archive photo printer paper',(x,1.016,z),(.371,.014,.292),IVORY,'paper',yaw=.099-j*.14)
        m.box('Dark photographic image area',(x,1.025,z-.02),(.302,.007,.198),0x71695a,'paper',shadow=False)
        for k in range(4):
            m.box('Old gallery shapes in photographs',(x-.104+k*.061,1.030,z-.034),
                  (.033,.0039,.089+k*.019),0xa89678,'paper',shadow=False)
        m.text('Time on archival photo '+when,when,(x,1.028,z+.094),0x4d4032,.053,tilt=-math.pi/2)
    X,Z=1.56,-.83
    m.lathe('Conservation task lamp base',X,Z,[(1.01,.16),(1.048,.17),(1.08,.134),(1.08,0)],
            BRASS,'brass',sides=20)
    m.sweep('Curved brass task lamp arm',[(X,1.08,Z),(X,1.39,Z),(X-.065,1.66,Z),
            (X-.21,1.82,Z),(X-.37,1.86,Z)],[.024]*5,BRASS,'brass')
    m.lathe('Shade of the lit task lamp',X-.37,Z,[(1.71,.212),(1.78,.208),(1.90,.062)],
            BRASS,'brass',sides=21)
    m.lathe('Lit interior of the task lamp',X-.37,Z,[(1.705,0),(1.705,.186)],
            0xffdba8,'lamp',sides=20,shadow=False)
    m.light_at(X-.37,1.67,Z,0xffc287,13,3.5)
    for x in (-4.11,3.87):
        m.box('Collection drawer cabinets',(x,.94,-5.67),(2.20,1.88,.65),WALNUT,'wood')
        for row in range(7):
            Y=.23+row*.228
            for side in (-1,1):
                X=x+side*.518
                m.box('Drawer fronts',(X,Y,-5.30),(1.00,.193,.066),OAK,'wood')
                m.box('Drawer handle label holder',(X,Y,-5.253),(.155,.081,.022),BRASS,'brass',shadow=False)
                m.box('Drawer label paper',(X,Y+.011,-5.238),(.108,.042,.011),IVORY,'paper',shadow=False)
        m.block(x,-5.67,2.20,.73)


def build(scene,act):
    dawn=act==3
    gallery=act in (0,3)
    names=['Gallery after closing','Accession archive','Conservation bench','Gallery at opening time']
    light=profile(sky(0x819db1,0xe7b48a,0xffdcab,0x9b9eae,glow=.48,solar=.17) if dawn else
                  sky(0x21354c,0x5b7184,0x77889d,0x344859,cover=.42,glow=.0),
                  0xffd4a1 if dawn else 0xffe4bd,[-5,5,-12] if dawn else [-3,7,3],
                  strength=3.60 if dawn else .76,haze=.008,ground=0x8a7367,
                  fill=0xdfe9ef if dawn else 0xc7c1b7,ambient=1.41 if dawn else 1.06,
                  bounce=.85 if dawn else .76)
    m=Map(scene,'museum',act,names[act],(0,1.67,4.23 if gallery else 4.17),
          (0,1.31,-2.1 if gallery else -2.35),[-5.44,5.44,-8.90,6.05],light)
    room(m,[-4.35,-2.19,0,2.19,4.35] if gallery else [-1.01,1.03],dawn)
    if gallery:
        for x in (-3.58,3.58):
            m.box('Tall plaster gallery piers',(x,2.0,-4.8),(.48,4.06,.57),0xa58f77,'plaster')
            m.box('Stone foot of gallery piers',(x,.115,-4.8),(.64,.228,.69),0xb0a292,'rock')
            m.block(x,-4.80,.57,.62)
        m.box('Walnut beam across the gallery',(0,3.57,-4.82),(7.55,.29,.42),WALNUT,'wood')
        case(m,-1.26,-.77,'compass','W07' if dawn else 'E12',
             'Western Collection' if dawn else 'Eastern Collection')
        case(m,1.34,-1.37,'tile','E12' if dawn else 'W07',
             'Eastern Collection' if dawn else 'Western Collection')
        for x,z in ((-1.49,-.73),(1.45,-1.23),(0,-5.89)):
            pendant(m,x,z,2.79,4.11)
    elif act==1:
        for x,z in ((-3.60,-7.22),(3.43,-7.22),(-3.96,-3.49),(3.86,-4.07)):
            shelf(m,x,z)
        pendant(m,.07,-.52,2.55)
        pendant(m,2.08,-5.04,2.94)
        worktable(m,.03,-.63,2.48,1.22,.91)
        sheets(m,.03,.974,-.61)
        label(m,.03,.736,.008,'REGISTER','Accession Desk')
    else:
        pendant(m,-.05,-.24,2.76)
        pendant(m,2.09,-5.18,2.94)
        conservation_desk(m)
    return m
