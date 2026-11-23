/* A complete authored lesson. All choices and explanations are local and offline. */
window.LESSON = {
  title: '雾灯来信',
  subtitle: '跟随一封信，走进八个新单词。',
  chapters: [
    { title: '启程', subtitle: '收到来信' },
    { title: '林间', subtitle: '沿路前行' },
    { title: '灯塔', subtitle: '鼓起勇气' },
    { title: '黎明', subtitle: '照亮归途' }
  ],
  words: [
    { id: 'mysterious', word: 'mysterious', ipa: '/mɪˈstɪəriəs/', pos: 'adj.', meaning: '神秘的；难以解释的', collocation: 'a mysterious letter · 一封神秘的信', example: 'A mysterious letter arrives at dusk.', translation: '黄昏时，一封神秘的信送到了。', spellingHint: '共 10 个字母；开头是 myst-，结尾是 -ious。' },
    { id: 'deliver', word: 'deliver', ipa: '/dɪˈlɪvə(r)/', pos: 'v.', meaning: '递送；送达', collocation: 'deliver a letter to someone · 把信送给某人', example: 'Can you deliver this letter to the keeper?', translation: '你能把这封信送给守塔人吗？', spellingHint: '共 7 个字母；de + liver，注意中间只有一个 l。' },
    { id: 'path', word: 'path', ipa: '/pɑːθ/', pos: 'n.', meaning: '小路；路径', collocation: 'follow a path · 沿着小路走', example: 'A path leads through the forest.', translation: '一条小路穿过森林。', spellingHint: '共 4 个字母；以 p 开头，以 th 结尾。' },
    { id: 'narrow', word: 'narrow', ipa: '/ˈnærəʊ/', pos: 'adj.', meaning: '狭窄的', collocation: 'a narrow bridge · 一座狭窄的桥', example: 'The bridge is too narrow for two people.', translation: '这座桥太窄，容不下两个人并排通过。', spellingHint: '共 6 个字母；na + rr + ow，中间双写 r。' },
    { id: 'hesitate', word: 'hesitate', ipa: '/ˈhezɪteɪt/', pos: 'v.', meaning: '犹豫；迟疑', collocation: 'hesitate to do something · 迟疑着不愿做某事', example: 'I hesitate to knock on the door.', translation: '我犹豫着不敢敲门。', spellingHint: '共 8 个字母；hesi + tate，注意结尾有 e。' },
    { id: 'courage', word: 'courage', ipa: '/ˈkʌrɪdʒ/', pos: 'n.', meaning: '勇气', collocation: 'have the courage to do something · 有勇气做某事', example: 'I have the courage to try.', translation: '我有勇气试一试。', spellingHint: '共 7 个字母；cour + age，注意开头的 ou。' },
    { id: 'guide', word: 'guide', ipa: '/ɡaɪd/', pos: 'v.', meaning: '引导；为……带路', collocation: 'guide someone home · 引导某人回家', example: 'The light will guide the boat home.', translation: '灯光将引导小船回家。', spellingHint: '共 5 个字母；g 后面有不发音的 u，结尾有 e。' },
    { id: 'grateful', word: 'grateful', ipa: '/ˈɡreɪtfəl/', pos: 'adj.', meaning: '感激的；感谢的', collocation: 'be grateful for something · 因某事而感激', example: 'We are grateful for your help.', translation: '我们很感激你的帮助。', spellingHint: '共 8 个字母；grate + ful，只有一个 l，不是 greatful。' }
  ],
  steps: [
    {
      id: 'story-mysterious', type: 'choice', scene: 0, wordId: 'mysterious',
      narrative: '暮色落在海边的小镇。小狐狸米洛在门口发现一封没有署名的信，信封上只画着一座灯塔。',
      line: 'A mysterious letter arrives at dusk.',
      translation: '黄昏时，一封神秘的信送到了。',
      question: '没有署名，也不知道来自谁。这封信是……',
      options: [
        { text: '神秘的', correct: true, hint: '' },
        { text: '熟悉的', correct: false, hint: '米洛还不知道寄信人是谁；熟悉的通常是 familiar。' },
        { text: '匆忙的', correct: false, hint: '这里描述的是信的神秘感，而不是寄信的速度。' }
      ],
      explanation: 'mysterious 是形容词，放在 letter 前修饰它：a mysterious letter，一封神秘的信。'
    },
    {
      id: 'story-deliver', type: 'choice', scene: 0, wordId: 'deliver',
      narrative: '信封背面写着：“请在天亮前交给守塔人。”米洛把信收进挎包，提起小灯。',
      line: 'Can you deliver this letter to the keeper?',
      translation: '你能把这封信送给守塔人吗？',
      question: '要完成信封上的请求，米洛应该做什么？',
      options: [
        { text: '把信藏起来', correct: false, hint: '信有明确的收件人，任务是把它送到，而不是藏起来。' },
        { text: '把信送到守塔人手中', correct: true, hint: '' },
        { text: '给信画上图案', correct: false, hint: 'deliver 强调“送达”；画图通常用 draw。' }
      ],
      explanation: 'deliver + 物品 + to + 收件人，表示“把某物送给某人”。Can you 后接动词原形 deliver。'
    },
    {
      id: 'story-path', type: 'choice', scene: 1, wordId: 'path',
      narrative: '离开小镇，米洛走进潮湿的树林。地上有一串脚印，一直延伸到远处的石桥。',
      line: 'A path leads through the forest.',
      translation: '一条小路穿过森林。',
      question: '米洛沿着什么继续前进？',
      options: [
        { text: '一封信', correct: false, hint: '信是 letter；注意句子里 leads through the forest，穿过森林。' },
        { text: '一阵风', correct: false, hint: '地上的脚印提示了一条可以行走的路线。' },
        { text: '一条小路', correct: true, hint: '' }
      ],
      explanation: 'path 指供人行走的小路，也可表示路径。follow a path 就是“沿着小路走”。'
    },
    {
      id: 'story-narrow', type: 'choice', scene: 1, wordId: 'narrow',
      narrative: '石桥横在溪流上。桥面只够一个人通过，米洛收紧挎包，小心地向前迈步。',
      line: 'The bridge is too narrow for two people.',
      translation: '这座桥太窄，容不下两个人并排通过。',
      question: '为什么米洛要小心地过桥？',
      options: [
        { text: '桥面很狭窄', correct: true, hint: '' },
        { text: '桥面特别宽阔', correct: false, hint: '宽阔是 wide，与 narrow 的意思相反。' },
        { text: '桥面非常柔软', correct: false, hint: '这里强调宽度，不是软硬；“柔软的”是 soft。' }
      ],
      explanation: 'narrow 表示“狭窄的”，反义词是 wide。too narrow for two people：对两个人来说太窄。'
    },
    {
      id: 'logic-because', type: 'order', scene: 1, wordId: null,
      narrative: '过了桥，小路仍然很窄。米洛决定放慢脚步。把“怎么做”和“为什么”连起来。',
      line: 'We walk slowly because the path is narrow.',
      translation: '我们慢慢走，因为小路很窄。',
      question: '按顺序点击词块：我们慢慢走，因为小路很窄。',
      chunks: ['because', 'the path is narrow.', 'We walk', 'slowly'],
      answer: [2, 3, 0, 1],
      explanation: 'We walk slowly 是做法；because 后面解释原因。结构是“结果 + because + 原因”，这里不要再加 so。'
    },
    {
      id: 'story-hesitate', type: 'choice', scene: 2, wordId: 'hesitate',
      narrative: '灯塔终于到了。米洛抬起爪子，却停在门前：这么晚敲门，会不会打扰守塔人？',
      line: 'I hesitate to knock on the door.',
      translation: '我犹豫着不敢敲门。',
      question: '米洛举起爪子又停住，此刻他在……',
      options: [
        { text: '庆祝成功', correct: false, hint: '米洛还没有敲门，任务也还未完成。' },
        { text: '犹豫要不要行动', correct: true, hint: '' },
        { text: '迅速逃跑', correct: false, hint: '他仍然站在门前，是迟疑，而不是离开。' }
      ],
      explanation: 'hesitate 是动词，表示“犹豫”。hesitate to do something：做某事时迟疑，例如 hesitate to knock。'
    },
    {
      id: 'story-courage', type: 'choice', scene: 2, wordId: 'courage',
      narrative: '想到信封上的“天亮前”，米洛深吸一口气，终于敲响了门。门开了，獾先生接过那封信。',
      line: 'I have the courage to try.',
      translation: '我有勇气试一试。',
      question: '米洛虽然害怕，仍决定行动。他拿出了什么？',
      options: [
        { text: '一个借口', correct: false, hint: '米洛没有放弃，他选择了尝试。' },
        { text: '一份地图', correct: false, hint: '这里说的是内心的力量，不是挎包里的物品。' },
        { text: '勇气', correct: true, hint: '' }
      ],
      explanation: 'courage 是名词，表示“勇气”。have the courage to try：有勇气尝试。它强调害怕时仍能行动。'
    },
    {
      id: 'logic-although', type: 'order', scene: 2, wordId: null,
      narrative: '“勇敢不是不害怕，”獾先生说，“而是害怕时，仍愿意试一试。”用一句英语说出这种转折。',
      line: 'Although I am afraid, I have the courage to try.',
      translation: '虽然我害怕，但我有勇气试一试。',
      question: '按顺序点击词块：虽然我害怕，但我有勇气试一试。',
      chunks: ['I have the courage', 'to try.', 'Although', 'I am afraid,'],
      answer: [2, 3, 0, 1],
      explanation: 'Although 引出“虽然……”这一让步条件，后面接真正的行动。英语中这里用了 although，就不要再加 but。'
    },
    {
      id: 'story-guide', type: 'choice', scene: 3, wordId: 'guide',
      narrative: '信来自归航的船长：“雾太浓，请点亮灯塔。”獾先生立刻转动灯具。金色光束穿过海雾，远处传来船笛声。',
      line: 'The light will guide the boat home.',
      translation: '灯光将引导小船回家。',
      question: '灯塔的光为小船做了什么？',
      options: [
        { text: '指引回家的方向', correct: true, hint: '' },
        { text: '让它停在原地', correct: false, hint: 'home 提示了目的地；灯光正在为船指出方向。' },
        { text: '把它藏进雾里', correct: false, hint: '灯光穿过海雾，让船找到航向，而不是把船藏起来。' }
      ],
      explanation: 'guide 在这里是动词，表示“引导”。will 后接动词原形：will guide。guide the boat home 就是“引导小船回家”。'
    },
    {
      id: 'story-grateful', type: 'choice', scene: 3, wordId: 'grateful',
      narrative: '天亮时，小船平安驶进港湾。船长在甲板上挥手。獾先生拍拍米洛的肩：“谢谢你把信送到。”',
      line: 'We are grateful for your help.',
      translation: '我们很感激你的帮助。',
      question: '平安归来的船长，对米洛和守塔人怀着什么心情？',
      options: [
        { text: '困惑', correct: false, hint: '他们帮船长平安回家，船长正在表达感谢。' },
        { text: '感激', correct: true, hint: '' },
        { text: '不耐烦', correct: false, hint: '“谢谢你”的语境表达的是感谢，不是不耐烦。' }
      ],
      explanation: 'grateful 是形容词。be grateful for + 事情，表示“因某事而感激”。注意拼写是 grateful，不是 greatful。'
    }
  ],
  review: [
    {
      id: 'review-mysterious', type: 'choice', scene: 0, wordId: 'mysterious',
      line: 'A ____ sound comes from the empty room.',
      question: '空房间里传来一种“神秘的”声音。选词补全。',
      options: [
        { text: 'grateful', correct: false, hint: 'grateful 描述感激的心情，不描述未知的声音。' },
        { text: 'mysterious', correct: true, hint: '' },
        { text: 'narrow', correct: false, hint: 'narrow 描述宽度；这里要表达的是未知而神秘。' }
      ],
      hint: '回想那封没有署名的信。',
      explanation: 'mysterious sound：神秘的声音。形容词 mysterious 修饰名词 sound。'
    },
    {
      id: 'review-deliver', type: 'spell', scene: 0, wordId: 'deliver',
      line: 'Please ____ this package to Anna.',
      question: '请把这个包裹“递送”给安娜。输入缺少的单词。',
      answer: 'deliver', hint: '以 d 开头，共 7 个字母。',
      explanation: 'deliver this package to Anna：把这个包裹送给安娜。deliver 不仅可以送信，也可以递送包裹。'
    },
    {
      id: 'review-path', type: 'choice', scene: 1, wordId: 'path',
      line: 'We followed a muddy ____ through the woods.',
      question: '我们沿着一条泥泞的“小路”穿过树林。选词补全。',
      options: [
        { text: 'path', correct: true, hint: '' },
        { text: 'courage', correct: false, hint: 'courage 是抽象的勇气，不是一条可以行走的路。' },
        { text: 'letter', correct: false, hint: 'letter 是信，不能和 muddy 一起表示林间行走的路线。' }
      ],
      hint: '回想米洛脚下那条通往石桥的路。',
      explanation: 'follow a path：沿着小路走。muddy 描述这条路很泥泞。'
    },
    {
      id: 'review-narrow', type: 'spell', scene: 1, wordId: 'narrow',
      line: 'The street is too ____ for a large bus.',
      question: '这条街太“狭窄”，大巴车开不进去。输入缺少的单词。',
      answer: 'narrow', hint: '以 n 开头，共 6 个字母，中间双写 r。',
      explanation: 'too narrow for a large bus：对大巴车来说太窄。narrow 可以描述桥、街道或通道。'
    },
    {
      id: 'review-hesitate', type: 'choice', scene: 2, wordId: 'hesitate',
      line: 'Do not ____ to ask for help.',
      question: '遇到困难时，不要“犹豫”向别人求助。选词补全。',
      options: [
        { text: 'deliver', correct: false, hint: 'deliver 表示递送物品，不能在这里表示心理上的迟疑。' },
        { text: 'guide', correct: false, hint: 'guide 是引导别人；这里说的是自己是否迟疑。' },
        { text: 'hesitate', correct: true, hint: '' }
      ],
      hint: '回想米洛想敲门却停住的那一刻。',
      explanation: 'Do not hesitate to ask for help：尽管开口求助，不要犹豫。hesitate to do something 是本课学过的搭配。'
    },
    {
      id: 'review-courage', type: 'spell', scene: 2, wordId: 'courage',
      line: 'It takes ____ to speak in front of a crowd.',
      question: '在众人面前讲话需要“勇气”。输入缺少的名词。',
      answer: 'courage', hint: '以 c 开头，共 7 个字母，结尾是 -age。',
      explanation: 'It takes courage to do something：做某事需要勇气。courage 是名词，不是形容词。'
    },
    {
      id: 'review-guide', type: 'choice', scene: 3, wordId: 'guide',
      line: 'The signs will ____ visitors to the exit.',
      question: '这些指示牌会“引导”游客走向出口。选词补全。',
      options: [
        { text: 'hesitate', correct: false, hint: 'hesitate 是犹豫；指示牌的作用是指出方向。' },
        { text: 'guide', correct: true, hint: '' },
        { text: 'grateful', correct: false, hint: 'will 后需要动词原形，而 grateful 是形容词。' }
      ],
      hint: '灯塔引导小船，指示牌也能为游客做同一件事。',
      explanation: 'guide visitors to the exit：引导游客到出口。will 后接动词原形 guide。'
    },
    {
      id: 'review-grateful', type: 'spell', scene: 3, wordId: 'grateful',
      line: 'I am ____ for your advice.',
      question: '我很“感激”你的建议。输入缺少的形容词。',
      answer: 'grateful', hint: '共 8 个字母；grate + ful，不要写成 greatful。',
      explanation: 'be grateful for your advice：因你的建议而感激。for 后可以接 help、advice 等表示被感谢的事情。'
    }
  ]
};
