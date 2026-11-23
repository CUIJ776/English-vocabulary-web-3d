/* Row format: word, IPA, part of speech, meaning, collocation, scene sentence,
   translation, narrative, question, three choices, correct index, review sentence. */
const garden = [
  ['garden','/ˈɡɑːdn/','n.','花园','a quiet garden','Let’s meet in the garden.','我们在花园里见。','周六早上，小林走进植物园。朋友约她在花园里见面，可门边传来一声轻轻的猫叫。','他们约在哪里见面？',['图书馆','花园','车站'],1,'They grow flowers in the ____.'],
  ['notice','/ˈnəʊtɪs/','v.','注意到','notice a sound','I notice a soft sound near the gate.','我注意到门边有个轻轻的声音。','小林停下脚步，那声音似乎从灌木后面传来。','notice 表示她做了什么？',['留意到了声音','制造了声音','忘记了声音'],0,'Did you ____ the change in the weather?'],
  ['search','/sɜːtʃ/','v.','寻找；搜寻','search for a lost pet','I search for the kitten near the bench.','我在长椅附近寻找那只小猫。','她绕到长椅后面，看见花盆间有一小块橘色。','小林在长椅附近做什么？',['画小猫','喂小猫','寻找小猫'],2,'Let’s ____ for the missing key.'],
  ['quiet','/ˈkwaɪət/','adj.','安静的','keep quiet','Keep quiet so the kitten stays calm.','保持安静，好让小猫不紧张。','小猫不肯出来。小林示意刚赶到的朋友放轻脚步。','为了让小猫不受惊，他们该怎么做？',['保持安静','大声喊叫','跑得更快'],0,'Please keep ____ while the baby is sleeping.'],
  ['basket','/ˈbɑːskɪt/','n.','篮子','a basket of apples','We put a blanket in the basket.','我们把毯子放进篮子里。','园丁拿来一个篮子。小林把旧毯子垫进去，给小猫一个暖和的地方。','毯子被放进了什么？',['口袋','篮子','柜子'],1,'She put the apples in a ____.'],
  ['owner','/ˈəʊnə(r)/','n.','主人；所有者','the owner of the cat','The owner left a phone number on the tag.','主人在吊牌上留了电话号码。','小林看见小猫戴着项圈。园丁轻轻翻过吊牌，发现背面有一串数字。','是谁在吊牌上留了号码？',['游客','邮递员','小猫的主人'],2,'The ____ of the bike came to collect it.'],
  ['return','/rɪˈtɜːn/','v.','归还；返回','return something to someone','We can return the kitten to her family.','我们可以把小猫送还给它的家人。','电话那头的男孩认出了小猫。他和妈妈来到花园门口。','接下来他们要做什么？',['把猫送还给家人','为小猫买围巾','把猫藏起来'],0,'Please ____ the book to the library.'],
  ['promise','/ˈprɒmɪs/','v.','承诺；答应','promise to do something','I promise to keep the gate closed.','我答应以后会关好门。','男孩抱起小猫，想起早上忘了关院门，认真做了一个保证。','男孩向大家表达了什么？',['道别','承诺','怀疑'],1,'I ____ to be on time tomorrow.']
];
const station = [
  ['observe','/əbˈzɜːv/','v.','观察','observe changes','We observe the clouds before the storm.','暴风雨前，我们观察云层。','山顶气象站刚入夜。学生周遥和安宁要记录降雨，却发现云层正压向山脊。','他们在暴风雨前对云层做什么？',['预测云的颜色','观察云层','清除云层'],1,'Researchers ____ how the birds behave.'],
  ['accurate','/ˈækjərət/','adj.','准确的','an accurate reading','Are the readings accurate enough to use?','这些测量结果够准确，可以使用吗？','雨量计从零猛跳到一个异常的数字。周遥怀疑这不是可靠的读数。','周遥最想确认读数的哪一项？',['是否足够准确','是否显示得快','是否足够新'],0,'Use an ____ scale to measure the weight.'],
  ['evidence','/ˈevɪdəns/','n.','证据','look for evidence','Water on the wire is evidence of a leak.','电线上的水是漏水的证据。','安宁发现盒内的线路有水珠。她先拍照，让老师能看到异常的依据。','水珠在这里起到什么作用？',['替代仪器','提醒时间','为漏水判断提供证据'],2,'The photos provide ____ of the damage.'],
  ['prevent','/prɪˈvent/','v.','防止；阻止','prevent something from happening','The cover can prevent rain from entering.','防护罩能防止雨水进入。','老师让他们先隔离电源。安宁从工具箱里取出防护罩，准备挡住继续渗进来的水。','防护罩用来做什么？',['防止雨水进入','测量已经进入的水','让仪器加快工作'],0,'The fence will ____ animals from entering.'],
  ['damage','/ˈdæmɪdʒ/','n.','损坏；损害','damage to the equipment','We checked the equipment for damage.','我们检查了设备是否受损。','雨渐小，老师确认安全后，大家一起检查接线和仪器外壳。','他们在检查什么？',['设备是否昂贵','设备是否受损','设备是否准时到达'],1,'The flood caused serious ____ to the building.'],
  ['confirm','/kənˈfɜːm/','v.','确认；证实','confirm the result','A second test will confirm the result.','第二次测试将确认结果。','重新接好备用仪器后，周遥没有立刻提交数据。她提议再测一次。','第二次测试的目的是什么？',['掩盖结果','延迟结果','确认结果'],2,'Please call to ____ the time of the meeting.'],
  ['recover','/rɪˈkʌvə(r)/','v.','找回；恢复','recover lost data','We can recover the data from a backup.','我们可以从备份中恢复数据。','仪器恢复正常，可前半夜的数据仍是空白。安宁想起备份存储卡。','他们能借助备份做什么？',['恢复数据','立刻删除数据','用猜测填数据'],0,'The team used a backup to ____ the files.'],
  ['relief','/rɪˈliːf/','n.','宽慰；如释重负','a sense of relief','It was a relief to see the system working again.','看到系统重新运转，真让人松了一口气。','云散了，山下的灯再次可见。传感器传回稳定读数，两人终于松了口气。','此时两人的感受是什么？',['困惑','宽慰','不耐烦'],1,'It was a ____ to hear everyone was safe.']
];
const museum = [
  ['assume','/əˈsjuːm/','v.','未经核实就认定；假定','assume that something is true',
    'We cannot assume the compass came from the Eastern Collection just because its label says so.',
    '不能只凭标签就认定罗盘来自东馆藏品。',
    '闭馆后，实习生林乔发现铜罗盘旁的藏品标签写着「东馆 E12」。标签看起来很新，而展柜里放着一张旧照片。',
    'What should Qiao avoid doing?',
    ['Checking the photograph against the compass.','Treating the label as proof of the compass’s origin.','Recording what the label actually says.'],1,
    'The instruction says to verify every detail. Do not ____ an unchecked detail is correct.',
    'assume 在这里是把未经证实的说法当真。标签可以记录下来，但它还不能证明罗盘的来源。'],
  ['statement','/ˈsteɪtmənt/','n.','陈述；说法','a statement about the origin',
    'The label contains a statement about the compass, yet an earlier photograph shows a card with a different border beside it.',
    '标签陈述了罗盘的来源，但早先的照片里，罗盘旁的卡片却用了另一种边框。',
    '照片拍于 20:10。林乔读不清照片里的标签，但认出了罗盘外缘的缺口，也看得出标签边框变了。',
    'What is still unproven at this point?',
    ['That the old photo was taken at 8:10.','That the compass has a chipped rim.','That the compass belongs to the Eastern Collection.'],2,
    'The notice includes a written ____ from the director explaining why the gallery is closed.',
    'statement 是标签上的陈述。照片时间和缺口是已观察到的线索，陈述中的藏品来源仍待核实。'],
  ['compare','/kəmˈpeə(r)/','v.','比较；对照','compare A with B',
    'Compare the object in the case with its picture in the original register rather than with the label printed tonight.',
    '把展柜里的物品和原始登记册的图对照，别拿今晚刚打印的标签作依据。',
    '原始登记册把西馆 W07 画成带缺口的铜罗盘，东馆 E12 则是一块蓝色瓷砖。',
    'Which comparison would test the label independently?',
    ['The rim of the compass against the drawing in the register.','The latest label against another copy of the same label.','Tonight’s label against the size of its own type.'],0,
    'To spot changes, ____ the revised drawing with the original, line by line.',
    'compare A with B 要找两个独立的信息来源。原始登记册能核对实物，把同一张标签和副本对照无法独立查证。'],
  ['distinguish','/dɪˈstɪŋɡwɪʃ/','v.','辨别；区分','distinguish A from B',
    'The chip helps us distinguish this compass from a similar one, even when both are shown without labels.',
    '即使两件展品都没有标签，这个缺口也能帮我们把这只罗盘和相似的那只区分开。',
    '旧相册还收录了另一只铜罗盘。两只罗盘颜色接近，只有西馆那只的外缘有一道缺口。',
    'Which detail can separate the two compasses?',
    ['The brass colour that they share.','The chip present on only one rim.','Whether a label is visible below the photo.'],1,
    'The small notch helps experts ____ the genuine coin from its copy.',
    'distinguish A from B 需要能区分两者的特征。两只罗盘都呈铜色，只有缺口提供了区别。'],
  ['identify','/aɪˈdentɪfaɪ/','v.','认出；确定身份','identify an object by its number',
    'The number under the rim lets us identify the object as W07, even though the label beside it reads E12.',
    '外缘下方的编号让我们认出这件藏品是 W07，尽管旁边的标签写着 E12。',
    '修复台的斜光照亮了罗盘外缘下刻着的 W07。桌上的蓝瓷砖背面则刻着 E12。',
    'Which object has now been identified as W07?',
    ['The blue tile, because the new labels look alike.','Neither object, because the letters on the labels differ.','The compass, because W07 is engraved on the object itself.'],2,
    'Use the number inside the cover to ____ which copy of the book you found.',
    'identify 在这里是确定藏品的身份。W07 刻在实物上，再结合登记册，可以确认它是西馆罗盘。'],
  ['indicate','/ˈɪndɪkeɪt/','v.','表明；暗示','indicate a change',
    'At 8:20, the cards were no longer where they had been at 8:10. Neither photograph shows a person. What do these details indicate?',
    '到了 20:20，卡片已不在 20:10 的位置。两张照片都没有拍到人。这些细节说明了什么？',
    '林乔找到了 20:20 拍的另一张照片。两张照片里藏品位置没变，标签却对调了。',
    'Which fact do the two photographs support?',
    ['The labels changed between 8:10 and 8:20.','The objects themselves changed places.','The name of the person who moved the labels.'],0,
    'The wet footprints ____ that someone has entered, but they do not tell us who.',
    'indicate 指线索支持某个判断。照片能缩小换标签的时间范围，但无法确认是谁做的。'],
  ['rely','/rɪˈlaɪ/','v.','依赖；信赖','rely on independent records',
    'We can rely on the engraved numbers and the original register because the two sources agree.',
    '刻在实物上的编号和原始登记册相互印证，所以可以把它们作为依据。',
    '开馆前，还来得及重打两张标签。林乔准备写一份交班记录，把能核实的事实与猜测分开。',
    'Which pair should Qiao base the correction on?',
    ['Two copies made from the same incorrect label.','The engraved numbers and the original register.','The fresh ink and a guess about who moved the labels.'],1,
    'When memories conflict, ____ on a dated record rather than a guess.',
    'rely on 表示把某个来源当作可靠依据。刻印与独立的登记册一致，比错误标签的重复副本更可靠。'],
  ['conclude','/kənˈkluːd/','v.','推断；得出结论','conclude from the evidence',
    'Each new card describes the object in the other case, whereas the engraved numbers agree with the register. What can we conclude from that?',
    '两张新的标签各自描述的是另一只展柜里的藏品，而刻印编号与登记册相符。我们可以据此得出什么结论？',
    '林乔把 W07 放回罗盘旁，把 E12 放回瓷砖旁。她还需要写出证据真正能支持的最终结论。',
    'Which conclusion stays within the evidence?',
    ['Someone deliberately moved the two objects.','The photographs prove the guard moved both labels.','The labels were switched, and the person responsible is unknown.'],2,
    'Once the experiments agree, researchers may ____ that the pattern is real.',
    'conclude 是根据证据收束判断。记录能支持「标签被对调」，无法支持某个人调换了标签，也无法证明其动机。']
];
const museumLogic = {
  1:[['where the compass came from.','it did not prove','looked official,','Although the label','by itself'],[3,2,1,4,0],
    '虽然标签看起来很正式，但单凭它无法证明罗盘来自哪里。','Although 引出让步，主句给出证据的局限。where the compass came from 是宾语从句，用陈述语序。'],
  3:[['could Qiao distinguish','the chipped compass','Only after she opened','from the other one.','the original register'],[2,4,0,1,3],
    '直到翻开原始登记册，林乔才能把有缺口的罗盘和另一只区分开。','Only after 放在句首时，主句部分倒装，用 could Qiao distinguish。after 引导的从句仍用陈述语序。'],
  5:[['who moved the labels.','What the photographs show','between the two shots,','is that the labels changed','not'],[1,3,2,4,0],
    '照片显示的是两次拍摄之间标签变了，至于是谁移动的，照片并没有说明。','What 引导主语从句，is that 引出照片能证明的内容，not who 说明证据的边界。'],
  7:[['we would have overlooked','Had we relied','the numbers engraved','on the labels alone,','on the objects.'],[1,3,0,2,4],
    '要是当时我们只信标签，就会漏看刻在藏品上的编号。','Had we relied 等于 If we had relied。主句用 would have overlooked，表示与过去事实相反的结果。']
};
const museumDistractors = {
  assume:['verify','distinguish'],statement:['exhibition','identification'],
  compare:['claim','identify'],distinguish:['assume','indicate']
};
const grammar = {
  garden:[
    [['because','the kitten is afraid.','We speak','quietly'],[2,3,0,1],'我们小声说话，因为小猫害怕。','because 后解释原因，We speak quietly 交代做法。'],
    [['the owner','Before we leave,','we call','again.'],[1,2,0,3],'离开前，我们再给主人打一次电话。','Before we leave 先交代时间，后面接主句。']
  ],
  station:[
    [['the other readings,','we cannot trust','Unless we fix the sensor,','either.'],[2,1,0,3],'除非修好传感器，否则其他读数也不能相信。','unless 相当于 if ... not，引出必要条件。'],
    [['until','the system had been tested.','We did not','submit the report'],[2,3,0,1],'直到系统测试完毕，我们才提交报告。','not ... until ... 表示直到某事发生，另一个动作才发生。']
  ]
};
function makeEpisode(id, info, rows, extraLogic={3:grammar[id][0],5:grammar[id][1]}, contextReviews=null) {
  const words = rows.map(([word,ipa,pos,meaning,collocation,example,translation]) =>
    ({id:word,word,ipa,pos,meaning,collocation,example,translation,
      spellingHint:`以 ${word[0]} 开头，共 ${word.length} 个字母。`}));
  const steps = rows.flatMap(([word,ipa,pos,meaning,collocation,line,translation,narrative,question,choices,correct,,reason], index) => {
    const scene = Math.floor(index / 2);
    const items = [{id:'story-'+word,type:'choice',scene,wordId:word,narrative,line,translation,question,
      options:choices.map((text,i)=>({text,correct:i===correct,hint:`对照画面和句子，再看看 ${word} 在这个情境里的作用。`})),
      explanation:reason || `${word} 在这里表示「${meaning}」。记住搭配 ${collocation}。`}];
    if (extraLogic[index]) {
      const [chunks,answer,translation,explanation] = extraLogic[index];
      items.push({id:'logic-'+index,type:'order',scene,wordId:null,chunks,answer,translation,explanation,
        narrative:'把刚才的行动和它发生的条件连起来。',
        question:'按顺序点击词块：'+translation,line:answer.map(i=>chunks[i]).join(' ')});
    }
    return items;
  });
  const review = rows.map(([word,,,meaning,collocation,,,,,,,line], index) => {
    const base = {id:'review-'+word,scene:Math.floor(index / 2),wordId:word,line,
      hint:words[index].spellingHint,explanation:`${word} 表示「${meaning}」。故事中的搭配是 ${collocation}。`};
    if (contextReviews) {
      const distractors = contextReviews[word]?.slice();
      if (!distractors) return {...base,type:'spell',answer:word,question:'根据英文语境，拼出本篇学过的词。'};
      distractors.splice(index%3,0,word);
      return {...base,type:'choice',question:'Which word best completes the sentence?',
        options:distractors.map(text=>({text,correct:text===word,hint:'先判断空格所需的词性，再核对整句传达的意思。'}))};
    }
    if (index%2 || (id==='station' && index>=4)) return {...base,type:'spell',answer:word,
      question:`输入表示「${meaning}」的英文单词。`};
    const distractors = [words[(index+3)%8].word,words[(index+5)%8].word];
    distractors.splice(index%3,0,word);
    return {...base,type:'choice',question:`选出表示「${meaning}」、符合新句子的词。`,
      options:distractors.map(text=>({text,correct:text===word,hint:'留意空格所需的词性和句子的意思。'}))};
  });
  return {id,...info,words,steps,review};
}
const chapter = (title,subtitle) => ({title,subtitle});
window.EPISODES = [
  makeEpisode('garden',{
    title:'花园里的小客人',subtitle:'循着一声猫叫，找到小猫的家。',level:'入门',tone:'garden',
    description:'植物园门口传来一声猫叫。你能和小林一起找到它的主人吗？',
    englishTitle:'A Little Visitor in the Garden',
    englishDescription:'A kitten meows at the botanical garden gate. Can you help Xiaolin find its owner?',
    preview:'I notice a soft sound near the gate.',ending:'小猫找到家了。',endingLine:'A little kindness goes a long way.',
    scenes:['学生走进植物园','学生在长椅旁找到小猫','园丁递来篮子和毯子','男孩在花园与小猫团聚'],
    chapters:[chapter('花园','听见猫叫'),chapter('长椅','找到小猫'),chapter('园丁','查看吊牌'),chapter('归家','交还小猫')]
  },garden),
  Object.assign(window.LESSON,{
    id:'lighthouse',level:'进阶',tone:'lighthouse',description:'陪小狐狸穿过林间海雾，把来信送到灯塔。',
    englishTitle:'A Letter for the Lighthouse',
    englishDescription:'Follow the little fox through the sea mist in the woods and deliver the letter to the lighthouse.',
    preview:'A mysterious letter arrives at dusk.',ending:'灯亮了，船回家了。',endingLine:'A little courage. A brighter morning.',
    scenes:['小狐狸在海边村庄收到来信','小狐狸提灯走过林间石桥','小狐狸把信交给灯塔守护者','黎明时小船回到港湾']
  }),
  makeEpisode('station',{
    title:'山顶的异常读数',subtitle:'在暴风雨里追查一组异常数据。',level:'挑战',tone:'station',
    description:'雨量计突然跳出异常读数。跟着两位学生检查证据、保护设备、找回数据。',
    englishTitle:'Strange Readings on the Mountain',
    englishDescription:'The rain gauge suddenly gives a strange reading. Help two students examine the evidence, protect their equipment, and recover the data.',
    preview:'We observe the clouds before the storm.',ending:'最后一组数据回来了。',endingLine:'The clouds clear. The readings make sense.',
    scenes:['两名学生到达山顶气象站','两人查看雨量仪和电线','气象站里正检查设备','雨后气象站恢复工作'],
    chapters:[chapter('山雨','读数异常'),chapter('线索','查找原因'),chapter('检修','重新校验'),chapter('雨霁','找回数据')]
  },station),
  makeEpisode('museum',{
    title:'午夜展厅的证词',subtitle:'用两张照片和一册登记簿，追查对调的展品标签。',
    level:'高阶',tone:'museum',minutes:'8–10',coverScene:0,
    description:'闭馆后，两件展品的标签对不上了。比对时间、编号和实物，找出证据真正支持的结论。',
    englishTitle:'The Midnight Museum Mystery',
    englishDescription:'After closing time, two exhibit labels appear to be wrong. Compare the times, numbers, and objects to see what the evidence supports.',
    preview:'The two labels cannot both be right. What can the evidence tell us?',
    ending:'标签归位，结论有据。',
    endingLine:'Good evidence tells us what happened and where to stop guessing.',
    scenes:['闭馆展厅里，暖光照亮罗盘与蓝瓷砖','林乔在档案室查阅原始登记册','修复台上摆着铜罗盘和两张照片','晨光照进展厅，展品标签重新归位'],
    chapters:[chapter('闭馆','两张标签'),chapter('档案','图册对照'),chapter('修复台','刻印与时间'),chapter('开馆','证据与结论')]
  },museum,museumLogic,museumDistractors)
];
