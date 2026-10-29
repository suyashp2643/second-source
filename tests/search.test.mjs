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
