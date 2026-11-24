(window.WW_WORLDS ||= {}).garden = function({T,scene},act) {
  const k=worldCraft(T,scene,383+act*87);
  const {mesh:m,batch:b,range:r,choose,group,limb,curve,contact,person,art}=k;
  const obstacles=[], motion=[];
  const greens=[0x48632e,0x698344,0x2f492c,0x546b33,0x7c8b49];
  const petals=[0xc85489,0xe992b1,0x9c72b0,0xeaab70,0xf5dcb6];
  const stone=[0x968c74,0xa89e8b,0x807769,0xbfb098,0x6c6c63];
  const upward=new T.Vector3(0,1,0),direction=new T.Vector3();
  const branchRotation=new T.Quaternion(),branchAngles=new T.Euler();
  k.light(act===3?0xe8c4a1:0xc1d2c1,0x4b5136,.024,act===3?0xffba83:0xffdfaa,2.55,[-6,9,-4]);
  art.key(0xffe0bd,1.48,[3.5,5,8],[0,1,-1],false);
  art.sky({top:act===3?0x82aebe:0x78aec8,horizon:act===3?0xffdab0:0xd6e4d0,
    cloud:0xfff7e6,shade:0x8d9696,cover:.45,glow:act===3?.36:.18,solar:.30});
  m('box',0x92917a,0,-.19,0,56,.36,62,scene,0,'forest');
  function block(x,z,w,d) { obstacles.push([x-w/2,x+w/2,z-d/2,z+d/2]); }
  function rock(x,z,scale) {
    b('stone',choose(stone),x,scale*.24-.025,z,scale,scale*.53,scale*.76,r(0,1),r(0,6));
  }
  function leaves(x,y,z,radius,count,tints=greens){
    for(let i=0;i<count;i++){
      const spin=r(0,Math.PI*2), radiusAt=radius*r(.34,1);
      const size=radius*r(.086,.215);
      b('leaf',choose(tints),x+Math.cos(spin)*radiusAt,y+r(-.32,.55)*radius,z+Math.sin(spin)*radiusAt,
        size,size*r(.78,1.4),size,r(-.9,.79),spin,r(-.87,.87));
    }
  }
  function bloom(x,z,spread,count) {
    for(let i=0;i<count;i++) {
      const dx=r(-spread,spread), dz=r(-spread,spread);
      const h=r(.12,.59), color=choose(petals);
      b('tube',choose(greens),x+dx,h*.48,z+dz,.012,h,.012,0,0,r(-.13,.13));
      const s=r(.035,.066);
      for(let p=0;p<5;p++){
        const a=p*Math.PI*2/5;
        b('bud',color,x+dx+Math.cos(a)*s*.64,h,z+dz+Math.sin(a)*s*.64,s,.024,s*.55,
          r(.1,.36),-a,.1);
      }
      b('bud',0xe8b04b,x+dx,h+.015,z+dz,.022,.019,.023);
      b('leaf',choose(greens),x+dx+.048,h*.45,z+dz,.045,.095,.045,.9,r(0,6),.49);
    }
  }
  function shrub(x,z,size) {
    for(let j=0;j<5;j++){
      const px=x+r(-size,size), py=r(.33,.57)*size,pz=z+r(-size,size);
      b('canopy',choose(greens),px,py,pz,size*r(.38,.63),size*r(.36,.59),size*r(.43,.68),0,r(0,6));
      leaves(px,py+.13,pz,size*.67,14);
    }
  }
  function twig(a,end,radius,color) {
    direction.set(end[0]-a[0],end[1]-a[1],end[2]-a[2]);
    const length=direction.length();
    branchRotation.setFromUnitVectors(upward,direction.normalize());
    branchAngles.setFromQuaternion(branchRotation);
    b('branch',color,(a[0]+end[0])*.5,(a[1]+end[1])*.5,(a[2]+end[2])*.5,
      radius,length,radius,branchAngles.x,branchAngles.y,branchAngles.z,'bark');
  }
  function tree(x,z,height,flower=false) {
    const lean=r(-.19,.19)*height;
    twig([x,-.09,z],[x+lean,height*.78,z+.07],height*.066,0x715d44);
    for(const side of [-1,1]) {
      const fork=r(.39,.52)*height;
      const tip=[x+side*r(.24,.33)*height+lean*.78,height*r(.79,.93),z+r(-.17,.16)*height];
      twig([x+lean*fork/(height*.78),fork,z+.042],tip,height*.033,0x775f43);
      twig([x+(tip[0]-x)*.62,height*.70,z+(tip[2]-z)*.65],
        [tip[0]-side*.025*height,tip[1]+.16*height,tip[2]-.071*height],height*.018,0x796449);
    }
    const distant=z<-7 || Math.abs(x)>5;
    for(let j=0;j<(distant?9:14);j++){
      const px=x+r(-1.1,1.1)*height*.34, py=height*r(.66,1.035), pz=z+r(-1.1,1.1)*height*.33;
      const crown=height*r(.14,.23);
      b('canopy',choose(greens),px,py,pz,crown*.83,crown*.58,crown*.73,r(0,1),r(0,6));
      leaves(px,py+.02,pz,crown*1.21,distant?11:21,greens);
      if(flower) for(let fl=0;fl<(distant?6:10);fl++) b('bud',choose(petals),px+r(-crown,crown),py+r(-.35,.53)*crown,
        pz+r(-crown,crown),height*.030,height*.017,height*.027,r(0,1),r(0,6));
    }
  }
  function path(length,width) {
    const position=[],uv=[],index=[];
    for(let row=0;row<=length;row++) for(let col=0;col<=4;col++) {
      const z=8-row*.69;
      const half=width*.5+.07*Math.sin(z*1.62);
      const x=(col/2-1)*half+Math.sin(z*.24)*.28;
      position.push(x,.007+.008*Math.sin(z*2.7+x*2),z);
      uv.push(x*.5,z*.5);
      if (row<length && col<4) {
        const a=row*5+col,b=a+5;
        index.push(a,a+1,b,b,a+1,b+1);
      }
    }
    const surface=new T.BufferGeometry();
    surface.setAttribute('position',new T.Float32BufferAttribute(position,3));
    surface.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    surface.setIndex(index);
    surface.computeVertexNormals();
    m(surface,0xdec9a8,0,0,0,1,1,1,scene,0,'pavers');
  }
  function kitten(x,z,yaw=0,size=1) {
    const cat=group(x,0,z,yaw);cat.scale.setScalar(size*.79);
    const orange=0xcf853f,cream=0xf4ddba,dark=0x93602e;
    m('globe',orange,0,.241,-.080,.188,.224,.279,cat,0,'fur');
    m('globe',cream,0,.225,.083,.147,.165,.126,cat,0,'fur');
    const head=new T.Group();
    head.position.set(0,.453,.135);
    cat.add(head);
    const skull=new T.SphereGeometry(1,34,24),points=skull.attributes.position,colors=[];
    const ginger=new T.Color(orange),white=new T.Color(cream),tabby=new T.Color(dark),fur=new T.Color();
    for(let i=0;i<points.count;i++) {
      const x0=points.getX(i),y0=points.getY(i),z0=points.getZ(i);
      const chin=Math.max(0,z0)**2*Math.exp(-x0*x0*5-(y0+.38)**2*8);
      points.setXYZ(i,x0*(y0<0?.163:.178),y0*.159,z0*.147+.050*chin);
      const patch=(1-T.MathUtils.smoothstep(y0,-.51,-.30))*Math.max(0,z0);
      const stripes=Math.max(0,Math.cos(x0*22+y0*6+z0*3))**6 * T.MathUtils.smoothstep(y0,.02,.59);
      fur.copy(ginger).lerp(tabby,stripes*.66).lerp(white,patch);
      colors.push(fur.r,fur.g,fur.b);
    }
    skull.computeVertexNormals();
    skull.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const furMaterial=k.mat(0xffffff,0,'fur').clone();
    furMaterial.vertexColors=true;
    const face=new T.Mesh(skull,furMaterial);
    face.castShadow=true;
    face.receiveShadow=true;
    head.add(face);
    const earForm=new T.Shape();
    earForm.moveTo(-.073,-.012);
    earForm.quadraticCurveTo(-.078,.073,-.044,.145);
    earForm.quadraticCurveTo(-.033,.163,-.018,.147);
    earForm.quadraticCurveTo(.045,.084,.069,-.019);
    earForm.quadraticCurveTo(-.013,-.027,-.073,-.012);
    const earShell=new T.ExtrudeGeometry(earForm,{depth:.017,bevelEnabled:true,bevelThickness:.008,bevelSize:.007,bevelSegments:2});
    const eyes=[];
    for(const side of [-1,1]) {
      const ear=new T.Group();
      ear.position.set(side*.111,.098,-.019);
      ear.rotation.set(-.12,side*.23,side*-.29);
      head.add(ear);
      m(earShell,orange,0,0,0,-side,1,1,ear,0,'fur');
      m(earShell,0xd69b83,0,.016,.018,-side*.64,.75,.45,ear,0,'fur');
      const eye=new T.Group();
      eye.position.set(side*.078,.025,.121);
      head.add(eye);
      m('globe',0x86572e,0,0,0,.044,.039,.025,eye,0,'fur');
      m('globe',0x93763d,0,-.003,.018,.036,.031,.012,eye,0,'glaze');
      m('globe',0x171d13,0,-.003,.027,.011,.027,.005,eye,0,'glaze');
      m('globe',0xf9ebca,-.007,.006,.031,.005,.005,.002,eye);
      eyes.push(eye);
      m('globe',cream,side*.146,.084,.18,.079,.078,.108,cat,0,'fur');
      m('globe',orange,side*.146,.111,-.219,.078,.112,.118,cat);
      for(let i=0;i<3;i++){
        const y=-.073+i*.014;
        curve(head,[[side*.071,y,.169],[side*.14,y+.017,.172],[side*.214,y+i*.014,.170]],.0013,0xe8d5b5);
      }
    }
    m('globe',0xaf7568,0,-.048,.188,.024,.015,.013,head,0,'glaze');
    const collar=m(new T.TorusGeometry(.115,.013,7,28),0x5b6152,0,.347,.081,1,.92,1,cat,0,'cloth');
    collar.rotation.x=Math.PI*.5-.23;
    const tag=m('tube',0xc7a369,.023,.287,.185,.034,.012,.034,cat,0,'metal');
    tag.rotation.x=Math.PI*.5;
    m('globe',0x775a32,.023,.308,.191,.006,.007,.002,cat,0,'metal');
    const tail=new T.Group();
    tail.position.set(0,.2,-.29);
    cat.add(tail);
    curve(tail,[[0,0,0],[-.08,.077,-.13],[-.134,.232,-.10],[-.128,.345,-.065]],.051,orange,'fur');
    m('globe',cream,-.128,.347,-.064,.051,.055,.047,tail,0,'fur');
    contact(x,z,.36*size,.32*size);
    motion.push(t=>{
      const cycle=(t+Math.abs(x))%4.3;
      const blink=cycle<.18?Math.sin(cycle*Math.PI/.18):0;
      for(const eye of eyes) eye.scale.y=1-.9*blink;
      head.rotation.y=Math.sin(t*.55+x)*.09;
      tail.rotation.y=Math.sin(t*1.32)*.24;
      tail.rotation.z=Math.sin(t*1.8)*.065;
    });
    return cat;
  }
  function bench(x,z,yaw=0) {
    const seat=group(x,0,z,yaw);
    const wood=0x915d3b,metal=0x424b3b;
    for(let i=0;i<4;i++) m('bevel',i%2?0xa66b41:wood,0,.42,-.23+i*.153,1.96,.074,.138,seat,0,'wood');
    for(let i=0;i<4;i++) m('bevel',wood,0,.58+i*.108,-.31-i*.025,1.96,.10,.075,seat,0,'wood');
    for(const side of [-1,1]) {
      curve(seat,[[side*.83,.03,.22],[side*.83,.26,.19],[side*.83,.46,.08],[side*.83,.58,.23],[side*.83,.63,.04],[side*.83,.63,-.28],[side*.83,.92,-.39]],.035,metal,'metal');
      curve(seat,[[side*.82,.02,-.36],[side*.82,.18,-.21],[side*.82,.33,-.24],[side*.82,.35,-.35],[side*.82,.28,-.39]],.033,metal,'metal');
    }
    block(x,z,2,.78);
  }
  function basket(x,y,z) {
    const root=group(x,y,z);
    const wicker=0xaf8450;
    m(new T.CylinderGeometry(.27,.21,.19,24),wicker,0,.095,0,1,1,1,root,0,'wood');
    for(let band=0;band<7;band++) {
      const rope=m(new T.TorusGeometry(.216+band*.008,.009,5,24),band%2?0xc89a60:0x937144,0,.022+band*.026,0,1,1,1,root);
      rope.rotation.x=Math.PI/2;
    }
    m(new T.TorusGeometry(.235,.026,6,18,Math.PI),0xc59859,0,.175,0,1,1,1,root);
    m('bevel',0x536b9e,.028,.182,.036,.39,.078,.38,root,0,'cloth').rotation.y=.18;
    m('bevel',0x536b9e,.11,.114,.244,.26,.195,.079,root,0,'cloth').rotation.z=.26;
    return root;
  }
  function greenhouse(x,z) {
    const gh=group(x,0,z);
    const frame=0x456f61;
    for(const side of [-1,1]) {
      for(let i=0;i<5;i++) m('box',frame,side*2.3,1.27,.9-i*.72,.085,2.54,.085,gh);
      m('box',frame,side*2.3,2.55,-.58,.095,.106,3.13,gh);
      m('box',0x9b9279,side*2.31,.25,-.58,.25,.5,3.13,gh);
      for(let i=0;i<5;i++) limb(gh,[0,3.7,.9-i*.72],[side*2.3,2.55,.9-i*.72],.055,frame);
    }
    m('box',frame,0,3.69,-.56,.10,.10,3.15,gh);
    const glass=new T.MeshPhysicalMaterial({color:0xb6d5c3,transparent:true,opacity:.22,roughness:.2,side:T.DoubleSide,depthWrite:false});
    for(const side of [-1,1]) {
      const wall=new T.Mesh(new T.PlaneGeometry(3,2.05),glass);
      wall.position.set(side*2.3,1.5,-.6);wall.rotation.y=Math.PI/2;gh.add(wall);
      const roof=new T.Mesh(new T.PlaneGeometry(2.56,3),glass);
      roof.rotation.x=-Math.PI/2;roof.rotation.y=side*.465;roof.position.set(side*1.15,3.12,-.5);gh.add(roof);
    }
    for(let arch=0;arch<5;arch++){
      const z0=.9-arch*.72;
      const points=Array.from({length:13},(_,i)=>[Math.cos(i*Math.PI/12)*2.31,2.5+Math.sin(i*Math.PI/12)*1.23,z0]);
      curve(gh,points,.038,0x709586,'metal');
    }
    for(let i=0;i<9;i++) {
      const x2=r(-1.8,1.8),z2=r(-1.9,.64),h=r(.43,.82);
      m('tube',0xaa7c55,x2,.17,z2,.14,.29,.14,gh);
      m('faceted',choose(greens),x2,h*.68,z2,.22,h*.64,.22,gh);
    }
    block(x,z-.62,4.76,3.05);
  }
  function gate(z) {
    for(const x of [-1.34,1.34]) {
      for(let row=0;row<9;row++) m('bevel',choose(stone),x,.138+row*.27,z,.35,.255,.33,scene,0,'stone');
      m('bevel',0xaa9070,x,2.49,z,.45,.15,.45,scene,0,'stone');
      block(x,z,.31,.32);
    }
    m('bevel',0x685135,0,2.55,z,3.06,.20,.46,scene,0,'wood');
    for(let slat=-4;slat<=4;slat++) m('bevel',0x7d6344,slat*.349,2.686,z,.13,.095,.74,scene,0,'wood');
    for(let i=0;i<37;i++) {
      const x=r(-1.53,1.53), y=r(2.42,2.82), z2=z+r(-.23,.26);
      b('faceted',choose(greens),x,y,z2,r(.11,.26),r(.12,.23),r(.1,.22));
      if(i%3===0) for(let d=0;d<6;d++) b('bud',choose([0xa268bb,0xb388c4,0xd1a5d4]),x+r(-.06,.06),y-.04-d*.077,z2+.14,
        .096-d*.010,.064,.066-d*.006);
    }
  }
  path(33,act===2?3.3:2.45);
  for(let i=0;i<29;i++) {
    const sign=i%2?1:-1, z=r(-17,11), x=sign*r(2.05,7.9);
    tree(x,z,r(2.42,5.47),i%6===0);
  }
  for(let i=0;i<65;i++) {
    const sign=i%2?-1:1, x=sign*r(1.61,6.1), z=r(-12,8.5);
    if(i%3===0) shrub(x,z,r(.45,.87));
    bloom(x,z,.42,i%3===0?5:7);
    if(i%2===0) rock(x,z,r(.08,.47));
  }
  for(let i=0;i<76;i++) {
    const side=i%2===0?1:-1,z=r(-13,8.8),x=side*r(1.28,2.3);
    leaves(x,.135,z,r(.16,.32),9);
    if(i%4===0)bloom(x,z,.18,5);
  }
  for(let i=-7;i<=7;i++){
    const x=i*1.71,z=-15.4-r(0,3);
    shrub(x,z,r(.74,1.2));
    if(i%2===0) tree(x,z,r(2.25,4.0),i%4===0);
  }
  const hill=art.crag(1,true);
  for(const side of [-1,1]) for(let i=0;i<5;i++) {
    const z=-16+i*7.4;
    m(hill,choose([0x758259,0x66785d,0x7b8059]),side*r(14,16),-.35,z,r(4.3,6.2),r(.92,1.66),r(4.9,6.6),scene,0,'terrain');
    tree(side*r(9.1,11.9),z,r(2.8,4.2));
  }
  for(let i=-18;i<22;i++) {
    const z=i*.63;
    for(const side of [-1,1]) {
      b('box',0x917e62,side*7.5,.42,z,.115,.84,.122);
      b('box',0xa39171,side*7.5,.59,z,.074,.067,.64);
      b('box',0xa39171,side*7.5,.29,z,.074,.067,.64);
    }
  }
  let look=[0,1.2,-3.7], spawn=[0,1.66,5.5];
  if(act===0) {
    gate(-1.68);
    person(-1.04,2.54,{coat:0xbf8532,bag:true,yaw:.37,pose:'listen',scale:1.08});
    block(-1.04,2.54,.54,.47);
    greenhouse(3.8,-10);
    bench(2.2,-3.4,-.15);
    look=[-.18,1.28,-2];
  } else if(act===1) {
    bench(-1.23,-.82,.47);
    kitten(-.45,.34,.56,1.20);
    person(.62,.15,{coat:0xbf8532,bag:true,yaw:-.61,pose:'crouch',scale:1.18});
    block(.62,.15,.60,.51);
    bloom(-.88,1.08,.26,9);
    bloom(.97,-.12,.28,10);
    greenhouse(4.1,-9.2);
    look=[0,.8,-2.0];spawn=[.24,1.65,3.0];
  } else if(act===2) {
    greenhouse(0,-6.5);
    person(-.62,-.02,{coat:0x9b8a74,yaw:.62,pose:'give',hat:true,scale:1.12,hair:0x8c8272});
    person(.64,-.09,{coat:0xbf8532,bag:true,yaw:-.54,pose:'give',scale:1.08});
    basket(0,.83,.22);
    kitten(-.04,.22,.1,.56).position.y=.96;
    m('bevel',0x79583e,0,.40,.19,.86,.77,.57,scene,0,'wood');
    block(0,.19,.86,.57);block(-.62,-.02,.49,.45);block(.64,-.09,.49,.45);
    spawn=[0,1.64,3.21];look=[0,1.13,-2.56];
  } else {
    tree(.6,-3.2,4.8,true);
    gate(-6.2);
    person(-.76,-.28,{coat:0xbf8532,bag:true,yaw:.42,pose:'give',scale:1.06});
    person(0,.01,{coat:0x516c97,scale:.82,yaw:.16,pose:'give',style:'boy'});
    person(.77,-.36,{coat:0xccb098,scale:1.14,yaw:-.30,style:'mother'});
    kitten(.05,.23,.42,.73).position.y=.66;
    block(-.76,-.28,.52,.48);block(0,.01,.47,.44);block(.77,-.36,.55,.49);
    look=[0,1.14,-2.4];spawn=[.08,1.65,3.65];
  }
  for(const side of [-1,1]) for(let i=0;i<32;i++) {
    const z=7.5-i*.45;
    const x=side*((act===2?1.66:1.23)+.07*Math.sin(z*1.62))+.28*Math.sin(z*.24)+r(-.06,.06);
    b('bevel',choose(stone),x,.042,z,r(.17,.24),r(.09,.135),r(.33,.45),0,r(-.16,.16),0,'stone');
    for(let flake=0;flake<4;flake++) b('stone',choose(stone),x-side*r(.08,.32),.018,z+r(-.2,.2),
      r(.025,.060),r(.014,.028),r(.032,.064),0,r(0,6));
  }
  const flowerHalf=act===2?1.81:1.42;
  for(const [bloom,tint] of [[0xe89d91,0xfff2e2],[0xffe6ac,0xf1ead3],[0xae8bbf,0xf1e4f5]]) {
    const planting=Array.from({length:15},(_,i)=>{
      const z=4.68-r(0,9.8), side=i%2?1:-1;
      return [side*(flowerHalf+r(0,.42))+.28*Math.sin(z*.24),z,r(.57,1.14),r(0,6.28),tint];
    });
    art.flowers(planting,bloom,.78);
  }
  for(let i=0;i<138;i++) {
    const z=r(-9,7.8), side=i%2?1:-1;
    const x=side*r(flowerHalf,6.8)+.28*Math.sin(z*.24);
    for(let j=0;j<4;j++) b('leaf',choose(greens),x+r(-.10,.10),.071,z+r(-.10,.10),
      .017,r(.060,.111),.05,r(-.31,.31),r(0,6.28),r(-.60,.60));
  }
  for(const [x,z,tint] of [[-1.83,.75,0xe9b876],[1.98,-1.22,0xf0d4a1]]) {
    const insect=group(x,.49,z);
    m('globe',0x4b4232,0,0,0,.012,.019,.064,insect);
    const wings=[-1,1].map(side=>{
      const hinge=new T.Group();
      insect.add(hinge);
      for(const [front,span,depth] of [[.036,.071,.079],[-.039,.049,.055]]) {
        const wing=m('leaf',tint,side*span*.66,.004,front,span,depth,.018,hinge);
        wing.rotation.set(-Math.PI/2,0,side*.43);
      }
      return hinge;
    });
    motion.push(time=>{
      insect.position.set(x+Math.sin(time*.63+x)*.27,.54+Math.sin(time*1.53+x)*.17,z+Math.cos(time*.74)*.29);
      insect.rotation.y=time*.66+x;
      wings.forEach((hinge,index)=>hinge.rotation.z=(index?1:-1)*(.27+Math.sin(time*15+x)*.69));
    });
  }
  k.finish();
  return {spawn,look,bounds:[-6.4,6.4,-14,10],obstacles,animate(t){k.animate(t);motion.forEach(update=>update(t));}};
};
