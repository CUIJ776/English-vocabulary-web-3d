/* One physical exhibit per chapter. Each carries the chapter's two target words. */
const worldStudy = (() => {
  const exhibits = {
    garden:[
      ['花园入口','Garden Entrance','Meet inside the garden. What do you notice near the gate?','在花园里见。你注意到门边有什么？',1.15,2.25],
      ['长椅旁的告示','By the Bench','Search near the bench. Keep quiet around the kitten.','在长椅附近寻找。靠近小猫时保持安静。',1.08,.68],
      ['篮子和吊牌','Basket & Tag','The blanket is in the basket. The tag has the owner’s number.','毯子在篮子里，吊牌上有主人的号码。',1.06,.98],
      ['花园门口的便条','A Note at the Gate','Return the kitten to her family. Promise to close the gate.','把小猫还给家人，并答应关好门。',1.10,1.25]
    ],
    lighthouse:[
      ['码头的送信簿','Harbour Post','A mysterious letter. Deliver it to the lighthouse keeper.','一封神秘的信，送给灯塔守护者。',1.05,1.92],
      ['林间石桥路牌','Forest Crossing','Follow the path. The bridge is narrow.','沿着小路走，前面的桥很窄。',-1.03,1.57],
      ['守塔人的门牌','Keeper’s Door','Milo hesitates at the door, then finds the courage to knock.','米洛在门前犹豫了一下，随后鼓起勇气敲门。',1.06,1.68],
      ['归港记录','Harbour Log','The light guides the boat home. The crew is grateful.','灯光引导船只回港，船员们心怀感激。',1.08,1.68]
    ],
    station:[
      ['气象观测记录','Weather Log','Observe the clouds. Check whether the reading is accurate.','观察云层，检查读数是否准确。',1.24,2.06],
      ['传感器检修记录','Sensor Inspection','Water on the wire is evidence of a leak. A cover can prevent more rain from entering.','电线上的水珠是漏水的证据。防护罩可以挡住继续渗入的雨水。',1.24,1.02],
      ['复测工作单','Second Test','Check the equipment for damage. Confirm the result with a second test.','先检查设备受损情况，再复测确认结果。',1.31,.98],
      ['数据恢复记录','Recovery Log','Recover the data from a backup. Seeing normal readings is a relief.','从备份恢复数据。看到读数正常，终于松了一口气。',1.34,1.28]
    ],
    museum:[
      ['对不上的展签','Two Exhibit Labels','E12 is printed on the label. The compass has a chipped rim. What can we assume from that statement?','标签印着 E12，罗盘外缘却有缺口。仅看这条陈述，能认定什么？',.91,.74],
      ['原始登记册','Original Register','Compare W07 and E12 in the register. A chipped rim helps distinguish W07 from a similar compass.','对照登记册上的 W07 和 E12。外缘的缺口有助于区分 W07 和外观相似的另一只罗盘。',1.03,.82],
      ['刻印与两张照片','Engraving & Photos','Use the engraved number to identify the object. What do the photos from 20:10 and 20:20 indicate?','用刻印编号辨认藏品。20:10 和 20:20 的照片说明了什么？',-.97,.80],
      ['更正后的交班记录','The Corrected Register','The engraved numbers and register agree. What can we rely on, and what can we conclude?','刻印编号与登记册一致。哪些证据可以作为依据，又能据此得出什么结论？',1.11,.81]
    ]
  };

  const finishes = {
    garden:{frame:0x6e5535, edge:0xa88152, material:'wood', ink:'#304739', paper:'#e7ddbd', mount:'easel'},
    lighthouse:{frame:0x514335, edge:0x9c8154, material:'wood', ink:'#443627', paper:'#e5d0a3', mount:'post'},
    station:{frame:0x324b4b, edge:0x8b9c93, material:'metal', ink:'#b9eed5', paper:'#153a36', mount:'console'},
    museum:{frame:0x413832, edge:0xaa864d, material:'metal', ink:'#372a24', paper:'#eadabd', mount:'plinth'}
  };

  function print(T, title, words, finish) {
    const canvas=document.createElement('canvas');
    canvas.width=512;
    canvas.height=256;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle=finish.paper;
    ctx.fillRect(0,0,512,256);
    ctx.fillStyle=finish.ink;
    ctx.globalAlpha=.10;
    for(let y=4;y<256;y+=6) ctx.fillRect(0,y,512,1);
    ctx.globalAlpha=1;
    ctx.strokeStyle=finish.ink;
    ctx.lineWidth=2;
    ctx.strokeRect(18,17,476,222);
    ctx.textAlign='center';
    ctx.font='600 38px Georgia';
    ctx.fillText(title,256,97,428);
    ctx.fillRect(191,123,130,2);
    ctx.font='25px system-ui';
    ctx.fillText(words.map(word=>word.word).join('   ·   '),256,178,430);
    const texture=new T.CanvasTexture(canvas);
    texture.colorSpace=T.SRGBColorSpace;
    texture.anisotropy=4;
    return texture;
  }

  function build(T,scene,episode,act,settings) {
    const [name,title,evidence,translation,x,z]=exhibits[episode][act];
    const words=window.EPISODES.find(story=>story.id===episode).words.slice(act*2,act*2+2);
    const finish=finishes[episode];
    const art=worldArt(T,scene);
    const exhibit=new T.Group();
    exhibit.position.set(x,0,z);
    exhibit.rotation.y=Math.atan2(settings.spawn[0]-x,settings.spawn[2]-z)*.72;
    scene.add(exhibit);
    const plate=new T.Group();
    plate.position.set(0,1.14,0);
    plate.rotation.x=finish.mount==='easel'?-.18:finish.mount==='post'?0:-.31;
    exhibit.add(plate);
    const shape=art.bevelBox();
    const fastener=new T.SphereGeometry(1,8,6);
    function part(parent,color,x0,y0,z0,w,h,d,material=finish.material,geometry=shape) {
      const mesh=new T.Mesh(geometry,art.material(color,material));
      mesh.position.set(x0,y0,z0);
      mesh.scale.set(w,h,d);
      mesh.receiveShadow=true;
      mesh.castShadow=w>.065;
      parent.add(mesh);
      return mesh;
    }
    if (finish.mount==='easel') {
      for (const side of [-1,1]) {
        part(exhibit,finish.frame,side*.31,.50,.075,.07,1.04,.077).rotation.x=.12;
        part(exhibit,finish.frame,side*.31,.48,-.14,.06,1.04,.073).rotation.x=-.34;
      }
      part(exhibit,finish.edge,0,.41,0,.70,.075,.078);
    } else {
      const station=finish.mount==='console';
      part(exhibit,finish.frame,0,.063,0,station?.55:.49,.126,.39);
      part(exhibit,finish.edge,0,.138,0,.29,.04,.23);
      part(exhibit,finish.frame,0,.56,-.027,station?.18:.109,.93,.13);
      part(exhibit,finish.edge,0,.91,-.048,.27,.08,.21);
      if (station) {
        for(let slot=0;slot<5;slot++) part(plate,finish.edge,.26-slot*.13,-.27,.041,.068,.025,.046);
      }
    }
    part(plate,finish.frame,0,0,0,.99,.53,.122);
    part(plate,finish.edge,0,0,.065,.934,.47,.030);
    const face=new T.Mesh(new T.PlaneGeometry(.86,.411),new T.MeshBasicMaterial({
      map:print(T,title,words,finish),toneMapped:false
    }));
    face.position.z=.083;
    plate.add(face);
    for(const sx of [-1,1]) for(const sy of [-1,1]) {
      part(plate,finish.edge,sx*.462,sy*.23,.088,.013,.013,.008,'metal',fastener);
    }
    const anchor=new T.Object3D();
    anchor.position.set(0,-.43,.10);
    plate.add(anchor);
    settings.obstacles.push([x-.27,x+.27,z-.24,z+.24]);
    art.shadow(x,z,.36,.30,.021);
    return {name,title,evidence,translation,words,anchor};
  }
  return {build};
})();
