const storyScene3d = (() => {
  const T = window.THREE;
  const frame = document.getElementById('scene');
  const canvas = document.getElementById('scene-depth');
  const controls = document.getElementById('world-controls');
  const expand = document.getElementById('world-expand');
  const reset = document.getElementById('world-reset');
  const notes = document.getElementById('world-notes');
  const exhibitButton = document.getElementById('world-exhibit');
  const reading = document.querySelector('.reading-page');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const keys = new Set();
  const touchKeys = new Map();
  const movement = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE']);
  const speed = 3.15;
  let renderer, world, crossfade, mixer, animationFrame = 0, last = 0;
  let pointer, immersive = false, notesOpen = false, failed = false, inView = true;
  const exhibitPosition = T && new T.Vector3();

  function initRenderer() {
    if (renderer) return true;
    if (!T || failed) return false;
    try {
      renderer = new T.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      const limit = matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, limit));
      return true;
    } catch {
      failed = true;
      return false;
    }
  }

  function makeWorld(episode, act) {
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(58, 1, .08, 130);
    camera.rotation.order = 'YXZ';
    const settings = window.WW_WORLDS[episode]({T, scene}, act);
    const exhibit = worldStudy.build(T,scene,episode,act,settings);
    const [x,y,z] = settings.spawn;
    const [lx,ly,lz] = settings.look;
    const yaw = Math.atan2(x-lx, z-lz);
    const pitch = Math.atan2(ly-y, Math.hypot(lx-x,lz-z));
    return {episode, act, scene, camera, exhibit, ...settings, x, y, z, yaw, pitch,
      targetYaw:yaw, targetPitch:pitch, vx:0, vz:0, clock:0, origin:{x,y,z,yaw,pitch}};
  }

  function disposeWorld(old) {
    if (!old) return;
    old.dispose?.();
    const resources = new Set();
    old.scene.traverse(object => {
      object.shadow?.dispose();
      if (object.geometry) resources.add(object.geometry);
      for (const material of [object.material].flat().filter(Boolean)) {
        Object.values(material).forEach(value => { if (value?.isTexture) resources.add(value); });
        Object.values(material.uniforms ?? {}).forEach(({value})=>{ if(value?.isTexture) resources.add(value); });
        resources.add(material);
      }
    });
    const background = old.scene.background;
    if (background?.isTexture) resources.add(background);
    resources.forEach(resource => {if(!gardenActors.isShared(resource)) resource.dispose();});
  }

  function poseCamera(subject, glide = 0) {
    subject.camera.position.set(subject.x - Math.sin(subject.yaw)*glide, subject.y, subject.z - Math.cos(subject.yaw)*glide);
    subject.camera.rotation.set(subject.pitch, subject.yaw, 0, 'YXZ');
  }

  function held(...codes) {
    return codes.some(code => keys.has(code) || [...touchKeys.values()].includes(code));
  }

  function canStand(subject, x, z) {
    const radius = .26;
    const [minX,maxX,minZ,maxZ] = subject.bounds;
    if (x < minX+radius || x > maxX-radius || z < minZ+radius || z > maxZ-radius) return false;
    return !(subject.obstacles || []).some(([left,right,near,far]) =>
      x > left-radius && x < right+radius && z > near-radius && z < far+radius);
  }

  function move(dt) {
    if (!world || crossfade) return;
    if (held('KeyQ')) world.targetYaw += dt*1.6;
    if (held('KeyE')) world.targetYaw -= dt*1.6;
    const damp = T.MathUtils.damp;
    world.yaw = damp(world.yaw, world.targetYaw, 22, dt);
    world.pitch = damp(world.pitch, world.targetPitch, 22, dt);
    const forward = Number(held('KeyW','ArrowUp')) - Number(held('KeyS','ArrowDown'));
    const right = Number(held('KeyD','ArrowRight')) - Number(held('KeyA','ArrowLeft'));
    const amount = speed / Math.max(1, Math.hypot(forward,right));
    world.vx = damp(world.vx, (-Math.sin(world.yaw)*forward + Math.cos(world.yaw)*right)*amount, 12, dt);
    world.vz = damp(world.vz, (-Math.cos(world.yaw)*forward - Math.sin(world.yaw)*right)*amount, 12, dt);
    const nextX = world.x + world.vx*dt;
    const nextZ = world.z + world.vz*dt;
    if (canStand(world,nextX,world.z)) world.x = nextX;
    if (canStand(world,world.x,nextZ)) world.z = nextZ;
    poseCamera(world);
  }

  function prepareMixer() {
    if (mixer) return;
    const previous = new T.WebGLRenderTarget(1,1);
    const next = new T.WebGLRenderTarget(1,1);
    const scene = new T.Scene();
    const camera = new T.OrthographicCamera(-1,1,1,-1,0,2);
    camera.position.z = 1;
    const material = new T.ShaderMaterial({
      uniforms:{previous:{value:previous.texture}, next:{value:next.texture}, amount:{value:0}},
      vertexShader:'varying vec2 screenUv; void main(){screenUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:[
        'varying vec2 screenUv; uniform sampler2D previous; uniform sampler2D next; uniform float amount;',
        'void main(){gl_FragColor=mix(texture2D(previous,screenUv),texture2D(next,screenUv),amount);',
        '#include <tonemapping_fragment>',
        '#include <colorspace_fragment>',
        '}'
      ].join('\n'),
      depthTest:false, depthWrite:false
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2,2),material);
    quad.frustumCulled = false;
    scene.add(quad);
    mixer = {previous,next,scene,camera,material};
  }

  function size() {
    if (!renderer || !world || canvas.hidden) return;
    const width = Math.max(1,canvas.clientWidth), height = Math.max(1,canvas.clientHeight);
    renderer.setSize(width,height,false);
    for (const subject of [world,crossfade?.old].filter(Boolean)) {
      subject.camera.aspect = width/height;
      subject.camera.updateProjectionMatrix();
    }
    if (mixer) {
      const pixels = Math.min(1,renderer.getPixelRatio());
      mixer.previous.setSize(Math.round(width*pixels),Math.round(height*pixels));
      mixer.next.setSize(Math.round(width*pixels),Math.round(height*pixels));
    }
  }

  function endTransition() {
    if (!crossfade) return;
    disposeWorld(crossfade.old);
    crossfade = undefined;
    frame.removeAttribute('data-transitioning');
    if (world) poseCamera(world);
  }

  function placeExhibitButton() {
    const {camera,exhibit} = world;
    const point=exhibit.anchor.getWorldPosition(exhibitPosition).project(camera);
    const visible=!crossfade && point.z>-1 && point.z<1 && Math.abs(point.x)<.98 && Math.abs(point.y)<.90;
    exhibitButton.hidden=!visible;
    if (!visible) return;
    exhibitButton.style.left=`${Math.round(T.MathUtils.clamp((point.x+1)*canvas.clientWidth*.5,64,canvas.clientWidth-64))}px`;
    exhibitButton.style.top=`${Math.round((1-point.y)*canvas.clientHeight*.5)}px`;
  }

  function draw(time) {
    animationFrame = 0;
    if (!world || canvas.hidden || document.hidden || (!inView && !immersive)) return;
    const dt = Math.min(.04,last ? (time-last)/1000 : 0);
    last = time;
    if (!motion.matches) {
      world.clock += dt;
      world.animate?.(world.clock,dt);
    }
    if (crossfade) {
      const progress = Math.min(1,(time-crossfade.start)/950);
      const eased = progress*progress*(3-2*progress);
      const old = crossfade.old;
      poseCamera(old,.72*eased);
      poseCamera(world,-.78*(1-eased));
      renderer.setRenderTarget(mixer.previous);
      renderer.render(old.scene,old.camera);
      renderer.setRenderTarget(mixer.next);
      renderer.render(world.scene,world.camera);
      renderer.setRenderTarget(null);
      mixer.material.uniforms.amount.value = eased;
      renderer.render(mixer.scene,mixer.camera);
      if (progress===1) endTransition();
    } else {
      move(dt);
      renderer.render(world.scene,world.camera);
    }
    placeExhibitButton();
    animationFrame = requestAnimationFrame(draw);
  }

  function run() {
    if (!animationFrame && !document.hidden && (inView || immersive)) {
      last = 0;
      animationFrame = requestAnimationFrame(draw);
    }
  }

  function clearInput() {
    keys.clear();
    touchKeys.clear();
    pointer = undefined;
    frame.removeAttribute('data-orbiting');
  }

  function setNotes(open, focus = false) {
    const exhibitDialog=document.getElementById('exhibit-dialog');
    if (!open && exhibitDialog.open && exhibitDialog.classList.contains('exhibit-side')) exhibitDialog.close();
    notesOpen = open;
    document.body.classList.toggle('world-notes-open', immersive && open);
    reading.inert = immersive && !open;
    notes.setAttribute('aria-expanded',String(open));
    notes.textContent = open ? '收起剧情' : '查看剧情与答题';
    clearInput();
    if (focus) {
      if (open) document.getElementById('story-copy').focus({preventScroll:true});
      else canvas.focus({preventScroll:true});
    }
  }

  function setImmersive(on, focus = true) {
    if (immersive === on) return;
    immersive = on;
    document.body.classList.toggle('world-immersive',on);
    expand.textContent = on ? '退出沉浸' : '全屏漫游';
    expand.setAttribute('aria-pressed',String(on));
    notes.hidden = !on;
    setNotes(false);
    if (on) run();
    if (focus) (on ? canvas : expand).focus({preventScroll:true});
    if (!on && focus) frame.scrollIntoView({block:'nearest'});
  }

  function fallback() {
    failed = true;
    stop();
    frame.setAttribute('data-world-unavailable','');
  }

  function show(_image,episode,act) {
    if (!initRenderer() || !window.WW_WORLDS?.[episode]) {
      fallback();
      return false;
    }
    if (world?.episode === episode && world.act === act) return true;
    let next;
    try { next = makeWorld(episode,act); }
    catch (error) { console.error('Unable to build story world',error); fallback(); return false; }
    endTransition();
    const old = world;
    world = next;
    exhibitButton.hidden=true;
    exhibitButton.setAttribute('aria-label',`查看英文线索：${next.exhibit.name}`);
    canvas.hidden = false;
    controls.hidden = false;
    frame.setAttribute('data-scene-world','');
    frame.dataset.world = episode+'-'+act;
    clearInput();
    if (old && old.episode===episode && !motion.matches && !document.hidden) {
      prepareMixer();
      crossfade = {old,start:performance.now()};
      frame.setAttribute('data-transitioning','');
      if (notesOpen && immersive) setNotes(false,true);
    } else {
      disposeWorld(old);
    }
    size();
    poseCamera(world);
    run();
    return true;
  }

  function stop() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    endTransition();
    disposeWorld(world);
    world = undefined;
    canvas.hidden = true;
    controls.hidden = true;
    exhibitButton.hidden = true;
    clearInput();
    setImmersive(false,false);
    frame.removeAttribute('data-scene-world');
    delete frame.dataset.world;
  }

  function isTextInput(target) {
    return target?.matches('input,select,textarea,[contenteditable],button,a') || false;
  }
  document.addEventListener('keydown',event => {
    if (event.code === 'Escape' && immersive && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      setImmersive(false);
      return;
    }
    if (!world || event.ctrlKey || event.altKey || event.metaKey || isTextInput(event.target)) return;
    if (!(event.target === canvas || (immersive && !notesOpen))) return;
    if (!movement.has(event.code)) return;
    keys.add(event.code);
    event.preventDefault();
  });
  document.addEventListener('keyup',event => keys.delete(event.code));
  canvas.addEventListener('blur',clearInput);
  window.addEventListener('blur',clearInput);
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) clearInput();
    else if (world) run();
  });

  canvas.addEventListener('pointerdown',event => {
    if (!world || event.button !== 0 || !event.isPrimary) return;
    canvas.focus({preventScroll:true});
    pointer = {id:event.pointerId,x:event.clientX,y:event.clientY};
    canvas.setPointerCapture(event.pointerId);
    frame.setAttribute('data-orbiting','');
  });
  canvas.addEventListener('pointermove',event => {
    if (!world || pointer?.id !== event.pointerId || crossfade) return;
    world.targetYaw -= (event.clientX-pointer.x)*.0045;
    world.targetPitch = T.MathUtils.clamp(world.targetPitch-(event.clientY-pointer.y)*.004,-1.19,1.19);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,() => {
    pointer = undefined;
    frame.removeAttribute('data-orbiting');
  });

  controls.querySelectorAll('[data-move]').forEach(button => {
    button.addEventListener('pointerdown',event => {
      if (event.button !== 0) return;
      event.preventDefault();
      canvas.focus({preventScroll:true});
      touchKeys.set(event.pointerId,button.dataset.move);
      button.setPointerCapture(event.pointerId);
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) {
      button.addEventListener(name,event => touchKeys.delete(event.pointerId));
    }
    // Enter and Space move one step for keyboard users who focus the directional buttons.
    button.addEventListener('click',event => {
      if (event.detail !== 0 || !world) return;
      touchKeys.set('step',button.dataset.move);
      setTimeout(() => touchKeys.delete('step'),160);
    });
  });
  expand.addEventListener('click',() => setImmersive(!immersive));
  notes.addEventListener('click',() => setNotes(!notesOpen,true));
  reset.addEventListener('click',() => {
    if (!world) return;
    endTransition();
    Object.assign(world,world.origin,{targetYaw:world.origin.yaw,targetPitch:world.origin.pitch,vx:0,vz:0});
    poseCamera(world);
    canvas.focus({preventScroll:true});
  });
  motion.addEventListener?.('change',() => { if (motion.matches) endTransition(); });
  canvas.addEventListener('webglcontextlost',fallback);
  new ResizeObserver(size).observe(frame);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (world && inView) run();
  }).observe(frame);
  return {show,stop,getExhibit:()=>world?.exhibit,openNotes:()=>{ if (immersive) setNotes(true); }};
})();
