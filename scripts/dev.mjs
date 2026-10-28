import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
// Prefer the real Pages layout when built, including the deployed CSP. This
// catches asset-loading errors that an unrestricted local preview would hide.
const pages=fs.existsSync('pages-dist/_worker.js');
const mod=await import(pathToFileURL(process.cwd()+(pages?'/pages-dist/_worker.js':'/dist/server/index.js')).href);
const csp=pages?fs.readFileSync('pages-dist/_headers','utf8').match(/Content-Security-Policy: (.+)/)?.[1]:null;
const staticResponse=async request=>{
 const url=new URL(request.url);const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));const root=path.resolve('pages-dist'),file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()||name.startsWith('_'))return new Response('Not found',{status:404});
 const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.wasm')?'application/wasm':'application/javascript; charset=utf-8';
 return new Response(request.method==='HEAD'?null:fs.readFileSync(file),{headers:{'content-type':type,'cache-control':'no-cache',...(csp?{'content-security-policy':csp}:{})}});
};
const server=http.createServer(async(req,res)=>{try{let body='';for await(const x of req){body+=x;if(body.length>100000)throw Error('Request too large')};const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body?{body}: {})});const response=await mod.default.fetch(request,{...process.env,...(pages?{ASSETS:{fetch:staticResponse}}:{})});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){res.writeHead(500);res.end(e.message)}});
server.listen(Number(process.env.PORT||(process.argv.includes('--port')?process.argv[process.argv.indexOf('--port')+1]:3000)),'0.0.0.0',()=>console.log('Second Source development server ready'+(pages?' (Pages layout + CSP)':'')));
