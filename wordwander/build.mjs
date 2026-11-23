import { readFileSync, writeFileSync, mkdirSync, readdirSync, realpathSync, rmSync, lstatSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { speechLibrary } from './audio-library.mjs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const embed = (path, mime) => `data:${mime};base64,${readFileSync(new URL(path, import.meta.url)).toString('base64')}`;
const sceneFolder = 'assets/scene-3d/';
const scenes = readdirSync(new URL(sceneFolder, import.meta.url))
  .filter(file => /^(garden|station|lighthouse|museum)-[0-3]\.jpg$/.test(file))
  .map(file => sceneFolder+file);
if (scenes.length !== 16) throw new Error('Four scene images per story are required.');
const styles = ['style.css', 'assets/motion/motion.css', 'book.css', 'catalog.css', 'world.css'];
const scripts = ['assets/motion/motion.js', 'book.js', 'assets/vendor/three.min.js', 'world-art.js', 'world-craft.js', 'world-garden.js',
  'world-lighthouse.js', 'world-station.js', 'world-museum.js', 'world-study.js', 'scene-3d.js', 'lesson.js', 'episodes.js', 'app.js'];
const media = {
  'assets/bookshelf-cover.jpg': 'image/jpeg',
  'assets/lighthouse-popup.png': 'image/png',
  'assets/meditation.ogg': 'audio/ogg'
};
const clips = speechLibrary();
const audioScript = (property, data) => `window.${property}=${JSON.stringify(data).replace(/<\//g,'<\\/')} ;`;
let html = read('index.html');

if (process.argv.includes('--web')) {
  const root = realpathSync(fileURLToPath(new URL('./',import.meta.url)));
  const output = resolve(root,'dist-web');
  if (relative(root,output) !== 'dist-web') throw new Error('Invalid web build path.');
  const records = [...scripts,...styles,...scenes,...Object.keys(media),
    'assets/wenkai-book.woff2','assets/wenkai-book-OFL.txt','assets/vendor/LICENSE'];
  const files = new Map(records.map(path=>[path,readFileSync(resolve(root,path))]));
  const urls = Object.fromEntries(Object.entries(clips).map(([text,{file,wav}]) => {
    const path='assets/speech/'+file;
    files.set(path,wav);
    return [text,path];
  }));
  html = html.replace('内置美式英语录音可以离线播放。也可切换到设备提供的英文语音。','进入题目时提前准备美式英语录音。也可切换到设备提供的英文语音。');
  files.set('index.html',Buffer.from(html));
  files.set('assets/audio.js',Buffer.from(audioScript('STORY_AUDIO_URLS',urls)));
  files.set('_headers',Buffer.from('/assets/speech/*\n  Cache-Control: public, max-age=31536000, immutable\n'));
  for (const [name,bytes] of files) {
    if (bytes.length >= 25 * 1024 * 1024) throw new Error('Exceeds Pages asset limit: '+name);
  }
  const existing=lstatSync(output,{throwIfNoEntry:false});
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink() || relative(root,realpathSync(output)) !== 'dist-web') {
      throw new Error('Refusing to replace a web output directory outside this project.');
    }
    rmSync(output,{recursive:true});
  }
  for (const [name,bytes] of files) {
    const path=resolve(output,name);
    mkdirSync(dirname(path),{recursive:true});
    writeFileSync(path,bytes);
  }
  console.log(`Built dist-web/ with ${files.size} files. Largest file: ${Math.max(...Array.from(files.values(),b=>b.length))} bytes.`);
  process.exit(0);
}

const images = Object.fromEntries(scenes.map(file=>[file,embed(file,'image/jpeg')]));
for (const file of styles) {
  let css = read(file);
  if (file === 'catalog.css') {
    const fontPath = 'assets/wenkai-book.woff2';
    css = css.replace(fontPath, () => embed(fontPath, 'font/woff2'));
    css = `/* ${read('assets/wenkai-book-OFL.txt')} */\n${css}`;
  }
  html = html.replace(`<link rel="stylesheet" href="${file}">`, () => `<style>${css}</style>`);
}
html = html.replace(/src="(assets\/[^"]+)"/g, (tag, file) => {
  const source = images[file] ?? (media[file] && embed(file, media[file]));
  return source ? `src="${source}"` : tag;
});
html = html.replace('<script src="lesson.js"></script>', tag => `<script>window.STORY_ART=${JSON.stringify(images)};</script>${tag}`);
html = html.replace('<script src="assets/audio.js"></script>', () => `<script>${audioScript('STORY_AUDIO',
  Object.fromEntries(Object.entries(clips).map(([line,{wav}])=>[line,wav.toString('base64')])) )}</script>`);
html = html.replace('<script src="assets/vendor/three.min.js"></script>', match =>
  `<!-- Three.js r160, MIT license\n${read('assets/vendor/LICENSE')}\n-->\n${match}`);
for (const file of scripts) {
  const type = file === 'assets/motion/motion.js' ? ' type="module"' : '';
  const script = read(file).replace(/<\/script/gi, '<\\/script');
  html = html.replace(`<script${type} src="${file}"></script>`, () => `<script${type}>${script}</script>`);
}
mkdirSync(new URL('dist/', import.meta.url), {recursive:true});
writeFileSync(new URL('dist/index.html', import.meta.url), html);
writeFileSync(new URL('../雾灯来信.html', import.meta.url), html);
console.log('Built self-contained HTML: dist/index.html and ../雾灯来信.html');
