(window.WW_WORLDS ||= {}).museum = function({T,scene},act) {
  const k=worldCraft(T,scene,6900+act*63);
  const {mesh:m,batch:b,group,person,art,range,choose}=k;
  const obstacles=[];
  const lightMotes=[];
  const dawn=act===3;
  const gallery=act===0 || dawn;
  const windows=gallery?[-4.20,-2.10,0,2.10,4.20]:act===1?[4.22]:[-.9,.82];
  const brass=0xb49255, oak=0x714e38, iron=0x354450, wall=0x293d4a;
  const bounds=[-5.4,5.4,-10.6,6.9];
  const spawn=[0,1.68,act===1?4.3:4.0], look=[0,1.27,-1.4];
  const block=(x,z,w,d)=>obstacles.push([x-w/2,x+w/2,z-d/2,z+d/2]);
  k.light(dawn?0xbda28e:0x283645,0x777469,.012,dawn?0xffd08d:0xffd4a2,dawn?2.65:1.4,[-5,8,3]);
  scene.add(new T.HemisphereLight(dawn?0xffe3bb:0xa6c3e3,0x6e5350,.63));
  art.sky(dawn?{top:0x637fa7,horizon:0xe3aa89,cloud:0xffc298,shade:0x8793ae,cover:.43,solar:.09,glow:.37,sun:.54,drift:.72}:
    {top:0x182739,horizon:0x617988,cloud:0x4a5e75,shade:0x24364d,cover:.46,glow:0,drift:.52});

  function printPlane(width,height,paint) {
    const surface=document.createElement('canvas');
    surface.width=512; surface.height=256;
    paint(surface.getContext('2d'));
    const texture=new T.CanvasTexture(surface);
    texture.colorSpace=T.SRGBColorSpace;
    texture.anisotropy=4;
    return new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({
      map:texture,roughness:.84,color:0xfff2db,emissive:0x715844,emissiveIntensity:.20
    }));
  }
  function textCard(parent,x,y,z,width,height,title,detail='') {
    const tag=printPlane(width,height,ctx=>{
      ctx.fillStyle='#e1cda5';ctx.fillRect(0,0,512,256);
      ctx.strokeStyle='#997245';ctx.lineWidth=7;ctx.strokeRect(18,18,476,220);
      ctx.fillStyle='#2c302d';ctx.textAlign='center';ctx.font='54px Georgia';
      ctx.fillText(title,256,detail?110:147,455);
      if(detail){ctx.font='27px Georgia';ctx.fillText(detail,256,177,445);}
    });
    tag.position.set(x,y,z);
    parent.add(tag);
    return tag;
  }
  function lamp(x,y,z,strength=15) {
    const pendant=group(x,y,z);
    m('tube',iron,0,.33,0,.017,.77,.017,pendant);
    m(new T.SphereGeometry(.34,24,11,0,Math.PI*2,0,Math.PI/2),0x66513a,0,0,0,1,.63,1,pendant,0,'metal');
    m('tube',0xffd7a2,0,-.014,0,.312,.038,.312,pendant,1.2);
    const light=new T.PointLight(0xffc37e,strength,7,2);
    light.position.set(x,y-.18,z);
    scene.add(light);
    for(let i=0;i<16;i++) {
      const lower=range(.22,1.58);
      const reach=lower*.33+.099;
      lightMotes.push(x+range(-reach,reach),y-lower,z+range(-reach,reach));
    }
  }
  function tracery(x,z){
    const pane=group(x,1.85,z);
    for(const side of [-1,1]) {
      m('bevel',0x8c7252,side*.663,0,0,.102,2.54,.154,pane,0,'wood');
      m('bevel',0x8c7252,0,side*1.246,0,1.405,.114,.153,pane,0,'wood');
    }
    const glass=new T.Mesh(new T.PlaneGeometry(1.29,2.43),new T.MeshPhysicalMaterial({
      color:0x9fbabc,transparent:true,opacity:.17,roughness:.22,metalness:.06,depthWrite:false
    }));
    glass.position.z=.064;
    pane.add(glass);
    m('box',oak,0,0,.102,.042,2.44,.055,pane);
    for(const yy of [-.56,.20,.82])m('box',oak,0,yy,.102,1.33,.039,.055,pane);
  }
  function compass(parent,x,y,z,size=1){
    const prop=group(0,0,0);
    parent.add(prop);prop.position.set(x,y,z);prop.scale.setScalar(size);prop.rotation.x=.28;
    m('tube',0x695335,0,0,0,.355,.105,.355,prop,0,'metal');
    const rim=m(new T.TorusGeometry(.302,.034,11,42,Math.PI*1.93),brass,0,.065,0,1,1,1,prop,0,'metal');
    rim.rotation.set(-Math.PI/2,0,-.56);
    const dial=printPlane(.604,.604,ctx=>{
      ctx.clearRect(0,0,512,256);
      ctx.save();ctx.translate(256,128);ctx.scale(2,1);
      ctx.fillStyle='#e9d8a5';ctx.beginPath();ctx.arc(0,0,124,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#463f33';ctx.lineWidth=2;
      for(let i=0;i<48;i++){
        const a=i*Math.PI/24,inner=i%4===0?103:112;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);
        ctx.lineTo(Math.cos(a)*119,Math.sin(a)*119);ctx.stroke();
      }
      ctx.fillStyle='#594f3a';ctx.textAlign='center';ctx.font='15px Georgia';
      ctx.fillText('N',0,-82);ctx.fillText('S',0,94);ctx.fillText('E',88,5);ctx.fillText('W',-88,5);
      ctx.fillStyle='#9b3730';ctx.beginPath();ctx.moveTo(39,-69);ctx.lineTo(11,13);ctx.lineTo(-7,-5);ctx.fill();
      ctx.fillStyle='#2d4855';ctx.beginPath();ctx.moveTo(-42,62);ctx.lineTo(11,13);ctx.lineTo(-7,-5);ctx.fill();
      ctx.restore();
    });
    dial.material.transparent=true;
    dial.material.alphaTest=.52;
    dial.rotation.x=-Math.PI/2;dial.position.y=.056;prop.add(dial);
    m('tube',brass,0,.075,0,.038,.024,.038,prop,0,'metal');
    for(const x0 of [-.18,.18])m('tube',0x584938,x0,.073,-.19,.016,.015,.016,prop,0,'metal');
    if(act===2) textCard(prop,0,.006,.350,.183,.072,'W07');
    return prop;
  }
  function tile(parent,x,y,z){
    m('bevel',0x255275,x,y,z,.57,.055,.57,parent,0,'glaze').rotation.y=.23;
    const face=printPlane(.52,.52,ctx=>{
      ctx.fillStyle='#213d60';ctx.fillRect(0,0,512,256);
      ctx.strokeStyle='#7cb3bc';ctx.lineWidth=5;ctx.strokeRect(22,12,468,232);
      ctx.strokeStyle='#c8d4c4';ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(256,16);ctx.lineTo(477,128);ctx.lineTo(256,238);ctx.lineTo(32,128);ctx.closePath();ctx.stroke();
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        ctx.beginPath();ctx.ellipse(256+68*Math.cos(a),128+35*Math.sin(a),83,23,a,0,Math.PI*2);ctx.stroke();
      }
    });
    face.rotation.set(-Math.PI/2,0,.23);face.position.set(x,y+.030,z);parent.add(face);
  }
  function displayCase(x,z,kind,code,collection) {
    const cabinet=group(x,0,z);
    m('bevel',0x685743,0,.46,0,1.36,.90,1.13,cabinet,0,'wood');
    m('bevel',brass,0,.92,0,1.42,.08,1.17,cabinet,0,'metal');
    m('bevel',0x4a3c3d,0,.974,0,1.28,.046,1.05,cabinet,0,'cloth');
    textCard(cabinet,0,.714,.577,.73,.285,code,collection);
    const glass=new T.Mesh(new T.BoxGeometry(1.31,.69,1.10),new T.MeshPhysicalMaterial({
      color:0xaddae0,roughness:.16,metalness:0,transparent:true,opacity:.13,depthWrite:false
    }));
    glass.position.y=1.325;cabinet.add(glass);
    for(const side of [-1,1])for(const face of [-1,1]){
      m('box',brass,side*.647,1.317,face*.542,.026,.677,.026,cabinet,0,'metal');
    }
    for(const side of [-1,1]){
      m('box',brass,0,1.668,side*.542,1.33,.028,.027,cabinet,0,'metal');
      m('box',brass,side*.647,1.668,0,.027,.028,1.11,cabinet,0,'metal');
    }
    if(kind==='compass')compass(cabinet,0,1.045,-.041,1.22);
    else tile(cabinet,0,1.035,.02);
    block(x,z,1.42,1.16);
  }
  function table(x,z,width){
    const desk=group(x,0,z);
    m('bevel',oak,0,.83,0,width,.13,1.26,desk,0,'wood');
    m('bevel',0x4a3e36,0,.713,0,width-.08,.16,1.18,desk,0,'wood');
    for(const side of [-1,1])for(const part of [-1,1]){
      m('bevel',0x543a2f,side*(width*.5-.13),.38,part*.49,.095,.75,.095,desk,0,'wood');
    }
    block(x,z,width,1.28);
    return desk;
  }
  function shelf(x,z,yaw=0){
    const cabinet=group(x,0,z,yaw);
    m('box',0x523d31,0,1.36,-.26,2.62,2.71,.14,cabinet,0,'wood');
    for(const sign of [-1,1])m('bevel',oak,sign*1.27,1.33,0,.11,2.66,.53,cabinet,0,'wood');
    const colors=[0x5b5346,0x68544e,0x7d5f3f,0x57636a,0x4c5556];
    for(let row=0;row<5;row++){
      const y=.14+row*.51;
      m('bevel',oak,0,y,0,2.64,.078,.55,cabinet,0,'wood');
      for(let i=0;i<11;i++){
        const rise=range(.27,.43);
        m('box',choose(colors),-1.16+i*.215,y+rise*.5+.039,.06,range(.13,.19),rise,range(.24,.40),cabinet,0,'cloth');
      }
    }
    block(x,z,yaw? .60:2.66,yaw?2.66:.61);
  }

  m('box',0x6e6154,0,-.11,-2,12,.22,19,scene,0,'stone');
  for(let x=-6;x<6;x++)for(let z=-11;z<7;z++){
    const colors=gallery?[0x81796b,0x8f8170,0x6c6965]:[0x675d52,0x726356,0x7e7060];
    b('box',choose(colors),x+.5,-.009,z+.5,.988,.022,.988,0,gallery?0:(x+z)%2*Math.PI*.5,0,gallery?'stone':'boards');
  }
  m('box',wall,0,.314,-11,12,.628,.28,scene,0,'stone');
  m('box',wall,0,3.647,-11,12,1.115,.28,scene,0,'stone');
  let jamb=-6;
  for(const x of windows) {
    const edge=x-.648;
    m('box',wall,(jamb+edge)*.5,1.859,-11,edge-jamb,2.465,.28,scene,0,'stone');
    tracery(x,-10.84);
    jamb=x+.648;
  }
  m('box',wall,(jamb+6)*.5,1.859,-11,6-jamb,2.465,.28,scene,0,'stone');
  for(let i=0;i<14;i++) {
    const x=-16+i*2.48,z=-16.4+range(-2.7,1.5),rise=range(2.2,3.7);
    b('branch',0x584a43,x,rise*.40-.6,z,.109,rise*.8,.11,0,range(0,5),range(-.09,.09),'bark');
    b('canopy',dawn?0x718363:0x415965,x,rise*.75-.34,z,range(.84,1.48),rise*.47,1.05,0,range(0,5));
  }
  for(const side of [-1,1]){
    m('box',wall,side*5.77,2.10,-2,.29,4.21,18.3,scene,0,'stone');
    m('box',oak,side*5.61,.58,-2,.105,1.19,18.3,scene,0,'wood');
    m('box',brass,side*5.53,1.20,-2,.035,.025,18.3,scene,0,'metal');
    m('bevel',0x46392f,side*5.50,.12,-2,.106,.22,18.3,scene,0,'wood');
    for(let i=0;i<11;i++){
      const z=-10.18+i*1.65;
      b('bevel',0x77563d,side*5.548,.62,z,.092,.79,1.37,0,0,0,'wood');
      b('bevel',0x534333,side*5.488,.62,z,.037,.59,1.16,0,0,0,'wood');
    }
    for(let i=0;i<29;i++){
      const z=-9.98+i*.59;
      b('box',i%2?0x8e7559:0xb5a17e,side*4.61,.009,z,.113,.009,.55,0,0,0,'stone');
      b('box',i%2?0x8c8067:0x584f47,side*4.85,.009,z,.065,.009,.55,0,0,0,'stone');
    }
  }
  m('box',0x4b4a47,0,4.27,-2,12,.18,18.4,scene,0,'stone');
  if(gallery){
    for(const x of [-3.49,3.49]){
      m('bevel',0x8b7867,x,2.03,-5.02,.49,4.05,.53,scene,0,'stone');
      block(x,-5.02,.51,.55);
    }
    m('bevel',0x6e5643,0,3.63,-5.02,7.32,.28,.46,scene,0,'wood');
    lamp(-1.25,2.70,-.40,dawn?10:27);
    lamp(1.25,2.70,-.62,dawn?10:24);
    lamp(0,2.96,-6.6,22);
    displayCase(-1.20,-.57,'compass',dawn?'W07':'E12',dawn?'Western Collection':'Eastern Collection');
    displayCase(1.23,-1.44,'tile',dawn?'E12':'W07',dawn?'Eastern Collection':'Western Collection');
    if(dawn)person(-2.20,-2.15,{coat:0x8c602f,yaw:.51,pose:'give',bag:true});
  } else if(act===1){
    shelf(-3.92,-7.7);
    shelf(-.97,-8.12);
    shelf(2.68,-8.12);
    shelf(-4.52,-.67,Math.PI/2);
    lamp(.14,2.48,-.62,25);
    lamp(-2.7,2.93,-5.84,17);
    const desk=table(.03,-.63,2.48);
    m('bevel',0x425044,0,.938,.08,.96,.129,.65,desk,0,'cloth');
    const register=textCard(desk,0,1.012,.08,.88,.58,'ORIGINAL REGISTER','W07   ·   E12');
    register.rotation.x=-Math.PI/2;
    for(const [x,yaw] of [[-.40,-.16],[.42,.12]]){
      const leaf=textCard(desk,x,.992,.42,.31,.45,x<0?'W07':'E12',x<0?'CHIPPED RIM':'BLUE TILE');
      leaf.rotation.set(-Math.PI/2,0,yaw);
    }
    textCard(desk,0,.690,.647,1.04,.19,'ACCESSION DESK');
    person(-1.37,-.79,{coat:0x8c602f,yaw:.58,pose:'give',bag:true});
    block(-1.37,-.79,.49,.48);
  } else {
    shelf(-3.7,-7.29);shelf(3.73,-7.29);
    lamp(-.13,2.35,-.13,30);lamp(2.63,2.99,-5.3,17);
    const bench=table(.23,-.37,3.18);
    m('bevel',0x454950,0,.918,.02,2.87,.059,1.01,bench,0,'cloth');
    compass(bench,-.50,1.035,.10,1.13);tile(bench,.66,.983,.10);
    textCard(bench,-.50,.977,.51,.48,.14,'W07');
    textCard(bench,.66,.977,.51,.48,.14,'E12');
    for(const [x,time] of [[-.47,'20:10'],[.42,'20:20']]){
      const photo=textCard(bench,x,1.27,-.42,.59,.27,time,'EXHIBIT PHOTO');
      photo.rotation.x=-.18;
    }
    person(1.83,-.75,{coat:0x8c602f,yaw:-.57,pose:'repair'});
    block(1.83,-.75,.51,.50);
  }
  const dustPositions=new T.BufferGeometry();
  dustPositions.setAttribute('position',new T.Float32BufferAttribute(lightMotes,3));
  const dustClock={value:0};
  const dust=new T.Points(dustPositions,new T.ShaderMaterial({
    name:'Suspended dust near pendant lights',uniforms:{clock:dustClock},
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform float clock;
      varying float intensity;
      void main(){
        vec3 p=position;
        float phase=dot(p,vec3(16.8,32.4,12.7));
        p.x+=.082*sin(phase+clock*.33);
        p.y+=.097*sin(phase+clock*.44);
        p.z+=.048*cos(phase+clock*.38);
        vec4 view=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*view;
        gl_PointSize=clamp(6.0/max(.5,-view.z),1.0,3.5);
        intensity=(.13+.16*sin(phase+clock*.47))*(1.-smoothstep(2.,15.,-view.z));
      }`,
    fragmentShader:`varying float intensity;
      void main(){
        float a=1.-smoothstep(.10,.49,length(gl_PointCoord-.5));
        gl_FragColor=vec4(.92,.72,.49,max(0.,intensity)*a);
      }`
  }));
  scene.add(dust);
  k.finish();
  return {spawn,look,bounds,obstacles,animate(time){k.animate(time);dustClock.value=time;}};
};
