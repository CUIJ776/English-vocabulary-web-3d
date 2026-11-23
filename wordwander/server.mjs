import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const web = process.argv.includes('--web');
const root = fileURLToPath(new URL(web?'dist-web/':'dist/', import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png',
  '.woff2':'font/woff2','.ogg':'audio/ogg','.wav':'audio/wav'};
http.createServer(async (req,res) => {
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    const name=relative(root,path);
    if (!name || name==='..' || name.startsWith('..'+sep) || (!web && name!=='index.html')) {
      res.writeHead(404).end();
      return;
    }
    const content=await readFile(path);
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(content);
  } catch {
    res.writeHead(404).end('File not found. Build the selected version first.');
  }
}).listen(4173,'127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
