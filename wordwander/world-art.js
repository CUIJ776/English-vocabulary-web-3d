/* Repeatable surface maps and light rigs for the story worlds. */
const worldSurfaceImages = new Map();
let worldCloudField;
const worldSurfaceSets = {garden:['forest','pavers'],lighthouse:['forest','boards'],station:['rock'],museum:['boards']};

function worldSurfaceImage(kind,channel) {
  const path=`assets/world-surfaces/${kind}-${channel}.jpg`;
  if (!worldSurfaceImages.has(path)) {
    const image=new Image();
    image.src=window.WW_SURFACE_MAPS?.[path] ?? path;
    worldSurfaceImages.set(path,image);
  }
  return worldSurfaceImages.get(path);
}

function prepareWorldSurfaces(story) {
  for(const kind of worldSurfaceSets[story]) for(const channel of ['color','normal']) worldSurfaceImage(kind,channel);
}

function worldArt(T, scene) {
  const maps = new Map();
  const materials = new Map();
  const clocks = [];
  const photos = new Set(['forest','rock','boards','pavers']);
  function random(seed) {
    return () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  function surface(kind) {
    if (maps.has(kind)) return maps.get(kind);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    const image = context.createImageData(128,128);
    const rnd = random(kind.charCodeAt(0)*1973);
    const coarse=['stone','ground','terrain','forest','rock','pavers'].includes(kind);
    const fields=[4,8,16,32,64].map(n=>({n,values:Array.from({length:n*n},rnd)}));
    function noise({n,values},x,y) {
      const u=x*n/128,v=y*n/128, i=Math.floor(u),j=Math.floor(v);
      const a=u-i,b=v-j,s=a*a*(3-2*a),t=b*b*(3-2*b);
      const A=values[j*n+i]*(1-s)+values[j*n+(i+1)%n]*s;
      const B=values[(j+1)%n*n+i]*(1-s)+values[(j+1)%n*n+(i+1)%n]*s;
      return A*(1-t)+B*t-.5;
    }
    for (let y=0;y<128;y++) for (let x=0;x<128;x++) {
      const phase = x/128*Math.PI*2, height = y/128*Math.PI*2;
      const haze=fields.reduce((sum,field,i)=>sum+noise(field,x,y)*[1,.58,.31,.16,.09][i],0);
      let tone = 239 + (rnd()-.5)*12 + 15*haze;
      if (coarse) {
        const seam=Math.abs(Math.sin(phase*2+1.6*Math.sin(height)+haze*2.8));
        tone+=haze*37-rnd()*12-(1-T.MathUtils.smoothstep(seam,0,.14))*12;
      }
      if (kind==='wood' || kind==='bark') {
        const grain = kind==='bark' ? phase : height;
        const twist = kind==='bark' ? height : phase;
        const bend=Math.exp(-3*(1-Math.cos(grain-3.2))-.9*(1-Math.cos(twist-1.8)));
        tone-=Math.pow(.5+.5*Math.sin(grain*22 + .7*Math.sin(twist*2) + bend*4 + 2.4*haze),5)*38;
        tone-=Math.pow(.5+.5*Math.sin(grain*53 + bend*2 + .76*haze),11)*10;
      }
      if (kind==='metal') tone+=5*Math.sin(height*44)+haze*15;
      if (kind==='foliage') tone+=haze*46-rnd()*27;
      if (kind==='glaze') tone+=7*Math.sin(phase*3+height*2)+haze*7;
      if (kind==='hair') tone-=15*(.5+.5*Math.sin(phase*56+Math.sin(height*2)*.6+haze))**3;
      if (kind==='leather') tone+=haze*19-rnd()*10;
      if (kind==='shell') tone-=4*(1+Math.sin(phase*45)*Math.cos(height*39));
      if (kind==='cloth' || kind==='fur') {
        tone -= kind==='fur' ? (1+Math.sin(phase*57+.8*Math.sin(height*5)+haze*3.3))*7 :
          8*(1+Math.sin(phase*32)*Math.sin(height*32));
      }
      const slot=4*(y*128+x);
      image.data[slot]=image.data[slot+1]=image.data[slot+2]=tone;
      image.data[slot+3]=255;
    }
    context.putImageData(image,0,0);
    const color = new T.CanvasTexture(canvas);
    color.colorSpace=T.SRGBColorSpace;
    color.wrapS=color.wrapT=T.RepeatWrapping;
    color.anisotropy=4;
    if (kind==='terrain' || kind==='forest' || kind==='rock') color.repeat.set(17,17);
    const height = color.clone();
    height.colorSpace=T.NoColorSpace;
    let normal;
    if (photos.has(kind)) {
      const neutral=document.createElement('canvas');
      neutral.width=neutral.height=1;
      const pixel=neutral.getContext('2d');
      pixel.fillStyle='#8080ff';pixel.fillRect(0,0,1,1);
      normal=new T.CanvasTexture(neutral);
      normal.wrapS=normal.wrapT=T.RepeatWrapping;
      normal.anisotropy=color.anisotropy;
      normal.repeat.copy(color.repeat);
      for (const [channel,texture] of [['color',color],['normal',normal]]) {
        const image=worldSurfaceImage(kind,channel);
        const show=()=>{texture.image=image;texture.needsUpdate=true;};
        if (image.naturalWidth) show();
        else image.addEventListener('load',show,{once:true});
      }
    }
    maps.set(kind,{color,height,normal});
    return maps.get(kind);
  }
  function material(tint, kind='plain', glow=0) {
    const key=[tint,kind,glow].join(':');
    if (materials.has(key)) return materials.get(key);
    const texture = ['plain','leaf'].includes(kind) ? null : surface(kind);
    const shiny = ['water','glaze','metal'].includes(kind);
    const cloth = kind==='cloth' || kind==='fur';
    const result = new T.MeshStandardMaterial({
      color:tint,
      roughness:shiny ? kind==='water' ? .24 : .39 : kind==='shell'? .66 : kind==='hair'?.67 : cloth ? .91 : .84,
      metalness:kind==='metal' ? .36 : 0,
      map:texture?.color ?? null, bumpMap:texture?.normal?null:texture?.height ?? null,
      normalMap:texture?.normal ?? null, normalScale:new T.Vector2(.62,.62),
      bumpScale:['stone','ground','terrain'].includes(kind) ? .044 : kind==='bark' ? .042 : shiny ? .009 : kind==='fur'?.007:.018,
      side:kind==='leaf'?T.DoubleSide:T.FrontSide,
      vertexColors:kind==='leaf',
      emissive:glow ? tint : 0, emissiveIntensity:glow
    });
    materials.set(key,result);
    return result;
  }
  function bevelBox() {
    const geometry=new T.BoxGeometry(1,1,1,5,5,5);
    const position=geometry.attributes.position;
    const radius=.11;
    const half=.5-radius;
    for(let i=0;i<position.count;i++) {
      const x=position.getX(i), y=position.getY(i), z=position.getZ(i);
      const cx=T.MathUtils.clamp(x,-half,half), cy=T.MathUtils.clamp(y,-half,half), cz=T.MathUtils.clamp(z,-half,half);
      const scale=radius/Math.hypot(x-cx,y-cy,z-cz);
      position.setXYZ(i,cx+(x-cx)*scale,cy+(y-cy)*scale,cz+(z-cz)*scale);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  function crag(detail=1,smooth=false) {
    const geometry=smooth?new T.SphereGeometry(1,34,20):new T.IcosahedronGeometry(1,detail);
    const positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i), y=positions.getY(i), z=positions.getZ(i);
      const r=smooth?1+.14*Math.sin(x*5.2+y*4.8-z*3.1)*Math.cos(y*3.2+z*4.3)+.057*Math.sin(x*11+z*9):
        1+.17*Math.sin(x*8.4+y*7.7-z*7)*Math.cos(x*6.2+y*5.6+z*8.1);
      positions.setXYZ(i,x*r,y*r,z*r);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  function leaf() {
    const vertices=[],colors=[],indices=[];
    const rows=5, cols=2;
    for(let row=0;row<=rows;row++) for(let col=0;col<=cols;col++) {
      const along=row/rows, across=col/cols*2-1;
      const margin=Math.max(.002,Math.sin(Math.PI*along)**.85)*(.54+.14*(1-along));
      const edge=Math.abs(across);
      vertices.push(across*margin,(along-.46)*2.05,.23*Math.sin(along*Math.PI)*(1-edge**1.4)
        -.22*along**3+.024*Math.sin(row*2.65)*edge);
      const vein = .90+Math.exp(-edge*12)*.14 + .044*Math.cos(along*41-edge*6);
      colors.push(vein,vein*1.03,vein*.91);
      if(row<rows&&col<cols) {
        const a=row*(cols+1)+col,b=a+cols+1;
        indices.push(a,a+1,b,b,a+1,b+1);
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  function shadow(x,z,width,depth=width,y=.021) {
    if (!maps.has('shadow')) {
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=48;
      const ctx=canvas.getContext('2d');
      const gradient=ctx.createRadialGradient(24,24,1,24,24,24);
      gradient.addColorStop(0,'rgba(26,17,13,.55)');
      gradient.addColorStop(.43,'rgba(26,17,13,.29)');
      gradient.addColorStop(1,'rgba(26,17,13,0)');
      ctx.fillStyle=gradient;
      ctx.fillRect(0,0,48,48);
      maps.set('shadow',new T.CanvasTexture(canvas));
    }
    const ground=new T.Mesh(new T.PlaneGeometry(width*2,depth*2),
      new T.MeshBasicMaterial({map:maps.get('shadow'),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    ground.position.set(x,y,z);
    ground.rotation.x=-Math.PI/2;
    scene.add(ground);
  }
  function cloudField() {
    if (worldCloudField) return worldCloudField;
    const canvas=document.createElement('canvas'), size=256, rng=random(43381);
    canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'), pixels=ctx.createImageData(size,size);
    const octaves=[4,8,16,32,64].map(n=>({n,values:Float32Array.from({length:n*n},rng)}));
    const weights=[.47,.26,.15,.08,.04];
    function value({n,values},u,v) {
      const x=u*n,y=v*n,i=Math.floor(x),j=Math.floor(y);
      const dx=x-i,dy=y-j,s=dx*dx*(3-2*dx),t=dy*dy*(3-2*dy);
      const sample=(a,b)=>values[((b+n)%n)*n+((a+n)%n)];
      return (sample(i,j)*(1-s)+sample(i+1,j)*s)*(1-t)+(sample(i,j+1)*(1-s)+sample(i+1,j+1)*s)*t;
    }
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const u=x/size,v=y/size;
      const density=octaves.reduce((total,octave,i)=>total+value(octave,u,v)*weights[i],0);
      const detail=.65*value(octaves[2],v,u)+.35*value(octaves[4],v,u);
      const i=(y*size+x)*4;
      pixels.data[i]=density*255;
      pixels.data[i+1]=detail*255;
      pixels.data[i+2]=128;
      pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    worldCloudField=canvas;
    return canvas;
  }

  function sky({top,horizon,cloud,shade,cover=.38,density=1,glow=.2,sun=.60,solar=.24,drift=1}) {
    const tile=new T.CanvasTexture(cloudField());
    tile.wrapS=tile.wrapT=T.RepeatWrapping;
    const time={value:0};
    const azimuth=sun*2*Math.PI;
    const solarDirection=new T.Vector3(Math.sin(azimuth),solar,Math.cos(azimuth)).normalize();
    const wind=new T.Vector2(.0081*drift,.0027*drift);
    const material=new T.ShaderMaterial({
      name:'Cloud layers',side:T.BackSide,depthWrite:false,fog:false,toneMapped:false,
      uniforms:{
        cloudField:{value:tile}, cloudClock:time, flow:{value:wind}, sunDirection:{value:solarDirection},
        zenith:{value:new T.Color(top)}, horizon:{value:new T.Color(horizon)},
        litCloud:{value:new T.Color(cloud)}, shadedCloud:{value:new T.Color(shade)},
        cover:{value:cover}, layerScale:{value:density}, glow:{value:glow}
      },
      vertexShader:`varying vec3 skyPoint;
        void main(){skyPoint=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D cloudField;
        uniform float cloudClock,cover,layerScale,glow;
        uniform vec2 flow;
        uniform vec3 zenith,horizon,litCloud,shadedCloud,sunDirection;
        varying vec3 skyPoint;
        void main(){
          vec3 ray=normalize(skyPoint-cameraPosition);
          float lift=pow(clamp(ray.y*1.56,0.,1.),.58);
          float toward=max(0.,dot(ray,sunDirection));
          vec3 base=mix(horizon,zenith,lift);
          base+=vec3(1.,.54,.23)*glow*(pow(toward,12.)*.26+pow(toward,90.)*.38);
          vec2 upper=ray.xz/max(.16,ray.y+.24)*vec2(.145,.095)*layerScale+vec2(.57,.38)-flow*cloudClock*.46;
          float wisps=smoothstep(.43,.71,texture2D(cloudField,upper).g)*smoothstep(.01,.25,ray.y);
          base=mix(base,litCloud,wisps*.24);
          vec2 lower=ray.xz/max(.14,ray.y+.14)*vec2(.205,.155)*layerScale+vec2(.13,.23)-flow*cloudClock;
          vec2 field=texture2D(cloudField,lower).rg;
          float body=smoothstep(cover-.048,cover+.12,field.r+.10*(field.g-.5));
          float adjacent=texture2D(cloudField,lower+sunDirection.xz*.036).r;
          float flank=clamp(.42+(field.r-adjacent)*4.2+.13*pow(toward,7.),.09,1.);
          vec3 cloudColor=mix(shadedCloud,litCloud,flank);
          float veil=body*smoothstep(.018,.29,ray.y);
          vec3 outColor=mix(base,cloudColor,veil*.92);
          float disc=smoothstep(.99912,.99959,toward)*smoothstep(.23,.41,glow)*(1.-veil);
          outColor=mix(outColor,vec3(1.,.76,.45),disc);
          gl_FragColor=vec4(outColor,1.);
          #include <colorspace_fragment>
        }`
    });
    const dome=new T.Mesh(new T.SphereGeometry(96,32,18),material);
    dome.renderOrder=-50;
    scene.add(dome);
    clocks.push(t=>{time.value=t;});
  }

  function water(x,z,width,depth,y,base,{sky=0x9cb4be,sun=0xffd19d,quiet=false,light=[-.29,.18,-.94],surface=null,banks=null}={}) {
    const material=new T.ShaderMaterial({name:'Wind over water',fog:true,
      uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{
        clock:{value:0},deepColor:{value:new T.Color(base)},skyColor:{value:new T.Color(sky)},
        sunColor:{value:new T.Color(sun)},light:{value:new T.Vector3(...light).normalize()},
        amplitude:{value:quiet?.025:.071}, stream:{value:banks?1:0},
        banks:{value:new T.Vector2(...(banks ?? [0,0]))}
      }]),
      vertexShader:`uniform float clock,amplitude;
        varying vec3 surface;
        #include <fog_pars_vertex>
        void main(){
          vec3 p=(modelMatrix*vec4(position,1.)).xyz;
          float swell=sin(dot(p.xz,vec2(.28,.76))-clock*1.06)*.65;
          swell+=sin(dot(p.xz,vec2(.89,-.47))+clock*.79)*.35;
          p.y+=swell*amplitude;
          surface=p;
          vec4 mvPosition=viewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader:`uniform float clock,amplitude,stream;
        uniform vec3 deepColor,skyColor,sunColor,light;
        uniform vec2 banks;
        varying vec3 surface;
        #include <fog_pars_fragment>
        void main(){
          vec2 p=surface.xz;
          vec3 eye=normalize(cameraPosition-surface);
          float fade=1.-smoothstep(7.,45.,distance(cameraPosition,surface));
          vec2 slope=amplitude*(.65*vec2(.28,.76)*cos(dot(p,vec2(.28,.76))-clock*1.06)
            +.35*vec2(.89,-.47)*cos(dot(p,vec2(.89,-.47))+clock*.79));
          float flow=clock*(.88+stream*.87);
          float stagger=sin(dot(p,vec2(.42,-.57))+clock*.36);
          slope+=fade*(vec2(3.1,1.8)*cos(dot(p,vec2(3.1,1.8))+.91*stagger-flow)*.021
            +vec2(1.2,-4.6)*sin(dot(p,vec2(1.2,-4.6))-.74*stagger-flow*.73)*.014
            +vec2(7.9,3.7)*sin(dot(p,vec2(7.9,3.7))+.66*stagger+flow*1.2)*.005);
          vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
          float crest=clamp(1.-dot(normal,eye),0.,1.);
          float reflectance=.055+.43*pow(crest,3.);
          float shine=max(0.,dot(normal,normalize(light+eye)));
          float glint=pow(shine,105.)*1.35+pow(shine,31.)*.16;
          vec3 reflected=mix(skyColor*.63,sunColor,pow(max(0.,dot(reflect(-eye,normal),light)),22.)*.56);
          vec3 waterColor=mix(deepColor*(.85+.16*sin(dot(p,vec2(1.6,1.1))+stagger-flow)),reflected,reflectance);
          float lowChop=sin(dot(p,vec2(4.75,-1.2))-flow+.92*stagger);
          float highChop=sin(dot(p,vec2(7.6,8.1))+flow*.73-.53*stagger);
          float ridge=smoothstep(.56,1.14,.71*lowChop+.52*highChop);
          float edge=1.-smoothstep(.08,.63,min(abs(p.y-banks.x),abs(p.y-banks.y)));
          float foam=stream*ridge*(.13+.50*edge)*fade;
          waterColor=mix(waterColor,vec3(.66,.81,.80),foam);
          waterColor+=sunColor*glint*(.30+.70*fade)*(1.-.82*stream);
          gl_FragColor=vec4(waterColor,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`
    });
    if(surface) {
      surface.material=material;
    } else {
      const geometry=new T.PlaneGeometry(width,depth,Math.min(60,Math.ceil(width)),Math.min(36,Math.ceil(depth*1.5)));
      geometry.rotateX(-Math.PI/2);
      surface=new T.Mesh(geometry,material);
      surface.position.set(x,y,z);
      scene.add(surface);
    }
    clocks.push(t=>{material.uniforms.clock.value=t;});
    return surface;
  }

  function flowers(plantings,petalColor,breeze=1) {
    const vertices=[],normals=[],colors=[];
    const color=new T.Color(), tip=new T.Color(petalColor), throat=new T.Color(0xf0b579);
    function append(surface,tintAt) {
      const triangles=surface.index?surface.toNonIndexed():surface;
      const points=triangles.attributes.position, normal=triangles.attributes.normal;
      for (let i=0;i<points.count;i++) {
        vertices.push(points.getX(i),points.getY(i),points.getZ(i));
        normals.push(normal.getX(i),normal.getY(i),normal.getZ(i));
        const tint=tintAt(i,points);
        colors.push(tint.r,tint.g,tint.b);
      }
      if (surface!==triangles) surface.dispose();
      triangles.dispose();
    }
    const blade=new T.Color(0x5d7a40), dark=new T.Color(0x324c2e);
    const stem=new T.CylinderGeometry(.0065,.012,.59,7,7).translate(0,.295,0);
    const nodes=stem.attributes.position;
    for(let i=0;i<nodes.count;i++) nodes.setX(i,nodes.getX(i)+.07*(nodes.getY(i)/.59)**2);
    stem.computeVertexNormals();
    append(stem,(_,points)=>color.copy(dark).lerp(blade,Math.min(1,points.getY(_)*1.5)));
    for (let i=0;i<3;i++) {
      const height=.18+i*.106;
      const leafGeometry=leaf().scale(.083-i*.013,.099-i*.014,.077);
      leafGeometry.translate(0,.078,0).rotateZ((i%2===0?1:-1)*(1.24-i*.13)).rotateY(i*.77);
      leafGeometry.translate(.07*(height/.59)**2,height,0);
      append(leafGeometry,(index,points)=>color.copy(blade).lerp(dark,.21+.15*Math.sin(points.getY(index)*49)));
    }
    for (let layer=0;layer<2;layer++) for (let i=0;i<6;i++) {
      const angle=(i+layer*.5)*Math.PI/3;
      const petal=new T.PlaneGeometry(1,1,4,6);
      const points=petal.attributes.position;
      for(let j=0;j<points.count;j++) {
        const u=points.getX(j)*2, v=points.getY(j)+.5;
        const taper=.021*(.12+.88*Math.sin(Math.PI*v)**.75)*(1-layer*.17);
        const radius=.018+v*(.078-layer*.023);
        const height=.007+v*.015+v*v*.019+layer*.016+.008*u*u*v;
        points.setXYZ(j,.07+Math.cos(angle)*radius-Math.sin(angle)*u*taper,.59+height,
          Math.sin(angle)*radius+Math.cos(angle)*u*taper);
      }
      petal.computeVertexNormals();
      append(petal,(index,points)=>color.copy(throat).lerp(tip,T.MathUtils.smoothstep(points.getY(index),.605,.632)));
    }
    append(new T.SphereGeometry(.022,11,6).scale(1,.55,1).translate(.07,.607,0),
      (index,points)=>color.setHex(points.getY(index)>.612?0xd5a447:0xa47735));
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const windTime={value:0}, windStrength={value:breeze};
    const material=new T.MeshStandardMaterial({name:'Rooted flowers',vertexColors:true,roughness:.79,side:T.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.uniforms.windTime=windTime;
      shader.uniforms.windStrength=windStrength;
      shader.vertexShader=`uniform float windTime,windStrength;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>',`#include <begin_vertex>
          vec2 planted=instanceMatrix[3].xz;
          float leverage=pow(clamp(position.y/.67,0.,1.),1.85);
          float gust=sin(windTime*1.31+planted.x*.70-planted.y*.39)*.077;
          gust+=.032*sin(windTime*2.47+planted.y*.63+planted.x*.21);
          transformed.x+=leverage*gust*windStrength;
          transformed.z+=leverage*.039*windStrength*cos(windTime*1.44+planted.y*.77);`);
    };
    const bed=new T.InstancedMesh(geometry,material,plantings.length);
    const seedling=new T.Object3D();
    plantings.forEach(([x,z,scale,yaw,tone],i)=>{
      seedling.position.set(x,.012,z);
      seedling.scale.set(.86*scale,scale,.86*scale);
      seedling.rotation.set(0,yaw,0);
      seedling.updateMatrix();
      bed.setMatrixAt(i,seedling.matrix);
      bed.setColorAt(i,color.setHex(tone));
    });
    bed.receiveShadow=true;
    scene.add(bed);
    clocks.push(t=>{windTime.value=t;});
  }
  function key(color,intensity,position=[-5,8,6],focus=[0,0,-3],cast=true) {
    const light=new T.DirectionalLight(color,intensity);
    light.position.set(...position);
    light.target.position.set(...focus);
    light.castShadow=cast;
    light.shadow.mapSize.set(1024,1024);
    const view=light.shadow.camera;
    view.left=-9; view.right=9; view.top=10; view.bottom=-9; view.near=.7; view.far=34;
    light.shadow.bias=-.00052;
    light.shadow.normalBias=.028;
    light.shadow.autoUpdate=false;
    light.shadow.needsUpdate=true;
    scene.add(light,light.target);
    return light;
  }
  function animate(time) {
    for(const update of clocks) update(time);
  }
  return {material,bevelBox,crag,leaf,shadow,sky,water,flowers,key,animate};
}
