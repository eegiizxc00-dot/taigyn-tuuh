import {json,bodyJson,currentUser} from '../../_shared.js';
export async function onRequestPost({request,env}) {
 if(!env.DB)return json({error:'Database тохиргоо дутуу байна.'},503);
 const user=await currentUser(request,env);
 if(!user)return json({error:'Хэрэглэгчийн сесс олдсонгүй.'},401);
 const body=await bodyJson(request);
 const orderId=String(body?.orderId||'').trim();
 if(!orderId)return json({error:'Захиалгын дугаар шаардлагатай.'},400);
 const order=await env.DB.prepare('SELECT id,story_id,status,amount_mnt FROM orders WHERE id=? AND user_id=?').bind(orderId,user.id).first();
 if(!order)return json({error:'Захиалга олдсонгүй.'},404);
 const grant=await env.DB.prepare(`SELECT datetime(COALESCE(o.paid_at,u.unlocked_at), '+48 hours') AS expires_at
 FROM unlocks u JOIN orders o ON o.id=u.order_id AND o.user_id=u.user_id AND o.story_id=u.story_id
 WHERE u.user_id=? AND u.story_id=? AND o.status='PAID'
 AND datetime(COALESCE(o.paid_at,u.unlocked_at), '+48 hours')>datetime('now')`).bind(user.id,order.story_id).first();
 const expiresAt=grant?.expires_at?grant.expires_at.replace(' ','T')+'Z':null;
 return json({orderId:order.id,status:order.status,amount:order.amount_mnt,paid:order.status==='PAID',unlocked:Boolean(expiresAt),expiresAt});
}
