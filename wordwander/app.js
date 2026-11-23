const $ = id => document.getElementById(id);
const episodes = window.EPISODES;
const totalWords = episodes.reduce((sum, e) => sum + e.words.length, 0);
const music = $('music');
const EMPTY = () => ({mode:'intro',i:0,learned:[],wrong:[],done:false,completed:false,lastPlayed:0});
let lesson, state, chunks = [], playback, toastTimer, speaking = false;
let currentScene;
let preparedSpeech, narration, pendingSpeechButton, systemUtterance;
let catalogIndex = initialCatalogIndex();
let catalogSwipe, catalogTap, catalogTrigger = 'shelf-open';
const coverScenes = {garden:1,lighthouse:0,station:3};
const englishLevels = {入门:'Beginner',进阶:'Intermediate',挑战:'Challenge',高阶:'Advanced'};

function bilingual(element, chinese, english) {
  const label = document.createElement('span');
  label.className = 'book-zh';
  label.textContent = chinese;
  const translation = document.createElement('span');
  translation.className = 'book-en';
  translation.lang = 'en';
  translation.textContent = english;
  element.replaceChildren(label, translation);
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { bilingual($('save-status'), '当前浏览器无法保存进度', 'This browser cannot save your progress.'); }
}
function progressKey(id) {
  return id === 'lighthouse' ? 'wordwander-v1' : 'wordwander-episode-' + id;
}
function getProgress(episode) {
  return lesson?.id === episode.id && state ? state : {...EMPTY(), ...read(progressKey(episode.id), {})};
}
function save() {
  state.lastPlayed = Date.now();
  write(progressKey(lesson.id), state);
  updateWordCount();
}
function learnedWords() {
  return episodes.flatMap(e => {
    const progress = getProgress(e);
    const missed = progress.needsPractice ?? missedReview(e, progress);
    return e.words.filter(w => progress.learned.includes(w.id))
      .map(w => ({...w,episode:e.title,needsPractice:missed.includes('review-'+w.id)}));
  }).sort((a,b) => Number(b.needsPractice) - Number(a.needsPractice));
}
function missedReview(episode, progress) {
  return episode.review.filter(q => progress.wrong.includes(q.id)).map(q => q.id);
}
function reviewQuestions() {
  return state.practiceIds ? lesson.review.filter(q => state.practiceIds.includes(q.id)) : lesson.review;
}
function isPractice() { return Array.isArray(state.practiceIds); }
function libraryProgress(progress) {
  if (progress.mode === 'summary') return ['已通关', 'Completed'];
  if (progress.mode === 'story') return [`剧情第 ${progress.i+1} 题`, `Story question ${progress.i+1}`];
  if (progress.mode === 'review') {
    return progress.practiceIds ? ['错词练习待完成', 'Missed words to review'] :
      [`情境复习第 ${progress.i+1} 题`, `Review question ${progress.i+1}`];
  }
  return null;
}
function initialCatalogIndex() {
  const selected = read('wordwander-catalog', '');
  const selectedIndex = episodes.findIndex(episode => episode.id === selected);
  if (selectedIndex >= 0) return selectedIndex;
  let index = 0, latest = 0;
  episodes.forEach((episode, i) => {
    const progress = getProgress(episode);
    if (['story','review'].includes(progress.mode) && progress.lastPlayed > latest) {
      index = i;
      latest = progress.lastPlayed;
    }
  });
  return index;
}
function renderCatalog() {
  const episode = episodes[catalogIndex];
  const progress = getProgress(episode);
  const inProgress = ['story','review'].includes(progress.mode);
  const action = inProgress ? ['继续学习', 'Continue learning'] : progress.mode === 'summary' ?
    ['查看复习结果', 'View review results'] : ['开启故事', 'Start story'];
  const coverIndex = episode.coverScene ?? coverScenes[episode.id];
  const cover = $('catalog-cover');
  cover.src = art(episode, coverIndex);
  cover.alt = episode.scenes[coverIndex];
  cover.draggable = false;
  $('catalog-spread').dataset.tone = episode.tone;
  bilingual($('catalog-title'), episode.title, episode.englishTitle);
  bilingual($('catalog-description'), episode.description, episode.englishDescription);
  bilingual($('catalog-difficulty'), '难度 · ' + episode.level, 'Difficulty · ' + englishLevels[episode.level]);
  const minutes = episode.minutes ?? '5–10';
  bilingual($('catalog-minutes'), `约 ${minutes} 分钟`, `About ${minutes} min`);
  const label = $('catalog-progress');
  const resume = libraryProgress(progress);
  label.hidden = !resume;
  if (resume) bilingual(label, ...resume);
  else label.replaceChildren();
  const open = $('catalog-open');
  bilingual(open, action[0] + ' →', action[1]);
  open.dataset.episode = episode.id;
  $('catalog-position').textContent = `${catalogIndex + 1} / ${episodes.length}`;
  $('catalog-prev').disabled = catalogIndex === 0;
  $('catalog-next').disabled = catalogIndex === episodes.length - 1;
}
function selectCatalog(index) {
  catalogIndex = index;
  write('wordwander-catalog', episodes[index].id);
}
function moveCatalog(direction) {
  const next = catalogIndex + direction;
  if (next < 0 || next >= episodes.length) return false;
  bookView.turnCatalog(direction, () => {
    selectCatalog(next);
    renderCatalog();
  });
  return true;
}
function updateWordCount() {
  $('learned-count').textContent = learnedWords().length + '/' + totalWords;
}
function art(episode, index) {
  const name = 'assets/scene-3d/' + episode.id + '-' + index + '.jpg';
  return window.STORY_ART?.[name] || name;
}
function pauseSpeech() {
  const audio = playback;
  playback = undefined;
  if (audio) {
    audio.onplaying = audio.onended = audio.onerror = null;
    audio.pause();
    if (audio !== preparedSpeech?.audio) {
      audio.removeAttribute('src');
      audio.load();
    }
  }
  systemUtterance = undefined;
  window.speechSynthesis?.cancel();
  restoreSpeechButton();
  setSpeaking(false);
}
function restoreSpeechButton() {
  if (!pendingSpeechButton) return;
  const {button,label}=pendingSpeechButton;
  button.textContent=label;
  button.removeAttribute('aria-busy');
  pendingSpeechButton=undefined;
}
function clearPreparedSpeech() {
  if (!preparedSpeech) return;
  const {controller,audio,objectUrl}=preparedSpeech;
  preparedSpeech=undefined;
  controller.abort();
  if (audio === playback && audio) pauseSpeech();
  else if (audio) {
    audio.removeAttribute('src');
    audio.load();
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
}
const spokenText = text => text.replace(/____/g,'blank');
function bindNarration(button,text) {
  narration={button,text};
  button.onclick=()=>speak(text,button);
  prepareNarration();
}
function prepareNarration() {
  const content=narration && spokenText(narration.text);
  const url=content && !$('voice-select').value && window.STORY_AUDIO_URLS?.[content];
  if (url && preparedSpeech?.url===url) return;
  clearPreparedSpeech();
  if (!url) return;
  const slot={url,controller:new AbortController()};
  preparedSpeech=slot;
  fetch(url,{signal:slot.controller.signal}).then(response=>{
    if (!response.ok) throw new Error('Recording unavailable');
    return response.blob();
  }).then(blob=>{
    if (preparedSpeech !== slot || slot.controller.signal.aborted) return;
    slot.objectUrl=URL.createObjectURL(blob);
    slot.audio=new Audio(slot.objectUrl);
    slot.audio.preload='auto';
    slot.audio.load();
  }).catch(()=>{ /* A click can retry loading the recording directly. */ });
}
function renderShelf() {
  const covers = $('story-shelf');
  covers.innerHTML = episodes.map(episode => {
    const label = libraryProgress(getProgress(episode));
    return `<article class="story-card" data-tone="${episode.tone}">
      <div class="story-volume">
        <div class="volume-board" aria-hidden="true"></div>
        <div class="volume-edge volume-edge-foot" aria-hidden="true"></div>
        <div class="volume-edge volume-edge-end" aria-hidden="true"></div>
        <div class="volume-jacket">
          <img class="story-cover" src="${art(episode, episode.coverScene ?? coverScenes[episode.id])}" alt="" width="480" height="290">
          <div class="story-card-copy">
            <div class="story-meta"><span class="level-label">${episode.level}<span class="book-en" lang="en">${englishLevels[episode.level]}</span></span>${label ? `<span>${label[0]}<span class="book-en" lang="en">${label[1]}</span></span>` : ''}</div>
            <h2>${episode.title}<span class="book-en" lang="en">${episode.englishTitle}</span></h2>
            <button class="story-open" id="shelf-${episode.id}" type="button" data-episode="${episode.id}" aria-label="查看故事简介，${episode.title}" aria-controls="story-catalog"><span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
    </article>`;
  }).join('');
}
function showLibrary(view, focusId) {
  pauseSpeech();
  narration=undefined;
  clearPreparedSpeech();
  bookView.clearPageTurn();
  bookView.clearCatalogMotion();
  storyScene3d.stop();
  $('play-area').hidden = true;
  $('bookshelf').hidden = view !== 'shelf';
  $('story-catalog').hidden = view !== 'catalog';
  $('restart-button').hidden = true;
  $('story-tab').setAttribute('aria-current', 'page');
  document.body.dataset.mode = view;
  if (view === 'catalog') renderCatalog();
  else renderShelf();
  updateWordCount();
  if (focusId) {
    window.scrollTo(0, 0);
    $(focusId).focus({preventScroll:focusId === 'catalog-heading' || focusId === 'shelf-title'});
  }
}
function openCatalog(episodeId, trigger) {
  if (episodeId) {
    const index = episodes.findIndex(episode => episode.id === episodeId);
    if (index >= 0 && index !== catalogIndex) selectCatalog(index);
  }
  const fromShelf = document.body.dataset.mode === 'shelf';
  if (trigger) catalogTrigger = trigger;
  showLibrary('catalog', 'catalog-heading');
  if (fromShelf) bookView.revealCatalog($('catalog-stage'));
}
function openEpisode(id) {
  const next = episodes.find(e => e.id === id);
  if (!next) return;
  bookView.clearCatalogMotion();
  state = getProgress(next);
  lesson = next;
  currentScene = undefined;
  $('play-area').dataset.tone = lesson.tone;
  $('bookshelf').hidden = true;
  $('story-catalog').hidden = true;
  $('play-area').hidden = false;
  $('restart-button').hidden = false;
  $('story-tab').removeAttribute('aria-current');
  $('story-title').textContent = lesson.title;
  $('session-info').innerHTML = `${lesson.level} <span>·</span> ${lesson.words.length} 个单词 <span>·</span> 约 ${lesson.minutes ?? '5–10'} 分钟`;
  $('subtitle').textContent = lesson.subtitle;
  render();
  window.scrollTo(0, 0);
  if (state.mode === 'intro') $('story-title').focus({preventScroll:true});
  else focusReading(false);
}
function currentQuestion() {
  return state.mode === 'review' ? reviewQuestions()[state.i] : lesson.steps[state.i];
}
function focusReading(showScene) {
  const reading = $('story-copy');
  if (document.body.classList.contains('world-immersive')) {
    if (reading.closest('.reading-page').inert) $('scene-depth').focus({preventScroll:true});
    else reading.focus({preventScroll:true});
    return;
  }
  reading.focus({preventScroll:true});
  if (innerWidth <= 760) (showScene ? $('scene') : reading).scrollIntoView({block:'start'});
}
function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').hidden = true, 3800);
}
const settings = {...{rate:'0.9',auto:false,voice:'',volume:22},...read('wordwander-voice',{})};
$('rate-select').value = settings.rate;
$('auto-read').checked = settings.auto;
$('music-volume').value = settings.volume;
function updateVolume() {
  const volume = Number($('music-volume').value) / 100;
  music.volume = volume * (speaking ? 0.25 : 1);
}
function setSpeaking(value) { speaking = value; updateVolume(); }
function saveSettings() {
  Object.assign(settings, {rate:$('rate-select').value, auto:$('auto-read').checked, voice:$('voice-select').value, volume:+$('music-volume').value});
  write('wordwander-voice', settings);
}
for (const id of ['rate-select','auto-read','voice-select','music-volume']) $(id).addEventListener('change', saveSettings);
$('voice-select').addEventListener('change', () => { pauseSpeech(); prepareNarration(); });
$('music-volume').addEventListener('input', updateVolume);
updateVolume();
function updateMusic() {
  const playing = !music.paused;
  $('sound-button').setAttribute('aria-pressed', String(playing));
  $('sound-button').setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
  $('sound-zh').textContent = playing ? '暂停音乐' : '轻音乐';
  $('sound-en').textContent = playing ? 'Pause music' : 'Music';
}
$('sound-button').onclick = async () => {
  try { if (music.paused) await music.play(); else music.pause(); }
  catch { toast('轻音乐暂时无法播放。'); }
  updateMusic();
};
music.addEventListener('play', updateMusic);
music.addEventListener('pause', updateMusic);
function loadVoices() {
  const list = $('voice-select');
  list.replaceChildren(new Option('内置英文录音', ''));
  for (const voice of speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang))) list.add(new Option(voice.name, voice.name));
  if ([...list.options].some(o => o.value === settings.voice)) list.value = settings.voice;
}
if (window.speechSynthesis) {
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
  loadVoices();
}
function speak(text, button) {
  const content = spokenText(text);
  const clip = window.STORY_AUDIO?.[content];
  const url = window.STORY_AUDIO_URLS?.[content];
  pauseSpeech();
  if ((clip || url) && !$('voice-select').value) {
    const slot=url && preparedSpeech?.url===url ? preparedSpeech : undefined;
    // Call play within the click gesture, including on Safari when the fetch is still pending.
    if (slot && !slot.audio) {
      slot.controller.abort();
      slot.audio=new Audio(url);
    }
    const audio = slot?.audio ?? new Audio(url || 'data:audio/wav;base64,' + clip);
    playback = audio;
    audio.playbackRate = Number($('rate-select').value) / .9;
    if (audio.readyState) audio.currentTime=0;
    if (url && button && audio.readyState < 3) {
      pendingSpeechButton={button,label:button.textContent};
      button.textContent='正在准备朗读';
      button.setAttribute('aria-busy','true');
    }
    audio.onplaying=()=>{restoreSpeechButton();setSpeaking(true);};
    audio.onended=()=>{restoreSpeechButton();setSpeaking(false);};
    const failed=()=>{
      if (playback!==audio) return;
      pauseSpeech();
      if (slot) clearPreparedSpeech();
      toast('音频未能播放，请再次点击朗读。');
    };
    audio.onerror=failed;
    audio.play().catch(failed);
    return;
  }
  if (!window.speechSynthesis) { setSpeaking(false); toast('当前设备未提供可用的英文语音。'); return; }
  const utterance = new SpeechSynthesisUtterance(content);
  systemUtterance=utterance;
  setSpeaking(true);
  const selected = speechSynthesis.getVoices().find(v => v.name === $('voice-select').value);
  if (selected) utterance.voice = selected;
  utterance.lang = selected?.lang || 'en-US';
  utterance.rate = Number($('rate-select').value);
  utterance.onend = () => { if (systemUtterance===utterance) setSpeaking(false); };
  utterance.onerror = e => { if (systemUtterance===utterance && !['canceled','interrupted'].includes(e.error)) { setSpeaking(false); toast('无法播放系统语音，请切换到内置英文录音。'); } };
  speechSynthesis.speak(utterance);
}
function setScene(scene) {
  const image = $('scene-image');
  const source = art(lesson, scene);
  if (currentScene?.source !== source) {
    image.src = source;
    if (!storyScene3d.show(image, lesson.id, scene)) {
      bookView.turnPage($('scene'), currentScene?.source, scene < currentScene?.index);
    }
  }
  currentScene = {source, index: scene};
  image.alt = lesson.scenes[scene];
  $('scene-label').textContent = lesson.chapters[scene].subtitle;
  $('scene-counter').textContent = `0${scene+1} / 04`;
  $('chapters').innerHTML = lesson.chapters.map((c,i) =>
    `<div class="chapter ${i===scene?'active':i<scene?'done':''}" ${i===scene?'aria-current="step"':''}><span class="chapter-number">${i+1}</span><span class="chapter-text">${c.title} · ${c.subtitle}</span></div>`).join('');
}
function updateProgress() {
  const {mode,i,done} = state;
  const total = lesson.steps.length + lesson.review.length;
  const count = mode==='summary' ? total : mode==='intro' ? 0 : (mode==='review'?lesson.steps.length:0) + i + Number(done);
  const max = isPractice() ? reviewQuestions().length : total;
  const value = isPractice() ? i + Number(done) : count;
  $('progress-fill').style.width = (value/max*100) + '%';
  $('progress').setAttribute('aria-valuemax', max);
  $('progress').setAttribute('aria-valuenow', value);
}
function render() {
  document.body.dataset.mode = state.mode;
  chunks = [];
  const active = ['story','review'].includes(state.mode);
  const q = active ? currentQuestion() : null;
  const scene = q?.scene ?? (state.mode === 'summary' ? 3 : 0);
  setScene(scene);
  updateProgress();
  $('next-button').disabled = active && !state.done;
  $('bottom-bar').hidden = state.mode === 'summary';
  $('learning-panel').classList.toggle('summary', state.mode === 'summary');
  if (state.mode === 'intro') {
    $('story-copy').innerHTML = `<p class="speaker">${lesson.level} · 第一幕</p><p class="english-line" lang="en">${lesson.preview}</p><p class="narrative">${lesson.description}</p><button class="text-button" id="preview-read">▷ 听一句开场</button>`;
    bindNarration($('preview-read'),lesson.preview);
    const instructions = lesson.id === 'museum'
      ? '读英文线索，比较照片、实物和登记册。先判断证据能证明什么，再完成句子排序。最后用英文语境复习。'
      : '读懂线索后选择词义，用词块拼出英语句子。结尾会用新情境复习这 8 个单词。';
    $('activity').innerHTML = `<h2>故事玩法</h2><p class="intro-description">${instructions}</p>`;
    $('step-info').textContent = `${lesson.chapters.length} 幕故事 · ${lesson.steps.filter(step=>step.type==='order').length} 道句子排序 · ${lesson.review.length} 道复习`;
    $('next-button').textContent = '开启故事 →';
  } else if (state.mode === 'summary') renderSummary();
  else renderQuestion(q, scene);
}
function renderSummary() {
  narration=undefined;
  clearPreparedSpeech();
  const missed = state.needsPractice ?? missedReview(lesson, state);
  const score = state.reviewScore ?? lesson.review.length-missedReview(lesson, state).length;
  const note = state.practiceResult === undefined ? '' : `<p class="practice-result" role="status">${missed.length ? `本轮重练：${state.practiceResult} 个词独立答对，还有 ${missed.length} 个词可再练。` : '本篇错词已全部独立答对。'}</p>`;
  $('story-copy').innerHTML = `<p class="speaker">故事完成</p><h2>${lesson.ending}</h2><p class="english-line" lang="en">${lesson.endingLine}</p>`;
  $('activity').innerHTML = `<h2>复习结果</h2><p class="summary-score">${score} / ${lesson.review.length}</p><p>首次答对且未使用提示</p>
    ${note}<div class="summary-words">${lesson.words.map(w => `<div class="summary-word"><strong>${w.word}</strong> ${w.meaning}${missed.includes('review-'+w.id)?' <small>· 待重练</small>':''}</div>`).join('')}</div>
    <div class="summary-actions">${missed.length ? `<button class="primary" id="practice">重练 ${missed.length} 个错词</button>` : ''}<button class="secondary" id="again">复习全部</button><button class="text-button" id="back-shelf">返回选书</button></div>`;
  if ($('practice')) $('practice').onclick = () => startReview(missed, score);
  $('again').onclick = () => {
    startReview(null, score);
  };
  $('back-shelf').onclick = () => openCatalog();
}
function startReview(ids, score) {
  pauseSpeech();
  const needsPractice = state.needsPractice ?? missedReview(lesson, state);
  Object.assign(state, {mode:'review', i:0, done:false, practiceIds:ids, needsPractice, reviewScore:score,
    wrong:state.wrong.filter(id => !id.startsWith('review-'))});
  delete state.practiceResult;
  save();
  render();
  focusReading(false);
}
function finishReview() {
  const missed = missedReview(lesson, state);
  if (isPractice()) {
    state.practiceResult = state.practiceIds.length-missed.length;
  } else {
    state.reviewScore = lesson.review.length-missed.length;
  }
  state.needsPractice = missed;
  state.practiceIds = null;
  state.mode = 'summary';
  state.completed = true;
}
function renderQuestion(q, scene) {
  const review = state.mode === 'review';
  const line = q.type === 'order' && !state.done ? 'Can you put the story together?' : q.line;
  const display = q.wordId && !review ? line.replace(q.wordId, '<mark>'+q.wordId+'</mark>') : line;
  $('story-copy').innerHTML = `<p class="speaker">${review ? '情境复习' : lesson.chapters[scene].title+' · 故事线索'}</p>
    <p class="narrative">${q.narrative || '换一个情境，回想刚才学过的词。'}</p><p class="english-line" lang="en">${display}</p>
    <div class="audio-row"><button class="text-button" id="read">▷ 朗读英文</button>${q.translation?'<button class="text-button" id="translate">查看中文</button>':''}</div>
    <p class="translation" id="translation" hidden></p>`;
  if (!state.done || (!review && q.type!=='order')) bindNarration($('read'),line);
  if ($('translate')) $('translate').onclick = () => {
    const translation = $('translation');
    translation.hidden = !translation.hidden;
    translation.textContent = q.translation;
    $('translate').textContent = translation.hidden ? '查看中文' : '收起中文';
  };
  $('activity').innerHTML = `<h2>${q.question}</h2><div id="question-controls"></div><div class="feedback" id="feedback" role="status"></div>`;
  const controls = $('question-controls');
  if (q.type === 'choice') renderChoices(q, controls);
  if (q.type === 'spell') renderSpelling(q, controls);
  if (q.type === 'order') renderOrder(q, controls);
  if (state.done) showAnswer(q);
  const length = (review ? reviewQuestions() : lesson.steps).length;
  const atEnd = state.i === length-1;
  $('next-button').textContent = atEnd ? (review ? '查看复习结果 →' : '开始情境复习 →') : (review ? '下一个单词 →' : '继续故事 →');
  $('step-info').textContent = `${review ? (isPractice() ? '错词重练' : '情境复习') : '剧情互动'} ${state.i+1} / ${length}`;
}
function renderChoices(q, controls) {
  controls.innerHTML = '<div class="choices">' + q.options.map((o,i) =>
    `<button class="choice" data-choice="${i}"><span class="choice-key">${String.fromCharCode(65+i)}</span>${o.text}</button>`).join('') + '</div>';
  controls.querySelectorAll('button').forEach(b => b.onclick = () => {
    const option = q.options[+b.dataset.choice];
    if (option.correct) { succeed(q); return; }
    b.classList.add('incorrect');
    b.disabled = true;
    incorrect(q, option.hint);
    controls.querySelector('button:not([disabled])')?.focus({preventScroll:true});
  });
}
function renderSpelling(q, controls) {
  controls.innerHTML = '<form id="spell-form"><label for="spelling">输入英文单词</label><input class="spell-input" id="spelling" autocomplete="off" spellcheck="false" autocapitalize="none" required><button class="secondary">检查拼写</button></form><button class="text-button" id="hint">给我一点提示</button>';
  $('spell-form').onsubmit = e => {
    e.preventDefault();
    if ($('spelling').value.trim().toLowerCase() === q.answer) succeed(q);
    else incorrect(q, '再想一想。' + q.hint);
  };
  $('hint').onclick = () => incorrect(q, q.hint);
}
function renderOrder(q, controls) {
  controls.innerHTML = '<div class="sentence-answer" id="sentence" aria-label="已选词块">点击下方词块组合句子</div><div class="word-bank">' +
    q.chunks.map((chunk,i) => `<button class="chunk" data-index="${i}">${chunk}</button>`).join('') +
    '</div><button class="text-button" id="clear">重新排列</button><button class="secondary" id="check">检查句子</button>';
  const items = [...controls.querySelectorAll('.chunk')];
  function updateChunks() {
    const sentence = $('sentence');
    sentence.replaceChildren();
    items.forEach((item,i) => item.disabled = chunks.includes(i));
    if (!chunks.length) sentence.textContent = '点击下方词块组合句子';
    for (const index of chunks) {
      const button = document.createElement('button');
      button.className = 'chunk selected-chunk';
      button.textContent = q.chunks[index];
      button.setAttribute('aria-label', '撤回词块：'+q.chunks[index]);
      button.onclick = () => {
        chunks = chunks.filter(i => i !== index);
        updateChunks();
        items[index].focus({preventScroll:true});
      };
      sentence.append(button);
    }
  }
  items.forEach(b => b.onclick = () => {
    chunks.push(+b.dataset.index);
    updateChunks();
    (items.find(item => !item.disabled) || $('check')).focus({preventScroll:true});
  });
  $('clear').onclick = () => {
    chunks = [];
    updateChunks();
    $('feedback').textContent = '';
    items[0].focus({preventScroll:true});
  };
  $('check').onclick = () => {
    if (chunks.length < q.chunks.length) { $('feedback').textContent = '请先用完全部词块。'; return; }
    if (chunks.join(',') === q.answer.join(',')) succeed(q);
    else incorrect(q, '顺序还可以调整。试着先找主句，再看连词引出的从句。');
  };
}
function incorrect(q, hint) {
  if (!state.wrong.includes(q.id)) state.wrong.push(q.id);
  save();
  $('feedback').textContent = hint;
}
function succeed(q) {
  state.done = true;
  if (q.wordId && !state.learned.includes(q.wordId)) state.learned.push(q.wordId);
  save();
  showAnswer(q);
  updateProgress();
  $('feedback').focus({preventScroll:true});
  if (innerWidth <= 760) $('feedback').scrollIntoView({block:'nearest'});
}
function showAnswer(q) {
  const controls = $('question-controls');
  controls.classList.add('answered');
  if (q.type === 'choice') controls.querySelectorAll('[data-choice]').forEach(b => {
    if (q.options[+b.dataset.choice].correct) b.classList.add('correct');
  });
  if (q.type === 'order') $('sentence').textContent = q.line;
  if (q.type === 'spell') $('spelling').value = q.answer;
  if (q.type === 'order' || state.mode === 'review') {
    const full = q.line.replace('____', q.wordId || '');
    $('story-copy').querySelector('.english-line').textContent = full;
    bindNarration($('read'),full);
  }
  const word = lesson.words.find(w => w.id === q.wordId);
  $('feedback').className = 'feedback success';
  $('feedback').tabIndex = -1;
  $('feedback').innerHTML = '<strong>✓ 答对了</strong><p>' + q.explanation + '</p>' + (word ? `<div class="word-reveal"><div class="word-head">${word.word} <small>${word.ipa}</small></div><p>${word.pos} ${word.meaning}</p><p>${word.collocation}</p><button class="text-button" id="read-word">▷ 听单词</button></div>` : '');
  if (word) $('read-word').onclick = () => speak(word.word,$('read-word'));
  controls.querySelectorAll('button,input').forEach(b => b.disabled = true);
  $('next-button').disabled = false;
}
$('next-button').onclick = () => {
  const oldScene = state.mode === 'intro' ? -1 : currentQuestion()?.scene;
  if (state.mode === 'intro') { state.mode = 'story'; state.i = 0; }
  else if (!state.done) return;
  else {
    state.i++;
    if (state.mode === 'story' && state.i >= lesson.steps.length) { state.mode = 'review'; state.i = 0; }
    else if (state.mode === 'review' && state.i >= reviewQuestions().length) finishReview();
  }
  pauseSpeech();
  state.done = false;
  save();
  render();
  const next = ['story','review'].includes(state.mode) ? currentQuestion() : null;
  focusReading(state.mode === 'story' && oldScene !== next.scene);
  if ($('auto-read').checked && next && next.type !== 'order') speak(next.line,$('read'));
};
$('notebook-button').onclick = () => {
  const words = learnedWords();
  $('word-list').innerHTML = words.length ? words.map((w,i) => `<div class="word-entry"><p class="speaker">${w.episode}${w.needsPractice?' · 待重练':''}</p><h3>${w.word} <small>${w.ipa}</small></h3><p>${w.pos} ${w.meaning}</p><p>${w.collocation}</p><p lang="en">${w.example}</p><p>${w.translation}</p><button class="text-button" data-word="${i}">▷ 朗读例句</button></div>`).join('') : '<p class="empty">答对剧情中的词义题后，单词会收进手帐。</p>';
  $('word-list').querySelectorAll('button').forEach(b => b.onclick = () => speak(words[+b.dataset.word].example));
  $('notebook').showModal();
};
$('settings-button').onclick = () => $('settings').showModal();
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => $(b.dataset.close).close());
$('test-voice').onclick = () => speak('Every word opens a little world.');
$('restart-button').onclick = () => { $('settings').close(); $('restart-dialog').showModal(); };
$('confirm-restart').onclick = () => { pauseSpeech(); state = EMPTY(); save(); $('restart-dialog').close(); render(); };
$('brand').onclick = e => { e.preventDefault(); showLibrary('shelf', 'shelf-title'); };
$('story-tab').onclick = () => showLibrary('shelf', 'shelf-title');
$('play-back').onclick = () => openCatalog();
$('shelf-open').onclick = () => openCatalog(null, 'shelf-open');
bookView.enableEntrance(() => openCatalog(null, $('book-camera').hidden ? 'book-poster' : 'book-open'));
$('story-shelf').onclick = event => {
  const button = event.target.closest('.story-open') ?? event.target.closest('.story-card')?.querySelector('.story-open');
  if (button) openCatalog(button.dataset.episode, button.id);
};
$('catalog-back').onclick = () => showLibrary('shelf', catalogTrigger);
bookView.enableCatalogRotation();
$('catalog-prev').onclick = () => moveCatalog(-1);
$('catalog-next').onclick = () => moveCatalog(1);
const catalogOpen = $('catalog-open');
catalogOpen.onclick = () => {
  if (document.body.dataset.mode === 'catalog') openEpisode(episodes[catalogIndex].id);
};
catalogOpen.addEventListener('pointerdown', event => {
  if (event.isPrimary && event.pointerType === 'touch') {
    catalogTap = {id:event.pointerId, x:event.clientX, y:event.clientY};
  }
});
catalogOpen.addEventListener('pointercancel', () => { catalogTap = undefined; });
catalogOpen.addEventListener('pointerup', event => {
  const tap = catalogTap;
  catalogTap = undefined;
  if (tap?.id !== event.pointerId || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10 ||
      !catalogOpen.contains(document.elementFromPoint(event.clientX,event.clientY))) return;

  // On a perspective-transformed button, a touch can finish without emitting click.
  const selected = catalogIndex;
  setTimeout(() => {
    if (selected === catalogIndex && document.body.dataset.mode === 'catalog') catalogOpen.click();
  }, 120);
});
$('catalog-spread').addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || event.pointerType === 'mouse' ||
      event.target.closest('button,a') || $('story-catalog').hasAttribute('data-rotating')) return;
  catalogSwipe = {id:event.pointerId, x:event.clientX, y:event.clientY};
});
window.addEventListener('pointerup', event => {
  if (catalogSwipe?.id !== event.pointerId) return;
  const dx = event.clientX - catalogSwipe.x;
  const dy = event.clientY - catalogSwipe.y;
  catalogSwipe = undefined;
  if (document.body.dataset.mode === 'catalog' && Math.abs(dx) > Math.max(42, Math.abs(dy) * 1.35)) {
    moveCatalog(dx < 0 ? 1 : -1);
  }
});
window.addEventListener('pointercancel', () => { catalogSwipe = undefined; });
document.addEventListener('keydown', event => {
  if (document.body.dataset.mode !== 'catalog' || document.querySelector('dialog[open]') ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    showLibrary('shelf', catalogTrigger);
    return;
  }
  const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (direction && moveCatalog(direction)) event.preventDefault();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseSpeech(); music.pause(); } });
bilingual($('shelf-details'), `${episodes.length} 篇故事 · 每篇 8 个词 · 约 5–10 分钟`,
  `${episodes.length} stories · 8 words each · About 5–10 min`);
showLibrary('shelf');
