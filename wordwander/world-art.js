/* Repeatable surface maps and light rigs for the story worlds. */
function worldArt(T, scene) {
  const maps = new Map();
  const materials = new Map();
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
      if (kind==='stone' || kind==='ground' || kind==='terrain') {
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
      if (kind==='glaze') tone+=7*Math.sin(phase*3+height*2)+haze*7;
      if (kind==='cloth' || kind==='fur') {
        tone -= kind==='fur' ? (1+Math.sin(phase*32+.7*Math.sin(height*5)+haze*2.3))*6 :
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
    if (kind==='terrain') color.repeat.set(16,16);
    const height = color.clone();
    height.colorSpace=T.NoColorSpace;
    maps.set(kind,{color,height});
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
      roughness:shiny ? kind==='water' ? .24 : .39 : cloth ? .98 : .84,
      metalness:kind==='metal' ? .36 : 0,
      map:texture?.color ?? null, bumpMap:texture?.height ?? null,
      bumpScale:['stone','ground','terrain'].includes(kind) ? .044 : kind==='bark' ? .042 : shiny ? .009 : .018,
      side:kind==='leaf'?T.DoubleSide:T.FrontSide,
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
  function crag(detail=1) {
    const geometry=new T.IcosahedronGeometry(1,detail);
    const positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i), y=positions.getY(i), z=positions.getZ(i);
      const r=1 + .17*Math.sin(x*8.4+y*7.7-z*7)*Math.cos(x*6.2+y*5.6+z*8.1);
      positions.setXYZ(i,x*r,y*r,z*r);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  function leaf() {
    const vertices=[0,-.9,0, -.52,-.23,0, -.46,.33,.016, 0,1,0,
      .43,.33,.037, .51,-.22,0, 0,.08,.22];
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geometry.setIndex([0,6,1,1,6,2,2,6,3,3,6,4,4,6,5,5,6,0]);
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
  function sky({top,horizon,cloud,shade,cover=.38,density=1,glow=.2,sun=.68}) {
    const width=512, height=256;
    const canvas=document.createElement('canvas');
    canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext('2d'), image=ctx.createImageData(width,height);
    const channels = color => [color>>16&255,color>>8&255,color&255];
    const high=channels(top), low=channels(horizon), bright=channels(cloud), dark=channels(shade);
    const rand=random(77251+top);
    const grids=[8,16,32,64].map(size=>({size,values:Array.from({length:size*size},rand)}));
    function noise(grid,u,v) {
      const {size,values}=grid;
      const U=u*size,V=v*size,i=Math.floor(U),j=Math.floor(V);
      const x=U-i,y=V-j,s=x*x*(3-2*x),t=y*y*(3-2*y);
      const at=(a,b)=>values[(b%size+size)%size*size+(a%size+size)%size];
      const A=at(i,j)*(1-s)+at(i+1,j)*s, B=at(i,j+1)*(1-s)+at(i+1,j+1)*s;
      return A*(1-t)+B*t;
    }
    for(let j=0;j<height;j++) for(let i=0;i<width;i++) {
      const u=i/width, v=j/height;
      const elevation=T.MathUtils.clamp((.51-v)*2.6,0,1);
      const wash=elevation**.64;
      let drift=0;
      for(let k=0;k<grids.length;k++) drift+=noise(grids[k],u, v*density+k*.17)*[.52,.27,.14,.07][k];
      const veil=T.MathUtils.clamp((drift-cover)*4.3,0,1)*Math.min(1,elevation*5);
      const light=1-T.MathUtils.clamp((drift-cover)*3.2,0,.88);
      const sunDistance=Math.min(Math.abs(u-sun),1-Math.abs(u-sun));
      const radiance=Math.exp(-(sunDistance**2)*36-(v-.46)**2*65)*glow;
      const offset=4*(j*width+i);
      for(let ch=0;ch<3;ch++) {
        const base=low[ch]*(1-wash)+high[ch]*wash;
        image.data[offset+ch]=(1-veil)*base+veil*(dark[ch]*(1-light)+bright[ch]*light)+radiance*[98,57,14][ch];
      }
      image.data[offset+3]=255;
    }
    ctx.putImageData(image,0,0);
    const texture=new T.CanvasTexture(canvas);
    texture.colorSpace=T.SRGBColorSpace;
    const dome=new T.Mesh(new T.SphereGeometry(96,32,18),
      new T.MeshBasicMaterial({map:texture,side:T.BackSide,depthWrite:false,fog:false,toneMapped:false}));
    dome.renderOrder=-50;
    scene.add(dome);
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
  return {material,bevelBox,crag,leaf,shadow,sky,key};
}
