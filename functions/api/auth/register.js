
import {json,bodyJson,randomId,hashPassword,signSession,sessionCookie,currentUser} from '../../_shared.js';

export async function onRequestPost({request,env}) {
  if (!env.DB || !env.SESSION_SECRET) {
    return json({
      error: 'Server is not configured',
      diagnostics: {
        DB: Boolean(env.DB),
        SESSION_SECRET: Boolean(env.SESSION_SECRET)
      }
    }, 500);
  }

  const b = await bodyJson(request);
  const email = String(b?.email || '').trim().toLowerCase();
  const password = String(b?.password || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 7 || password.length > 128) {
    return json({error:'Имэйл хаягаа зөв оруулж, 7–128 тэмдэгттэй нууц үг сонгоно уу.'},400);
  }

  const {hash,salt} = await hashPassword(password);
  const guestSession = await currentUser(request,env);
  const guest = guestSession?.email?.endsWith('@guest.invalid')
    ? await env.DB.prepare('SELECT id,email FROM users WHERE id=? AND email=?').bind(guestSession.id,guestSession.email).first()
    : null;
  let id=guest?.id || randomId();

  try {
    if(guest){
      // Preserve active purchases by converting this guest identity in-place.
      const changed=await env.DB.prepare('UPDATE users SET email=?,password_hash=?,password_salt=? WHERE id=? AND email=?')
        .bind(email,hash,salt,guest.id,guest.email).run();
      if(!changed.meta?.changes)return json({error:'Зочин бүртгэлийг шинэчилж чадсангүй.'},409);
    }else{
      await env.DB.prepare('INSERT INTO users(id,email,password_hash,password_salt) VALUES(?,?,?,?)').bind(id,email,hash,salt).run();
    }
  } catch {
    return json({error:'Энэ имэйл бүртгэлтэй эсвэл бүртгэл үүсгэх боломжгүй байна.'},409);
  }

  const token = await signSession({id,email},env.SESSION_SECRET);

  return new Response(JSON.stringify({user:{id,email}}),{
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'Set-Cookie':sessionCookie(token,new URL(request.url).protocol==='https:')
    }
  });
}
