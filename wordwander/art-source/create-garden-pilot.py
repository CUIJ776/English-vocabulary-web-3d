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


def human_head(rig, skin_tone, head_height):
    coords, faces = head_source()
    skin = material('Skin • blended facial tones', skin_tone, .66, paint=True)
    hair = material('Chestnut • layered strands', (.035, .020, .016), .52, paint=True, fibers=108)
    eyes = material('Warm sclera', (.73, .60, .51), .28)
    iris = material('Brown iris', (.105, .049, .021), .28)
    pupil = material('Pupil', (.011, .008, .007), .22)
    reflection = material('Corneal highlights', (.72,.68,.62), .28)
    brow = material('Fine eyebrow', (.052,.028,.018), .75)

    def locate(x,y,z):
        cheek = 1 + .043*math.exp(-((y-6.99)/.50)**2)
        return x*.111*cheek, head_height+(y-7.2)*.122, (z-.62)*.117

    colors, positions = [], [vector(locate(*item)) for item in coords]
    for x,y,z in coords:
        lip = math.exp(-((y-6.77)/.086)**2-(x/.26)**2)*smooth((z-1.32)/.20)
        cheek = math.exp(-((abs(x)-.51)/.24)**2-((y-7.00)/.27)**2)*smooth((z-.6)/.7)
        eye = math.exp(-((abs(x)-.34)/.22)**2-((y-7.31)/.11)**2)*smooth((z-.8)/.58)
        color = mix(skin_tone, (.411,.145,.119), .71*lip)
        color = mix(color, (.55,.241,.178), .43*cheek+.22*eye)
        colors.append(color)
    obj = object_mesh('Xiaolin • face and neck', positions, faces, skin, colors=colors)

    def skin_weights(point):
        x, y, z = point.x, point.z-head_height, -point.y
        eye_band = math.exp(-((abs(x)-.035)/.020)**2-(y-.010)**2/.00032)*smooth((z-.062)/.021)
        lid = eye_band * .73 * smooth((y-.004)/.011)
        return {'head': 1-lid, 'lid.R' if x>0 else 'lid.L': lid}
    rig.skin(obj, skin_weights)

    def margin(i):
        x, depth, height = positions[i]
        front = smooth((-depth-.018)/.075)
        line = -.031+.104*front + .009*math.sin(x*44+.8)*front + .0023*math.sin(x*210)
        return height-head_height-line

    hair_verts, hair_colors, hair_faces, hair_uv = [], [], [], []
    for a,b,c in faces:
        tri = [(positions[i], margin(i), obj.data.vertices[i].normal) for i in (a,b,c)]
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
            sweep = math.atan2(p.x,-p.y+.032)
            flow = sweep+(p.z-head_height)*10
            ridge = .7*math.sin(flow*19)+.3*math.sin(flow*35+p.z*19)
            thickness = .0035+(.010+.0021*ridge)*smooth(m/.031)
            ids.append(len(hair_verts))
            hair_verts.append(p+thickness*n)
            hair_uv.append(((sweep+math.pi)/math.tau,(p.z-head_height+.1)*3.8))
            hair_colors.append(mix((.012,.0065,.0045),(.066,.030,.015),.44+.31*ridge))
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
    forehead = BVHTree.FromPolygons(positions, faces, all_triangles=True)
    exposed_hair = material('Hairline strands', (.042,.019,.010), .67)
    for index in range(13):
        x = -.063 + index*.008
        line = []
        for step in range(5):
            t = step/4
            dx = x + (.009+.002*math.sin(index))*t
            h = head_height+.082-.015*t-.035*(abs(x)/.072)**1.7
            on_skin,_,_,_ = forehead.ray_cast(Vector((dx,-.24,h)),Vector((0,1,0)),.27)
            if on_skin is not None:
                thickness = .00048*(1-.89*t)
                line.append((dx,h,-on_skin.y+.0011+.0011*(1-t),thickness,thickness))
        if len(line)>2:
            rig.skin(tube('Tapered hairline strand',line,exposed_hair,5,2),'head')
    bands = material('Muted olive hair tie', (.092,.116,.066), .8)
    strands = material('Chestnut ponytail', (.029,.014,.009), .54, fibers=92)
    rig.skin(tube('Tied ponytail', [(0,head_height+.019,-.129,.034,.028),
             (.022,head_height-.026,-.161,.039,.028),(.042,head_height-.096,-.161,.034,.025),
             (.053,head_height-.163,-.146,.019,.014),(.066,head_height-.196,-.141,.002,.003)],strands,22,5,.12),'hair')
    rig.skin(drop('Hair tie',(.009,head_height+.008,-.137),(.037,.013,.032),bands),'head')
    for side in (-1,1):
        identity = 'R' if side>0 else 'L'
        center = locate(side*.315,7.287,1.235)
        for label, offset, size, surface in (
            ('Sclera',(0,0,0),(.0175,.015,.0181),eyes),
            ('Iris',(-.001,0,.017),(.0073,.0075,.0024),iris),
            ('Pupil',(-.001,0,.0191),(.0038,.004,.0011),pupil),
            ('Catchlight',(-.0028,.0021,.0201),(.0011,.0011,.0005),reflection)):
            rig.skin(drop(label+' '+identity,tuple(a+b for a,b in zip(center,offset)),size,surface,rings=14,sides=22),'eye.'+identity)
        points = [locate(side*x,y,z) for x,y,z in [( .166,7.440,1.424),(.268,7.489,1.431),(.374,7.466,1.405),(.525,7.405,1.294)]]
        rig.skin(tube('Eyebrow '+identity,[(*p,r,r*.47) for p,r in zip(points,(.0017,.0027,.0019,.00034))],brow,8,4),'head')


