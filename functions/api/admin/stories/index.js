import {bodyJson,randomId} from '../../../_shared.js';
import {authorize,parseStory,json} from './_helpers.js';
export async function onRequestGet({request,env}){
 const auth=await authorize(request,env);if(auth.error)return auth.error;
 const {results=[]}=await env.DB.prepare('SELECT id,slug,title,author_name,synopsis,cover_url,preview_text,continuation_text,price_mnt,published,created_at FROM stories ORDER BY created_at DESC').all();
 return json({stories:results});
}
export async function onRequestPost({request,env}){
 const auth=await authorize(request,env);if(auth.error)return auth.error;
 const parsed=parseStory(await bodyJson(request));if(parsed.error)return json({error:parsed.error},400);
 const s=parsed.story,id=randomId();
 try{
 await env.DB.prepare('INSERT INTO stories(id,slug,title,author_name,synopsis,cover_url,preview_text,continuation_text,price_mnt,published) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,s.slug,s.title,s.author_name,s.synopsis,s.cover_url,s.preview_text,s.continuation_text,s.price_mnt,s.published).run();
 return json({id,success:true},201);
 }catch(e){return json({error:'Хадгалж чадсангүй. URL нэр давхардсан эсэхийг шалгана уу.'},409)}
}
