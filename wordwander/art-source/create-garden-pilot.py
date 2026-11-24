"""Author and export the two garden actors in Blender 5.3.

Run with blender -b --factory-startup --python path/to/this/file.py.
Coordinates in this file use metres, with height as Y and the character facing +Z.
"""
import base64
import math
import re
import struct
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree


SOURCE = Path(__file__).resolve().parent
GAME = SOURCE.parent
EXPORT = GAME / 'assets' / 'garden-actors'


def vector(point):
    x, height, front = point
    return Vector((x, -front, height))


def saturate(value):
    return max(0, min(1, value))


def smooth(value):
    f = saturate(value)
    return f * f * (3 - 2 * f)


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def texture_image(name, sample, non_color=False):
    side = 256
    image = bpy.data.images.new(name, side, side, alpha=False)
    if non_color:
        image.colorspace_settings.name = 'Non-Color'
    pixels = [channel for y in range(side) for x in range(side)
              for channel in (*sample(x / side, y / side), 1)]
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    return image


def material(name, color, roughness=.7, metallic=0, paint=False, texel=None, fibers=None):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    nodes = result.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if paint:
        vertex = nodes.new('ShaderNodeVertexColor')
        vertex.layer_name = 'Paint'
        result.node_tree.links.new(vertex.outputs['Color'], shader.inputs['Base Color'])
    if texel:
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = texture_image(name + ' color', texel)
        result.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    if fibers:
        def nap(u, v):
            sweep = math.tau * (fibers*u+.55*math.sin(v*math.tau*4))
            return (.5+.081*math.sin(sweep)+.020*math.sin(sweep*2+v*120),
                    .5+.038*math.cos(sweep+v*147), .99)

        texture = nodes.new('ShaderNodeTexImage')
        texture.image = texture_image(name + ' normal', nap, non_color=True)
        normal = nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = .47
        result.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
        result.node_tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    return result


def woven(name, color, roughness=.83):
    def swatch(u, v):
        weave = .047 * math.cos(math.tau * (38*u + 29*v)) * math.sin(math.tau * 37*v)
        weave += .025 * math.sin(math.tau * (69*u - 44*v)) + .018 * math.sin(math.tau * (5*u + 7*v))
        return tuple(saturate(c * (1 + weave)) for c in color)
    return material(name, color, roughness, texel=swatch)


def object_mesh(name, vertices, faces, surface, uv=None, colors=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    if uv:
        layer = mesh.uv_layers.new(name='Surface UV')
        for loop in mesh.loops:
            layer.data[loop.index].uv = uv[loop.vertex_index]
    if colors:
        painted = mesh.color_attributes.new(name='Paint', type='FLOAT_COLOR', domain='POINT')
        for i, color in enumerate(colors):
            painted.data[i].color = (*color, 1)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    for face in mesh.polygons:
        face.use_smooth = True
    return obj


def catmull(a, b, c, d, t):
    return .5 * ((2*b) + (-a+c)*t + (2*a-5*b+4*c-d)*t*t + (-a+3*b-3*c+d)*t*t*t)


def tube(name, controls, surface, segments=18, steps=4, sculpt=0, paint=None):
    """Smooth cross sections with a stable usable UV seam and end caps."""
    positions = [vector(point[:3]) for point in controls]
    radii = [Vector(point[3:]) for point in controls]
    rings = steps * (len(controls)-1)

    def section(index):
        segment = min(len(controls)-2, index // steps)
        phase = (index - segment*steps) / steps
        i = max(0, segment-1)
        k = min(len(controls)-1, segment+2)
        return (catmull(positions[i], positions[segment], positions[segment+1], positions[k], phase),
                radii[segment].lerp(radii[segment+1], phase))

    samples = [section(i) for i in range(rings+1)]
    vertices, faces, uv, color = [], [], [], []
    previous = None
    across = Vector((1, 0, 0))
    for row, (center, radius) in enumerate(samples):
        tangent = (samples[min(row+1, rings)][0] - samples[max(row-1, 0)][0]).normalized()
        if previous is not None:
            across = previous.rotation_difference(tangent) @ across
        elif abs(across.dot(tangent)) > .91:
            across = Vector((0, 1, 0))
        across = (across-tangent*across.dot(tangent)).normalized()
        previous = tangent
        depth = tangent.cross(across)
        progress = row/rings
        for col in range(segments):
            angle = col/segments*math.tau
            fold = 1 + sculpt * math.sin(angle*7+progress*4) * math.sin(progress*math.pi)
            point = center + fold*(radius.x*math.cos(angle)*across + radius.y*math.sin(angle)*depth)
            vertices.append(point)
            uv.append((col/segments, progress))
            if paint:
                color.append(paint(point, angle, progress))
            if row<rings:
                a = row*segments+col
                next_col = row*segments+(col+1)%segments
                faces.append((a, next_col, next_col+segments, a+segments))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple(rings*segments+i for i in range(segments)))
    obj = object_mesh(name, vertices, faces, surface, uv, color or None)
    layer = obj.data.uv_layers.active.data
    for row in range(rings):
        seam = obj.data.polygons[(row+1)*segments-1]
        for index in list(seam.loop_indices)[1:3]:
            layer[index].uv.x = 1
    return obj


def drop(name, center, radii, surface, paint=None, reshape=None, rings=24, sides=36):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=sides, ring_count=rings)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    obj.data.materials.append(surface)
    colors = obj.data.color_attributes.new(name='Paint', type='FLOAT_COLOR', domain='POINT') if paint else None
    for vertex in obj.data.vertices:
        x, y, z = vertex.co.x, vertex.co.z, -vertex.co.y
        p = reshape(x, y, z) if reshape else (x, y, z)
        vertex.co = vector(tuple(a+b*c for a, b, c in zip(center, radii, p)))
        if paint:
            colors.data[vertex.index].color = (*paint(x, y, z), 1)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def cord(name, points, radius, surface, segments=7):
    return tube(name, [(*point, radius, radius) for point in points], surface, segments, 3)


def join_meshes(parts):
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    return bpy.context.object


def unify_hand(parts):
    hand = join_meshes(parts)
    hand.data.remesh_voxel_size = .0023
    bpy.ops.object.voxel_remesh()
    smooth_skin = hand.modifiers.new('Relax finger joints', 'SMOOTH')
    smooth_skin.factor, smooth_skin.iterations = .68, 5
    bpy.ops.object.modifier_apply(modifier=smooth_skin.name)
    for face in hand.data.polygons:
        face.use_smooth = True
    return hand


class Rig:
    def __init__(self, name, bones):
        data = bpy.data.armatures.new(name)
        self.obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(self.obj)
        bpy.context.view_layer.objects.active = self.obj
        self.obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        for bone_name, head, tail, parent in bones:
            bone = data.edit_bones.new(bone_name)
            bone.head, bone.tail = vector(head), vector(tail)
            if parent:
                bone.parent = data.edit_bones[parent]
        bpy.ops.object.mode_set(mode='OBJECT')
        self.bones = self.obj.pose.bones
        for bone in self.bones:
            bone.rotation_mode = 'QUATERNION'
        self.obj.show_in_front = True

    def skin(self, obj, assignment):
        obj.parent = self.obj
        modifier = obj.modifiers.new('Skin', 'ARMATURE')
        modifier.object = self.obj
        if isinstance(assignment, str):
            obj.vertex_groups.new(name=assignment).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
            return obj
        groups = {}
        for vertex in obj.data.vertices:
            for name, weight in assignment(vertex.co).items():
                if weight <= .00001:
                    continue
                if name not in groups:
                    groups[name] = obj.vertex_groups.new(name=name)
                groups[name].add([vertex.index], weight, 'REPLACE')
        return obj

    def reset(self):
        for bone in self.bones:
            bone.location = (0, 0, 0)
            bone.rotation_quaternion = (1, 0, 0, 0)
            bone.scale = (1, 1, 1)
        bpy.context.view_layer.update()

    def basis_rotation(self, name):
        bone = self.bones[name]
        rest = bone.bone.matrix_local.to_quaternion()
        if bone.parent:
            return bone.parent.matrix.to_quaternion() @ bone.parent.bone.matrix_local.to_quaternion().inverted() @ rest
        return rest

    def aim(self, name, direction):
        axis = self.basis_rotation(name) @ Vector((0, 1, 0))
        rotation = axis.rotation_difference(direction.normalized())
        basis = self.basis_rotation(name)
        self.bones[name].rotation_quaternion = basis.inverted() @ rotation @ basis
        bpy.context.view_layer.update()

    def world_rotation(self, name, rotation):
        basis = self.basis_rotation(name)
        desired = rotation @ self.bones[name].bone.matrix_local.to_quaternion()
        self.bones[name].rotation_quaternion = basis.inverted() @ desired
        bpy.context.view_layer.update()

    def shift(self, name, offset):
        self.bones[name].location = self.bones[name].bone.matrix_local.to_quaternion().inverted() @ vector(offset)
        bpy.context.view_layer.update()

    def jointed(self, upper, lower, endpoint, pole):
        a, b = self.bones[upper], self.bones[lower]
        origin = a.head.copy()
        offset = endpoint-origin
        reach = min(offset.length, a.length+b.length-.0003)
        reach = max(reach, abs(a.length-b.length)+.0003)
        axis = offset.normalized()
        side = pole-axis*pole.dot(axis)
        distance = (a.length**2-b.length**2+reach**2)/(2*reach)
        joint = origin + distance*axis + math.sqrt(max(0, a.length**2-distance**2))*side.normalized()
        self.aim(upper, joint-origin)
        self.aim(lower, origin+axis*reach-joint)