def make_xiaolin():
    head_height = 1.481
    skin = (.617,.365,.252)
    bones = [('pelvis',(0,.847,0),(0,1.01,0),None),('chest',(0,1.01,0),(0,1.337,-.012),'pelvis'),
             ('head',(0,1.338,.003),(0,1.61,.009),'chest'),('hair',(0,head_height+.014,-.13),(.045,head_height-.111,-.157),'head')]
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
                      ('lid.'+letter,(side*.035,head_height+.010,.065),(side*.035,head_height+.055,.066),'head'),
                      ('eye.'+letter,(side*.035,head_height+.010,.071),(side*.035,head_height+.056,.071),'head')])
    rig = Rig('Xiaolin', bones)
    coat = woven('Ochre • woven jacket', (.52,.274,.077))
    binding = woven('Ochre • ribbed binding', (.37,.179,.048))
    seam = material('Topstitch and zipper tape', (.22,.101,.038), .86)
    canvas = woven('Olive canvas', (.162,.178,.102))
    lining = woven('Olive webbing', (.108,.116,.073))
    pants = woven('Warm slate • twill trousers', (.087,.105,.099))
    leather = woven('Brown leather', (.107,.064,.041), .71)
    sole = material('Rubber soles', (.047,.041,.034), .90)
    metal = material('Patinated brass', (.43,.27,.12), .42, .52)
    hands = material('Hands', skin, .67)
    nails = material('Nail tips', (.673,.444,.375), .53)
    jacket = [(0,.797,-.022,.200,.123),(0,.817,-.022,.201,.134),(0,.909,-.017,.188,.132),
              (0,1.048,-.018,.172,.134),(0,1.16,-.012,.194,.126),(0,1.248,-.012,.200,.108),
              (0,1.287,-.015,.16,.085),(0,1.326,-.009,.087,.071)]
    def torso_weights(point):
        chest = smooth((point.z-.87)/.22)
        hip = (.43+.24*smooth((-point.y-.014)/.115))*smooth((.901-point.z)/.10)*smooth((abs(point.x)-.036)/.107)
        return {'pelvis': 1-chest-hip, 'chest': chest, 'thigh.R' if point.x>0 else 'thigh.L': hip}

    rig.skin(tube('Jacket • shaped seams and folds',jacket,coat,34,5,.044),torso_weights)
    rig.skin(tube('Jacket hem',[(0,.796,-.022,.199,.123),(0,.805,-.022,.205,.133),(0,.823,-.022,.203,.136)],binding,34),torso_weights)
    rig.skin(tube('Turned-up collar',[(0,1.305,-.011,.092,.075),(0,1.334,-.006,.075,.070),(0,1.371,0,.069,.066)],binding,30),'chest')
    zipper = [(0,y,z+depth+.004) for _,y,z,_,depth in jacket[1:]]
    rig.skin(cord('Recessed zipper',zipper,.0041,seam),torso_weights)
    rig.skin(drop('Zip pull',(.011,1.232,.103),(.008,.021,.004),metal,rings=9,sides=14),'chest')
    for letter, side in (('L',-1),('R',1)):
        shoulder, elbow, wrist = arms[letter]
        span = [('upper.'+letter,vector(shoulder),vector(elbow)),('fore.'+letter,vector(elbow),vector(wrist))]
        weight = lambda point, span=span: joint_weights(point,span,'chest',.048,.127)
        sleeve = [(*mix(shoulder,(0,1.223,-.02),.57),.048,.053),
                  (*mix(shoulder,(0,1.248,-.02),.22),.071,.069),(*shoulder,.073,.077),
                  (*mix(shoulder,elbow,.52),.065,.066),(*elbow,.056,.052),
                  (*mix(elbow,wrist,.52),.048,.046),(*wrist,.036,.034)]
        rig.skin(tube('Tailored sleeve '+letter,sleeve,coat,26,5,.041),weight)
        rig.skin(tube('Cuff '+letter,[(*mix(elbow,wrist,.87),.040,.039),(*wrist,.0365,.0355),
                                     (*mix(elbow,wrist,1.015),.035,.034)],binding,23),'fore.'+letter)
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
    rig.skin(drop('Contoured canvas backpack',(0,1.027,-.202),(.169,.240,.096),canvas),'chest')
    rig.skin(drop('Canvas front pocket',(0,.957,-.268),(.135,.123,.052),canvas),'chest')
    rig.skin(cord('Backpack pocket piping',[(-.121,.966,-.293),(-.081,1.051,-.304),(0,1.073,-.31),(.081,1.051,-.304),(.121,.966,-.293)],.0048,lining),'chest')
    for side in (-1,1):
        strap = [(side*.125,1.19,-.158,.025,.013),(side*.146,1.259,-.046,.027,.013),
                 (side*.148,1.227,.07,.024,.012),(side*.128,1.112,.119,.022,.011),(side*.128,.949,.123,.018,.009)]
        rig.skin(tube('Padded shoulder strap',strap,lining,14),'chest')
        rig.skin(drop('Brass strap slide',(side*.13,1.078,.133),(.018,.024,.006),metal,rings=9,sides=16),'chest')
    human_head(rig, skin, head_height)

    def pose(kind):
        def apply(phase, blink):
            breath = math.sin(phase)*.010
            crouch = kind=='Crouch'
            rig.shift('pelvis',(0,-.397 if crouch else 0,-.100 if crouch else 0))
            rig.world_rotation('chest',Quaternion((1,0,0),(.48 if crouch else .015)+breath))
            head_pitch = .49 if crouch else (.18 if kind=='Offer' else -.025)
            head_turn = -.47 if crouch else (-.17 if kind=='Offer' else .083)
            rig.world_rotation('head',Quaternion((0,0,1),head_turn+.042*math.sin(phase+.2)) @
                               Quaternion((1,0,0),head_pitch+.017*math.sin(phase)))
            rig.bones['hair'].rotation_quaternion = Quaternion((0,0,1),.067*math.sin(phase-.6))
            for letter, side in (('L',-1),('R',1)):
                ankle = walks[letter]
                planted = vector((side*(.157 if crouch else abs(ankle[0])),ankle[1],.07 if crouch else ankle[2]))
                rig.jointed('thigh.'+letter,'shank.'+letter,planted,vector((side*.11,0,1)))
                rig.world_rotation('foot.'+letter,Quaternion((0,0,1),-side*.056))
                if kind=='Listen' and side>0:
                    goal, palm = (.135,1.435,.075), (.025,.93,.30)
                elif crouch:
                    goal, palm = (side*.171,.575 if side<0 else .51,.335), (side*-.14,-.64,.76)
                elif kind=='Offer':
                    goal = (side*(.155 if side<0 else .181),1.036 if side<0 else 1.025,.318 if side<0 else .269)
                    palm = (side*-.23,.10,.97)
                else:
                    goal, palm = (side*.291,.824,.052), (side*.13,-.98,.04)
                rig.jointed('upper.'+letter,'fore.'+letter,vector(goal),vector((side*.92,-.24,-.34)))
                rig.aim('hand.'+letter,vector(palm))
                rig.shift('lid.'+letter,(0,-.009*blink,0))
                rig.bones['eye.'+letter].scale.y = 1-.72*blink
        return apply

    return rig, actions(rig, [(name,pose(name)) for name in ('Listen','Crouch','Offer')])


