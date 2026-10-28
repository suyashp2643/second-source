import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const root=process.cwd();const files={'/index.html':'src/index.html','/app.mjs':'src/app.mjs','/style.css':'src/style.css','/src/core.mjs':'src/core.mjs','/src/spice-runner.mjs':'src/spice-runner.mjs','/src/spice-worker.mjs':'src/spice-worker.mjs','/vendor/eecircuit/engine.mjs':'node_modules/eecircuit-engine/dist/eecircuit-engine.mjs'};
const assets={};for(const [route,file]of Object.entries(files)){let bytes=fs.readFileSync(file);if(file==='src/spice-runner.mjs')bytes=Buffer.from(bytes.toString().replace("from 'eecircuit-engine'","from '../vendor/eecircuit/engine.mjs'"));assets[route]={body:zlib.gzipSync(bytes,{level:9}).toString('base64'),type:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'}}
let core=fs.readFileSync('src/core.mjs','utf8').replaceAll('export ','');
let server=fs.readFileSync('src/server.mjs','utf8').replace(/^import .*;\n/gm,'');
const access=fs.readFileSync('src/access.mjs','utf8').replaceAll('export ','');
const bundle=core+'\n'+access+'\nconst assets='+JSON.stringify(assets)+';\n'+server;
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});fs.writeFileSync('dist/server/index.js',bundle);if(fs.existsSync('.openai/hosting.json'))fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');else fs.writeFileSync('dist/.openai/hosting.json','{}');
console.log(`Built Worker: ${(Buffer.byteLength(bundle)/1e6).toFixed(2)} MB; compressed ${(zlib.gzipSync(bundle).length/1e6).toFixed(2)} MB`);