def chain_weights(point, joints):
    """Blend adjoining bone spans across each sleeve, pant leg or tail joint."""
    start, end = joints[0][1], joints[-1][2]
    lane = end-start
    t = (point-start).dot(lane)/lane.length_squared
    for index, (name, _, tip) in enumerate(joints[:-1]):
        hinge = (tip-start).dot(lane)/lane.length_squared
        width = .115 if len(joints)==2 else .077
        if t<=hinge+width:
            part = smooth((t-hinge+width)/(2*width))
            return {name: 1-part, joints[index+1][0]: part}
    return {joints[-1][0]: 1}


def joint_weights(point, spans, parent, inset, width):
    _, start, end = spans[0]
    forward = (point-start).dot((end-start).normalized())
    influence = smooth((forward+inset)/width)
    return {parent: 1-influence,
            **{bone: value*influence for bone, value in chain_weights(point, spans).items()}}


def actions(rig, poses, frames=(1, 13, 24, 35, 44, 47, 51, 62, 73, 85)):
    scene = bpy.context.scene
    animation = rig.obj.animation_data_create()
    saved = []
    for name, pose in poses:
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        animation.action = action
        for frame in frames:
            scene.frame_set(frame)
            rig.reset()
            phase = (frame-1)/(frames[-1]-1)*math.tau
            blink = max(0, 1-abs(frame-47)/4)
            pose(phase, blink)
            for bone in rig.bones:
                bone.keyframe_insert(data_path='location', frame=frame, group=bone.name)
                bone.keyframe_insert(data_path='rotation_quaternion', frame=frame, group=bone.name)
                bone.keyframe_insert(data_path='scale', frame=frame, group=bone.name)
        saved.append(action)
        animation.action = None
    for action in saved:
        track = animation.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, 1, action)
        strip.blend_type = 'REPLACE'
    scene.frame_start, scene.frame_end = frames[0], frames[-1]
    scene.render.fps = 30
    return saved


def head_source():
    data = (GAME / 'world-head-data.js').read_text(encoding='utf-8')
    arrays = re.findall(r'\[(.*?)\]\.join', data, re.S)
    raw = [base64.b64decode(''.join(re.findall(r"'([^']+)'", group))) for group in arrays]
    if len(raw) != 2:
        raise ValueError('Missing the CC0 MakeHuman head data.')
    return [tuple(v/3000 for v in p) for p in struct.iter_unpack('<hhh', raw[0])], list(struct.iter_unpack('<HHH', raw[1]))


def xiaolin_landmarks(x, y, z, height):
    """Reshape the eye sockets, cheek volume and smile from the four garden paintings."""
    a = abs(x)
    front = smooth((z-.61)/.67)
    dx,dy = a-.321,y-7.293
    eye_sides = math.exp(-(dy/.374)**2)*smooth((a-.046)/.121)
    eye_height = math.exp(-(dx/.237)**2)
    expand_x = front*eye_sides*(.018+.51*dx/(1+(dx/.245)**2))
    expand_y = front*eye_height*.87*dy/(1+(dy/.184)**2)
    cheek = math.exp(-((y-6.95)/.341)**2)
    jaw = max(0,6.952-y)*smooth((y-5.99)/.34)
    mouth = front*math.exp(-((y-6.613)/.244)**2-(a/.355)**4)
    opening = mouth*.022*math.exp(-(a/.186)**4)*math.tanh((y-6.611)/.031)
    smile = .118*(1-math.exp(-(a/.173)**2))*mouth
    outer = (a+expand_x)*(1+.025*cheek+.047*mouth+.025*math.exp(-((y-6.453)/.23)**2))
    nose = .112*math.exp(-((y-6.923)/.280)**2-(a/.20)**2)*smooth((z-1.30)/.35)
    return (math.copysign(outer*.111, x),
            height+(y-7.2+smile+opening+.202*jaw*front+expand_y)*.122,
            (z-.62-nose)*.117)


