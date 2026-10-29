import test from 'node:test';import assert from 'node:assert/strict';
import app from '../dist/server/index.js';import {DEFAULTS} from '../src/core.mjs';
const request=b=>new Request('https://second-source.test/api/plan',{method:'POST',headers:{'content-type':'application/json',origin:'https://second-source.test'},body:JSON.stringify(b)});
test('unconfigured live calls fail explicitly without fabricated proposals',async()=>{const response=await app.fetch(request({requirements:DEFAULTS}),{});assert.equal(response.status,428);assert((await response.json()).error.includes('API key'));});
test('cross-origin inference request is rejected',async()=>{const response=await app.fetch(new Request('https://second-source.test/api/plan',{method:'POST',headers:{origin:'https://other.test'},body:'{}'}),{});assert.equal(response.status,403)});
test('mocked Nebius contract preserves model and usage, validates proposals',async()=>{
 const old=globalThis.fetch;let captured;
 globalThis.fetch=async(url,init)=>{captured={url,body:JSON.parse(init.body)};return Response.json({id:'mock-request-id',choices:[{message:{content:JSON.stringify({component:'AP2112K-3.3',cap:100,reason:'Test larger capacitance after measured rail failure.',pass:true})}}],usage:{prompt_tokens:100,completion_tokens:30}})};
 try{const response=await app.fetch(request({requirements:DEFAULTS,apiKey:'test-placeholder-not-a-real-key'}),{});assert.equal(response.status,200);const data=await response.json();assert.equal(data.proposal.cap,100);assert.equal(data.proposal.pass,undefined);assert.equal(data.usage.completion_tokens,30);assert.equal(captured.url,'https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions');assert(captured.body.model.includes('nemotron'));assert(captured.body.messages[0].content.includes('cannot declare pass/fail'));
 const locked=await app.fetch(request({requirements:{...DEFAULTS,allowCap:false},apiKey:'test-placeholder-not-a-real-key'}),{});assert.equal(locked.status,400);assert((await locked.json()).error.includes('locked'));
 }finally{globalThis.fetch=old}
});
test('provider errors never trigger silent offline fallback',async()=>{const old=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:401});try{const response=await app.fetch(request({requirements:DEFAULTS,apiKey:'test-placeholder-not-a-real-key'}),{});assert.equal(response.status,502);const data=await response.json();assert(data.error.includes('401'));assert.equal(data.proposal,undefined)}finally{globalThis.fetch=old}});
test('assets and evidence hashing work',async()=>{const response=await app.fetch(new Request('https://second-source.test/'));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'text/html; charset=utf-8');const hash=await app.fetch(new Request('https://second-source.test/api/hash',{method:'POST',body:'abc'}));assert.equal((await hash.json()).hash,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')});

test('current screening excludes under-rated parts and blocks an invalid model proposal',async()=>{
 const old=globalThis.fetch;let payload;
 globalThis.fetch=async(url,init)=>{payload=JSON.parse(JSON.parse(init.body).messages[1].content);return Response.json({choices:[{message:{content:JSON.stringify({component:'MCP1700-3302',cap:10,reason:'Unsuitable mocked proposal'})}}]})};
 try{
  const response=await app.fetch(request({requirements:{...DEFAULTS,load:800},apiKey:'test-placeholder-not-a-real-key'}),{});
  assert.equal(response.status,400);assert.match((await response.json()).error,/blocked before simulation/);
  assert.deepEqual(payload.catalog.map(c=>c.id),['LM1117-3.3']);
  const ap=payload.excludedCatalogScreening.find(c=>c.component==='AP2112K-3.3');assert.equal(ap.eligible,false);assert(ap.regulatedThermalEstimateC>125);
 }finally{globalThis.fetch=old}
});

test('agent stop preserves provider provenance without fabricating a proposal',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({id:'provider-stop-id',choices:[{message:{content:JSON.stringify({stop:true,reason:'Current and thermal constraints exhaust the catalog.'})}}],usage:{prompt_tokens:120,completion_tokens:40}},{headers:{'x-request-id':'header-stop-id'}});
 try{
  const response=await app.fetch(request({requirements:{...DEFAULTS,load:800},apiKey:'test-placeholder-not-a-real-key'}),{});
  assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.stop,true);assert.equal(data.provider,'Nebius Token Factory');assert.equal(data.requestId,'header-stop-id');assert.equal(data.usage.completion_tokens,40);assert.match(data.model,/nemotron/);assert.match(data.reason,/thermal/);assert.equal(data.proposal,undefined);
 }finally{globalThis.fetch=old}
});
