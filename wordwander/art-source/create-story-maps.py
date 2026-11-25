"""Build 16 editable Blender chapter maps and their small web GLBs.

Run with Blender in background mode. Optional arguments after -- restrict the
build to a story or chapter, e.g. -- garden or -- lighthouse-1.
Each story blend contains its four independent chapter scenes and the packed
environment concept sheet.
"""
import sys
from pathlib import Path
import os
import shutil
import subprocess
import tempfile

import bpy

sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from map_model import GAME, SOURCE, preview
import map_garden
import map_lighthouse
import map_station
import map_museum

MODELS=GAME/'assets'/'blender-maps'
EDITS=SOURCE/'story-maps'
BUILDERS={'garden':map_garden,'lighthouse':map_lighthouse,'station':map_station,'museum':map_museum}


def export(m,path):
    scene=m.scene
    bpy.context.window.scene=scene
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in m.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=m.root
    packer=os.environ.get('WORDWANDER_GLTFPACK')
    with tempfile.TemporaryDirectory(prefix='wordwander-map-') as work:
        raw=Path(work)/path.name if packer else path
        status=bpy.ops.export_scene.gltf(
            filepath=str(raw),export_format='GLB',use_selection=True,use_active_scene=True,
            export_animations=True,export_animation_mode='ACTIVE_ACTIONS',
            export_extras=True,export_texcoords=True,export_vertex_color='ACTIVE',
            export_image_format='AUTO',export_yup=True,
            export_meshopt_compression_enable=not packer,export_meshopt_extension='EXT_meshopt_compression')
        if 'FINISHED' not in status:
            raise RuntimeError(f'Blender failed to export {path.name}.')
        if packer:
            packed=Path(work)/('packed-'+path.name)
            subprocess.run([packer,'-i',str(raw),'-o',str(packed),'-c','-kn','-ke','-vp','15','-vt','14'],
                           check=True)
            shutil.copyfile(packed,path)


def main():
    selection=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    unknown=set(selection)-set(BUILDERS)-{f'{story}-{act}' for story in BUILDERS for act in range(4)}
    if unknown:
        raise ValueError(f'Unknown map selection: {", ".join(sorted(unknown))}')
    MODELS.mkdir(parents=True,exist_ok=True)
    EDITS.mkdir(parents=True,exist_ok=True)
    for story,builder in BUILDERS.items():
        acts=[i for i in range(4) if not selection or story in selection or f'{story}-{i}' in selection]
        if not acts:
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        scenes=[]
        for act in acts:
            sc=bpy.context.scene if not scenes else bpy.data.scenes.new(f'{act+1:02d}')
            bpy.context.window.scene=sc
            m=builder.build(sc,act)
            sc.name=f'{act+1:02d} · {m.root.name}'
            m.finish()
            preview(m)
            export(m,MODELS/f'{story}-{act}.glb')
            scenes.append(sc)
        if len(acts)==4:
            concept=bpy.data.images.load(str(SOURCE/'map-references'/f'{story}.png'))
            concept.name='Art direction • four chapters'
            concept.use_fake_user=True
            bpy.ops.file.pack_all()
            bpy.context.window.scene=scenes[0]
            bpy.context.preferences.filepaths.save_version=0
            bpy.ops.wm.save_as_mainfile(filepath=str(EDITS/f'{story}.blend'))


if __name__=='__main__':
    main()
