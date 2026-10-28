// Local comparison against a user-downloaded TI model; proprietary model is not redistributed.
import fs from 'node:fs';import crypto from 'node:crypto';
import {Simulation} from 'eecircuit-engine';
import {DEFAULTS,measure} from '../src/core.mjs';import {runProposal} from '../src/spice-runner.mjs';
const filename=process.argv[2];if(!filename)throw Error('Usage: node scripts/reference-check.mjs /path/to/LM1117_N_3P3_TRANS.LIB');
const original=fs.readFileSync(filename);let model=original.toString('latin1');
if(!model.includes('.SUBCKT LM1117_N_3P3_TRANS'))throw Error('Unexpected reference model.');
// This WASM build lacks the PSpice TABLE compatibility device. Preserve the four
// published points using explicit linear segments; translate zero TC and switch syntax.
model=model.replace(/E_U1_E1[\s\S]*?\) \)\r?\n/,'B_U1_DROP U1_DROP 0 V=(V(LOAD)<0.1 ? 1+V(LOAD) : (V(LOAD)<0.5 ? 1.1+(V(LOAD)-0.1)*0.1 : (V(LOAD)<0.8 ? 1.14+(V(LOAD)-0.5)*0.133333333 : 1.18)))\n');
model=model.replace('VSWITCH Roff=10k Ron=160 Voff=0.0V Von=1.0V','SW(Roff=10k Ron=160 Vt=0.5 Vh=-0.5)').replaceAll('TC=0,0','');
model='.func IF(a,b,c) { a ? b : c }\n'+model;
const comparisons=[];
const cases=[3.8,5].flatMap(vin=>[100,400,800].map(load=>({vin,load})));
const approximations=[];
// Complete our engine runs before instantiating independent reference engines.
for(const {vin,load} of cases){const result=await runProposal({...DEFAULTS,vinMin:vin,vinMax:vin,load,cap:100,sensitivity:false},{component:'LM1117-3.3',cap:100});approximations.push(result.corners[0]);}
for(const [index,{vin,load}] of cases.entries()){
 const sim=new Simulation();await sim.start();
 const r={...DEFAULTS,vinMin:vin,vinMax:vin,load,cap:100,sensitivity:false};
 const netlist=`TI LM1117 reference comparison\n.control\nset ngbehavior=ps\n.endc\n${model}\nVinput in 0 ${vin}\nXreg in out 0 0 LM1117_N_3P3_TRANS\nResr out storage .08\nCout storage 0 100u\nIload out 0 PULSE(.04 ${load/1000} 1m 2u 2u 2m 4m)\n.save v(out) v(in) i(Vinput)\n.tran 2u 5m\n.end`;
 sim.setNetList(netlist);const vendor=measure(await sim.runSim());
 const own=approximations[index];
 comparisons.push({vin,loadMa:load,capUf:100,referencePlateauV:vendor.steady,approximationPlateauV:own.steady,absolutePlateauErrorV:Math.abs(vendor.steady-own.steady),referenceMinV:vendor.min,approximationMinV:own.min,referenceMaxV:vendor.max,approximationMaxV:own.max});
}
const maxError=Math.max(...comparisons.map(x=>x.absolutePlateauErrorV));
const report={generatedAt:new Date().toISOString(),source:'https://www.ti.com/lit/zip/snom488',model:'LM1117_N_3P3_TRANS, TI Final 1.1, 17MAR2015',originalModelSha256:crypto.createHash('sha256').update(original).digest('hex'),adapter:['PSpice TABLE to equivalent piecewise-linear expression at the four supplied points','PSpice VSWITCH to ngspice SW with Vt=0.5 and Vh=-0.5','Zero temperature-coefficient syntax removed; IF defined as ternary'],acceptance:{scope:'DC load plateau only, six listed input/load conditions with 100 µF output capacitor',absolutePlateauToleranceV:0.1,maximumObservedErrorV:maxError,pass:maxError<=0.1},comparisons,limitations:['Reference is an adapted manufacturer simulation model, not physical hardware','This check covers only LM1117 at the listed conditions; other candidates remain unvalidated behavioral models','Transient minima and maxima are reported but not claimed to match','Default dynamics sweep tests sensitivity to assumptions, not manufacturing distributions','No manufacturer endorsement or hardware qualification']};
fs.writeFileSync('docs/reference-comparison.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.acceptance));if(!report.acceptance.pass)process.exitCode=1;