def xiaolin_hair(rig, height, head, face_positions, faces):
    hair = material('Deep brown • flowing hair', (.029,.014,.009), .57, paint=True, fibers=74)
    tan = material('Ochre woven hair tie', (.294,.164,.058), .69)
    def hair_color(peak, flow):
        return mix((.012,.0054,.0036),(.057,.024,.012),.23+.48*peak+.17*flow)

    def margin(i):
        x, depth, y = face_positions[i]
        front = smooth((-depth+.010)/.072)
        part = .043 * (1-smooth((abs(x+.011)-.004)/.056))
        ear = .048*smooth((abs(x)-.068)/.019)*math.exp(-((depth-.004)/.031)**2)
        line = -.066 + (.176+part)*front + ear
        return y-height-line

    hair_verts, hair_colors, hair_faces, hair_uv = [], [], [], []
    for a,b,c in faces:
        tri = [(face_positions[i],margin(i),head.data.vertices[i].normal) for i in (a,b,c)]
        clipped = []
        for j,(p,m,n) in enumerate(tri):
            q,o,k = tri[(j+1)%3]
            if m>=0:
                clipped.append((p,m,n))
            if (m>=0) != (o>=0):
                alpha = m/(m-o)
                clipped.append((p.lerp(q,alpha),0,n.lerp(k,alpha)))
        if len(clipped)<3:
            continue
        ids = []
        for p,m,n in clipped:
            sweep = math.atan2(p.x+.014,-p.y+.040)
            flow = sweep+(p.z-height)*6.4
            ridge = .63*math.sin(flow*15)+.37*math.sin(flow*29+p.z*20)
            thickness = .003+(.016+.0031*ridge)*smooth(m/.040)
            ids.append(len(hair_verts))
            hair_verts.append(p+thickness*n)
            hair_uv.append(((sweep+math.pi)/math.tau,(p.z-height+.1)*3.5))
            hair_colors.append(hair_color(.5+.5*ridge,.36))
        hair_faces.append(tuple(ids))
    scalp = object_mesh('Xiaolin • sculpted hair cap', hair_verts, hair_faces, hair, hair_uv, hair_colors)
    for face in scalp.data.polygons:
        layer = scalp.data.uv_layers.active.data
        indices = list(face.loop_indices)
        if max(layer[i].uv.x for i in indices)-min(layer[i].uv.x for i in indices)>.5:
            for i in indices:
                if layer[i].uv.x<.5:
                    layer[i].uv.x+=1
    bpy.context.view_layer.objects.active = scalp
    scalp.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.00004)
    bpy.ops.object.mode_set(mode='OBJECT')
    refine = scalp.modifiers.new('Smooth sculpted locks', 'SUBSURF')
    refine.levels = 1
    bpy.ops.object.modifier_apply(modifier=refine.name)
    rig.skin(scalp, 'head')
    def lock(name, path, bone, phase=0, segments=15):
        def paint(point, angle, along):
            return hair_color(.5+.5*math.cos(angle*2.7+phase+along*3),
                              .43+.48*math.sin(angle*7+phase+along*1.8))

        sections = [(x,height+y,z,w,d) for x,y,z,w,d in path]
        rig.skin(tube(name,sections,hair,segments,6,.055,paint),bone)

    lock('Long curtain bang on her left',[
        (-.011,.164,.005,.008,.008),(-.024,.153,.062,.025,.015),
        (-.056,.115,.091,.025,.013),(-.079,.072,.081,.018,.010),
        (-.087,.021,.069,.009,.0055),(-.088,-.030,.070,.0039,.003),(-.077,-.065,.079,.0004,.0005)],'head',.5,20)
    lock('Swept bangs on her right',[
        (-.008,.165,.013,.008,.008),(.024,.150,.060,.028,.016),
        (.061,.111,.084,.026,.014),(.079,.068,.076,.020,.010),
        (.090,.027,.055,.008,.007),(.091,.002,.045,.004,.003),(.087,-.032,.048,.0004,.0004)],'head',1.6,20)
    lock('Soft central forelock',[
        (-.008,.155,.028,.008,.008),(-.016,.135,.080,.012,.008),
        (-.038,.093,.102,.009,.006),(-.052,.059,.102,.004,.003),
        (-.056,.038,.100,.0004,.0004)],'head',2.2)
    lock('Loose crossing fringe',[
        (-.010,.151,.057,.005,.004),(-.014,.123,.096,.009,.005),
        (-.026,.089,.110,.0064,.004),(-.046,.063,.107,.0030,.0023),
        (-.067,.049,.093,.00032,.0004)],'head',3.1,11)
    lock('Loose fringe beside the right temple',[
        (.012,.149,.040,.005,.005),(.034,.124,.089,.010,.006),
        (.052,.088,.102,.008,.004),(.065,.063,.092,.004,.0024),
        (.074,.041,.077,.0003,.0005)],'head',1.1,11)
    lock('Swept side section',[
        (.011,.164,-.009,.013,.009),(.048,.143,.039,.028,.013),
        (.075,.107,.051,.023,.011),(.088,.069,.038,.018,.009),(.086,.046,.006,.009,.003)],'head',.9)
    lock('Cheek wisp left',[
        (-.068,.091,.087,.0024,.0020),(-.092,.046,.076,.0027,.0019),
        (-.096,.013,.062,.0019,.0014),(-.090,-.037,.055,.0012,.0009),(-.081,-.073,.065,.0002,.0002)],'head',.9,8)
    lock('Cheek wisp right',[
        (.074,.097,.076,.0028,.0024),(.095,.050,.069,.0025,.0018),
        (.099,.012,.047,.0018,.0011),(.097,-.027,.045,.0011,.0008),(.107,-.056,.059,.0002,.0002)],'head',2.4,8)
    lock('High swept ponytail',[
        (-.019,.132,-.080,.024,.027),(-.015,.162,-.123,.023,.023),
        (-.020,.185,-.157,.035,.034),(-.031,.169,-.206,.047,.038),
        (-.040,.105,-.240,.044,.032),(-.049,.009,-.251,.038,.026),
        (-.075,-.093,-.276,.027,.016),(-.112,-.164,-.287,.017,.010),
        (-.154,-.196,-.317,.001,.001)],'hair',1.4,24)
    lock('Loose ponytail section',[
        (.002,.170,-.149,.007,.010),(.008,.180,-.185,.017,.011),(-.002,.136,-.230,.017,.012),
        (-.014,.052,-.264,.013,.010),(-.037,-.040,-.281,.011,.008),(-.085,-.132,-.309,.007,.005),
        (-.118,-.178,-.337,.0006,.001)],'hair',2.3)
    lock('Tapered ponytail end',[
        (-.053,.116,-.245,.009,.008),(-.063,.012,-.265,.012,.008),
        (-.104,-.101,-.285,.010,.007),(-.126,-.158,-.304,.006,.0045),
        (-.169,-.179,-.327,.0003,.0004)],'hair',3.3)
    rig.skin(tube('Woven elastic around the ponytail',[
        (-.015,height+.151,-.110,.024,.021),(-.016,height+.162,-.127,.025,.024),
        (-.016,height+.165,-.132,.024,.023)],tan,26,4),'head')


def human_head(rig, skin_tone, head_height):
    coords, faces = head_source()
    skin = material('Skin • warm cheeks and lip tones',skin_tone,.61,paint=True)
    colors = []
    for x,y,z in coords:
        front = smooth((z-.95)/.43)
        lip = math.exp(-((y-6.613)/.097)**2-(x/.218)**4)*smooth((z-1.31)/.18)
        cheek = math.exp(-((abs(x)-.498)/.25)**2-((y-6.995)/.24)**2)*front
        lower_lid = math.exp(-((abs(x)-.34)/.24)**2-((y-7.210)/.102)**2)*front
        interior = math.exp(-((y-6.611)/.079)**4-(x/.220)**4)*smooth((1.541-z)/.073)
        color = mix(skin_tone,(.48,.136,.096),.59*lip)
        color = mix(color,(.617,.219,.154),.51*cheek+.21*lower_lid)
        colors.append(mix(color,(.064,.010,.010),.88*interior))

    def locate(x,y,z):
        return xiaolin_landmarks(x,y,z,head_height)

    positions = [vector(locate(*point)) for point in coords]
    head = object_mesh('Xiaolin • soft cheek and eye contour',positions,faces,skin,colors=colors)
    cheek_group = head.vertex_groups.new(name='Cheek contour smoothing')
    for i,point in enumerate(positions):
        weight = math.exp(-((abs(point.x)-.048)/.023)**4-((point.z-head_height+.046)/.037)**4)
        weight *= smooth((-point.y-.047)/.033)
        if weight>.001:
            cheek_group.add([i],weight,'REPLACE')
    bpy.context.view_layer.objects.active = head
    head.select_set(True)
    cheek_smooth = head.modifiers.new('Soften the smile into the cheeks','SMOOTH')
    cheek_smooth.vertex_group = cheek_group.name
    cheek_smooth.factor = .72
    cheek_smooth.iterations = 9
    bpy.ops.object.modifier_apply(modifier=cheek_smooth.name)
    temporary_weights = head.vertex_groups.get('Cheek contour smoothing')
    if temporary_weights:
        head.vertex_groups.remove(temporary_weights)
    positions = [vertex.co.copy() for vertex in head.data.vertices]

    def skin_weights(point):
        x,y,z = point.x,point.z-head_height,-point.y
        area = math.exp(-((abs(x)-.038)/.025)**4-((y-.023)/.030)**4)*smooth((z-.065)/.018)
        lid = area*smooth((y-.010)/.014)
        return {'head':1-lid,'lid.R' if x>0 else 'lid.L':lid}

    rig.skin(head,skin_weights)
    xiaolin_hair(rig,head_height,head,positions,faces)
    cornea = material('Wet cornea with brown iris',(.846,.747,.653),.24,paint=True)
    brow = material('Brown eyebrow hair',(.041,.015,.007),.69)
    lashes = material('Lash line',(.055,.019,.009),.68)

    def eye_color(x,y,z):
        u,v = (x*.026+.0018)/.0131,(y*.0199+.0001)/.0136
        radius = math.hypot(u,v)
        angle = math.atan2(v,u)
        white = mix((.850,.754,.674),(.730,.445,.368),.26*smooth((abs(x)-.67)/.31))
        if z<=0:
            return white
        spokes = .58+.26*math.sin(angle*23+radius*8)+.15*math.sin(angle*38-radius*5)
        iris = mix((.068,.020,.008),(.268,.092,.028),spokes)
        iris = mix(iris,(.021,.007,.004),.88*smooth((radius-.72)/.25))
        iris = mix((.007,.004,.002),iris,smooth((radius-.51)/.13))
        fleck = 1-smooth((math.hypot(u+.31,v-.37)-.060)/.098)
        iris = mix(iris,(.92,.84,.72),fleck*.81)
        return mix(iris,white,smooth((radius-.92)/.15))

    for side, letter in ((-1,'L'),(1,'R')):
        x,y,z = locate(side*.321,7.293,1.211)
        rig.skin(drop('Continuous painted eyeball '+letter,(x,y,z),(.026,.0199,.0212),cornea,eye_color,
                      reshape=lambda x,y,z:(x,y,z-side*.26*x),rings=28,sides=45),'eye.'+letter)
        browline = [(.156,7.468,1.480),(.247,7.515,1.465),(.342,7.522,1.432),
                    (.442,7.479,1.382),(.533,7.427,1.281)]
        rig.skin(tube('Arched eyebrow '+letter,[(*locate(side*x,y,z),r,r*.47)
                 for (x,y,z),r in zip(browline,(.0012,.0030,.0028,.0018,.00025))],brow,9,5),'head')
        lashline = [(.198,7.281,1.391),(.237,7.315,1.406),(.292,7.331,1.403),
                    (.348,7.334,1.398),(.385,7.321,1.393),(.420,7.303,1.370)]
        rig.skin(tube('Fine upper lashes '+letter,[(*locate(side*x,y,z+.006),r,r*.66)
                 for (x,y,z),r in zip(lashline,(.00016,.00074,.00093,.00091,.00078,.00013))],
                 lashes,8,4),'lid.'+letter)

    enamel = material('Ivory edge of the smile',(.79,.66,.52),.37)
    tooth_rim = []
    for column in range(17):
        t = column/8-1
        x = t*.158
        a,b,c = locate(x,6.610+.013*t*t,1.561-.087*t*t)
        tooth_rim.extend([vector((a,b+.0020,c)),vector((a,b-.0009-.0024*(1-t*t),c-.0005))])
    rig.skin(object_mesh('Upper teeth inside the smile',tooth_rim,
             [(i,i+1,i+3,i+2) for i in range(0,32,2)],enamel),'head')
    face_surface = BVHTree.FromPolygons(positions,faces,all_triangles=True)
    freckle = material('Faint warm freckles',(.409,.164,.088),.76)
    vertices, triangles = [], []
    for side in (-1,1):
        for i in range(13):
            x = side*(.029+.0035*i+.003*math.sin(i*3.1+side))
            y = head_height-.020 + .0086*math.sin(i*4.15+side)+.00071*i
            p,n,_,_ = face_surface.ray_cast(Vector((x,-.23,y)),Vector((0,1,0)),.25)
            if p is None:
                continue
            size = .00031+.00028*(.5+.5*math.sin(i*8.0+side))
            start = len(vertices)
            p += n*.00021
            tangent = n.cross(Vector((0,0,1))).normalized()
            across = n.cross(tangent)
            vertices.append(p)
            for k in range(5):
                a = math.tau*k/5
                vertices.append(p+size*(tangent*math.cos(a)+across*.8*math.sin(a)))
                triangles.append((start,start+1+k,start+1+(k+1)%5))
    rig.skin(object_mesh('Freckles across the cheeks',vertices,triangles,freckle),'head')


