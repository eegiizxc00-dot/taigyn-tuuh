import {json,currentUser} from '../../_shared.js';
export async function onRequestGet({request,env}) {
 const user=await currentUser(request,env);
 const {results=[]}=await env.DB.prepare(`SELECT s.id,s.slug,s.title,s.author_name,s.synopsis,s.cover_url,s.preview_text,s.price_mnt,
 CASE WHEN o.status='PAID' AND datetime(COALESCE(o.paid_at,u.unlocked_at), '+48 hours')>datetime('now') THEN 1 ELSE 0 END AS unlocked
 FROM stories s LEFT JOIN unlocks u ON u.story_id=s.id AND u.user_id=?
 LEFT JOIN orders o ON o.id=u.order_id AND o.user_id=u.user_id AND o.story_id=s.id
 WHERE s.published=1 ORDER BY s.created_at DESC`).bind(user?.id||'').all();
 return json({stories:results});
}
