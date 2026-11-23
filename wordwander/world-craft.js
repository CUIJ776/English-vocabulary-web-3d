/* Shared textured geometry and characters for the garden and observatory. */
function worldCraft(T,scene,seed) {
  const art=worldArt(T,scene);
  const faceShape=new T.SphereGeometry(1,28,22);
  const facePoints=faceShape.attributes.position;
  for(let i=0;i<facePoints.count;i++){
    const x=facePoints.getX(i),y=facePoints.getY(i),z=facePoints.getZ(i);
    const front=Math.max(0,z)**2;
    const gaussian=(centerX,centerY,width,height)=>
      Math.exp(-((Math.abs(x)-centerX)**2)/width-((y-centerY)**2)/height);
    const contour=.13*gaussian(.04,-.21,.039,.059)-.075*gaussian(.42,.11,.074,.029)
      +.096*gaussian(.61,-.27,.054,.095)+.071*gaussian(.03,-.52,.072,.048);
    const jaw=y<0?1+y*.125:1;
    facePoints.setXYZ(i,x*jaw,y,z+front*contour);
  }
  faceShape.computeVertexNormals();
  const shapes = {
    box:new T.BoxGeometry(1,1,1),
    bevel:art.bevelBox(),
    globe:new T.SphereGeometry(1,20,14),
    bud:new T.SphereGeometry(1,8,5),
    canopy:new T.SphereGeometry(1,10,7),
    leaf:art.leaf(),
    faceted:art.crag(2),
    stone:art.crag(2),
    cone:new T.ConeGeometry(1,1,12),
    tube:new T.CylinderGeometry(1,1,1,14)
  };
  const batches = new Map();
  const object = new T.Object3D();
  const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0) / 4294967296);
  const range = (a,b) => a+(b-a)*random();
  const choose = palette => palette[Math.floor(random()*palette.length)];
  const surface = kind => kind==='stone' ? 'stone' : kind==='faceted' ? 'ground' : kind==='leaf' ? 'leaf' : 'plain';
  const mat = (color,glow=0,style='plain') => art.material(color,style,glow);
  function mesh(kind,color,x,y,z,sx=1,sy=1,sz=1,parent=scene,glow=0,style=surface(kind)) {
    const shape = new T.Mesh(shapes[kind] || kind,mat(color,glow,style));
    shape.position.set(x,y,z);
    shape.scale.set(sx,sy,sz);
    shape.receiveShadow = true;
    shape.castShadow = parent!==scene || sx*sz<10 && sy>.25;
    parent.add(shape);
    return shape;
  }
  function batch(kind,color,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,style=surface(kind)) {
    const key = [kind,color,style].join(':');
    if (!batches.has(key)) batches.set(key,{kind,color,style,transforms:[]});
    object.position.set(x,y,z); object.rotation.set(rx,ry,rz); object.scale.set(sx,sy,sz);
    object.updateMatrix();
    batches.get(key).transforms.push(object.matrix.clone());
  }
  function finish() {
    for (const {kind,color,style,transforms} of batches.values()) {
      const set = new T.InstancedMesh(shapes[kind],mat(color,0,style),transforms.length);
      transforms.forEach((matrix,i)=>set.setMatrixAt(i,matrix));
      set.instanceMatrix.needsUpdate = true;
      set.receiveShadow = true;
      set.castShadow = ['faceted','tube','canopy'].includes(kind) && transforms.length<150;
      scene.add(set);
    }
  }
  function light(sky,ground,fog,sun=0xffdbad,strength=2.1,position) {
    scene.background = new T.Color(sky);
    scene.fog = new T.FogExp2(sky,fog);
    scene.add(new T.HemisphereLight(0xe3ebf2,ground,1.24));
    art.key(sun,strength,position);
  }
  function group(x,y,z,yaw=0) {
    const root = new T.Group();
    root.position.set(x,y,z); root.rotation.y=yaw; scene.add(root);
    return root;
  }
  function limb(root,a,b,r,color,style='plain') {
    const direction=new T.Vector3(...b).sub(new T.Vector3(...a));
    const midpoint=new T.Vector3(...a).addScaledVector(direction,.5);
    const length=direction.length();
    const part=mesh('tube',color,midpoint.x,midpoint.y,midpoint.z,r,length,r,root,0,style);
    part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
    return part;
  }
  function curve(root,points,r,color,style='plain') {
    const line=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    return mesh(new T.TubeGeometry(line,12,r,6),color,0,0,0,1,1,1,root,0,style);
  }
  function person(x,z,{coat=0xb65b35,yaw=0,scale=1,hair=0x26221f,skin=0xe5ab80,
    pose='stand',hat=false,bag=false,style='girl',kit='coat'}={}) {
    const root=group(x,0,z,yaw);
    root.scale.setScalar(scale);
    const crouch=pose==='crouch', reaches=['give','crouch','repair'].includes(pose);
    const body=crouch?.55:1.02;
    const fabric=kit==='shell'?'glaze':'cloth';
    const dark=new T.Color(coat).multiplyScalar(.72).getHex();
    const trim=new T.Color(coat).lerp(new T.Color(0xcbb28e),.2).getHex();
    const ell=(parent,c,x0,y,z0,w,h,d,texture='plain')=>
      mesh('globe',c,x0,y,z0,w,h,d,parent,0,texture);
    const torso=ell(root,coat,0,body,0,.224,.325,.154,fabric);
    if(crouch) torso.rotation.x=.26;
    ell(root,coat,0,body-.215,-.009,.223,.146,.153,fabric);
    ell(root,trim,0,body+.218,-.08,.148,.132,.137,'cloth');
    ell(root,kit==='shell'?0x494843:0xdfd2b2,0,body+.231,.075,.081,.067,.069,'cloth');
    ell(root,skin,0,body+.317,.015,.072,.098,.072);
    curve(root,[[0,body-.28,.133],[.007,body-.04,.157],[-.003,body+.14,.145],[.004,body+.237,.103]],
      .0105,kit==='shell'?0x687479:dark);
    for(const s of [-1,1]) {
      const x0=s*.117;
      const knee=[x0,crouch?.315:.45,crouch?.19:.015];
      const ankle=[x0,.135,crouch?-.025:.018];
      limb(root,[x0,body-.19,-.025],knee,.090,0x46474a,'cloth');
      ell(root,0x484947,...knee,.090,.094,.083,'cloth');
      limb(root,knee,ankle,.067,0x414b50,'cloth');
      ell(root,0x48382e,x0,.096,ankle[2]+.073,.090,.094,.143,'wood');
      ell(root,0x2d2a23,x0,.045,ankle[2]+.093,.095,.035,.126);
      const shoulder=[s*.188,body+.136,-.015];
      const listen=pose==='listen' && s===1;
      const elbow=[s*(reaches?.245:.24),body+(listen?.025:reaches?-.024:-.05),reaches?.19:.055];
      const hand=listen?[.172,body+.469,.095]:
        [s*(reaches?.201:.235),body+(reaches?.014:-.235),reaches?.38:.062];
      limb(root,shoulder,elbow,.070,coat,fabric);
      ell(root,coat,...elbow,.071,.073,.068,fabric);
      limb(root,elbow,hand,.057,dark,fabric);
      ell(root,kit==='shell'?dark:0xd8c8a3,hand[0],hand[1]-.017,hand[2]-.026,.060,.044,.06,'cloth');
      ell(root,skin,...hand,.047,.066,.037).rotation.x=reaches?-.6:0;
      ell(root,skin,hand[0]-s*.034,hand[1]+.012,hand[2]+.012,.022,.036,.024);
      const pocket=mesh('bevel',dark,s*.122,body-.126,.116,.097,.119,.042,root,0,fabric);
      pocket.rotation.z=s*.16;
      const flap=mesh('bevel',trim,s*.124,body-.084,.142,.107,.027,.031,root,0,fabric);
      flap.rotation.z=s*.16;
      ell(root,kit==='shell'?0x7d8581:0xb58d58,s*.121,body-.094,.158,.011,.011,.006,'metal');
      for(let lace=0;lace<3;lace++) {
        const stitch=ell(root,0x776c53,x0,.153-lace*.007,ankle[2]+.104+lace*.027,.035,.0045,.009,'cloth');
        stitch.rotation.y=lace%2?.38:-.38;
      }
    }
    const face=new T.Group();
    face.name='face';
    face.position.set(0,body+.465,crouch?.07:.023);
    root.add(face);
    face.rotation.x=crouch?.14:pose==='listen'?-.08:0;
    const short=style==='boy'||style==='mentor'||hat;
    const older=style==='mentor'||hat;
    mesh(faceShape,skin,0,.010,0,kit==='shell'?.160:.168,.201,.152,face);
    ell(face,hair,0,.078,-.038,.176,.176,.158,'fur');
    ell(face,hair,0,.135,-.002,.169,.097,.143,'fur');
    for(const s of [-1,1]) {
      ell(face,skin,s*.161,-.016,-.012,.028,.051,.034);
      ell(face,0xad6b50,s*.176,-.016,.008,.011,.029,.014);
      ell(face,hair,s*.137,.074,.075,.037,.102,.047,'fur').rotation.z=s*.27;
      ell(face,0x775241,s*.066,.020,.129,.047,.027,.020).rotation.z=s*-.11;
      ell(face,0xf0dbcb,s*.067,.014,.141,.040,.021,.014);
      ell(face,0x654432,s*.066,.015,.153,.021,.022,.008);
      ell(face,0x2d221d,s*.064,.016,.159,.011,.015,.005,'glaze');
      ell(face,0xffeed7,s*.064-.006,.023,.164,.005,.006,.003);
      const brow=ell(face,hair,s*.066,.064,.143,.045,.008,.009);
      brow.rotation.z=s*-.12;
      if(older) ell(face,0x8e7162,s*.07,-.026,.145,.04,.009,.007);
    }
    ell(face,skin,0,-.027,.163,.023,.032,.023);
    ell(face,0xd89774,0,-.051,.174,.022,.016,.014);
    curve(face,[[-.044,-.098,.140],[-.018,-.108,.151],[.019,-.108,.151],[.043,-.095,.14]],.0053,0x673f35);
    ell(face,0xe5a084,0,-.116,.146,.027,.009,.008);
    for(let i=0;i<(short?9:5);i++) {
      const side=i%2?1:-1, spread=short?.027:.036;
      const lift=style==='boy'?Math.sin(i*2.51)*.023:0;
      const strand=ell(face,hair,side*(.023+Math.floor(i/2)*spread),.133-i*.004+lift,.105,.035,short?.079:.094,.038,'fur');
      strand.rotation.z=side*(short?.36+lift*8:.65);
    }
    if(style==='mother'){
      ell(face,hair,.097,-.051,-.112,.101,.092,.082,'fur').rotation.z=-.34;
      ell(face,hair,-.091,-.042,-.094,.075,.081,.085,'fur');
    } else if(!short){
      ell(face,hair,0,.052,-.157,.093,.095,.062,'fur');
      ell(face,kit==='shell'?0x93453c:0x635548,0,.074,-.188,.061,.032,.044,'cloth');
      ell(face,hair,.038,-.057,-.237,.084,.192,.085,'fur').rotation.z=.36;
      ell(face,hair,.094,-.159,-.252,.052,.128,.063,'fur').rotation.z=.51;
    }
    if(hat){
      mesh('tube',0xbf9c5e,0,.164,0,.249,.038,.247,face,0,'wood');
      ell(face,0xc6a370,0,.194,-.006,.175,.121,.157,'cloth');
      ell(face,0x8b6c4e,0,.171,-.005,.181,.035,.168,'cloth');
    }
    if(older){
      if(hat) {
        ell(face,0xb9a58d,-.029,-.093,.149,.044,.013,.020,'fur').rotation.z=.24;
        ell(face,0xb9a58d,.029,-.093,.149,.044,.013,.020,'fur').rotation.z=-.24;
        ell(face,0xb19b85,0,-.156,.101,.067,.037,.032,'fur');
      }
      else for(const s of [-1,1]) {
        mesh(new T.TorusGeometry(.049,.0045,6,20),0x453d30,s*.062,.014,.175,1,.77,1,face,0,'metal');
      }
    }
    if(bag){
      if(kit==='shell'){
        mesh('bevel',0x3b413b,0,body-.038,-.208,.345,.42,.198,root,0,'cloth');
        mesh('bevel',0x516055,0,body-.076,-.313,.23,.22,.053,root,0,'cloth');
        curve(root,[[-.114,body+.031,-.336],[0,body+.060,-.344],[.114,body+.031,-.336]],.008,0xb4a48b,'cloth');
        for(const s of [-1,1]) curve(root,[[s*.13,body+.22,-.086],[s*.151,body+.167,.126],[s*.142,body-.17,.151]],.024,0x444545,'cloth');
      } else {
        mesh('bevel',0x616748,-.232,body-.14,.058,.25,.245,.133,root,0,'cloth').rotation.z=-.15;
        mesh('bevel',0x727452,-.232,body-.087,.129,.249,.11,.035,root,0,'cloth').rotation.z=-.15;
        ell(root,0xbfa276,-.231,body-.113,.153,.018,.019,.010,'metal');
        curve(root,[[.128,body+.23,.077],[.041,body+.10,.168],[-.197,body-.112,.143]],.017,0x655637,'cloth');
      }
    }
    art.shadow(x,z,.48*scale,.41*scale);
    return root;
  }
  return {T,scene,mesh,batch,finish,light,random,range,choose,group,limb,curve,contact:art.shadow,person,mat,art};
}