def jacket_edge(y):
    return .073+.46*smooth((y-1.128)/.174)+.37*smooth((y-1.249)/.082)


def open_jacket(sections, cloth):
    """The front opening exposes the sweater; the coat has real cloth edges."""
    vertices, faces, uv = [], [], []
    panels = 48
    for index,(a,b) in enumerate(zip(sections,sections[1:])):
        previous = Vector(sections[max(0,index-1)])
        following = Vector(sections[min(len(sections)-1,index+2)])
        for row in range(6 if index==len(sections)-2 else 5):
            y,z,rx,rz = catmull(previous,Vector(a),Vector(b),following,row/5)
            gap = jacket_edge(y)
            for panel in range(panels+1):
                u = panel/panels
                angle = gap+(math.tau-2*gap)*u
                fold = 1+.019*math.sin(angle*6+y*7)+.014*math.sin(angle*11-y*14)
                ease = .123*math.exp(-((y-.817)/.088)**2)*abs(math.sin(angle))**3
                vertices.append(vector((rx*math.sin(angle)*(fold+ease),y,z+rz*math.cos(angle)*fold)))
                uv.append((u,(y-sections[0][0])/(sections[-1][0]-sections[0][0])))
                count = len(vertices)-1
                if index*5+row>0 and panel>0:
                    lower = count-(panels+1)
                    faces.append((lower-1,lower,count,count-1))
    jacket = object_mesh('Mustard coat • open weighted panels',vertices,faces,cloth,uv)
    bpy.context.view_layer.objects.active = jacket
    jacket.select_set(True)
    thickness = jacket.modifiers.new('Woven cloth edge','SOLIDIFY')
    thickness.thickness = .004
    bpy.ops.object.modifier_apply(modifier=thickness.name)
    return jacket


def make_satchel(rig, canvas, edging, brass, leather, attach):
    def cut(x,y,z):
        return tuple(math.copysign(abs(v)**e,v) for v,e in zip((x,y,z),(.61,.69,.74)))

    rig.skin(drop('Olive crossbody bag • rounded canvas body',(-.239,.810,.067),(.137,.114,.065),
                  canvas,reshape=cut,rings=24,sides=36),'satchel')
    rig.skin(drop('Lined flap over the front of the bag',(-.243,.858,.116),(.133,.065,.029),
                  edging,reshape=cut,rings=24,sides=36),'satchel')
    rig.skin(cord('Bound front edge of the flap',[(-.369,.886,.129),(-.364,.834,.143),
                 (-.340,.813,.148),(-.244,.804,.148),(-.150,.817,.141),(-.124,.850,.135),(-.122,.886,.123)],
                 .0022,canvas,9),'satchel')
    x = -.251
    rig.skin(tube('Brown closure tab',[(x,.856,.143,.013,.003),(x,.830,.149,.013,.0035),
                                      (x,.802,.148,.012,.0035),(x,.771,.138,.009,.003)],leather,10,4),'satchel')
    buckle = [(x-.012,.812,.153),(x-.012,.788,.153),(x+.012,.788,.153),
              (x+.012,.812,.153),(x-.012,.812,.153)]
    rig.skin(cord('Satchel buckle frame',buckle,.00225,brass,8),'satchel')
    rig.skin(cord('Satchel buckle pin',[(x,.791,.155),(x,.807,.156)],.0015,brass),'satchel')
    strap = [(-.221,.895,-.002,.020,.006),(-.169,.969,-.092,.021,.007),
             (-.074,1.116,-.144,.021,.007),(.095,1.244,-.103,.022,.007),(.139,1.315,-.052,.024,.009),
             (.147,1.300,.026,.023,.009),(.133,1.250,.077,.022,.008),
             (.080,1.177,.102,.022,.007),(.001,1.099,.126,.022,.007),
             (-.081,1.024,.119,.022,.007),(-.155,.960,.101,.020,.006),(-.223,.900,.096,.018,.005)]
    rig.skin(tube('Continuous olive crossbody strap',strap,edging,18,6),attach)
    rig.skin(cord('Crossbody adjustment buckle',[(.102,1.207,.105),(.136,1.217,.093),
                  (.148,1.242,.085),(.116,1.233,.100),(.102,1.207,.105)],.00265,brass,8),'chest')


