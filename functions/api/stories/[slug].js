import {json,currentUser} from '../../_shared.js';
import {wisdomStory} from '../../_wisdom.js';
export async function onRequestGet({request,env,params}) {
 if(params.slug===wisdomStory.slug)return json({story:wisdomStory});
 const user=await currentUser(request,env);
 const s=await env.DB.prepare('SELECT id,slug,title,author_name,synopsis,cover_url,preview_text,continuation_text,price_mnt FROM stories WHERE slug=? AND published=1').bind(params.slug).first();
 if(!s)return json({error:'Зохиол олдсонгүй.'},404);
 let expiresAt=null;
 if(user) {
  const grant=await env.DB.prepare(`SELECT datetime(COALESCE(o.paid_at,u.unlocked_at), '+48 hours') AS expires_at
   FROM unlocks u JOIN orders o ON o.id=u.order_id AND o.user_id=u.user_id AND o.story_id=u.story_id
   WHERE u.user_id=? AND u.story_id=? AND o.status='PAID'
   AND datetime(COALESCE(o.paid_at,u.unlocked_at), '+48 hours')>datetime('now')`).bind(user.id,s.id).first();
  expiresAt=grant?.expires_at?grant.expires_at.replace(' ','T')+'Z':null;
 }
 const unlocked=Boolean(expiresAt);
 const {continuation_text,...publicStory}=s;
 return json({story:{...publicStory,unlocked,expiresAt,continuation:unlocked?continuation_text:null}});
}
