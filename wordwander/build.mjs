import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const embed = (path, mime) => `data:${mime};base64,${readFileSync(new URL(path, import.meta.url)).toString('base64')}`;
const sceneFolder = 'assets/scene-3d/';
const images = Object.fromEntries(readdirSync(new URL(sceneFolder, import.meta.url))
  .filter(file => /^(garden|station|lighthouse)-[0-3]\.jpg$/.test(file))
  .map(file => [sceneFolder+file, embed(sceneFolder+file, 'image/jpeg')]));
if (Object.keys(images).length !== 12) throw new Error('Twelve 3D chapter scenes are required.');
let html = read('index.html');
for (const file of ['style.css', 'assets/motion/motion.css', 'book.css', 'catalog.css', 'world.css']) {
  let css = read(file);
  if (file === 'catalog.css') {
    const fontPath = 'assets/wenkai-book.woff2';
    css = css.replace(fontPath, () => embed(fontPath, 'font/woff2'));
    css = `/* ${read('assets/wenkai-book-OFL.txt')} */\n${css}`;
  }
  html = html.replace(`<link rel="stylesheet" href="${file}">`, () => `<style>${css}</style>`);
}
const inlineAssets = {
  'assets/bookshelf-cover.jpg': 'image/jpeg',
  'assets/lighthouse-popup.png': 'image/png',
  'assets/meditation.ogg': 'audio/ogg'
};
html = html.replace(/src="(assets\/[^"]+)"/g, (tag, file) => {
  const source = images[file] ?? (inlineAssets[file] && embed(file, inlineAssets[file]));
  return source ? `src="${source}"` : tag;
});
html = html.replace('<script src="lesson.js"></script>', () => `<script>window.STORY_ART=${JSON.stringify(images)};</script><script>${read('lesson.js')}</script>`);
html = html.replace('<script src="assets/vendor/three.min.js"></script>', match =>
  `<!-- Three.js r160, MIT license\n${read('assets/vendor/LICENSE')}\n-->\n${match}`);
for (const file of ['assets/motion/motion.js', 'book.js', 'assets/vendor/three.min.js', 'world-art.js', 'world-craft.js', 'world-garden.js',
  'world-lighthouse.js', 'world-station.js', 'scene-3d.js', 'episodes.js', 'assets/audio.js', 'app.js']) {
  const type = file === 'assets/motion/motion.js' ? ' type="module"' : '';
  const script = read(file).replace(/<\/script/gi, '<\\/script');
  html = html.replace(`<script${type} src="${file}"></script>`, () => `<script${type}>${script}</script>`);
}
mkdirSync(new URL('dist/', import.meta.url), {recursive:true});
writeFileSync(new URL('dist/index.html', import.meta.url), html);
writeFileSync(new URL('../雾灯来信.html', import.meta.url), html);
console.log('Built self-contained HTML: dist/index.html and ../雾灯来信.html');
