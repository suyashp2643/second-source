import {Simulation} from 'eecircuit-engine';
import {PROFILES,makeNetlist,measure,evaluate,validateProposal,validateRequirements} from './core.mjs?v=1';
let sim;
export async function runProposal(input,proposal){
 const r=validateRequirements(input),p=validateProposal(proposal,r);if(!sim){sim=new Simulation();await sim.start()}
 const corners=[];
 const profiles=r.sensitivity?PROFILES:[PROFILES[1]];
 for(const profile of profiles)for(const vin of [...new Set([r.vinMin,(r.vinMin+r.vinMax)/2,r.vinMax])]){
 const netlist=makeNetlist(r,p,vin,profile);sim.setNetList(netlist);const raw=await sim.runSim();
 corners.push({vin,profile:profile.id,...measure(raw),netlist,log:sim.getInfo(),errors:sim.getError(),header:raw.header});
 }
 return {proposal:p,corners,evaluation:evaluate(r,p,corners)};
}
