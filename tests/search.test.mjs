import test from 'node:test';
import assert from 'node:assert/strict';
import {searchBudget,searchOutcome} from '../src/core.mjs';
test('budget counts replacement experiments and distinguishes search endings',()=>{
 const history=[{metadata:{role:'original'}},...Array.from({length:6},()=>({metadata:{role:'replacement'}}))];
 assert.equal(searchBudget(history).remainingReplacementProposals,0);
 assert.equal(searchOutcome(false,null,false),'search_budget_exhausted');
 assert.equal(searchOutcome(false,{reason:'thermal'},false),'agent_stopped');
 assert.equal(searchOutcome(false,null,true),'baseline_exhausted');
 assert.equal(searchOutcome(true,null,false),'replacement_found');
});

test('download recomputes budget from completed experiments even after a run error',async()=>{
 const {readFileSync}=await import('node:fs');const {runInNewContext}=await import('node:vm');
 const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
 const download=source.slice(source.indexOf('function download(){'),source.indexOf("$('#export').onclick"));let saved;
 const run={id:'test-run',status:'error',experiments:[{metadata:{role:'original'}},...Array.from({length:4},()=>({metadata:{role:'replacement'}}))],searchBudget:{usedReplacementProposals:0}};
 runInNewContext(download+';download();',{run,searchBudget,CATALOG:[],Blob,URL:{createObjectURL(blob){saved=blob;return 'blob:test'},revokeObjectURL(){}},document:{createElement(){return {click(){}}}},setTimeout(){}});
 const payload=JSON.parse(await saved.text());assert.equal(payload.status,'error');assert.equal(payload.searchBudget.usedReplacementProposals,4);assert.equal(payload.searchBudget.remainingReplacementProposals,2);
});
