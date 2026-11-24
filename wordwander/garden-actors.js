/* Reusable Blender rigs. The chapter still owns each pose, position and fallback. */
const gardenActors = (() => {
  const keys=['xiaolin','kitten'];
  const cache=new Map();
  const shared=new WeakSet();

  async function bytes(key) {
    const embedded=window.GARDEN_MODEL_DATA?.[key];
    if(embedded) {
      return Uint8Array.from(atob(embedded),character=>character.charCodeAt(0)).buffer;
    }
    const response=await fetch(`assets/garden-actors/${key}.glb`);
    if(!response.ok) throw new Error(`GLB ${response.status}`);
    return response.arrayBuffer();
  }

  function load(key) {
    if(cache.has(key)) return cache.get(key);
    const slot={};
    slot.pending=bytes(key).then(raw=>new Promise((resolve,reject)=>{
      const loader=new wordwanderGLTF.GLTFLoader();
      loader.parse(raw,'',resolve,reject);
    })).then(asset=>{
      asset.scene.traverse(object=>{
        if(object.geometry) shared.add(object.geometry);
        for(const material of [object.material].flat().filter(Boolean)) {
          shared.add(material);
          for(const value of Object.values(material)) if(value?.isTexture) shared.add(value);
        }
      });
      slot.asset=asset;
      return asset;
    }).catch(()=>{
      cache.delete(key);
      return null;
    });
    cache.set(key,slot);
    return slot;
  }

  function preload(episode) {
    if(episode==='garden') keys.forEach(load);
  }

  function chapter(T) {
    let active=true;
    const entries=[];
    function mount(key, clipName, fallback, placement={}) {
      const oldParts=[...fallback.children];
      function install(asset) {
        if(!active || !asset) return;
        const clip=asset.animations.find(candidate=>candidate.name===clipName);
        if(!clip) return;
        const model=wordwanderGLTF.cloneRig(asset.scene);
        model.name=`Blender ${key} ${clipName}`;
        model.userData.actor=key;
        model.userData.clip=clipName;
        model.position.set(placement.x ?? 0,placement.y ?? 0,placement.z ?? 0);
        model.rotation.y=placement.yaw ?? 0;
        model.scale.setScalar(placement.scale ?? 1);
        model.traverse(object=>{
          if(!object.isMesh) return;
          object.castShadow=true;
          object.receiveShadow=true;
          // Animated bounds are larger than the rest pose in some of the clips.
          if(object.isSkinnedMesh) object.frustumCulled=false;
        });
        const mixer=new T.AnimationMixer(model);
        mixer.clipAction(clip).play();
        mixer.update(0);
        fallback.add(model);
        oldParts.forEach(object=>{object.visible=false;});
        entries.push({model,mixer});
        // Directional shadows in the story worlds are otherwise baked once per chapter.
        let scene=fallback;
        while(scene.parent) scene=scene.parent;
        scene.traverse(object=>{if(object.shadow && object.castShadow) object.shadow.needsUpdate=true;});
      }
      const slot=load(key);
      if(slot.asset) install(slot.asset);
      else slot.pending.then(install);
    }
    function dispose() {
      active=false;
      for(const {model,mixer} of entries) {
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        const skeletons=new Set();
        model.traverse(object=>{if(object.isSkinnedMesh) skeletons.add(object.skeleton);});
        skeletons.forEach(skeleton=>skeleton.dispose());
      }
      entries.length=0;
    }
    return {mount,dispose,animate(dt){for(const {mixer} of entries) mixer.update(dt);}};
  }

  return {preload,chapter,isShared:resource=>shared.has(resource)};
})();
