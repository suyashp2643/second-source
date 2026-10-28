import {runProposal} from './spice-runner.mjs?v=1';
self.onmessage=async({data})=>{try{const result=await runProposal(data.requirements,data.proposal);postMessage({id:data.id,result})}catch(e){postMessage({id:data.id,error:e.message||String(e)})}};
