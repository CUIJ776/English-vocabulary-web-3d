/* Static environments exported by Blender. Gameplay and character rigs stay in Three.js. */
const blenderMaps = (() => {
  const T=window.THREE;
  const cache=new Map();
  let currentId;
  let upcomingId;
  const directory='assets/blender-maps/';

  async function bytes(id) {
    const packed=window.WW_MAP_DATA?.[id];
    if(packed) {
      const data=atob(packed);
      const out=new Uint8Array(data.length);
      for(let i=0;i<data.length;i++) out[i]=data.charCodeAt(i);
      return out.buffer;
    }
    const response=await fetch(directory+id+'.glb');
    if(!response.ok) throw new Error('HTTP '+response.status);
    return response.arrayBuffer();
  }

  function plan(gltf,id) {
    if(gltf.scenes.length!==1) throw new Error('Expected one chapter per map');
    const root=gltf.scene.children.find(node=>node.userData.mapId===id);
    if(!root) throw new Error('Map metadata is missing');
    const layout=JSON.parse(root.userData.layout);
    if(![layout.spawn,layout.look,layout.keyPosition].every(p=>p?.length===3&&p.every(Number.isFinite)) ||
       layout.bounds?.length!==4 || !layout.bounds.every(Number.isFinite) ||
       !layout.colliders?.every(p=>p.length===4&&p.every(Number.isFinite)) ||
       !layout.lights?.every(light=>light.xyz.length===3&&light.xyz.every(Number.isFinite))) {
      throw new Error('Map layout is invalid');
    }
    return {gltf,root,layout};
  }

  function load(episode,act) {
    const id=episode+'-'+act;
    if(cache.has(id)) return cache.get(id);
    const entry={uses:0};
    entry.pending=bytes(id).then(data=>new Promise((resolve,reject)=>{
      const loader=new wordwanderGLTF.GLTFLoader();
      loader.setMeshoptDecoder(window.WWMeshoptDecoder);
      loader.parse(data,'',resolve,reject);
    })).then(gltf=>{
      entry.asset=plan(gltf,id);
      if(!retained(id)) {
        disposeEntry(id,entry);
        return null;
      }
      return entry.asset;
    }).catch(error=>{
      // Use the existing 3D chapter if a particular export cannot be read.
      console.warn('Unable to load Blender map '+id,error);
      cache.delete(id);
      return null;
    });
    cache.set(id,entry);
    return entry;
  }

  function retained(id) {
    return id===currentId || id===upcomingId;
  }

  function prune(episode,act=0) {
    currentId=episode ? episode+'-'+act : undefined;
    upcomingId=episode && act<3 ? episode+'-'+(act+1) : undefined;
    for(const [id,entry] of cache) {
      if(!entry.uses && entry.asset && !retained(id)) disposeEntry(id,entry);
    }
  }

  function disposeEntry(id,entry) {
    if(cache.get(id)===entry) cache.delete(id);
    const resources=new Set();
    const images=new Set();
    entry.asset.root.traverse(object=>{
      if(object.geometry) resources.add(object.geometry);
      for(const material of [object.material].flat().filter(Boolean)) {
        resources.add(material);
        for(const value of Object.values(material)) {
          if(!value?.isTexture) continue;
          resources.add(value);
          if(typeof value.image?.close==='function') images.add(value.image);
        }
      }
    });
    entry.asset=null;
    resources.forEach(resource=>resource.dispose());
    images.forEach(image=>image.close());
  }

  function preload(episode,act=0) {
    if(episode && act>=0 && act<4) load(episode,act);
  }

  function discard(episode,act,entry) {
    const id=episode+'-'+act;
    if(entry.asset && !entry.uses && !retained(id)) disposeEntry(id,entry);
  }

  function mount(episode,act,scene,entry) {
    const {gltf,root,layout}=entry.asset;
    const map=root.clone(true);
    map.name=root.name+' • Blender';
    map.userData.mapId=episode+'-'+act;
    scene.add(map);
    scene.background=new T.Color(layout.sky.horizon);
    scene.fog=new T.FogExp2(layout.sky.horizon,layout.fog);
    const art=worldArt(T,scene);
    art.sky(layout.sky);
    const sunlight=art.key(layout.key,layout.strength,layout.keyPosition);
    sunlight.shadow.camera.far=48;
    sunlight.shadow.camera.updateProjectionMatrix();
    scene.add(new T.HemisphereLight(layout.fill,layout.ground,layout.ambient));
    const bounce=new T.DirectionalLight(layout.fill,layout.bounce ?? .65);
    bounce.position.set(3.5,4.5,6);
    scene.add(bounce);
    // Only nearby lamps affect the physical surfaces. All shades still glow.
    const nearest=[...layout.lights].sort((a,b)=>
      Math.hypot(a.xyz[0]-layout.spawn[0],a.xyz[2]-layout.spawn[2])-
      Math.hypot(b.xyz[0]-layout.spawn[0],b.xyz[2]-layout.spawn[2]));
    for(const {xyz,tint,power,radius} of nearest.slice(0,7)) {
      const lamp=new T.PointLight(tint,power,radius,2);
      lamp.position.set(...xyz);
      scene.add(lamp);
    }
    const water=[];
    const waterMaterials=new Set();
    function applyVisibility(object,casts) {
      const inherited=object.userData.cast ?? casts;
      if(object.userData.surface==='water') water.push(object);
      if(object.isMesh) {
        object.castShadow=inherited;
        object.receiveShadow=!object.material.transparent;
      }
      for(const child of object.children) applyVisibility(child,inherited);
    }
    applyVisibility(map,true);
    for(const object of water) {
      object.traverse(surface=>{
        if(!surface.isMesh) return;
        const base=layout.coast?0x365b70:0x3a6964;
        const water=art.water(0,0,0,0,0,base,{
          sky:layout.sky.horizon,sun:layout.key,quiet:!layout.coast,surface,banks:layout.waterBanks,
          light:[Math.sin(layout.sky.sun*2*Math.PI),layout.sky.solar,Math.cos(layout.sky.sun*2*Math.PI)]
        });
        waterMaterials.add(water.material);
      });
    }
    const update=layout.rain?buildRain(scene,act):null;
    if(episode==='garden') {
      const half=act===2?3.27:1.79;
      const roots=Array.from({length:20},(_,i)=>[(i%2?-1:1)*(half+.2*Math.sin(i*1.26)),
        4.21-i*.69,.48+.24*Math.cos(i*2.74),i*1.41,i%3?0xf2cb8b:0xf5e6c2]);
      art.flowers(roots,0xe6adad,.77);
    }
    const mixer=new T.AnimationMixer(map);
    gltf.animations.forEach(clip=>mixer.clipAction(clip).play());
    mixer.update(0);
    const cast=mapCast(episode,act,scene,layout);
    const settings={
      spawn:layout.spawn,look:layout.look,bounds:layout.bounds,
      obstacles:[...layout.colliders,...cast.obstacles],
      exhibitScale:.82,
      exhibitPosition:episode==='museum' ? (act===2?[-2.04,.63]:[2.35,.44])
        : episode==='lighthouse' && act===3 ? [1.62,2.45] : undefined,
      animate(time,dt) {
        art.animate(time);
        mixer.update(dt);
        cast.animate(time,dt);
        update?.(time);
      },
      dispose() {
        cast.dispose?.();
        mixer.stopAllAction();
        mixer.uncacheRoot(map);
        scene.remove(map);
        waterMaterials.forEach(material=>material.dispose());
        entry.uses--;
        const id=episode+'-'+act;
        if(!entry.uses && !retained(id)) disposeEntry(id,entry);
      }
    };
    entry.uses++;
    return settings;
  }

  function mapCast(episode,act,scene,layout) {
    if(episode==='garden') return gardenWorld({T,scene},act,layout);
    if(episode==='lighthouse') return lighthouseWorld({T,scene},act,layout);
    const k=worldCraft(T,scene,act*521+2429);
    const obstacles=[];
    const students={
      station:[
        [[-.80,2.30,.49,0x9d3b32,'girl','stand'],[.43,1.63,.36,0x2d4d78,'boy','stand']],
        [[-1.21,-.91,.10,0x9d3b32,'girl','repair'],[.72,-1.96,-.47,0x2d4d78,'boy','stand']],
        [[-1.01,.35,.78,0x9d3b32,'girl','repair'],[.56,.16,-.38,0x2d4d78,'boy','repair'],[.48,-1.91,.12,0x62635b,'mentor','give']],
        [[-.61,.76,.52,0x9d3b32,'girl','stand'],[.04,-.22,.41,0x2d4d78,'boy','stand']]
      ],
      museum:[[],[[-1.43,-.74,.58,0x8c602f,'girl','give']],[[1.99,-.76,-.57,0x8c602f,'girl','repair']],[[-2.31,-2.15,.51,0x8c602f,'girl','give']]]
    }[episode][act];
    for(const [x,z,yaw,coat,style,pose] of students) {
      k.person(x,z,{yaw,coat,style,pose,kit:episode==='station'?'shell':'coat',bag:style!=='mentor',
        scale:style==='mentor'?1.18:style==='boy'?1.11:1.05});
      obstacles.push([x-.25,x+.25,z-.24,z+.24]);
    }
    return {obstacles,animate:k.animate};
  }

  function buildRain(scene,act) {
    const geometry=new T.BufferGeometry();
    let seed=632+act;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const samples=Array.from({length:240},()=>[random()*20-10,random()*7,random()*17-10,.16+random()*.22,6+random()*4]);
    const points=new Float32Array(samples.length*6);
    geometry.setAttribute('position',new T.BufferAttribute(points,3));
    const rain=new T.LineSegments(geometry,new T.LineBasicMaterial({color:0xb8d6e8,opacity:.33,transparent:true,depthWrite:false}));
    rain.frustumCulled=false;
    scene.add(rain);
    function tick(time) {
      const bias=.12+.037*Math.sin(time*.65);
      samples.forEach(([x,y,z,length,speed],i)=>{
        const height=(y-time*speed%7+7)%7;
        const drift=x+(7-height)*bias;
        points.set([drift,height,z,drift-length*bias,height+length,z-.02],i*6);
      });
      geometry.attributes.position.needsUpdate=true;
    }
    tick(0);
    return tick;
  }

  return {load,mount,preload,prune,discard};
})();
