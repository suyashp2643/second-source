import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const output='pages-dist';fs.mkdirSync(output,{recursive:true});
const files={'index.html':'src/index.html','app.mjs':'src/app.mjs','style.css':'src/style.css','src/core.mjs':'src/core.mjs','src/spice-runner.mjs':'src/spice-runner.mjs','src/spice-worker.mjs':'src/spice-worker.mjs','vendor/eecircuit/engine.mjs':'node_modules/eecircuit-engine/dist/eecircuit-engine.mjs'};
for(const [target,source]of Object.entries(files)){const file=path.join(output,target);fs.mkdirSync(path.dirname(file),{recursive:true});let bytes=fs.readFileSync(source);if(source==='src/spice-runner.mjs')bytes=Buffer.from(bytes.toString().replace("from 'eecircuit-engine'","from '../vendor/eecircuit/engine.mjs'"));fs.writeFileSync(file,bytes);if(bytes.length>25*1024*1024)throw Error(`${target} exceeds the Pages asset limit`)}
const core=fs.readFileSync('src/core.mjs','utf8').replaceAll('export ','');
const access=fs.readFileSync('src/access.mjs','utf8').replaceAll('export ','');
const server=fs.readFileSync('src/server.mjs','utf8').replace(/^import .*;\n/gm,'');
// Pages Functions advanced mode: static files stay outside the tiny API Worker.
const assets='const assets=null;\n';const worker=core+'\n'+access+'\n'+assets+server;
fs.writeFileSync(path.join(output,'_worker.js'),worker);
fs.writeFileSync(path.join(output,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2));
fs.writeFileSync(path.join(output,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'\n/app.mjs\n  Cache-Control: no-cache\n/src/*\n  Cache-Control: no-cache\n`);
if(zlib.gzipSync(worker).length>3*1024*1024)throw Error('Function exceeds free Worker script size');
console.log(`Pages build: ${Object.keys(files).length} static assets; API Worker ${(zlib.gzipSync(worker).length/1024).toFixed(1)} KiB gzip. Simulator is a separate static asset.`);