def make_xiaolin():
    head_height = 1.481
    skin = (.653,.365,.225)
    bones = [('pelvis',(0,.847,0),(0,1.01,0),None),('chest',(0,1.01,0),(0,1.337,-.012),'pelvis'),
             ('head',(0,1.338,.003),(0,1.61,.009),'chest'),
             ('hair',(-.016,head_height+.161,-.124),(-.039,head_height+.108,-.233),'head'),
             ('satchel',(-.223,.904,.063),(-.243,.736,.066),'pelvis')]
    arms, legs, walks = {}, {}, {}
    for side, letter in ((-1,'L'),(1,'R')):
        shoulder = (side*.187,1.274,-.014)
        elbow = (side*.275,1.046,.021)
        wrist = (side*.306,.822,.048)
        hip, knee, ankle = (side*.098,.872,-.01),(side*.111,.493,.035),(side*.122,.119,.018)
        arms[letter] = shoulder, elbow, wrist
        legs[letter] = hip, knee, ankle
        walks[letter] = ankle
        bones.extend([('upper.'+letter,shoulder,elbow,'chest'),('fore.'+letter,elbow,wrist,'upper.'+letter),
                      ('hand.'+letter,wrist,(side*.32,.722,.057),'fore.'+letter),
                      ('thigh.'+letter,hip,knee,'pelvis'),('shank.'+letter,knee,ankle,'thigh.'+letter),
                      ('foot.'+letter,ankle,(side*.122,.078,.15),'shank.'+letter),
                      ('hem.'+letter,(side*.178,.902,-.018),(side*.204,.752,-.018),'pelvis'),
                      ('lid.'+letter,(side*.038,head_height+.014,.075),(side*.038,head_height+.068,.075),'head'),
                      ('eye.'+letter,(side*.038,head_height+.011,.071),(side*.038,head_height+.058,.071),'head')])
    rig = Rig('Xiaolin', bones)
    coat = woven('Mustard yellow • brushed hooded coat',(.677,.417,.084))
    binding = woven('Mustard canvas facing',(.565,.331,.066))
    fleece = material('Oatmeal rib knit',(.705,.584,.413),.9,fibers=46)
    seam = material('Ochre topstitch',(.392,.223,.052),.85)
    toggle = material('Brown horn coat fasteners',(.126,.063,.032),.57)
    canvas = woven('Olive-green canvas',(.251,.277,.142))
    lining = woven('Faded olive webbing',(.190,.207,.111))
    pants = woven('Warm umber • twill trousers',(.240,.174,.123))
    leather = woven('Chocolate brown leather',(.187,.115,.069),.76)
    sole = material('Dark rubber soles',(.064,.048,.038),.90)
    metal = material('Brass adjustment hardware',(.442,.302,.131),.43,.43)
    hands = material('Hands', skin, .67)
    nails = material('Nail tips', (.673,.444,.375), .53)
    jacket = [(.735,-.021,.209,.150),(.762,-.019,.211,.152),(.857,-.014,.206,.147),
              (.948,-.018,.179,.122),(1.078,-.018,.172,.133),(1.176,-.011,.195,.129),
              (1.246,-.012,.198,.110),(1.287,-.013,.162,.089),(1.333,-.015,.088,.072)]
    def torso_weights(point):
        chest = smooth((point.z-.87)/.22)
        side = smooth((abs(point.x)-.112)/.098)
        front = smooth((-point.y-.014)/.098)
        hip = (.25+.44*max(side,front))*smooth((.922-point.z)/.164)*smooth((abs(point.x)-.028)/.113)
        hem = .86*side*smooth((.958-point.z)/.143)*(1-.83*front)
        letter = 'R' if point.x>0 else 'L'
        return {'pelvis': (1-chest-hip)*(1-hem), 'chest':chest*(1-hem),
                'thigh.'+letter:hip*(1-hem),'hem.'+letter:hem}

    rig.skin(open_jacket(jacket,coat),torso_weights)
    sweater = [(0,y,z,rx*.83,rz*.94) for y,z,rx,rz in jacket[2:]]
    rig.skin(tube('Oatmeal sweater under the coat',sweater,fleece,34,5,.025),torso_weights)
    def collar_weights(point):
        neck = .62*smooth((point.z-1.306)/.055)
        return {'chest':1-neck,'head':neck}

    rig.skin(tube('Ribbed sweater collar',[(0,1.301,-.009,.088,.074),(0,1.329,-.006,.074,.065),
                (0,1.365,-.004,.058,.057)],fleece,34,6),collar_weights)
    hood = [(-.096,1.280,.066,.002,.003),(-.119,1.300,.035,.017,.016),
            (-.148,1.310,-.034,.037,.032),(-.121,1.292,-.108,.045,.036),
            (-.061,1.287,-.153,.043,.030),(0,1.281,-.171,.038,.028),
            (.070,1.289,-.147,.048,.035),(.131,1.304,-.095,.039,.032),(.155,1.310,-.026,.030,.027),
            (.115,1.302,.040,.018,.015),(.095,1.283,.066,.002,.003)]
    rig.skin(tube('Soft hood folded round the shoulders',hood,coat,26,5,.052),'chest')
    rig.skin(drop('Draped back of the hood',(0,1.245,-.129),(.154,.080,.071),binding,
                  reshape=lambda x,y,z:(x*(.93+.15*y),y,z),rings=18,sides=28),'chest')
    for side in (-1,1):
        opening = [(side*rx*math.sin(jacket_edge(y))*1.009,y,z+rz*math.cos(jacket_edge(y))+.002)
                   for y,z,rx,rz in jacket]
        rig.skin(cord('Stitched front facing',opening,.0030,binding,9),torso_weights)
    for i,(y,z) in enumerate(((.872,.123),(.976,.113),(1.084,.120))):
        rig.skin(cord('Braided toggle loop',[(-.029,y+.004,z-.004),(-.008,y-.007,z+.007),
                      (.019,y-.006,z+.007),(.030,y+.002,z-.004)],.0024,seam),torso_weights)
        button = [(-.007,y+.002,z+.011,.004,.003),(0,y+.004,z+.014,.006,.004),
                  (.020,y+.006+i*.001,z+.013,.004,.003)]
        rig.skin(tube('Rounded coat toggle',button,toggle,10,4),torso_weights)
    for letter, side in (('L',-1),('R',1)):
        shoulder, elbow, wrist = arms[letter]
        span = [('upper.'+letter,vector(shoulder),vector(elbow)),('fore.'+letter,vector(elbow),vector(wrist))]
        weight = lambda point, span=span: joint_weights(point,span,'chest',.048,.127)
        sleeve = [(*mix(shoulder,(0,1.223,-.02),.57),.048,.053),
                  (*mix(shoulder,(0,1.248,-.02),.22),.071,.069),(*shoulder,.073,.077),
                  (*mix(shoulder,elbow,.52),.065,.066),(*elbow,.056,.052),
                  (*mix(elbow,wrist,.52),.049,.048),(*mix(elbow,wrist,.88),.044,.043)]
        rig.skin(tube('Tailored sleeve '+letter,sleeve,coat,26,5,.041),weight)
        rig.skin(tube('Fold-over yellow coat cuff '+letter,[(*mix(elbow,wrist,.719),.050,.049),
                    (*mix(elbow,wrist,.869),.049,.047),(*mix(elbow,wrist,.914),.044,.044)],binding,25,6),
                 'fore.'+letter)
        rig.skin(tube('Oatmeal knit showing at the wrist '+letter,[(*mix(elbow,wrist,.853),.038,.037),
                    (*mix(elbow,wrist,.941),.035,.034),(*mix(elbow,wrist,1.035),.032,.030)],fleece,24,7),
                 'fore.'+letter)
        rig.skin(cord('Pocket stitching '+letter,[
            (side*.095,.868,.089),(side*.108,.906,.094),(side*.121,.951,.082),(side*.128,.982,.074)],.0016,seam),torso_weights)
        hip,knee,ankle = legs[letter]
        span = [('thigh.'+letter,vector(hip),vector(knee)),('shank.'+letter,vector(knee),vector(ankle))]
        rig.skin(tube('Twill leg '+letter,[(side*.075,.931,-.018,.073,.072),(*hip,.083,.086),
                  (*mix(hip,knee,.45),.082,.081),(*knee,.069,.066),
                  (*mix(knee,ankle,.52),.060,.062),(*ankle,.053,.049)],pants,26,5,.042),
                 lambda point, span=span:joint_weights(point,span,'pelvis',.020,.153))
        x = ankle[0]
        def boot_shape(x,y,z):
            return x*(1+.11*z), max(-.47,y*(1.04-.47*smooth((z+.07)/.84))), z

        rig.skin(drop('Boot upper '+letter,(x,.069,.077),(.067,.095,.129),leather,reshape=boot_shape, rings=22,sides=30),'foot.'+letter)
        rig.skin(drop('Boot sole '+letter,(x,.028,.078),(.071,.027,.133),sole,
                      reshape=lambda x,y,z:(x*(1+.11*z),max(-.86,y*.79),z), rings=14,sides=29),'foot.'+letter)
        rig.skin(tube('Leather ankle collar '+letter,[(x,.093,.015,.058,.062),(x,.135,.018,.052,.054),
                      (x,.151,.018,.048,.046)],leather,23,4),'foot.'+letter)
        for lace in range(4):
            z = .093+lace*.016
            toe = (z-.077)/.129
            h = .072+.095*(1.04-.47*smooth((toe+.07)/.84))*math.sqrt(1-toe*toe)
            rig.skin(cord('Lace '+letter,[(x-.025,h-.008,z),(x,h,z+.004),(x+.025,h-.007,z-.004)],.0025,lining),'foot.'+letter)
        x,y,z = wrist
        pieces = [tube('Palm and fingers '+letter,[(x,y+.006,z,.026,.023),(x+side*.005,y-.022,z+.002,.032,.018),
                       (x+side*.007,y-.050,z+.006,.030,.015),(x+side*.008,y-.063,z+.007,.025,.012)],hands,24)]
        for finger,length in enumerate((.036,.048,.051,.043)):
            delta = (finger-1.5)*.0158*side
            base = x+side*.006+delta
            tip = base+delta*.21
            pieces.append(tube(f'Finger {finger+1} {letter}',[(base,y-.048,z+.008,.0092,.0091),
                   (base,y-.056-length*.45,z+.012,.0077,.0075),
                   (tip,y-.061-length*.80,z+.020,.0061,.0062),(tip,y-.061-length,z+.024,.0022,.0025)],hands,12))
            rig.skin(drop('Nail '+letter,(tip,y-.061-length*.78,z+.0133),(.0038,.0055,.0016),nails,rings=8,sides=12),'hand.'+letter)
        pieces.append(tube('Thumb '+letter,[(x-side*.020,y-.016,z+.003,.014,.013),(x-side*.034,y-.033,z+.013,.010,.010),
                  (x-side*.041,y-.054,z+.026,.007,.007),(x-side*.039,y-.065,z+.031,.0022,.0022)],hands,12))
        rig.skin(unify_hand(pieces),'hand.'+letter)
    def strap_weights(point):
        shoulder = smooth((point.z-.91)/.234)
        bag = .91*smooth((.976-point.z)/.081)*smooth((-.117-point.x)/.091)
        return {'chest':shoulder,'satchel':bag,'pelvis':1-shoulder-bag}
    make_satchel(rig,canvas,lining,metal,leather,strap_weights)
    human_head(rig, skin, head_height)

    def pose(kind):
        def apply(phase, blink):
            breath = math.sin(phase)*.010
            crouch = kind=='Crouch'
            rig.shift('pelvis',(0,-.589 if crouch else 0,-.106 if crouch else 0))
            lean = Quaternion((0,1,0),.257 if crouch else 0)
            rig.world_rotation('chest',lean @ Quaternion((1,0,0),(.879 if crouch else .015)+breath))
            head_pitch = .350 if crouch else (.14 if kind=='Offer' else -.048)
            head_turn = -.316 if crouch else (-.19 if kind=='Offer' else .082)
            rig.world_rotation('head',Quaternion((0,0,1),head_turn+.042*math.sin(phase+.2)) @
                               Quaternion((1,0,0),head_pitch+.017*math.sin(phase)))
            rig.bones['hair'].rotation_quaternion = Quaternion((0,0,1),.075*math.sin(phase-.6))
            rig.world_rotation('satchel',Quaternion((1,0,0),(.17 if crouch else .022)+.022*math.sin(phase-.5)))
            for letter, side in (('L',-1),('R',1)):
                if crouch:
                    rig.shift('hem.'+letter,(side*.064,.008,-.025))
                ankle = walks[letter]
                planted = vector((side*(.157 if crouch else abs(ankle[0])),ankle[1],.07 if crouch else ankle[2]))
                rig.jointed('thigh.'+letter,'shank.'+letter,planted,vector((side*.11,0,1)))
                rig.world_rotation('foot.'+letter,Quaternion((0,0,1),-side*.056))
                if kind=='Listen' and side>0:
                    goal, palm = (.135,1.435,.075), (.025,.93,.30)
                elif kind=='Listen':
                    goal, palm = (-.059,1.053,.164), (.48,.83,.30)
                elif crouch and side<0:
                    goal, palm = (-.234,.309,.456), (-.21,.015,.99)
                elif crouch:
                    goal, palm = (.280,.087,.289), (.10,-.95,.36)
                else:
                    goal = (side*(.155 if side<0 else .181),1.036 if side<0 else 1.025,.318 if side<0 else .269)
                    palm = (side*-.23,.10,.97)
                rig.jointed('upper.'+letter,'fore.'+letter,vector(goal),vector((side*.92,-.24,-.34)))
                rig.aim('hand.'+letter,vector(palm))
                rig.shift('lid.'+letter,(0,-.015*blink,0))
                rig.bones['eye.'+letter].scale.y = 1-.90*blink
        return apply

    return rig, actions(rig, [(name,pose(name)) for name in ('Listen','Crouch','Offer')])


