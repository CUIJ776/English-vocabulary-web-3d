import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';

const game = fileURLToPath(new URL('./', import.meta.url));
const audioDir = resolve(game, 'assets/speech');
const manifestFile = resolve(audioDir, 'manifest.json');
const audioName = wav => createHash('sha256').update(wav).digest('hex') + '.wav';
const validName = /^[a-f0-9]{64}\.wav$/;
const window = {};
for (const file of ['lesson.js', 'episodes.js']) {
  runInNewContext(readFileSync(resolve(game, file), 'utf8'), {window});
}

const asSpoken = text => text.replace(/____/g, 'blank');
const lines = [...new Set([
  ...window.EPISODES.flatMap(e => [
    e.preview, e.endingLine, ...e.words.flatMap(w => [w.word,w.example]),
    ...e.steps.map(q => asSpoken(q.line)),
    ...e.review.flatMap(q => [asSpoken(q.line),q.line.replace('____',q.wordId)])
  ]),
  'Can you put the story together?', 'Every word opens a little world.'
])];
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile,'utf8')) : {};
const clipPath = file => resolve(audioDir, file);
const pending = () => lines.filter(line => !validName.test(manifest[line]) || !existsSync(clipPath(manifest[line])));

function saveClips(pairs) {
  for (const [,wav] of pairs) {
    if (wav.length < 44 || wav.toString('ascii',0,4) !== 'RIFF' || wav.toString('ascii',8,12) !== 'WAVE') {
      throw new Error('The speech library accepts WAV recordings only.');
    }
  }
  mkdirSync(audioDir,{recursive:true});
  for (const [line,wav] of pairs) {
    const file = audioName(wav);
    if (!existsSync(clipPath(file))) writeFileSync(clipPath(file),wav);
    manifest[line] = file;
  }
  // Stale recordings never enter a fresh build; previous deployments remain reproducible from Git.
  const nextManifest=manifestFile+'.'+process.pid+'.tmp';
  writeFileSync(nextManifest, JSON.stringify(Object.fromEntries(lines.filter(line => manifest[line])
    .map(line => [line,manifest[line]])), null, 2) + '\n');
  renameSync(nextManifest,manifestFile);
}

export function speechLibrary() {
  const missing = pending();
  if (missing.length) {
    throw new Error('Missing recordings. Run generate-audio.ps1 before publishing:\n' + missing.join('\n'));
  }
  return Object.fromEntries(lines.map(line => {
    const file = manifest[line];
    const wav = readFileSync(clipPath(file));
    if (audioName(wav) !== file) throw new Error('Recording does not match its content fingerprint: ' + file);
    return [line,{file,wav}];
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , action, directory] = process.argv;
  if (action === '--import-legacy') {
    const legacy = resolve(game,'assets/audio.js');
    runInNewContext(readFileSync(legacy,'utf8'), {window});
    saveClips(pending().filter(line=>window.STORY_AUDIO[line]).map(line=>[line,Buffer.from(window.STORY_AUDIO[line],'base64')]));
    console.log('Audio library contains ' + Object.keys(manifest).length + ' current recordings.');
  } else if (action === '--pending') {
    console.log(JSON.stringify(pending()).replace(/[^\x20-\x7e]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));
  } else if (action === '--add' && directory) {
    const request = JSON.parse(readFileSync(resolve(directory,'lines.json'),'utf8').replace(/^\uFEFF/,''));
    const wanted = pending();
    if (JSON.stringify(request) !== JSON.stringify(wanted)) throw new Error('Story text changed while generating recordings. Run generation again.');
    saveClips(wanted.map((line,i)=>[line,readFileSync(resolve(directory,i+'.wav'))]));
    console.log('Added ' + wanted.length + ' recordings.');
  } else {
    throw new Error('Use --pending, --add <directory>, or --import-legacy.');
  }
}
