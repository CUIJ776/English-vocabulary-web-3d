"""Blender modeling operations in the game's X, height, Z coordinates."""
import json
import math
import random
from collections import defaultdict
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

SOURCE = Path(__file__).resolve().parent
GAME = SOURCE.parent
TAU = math.tau


def xyz(point):
    return Vector((point[0], -point[2], point[1]))


def color(value):
    rgb = [(value >> offset & 255) / 255 for offset in (16, 8, 0)]
    return tuple(c / 12.92 if c < .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb)


def surface(name, roughness=.76, metal=0, alpha=1, glow=0, texture=None, scale=1):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (.5, .5, .5, alpha)
    material.use_backface_culling = False
    if alpha < 1:
        material.surface_render_method = 'BLENDED'
    tree = material.node_tree
    shader = tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Alpha'].default_value = alpha
    tint = tree.nodes.new('ShaderNodeVertexColor')
    tint.layer_name = 'Tint'
    input_color = tint.outputs['Color']
    if texture:
        directory = GAME / 'assets' / 'world-surfaces'
        base = tree.nodes.new('ShaderNodeTexImage')
        base.image = bpy.data.images.load(str(directory / (texture+'-color.jpg')),check_existing=True)
        blend = tree.nodes.new('ShaderNodeMixRGB')
        blend.blend_type = 'MULTIPLY'
        blend.inputs['Fac'].default_value = 1
        tree.links.new(base.outputs['Color'], blend.inputs[1])
        tree.links.new(input_color, blend.inputs[2])
        input_color = blend.outputs['Color']
        normal = tree.nodes.new('ShaderNodeTexImage')
        normal.image = bpy.data.images.load(str(directory / (texture+'-normal.jpg')),check_existing=True)
        normal.image.colorspace_settings.name = 'Non-Color'
        node = tree.nodes.new('ShaderNodeNormalMap')
        node.inputs['Strength'].default_value = scale
        tree.links.new(normal.outputs['Color'],node.inputs['Color'])
        tree.links.new(node.outputs['Normal'],shader.inputs['Normal'])
    tree.links.new(input_color,shader.inputs['Base Color'])
    if glow:
        shader.inputs['Emission Color'].default_value = (.95,.53,.20,1)
        shader.inputs['Emission Strength'].default_value = glow
    return material


def indoor_stone():
    name='Fine limestone finish'
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    material=surface(name,.77)
    span=192
    image=bpy.data.images.new(name,span,span,alpha=False)
    rng=random.Random(9124)
    pixels=[]
    for y in range(span):
        v=y/span*TAU
        for x in range(span):
            u=x/span*TAU
            grain=.818+.049*math.sin(u*2+v+math.sin(v)*1.05)
            grain+=.028*math.sin(v*3-u*4+.85*math.sin(u*3))+.010*math.sin(u*21+v*15)
            grain+=rng.uniform(-.022,.022)
            pixels.extend((grain,grain*.993,grain*.974,1))
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    tree=material.node_tree
    shader=tree.nodes.get('Principled BSDF')
    tex=tree.nodes.new('ShaderNodeTexImage')
    tex.image=image
    tint=next(node for node in tree.nodes if node.type=='VERTEX_COLOR')
    blend=tree.nodes.new('ShaderNodeMixRGB')
    blend.blend_type='MULTIPLY'
    blend.inputs[0].default_value=1
    tree.links.new(tex.outputs['Color'],blend.inputs[1])
    tree.links.new(tint.outputs['Color'],blend.inputs[2])
    tree.links.new(blend.outputs[0],shader.inputs['Base Color'])
    return material


def make_surfaces():
    return {
        'earth':surface('Soil and leaf litter',texture='forest',scale=.55),
        'rock':surface('Weathered stone',texture='rock',scale=.63),
        'paving':surface('Worn paving',texture='pavers',scale=.73),
        'wood':surface('Grain and timber',texture='boards',scale=.41),
        'tile':indoor_stone(),
        'plaster':surface('Matte plaster',.84),
        'ceramic':surface('Glazed ceramic',.26),
        'leaf':surface('Leaves and moss',.94),
        'petal':surface('Flower petals',.63),
        'iron':surface('Painted iron',.40,.37),
        'brass':surface('Brushed brass',.34,.40),
        'glass':surface('Clear glazing',.17,.04,.13),
        'water':surface('Water surface',.23,.11),
        'beam':surface('Soft glow from the beacon',.67,alpha=.11,glow=.29),
        'puddle':surface('Wet depressions',.24,.22,.31),
        'lamp':surface('Amber lamps and windows',.39,glow=1.35),
        'screen':surface('Instrument display',.45),
        'paper':surface('Paper and book cloth',.91),
    }


