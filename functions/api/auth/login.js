import {json,bodyJson,hashPassword,signSession,sessionCookie} from '../../_shared.js';

export async function onRequestPost({request,env}) {
  if (!env.DB || !env.SESSION_SECRET) return json({error:'Серверийн DB эсвэл SESSION_SECRET тохируулаагүй байна.'},500);
  const b=await bodyJson(request);
  const email=String(b?.email||'').trim().toLowerCase();
  const password=String(b?.password||'');
  if (!email || !password) return json({error:'Имэйл, нууц үгээ оруулна уу.'},400);
  const user=await env.DB.prepare('SELECT id,email,password_hash,password_salt FROM users WHERE email=?').bind(email).first();
  if (!user) return json({error:'Имэйл эсвэл нууц үг буруу байна.'},401);
  const calculated=await hashPassword(password,user.password_salt);
  const a=calculated.hash, c=user.password_hash;
  let different=a.length ^ c.length;
  for(let i=0;i<Math.max(a.length,c.length);i++)different|=(a.charCodeAt(i)||0)^(c.charCodeAt(i)||0);
  if (different!==0) return json({error:'Имэйл эсвэл нууц үг буруу байна.'},401);
  const token=await signSession(user,env.SESSION_SECRET);
  return new Response(JSON.stringify({user:{id:user.id,email:user.email}}),{
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','Set-Cookie':sessionCookie(token,new URL(request.url).protocol==='https:')}
  });
}
