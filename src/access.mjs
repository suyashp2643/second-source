// Shared provider credits fail closed unless both access control and durable quota exist.
export async function authorizeInference(req,env,body){
 const personal=typeof body.apiKey==='string'?body.apiKey.trim():'';
 if(personal)return {key:personal,source:'visitor_key'};
 if(!env.NEBIUS_API_KEY)return {error:'Connect a Nebius Token Factory API key to use the live agent.',status:428};
 if(!env.DEMO_ACCESS_CODE||!env.BUDGET_DB)return {error:'Shared inference is disabled until a demo access code and durable quota database are configured. You may use a session-only personal key.',status:503};
 const supplied=req.headers.get('x-demo-access')||'';
 const hash=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));
 const [a,b]=await Promise.all([hash(supplied),hash(env.DEMO_ACCESS_CODE)]);let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
 if(mismatch)return {error:'Enter the demo access code to use shared inference.',status:401};
 const day=new Date().toISOString().slice(0,10),limit=Number(env.DAILY_CALL_LIMIT||100);
 if(!Number.isInteger(limit)||limit<1||limit>1000)return {error:'Shared quota configuration is invalid.',status:503};
 try{
  const row=await env.BUDGET_DB.prepare('INSERT INTO inference_quota (scope, calls) VALUES (?, 1) ON CONFLICT(scope) DO UPDATE SET calls = calls + 1 WHERE calls < ? RETURNING calls').bind(day,limit).first();
  if(!row)return {error:'The shared daily inference budget has been reached. Offline mode remains available.',status:429};
 }catch{return {error:'Could not reserve shared inference quota. No provider call was made.',status:503}}
 return {key:env.NEBIUS_API_KEY,source:'shared_key'};
}
