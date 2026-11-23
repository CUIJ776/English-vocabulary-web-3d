(window.WW_WORLDS ||= {}).garden = function({T,scene},act) {
  const k=worldCraft(T,scene,383+act*87);
  const {mesh:m,batch:b,range:r,choose,group,limb,curve,contact,person,art}=k;
  const obstacles=[], motion=[];
  const greens=[0x48632e,0x698344,0x2f492c,0x546b33,0x7c8b49];
  const petals=[0xc85489,0xe992b1,0x9c72b0,0xeaab70,0xf5dcb6];
  const stone=[0x968c74,0xa89e8b,0x807769,0xbfb098,0x6c6c63];
  k.light(act===3?0xe8c4a1:0xc1d2c1,0x4b5136,.024,act===3?0xffba83:0xffdfaa,2.55,[-6,9,-4]);
  art.key(0xffe0bd,1.48,[3.5,5,8],[0,1,-1],false);
  art.sky({top:0x8fb8c6,horizon:act===3?0xf4d5ad:0xe8e4c3,cloud:0xfff2ce,shade:0x9fac9a,cover:.47,glow:act===3?.32:.14});
  m('box',0x464728,0,-.19,0,56,.36,62,scene,0,'terrain');
  function block(x,z,w,d) { obstacles.push([x-w/2,x+w/2,z-d/2,z+d/2]); }
  function rock(x,z,scale) {
    b('stone',choose(stone),x,scale*.24-.025,z,scale,scale*.53,scale*.76,r(0,1),r(0,6));
  }
  function leaves(x,y,z,radius,count,tints=greens){
    for(let i=0;i<count;i++){
      const spin=r(0,Math.PI*2), radiusAt=radius*r(.34,1);
      const size=radius*r(.11,.29);
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
  function tree(x,z,height,flower=false) {
    b('tube',0x59472e,x,height*.37,z,height*.064,height*.74,height*.055,0,0,r(-.1,.1),'bark');
    for(const sign of [-1,1]) b('tube',0x68583d,x+sign*height*.14,height*.64,z,height*.036,height*.46,height*.031,
      r(-.2,.2),0,sign*-.65,'bark');
    for(let j=0;j<15;j++){
      const px=x+r(-1.1,1.1)*height*.34, py=height*r(.66,1.035), pz=z+r(-1.1,1.1)*height*.33;
      const crown=height*r(.14,.23);
      b('canopy',choose(greens),px,py,pz,crown,crown*.56,crown*.82,r(0,1),r(0,6));
      leaves(px,py+.02,pz,crown*1.15,23,flower&&j%3!==0?[...petals,...greens]:greens);
      if(flower) for(let fl=0;fl<12;fl++) b('bud',choose(petals),px+r(-crown,crown),py+r(-.35,.53)*crown,
        pz+r(-crown,crown),height*.030,height*.017,height*.027,r(0,1),r(0,6));
    }
  }
  function path(length,width) {
    for(let j=0;j<length;j++) for(let bin=-1;bin<=1;bin++) {
      const z=8-j*.69, x=(width/3)*bin + Math.sin(z*.24)*.37+r(-.07,.07);
      b('bevel',choose(stone),x,-.003+r(-.006,.005),z,width/3-r(.036,.066),.045,r(.60,.675),0,r(-.055,.055),0,'stone');
      if(j%2===0) b('stone',choose(greens),x+r(-.31,.31),.024,z-.29,.082,.024,.079,0,r(0,6));
    }
  }
  function kitten(x,z,yaw=0,size=1) {
    const cat=group(x,0,z,yaw);cat.scale.setScalar(size);
    const orange=0xdb853e,cream=0xffe5c9,dark=0x954f26;
    m('globe',orange,0,.247,-.074,.20,.232,.284,cat,0,'fur');
    m('globe',cream,0,.225,.098,.153,.170,.12,cat,0,'fur');
    m('globe',orange,0,.463,.134,.205,.183,.167,cat,0,'fur');
    for(const side of [-1,1]) {
      m('cone',orange,side*.135,.633,.13,.097,.21,.085,cat,0,'fur').rotation.z=side*-.22;
      m('cone',0xe7a088,side*.137,.64,.171,.052,.112,.026,cat).rotation.z=side*-.22;
      m('globe',0xa76b36,side*.088,.485,.267,.049,.053,.024,cat);
      m('globe',0x84754a,side*.087,.480,.283,.039,.046,.014,cat,0,'glaze');
      m('globe',0x20251f,side*.087,.479,.293,.018,.035,.009,cat);
      m('globe',0xfff2cf,side*.084-.012,.501,.299,.012,.013,.006,cat);
      m('globe',cream,side*.052,.39,.271,.071,.052,.042,cat);
      m('globe',cream,side*.146,.084,.18,.079,.078,.108,cat,0,'fur');
      m('globe',orange,side*.146,.111,-.219,.078,.112,.118,cat);
      for(let i=0;i<3;i++){
        const y=.385+i*.012;
        curve(cat,[[side*.094,y,.312],[side*.164,y+.016,.32],[side*.232,y+.026+i*.007,.317]],.0019,0xe8d5b5);
      }
      for(let i=0;i<3;i++) m('globe',dark,side*(.035+i*.023),.594-i*.009,.204+i*.018,.015,.023,.018,cat,0,'fur');
    }
    m('globe',0xbf7865,0,.417,.314,.033,.022,.019,cat,0,'glaze');
    const tail=new T.Group();
    tail.position.set(0,.2,-.29);
    cat.add(tail);
    curve(tail,[[0,0,0],[-.08,.077,-.13],[-.134,.232,-.10],[-.128,.345,-.065]],.051,orange,'fur');
    m('globe',cream,-.128,.347,-.064,.051,.055,.047,tail,0,'fur');
    contact(x,z,.36*size,.32*size);
    motion.push(t=>{tail.rotation.y=Math.sin(t*2)*.28;tail.rotation.z=Math.sin(t*2.4)*.08;});
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
    const x=side*(1.46+.17*Math.sin(z*.24)) + r(-.07,.07);
    b('bevel',choose(stone),x,.042,z,r(.17,.24),r(.09,.135),r(.33,.45),0,r(-.16,.16),0,'stone');
    for(let flake=0;flake<4;flake++) b('stone',choose(stone),x-side*r(.08,.32),.018,z+r(-.2,.2),
      r(.025,.060),r(.014,.028),r(.032,.064),0,r(0,6));
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
  return {spawn,look,bounds:[-6.4,6.4,-14,10],obstacles,animate(t){motion.forEach(update=>update(t));}};
};
