/* Geometry, lighting and ambient motion for the four lighthouse chapters. */
(window.WW_WORLDS ||= {}).lighthouse = function({T, scene}, act) {
  let seed = 711 + act * 61;
  const rand = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
  const range = (low, high) => low + rand() * (high - low);
  const pick = items => items[Math.floor(rand() * items.length)];
  const art = worldArt(T,scene);
  const boxShape = new T.BoxGeometry(1, 1, 1);
  const bevelShape = art.bevelBox();
  const softShape = new T.SphereGeometry(1, 22, 15);
  const stoneShape = art.crag(2);
  const headlandShape = art.crag(1,true);
  const needleShape = art.leaf();
  const firBranchShape = new T.LatheGeometry([[.01,0],[.68,.055],[.65,.112],[.52,.26],[.36,.46],
    [.18,.71],[.008,1]].map(([r,y])=>new T.Vector2(r,y)),11).translate(0,-.5,0);
  const coneShape = new T.ConeGeometry(1, 1, 12);
  const poleShape = new T.CylinderGeometry(1, 1, 1, 14);
  const instanceSets = new Map();
  const obstacles = [];
  const animations = [];
  const stone = [0x637174,0x6c6960,0x8a8473,0x4c6266,0x9d9381,0x786957];
  const moss = [0x435323,0x727e34,0x8b8945,0x52683f,0x34453a];

  const material=(color,glow=0,style='plain')=>art.material(color,style,glow);
  function shape(geometry, color, x, y, z, sx = 1, sy = 1, sz = 1, parent = scene, glow = 0, style = 'plain') {
    const mesh = new T.Mesh(geometry, material(color, glow, style));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.receiveShadow=true;
    mesh.castShadow=parent!==scene || sy>.35 && sx*sz<11;
    parent.add(mesh);
    return mesh;
  }
  const box=(x,y,z,w,h,d,c,parent,glow,style)=>shape(boxShape,c,x,y,z,w,h,d,parent,glow,style);
  const bevel=(x,y,z,w,h,d,c,parent,style)=>shape(bevelShape,c,x,y,z,w,h,d,parent,0,style);
  const ellipsoid=(x,y,z,w,h,d,c,parent,style)=>shape(softShape,c,x,y,z,w,h,d,parent,0,style);
  const cylinder=(x,y,z,r,h,c,parent,style)=>shape(poleShape,c,x,y,z,r,h,r,parent,0,style);
  function scatter(geometry,color,x,y,z,sx,sy,sz,ry = 0,rz = 0,rx = 0) {
    if (!instanceSets.has(geometry)) instanceSets.set(geometry, []);
    instanceSets.get(geometry).push({color,x,y,z,sx,sy,sz,ry,rz,rx});
  }
  function addInstances() {
    const transform = new T.Object3D();
    const color = new T.Color();
    for (const [geometry, instances] of instanceSets) {
      const style = [stoneShape,boxShape,bevelShape].includes(geometry)?'stone':
        geometry===poleShape?'bark':geometry===needleShape?'leaf':'ground';
      const batch = new T.InstancedMesh(geometry, material(0xffffff,0,style), instances.length);
      instances.forEach((p, index) => {
        transform.position.set(p.x,p.y,p.z);
        transform.scale.set(p.sx,p.sy,p.sz);
        transform.rotation.set(p.rx,p.ry,p.rz);
        transform.updateMatrix();
        batch.setMatrixAt(index, transform.matrix);
        batch.setColorAt(index, color.setHex(p.color));
      });
      batch.receiveShadow=true;
      batch.castShadow=geometry===firBranchShape || geometry===poleShape;
      scene.add(batch);
    }
  }
  function stage(bg, haze, ground, warmth, sky, key) {
    scene.background = new T.Color(bg);
    scene.fog = new T.FogExp2(bg, haze);
    art.sky(sky);
    scene.add(new T.HemisphereLight(0xc6d5ec, 0x46534a, 1.40));
    art.key(warmth,key||2.15,[-7,9,4]);
    const bounce = new T.DirectionalLight(0x8ab4df,.49);
    bounce.position.set(4,4,-10);
    scene.add(bounce);
    if (ground !== null) box(0,-.16,0,108,.3,108,ground,scene,0,'forest');
  }
  function group(x,y,z,parent = scene) {
    const result = new T.Group();
    result.position.set(x,y,z);
    parent.add(result);
    return result;
  }
  function curve(parent,points,r,color,style='plain') {
    const line=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    return shape(new T.TubeGeometry(line,13,r,6),color,0,0,0,1,1,1,parent,0,style);
  }
  function cobbles(center,start,end,width) {
    const count = Math.max(3, Math.round(width / .48));
    for (let z = start; z < end; z += .44) {
      for (let i = 0; i < count; i++) {
        const x = center(z) - width / 2 + width * ((i + .5) / count);
        scatter(bevelShape, pick(stone), x + range(-.06,.06), .035 + range(-.02,.025),
          z + range(-.04,.04), range(.7,.95) * width/count,.13,range(.31,.44),range(-.11,.11));
      }
    }
  }
  function sprigs(x,z,spread,amount = 9,flower = false) {
    const blooms = [0xe8a5a0,0xffd395,0xe6bfda,0xffedb8];
    for (let n = 0; n < amount; n++) {
      const gx = x+range(-spread,spread), gz = z+range(-spread,spread);
      const tall = range(.13,.42);
      for(let leaf=0;leaf<4;leaf++){
        const a=rand()*6.28;
        scatter(needleShape,pick(moss),gx+Math.cos(a)*.073,tall*.49,gz+Math.sin(a)*.079,
          range(.037,.087),tall*.65,.055,a,range(-.73,.73),range(-.5,.4));
      }
      if (flower && rand() > .65) {
        scatter(stoneShape,pick(blooms),gx,tall*.81,gz,.055,.045,.055,rand()*6.28);
      }
    }
  }
  function rock(x,z,size,y = 0,c = pick(stone)) {
    scatter(stoneShape,c,x,y + size*.22,z,size, size*range(.43,.75),size*range(.7,1.3),rand()*6.28,range(-.16,.16));
  }
  function pine(x,z,size,base = 0) {
    const tint = pick([0x274741,0x35564b,0x334f40,0x465e43,0x2a443f]);
    scatter(poleShape, 0x665044,x,base+size*.39,z,size*.038,size*.78,size*.038,rand()*6.28);
    for (let i = 0; i < 6; i++) {
      const radius=size*(.31-i*.039);
      const branchHeight=base+size*(.43+i*.103);
      scatter(firBranchShape,tint,x+range(-.055,.055)*size,branchHeight,z+range(-.039,.039)*size,
        radius*1.22,size*(.42-i*.044),radius*1.18,rand()*6.28,range(-.11,.11));
      for(let j=0;j<7;j++){
        const angle=(j+rand()*.51)*Math.PI*2/7, reach=radius*range(.57,.91);
        scatter(needleShape,pick([tint,0x43614c,0x425949,0x354e41]),x+Math.cos(angle)*reach,
          branchHeight-size*.052+range(-.05,.055),z+Math.sin(angle)*reach,radius*.32,radius*.29,radius*.2,
          -angle,range(-.52,.46),Math.PI*.42);
      }
    }
  }
  function coastalRidges() {
    for (let i = 0; i < 18; i++) {
      const angle = i * .36;
      const x = Math.sin(angle) * range(26,39), z = Math.cos(angle) * range(25,39);
      scatter(headlandShape,pick([0x718081,0x647a7c,0x79909b]),x,-1.9,z,range(5.1,12.2),range(1.3,4.8),range(4.1,9.0),angle);
    }
  }
  function lantern(x,y,z,parent = scene) {
    const frame = group(x,y,z,parent);
    shape(softShape,0xffbd60,0,-.028,0,.091,.119,.084,frame,2.1);
    const glass=new T.Mesh(new T.BoxGeometry(.238,.284,.229),new T.MeshBasicMaterial({
      color:0xffca77,opacity:.21,transparent:true,depthWrite:false
    }));
    frame.add(glass);
    bevel(0,-.169,0,.32,.065,.32,0x514332,frame,'metal');
    bevel(0,.147,0,.315,.048,.31,0x534331,frame,'metal');
    shape(new T.CylinderGeometry(.071,.173,.11,8),0x483c2e,0,.220,0,1,1,1,frame,0,'metal');
    shape(new T.TorusGeometry(.062,.011,6,18),0x534333,0,.316,0,1,1,1,frame,0,'metal');
    for (const sx of [-1,1]) for (const sz of [-1,1]) {
      bevel(sx*.126,0,sz*.116,.029,.30,.029,0x4a3b2a,frame,'metal');
    }
    const light = new T.PointLight(0xffad4b, 8, 6.5, 2);
    light.position.y = .03;
    frame.add(light);
    return frame;
  }
  function postLamp(x,z) {
    cylinder(x,.8,z,.048,1.6,0x515042);
    box(x,.10,z,.2,.24,.2,0x6b5a43);
    lantern(x,1.7,z);
  }
  function envelope(parent,x,y,z,angle = .1) {
    const mail = group(x,y,z,parent);
    mail.rotation.z = angle;
    box(0,0,0,.42,.273,.035,0xffe1a6,mail);
    const diamond = box(0,.053,.023,.19,.19,.012,0xeecb8f,mail);
    diamond.rotation.z = Math.PI/4;
    shape(poleShape,0xad4030,0,.007,.037,.063,.017,.063,mail).rotation.x = Math.PI/2;
  }
  function animal(x,z,color,rotation,prop,scale=1,badger=false) {
    art.shadow(x,z,.53*scale,.42*scale);
    const root=group(x,0,z);
    root.rotation.y=rotation;
    root.scale.setScalar(scale);
    const pale=badger?0xe6dcc9:0xffdfb9, dark=badger?0x343036:0x754020;
    const body=badger?0xb0a18a:color, texture=badger?'cloth':'fur';
    ellipsoid(0,.55,0,badger?.31:.247,.40,.209,body,root,texture);
    ellipsoid(0,.57,.142,.174,.258,.109,badger?0x998972:pale,root,texture);
    for(const s of [-1,1]){
      ellipsoid(s*.135,.18,.036,.101,.177,.109,dark,root,'fur');
      ellipsoid(s*.135,.083,.128,.112,.075,.143,dark,root,'fur');
      const arm=ellipsoid(s*.224,.66,.119,.103,.212,.107,body,root,texture);
      arm.rotation.set(-.48,0,s*.39);
      ellipsoid(s*.201,.568,.299,.091,.081,.090,dark,root,'fur');
    }
    const head=group(0,1.109,.024,root);
    const skull=new T.SphereGeometry(1,44,30);
    const contour=skull.attributes.position, colors=[];
    const fur=new T.Color(color), cream=new T.Color(pale), markings=new T.Color(dark), paint=new T.Color();
    for(let i=0;i<contour.count;i++) {
      const x0=contour.getX(i),y0=contour.getY(i),z0=contour.getZ(i);
      const forward=Math.max(0,z0);
      const snout=Math.exp(-x0*x0*7.1-(y0+.38)**2*5)*forward**2;
      const jaw=1-.18*Math.max(0,-y0);
      contour.setXYZ(i,x0*.308*jaw,y0*.255,z0*.207+snout*.155);
      const edge=-.17-.13*Math.cos(x0*5)+.037*Math.sin(x0*55+y0*61);
      const paleFur=1-T.MathUtils.smoothstep(y0,edge-.08,edge+.08);
      paint.copy(badger?cream:fur).lerp(cream,paleFur*forward);
      if(badger){
        const stripe=Math.exp(-((Math.abs(x0)-.43-y0*.14)**2)*31)*T.MathUtils.smoothstep(forward,.38,.83);
        paint.lerp(markings,stripe*.99);
      }
      paint.multiplyScalar(.985+.093*Math.sin(x0*76+Math.sin(y0*30)*.28)*Math.sin(z0*31+y0*23));
      colors.push(paint.r,paint.g,paint.b);
    }
    skull.computeVertexNormals();
    skull.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const furMat=material(0xffffff,0,'fur').clone();
    furMat.vertexColors=true;
    const face=new T.Mesh(skull,furMat);
    face.castShadow=true;
    face.receiveShadow=true;
    head.add(face);
    const earOutline=new T.Shape();
    earOutline.moveTo(-.108,-.09);
    earOutline.bezierCurveTo(-.105,.050,-.063,.209,.018,.251);
    earOutline.bezierCurveTo(.051,.252,.110,.067,.131,-.047);
    earOutline.bezierCurveTo(.070,-.084,-.040,-.102,-.108,-.09);
    const earShape=new T.ExtrudeGeometry(earOutline,{depth:.037,bevelEnabled:true,bevelSize:.017,
      bevelThickness:.017,bevelSegments:2,curveSegments:8});
    const gaze=prop==='letter'?-.014:.009;
    const eyes=[];
    for(const s of [-1,1]){
      if(badger){
        ellipsoid(s*.231,.193,-.041,.103,.107,.067,pale,head,'fur');
        ellipsoid(s*.238,.207,.019,.062,.071,.027,0x685851,head,'fur');
        shape(new T.TorusGeometry(.055,.005,7,24),0x866644,s*.106,.019,.237,1,.88,1,head,0,'metal');
      } else {
        const ear=group(s*.20,.174,-.047,head);
        ear.rotation.set(-.07,s*.23,s*-.23);
        shape(earShape,dark,0,0,0,s,1,1,ear,0,'fur');
        shape(earShape,color,0,-.011,.022,s*.91,.87,.78,ear,0,'fur');
        shape(earShape,0xb68172,0,.004,.058,s*.59,.65,.41,ear,0,'fur');
        for(let i=0;i<3;i++){
          const tuft=ellipsoid(s*(.224+i*.014),-.08-i*.035,.106-i*.010,.081,.028,.033,i===0?color:pale,head,'fur');
          tuft.rotation.z=s*(.44-i*.19);
        }
        animations.push(t=>{ear.rotation.y=s*(.23+.043*Math.sin(t*1.43+x));});
      }
      const eye=group(s*.103,badger?.027:.049,.204,head);
      ellipsoid(0,0,0,.052,.043,.031,badger?dark:0x754820,eye,'fur');
      ellipsoid(0,.001,.020,.037,.028,.018,0xdfc6ab,eye,'glaze');
      ellipsoid(gaze*.67,0,.035,.023,.024,.010,0x9a6934,eye,'glaze');
      ellipsoid(gaze*.67,-.001,.043,.012,.017,.006,0x231a16,eye,'glaze');
      ellipsoid(gaze*.67-.005,.010,.049,.0055,.0055,.0020,0xffe7c6,eye);
      eyes.push(eye);
    }
    ellipsoid(0,-.086,.341,.047,.030,.035,0x2f2520,head,'glaze');
    ellipsoid(-.013,-.078,.365,.013,.006,.008,0x6d5543,head,'glaze');
    curve(head,[[-.073,-.138,.293],[-.032,-.146,.329],[0,-.142,.341],[.032,-.146,.329],[.073,-.138,.293]],.0028,0x603627);
    if(badger) curve(head,[[-.047,.025,.240],[0,.042,.249],[.047,.025,.240]],.0064,0x85643f,'metal');
    const scarf=badger?0x784149:0x586c32;
    for(let i=0;i<3;i++){
      const ring=shape(new T.TorusGeometry(.183+i*.018,.039,8,26),scarf,0,.848+i*.029,0,1,1,.93,root,0,'cloth');
      ring.rotation.x=Math.PI/2-.14;
    }
    bevel(.13,.715,.178,.141,.257,.063,scarf,root,'cloth').rotation.z=.32;
    for(let i=0;i<5;i++) cylinder(.091+i*.021,.582,.188,.008,.062,scarf,root,'cloth').rotation.z=.22;
    if(!badger){
      const tailForm=new T.LatheGeometry([[.05,0],[.106,.10],[.16,.23],[.205,.38],[.212,.54],[.188,.68],[.13,.82],[.066,.94],[.004,1]]
        .map(([r,y])=>new T.Vector2(r,y)),22);
      const pos=tailForm.attributes.position, colors=[];
      for(let i=0;i<pos.count;i++){
        const blend=T.MathUtils.smoothstep(pos.getY(i)+Math.sin(pos.getX(i)*15)*.065,.60,.85);
        const tone=new T.Color(color).lerp(new T.Color(pale),blend);
        colors.push(tone.r,tone.g,tone.b);
      }
      tailForm.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      const tailMaterial=material(0xffffff,0,'fur').clone();
      tailMaterial.vertexColors=true;
      const tail=new T.Mesh(tailForm,tailMaterial);
      tail.position.set(.15,.29,-.16);
      tail.rotation.set(-.69,0,-.99);
      tail.castShadow=true;
      root.add(tail);
      bevel(-.241,.446,.022,.236,.252,.169,0x845735,root,'cloth').rotation.z=-.16;
      bevel(-.243,.496,.117,.243,.136,.043,0xaa7748,root,'cloth').rotation.z=-.16;
      bevel(-.247,.451,.145,.051,.092,.026,0x70472b,root,'wood');
      ellipsoid(-.247,.430,.165,.017,.020,.008,0xc3955b,root,'metal');
      curve(root,[[.118,.820,.090],[.023,.731,.202],[-.118,.609,.218],[-.242,.478,.129]],.020,0x755036,'cloth');
      animations.push(t=>{tail.rotation.z=-.99+Math.sin(t*1.65+x)*.095;});
    } else for(const s of [-1,1]){
      curve(root,[[s*.12,.852,-.018],[s*.156,.738,.196],[s*.146,.473,.227]],.020,0x604735,'cloth');
    }
    if(prop==='letter') envelope(root,0,.621,.384,.13);
    if(prop==='light'){
      const hanging=lantern(.34,.52,.30,root);
      hanging.scale.setScalar(1.04);
      curve(root,[[.162,.694,.113],[.268,.695,.205],[.342,.835,.299]],.069,body,texture);
      ellipsoid(.342,.841,.31,.079,.070,.074,dark,root,'fur');
      animations.push(t=>{hanging.rotation.z=Math.sin(t*2.7)*.12;});
    }
    animations.push(t=>{
      const cycle=(t+Math.abs(x)*1.21)%4.73;
      const blink=cycle<.19?Math.sin(cycle*Math.PI/.19):0;
      for(const eye of eyes) eye.scale.y=1-.89*blink;
      head.rotation.z=Math.sin(t*.71+x)*.035;
      head.rotation.y=Math.sin(t*.47+x)*.045;
    });
    return root;
  }
  function cottage(x,z,w,d,h,wall,roof) {
    const house = group(x,0,z);
    box(0,h*.5,0,w,h,d,wall,house,0,'stone');
    const gable = new T.Shape();
    gable.moveTo(-w*.55,0);
    gable.lineTo(0,h*.49);
    gable.lineTo(w*.55,0);
    gable.closePath();
    const top = new T.ExtrudeGeometry(gable,{depth:d+.24,bevelEnabled:false});
    shape(top,roof,0,h-.017,-d/2-.12,1,1,1,house,0,'stone');
    bevel(w*.245,h*1.45,-d*.17,.34,.76,.35,0x866048,house,'stone');
    const front = d/2;
    bevel(0,.61,front+.025,.65,1.26,.061,0x9b7751,house,'boards');
    for(const x0 of [-.34,.34]) bevel(x0,.62,front+.065,.073,1.28,.085,0x836548,house,'wood');
    bevel(0,1.265,front+.079,.80,.092,.15,0x8d745a,house,'wood');
    bevel(0,.074,front+.17,.86,.15,.44,0x887c69,house,'stone');
    for(const y0 of [.35,.93]) bevel(-.19,y0,front+.066,.24,.046,.024,0x50483c,house,'metal');
    box(.22,.67,front+.049,.034,.034,.04,0xd0a471,house);
    for (const sign of [-1,1]) {
      box(sign*w*.3,1.31,front+.019,.55,.65,.08,0x67604c,house);
      box(sign*w*.3,1.31,front+.066,.46,.55,.02,0xffc879,house,.59);
      box(sign*w*.3,1.31,front+.085,.032,.56,.026,0x765c43,house);
      box(sign*w*.3,1.31,front+.088,.48,.037,.027,0x765c43,house);
      for(const edge of [-1,1]) bevel(sign*w*.3+edge*.30,1.31,front+.079,.081,.70,.078,0x675844,house,'wood');
      bevel(sign*w*.3,.989,front+.13,.68,.11,.25,0x786753,house,'stone');
      for(let leaf=0;leaf<11;leaf++){
        const yy=.38+leaf*.172;
        scatter(softShape,pick(moss),x+sign*(w*.49+range(-.13,.08)),yy,z+front+.13,
          range(.08,.14),range(.048,.11),.043,rand()*6.28,range(-.9,.9));
      }
    }
    for (let y=.18; y<h-.15; y+=.28) {
      for (const sign of [-1,1]) {
        scatter(boxShape,pick(stone),x+sign*(w*.5-.14),y,z+front,.31,.20,.10,range(-.05,.05));
      }
    }
    for(let roofRow=-5;roofRow<=5;roofRow++){
      if(roofRow===0) continue;
      const xx=w*.52*roofRow/5;
      const yy=h*(1+.49*(1-Math.abs(xx)/(w*.55)));
      for(let tile=0;tile<10;tile++) scatter(boxShape,pick([roof,0x4c555a,0x425053,0x626264]),
        x+xx,yy+.025,z-d*.51+tile*d*.117,w*.119,.075,d*.12,range(-.028,.028),-Math.sign(xx)*.62);
    }
    obstacles.push([x-w*.5-.13,x+w*.5+.13,z-d*.5-.14,z+d*.5+.14]);
  }
  function lighthouse(x,z,s,y = 0,door = false) {
    const tower = group(x,y,z);
    tower.scale.setScalar(s);
    const ivory = 0xf2e2be;
    const crimson = 0xa95943;
    for (let i = 0; i < 6; i++) {
      const r = 1.53-i*.116;
      shape(new T.CylinderGeometry(r-.11,r,.81,28),i%3===1 ? crimson : ivory,0,.40+i*.81,0,1,1,1,tower,0,'stone');
    }
    cylinder(0,.11,0,1.69,.24,0x8b8d75,tower);
    cylinder(0,4.92,0,1.02,.18,0x52635e,tower);
    const rail=shape(new T.TorusGeometry(.963,.026,7,42),0x697571,0,5.27,0,1,1,1,tower,0,'metal');
    rail.rotation.x=Math.PI*.5;
    for(let i=0;i<13;i++) {
      const angle=i*Math.PI*2/13;
      cylinder(Math.cos(angle)*.963,5.13,Math.sin(angle)*.963,.022,.29,0x657571,tower,'metal');
    }
    shape(new T.CylinderGeometry(.65,.72,.70,12),0xffbd54,0,5.29,0,1,1,1,tower,1.15);
    shape(new T.ConeGeometry(.91,.53,12),0x4c625c,0,5.92,0,1,1,1,tower);
    ellipsoid(0,6.245,0,.063,.115,.063,0x78755b,tower);
    for (let i=0; i<8; i++) {
      const a = i*Math.PI/4;
      cylinder(Math.cos(a)*.74,5.31,Math.sin(a)*.74,.04,.74,0x596457,tower);
    }
    if (door) {
      const face = group(0,0,1.49,tower);
      box(0,.67,0,1.08,1.34,.15,0x544638,face);
      shape(new T.CylinderGeometry(.539,.539,.15,12),0x544638,0,1.30,0,1,1,1,face).rotation.x=Math.PI/2;
      box(0,.645,.083,.79,1.26,.019,0xf2b06a,face,.62);
      shape(new T.CylinderGeometry(.394,.394,.02,12),0xf2b06a,0,1.27,.093,1,1,1,face,.62).rotation.x=Math.PI/2;
      const leaf = box(-.35,.72,.37,.76,1.50,.09,0x825e40,face,0,'wood');
      leaf.rotation.y=-.84;
      box(0,.06,.24,1.45,.15,.56,0xa29a82,face);
      lantern(.84,1.65,.11,face);
      for(let i=0;i<9;i++){
        const a=i*Math.PI/8;
        bevel(Math.cos(a)*.62,1.28+Math.sin(a)*.62,.072,.20,.22,.16,0xa59881,face,'stone').rotation.z=a-Math.PI*.5;
      }
    }
    return tower;
  }
  function water(x,z,w,d,y,color) {
    art.water(x,z,w,d,y,color,{sky:act===3?0x9ba7aa:0x8ba4b4,quiet:act===1,
      sun:act===3?0xffc780:0xf4ceba,light:act===3?[-.23,.113,-.97]:[-.49,.28,-.81]});
  }

  const bounds = [-8,8,-13,9];
  let spawn = [0,1.68,5.2], look = [0,1.34,-3.6];
  if (act === 0) {
    stage(0x7f7b80,.028,0xaaa38e,0xffc28a,{
      top:0x426184,horizon:0xe0ad91,cloud:0xf0b998,shade:0x596074,cover:.42,glow:.39,solar:.14,drift:.68
    });
    coastalRidges();
    water(0,-24,70,16,-.61,0x416471);
    cobbles(z => Math.sin(z*.19)*.38,-12,9,3.1);
    cottage(-3.38,-.68,2.9,3.6,2.7,0xa58b66,0x48515b);
    cottage(3.9,-5.8,3.2,3.8,2.7,0x9a917b,0x465a58);
    cottage(-4.0,-9.5,3,3.1,2.5,0xa28a76,0x50676a);
    cottage(4.7,3.5,3.4,2.8,2.45,0x9b917b,0x445e62);
    postLamp(-1.83,1.4);
    postLamp(1.78,-7.9);
    lighthouse(3.8,-18,1.2,.14);
    animal(-.69,2.29,0xd87534,.20,'letter',1.23);
    obstacles.push([-1.08,-.29,1.94,2.61]);
    for (let i=0;i<48;i++) {
      const z=range(-14,9), sign=rand()>.5?1:-1;
      sprigs(sign*range(1.7,8),z,.32,6,true);
      if (i%3===0) rock(sign*range(2.4,9),z,range(.15,.53));
    }
    for(let i=0;i<15;i++) pine(pick([-1,1])*range(6,15),range(-15,11),range(2,4));
  } else if (act === 1) {
    stage(0x617985,.044,null,0xd7d7c4,{
      top:0x465f6b,horizon:0x829ca4,cloud:0x9baea9,shade:0x4a6269,cover:.32,glow:.08
    },1.65);
    // A channel divides the two banks, with the path kept level across its bridge.
    box(0,-.23,9,75,.42,23,0x576e4d);
    box(0,-.23,-15,76,.42,20,0x536549);
    water(0,-3.52,70,3.05,-.62,0x33847f);
    cobbles(z => Math.sin(z*.16)*.22,-13,9,2.05);
    box(0,-.15,-3.51,2.18,.28,3.29,0x7e8878);
    for (const sign of [-1,1]) {
      for (let z=-5.10;z< -1.88;z+=.32) {
        const height=.37+Math.sin((z+5.1)/3.23*Math.PI)*.23;
        scatter(bevelShape,pick(stone),sign*1.03,height*.42,z,.27,height,.35,range(-.07,.07));
        for(let tuft=0;tuft<3;tuft++) scatter(stoneShape,pick(moss),sign*1.03+range(-.104,.10),height*.90+range(-.02,.06),z+range(-.14,.14),.11,.048,.13,rand()*6.28);
      }
      for (const z of [-5.05,-1.96]) {
        box(sign*1.03,.25,z,.4,.53,.34,0x8e9682);
        rock(sign*1.58,z,.43);
      }
    }
    for(const bank of [-5.03,-2.02]){
      for(let j=0;j<72;j++){
        const x=(j-35)*.32+range(-.11,.11);
        if(Math.abs(x)<1.18)continue;
        scatter(stoneShape,pick(stone),x,range(-.34,-.19),bank+range(-.23,.23),range(.30,.58),range(.36,.62),range(.29,.47),rand()*6.28,range(-.27,.27));
        if(j%2===0) sprigs(x,bank+(bank<-3.4?-.18:.18),.29,5);
      }
    }
    obstacles.push([-8,-.88,-5.01,-1.99],[.88,8,-5.01,-1.99]);
    postLamp(-1.55,1.1);
    postLamp(1.5,-6.5);
    const fox = animal(.18,-1.22,0xd98243,.28,'light',1.36);
    obstacles.push([-.22,.57,-1.51,-.92]);
    animations.push(t => { fox.position.y = .017 * Math.sin(t * 3); });
    for(let i=0;i<89;i++) {
      const side=rand()>.5?-1:1, x=side*range(2.25,17), z=range(-20,13);
      if (z < -5.10 || z > -1.88) {
        const size = range(2.65,6.5);
        pine(x,z,size);
        if (Math.abs(x)<6.5 && z>-12 && z<9) {
          obstacles.push([x-.23,x+.23,z-.23,z+.23]);
        }
        if (i%2===0) rock(x*.89,z,range(.18,.70));
        sprigs(x*.9,z,.7,5);
      }
    }
    for(let i=0;i<35;i++){
      const x=pick([-1,1])*range(1.4,5.3),z=range(-12,7.5);
      if(z>-1.85 || z<-5.18)sprigs(x,z,.38,7);
    }
    for(let i=0;i<13;i++) {
      scatter(stoneShape,0x5e594b,i%2 ? -.15 : .12,.124,3.2-i*.42,.085,.009,.125,(i%2?1:-1)*.32);
    }
  } else if (act === 2) {
    stage(0x747984,.030,0xa5a398,0xffc08b,{
      top:0x425774,horizon:0xb6a3a4,cloud:0xdab2a5,shade:0x59677b,cover:.47,glow:.22,drift:.77
    });
    coastalRidges();
    water(0,-24,68,17,-.62,0x37636e);
    spawn = [0,1.67,5.25];
    look = [0,1.37,-3.8];
    lighthouse(0,-6.8,2.1,0,true);
    obstacles.push([-2.95,3,-10.6,-4.03]);
    cobbles(() => .08,-4.2,9,3.5);
    animal(-.69,-.26,0xde7f3c,.83,'letter',1.28);
    animal(.74,-.91,0x535757,-.51,null,1.57,true);
    obstacles.push([-1.07,-.29,-.63,.10],[.33,1.19,-1.29,-.53]);
    postLamp(-2.42,-2.4);
    for(let i=0;i<40;i++) {
      const sign=rand()>.48?-1:1;
      const x=sign*range(2.03,8), z=range(-9,9);
      sprigs(x,z,.37,6,true);
      if (i%2===0) rock(x,z,range(.19,.58));
    }
    for (const sign of [-1,1]) {
      for(let z=-9.8;z<7.2;z+=.43) {
        scatter(boxShape,pick(stone),sign*4.37,.22,z,.43,.43,.40,range(-.05,.05));
      }
      obstacles.push(sign<0?[-4.6,-4.12,-9.8,7.2]:[4.12,4.6,-9.8,7.2]);
    }
  } else {
    stage(0xdfab91,.022,null,0xffc284,{
      top:0x557fa7,horizon:0xf5b28a,cloud:0xffc295,shade:0x818499,cover:.44,glow:.55,sun:.54,solar:.108,drift:.68
    },2.64);
    coastalRidges();
    box(0,-.21,9.5,52,.4,16,0x8c8e72);
    water(0,-14.5,68,31,-.65,0x488c91);
    box(0,-.17,-.15,6.9,.32,4.62,0x9a8167);
    for(let i=0;i<16;i++) {
      scatter(boxShape,pick([0xa89270,0x91765a,0xb19a79,0xa08565]),
        0,.028,-2.31+i*.293,6.7,.085,.274,range(-.007,.007));
    }
    for (const x of [-3.42,3.42]) {
      for(let z=-2.18;z<2.3;z+=.93) {
        cylinder(x,.42,z,.075,.87,0x785f48);
        box(x,.68,z+.43,.05,.038,.93,0xc1a680);
      }
    }
    for(const x of [-2.75,2.92]) {
      for(const z of [-1.95,-.75,.51]){
        cylinder(x,.33,z,.061,.72,0x6c4f35,scene,'wood');
        if(z<.5) curve(scene,[[x,.56,z],[x,.40,z+.57],[x,.56,z+1.2]],.017,0xb29166,'cloth');
      }
    }
    const hill = shape(headlandShape,0x766f59,5.7,-1.12,-14.3,5.2,2.91,4.06,scene,0,'stone');
    hill.rotation.y = -.43;
    const tower = lighthouse(5.75,-14.3,1.13,.77);
    for(let i=0;i<36;i++){
      const x=range(2.8,10.25),z=range(-17.8,-12.8);
      rock(x,z,range(.27,.85),range(-.45,.18));
    }
    const beam = new T.Mesh(new T.ConeGeometry(.76,8.5,13,1,true),
      new T.MeshBasicMaterial({color:0xffdc91,transparent:true,opacity:.17,depthWrite:false,side:T.DoubleSide}));
    beam.geometry.translate(0,-4.3,0);
    beam.rotation.z = .5*Math.PI;
    const beamPivot = group(0,5.27,0,tower);
    beamPivot.rotation.y=.36;
    beamPivot.add(beam);
    animations.push(t => { beamPivot.rotation.y=.36+Math.sin(t*.37)*.47; });
    animal(-1.39,.26,0xdd8149,2.93,null,1.0);
    animal(-2.29,-.05,0x535859,2.82,null,1.2,true);
    const boat = group(2.0,-.56,-10.0);
    ellipsoid(0,.11,0,.72,.28,1.42,0x966848,boat);
    ellipsoid(0,.29,0,.67,.13,1.36,0xc8aa79,boat);
    box(0,.56,.28,.83,.63,.76,0xe2c299,boat);
    box(0,.92,.27,1.01,.12,.91,0x657370,boat);
    box(0,.64,.68,.52,.22,.05,0xffc465,boat,.58);
    cylinder(.20,1.03,-.52,.037,1.67,0x7f6a52,boat);
    const flag = box(.37,1.76,-.52,.30,.16,.031,0xd57350,boat);
    animations.push(t => {
      boat.position.x=2.1+Math.sin(t*.27)*.71;
      boat.position.z=-10.7+Math.sin(t*.20)*1.04;
      boat.position.y=-.55+Math.sin(t*1.8)*.043;
      boat.rotation.set(Math.sin(t*.91)*.055,.19+Math.sin(t*.24)*.12,Math.sin(t*.75)*.035);
      flag.rotation.y=Math.sin(t*2.6)*.24;
    });
    for(let i=0;i<32;i++) {
      const side=rand()>.5?1:-1, x=side*range(3.7,11), z=range(2.2,10);
      rock(x,z,range(.14,.85),-.04);
      if(i%2===0) sprigs(x,z,.37,5,true);
    }
    sprigs(-2.41,2.25,.48,20,true);
    sprigs(2.44,.84,.42,21,true);
    spawn = [0,1.67,5.25]; look = [.1,1.60,-8.2];
    bounds[0] = -3.14; bounds[1]=3.14; bounds[2] = -2.15;
    obstacles.push([-1.79,-1.03,-.15,.65],[-2.67,-1.92,-.47,.35]);
  }
  const shoreBloom=Array.from({length:18},(_,i)=>{
    const side=i%2?1:-1;
    return [side*range(1.48,2.03),range(act===1?-.80:-1.62,4.36),range(.40,.69),range(0,6.28),pick([0xfff3dd,0xf0deb6])];
  });
  art.flowers(shoreBloom,0xffd5ad,1.21);
  for(const sign of [-1,1]) {
    const x=sign*(act===3?2.62:1.48);
    if(act===1 || act===3) {
      for(const z of act===1?[-.92,1.10]:[-1.75,1.76]) {
        const post=group(x,0,z);
        cylinder(0,.34,0,.065,.66,0x786247,post,'wood');
        bevel(0,.65,0,.17,.087,.17,0xa48d68,post,'wood');
        const band=shape(new T.TorusGeometry(.072,.014,6,16),0xb6a181,0,.51,0,1,1,1,post,0,'cloth');
        band.rotation.x=Math.PI/2;
      }
      const [a,b]=act===1?[-.92,1.10]:[-1.75,1.76];
      curve(scene,[[x,.52,a],[x,.34,(a+b)/2],[x,.52,b]],.017,0xad9870,'cloth');
      obstacles.push([x-.13,x+.13,a-.10,b+.10]);
    }
  }
  addInstances();
  return {spawn, look, bounds, obstacles, animate(time) { art.animate(time);for (const update of animations) update(time); }};
};