def primitive(kind):
    bm=bmesh.new()
    if kind in ('box','bevel'):
        bmesh.ops.create_cube(bm,size=1)
        if kind=='bevel':
            bmesh.ops.bevel(bm,geom=list(bm.edges),offset=.086,segments=1,affect='EDGES')
    elif kind in ('bud','rock','round'):
        bmesh.ops.create_icosphere(bm,subdivisions={'bud':1,'rock':2,'round':3}[kind],radius=1)
    bm.verts.index_update()
    verts=[tuple(v.co) for v in bm.verts]
    faces=[tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts,faces


PRIMITIVES={kind:primitive(kind) for kind in ('box','bevel','bud','rock','round')}


class Mesh:
    def __init__(self):
        self.vertices=[]
        self.faces=[]
        self.colors=[]
        self.smooth=[]

    def append(self, vertices, faces, tint, smooth):
        start=len(self.vertices)
        self.vertices.extend(vertices)
        self.faces.extend(tuple(start+i for i in face) for face in faces)
        self.colors.extend(tint if isinstance(tint,list) else [tint]*len(vertices))
        self.smooth.extend([smooth]*len(faces))


class Map:
    def __init__(self, scene, story, act, display, spawn, look, bounds, light):
        self.scene=scene
        self.story=story
        self.act=act
        self.rand=random.Random(2609+act*213+sum(ord(c) for c in story)*74)
        self.meshes=defaultdict(Mesh)
        self.materials=make_surfaces()
        self.blocks=[]
        self.lights=[]
        self.objects=[]
        self.light=light
        self.spawn=spawn
        self.look=look
        self.bounds=bounds
        self.root=self.empty(display)
        self.root['mapId']=f'{story}-{act}'
        self.root['label']=display

    def empty(self, name, point=(0,0,0)):
        obj=bpy.data.objects.new(name,None)
        obj.empty_display_type='PLAIN_AXES'
        obj.location=xyz(point)
        self.scene.collection.objects.link(obj)
        self.objects.append(obj)
        if hasattr(self,'root'):
            obj.parent=self.root
        return obj

    def mesh(self, material, label, vertices, faces, tint, *, soft=False, shadow=True, part=None):
        shades=[color(c) for c in tint] if isinstance(tint,list) else color(tint)
        self.meshes[(material,label,shadow,part)].append(vertices,faces,shades,soft)

    def box(self, label, point, size, tint, mat='plaster', *, bevel=True, yaw=0, tilt=0, shadow=True, part=None):
        verts,faces=PRIMITIVES['bevel' if bevel else 'box']
        px,py,pz=point
        dx,dy,dz=size
        a,b=math.cos(yaw),math.sin(yaw)
        c,d=math.cos(tilt),math.sin(tilt)
        vertices=[]
        for x,y,z in verts:
            x,y,z=x*dx,y*dy,z*dz
            y,z=y*c-z*d,y*d+z*c
            vertices.append((px+x*a+z*b,py+y,pz+z*a-x*b))
        self.mesh(mat,label,vertices,faces,tint,shadow=shadow,part=part)

    def rock(self, label, point, size, tint, mat='rock', *, yaw=0, soft=False, small=False, smooth=None, shadow=True, part=None):
        verts,faces=PRIMITIVES['bud' if small else 'round' if soft else 'rock']
        px,py,pz=point
        dx,dy,dz=size
        a,b=math.cos(yaw),math.sin(yaw)
        seed=self.rand.random()*7
        vertices=[]
        for x,y,z in verts:
            shape=1+.11*math.sin(x*11+y*5+z*3+seed)*math.cos(z*7-y*5+seed)
            x,y,z=x*dx*shape,y*dy*shape,z*dz*shape
            vertices.append((px+x*a+z*b,py+y,pz+z*a-x*b))
        self.mesh(mat,label,vertices,faces,tint,soft=soft if smooth is None else smooth,shadow=shadow,part=part)

    def sweep(self, label, points, radii, tint, mat, *, sides=7, shadow=True, part=None):
        """Closed round or tapered section for rails, bark, cords, and hardware."""
        path=[Vector(p) for p in points]
        verts, faces = [], []
        for i, (p, r) in enumerate(zip(path,radii)):
            axis=(path[min(i+1,len(path)-1)]-path[max(0,i-1)]).normalized()
            up=Vector((0,1,0)) if abs(axis.y)<.84 else Vector((1,0,0))
            left=axis.cross(up).normalized()
            forward=axis.cross(left)
            for k in range(sides):
                a=TAU*k/sides
                verts.append(tuple(p+r*(math.cos(a)*left+math.sin(a)*forward)))
                if i:
                    base=(i-1)*sides
                    j=(k+1)%sides
                    faces.append((base+k,base+j,base+j+sides,base+k+sides))
        faces += [tuple(reversed(range(sides))),tuple((len(path)-1)*sides+j for j in range(sides))]
        self.mesh(mat,label,verts,faces,tint,soft=True,shadow=shadow,part=part)

    def pole(self,label,a,b,r,tint,mat='iron',*,end=None,sides=9,shadow=True,part=None):
        self.sweep(label,[a,b],[r,end if end is not None else r],tint,mat,sides=sides,shadow=shadow,part=part)

    def lathe(self,label,x,z,profile,tint,mat,*,sides=24,shadow=True,part=None):
        vertices=[(x+r*math.sin(i*TAU/sides),y,z+r*math.cos(i*TAU/sides))
                  for y,r in profile for i in range(sides)]
        faces=[]
        for row in range(len(profile)-1):
            for i in range(sides):
                a=row*sides+i
                b=row*sides+(i+1)%sides
                faces.append((a,b,b+sides,a+sides))
        self.mesh(mat,label,vertices,faces,tint,soft=True,shadow=shadow,part=part)

    def ground(self, mat, tint, y, width, depth, z=0, *, name='Terrain', x=0):
        self.box(name,(x,y-.12,z),(width,.24,depth),tint,mat,bevel=False,shadow=False)

    def water(self,name,tint,y,width,depth,z,x=0):
        rows=max(4,min(62,math.ceil(depth*2.3)))
        columns=max(8,min(76,math.ceil(width*1.7)))
        vertices=[]
        faces=[]
        for row in range(rows+1):
            for column in range(columns+1):
                vertices.append((x+(column/columns-.5)*width,y,z+(row/rows-.5)*depth))
                if row and column:
                    i=len(vertices)-1
                    stride=columns+1
                    faces.append((i-stride-1,i-1,i,i-stride))
        self.mesh('water',name,vertices,faces,tint,soft=True,shadow=False)

    def block(self,x,z,w,d):
        self.blocks.append([x-w/2,x+w/2,z-d/2,z+d/2])

    def light_at(self,x,y,z,tint,power,radius):
        self.lights.append({'xyz':[x,y,z],'tint':tint,'power':power,'radius':radius})

    def text(self,label,text,point,tint,size,*,tilt=0):
        font=bpy.data.curves.new(label,'FONT')
        font.body=text
        font.align_x='CENTER'
        font.size=size
        font.resolution_u=3
        obj=bpy.data.objects.new(label,font)
        self.scene.collection.objects.link(obj)
        obj.location=xyz(point)
        obj.rotation_euler.x=math.pi/2+tilt
        obj.parent=self.root
        self.objects.append(obj)
        obj.data.materials.append(surface(f'Inscription {tint:06X}',.77))
        tree=obj.data.materials[0].node_tree
        shader=tree.nodes.get('Principled BSDF')
        for link in tuple(shader.inputs['Base Color'].links):
            tree.links.remove(link)
        shader.inputs['Base Color'].default_value=(*color(tint),1)
        obj['cast']=False

    def cycle(self,obj,points):
        for frame, location, rotation in points:
            obj.location=xyz(location)
            obj.rotation_euler=rotation
            obj.keyframe_insert('location',frame=frame)
            obj.keyframe_insert('rotation_euler',frame=frame)

    def finish(self):
        for (kind,label,shade,parent),entry in self.meshes.items():
            data=bpy.data.meshes.new(label)
            data.from_pydata([xyz(v) for v in entry.vertices],[],entry.faces)
            data.update()
            uv=(data.uv_layers.new(name='Surface in metres')
                if kind in ('earth','rock','paving','wood','tile') else None)
            tint=data.color_attributes.new(name='Tint',type='BYTE_COLOR',domain='POINT')
            tint.data.foreach_set('color',[c for rgb in entry.colors for c in (*rgb,1)])
            data.color_attributes.active_color=tint
            for poly, smooth in zip(data.polygons,entry.smooth):
                poly.use_smooth=smooth
                if not uv:
                    continue
                axis=max(range(3),key=lambda i:abs(poly.normal[i]))
                u,v=((1,2),(0,2),(0,1))[axis]
                scale=.47 if kind in ('rock','paving') else .68
                for k in poly.loop_indices:
                    point=data.vertices[data.loops[k].vertex_index].co
                    uv.data[k].uv=(scale*point[u],scale*point[v])
            obj=bpy.data.objects.new(label,data)
            data.materials.append(self.materials[kind])
            self.scene.collection.objects.link(obj)
            obj.parent=parent if parent else self.root
            obj['cast']=shade
            if kind=='water':
                obj['surface']='water'
            self.objects.append(obj)
        self.root['layout']=json.dumps({
            'bounds':self.bounds,'colliders':self.blocks,'spawn':self.spawn,'look':self.look,
            'lights':self.lights,**self.light
        },ensure_ascii=True,separators=(',',':'))


def sections(m,label,span,start,end,height,depth,tint,mat,*,x=0,shadow=False):
    """Staggered flagstones on a level deck with independent bevels and joints."""
    rows=math.ceil((end-start)/depth)
    count=math.ceil(span/.63)
    step=span/count
    for row in range(rows):
        left=x-span*.5
        diff=step*.50 if row%2 else step
        z=start+(row+.5)*depth
        limit=x+span*.5
        while left<limit-.02:
            width=min(diff,limit-left)
            v=m.rand.uniform(.74,.99)
            m.box(label,(left+width*.5,height-.044+v*.014,z),(width-.016,.073,depth-.018),
                  m.rand.choice(tint),mat,yaw=m.rand.uniform(-.017,.017),shadow=shadow)
            left+=width
            diff=step


def indoor_floor(m,label,tints,z,columns=12,rows=16):
    w=.98
    for i in range(columns):
        x=(i-(columns-1)/2)*w
        for j in range(rows):
            m.box(label,(x,-.022,z+j*w),(w-.013,.048,w-.013),
                  m.rand.choice(tints),'tile',bevel=False,shadow=False)


def jetties(m,x,z,width,depth):
    m.box('Pier joists',(x,-.17,z),(width,.31,depth),0x87694e,'wood')
    for i in range(math.ceil(depth/.28)):
        Z=z-depth*.5+.14+i*.28
        m.box('Individual deck planks',(x,-.031,Z),(width,.089,.266),
             m.rand.choice((0xa98c6b,0x9a7d61,0xa08565,0xb59a77)),'wood',shadow=False)


def window(m,label,x,y,z,w,h,frame=0x34404a,*,glow=False,divisions=2):
    depth=.107
    for side in (-1,1):
        m.box(label,(x+side*w*.5,y,z),(.066,h+.089,depth),frame,'wood')
        m.box(label,(x,y+side*h*.5,z),(w+.077,.079,depth),frame,'wood')
    m.box(label,(x,y,z-.005),(w-.058,h-.059,.018),0xffcc81 if glow else 0xb2ced2,
          'lamp' if glow else 'glass',bevel=False,shadow=False)
    for j in range(1,divisions):
        m.box(label,(x-w*.5+w*j/divisions,y,z+.055),(.034,h,.048),frame,'wood')
    m.box(label,(x,y+.075*h,z+.053),(w,.043,.052),frame,'wood')
    m.box(label,(x,y-h*.5-.04,z+.059),(w+.22,.078,.22),0x8a7b64,'rock')


def lantern(m,x,y,z,size=.24,*,tint=0x332b28,power=1):
    m.lathe('Lantern caps',x,z,[(y-size*.71,size*.39),(y-size*.63,size*.46),
              (y-size*.56,size*.37)],tint,'iron',sides=8)
    m.lathe('Lantern caps',x,z,[(y+size*.30,size*.41),(y+size*.50,size*.56),
              (y+size*.72,size*.18),(y+size*.80,.012)],tint,'iron',sides=8)
    m.lathe('Lantern light',x,z,[(y-size*.61,size*.29),(y+size*.46,size*.39)],
              0xffd79c,'lamp',sides=8,shadow=False)
    for a in (math.pi/4,3*math.pi/4,5*math.pi/4,7*math.pi/4):
        sx,sz=math.cos(a),math.sin(a)
        m.pole('Lantern glazing bars',(x+size*.34*sx,y-size*.61,z+size*.34*sz),
               (x+size*.46*sx,y+size*.47,z+size*.46*sz),.009,tint)
    if power:
        m.light_at(x,y,z+.16,0xffb267,power*13*size/.24,4.5)


def pendant(m,x,z,y,ceiling=4.2):
    m.pole('Pendant suspension',(x,y+.23,z),(x,ceiling,z),.020,0x332b28)
    profile=[(y,.37),(y+.053,.37),(y+.13,.326),(y+.203,.256),(y+.26,.119),(y+.27,.036)]
    m.lathe('Hammered copper pendant',x,z,profile,0x7a5637,'brass',sides=28)
    m.lathe('Pendant diffuser',x,z,[(y-.013,0),(y-.018,.253),(y-.012,.343)],
               0xffe3bd,'lamp',sides=24,shadow=False)
    m.light_at(x,y-.19,z,0xffc793,21,7)


def worktable(m,x,z,w,d,y=.91,*,tint=0x796044,steel=False,collision=True):
    mat='iron' if steel else 'wood'
    m.box('Worktop',(x,y,z),(w,.111,d),tint,'wood')
    m.box('Worktop edge',(x,y-.062,z),(w-.03,.044,d-.029),0x6f4c32,'wood')
    for sx in (-1,1):
        for sz in (-1,1):
            m.box('Table legs',(x+sx*(w/2-.16),y*.47,z+sz*(d/2-.13)),
                  (.105,y*.95,.108),0x4e5960 if steel else 0x5d412d,mat)
        m.box('Table apron',(x,y-.149,z+sx*(d*.5-.12)),(w-.14,.139,.115),
              0x55606a if steel else 0x6d4b34,mat)
    if collision:
        m.block(x,z,w,d)


def sky(top,horizon,cloud,shade,*,cover=.43,glow=.18,solar=.28,sun=.72,drift=.75):
    return dict(top=top,horizon=horizon,cloud=cloud,shade=shade,cover=cover,glow=glow,solar=solar,sun=sun,drift=drift)


def profile(sky_data,key,position,*,strength=2.4,haze=.025,ground=0x7e756c,
            fill=0xe2e8f0,ambient=1.33,bounce=.65):
    return dict(sky=sky_data,key=key,keyPosition=position,strength=strength,
                fog=haze,ground=ground,fill=fill,ambient=ambient,bounce=bounce)


def preview(m):
    """Provide a matching camera and lights in each editable Blender scene."""
    sc=m.scene
    sc.unit_settings.system='METRIC'
    sc.frame_start,sc.frame_end=1,121
    sc.render.fps=30
    sc.render.engine='BLENDER_EEVEE' if m.story=='museum' else 'CYCLES'
    if sc.render.engine=='CYCLES':
        sc.cycles.samples=20
        sc.cycles.use_denoising=True
    sc.render.resolution_x,sc.render.resolution_y=1000,634
    sc.render.resolution_percentage=100
    sc.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Sky and ambient bounce')
    world.use_nodes=True
    back=world.node_tree.nodes.get('Background')
    back.inputs['Color'].default_value=(*color(m.light['sky']['horizon']),1)
    back.inputs['Strength'].default_value=m.light['ambient']*.43
    sc.world=world
    lamps=[('Sun','SUN',m.light['keyPosition'],m.light['key'],m.light['strength']*.82)]
    lamps.extend(('Practical light','POINT',l['xyz'],l['tint'],l['power']*2.4) for l in m.lights)
    for label, kind, point, tint, power in lamps:
        data=bpy.data.lights.new(label,kind)
        data.energy=power
        data.color=color(tint)
        if kind=='SUN':
            data.angle=.10
        else:
            data.shadow_soft_size=.25
        obj=bpy.data.objects.new(label,data)
        obj.location=xyz(point)
        obj.rotation_euler=(xyz((0,0,-3))-obj.location).to_track_quat('-Z','Y').to_euler()
        sc.collection.objects.link(obj)
    camera=bpy.data.objects.new('Exploration viewpoint',bpy.data.cameras.new('Exploration viewpoint'))
    camera.location=xyz(m.spawn)
    camera.rotation_euler=(xyz(m.look)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=27
    camera.data.clip_end=140
    sc.collection.objects.link(camera)
    sc.camera=camera
    if bpy.context.screen:
        for area in bpy.context.screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA'
