import {json,currentUser} from '../../_shared.js';
import {authorize} from '../admin/stories/_helpers.js';

const CHUNK=240000, LIMIT=8*1024*1024;
const PARTS=['preview','paid'];
const validSlug=s=>typeof s==='string'&&s.length<=120&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
function encode(bytes){let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out)}
function decode(base64){return Uint8Array.from(atob(base64),c=>c.charCodeAt(0))}
function isMP3(b){return b.length>16&&((b[0]===73&&b[1]===68&&b[2]===51)||(b[0]===255&&(b[1]&224)===224))}
export async function onRequestPost({request,env,params}) {
 const auth=await authorize(request,env);if(auth.error)return auth.error;
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Хүсэлтийн эх сурвалж буруу.'},403);
 if(!validSlug(params.slug))return json({error:'URL нэр буруу.'},400);
 const story=await env.DB.prepare('SELECT id FROM stories WHERE slug=?').bind(params.slug).first();
 if(!story)return json({error:'Өгүүллэг олдсонгүй.'},404);
 let form;try{form=await request.formData()}catch{return json({error:'MP3 файл оруулна уу.'},400)}
 const uploads=[];
 for(const part of PARTS){
  const f=form.get(part);if(!f||typeof f==='string'||!f.size)continue;
  if(f.size>LIMIT)return json({error:'Нэг MP3 файл 8 MB-аас хэтрэхгүй байна.'},400);
  const bytes=new Uint8Array(await f.arrayBuffer());
  if(!isMP3(bytes))return json({error:'Зөвхөн MP3 файл оруулна уу.'},400);
  uploads.push({part,bytes});
 }
 if(!uploads.length)return json({error:'Аудио файл сонгоно уу.'},400);
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS story_audio_chunks (story_id TEXT NOT NULL, part TEXT NOT NULL, seq INTEGER NOT NULL, data TEXT NOT NULL, size INTEGER NOT NULL, PRIMARY KEY(story_id,part,seq))').run();
 const statements=[];
 for(const {part,bytes} of uploads){
  statements.push(env.DB.prepare('DELETE FROM story_audio_chunks WHERE story_id=? AND part=?').bind(story.id,part));
  for(let i=0,seq=0;i<bytes.length;i+=CHUNK,seq++){
   const chunk=bytes.subarray(i,i+CHUNK);
   statements.push(env.DB.prepare('INSERT INTO story_audio_chunks (story_id,part,seq,data,size) VALUES(?,?,?,?,?)').bind(story.id,part,seq,encode(chunk),chunk.length));
  }
 }
 await env.DB.batch(statements);
 return json({success:true,parts:uploads.map(u=>u.part)});
}
async function getAudio({request,env,params}) {
 if(!validSlug(params.slug))return json({error:'Өгүүллэг олдсонгүй.'},404);
 const part=new URL(request.url).searchParams.get('part')||'preview';
 if(!PARTS.includes(part))return json({error:'Аудио хэсэг буруу.'},400);
 const story=await env.DB.prepare('SELECT id FROM stories WHERE slug=? AND published=1').bind(params.slug).first();
 if(!story)return json({error:'Өгүүллэг олдсонгүй.'},404);
 if(part==='paid'){
  const user=await currentUser(request,env);
  if(!user)return json({error:'Үргэлжлэл түгжээтэй.'},403);
  const grant=await env.DB.prepare(`SELECT 1 AS allowed FROM unlocks u JOIN orders o ON o.id=u.order_id AND o.user_id=u.user_id AND o.story_id=u.story_id
   WHERE u.user_id=? AND u.story_id=? AND o.status='PAID'
   AND datetime(COALESCE(o.paid_at,u.unlocked_at), '+48 hours')>datetime('now')`).bind(user.id,story.id).first();
  if(!grant)return json({error:'Үргэлжлэл түгжээтэй эсвэл эрх дууссан.'},403);
 }
 let rows;try{({results:rows=[]}=await env.DB.prepare('SELECT seq,data,size FROM story_audio_chunks WHERE story_id=? AND part=? ORDER BY seq').bind(story.id,part).all())}catch{return json({error:'Аудио олдсонгүй.'},404)}
 if(!rows.length)return json({error:'Аудио олдсонгүй.'},404);
 const size=rows.reduce((n,r)=>n+Number(r.size),0);
 const headers={'Content-Type':'audio/mpeg','Cache-Control':'private, no-store','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Vary':'Cookie'};
 let start=0,end=size-1,status=200;
 const range=request.headers.get('Range');
 if(range){
  const m=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+size}});
  if(!m[1])start=Math.max(0,size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]))}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+size}});
  status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
 }
 headers['Content-Length']=String(end-start+1);
 if(request.method==='HEAD')return new Response(null,{status,headers});
 const bytes=new Uint8Array(end-start+1);let offset=0,written=0;
 for(const row of rows){const next=offset+Number(row.size);if(next>start&&offset<=end){
  const chunk=decode(row.data),lo=Math.max(0,start-offset),hi=Math.min(chunk.length,end-offset+1);
  const piece=chunk.subarray(lo,hi);bytes.set(piece,written);written+=piece.length;
 }offset=next;}
 if(written!==bytes.length)return json({error:'Аудио ачаалж чадсангүй.'},500);
 return new Response(bytes,{status,headers});
}
export const onRequestGet=getAudio;
export const onRequestHead=getAudio;