def feline_eye(rig, side, letter, surface, lid, gleam):
    center = vector((side*.0353,.245,.2148))
    horizontal = vector((.83,side*.15,-side*.54)).normalized()
    outward = vector((side*.54,.045,.84)).normalized()
    vertical = outward.cross(horizontal).normalized()
    rings, segments = 16, 54

    def outline(angle):
        x = math.cos(angle)
        y = math.sin(angle)*(1-.16*abs(x))
        return x,y

    def spot(x, y, depth):
        return center + horizontal*(x*.0164) + vertical*(y*.0122) + outward*depth

    vertices, faces, colors = [spot(0,0,.0038)], [], [(.009,.012,.008)]
    for row in range(1,rings+1):
        radius = row/rings
        for column in range(segments):
            angle = math.tau*column/segments
            x,y = (coord*radius for coord in outline(angle))
            vertices.append(spot(x,y,.0045*(1-radius**2)-.0007))
            ray = .5+.5*math.sin(angle*29+4*math.sin(angle*11)+radius*10)
            iris = mix((.127,.069,.022),(.383,.247,.085), .23+.64*ray)
            pupil_size = math.hypot((x-.025)/.55,(y-.09)/.65)
            pupil = 1-smooth((pupil_size-.90)/.17)
            iris = mix(iris,(.009,.012,.008),pupil)
            colors.append(mix(iris,(.034,.021,.011),.85*smooth((radius-.76)/.22)))
            a = 1+(row-1)*segments+column
            b = 1+(row-1)*segments+(column+1)%segments
            faces.append((0,a,b) if row==1 else (a-segments,a,b,b-segments))
    rig.skin(object_mesh('Rounded amber kitten eye '+letter,vertices,faces,surface,colors=colors),'eye.'+letter)
    outline_points = [spot(*outline(math.tau*i/40),-.00055) for i in range(41)]
    lid_points = [(p.x,p.z,-p.y,.00076,.00070) for p in outline_points]
    rig.skin(tube('Lid margin '+letter,lid_points,lid,7,1),'eye.'+letter)
    glint = spot(-.28,.42,.00385)
    rig.skin(drop('Corneal highlight '+letter,(glint.x,glint.z,-glint.y),(.00165,.0014,.0010),gleam,
                  rings=8,sides=13),'eye.'+letter)


