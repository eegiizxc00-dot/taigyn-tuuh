import {bodyJson} from '../../../_shared.js';
import {authorize,parseStory,json} from './_helpers.js';
export async function onRequestPut({request,env,params}){
 const auth=await authorize(request,env);if(auth.error)return auth.error;
 const parsed=parseStory(await bodyJson(request));if(parsed.error)return json({error:parsed.error},400);
 const s=parsed.story;
 try{
 const result=await env.DB.prepare('UPDATE stories SET slug=?,title=?,author_name=?,synopsis=?,cover_url=?,preview_text=?,continuation_text=?,price_mnt=?,published=? WHERE id=?').bind(s.slug,s.title,s.author_name,s.synopsis,s.cover_url,s.preview_text,s.continuation_text,s.price_mnt,s.published,params.id).run();
 if(!result.meta?.changes)return json({error:'Өгүүллэг олдсонгүй.'},404);
 return json({success:true});
 }catch(e){return json({error:'Засаж чадсангүй. URL нэр давхардсан эсэхийг шалгана уу.'},409)}
}
export async function onRequestDelete({request,env,params}){
 const auth=await authorize(request,env);if(auth.error)return auth.error;
 try{
 const result=await env.DB.prepare('DELETE FROM stories WHERE id=?').bind(params.id).run();
 if(!result.meta?.changes)return json({error:'Өгүүллэг олдсонгүй.'},404);
 return json({success:true});
 }catch(e){return json({error:'Энэ өгүүллэгтэй төлбөрийн түүх холбоотой байна. Устгахын оронд нийтлэлээс нууна уу.'},409)}
}