def feline_eye(rig, side, letter, surface, lid, gleam):
    center = vector((side*.0353,.245,.2152))
    horizontal = vector((.83,side*.15,-side*.54)).normalized()
    outward = vector((side*.54,.045,.84)).normalized()
    vertical = outward.cross(horizontal).normalized()
    rings, segments = 18, 64

    def outline(angle):
        x = math.cos(angle)
        y = math.sin(angle)*(1-.29*abs(x))
        return x,y

    def spot(x, y, depth):
        return center + horizontal*(x*.017) + vertical*(y*.0102) + outward*depth

    vertices, faces, colors = [spot(0,0,.0038)], [], [(.009,.012,.008)]
    for row in range(1,rings+1):
        radius = row/rings
        for column in range(segments):
            angle = math.tau*column/segments
            x,y = (coord*radius for coord in outline(angle))
            vertices.append(spot(x,y,.0045*(1-radius**2)-.0007))
            ray = .5+.5*math.sin(angle*29+4*math.sin(angle*11)+radius*10)
            iris = mix((.122,.091,.030),(.381,.290,.099), .23+.64*ray)
            pupil = 1-smooth((abs(x)/max(.075,.24*(1-.86*y*y))-.79)/.26)
            iris = mix(iris,(.009,.012,.008),pupil)
            colors.append(mix(iris,(.034,.021,.011),.85*smooth((radius-.76)/.22)))
            a = 1+(row-1)*segments+column
            b = 1+(row-1)*segments+(column+1)%segments
            faces.append((0,a,b) if row==1 else (a-segments,a,b,b-segments))
    rig.skin(object_mesh('Hazel iris with slit pupil '+letter,vertices,faces,surface,colors=colors),'eye.'+letter)
    outline_points = [spot(*outline(math.tau*i/40),-.00055) for i in range(41)]
    lid_points = [(p.x,p.z,-p.y,.00110,.001) for p in outline_points]
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
    ginger, stripe, ivory = (.429,.181,.070), (.172,.053,.020), (.73,.594,.444)

    def tabby(point, angle, progress):
        x,y,z = point.x, point.z, -point.y
        waves = .5+.5*math.cos((z+.018*math.sin(x*28)+.016*math.sin(y*35))*152)
        guard = .074*math.sin(z*950+x*388)*math.cos(y*701+x*156)
        ruddy = mix(ginger,stripe,.81*waves**4)
        light = .78*smooth((.143-y)/.052)*smooth((.064-abs(x))/.04)
        return tuple(saturate(c*(1+guard)) for c in mix(ruddy,ivory,light))

    coat = material('Ginger tabby • painted fur and nap', ginger, .82, paint=True, fibers=104)
    pad = material('Dusty rose paw pads', (.279,.112,.098), .72)
    rim = material('Warm eyelids and lips', (.088,.031,.019), .75)
    iris = material('Radial hazel iris and cornea', (.249,.132,.034), .31, paint=True)
    glint = material('Small corneal reflection', (.76,.71,.58), .22)
    collar = woven('Moss-green collar', (.097,.154,.102))
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
        base = mix(ginger,stripe,.79*min(1,stripe_mask+cheek))
        muzzle = smooth((z-.26)/.57)*smooth((.015-y)/.47)
        eye_ring = math.exp(-((abs(x)-.50)/.22)**2-((y+.019)/.23)**2)*smooth((z-.61)/.28)
        base = mix(base,ivory,min(.94,.87*muzzle+.32*eye_ring))
        return tuple(saturate(c*(1+.052*math.sin(x*72+y*51)*math.sin(z*54-y*37))) for c in base)

    rig.skin(drop('Kitten skull with sculpted cheeks',(0,.241,.157),(.067,.054,.064),coat,face_paint,skull,33,52),'head')
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
    rig.skin(cord('Woven collar',band,.0045,collar,10),'chest')
    rig.skin(drop('Collar clasp',(0,.151,.153),(.011,.007,.006),brass,rings=11,sides=19),'chest')
    rig.skin(drop('Rounded brass tag',(0,.134,.155),(.012,.014,.0033),brass,rings=16,sides=24),'chest')
    rig.skin(drop('Tag fastener',(0,.145,.156),(.0035,.0035,.0013),rim,rings=8,sides=12),'chest')
    etch = material('Recessed tag engraving', (.201,.090,.029), .72)
    rig.skin(cord('Engraved tag border',[(-.007,.137,.1584),(-.005,.128,.1580),
                (0,.125,.1576),(.005,.128,.1580),(.007,.137,.1584)],.00042,etch),'chest')

    def pose(kind):
        def apply(phase, blink):
            basket, held = kind=='BasketIdle', kind=='HeldIdle'
            rig.shift('rump',(0,(-.052 if basket else .004 if held else -.009)+.0018*math.sin(phase),0))
            rig.world_rotation('chest',Quaternion((1,0,0),(.12 if basket else -.13 if held else .020)+.026*math.sin(phase)))
            rig.world_rotation('head',Quaternion((0,0,1),(.15 if basket else -.12 if held else .06)+.084*math.sin(phase)) @
                               Quaternion((1,0,0),(.135 if basket else -.125 if held else .008)+.028*math.sin(phase+.8)))
            for name,(upper,elbow,paw) in limbs.items():
                x,y,z = paw
                hind = name.startswith('hind')
                if basket:
                    x, z = x*.83, z*.68
                if held:
                    x, y, z = x*.68, .068 if hind else .058, z*.72+(.010 if hind else -.021)
                pole = vector((.16 if name.endswith('R') else -.16,.07,.85 if hind else -.86))
                rig.jointed('upper.'+name,'lower.'+name,vector((x,y,z)),pole)
                rig.world_rotation('paw.'+name,Quaternion((1,0,0),.20 if held else 0))
            for side,letter in ((-1,'L'),(1,'R')):
                rig.bones['ear.'+letter].rotation_quaternion = Quaternion((0,1,0),side*(.08+.103*math.sin(phase+side)))
                rig.bones['eye.'+letter].scale.y = 1-.94*blink
            turn = 1.04 if basket else .68 if held else .32
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
    for mesh in rig.obj.children:
        if mesh.type != 'MESH':
            continue
        ratio = .39 if mesh.name.startswith('Palm and fingers') else .58 if 'hair cap' in mesh.name else 1
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
