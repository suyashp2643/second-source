export const VERSION='1.1.0';
export const PROFILES=[{id:'fast',tauUs:20,rout:0.04},{id:'nominal',tauUs:40,rout:0.08},{id:'slow',tauUs:80,rout:0.12}];
export const CATALOG=[
 {id:'LM1117-3.3',maker:'Texas Instruments',current:800,modelLimit:1200,vinMin:2.6,vinMax:15,dropout:1.3,minCap:10,iq:0.005,accuracy:3,source:'https://www.ti.com/lit/ds/symlink/lm1117.pdf',evidence:'800 mA output; up to 1.3 V dropout at rated load. 10 µF minimum tantalum output capacitor. Package and ESR requirements need review.',package:'SOT-223',color:'#bb8afd'},
 {id:'MCP1700-3302',maker:'Microchip',current:250,vinMin:2.3,vinMax:6,dropout:0.35,minCap:1,iq:0.000002,accuracy:2,source:'https://ww1.microchip.com/downloads/en/DeviceDoc/MCP1700-Data-Sheet-20001826F.pdf',evidence:'250 mA rated output; 350 mV maximum dropout at 250 mA for outputs above 2.5 V; 1 µF output capacitor.',package:'SOT-23',color:'#f4b860'},
 {id:'AP2112K-3.3',maker:'Diodes Incorporated',current:600,vinMin:2.5,vinMax:6,dropout:0.4,minCap:1,iq:0.000055,accuracy:1.5,source:'https://www.diodes.com/datasheet/download/AP2112.pdf',evidence:'600 mA rated output; 400 mV maximum dropout at 600 mA; 1 µF ceramic input/output capacitors. Enable and pinout require an adapter.',package:'SOT-25',color:'#49d9b0'}
];
export const DEFAULTS={vinMin:3.8,vinMax:5,load:400,idle:40,target:3.3,tolerance:5,ambient:35,maxJunction:125,theta:110,cap:10,esr:0.08,maxCap:220,allowCap:true,allowAdapter:true,objective:'balanced',sensitivity:true};
export function validateRequirements(raw){
 const r={...DEFAULTS,...raw};
 const ranges={vinMin:[2.5,15],vinMax:[2.5,15],load:[10,1200],idle:[1,1200],target:[3.3,3.3],tolerance:[1,15],ambient:[-20,100],maxJunction:[60,125],theta:[20,250],cap:[1,470],esr:[0.01,2],maxCap:[1,470]};
 for(const [k,[lo,hi]] of Object.entries(ranges)){if(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<lo||r[k]>hi)throw Error(`${k} must be between ${lo} and ${hi}`)}
 if(r.vinMin>r.vinMax)throw Error('Minimum input must not exceed maximum input.');
 if(r.idle>r.load)throw Error('Idle load must not exceed peak load.');
 if(r.cap>r.maxCap)throw Error('Existing capacitor exceeds the allowed capacitance ceiling.');
 if(typeof r.sensitivity!=='boolean')throw Error('Sensitivity setting must be boolean.');
 if(typeof r.allowCap!=='boolean'||typeof r.allowAdapter!=='boolean')throw Error('Change permissions must be boolean.');
 if(!['balanced','margin','minimal'].includes(r.objective))throw Error('Unknown objective.');
 return Object.fromEntries([...Object.keys(DEFAULTS)].map(k=>[k,r[k]]));
}
export function validateProposal(p,r){
 if(!p||!CATALOG.some(x=>x.id===p.component))throw Error('Agent selected a component outside the catalog.');
 if(typeof p.cap!=='number'||!Number.isFinite(p.cap)||p.cap<1||p.cap>r.maxCap)throw Error('Agent capacitor proposal is outside allowed bounds.');
 if(!r.allowCap&&p.cap!==r.cap)throw Error('Capacitor changes are locked.');
 if(!r.allowAdapter&&p.component!=='LM1117-3.3')throw Error('Package adaptation is locked.');
 return {component:p.component,cap:p.cap,reason:typeof p.reason==='string'?p.reason.slice(0,1800):'Candidate submitted for independent testing.'};
}
export function makeNetlist(r,p,vin,profile=PROFILES[1]){
 const c=CATALOG.find(x=>x.id===p.component);if(!c)throw Error('Unknown component');
 const amps=r.load/1000, idle=r.idle/1000, limit=(c.modelLimit??c.current)/1000;
 let drop=c.dropout*Math.min(1,amps/(c.current/1000));
 // LM1117 nominal dropout interpolation from TI SNOM488 model 1.1 table.
 if(c.id==='LM1117-3.3')drop=amps<0.1?1+amps:amps<0.5?1.1+(amps-0.1)*0.1:Math.min(1.18,1.14+(amps-0.5)*(0.04/0.3));
 return `Second Source | ${c.id} | ${vin}V corner\n* Simplified behavioral LDO, NOT a manufacturer transistor model.\n* Dropout approximation: TI reference curve for LM1117; linear endpoint scaling for others.\n* Loop response ${profile.tauUs}us and output resistance ${profile.rout}ohm: lab assumptions (${profile.id}).\n* Current clamp: TI reference 1.2 A for LM1117; rated-current approximation for other parts.\nVinput in 0 ${vin}\nBtarget demand 0 V=max(0,min(3.3,V(in)-${drop.toFixed(8)}))\nBerror error 0 V=max(0,min(${limit},(V(demand)-V(out))/${profile.rout}))\nRloop error drive 10000\nCloop drive 0 ${profile.tauUs/10}n\nBpass in out I=max(0,min(${limit},V(drive)))\nResr out storage ${r.esr}\nCout storage 0 ${p.cap}u\nRleak out 0 1000000\nVprofile profile 0 PULSE(${idle} ${amps} 1m 2u 2u 2m 4m)\nBload out 0 I=V(profile)*min(1,max(0,V(out)/0.2))\n.save v(out) v(in) i(Vinput)\n.options reltol=0.0001 abstol=1e-9\n.tran 2u 5m\n.end`;
}
export function measure(raw){
 if(raw.dataType!=='real')throw Error('Expected real SPICE trace.');
 const get=n=>raw.data.find(d=>d.name.toLowerCase()===n)?.values;
 const t=get('time'),v=get('v(out)'),i=get('i(vinput)');
 if(!t||!v||!i||t.length<100||t.length!==v.length||!t.every(Number.isFinite)||!v.every(Number.isFinite)||!i.every(Number.isFinite)||t.at(-1)<0.0049)throw Error('Simulation returned an incomplete or nonfinite trace.');
 const active=t.map((x,k)=>[x,v[k],Math.abs(i[k])]).filter(x=>x[0]>=0.0008&&x[0]<=0.0049);
 const steady=active.filter(x=>x[0]>=0.002&&x[0]<=0.0028);
 if(!steady.length)throw Error('Missing load plateau.');
 return {min:Math.min(...active.map(x=>x[1])),max:Math.max(...active.map(x=>x[1])),steady:steady.reduce((a,x)=>a+x[1],0)/steady.length,current:steady.reduce((a,x)=>a+x[2],0)/steady.length,points:t.length,trace:t.map((x,k)=>[x*1000,v[k]]).filter((_,k)=>k%5===0||k===t.length-1)};
}
export function evaluate(r,p,corners){
 const c=CATALOG.find(x=>x.id===p.component);
 const lo=r.target*(1-r.tolerance/100),hi=r.target*(1+r.tolerance/100);
 const min=Math.min(...corners.map(x=>x.min)), max=Math.max(...corners.map(x=>x.max));
 const power=Math.max(...corners.map(x=>Math.max(0,(x.vin-x.steady)*x.current+x.vin*c.iq)));
 const junction=r.ambient+power*r.theta;
 const checks=[
 {id:'rail',name:'Simulated rail envelope',pass:min>=lo&&max<=hi,actual:`${min.toFixed(3)}–${max.toFixed(3)} V`,limit:`${lo.toFixed(3)}–${hi.toFixed(3)} V`,kind:'SPICE'},
 {id:'current',name:'Rated output current',pass:r.load<=c.current,actual:`${r.load} mA`,limit:`≤ ${c.current} mA`,kind:'Datasheet'},
 {id:'input',name:'Input operating range',pass:r.vinMin>=c.vinMin&&r.vinMax<=c.vinMax,actual:`${r.vinMin}–${r.vinMax} V`,limit:`${c.vinMin}–${c.vinMax} V`,kind:'Datasheet'},
 {id:'thermal',name:'Estimated junction temperature',pass:junction<=r.maxJunction,actual:`${junction.toFixed(1)} °C`,limit:`≤ ${r.maxJunction} °C`,kind:'Estimate'},
 {id:'capacitor',name:'Minimum output capacitance',pass:p.cap>=c.minCap,actual:`${p.cap} µF`,limit:`≥ ${c.minCap} µF`,kind:'Datasheet'},
 {id:'accuracy',name:'Specified DC accuracy budget',pass:r.tolerance>=c.accuracy,actual:`±${c.accuracy}%`,limit:`±${r.tolerance}% budget`,kind:'Datasheet'}
 ];
 return {pass:checks.every(x=>x.pass),checks,min,max,power,junction,headroom:Math.min(min-lo,hi-max),failed:checks.filter(x=>!x.pass).map(x=>x.id)};
}
export function offlineProposal(r,history){
 // Explicit deterministic baseline, never presented as an AI agent.
 const options=CATALOG.filter(c=>r.allowAdapter||c.id==='LM1117-3.3');
 const caps=r.allowCap?[...new Set([r.cap,47,100,220].filter(x=>x>=r.cap&&x<=r.maxCap))]:[r.cap];
 const trials=options.flatMap(c=>caps.map(cap=>({component:c.id,cap})));
 const rank=p=>{const c=CATALOG.find(x=>x.id===p.component);return (r.load>c.current?10000:0)+(r.vinMin<c.vinMin||r.vinMax>c.vinMax?5000:0)+c.dropout*100+(r.objective==='margin'?-p.cap*0.01:p.cap*0.01)};
 trials.sort((a,b)=>rank(a)-rank(b));
 const next=trials.find(p=>!history.some(h=>h.proposal.component===p.component&&(h.proposal.cap===p.cap||h.evaluation?.failed.some(f=>['current','input','thermal','accuracy'].includes(f))||(h.evaluation?.failed.includes('rail')&&p.cap<=h.proposal.cap))));
 return next?{...next,reason:'Offline baseline: ranked catalog limits, then test supported capacitor values. No language model was called.'}:null;
}
export function recommendation(history,r){
 const passing=history.filter(h=>h.evaluation.pass);
 passing.sort((a,b)=>r.objective==='margin'?b.evaluation.headroom-a.evaluation.headroom:a.proposal.cap-b.proposal.cap);
 return passing[0]??null;
}
