import {json,bodyJson,randomId,hashPassword,signSession,sessionCookie} from '../../_shared.js';
export async function onRequestPost({request,env}) {
  if(!env.DB || !env.SESSION_SECRET) return json({error:'Server is not configured'},500);
  const b=await bodyJson(request); const email=String(b?.email||'').trim().toLowerCase(); const password=String(b?.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10||password.length>128) return json({error:'Зөв имэйл, 10-аас дээш тэмдэгттэй нууц үг оруулна уу.'},400);
  const {hash,salt}=await hashPassword(password); const id=randomId();
  try { await env.DB.prepare('INSERT INTO users(id,email,password_hash,password_salt) VALUES(?,?,?,?)').bind(id,email,hash,salt).run(); }
  catch { return json({error:'Энэ имэйл бүртгэлтэй эсвэл бүртгэл үүсгэх боломжгүй байна.'},409); }
  const token=await signSession({id,email},env.SESSION_SECRET);
  return new Response(JSON.stringify({user:{id,email}}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','Set-Cookie':sessionCookie(token,new URL(request.url).protocol==='https:')}});
}
