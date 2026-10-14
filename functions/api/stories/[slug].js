import {json,currentUser} from '../../_shared.js';
export async function onRequestGet({request,env,params}) {
 const user=await currentUser(request,env); const s=await env.DB.prepare('SELECT id,slug,title,author_name,synopsis,cover_url,preview_text,continuation_text,price_mnt FROM stories WHERE slug=? AND published=1').bind(params.slug).first();
 if(!s)return json({error:'Зохиол олдсонгүй.'},404);
 let unlocked=false; if(user) unlocked=!!(await env.DB.prepare('SELECT 1 FROM unlocks WHERE user_id=? AND story_id=?').bind(user.id,s.id).first());
 const {continuation_text,...publicStory}=s;
 return json({story:{...publicStory,unlocked,continuation:unlocked?continuation_text:null}});
}
