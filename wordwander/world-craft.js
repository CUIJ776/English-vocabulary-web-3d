/* Shared textured geometry and characters for the garden, observatory and museum. */
function worldCraft(T,scene,seed) {
  const art=worldArt(T,scene);
  const figureMotion=[];
  const crown=new T.SphereGeometry(1,14,10);
  const contour=crown.attributes.position;
  for(let i=0;i<contour.count;i++) {
    const x=contour.getX(i),y=contour.getY(i),z=contour.getZ(i);
    const radius=1+.14*Math.sin(x*9+z*4)*Math.cos(y*7.6-z*4.3)+.057*Math.sin(y*18+x*7);
    contour.setXYZ(i,x*radius,y*radius,z*radius);
  }
  crown.computeVertexNormals();
  const shapes = {
    box:new T.BoxGeometry(1,1,1),
    bevel:art.bevelBox(),
    globe:new T.SphereGeometry(1,20,14),
    bud:new T.SphereGeometry(1,8,5),
    canopy:crown,
    leaf:art.leaf(),
    faceted:art.crag(2),
    stone:art.crag(2),
    cone:new T.ConeGeometry(1,1,12),
    tube:new T.CylinderGeometry(1,1,1,14),
    branch:new T.CylinderGeometry(.67,1,1,13,3)
  };
  const batches = new Map();
  const object = new T.Object3D();
  const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0) / 4294967296);
  const range = (a,b) => a+(b-a)*random();
  const choose = palette => palette[Math.floor(random()*palette.length)];
  const surface = kind => kind==='stone' ? 'stone' : kind==='canopy' ? 'foliage' : kind==='faceted' ? 'ground' : kind==='leaf' ? 'leaf' : 'plain';
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
      set.castShadow = ['faceted','tube','branch','canopy'].includes(kind) && transforms.length<150;
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
  function person(x,z,{coat=0xb65b35,yaw=0,scale=1,hair=0x302824,skin=0xd8ab91,
    pose='stand',hat=false,bag=false,style='girl',kit='coat'}={}) {
    const root=group(x,0,z,yaw);
    root.scale.setScalar(scale);
    const crouch=pose==='crouch', reaches=['give','crouch','repair'].includes(pose);
    const body=crouch?.55:1.02;
    const fabric=kit==='shell'?'shell':'cloth';
    const dark=new T.Color(coat).multiplyScalar(.67).getHex();
    const trim=new T.Color(coat).lerp(new T.Color(0xcbb28e),.12).getHex();
    const ell=(parent,c,x0,y,z0,w,h,d,texture='plain')=>
      mesh('globe',c,x0,y,z0,w,h,d,parent,0,texture);
    const fitted=(sections,color,texture,fold)=>
      mesh(worldFigure.garment(T,sections,fold),color,0,0,0,1,1,1,root,0,texture);
    const tilt=crouch?.094:0;
    const torsoSections=[
      [0,body-.28,-.012,.177,.114],[0,body-.24,-.009,.199,.139],
      [0,body-.05,tilt*.16,.177,.133],[0,body+.11,tilt*.47,.207,.143],
      [0,body+.20,tilt*.72,.187,.122],[0,body+.265,tilt*.82,.103,.099],
      [0,body+.311,tilt*.84,.062,.072]
    ];
    fitted(torsoSections,coat,fabric,.048);
    fitted([[0,body-.29,-.012,.181,.117],[0,body-.277,-.010,.180,.118],[0,body-.258,-.009,.19,.127]],dark,fabric);
    fitted([[0,body+.266,tilt*.82,.104,.1],[0,body+.300,tilt*.87,.082,.090],[0,body+.335,tilt*.86,.073,.074]],trim,'cloth');
    if (kit==='shell') ell(root,dark,0,body+.195,-.115,.125,.113,.11,'shell');
    curve(root,torsoSections.slice(0,-1).map(([tie,y,z,rx,rz],i)=>[tie+(i%2?.002:0),y,z+rz+.006]),.0062,dark,fabric);
    mesh('bevel',0x82766a,.008,body+.205,tilt*.72+.128,.016,.045,.009,root,0,'metal');
    for(const s of [-1,1]) {
      const x0=s*.111;
      const knee=[x0+s*.015,crouch?.328:.49,crouch?.255:.049];
      const ankle=[x0+s*.021,.135,crouch?-.018:.033];
      fitted([[x0,body-.195,-.011,.102,.103],
        [(x0+knee[0])*.5,(body-.195+knee[1])*.5,(knee[2]-.011)*.5,.086,.091],
        [...knee,.074,.076],[ankle[0],.266,(knee[2]+ankle[2])*.50,.065,.071],[...ankle,.058,.059]],
        kit==='shell'?0x38444a:0x484940,'cloth',.061);
      ell(root,0x4c3f34,ankle[0],.102,ankle[2]+.015,.071,.095,.076,'leather');
      ell(root,0x514439,ankle[0],.073,ankle[2]+.074,.074,.062,.13,'leather');
      ell(root,0x332d26,ankle[0],.028,ankle[2]+.065,.078,.028,.138,'leather');
      const shoulder=[s*.188,body+.136,-.015];
      const listen=pose==='listen' && s===1;
      const elbow=[s*(reaches?.239:.253),body+(listen?.073:reaches?-.09:-.048),reaches?.15:.025];
      const hand=listen?[.133,body+.403,.069]:
        [s*(reaches?.186:.236),body+(reaches?-.056:-.291),reaches?.327:.050];
      const middle=(a,b,t)=>a.map((v,i)=>T.MathUtils.lerp(v,b[i],t));
      const wrist=middle(elbow,hand,.90);
      fitted([[s*.157,body+.182,-.013,.040,.043],[...shoulder,.077,.076],
        [...middle(shoulder,elbow,.54),.065,.062],[...elbow,.057,.054],
        [...middle(elbow,wrist,.61),.051,.049],[...wrist,.039,.039]],coat,fabric,.061);
      fitted([[...middle(elbow,hand,.85),.042,.042],[...wrist,.041,.039]],dark,'cloth');
      const palm=new T.Group();
      const poseAxis=new T.Vector3(...hand).sub(new T.Vector3(...wrist)).normalize();
      palm.position.set(...wrist);
      palm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),poseAxis);
      palm.rotateY(listen?.35:s*.65);
      root.add(palm);
      const part=(sections,color)=>mesh(worldFigure.garment(T,sections,.016),color,0,0,0,1,1,1,palm);
      part([[0,-.010,0,.025,.024],[0,.020,0,.027,.021],[0,.047,-.002,.034,.018],
        [0,.062,-.003,.031,.014],[0,.069,-.004,.016,.011]],skin);
      const reach=listen?.011:reaches?.022:.029;
      for(let finger=0;finger<4;finger++) {
        const side=(finger-1.5)*.015,splay=side*.17;
        const length=[.043,.052,.048,.034][finger];
        const bend=reach*(.84+finger*.12);
        part([[side,.053,.001,.010,.011],[side+splay*.45,.065+length*.36,bend*.14,.0083,.0084],
          [side+splay,.066+length*.82,bend*.58,.0075,.0075],[side+splay,.065+length,bend,.0021,.003]],skin);
        const nail=ell(palm,0xd7af9a,side+splay,.065+length*.77,bend*.55-.006,.0046,.0063,.0021);
        nail.rotation.x=.38;
      }
      part([[-s*.024,.021,.006,.013,.013],[-s*.032,.043,.014,.010,.010],
        [-s*.038,.061,.023,.008,.008],[-s*.034,.074,.024,.002,.003]],skin);
      const pocket=mesh('bevel',dark,s*.122,body-.126,tilt*.13+.118,.089,.116,.028,root,0,fabric);
      pocket.rotation.z=s*.16;
      const flap=mesh('bevel',trim,s*.124,body-.084,tilt*.14+.135,.101,.024,.028,root,0,fabric);
      flap.rotation.z=s*.16;
      for(let lace=0;lace<3;lace++) {
        const stitch=ell(root,0x84705b,ankle[0],.133-lace*.008,ankle[2]+.079+lace*.024,.028,.0045,.007,'cloth');
        stitch.rotation.y=lace%2?.38:-.38;
      }
    }
    const head=worldFigure.head(T,art,{hair,skin,style,hat,pose,phase:Math.abs(x*1.39+z*.61) % 3.7});
    head.root.position.set(0,body+.431,crouch?.108:.015);
    head.root.rotation.x=crouch?.24:pose==='listen'?-.07:0;
    root.add(head.root);
    figureMotion.push(head.animate);
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
  function animate(time) {
    art.animate(time);
    for (const update of figureMotion) update(time);
  }
  return {T,scene,mesh,batch,finish,light,random,range,choose,group,limb,curve,contact:art.shadow,person,mat,art,animate};
}
