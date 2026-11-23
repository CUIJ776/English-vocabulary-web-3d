(window.WW_WORLDS ||= {}).station = function({T,scene},act) {
  const k=worldCraft(T,scene,714+act*159);
  const {mesh:m,batch:b,range:r,choose,group,limb,curve,person,art}=k;
  const obstacles=[], anim=[];
  const slate=[0x526372,0x485660,0x67767b,0x838785];
  const steel=0x50656d, charcoal=0x293c47, amber=0xffc27c;
  const red=0x9d3b32, blue=0x2d4d78;
  const outside=act===0||act===3;
  function block(x,z,w,d) { obstacles.push([x-w/2,x+w/2,z-d/2,z+d/2]); }
  function sparks(color,intensity,x,y,z,radius=5) {
    const light=new T.PointLight(color,intensity,radius,2);
    light.position.set(x,y,z);
    scene.add(light);
    return light;
  }
  function pole(x,y,z,radius,length,color,parent=scene) {
    return m('tube',color,x,y,z,radius,length,radius,parent);
  }
  function windGauge(x,z,base) {
    const root=group(x,0,z);
    pole(0,base+.91,0,.065,1.82,steel,root);
    const rotor=group(0,0,0);
    root.add(rotor);
    rotor.position.y=base+1.82;
    pole(0,.07,0,.105,.23,charcoal,rotor);
    for(let i=0;i<3;i++) {
      const a=i*Math.PI*2/3;
      limb(rotor,[0,.13,0],[Math.cos(a)*.33,.13,Math.sin(a)*.33],.022,steel);
      m('globe',0x2c444d,Math.cos(a)*.35,.14,Math.sin(a)*.35,.085,.069,.083,rotor);
    }
    anim.push(t=>{rotor.rotation.y=t*(act===0?4.1:1.7);});
  }
  function mast(x,z,height=2.6,base=0) {
    const root=group(x,base,z);
    m('box',charcoal,0,.095,0,.65,.20,.60,root);
    pole(0,height/2+.15,0,.045,height,steel,root);
    for(const h of [height*.38,height*.51,height*.68]) {
      m('cone',0xaab7b5,0,h,0,.22,.13,.22,root);
      pole(0,h-.055,0,.22,.035,0x879291,root);
    }
    m('box',0x384f56,.25,height*.35,0,.16,.24,.16,root);
    const dot=m('globe',0x78dfab,.29,height*.37,.092,.033,.033,.018,root,1.15);
    anim.push(t=>{dot.scale.y=.029+Math.sin(t*4)*.007;});
    windGauge(x+.66,z+.39,base+.45);
    return root;
  }
  function display(x,y,z,scale=1) {
    const screen=group(x,y,z);
    screen.scale.setScalar(scale);
    m('bevel',0x263943,0,0,0,1.12,.78,.11,screen,0,'metal');
    const canvas=document.createElement('canvas');
    canvas.width=384;canvas.height=256;
    const ctx=canvas.getContext('2d');
    const wash=ctx.createLinearGradient(0,0,0,256);
    wash.addColorStop(0,'#182e42');
    wash.addColorStop(1,'#122339');
    ctx.fillStyle=wash;ctx.fillRect(0,0,384,256);
    ctx.font='13px monospace';ctx.fillStyle='#c3e2eb';
    ctx.fillText('RIDGE STATION  /  LIVE',20,26);
    ctx.font='10px monospace';ctx.fillText('WIND       RAINFALL       PRESSURE',20,241);
    ctx.strokeStyle='#486981';ctx.lineWidth=1.25;
    for(let i=0;i<8;i++){
      ctx.beginPath();ctx.moveTo(21,49+i*21);ctx.lineTo(363,49+i*21);ctx.stroke();
      ctx.beginPath();ctx.moveTo(23+i*46,48);ctx.lineTo(23+i*46,218);ctx.stroke();
    }
    ctx.fillStyle='#51879f';
    for(let i=0;i<12;i++) ctx.fillRect(43+i*25,210-(i*17%57),14,10+i*17%57);
    const texture=new T.CanvasTexture(canvas);
    texture.colorSpace=T.SRGBColorSpace;
    const panel=new T.Mesh(new T.PlaneGeometry(1.005,.664),new T.MeshBasicMaterial({map:texture,toneMapped:false}));
    panel.position.z=.061;
    screen.add(panel);
    const points=Array.from({length:22},(_,i)=>new T.Vector3(-.41+i*.039,-.054+Math.sin(i*.51)*.11+Math.sin(i*1.73)*.022,.094));
    const trace=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x9dfbbb}));
    screen.add(trace);
    m('globe',0x8afdac,.474,-.325,.078,.024,.020,.014,screen,1.3);
    anim.push(t=>{trace.material.color.setHSL(.38,.63,.55+.09*Math.sin(t*2));});
    return screen;
  }
  function pendant(x,y,z){
    const lamp=group(x,y,z);
    pole(0,.42,0,.019,.83,0x49453d,lamp);
    m(new T.SphereGeometry(.40,24,12,0,Math.PI*2,0,Math.PI*.5),0x5c5347,0,0,0,1,.71,1,lamp,0,'metal');
    m(new T.CylinderGeometry(.396,.396,.039,24),0xf0b768,0,-.011,0,1,1,1,lamp,1.12);
    sparks(0xffd0a0,19,x,y-.17,z,6);
  }
  function mountainRidge(z,depth,height,color,phase){
    const geometry=new T.PlaneGeometry(94,depth,72,12);
    geometry.rotateX(-Math.PI/2);
    const points=geometry.attributes.position;
    for(let i=0;i<points.count;i++){
      const x=points.getX(i), dz=points.getZ(i);
      const profile=.43+.27*Math.sin(x*.21+phase)+.17*Math.sin(x*.43-phase)+.11*Math.sin(x*.84+phase*.54);
      const slope=Math.max(0,1-Math.abs(dz)*2/depth);
      const ridge=height*slope**.82*(profile+.055*Math.sin(x*2.12+dz*.88)+.042*Math.cos(x*3.17+dz*.41));
      points.setY(i,ridge-1.35);
    }
    geometry.computeVertexNormals();
    m(geometry,color,0,0,z,1,1,1,scene,0,'stone');
  }
  function tower(x,z) {
    const root=group(x,0,z);
    m('box',0x5b6268,0,1.67,0,4.6,3.34,3.83,root,0,'stone');
    m('bevel',0x788282,0,3.41,0,4.86,.24,4.08,root,0,'metal');
    const dome=new T.IcosahedronGeometry(1,2);
    m(dome,0xc2c8c8,0,3.57,-.32,1.66,1.46,1.54,root,0,'stone');
    const frame=new T.LineSegments(new T.EdgesGeometry(dome,6),new T.LineBasicMaterial({color:0x87999f,transparent:true,opacity:.46}));
    frame.position.set(0,3.57,-.32);
    frame.scale.set(1.664,1.462,1.544);
    root.add(frame);
    m('tube',0x84999d,0,3.62,-.32,1.71,.17,1.59,root);
    m('box',0x2e4951,.44,1.11,1.932,.9,2.25,.07,root);
    for(const x1 of [-1.49,-.56,1.6]) {
      m('box',charcoal,x1,1.91,1.945,.66,.86,.06,root);
      m('box',amber,x1,1.91,1.984,.54,.72,.03,root,.72);
      m('box',steel,x1,1.91,2.014,.035,.72,.037,root);
    }
    pole(1.68,4.55,-.5,.048,2.87,steel,root);
    m('box',steel,1.68,5.33,-.5,1.12,.037,.041,root);
    m('globe',0xe79672,1.68,5.97,-.5,.079,.08,.079,root,.75);
    block(x,z,4.68,3.9);
  }
  let spawn=[0,1.67,5.5],look=[0,1.48,-3.2],bounds=[-8.4,8.4,-10,9];
  if(outside) {
    k.light(act===0?0x566779:0xbea491,0x50616a,act===0?.036:.023,act===0?0xa2c2e1:0xffc18a,act===0?1.48:2.70,[-6,8,-3]);
    art.sky(act===0?
      {top:0x25384a,horizon:0x778b9e,cloud:0x69758a,shade:0x222d3e,cover:.28,density:1.08,glow:.03}:
      {top:0x7792b0,horizon:0xefad76,cloud:0xffdaac,shade:0x68788f,cover:.43,glow:.44,sun:.36});
    m('box',0x5b5f5d,0,-.21,0,52,.40,60,scene,0,'ground');
    mountainRidge(-34,22,act===0?12:8.5,act===0?0x536579:0x697889,2.1);
    mountainRidge(-25,15,act===0?7.5:5.1,act===0?0x414f64:0x6a7784,.7);
    for(let i=0;i<23;i++) {
      const angle=(i/28)*Math.PI*2, d=r(21,42);
      if(Math.sin(angle)>-.5)b('stone',choose([0x485b73,0x526780,0x657384,0x4f626d]),Math.cos(angle)*d,r(-1.3,1.7),Math.sin(angle)*d,r(4,8),r(4,8),r(3,7),r(-.39,.39),r(0,6),r(-.40,.40));
    }
    if(act===3) m('globe',0xffc986,-8,7.7,-28,.88,.88,.88,scene,1.76);
    for(let i=0;i<36;i++) {
      if(act===0 || 8-i*.55<-3.4)b('bevel',choose(slate),r(-1.58,1.52),.003,8-i*.55,r(.71,1.38),.035,.48,0,r(-.08,.08),0,'stone');
      const x=(i%2?1:-1)*r(2.61,9.5), z=r(-13,9);
      b('stone',choose(slate),x,r(.07,.27),z,r(.22,.80),r(.26,.66),r(.32,.83),r(0,1),r(0,6));
      if(i<22) b('cone',choose([0x445f56,0x587568,0x506965]),x,r(.24,.68),z+.36,r(.21,.44),r(.54,1.24),r(.21,.43));
    }
    tower(act===0?1.42:3.10,-8.36);
    mast(2.84,-4.18);
    block(2.84,-4.18,.55,.58);
    const visitors=act===0
      ? [[-.80,2.30,.49,red,'girl'],[.43,1.63,.36,blue,'boy']]
      : [[-.59,.99,.52,red,'girl'],[.41,.49,.45,blue,'boy']];
    for(const [x,z,yaw,coat,style] of visitors){
      const student=person(x,z,{coat,style,bag:true,yaw,kit:'shell',scale:style==='boy'?1.10:1.06});
      student.getObjectByName('face').rotation.x=-.20;
      block(x,z,.56,.50);
    }
    if(act===0) {
      const geometry=new T.BufferGeometry();
      const samples=Array.from({length:210},()=>[r(-11,11),r(0,7),r(-11,10)]);
      const coordinates=new Float32Array(samples.length*6);
      geometry.setAttribute('position',new T.BufferAttribute(coordinates,3));
      const rain=new T.LineSegments(geometry,new T.LineBasicMaterial({color:0xb3d4de,transparent:true,opacity:.47,depthWrite:false}));
      rain.frustumCulled=false;
      scene.add(rain);
      const setRain=t=>{
        samples.forEach(([x,y,z],i)=>{
          const h=(y-t*9%7+7)%7;
          coordinates.set([x+(7-h)*.12,h,z,x+(7-h)*.12-.075,h+.29,z+.04],i*6);
        });
        geometry.attributes.position.needsUpdate=true;
      };
      setRain(0);
      anim.push(setRain);
    } else {
      for(const x of [-5.55,-2.5,2.68,5.62]) m('bevel',0x514237,x,2.30,-3.05,.147,4.60,.19,scene,0,'wood');
      m('bevel',0x69523c,0,3.58,-3.06,11.6,.17,.21,scene,0,'wood');
      m('bevel',0x6e5d51,0,.54,-3.06,11.55,.106,.21,scene,0,'wood');
      m('box',0x504840,0,4.65,-2.5,11.9,.21,2.42,scene,0,'wood');
      m('box',0x6d5a47,0,-.055,1.9,11.9,.11,10.2,scene,0,'wood');
      sparks(0xffd4a6,21,1.3,2.75,-2.4,7.5);
      m('bevel',0x81694e,2.57,.85,-1.50,2.01,.119,.78,scene,0,'wood');
      for(const x of [1.73,3.37]) m('bevel',steel,x,.42,-1.53,.072,.85,.72,scene,0,'metal');
      m('box',steel,2.48,1.08,-1.72,.11,.51,.11);
      display(2.48,1.55,-1.72,1.18).rotation.y=-.32;
      m('bevel',charcoal,2.25,.933,-1.23,.65,.042,.235,scene,0,'metal');
      for(let key=0;key<11;key++) b('box',0x8b9192,1.98+key*.051,.96,-1.22,.027,.012,.049);
      block(2.57,-1.50,2.02,.80);
      spawn=[.36,1.66,4.7];look=[.5,1.58,-2.9];
    }
  } else {
    k.light(0x6b7781,0x5b5952,.013,0xffdbad,1.85,[1.2,7,4.5]);
    art.sky({top:0x3f536e,horizon:0x819bab,cloud:0x94a8b4,shade:0x4b5d72,cover:.31,glow:.05});
    bounds=[-5.9,5.9,-8.48,6.2];
    m('box',0x626d6a,0,-.12,-1.15,13.2,.24,16.4);
    for(let x=-6;x<=6;x++) for(let z=-8;z<=6;z++) {
      b('box',choose([0x736e66,0x686b64,0x686963,0x7e7668]),x,.006,z,.975,.017,.975,0,0,0,'stone');
    }
    const wall=0x909f9a;
    m('box',wall,0,.45,-9,13.2,.9,.28,scene,0,'stone');
    m('box',wall,0,3.67,-9,13.2,1.0,.28,scene,0,'stone');
    m('box',wall,0,2.06,6.7,13.2,4.1,.28,scene,0,'stone');
    m('box',wall,-6.47,2.06,-1.11,.27,4.1,16,scene,0,'stone');
    m('box',wall,6.47,2.06,-1.11,.27,4.1,16,scene,0,'stone');
    m('box',0x7d908e,0,4.22,-1.14,13.2,.22,16.1);
    for(let i=0;i<4;i++) {
      const x=-4.85+i*3.15,z=-6.85;
      const glass=new T.Mesh(new T.PlaneGeometry(2.69,2.17),new T.MeshBasicMaterial({
        color:0x85a1af,transparent:true,opacity:.24,depthWrite:false
      }));
      glass.position.set(x,2.05,z-1.94);
      scene.add(glass);
      for(const edge of [-1,1]) m('bevel',0x394a50,x+edge*1.38,2.05,z-1.93,.13,2.34,.102,scene,0,'metal');
      for(let col=-1;col<=1;col++) {
        m('box',steel,x+col*.82,2.06,z-1.90,.055,2.04,.064);
        m('box',steel,x,1.87+col*.62,z-1.89,2.54,.051,.065);
      }
      for(let drop=0;drop<16;drop++) b('box',0x9ec5cd,x+r(-1.14,1.14),r(1.17,3.05),z-1.855,.012,r(.04,.23),.012,0,0,.16);
    }
    for(let i=0;i<3;i++) {
      const z=-6+i*5;
      m('box',steel,0,4.01,z,12.8,.18,.18);
      m('box',0xaca992,0,3.85,z,2.85,.18,.35);
      m('box',0xffd196,0,3.735,z,2.65,.058,.22,scene,1.4);
    }
    pendant(.50,3.06,-1.82);
    pendant(-3.81,3.17,-6.02);
    function bench(x,z,width=3.5) {
      m('bevel',0x85674d,x,.89,z,width,.15,1.23,scene,0,'wood');
      for(const a of [-1,1]) for(const c of [-1,1]) m('box',steel,x+a*(width/2-.22),.407,z+c*.44,.15,.85,.15);
      m('box',0x486169,x,.18,z,width-.23,.10,.93);
      block(x,z,width,1.24);
    }
    const workZ=act===1?-.79:-.98;
    bench(.28,workZ,3.52);bench(-4.1,-6.5,2.85);bench(4.15,-6.45,2.82);
    display(-.86,1.24,workZ-.30,.637).rotation.y=.12;
    mast(act===1?1.03:.88,workZ+.22,act===1?1.05:.73,1.19);
    if(act===1) {
      const root=group(.68,1.13,workZ+.42);
      const bead=m('globe',0x9bcfdf,.13,.11,0,.07,.115,.07,root,.38);
      curve(root,[[-.29,.014,.061],[-.14,.19,.07],[.13,.075,.085],[.27,.011,.035]],.015,0x9b472c,'glaze');
      curve(root,[[-.20,.022,.092],[-.08,.144,.18],[.05,.09,.08],[.25,.026,.14]],.012,0x8bb0ad,'glaze');
      anim.push(t=>{bead.position.y=.13+Math.sin(t*3)*.05;});
      const technician=person(-.99,.56,{coat:red,yaw:.86,pose:'repair',kit:'shell',scale:1.09});
      technician.getObjectByName('face').rotation.x=.16;
      person(.56,-.61,{coat:blue,yaw:-.40,style:'boy',kit:'shell',scale:1.13});
      block(-.99,.56,.54,.48);
      spawn=[.29,1.67,4.17];look=[.16,1.21,-2.05];
    } else {
      person(-1.01,.35,{coat:red,yaw:.78,pose:'repair',kit:'shell'});
      person(.56,.16,{coat:blue,yaw:-.38,pose:'repair',style:'boy',kit:'shell',scale:1.14});
      person(.48,-1.91,{coat:0x62635b,scale:1.18,yaw:.12,pose:'give',hair:0x6b655b,style:'mentor'});
      block(-1.01,.35,.53,.47);block(.56,.16,.54,.49);block(.48,-1.91,.56,.55);
      const meter=group(1.14,1.142,workZ+.35,-.24);
      m('bevel',0xc39441,0,0,0,.51,.35,.18,meter,0,'glaze').rotation.x=-.27;
      m('bevel',0x34444b,0,.04,.101,.37,.206,.03,meter,.18).rotation.x=-.27;
      const box=group(.18,1.00,workZ+.09);
      m('bevel',0x688084,0,0,0,.55,.118,.33,box,0,'metal');
      curve(box,[[-.23,.03,.09],[-.13,.22,.14],[.077,.19,.091],[.29,.022,.105]],.016,0xac533b,'glaze');
      display(1.37,1.37,workZ-.41,.58).rotation.y=-.29;
      spawn=[0,1.66,4.32];look=[0,1.29,-2.5];
    }
    for(const sign of [-1,1]) for(let i=0;i<4;i++) {
      const x=sign*(3.55+i*.51),z=-6.15;
      m('box',choose(slate),x,1.13,z,.29,.34,.33);
      m('box',0x293e45,x,1.15,z+.172,.22,.12,.025);
    }
  }
  k.finish();
  return {spawn,look,bounds,obstacles,animate(time){anim.forEach(update=>update(time));}};
};
