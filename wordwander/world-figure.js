/* Continuous garment shapes and the shared, anatomically modeled head. */
const worldFigure = (() => {
  let headData;

  function unpack(data, signed) {
    const bytes=Uint8Array.from(atob(data),value=>value.charCodeAt(0));
    const view=new DataView(bytes.buffer);
    const values=signed?new Int16Array(bytes.length/2):new Uint16Array(bytes.length/2);
    for (let i=0;i<values.length;i++) values[i]=signed?view.getInt16(i*2,true):view.getUint16(i*2,true);
    return values;
  }

  function garment(T,sections,fold=.024) {
    const rings=Math.max(14,sections.length*3), sides=20;
    const path=new T.CatmullRomCurve3(sections.map(([x,y,z])=>new T.Vector3(x,y,z)));
    const positions=[],uvs=[],indices=[];
    const across=new T.Vector3(), depth=new T.Vector3();
    for (let row=0;row<=rings;row++) {
      const progress=row/rings, segment=progress*(sections.length-1);
      const index=Math.min(sections.length-2,Math.floor(segment));
      const [,,,rx0,rz0]=sections[index], [,,,rx1,rz1]=sections[index+1];
      const rx=T.MathUtils.lerp(rx0,rx1,segment-index), rz=T.MathUtils.lerp(rz0,rz1,segment-index);
      const center=path.getPoint(progress), tangent=path.getTangent(progress);
      across.set(1,0,0).addScaledVector(tangent,-tangent.x).normalize();
      depth.crossVectors(tangent,across).normalize();
      for (let col=0;col<=sides;col++) {
        const angle=col/sides*2*Math.PI;
        const pleat=1+fold*Math.cos(5*angle+progress*6)*Math.sin(progress*Math.PI)*
          (.32+.68*Math.sin(progress*15+angle*2)**2);
        const ax=Math.cos(angle)*rx*pleat, az=Math.sin(angle)*rz*pleat;
        positions.push(center.x+across.x*ax+depth.x*az,center.y+across.y*ax+depth.y*az,center.z+across.z*ax+depth.z*az);
        uvs.push(col/sides,progress);
        if (row<rings && col<sides) {
          const a=row*(sides+1)+col, b=a+sides+1;
          indices.push(a,a+1,b,b,a+1,b+1);
        }
      }
    }
    const mesh=new T.BufferGeometry();
    mesh.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    mesh.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    mesh.setIndex(indices);
    mesh.computeVertexNormals();
    const normals=mesh.attributes.normal;
    for (let row=0;row<=rings;row++) {
      const first=row*(sides+1),end=first+sides;
      across.fromBufferAttribute(normals,first).add(depth.fromBufferAttribute(normals,end)).normalize();
      normals.setXYZ(first,across.x,across.y,across.z);
      normals.setXYZ(end,across.x,across.y,across.z);
    }
    return mesh;
  }

  function hairCap(T,scalp,style,hair) {
    const points=[],normals=[],uvs=[],colors=[];
    const tone=new T.Color(), base=new T.Color(hair);
    const sidePart=style==='boy'?-.37:style==='mother'?-.18:.33;
    const source=scalp.attributes.position,normal=scalp.attributes.normal;
    const vertices=Array.from({length:source.count},(_,index)=>{
      const x=source.getX(index),y=source.getY(index),z=source.getZ(index);
      const fore=T.MathUtils.smoothstep(z,.006,.098), temple=T.MathUtils.smoothstep(Math.abs(x),.067,.093);
      const hairline=-.034+.098*fore+temple*.018+fore*.016*Math.sin(x*38+sidePart*3)+.003*Math.sin(x*172);
      return [x,y,z,normal.getX(index),normal.getY(index),normal.getZ(index),y-hairline];
    });
    function emit([x,y,z,nx,ny,nz,margin]) {
      const sheet=Math.atan2(x,z+.028)+sidePart*y*5;
      const lift=T.MathUtils.smoothstep(margin,0,.021);
      const lock=(.0035+.011*lift+.005*lift*Math.sin(sheet*15+y*58))*(.86+Math.max(0,ny)*.21);
      points.push(x+nx*lock,y+ny*lock,z+nz*lock);
      normals.push(nx,ny,nz);
      uvs.push(sheet/(2*Math.PI)+.5,y*4+.26);
      tone.copy(base).multiplyScalar(1.04+.21*Math.sin(sheet*16+y*63)+.07*Math.cos(sheet*36+y*75));
      colors.push(tone.r,tone.g,tone.b);
    }
    const triangles=scalp.index.array;
    for(let i=0;i<triangles.length;i+=3) {
      const triangle=[vertices[triangles[i]],vertices[triangles[i+1]],vertices[triangles[i+2]]];
      const clipped=[];
      for(let j=0;j<3;j++) {
        const a=triangle[j],b=triangle[(j+1)%3];
        if(a[6]>=0) clipped.push(a);
        if((a[6]<0)!==(b[6]<0)) {
          const t=a[6]/(a[6]-b[6]);
          clipped.push(a.map((value,index)=>T.MathUtils.lerp(value,b[index],t)));
        }
      }
      for(let j=2;j<clipped.length;j++) for(const vertex of [clipped[0],clipped[j-1],clipped[j]]) emit(vertex);
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs,2));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    return geometry;
  }

  function head(T,art,{hair,skin,style,hat,pose,phase}) {
    headData ||= {positions:unpack(worldHeadData.positions,true),indices:unpack(worldHeadData.indices,false)};
    const root=new T.Group(), features=new T.Group();
    root.name='face';
    root.add(features);
    const skinTone=new T.Color(skin), tint=new T.Color();
    const lips=new T.Color(0xa3544a), blush=new T.Color(0xd48e70), shade=new T.Color(0xad806c);
    const xs=style==='boy'?.120:.113, ys=style==='boy'?.117:.121, zs=.116;
    const local=(x,y,z)=>[x*xs,(y-7.20)*ys,(z-.62)*zs];
    const positions=new Float32Array(headData.positions.length);
    const colors=new Float32Array(positions.length), closing=new Float32Array(positions.length);
    const bell=(distance,width)=>Math.exp(-((distance/width)**2));
    for (let i=0;i<positions.length;i+=3) {
      const x=headData.positions[i]/3000,y=headData.positions[i+1]/3000,z=headData.positions[i+2]/3000;
      const side=Math.abs(x), front=T.MathUtils.smoothstep(z,.60,1.32);
      positions.set(local(x,y,z),i);
      tint.copy(skinTone);
      tint.lerp(blush,bell(side-.55,.22)*bell(y-6.96,.28)*front*.38);
      tint.lerp(shade,bell(side-.29,.25)*bell(y-7.30,.12)*front*.32);
      tint.lerp(lips,bell(x,.22)*bell(y-6.77,.072)*T.MathUtils.smoothstep(z,1.30,1.57)*.70);
      tint.lerp(shade,T.MathUtils.smoothstep(side,.69,.85)*bell(y-7.11,.43)*.23);
      tint.multiplyScalar(1+Math.sin(x*12+y*9+z*7)*.025);
      colors.set([tint.r,tint.g,tint.b],i);
      const socket=bell(side-.322,.156)*bell(y-7.281,.235)*T.MathUtils.smoothstep(z,1.19,1.37);
      closing[i+1]=(7.275-y)*ys*socket*.96;
    }
    const geometry=new T.BufferGeometry();
    geometry.setIndex(new T.BufferAttribute(headData.indices,1));
    geometry.setAttribute('position',new T.BufferAttribute(positions,3));
    geometry.setAttribute('color',new T.BufferAttribute(colors,3));
    geometry.computeVertexNormals();
    geometry.morphAttributes.position=[new T.BufferAttribute(closing,3)];
    geometry.morphTargetsRelative=true;
    const flesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.72}));
    flesh.castShadow=true;
    flesh.receiveShadow=true;
    features.add(flesh);

    const globe=new T.SphereGeometry(1,22,16);
    const specular=new T.MeshStandardMaterial({color:0xf2e5dc,roughness:.20});
    const pigment=new T.MeshStandardMaterial({color:style==='mother'?0x514437:0x392921,roughness:.31});
    const black=new T.MeshStandardMaterial({color:0x131417,roughness:.21});
    const catchlight=new T.MeshBasicMaterial({color:0xffead1});
    const eyeMotion=[];
    function ball(parent,material,position,scale) {
      const piece=new T.Mesh(globe,material);
      piece.position.set(...position);
      piece.scale.set(...scale);
      parent.add(piece);
      return piece;
    }
    function strand(parent,points,radius,material){
      const curve=new T.CatmullRomCurve3(points.map(point=>new T.Vector3(...point)));
      const mesh=new T.Mesh(new T.TubeGeometry(curve,14,radius,5),material);
      parent.add(mesh);
    }
    const browMaterial=art.material(hair,'hair');
    for (const s of [-1,1]) {
      const eye=new T.Group();
      eye.position.set(...local(s*.315,7.287,1.238));
      features.add(eye);
      ball(eye,specular,[0,0,0],[.0182,.0159,.0184]);
      ball(eye,pigment,[-.0005,.0003,.0170],[.0075,.0074,.0029]);
      ball(eye,black,[-.0007,.0003,.0196],[.0039,.0040,.0011]);
      ball(eye,catchlight,[-.0025,.0025,.0204],[.0014,.0014,.0007]);
      eyeMotion.push(eye);
      const browHeight=style==='boy'?7.438:7.467;
      strand(features,[[s*.177,browHeight,1.411],[s*.293,browHeight+.046,1.424],
        [s*.402,browHeight+.019,1.365],[s*.508,browHeight-.035,1.287]].map(point=>local(...point)),style==='boy'?.0032:.0022,browMaterial);
    }
    const hairMaterial=art.material(0xffffff,'hair').clone();
    hairMaterial.vertexColors=true;
    hairMaterial.side=T.DoubleSide;
    const hairstyle=new T.Mesh(hairCap(T,geometry,style,hair),hairMaterial);
    hairstyle.castShadow=true;
    hairstyle.receiveShadow=true;
    features.add(hairstyle);
    if (!hat && style!=='boy' && style!=='mentor') {
      const bound=style==='mother';
      const tail=bound?[[.022,.035,-.144,.050,.033],[.036,.053,-.159,.057,.047],[.048,.071,-.167,.006,.010]]:
        [[.014,.021,-.143,.034,.026],[.026,-.034,-.164,.041,.033],[.051,-.109,-.168,.032,.025],[.059,-.159,-.149,.009,.009]];
      const bunch=new T.Mesh(garment(T,tail,.045),browMaterial);
      bunch.castShadow=true;
      features.add(bunch);
    }
    if (hat) {
      const profile=[[0,.208],[.068,.208],[.094,.197],[.104,.167],[.108,.139],[.148,.129],
        [.189,.111],[.193,.101],[.182,.100],[.136,.122],[.091,.132]].map(([r,y])=>new T.Vector2(r,y));
      const straw=art.material(0xad8f56,'cloth').clone();
      straw.side=T.DoubleSide;
      const brim=new T.Mesh(new T.LatheGeometry(profile,42),straw);
      brim.position.z=-.021;
      brim.rotation.z=.055;
      brim.castShadow=true;
      features.add(brim);
      const band=new T.Mesh(new T.CylinderGeometry(.100,.108,.018,42,1,true),art.material(0x5f5949,'cloth'));
      band.position.set(0,.150,-.021);
      band.rotation.z=.055;
      features.add(band);
    }

    return {root,animate(time){
      const pulse=(time+phase)%(4.1+(phase%1.6));
      const blink=T.MathUtils.clamp(Math.sin(Math.PI*pulse/.20),0,1)*(pulse<.20?1:0);
      flesh.morphTargetInfluences[0]=blink;
      for(const eye of eyeMotion) eye.scale.y=1-blink*.83;
      features.rotation.y=Math.sin(time*.63+phase)*.042;
      features.rotation.z=Math.sin(time*.84+phase)*.018;
      features.rotation.x=Math.sin(time*.71+phase)*.014+(pose==='crouch'?.045:0);
    }};
  }
  return {garment,head};
})();
