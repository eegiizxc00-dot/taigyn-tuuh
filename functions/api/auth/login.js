import {json,bodyJson,hashPassword,signSession,sessionCookie} from '../../_shared.js';
export async function onRequestPost({request,env}) {
  const b=await bodyJson(request); const email=String(b?.email||'').trim().toLowerCase(); const password=String(b?.password||'');
  const u=await env.db.prepare('SELECT id,email,password_hash,password_salt FROM users WHERE email=?').bind(email).first();
  if(!u) return json({error:'Имэйл эсвэл нууц үг буруу байна.'},401);
  const check=await hashPassword(password,u.password_salt);
  if(check.hash!==u.password_hash) return json({error:'Имэйл эсвэл нууц үг буруу байна.'},401);
  const token=await signSession({id:u.id,email:u.email},env.SESSION_SECRET);
  return new Response(JSON.stringify({user:{id:u.id,email:u.email}}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','Set-Cookie':sessionCookie(token,new URL(request.url).protocol==='https:')}});
}
