import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULTS as FULL_DEFAULTS,validateRequirements,validateProposal,evaluate,offlineProposal,measure} from '../src/core.mjs';
import {runProposal} from '../src/spice-runner.mjs';
const DEFAULTS={...FULL_DEFAULTS,sensitivity:false};
test('requirements reject impossible ranges and malformed inputs',()=>{
 for(const patch of [{load:NaN},{vinMin:6,vinMax:5},{idle:500,load:400},{cap:470,maxCap:220},{allowCap:'true'},{target:5}])assert.throws(()=>validateRequirements({...DEFAULTS,...patch}));
});
test('agent cannot select unsupported parts or override locked changes',()=>{
 assert.throws(()=>validateProposal({component:'Invented-LDO',cap:10},DEFAULTS));
 assert.throws(()=>validateProposal({component:'AP2112K-3.3',cap:470},DEFAULTS));
 assert.throws(()=>validateProposal({component:'AP2112K-3.3',cap:100},{...DEFAULTS,allowCap:false}));
 assert.throws(()=>validateProposal({component:'AP2112K-3.3',cap:10},{...DEFAULTS,allowAdapter:false}));
});
test('incomplete simulator output cannot receive a verdict',()=>{
 assert.throws(()=>measure({dataType:'real',data:[]}));
});
test('SPICE regression: original fails; capacitor repair passes; changed requirements invalidate replacement',async()=>{
 const original=await runProposal(DEFAULTS,{component:'LM1117-3.3',cap:10});assert.equal(original.evaluation.pass,false);assert(original.evaluation.failed.includes('rail'));
 const undersizedCap=await runProposal(DEFAULTS,{component:'AP2112K-3.3',cap:10});assert.equal(undersizedCap.evaluation.pass,false);assert(undersizedCap.evaluation.failed.includes('rail'));
 const repaired=await runProposal(DEFAULTS,{component:'AP2112K-3.3',cap:100});assert.equal(repaired.evaluation.pass,true);assert.equal(repaired.corners.length,3);assert(repaired.corners.every(c=>c.points>1000&&c.log.length>0));
 const overloaded=await runProposal({...DEFAULTS,load:800},{component:'AP2112K-3.3',cap:100});assert.equal(overloaded.evaluation.pass,false);assert(overloaded.evaluation.failed.includes('current'));
 const hot=await runProposal({...DEFAULTS,ambient:85},{component:'AP2112K-3.3',cap:100});assert.equal(hot.evaluation.pass,false);assert(hot.evaluation.failed.includes('thermal'));
 const brownout=await runProposal({...DEFAULTS,vinMin:3.4,vinMax:4.2},{component:'AP2112K-3.3',cap:100});assert.equal(brownout.evaluation.pass,false);assert(brownout.evaluation.failed.includes('rail'));
 // Extra model-authored pass claims have no bearing on independently measured checks.
 const forged=evaluate({...DEFAULTS,load:800},{component:'AP2112K-3.3',cap:100,pass:true},repaired.corners);assert.equal(forged.pass,false);
 // A different, unpreset load is executed afresh and gives different measurements.
 const changed=await runProposal({...DEFAULTS,load:330,vinMin:3.95},{component:'AP2112K-3.3',cap:100});assert.notEqual(changed.evaluation.min,repaired.evaluation.min);assert.equal(changed.evaluation.pass,true);
});
test('offline baseline respects permissions and never repeats proposals',()=>{
 const r={...DEFAULTS,allowAdapter:false,allowCap:false},history=[{proposal:{component:'LM1117-3.3',cap:10}}];assert.equal(offlineProposal(r,history),null);
});
test('assumption sweep exposes the fragile repair and accepts a larger modeled capacitor',async()=>{
 const fragile=await runProposal(FULL_DEFAULTS,{component:'AP2112K-3.3',cap:100});assert.equal(fragile.corners.length,9);assert.equal(fragile.evaluation.pass,false);
 const stronger=await runProposal(FULL_DEFAULTS,{component:'AP2112K-3.3',cap:220});assert.equal(stronger.corners.length,9);assert.equal(stronger.evaluation.pass,true);assert.deepEqual([...new Set(stronger.corners.map(c=>c.profile))],['fast','nominal','slow']);
});