def make_kitten():
    bones = [('rump',(0,.131,-.112),(0,.159,-.015),None),('chest',(0,.159,-.015),(0,.192,.106),'rump'),
             ('head',(0,.189,.104),(0,.256,.169),'chest'),('tail.base',(0,.144,-.153),(.012,.167,-.243),'rump'),
             ('tail.mid',(.012,.167,-.243),(.042,.236,-.298),'tail.base'),
             ('tail.tip',(.042,.236,-.298),(.087,.298,-.307),'tail.mid')]
    limbs = {}
    for side, letter in ((-1,'L'),(1,'R')):
        bones.extend([('ear.'+letter,(side*.046,.270,.151),(side*.066,.325,.143),'head'),
                      ('eye.'+letter,(side*.0353,.245,.2152),(side*.0353,.278,.2152),'head')])
        for label, upper, elbow, paw, parent in (
            ('front',(side*.052,.183,.08),(side*.052,.096,.10),(side*.051,.023,.122),'chest'),
            ('hind',(side*.058,.127,-.107),(side*.075,.055,-.055),(side*.067,.019,-.093),'rump')):
            key = label+'.'+letter
            limbs[key] = upper, elbow, paw
            bones.extend([('upper.'+key,upper,elbow,parent),('lower.'+key,elbow,paw,'upper.'+key),
                          ('paw.'+key,paw,(paw[0],paw[1],paw[2]+.041),'lower.'+key)])
    rig = Rig('Kitten', bones)
    ginger, stripe, ivory = (.456,.204,.079), (.225,.082,.026), (.80,.681,.534)

    def tabby(point, angle, progress):
        x,y,z = point.x, point.z, -point.y
        waves = .5+.5*math.cos((z+.018*math.sin(x*28)+.016*math.sin(y*35))*152)
        guard = .074*math.sin(z*950+x*388)*math.cos(y*701+x*156)
        ruddy = mix(ginger,stripe,.67*waves**3)
        light = .84*smooth((.154-y)/.068)*smooth((.069-abs(x))/.047)
        return tuple(saturate(c*(1+guard)) for c in mix(ruddy,ivory,light))

    coat = material('Ginger tabby • painted fur and nap', ginger, .82, paint=True, fibers=104)
    pad = material('Dusty rose paw pads', (.279,.112,.098), .72)
    rim = material('Warm eyelids and lips', (.088,.031,.019), .75)
    iris = material('Radial hazel iris and cornea', (.249,.132,.034), .31, paint=True)
    glint = material('Small corneal reflection', (.76,.71,.58), .22)
    collar = woven('Moss-green collar', (.102,.138,.086))
    brass = material('Brass identity tag', (.57,.349,.133), .38, .49)
    pink = material('Warm nose leather', (.39,.166,.13), .44)
    whiskers = material('Warm ivory whiskers', (.73,.66,.54), .81)

    body = tube('Rib cage, haunches and rising neck',[(0,.128,-.174,.005,.009),(0,.133,-.156,.052,.051),
           (0,.145,-.103,.077,.072),(0,.156,-.027,.067,.071),(0,.160,.054,.064,.074),
           (0,.169,.094,.053,.062),(0,.194,.130,.039,.047),(0,.208,.152,.025,.030)],coat,38,6,.019,tabby)
    rig.skin(body,lambda p:{'rump':1-smooth((-p.y+.062)/.164),'chest':smooth((-p.y+.062)/.164)})

    def skull(x,y,z):
        muzzle = math.exp(-x*x*5-(y+.37)**2*10)*max(0,z)**2
        temples = .039*math.exp(-((abs(x)-.56)/.33)**2-((y-.25)/.54)**2)
        return x*(1-.16*max(0,-y)), y + temples, z+.25*muzzle

    def face_paint(x,y,z):
        bridge = .5+.5*math.cos(abs(x)*29+y*3.2+.54*math.sin(y*7))
        cheek_bars = (.5+.5*math.cos(20*(y+.25*abs(x))+.48*math.sin(z*8)))**6
        stripe_mask = bridge**5 * smooth((y+.04)/.46)*smooth((z+.33)/.82)
        cheek = .63*cheek_bars*smooth((abs(x)-.49)/.26)*smooth((.34-y)/.57)
        base = mix(ginger,stripe,.67*min(1,stripe_mask+cheek))
        muzzle = smooth((z-.24)/.55)*smooth((.051-y)/.44)
        eye_ring = math.exp(-((abs(x)-.50)/.22)**2-((y+.019)/.23)**2)*smooth((z-.61)/.28)
        base = mix(base,ivory,min(.94,.83*muzzle+.35*eye_ring))
        return tuple(saturate(c*(1+.052*math.sin(x*72+y*51)*math.sin(z*54-y*37))) for c in base)

    rig.skin(drop('Kitten skull with sculpted cheeks',(0,.241,.157),(.067,.054,.064),coat,face_paint,skull,33,52),'head')
    guard_hair = material('Short cheek guard hairs',ginger,.94,paint=True)
    vertices, faces, colors = [], [], []
    for i in range(385):
        y = -.82+1.54*i/384
        radius = math.sqrt(1-y*y)
        angle = i*2.3999632297
        x,z = radius*math.cos(angle),radius*math.sin(angle)
        if abs(x)<.58 or z<-.42:
            continue
        hx,hy,hz = skull(x,y,z)
        point = vector((.067*hx,.241+.054*hy,.157+.064*hz))
        normal = vector((x,y,z)).normalized()
        sweep = vector((x*.76,-.68,z*.12))
        tangent = (sweep-normal*sweep.dot(normal)).normalized()
        across = normal.cross(tangent)
        length = .0023+.0028*(.5+.5*math.sin(i*4.31))
        width = .00016+.00013*(.5+.5*math.cos(i*3.18))
        base = point-.0011*normal
        mid = point+length*(.47*normal+.24*tangent)
        tip = point+length*(.81*normal+.72*tangent)
        start = len(vertices)
        vertices += [base+width*across,base-width*across,mid+.50*width*across,mid-.50*width*across,tip]
        faces += [(start,start+1,start+3,start+2),(start+2,start+3,start+4)]
        color = face_paint(x,y,z)
        colors += [color,color,mix(color,ivory,.12),mix(color,ivory,.12),mix(color,ivory,.34)]
    fuzz = object_mesh('Soft wisps around the kitten cheeks',vertices,faces,guard_hair,colors=colors)
    rig.skin(fuzz,'head')
    def muzzle_fur(x,y,z):
        return mix(ivory,ginger,.31*smooth((y+.17)/.81))

    for side,letter in ((-1,'L'),(1,'R')):
        def ear_shape(x,y,z, side=side):
            taper = .99-.67*smooth((y+.32)/1.16)
            return x*taper+side*.24*(y+1), y, z*(1-.54*max(0,y))-.16*max(0,z)*(1-x*x)

        def ear_paint(x,y,z):
            velvet = smooth((z-.28)/.45)*(1-smooth((abs(x)-.55)/.33))*smooth((y+.77)/.46)
            tips = mix(ginger,stripe,.57*smooth((y-.35)/.69))
            inner = mix((.36,.148,.126),(.59,.290,.239),.57*smooth((y+.37)/1.3))
            return mix(tips,inner,velvet*.84)

        ear = drop('Tapered ear shell '+letter,(side*.047,.286,.151),(.029,.041,.0135),coat,ear_paint,ear_shape,24,36)
        rig.skin(ear,'ear.'+letter)
        feline_eye(rig,side,letter,iris,rim,glint)
        rig.skin(drop('Whisker pad '+letter,(side*.0138,.218,.215),(.0215,.0153,.0133),coat,muzzle_fur,
                      rings=18,sides=28),'head')
        for line in range(5):
            y=.211+line*.0035
            reach = .100+(.006 if side<0 else 0)-.005*abs(line-2)
            rig.skin(tube('Individual whisker '+letter,[(side*(.019+.0032*line),y,.224,.00054,.00054),
                      (side*.059,y-.002,.226,.00041,.00041),(side*.084,y+(line-2.2)*.004,.211,.00020,.00020),
                      (side*reach,y+(line-1.8)*.009,.196+(line%2)*.006,.00006,.00006)],whiskers,6,4),'head')
        for i in range(3):
            rig.skin(drop('Whisker follicle',(side*(.017+i*.0052),.217+.004*(i%2),.227-i*.0012),
                          (.0008,.0009,.0007),rim,rings=7,sides=11),'head')
    rig.skin(drop('Rhinarium',(0,.224,.2315),(.0124,.008,.0057),pink,
                  reshape=lambda x,y,z:(x*(.78+.29*y),y+.10*abs(x),z),rings=17,sides=29),'head')
    rig.skin(cord('Mouth corners',[(-.022,.206,.220),(-.011,.204,.220),(0,.207,.221),
                                     (.011,.204,.220),(.022,.206,.220)],.00072,rim),'head')
    rig.skin(cord('Philtrum',[(0,.219,.232),(0,.212,.230),(0,.207,.221)],.00071,rim),'head')
    for name,(upper,elbow,paw) in limbs.items():
        hind = name.startswith('hind')
        radius = .040 if hind else .024
        x,y,z = upper
        inset = (.54*x, y+(.017 if hind else .024),z+(.004 if hind else -.011))
        limb = tube('Shaped '+name,[(*inset,radius*.77,radius*.87),(*upper,radius,radius*.90),
                    (*mix(upper,elbow,.53),radius*.78,radius*.76),(*elbow,.020 if hind else .016,.018),
                    (*mix(elbow,paw,.53),.014,.015),(*paw,.012,.013)],coat,25,5,.025,tabby)
        span = [('upper.'+name,vector(upper),vector(elbow)),('lower.'+name,vector(elbow),vector(paw))]
        parent = 'rump' if hind else 'chest'
        rig.skin(limb,lambda p, span=span, parent=parent:joint_weights(p,span,parent,.028,.087))
        x,y,z = paw
        def paw_fur(x,y,z):
            return mix(ginger,ivory,.57*smooth((z+.30)/1.1)+.26*smooth((-.15-y)/.84))

        rig.skin(drop('Paw '+name,(x,.018,z+.011),(.019,.017,.031),coat,paw_fur,
                      reshape=lambda x,y,z:(x,max(-.86,y),z),rings=18,sides=28),'paw.'+name)
        rig.skin(drop('Central pad '+name,(x,.0046,z+.003),(.013,.0036,.016),pad,rings=9,sides=16),'paw.'+name)
        for toe in range(3):
            toe_x=x+(toe-1)*.0101
            toe_z=z+.032-.003*abs(toe-1)
            rig.skin(drop('Toe '+name,(toe_x,.012,toe_z),(.0077,.0093,.013),coat,paw_fur,rings=10,sides=16),'paw.'+name)
            rig.skin(drop('Toe pad '+name,(toe_x,.0039,toe_z-.002),(.0048,.0028,.0073),pad,rings=8,sides=14),'paw.'+name)

    tail = tube('Articulated tapering tail',[(0,.145,-.146,.023,.025),(.009,.157,-.198,.023,.022),
                (.012,.167,-.243,.021,.022),(.026,.200,-.278,.019,.019),(.042,.236,-.298,.016,.016),
                (.065,.274,-.306,.012,.012),(.087,.298,-.307,.002,.003)],coat,23,6,.023,tabby)
    span=[(name,rig.bones[name].bone.head_local,rig.bones[name].bone.tail_local) for name in ('tail.base','tail.mid','tail.tip')]
    rig.skin(tail,lambda p:chain_weights(p,span))
    band = [(math.cos(i/38*math.tau)*.044,.190+math.sin(i/38*math.tau)*.043,
             .121-math.sin(i/38*math.tau)*.025) for i in range(39)]
    rig.skin(cord('Woven collar',band,.0036,collar,10),'chest')
    rig.skin(drop('Collar clasp',(0,.151,.153),(.011,.007,.006),brass,rings=11,sides=19),'chest')
    rig.skin(drop('Rounded brass tag',(0,.134,.155),(.012,.014,.0033),brass,rings=16,sides=24),'chest')
    rig.skin(drop('Tag fastener',(0,.145,.156),(.0035,.0035,.0013),rim,rings=8,sides=12),'chest')
    etch = material('Recessed tag engraving', (.201,.090,.029), .72)
    rig.skin(cord('Engraved tag border',[(-.007,.137,.1584),(-.005,.128,.1580),
                (0,.125,.1576),(.005,.128,.1580),(.007,.137,.1584)],.00042,etch),'chest')

    def pose(kind):
        def apply(phase, blink):
            basket, held = kind=='BasketIdle', kind=='HeldIdle'
            rig.shift('rump',(0,(-.052 if basket else .004 if held else -.051)+.0018*math.sin(phase),
                              0 if basket or held else -.020))
            rig.world_rotation('chest',Quaternion((1,0,0),(.12 if basket else -.13 if held else -.345)+.026*math.sin(phase)))
            rig.world_rotation('head',Quaternion((0,0,1),(.15 if basket else -.12 if held else .19)+.084*math.sin(phase)) @
                               Quaternion((1,0,0),(.135 if basket else -.125 if held else -.24)+.028*math.sin(phase+.8)))
            for name,(upper,elbow,paw) in limbs.items():
                x,y,z = paw
                hind = name.startswith('hind')
                if basket:
                    x, z = x*.83, z*.68
                if held:
                    x, y, z = x*.68, .068 if hind else .058, z*.72+(.010 if hind else -.021)
                if not basket and not held:
                    x, z = x*(.77 if hind else .91), z+(.028 if hind else .007)
                pole = vector((.16 if name.endswith('R') else -.16,.07,.85 if hind else -.86))
                rig.jointed('upper.'+name,'lower.'+name,vector((x,y,z)),pole)
                rig.world_rotation('paw.'+name,Quaternion((1,0,0),.20 if held else 0))
            for side,letter in ((-1,'L'),(1,'R')):
                rig.bones['ear.'+letter].rotation_quaternion = Quaternion((0,1,0),side*(.08+.103*math.sin(phase+side)))
                rig.bones['eye.'+letter].scale.y = 1-.94*blink
            turn = 1.04 if basket else .68 if held else .74
            for i,name in enumerate(('tail.base','tail.mid','tail.tip')):
                rig.bones[name].rotation_quaternion = Quaternion((0,1,.8),turn*.82+.18*math.sin(phase-i*.63))
        return apply

    return rig, actions(rig, [(name,pose(name)) for name in ('GroundIdle','BasketIdle','HeldIdle')])


