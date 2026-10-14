import {json,currentUser} from '../../_shared.js';
export async function onRequestGet({request,env}) {
 const user=await currentUser(request,env);
 const {results=[]}=await env.DB.prepare(`SELECT s.id,s.slug,s.title,s.author_name,s.synopsis,s.cover_url,s.preview_text,s.price_mnt,
 CASE WHEN u.user_id IS NULL THEN 0 ELSE 1 END AS unlocked
 FROM stories s LEFT JOIN unlocks u ON u.story_id=s.id AND u.user_id=? WHERE s.published=1 ORDER BY s.created_at DESC`).bind(user?.id||'').all();
 return json({stories:results});
}
