import {currentUser,json} from '../../../_shared.js';
export {json};
export async function authorize(request,env) {
  if(!env.DB || !env.SESSION_SECRET || !env.ADMIN_EMAIL) return {error:json({error:'Cloudflare DB, SESSION_SECRET, ADMIN_EMAIL тохируулах шаардлагатай.'},500)};
  const user=await currentUser(request,env);
  if(!user || user.email.toLowerCase()!==String(env.ADMIN_EMAIL).trim().toLowerCase()) return {error:json({error:'Админ эрх шаардлагатай. Нэвтэрнэ үү.'},403)};
  const found=await env.DB.prepare('SELECT id FROM users WHERE id=? AND email=?').bind(user.id,user.email).first();
  if(!found)return {error:json({error:'Админ эрх шаардлагатай.'},403)};
  return {user};
}
export function parseStory(b){
  if(!b || typeof b!=='object')return {error:'Өгөгдөл буруу байна.'};
  const s={
    title:String(b.title||'').trim(),slug:String(b.slug||'').trim().toLowerCase(),
    author_name:String(b.author_name||'Тайгын Түүх').trim(),synopsis:String(b.synopsis||'').trim(),
    cover_url:String(b.cover_url||'').trim(),preview_text:String(b.preview_text||'').trim(),
    continuation_text:String(b.continuation_text||'').trim(),price_mnt:Number(b.price_mnt),
    published:b.published===true||b.published===1?1:0
  };
  if(!s.title || s.title.length>180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug) || s.slug.length>120 || !s.preview_text || !s.continuation_text || !Number.isSafeInteger(s.price_mnt) || s.price_mnt<0 || s.author_name.length>180 || s.synopsis.length>500 || s.cover_url.length>2048 || (s.cover_url && !/^https:\/\//i.test(s.cover_url)))return {error:'Нэр, slug, текст, үнэ болон нүүр зургийн HTTPS URL-аа шалгана уу.'};
  return {story:s};
}