def preview_scene(rig, kitten):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 880
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.world = scene.world or bpy.data.worlds.new('Studio atmosphere')
    scene.world.color = (.16,.17,.18)
    backdrop = material('Preview floor', (.065,.103,.089), .77)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.003))
    stand = bpy.context.object
    stand.name = 'Preview floor'
    stand.data.materials.append(backdrop)
    center = vector((0,.163 if kitten else .83,0))
    for name,position,energy,size,tint in [
        ('Warm window',(-2,-3,3.4),425,4.1,(1,.87,.74)),
        ('Open shadow',(3,-1.3,2.7),210,3.5,(.76,.87,1)),
        ('Soft rim',(.4,2.3,3.8),480,2.7,(.93,.95,1))]:
        lamp = bpy.data.lights.new(name,'AREA')
        lamp.energy = energy
        lamp.shape = 'DISK'
        lamp.size = size
        lamp.color = tint
        light = bpy.data.objects.new(name,lamp)
        scene.collection.objects.link(light)
        light.location = position
        light.rotation_euler = (center-light.location).to_track_quat('-Z','Y').to_euler()
    lens = bpy.data.cameras.new('Inspection camera')
    lens.lens = 54 if kitten else 57
    lens.clip_start = .01
    camera = bpy.data.objects.new('Inspection camera',lens)
    scene.collection.objects.link(camera)
    camera.location = vector((.47,.305,.748) if kitten else (1.16,1.17,3.02))
    camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera = camera
    scene.view_settings.view_transform = 'AgX'
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
    bpy.ops.object.select_all(action='DESELECT')
    rig.obj.select_set(True)
    bpy.context.view_layer.objects.active = rig.obj


def web_meshes(rig):
    groups = {}
    reduction = (
        ('Palm and fingers',.31),
        ('Xiaolin • sculpted hair cap',.50),
        ('Xiaolin • soft cheek',.88),
        ('Mustard coat • open',.53),
        ('Tailored sleeve',.72),
        ('High swept ponytail',.56),
        ('Long curtain bang',.75),
        ('Swept bangs',.75),
        ('Continuous olive crossbody strap',.68),
        ('Boot upper',.85),
        ('Draped back of the hood',.81),
        ('Kitten skull with sculpted cheeks',.89),
        ('Shaped front',.80),
    )
    for mesh in rig.obj.children:
        if mesh.type != 'MESH':
            continue
        ratio = next((factor for prefix,factor in reduction if mesh.name.startswith(prefix)),1)
        if ratio < 1:
            bpy.context.view_layer.objects.active = mesh
            reduce_mesh = mesh.modifiers.new('Web triangle budget', 'DECIMATE')
            reduce_mesh.ratio = ratio
            bpy.ops.object.modifier_move_up(modifier=reduce_mesh.name)
            bpy.ops.object.modifier_apply(modifier=reduce_mesh.name)
        groups.setdefault(mesh.data.materials[0],[]).append(mesh)
    results = []
    for surface, parts in groups.items():
        mesh = join_meshes(parts)
        mesh.name = surface.name
        results.append(mesh)
    return results


def export_actor(asset, make):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    rig, clips = make()
    animation = rig.obj.animation_data
    for track in animation.nla_tracks:
        track.mute = True
    animation.action = clips[0]
    scene.frame_set(1)
    preview_scene(rig, asset=='kitten')
    cover = bpy.data.images.load(str(GAME / 'assets' / 'scene-3d' / 'garden-1.jpg'))
    cover.name = 'Character reference • The Little Garden Guest'
    cover.pack()
    cover.use_fake_user = True
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / (asset+'.blend')))

    animation.action = None
    for track in animation.nla_tracks:
        track.mute = False
    meshes = web_meshes(rig)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [rig.obj,*meshes]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig.obj
    result = bpy.ops.export_scene.gltf(filepath=str(EXPORT / (asset+'.glb')), export_format='GLB',
                                      use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
                                      export_vertex_color='MATERIAL', export_image_format='AUTO',
                                      export_anim_slide_to_zero=True)
    if 'FINISHED' not in result:
        raise RuntimeError(f'Could not export {asset}.')


if __name__=='__main__':
    EXPORT.mkdir(parents=True, exist_ok=True)
    export_actor('xiaolin',make_xiaolin)
    export_actor('kitten',make_kitten)
