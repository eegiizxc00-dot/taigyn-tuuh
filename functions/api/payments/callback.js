import {json,bodyJson,qpayToken} from '../../_shared.js';
export async function onRequestPost({request,env}) {
 const b=await bodyJson(request); const invoiceId=String(b?.invoice_id||b?.object_id||'');
 if(!invoiceId)return json({ok:true,ignored:true});
 const order=await env.DB.prepare('SELECT id,user_id,story_id,amount_mnt,status,qpay_invoice_id FROM orders WHERE qpay_invoice_id=?').bind(invoiceId).first();
 if(!order||order.status==='PAID')return json({ok:true});
 try {
  const {token,base}=await qpayToken(env);
  const res=await fetch(`${base}/v2/payment/check`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({object_type:'INVOICE',object_id:invoiceId})});
  const data=await res.json(); if(!res.ok)return json({error:'Payment verification failed'},502);
  const paid=Number(data.paid_amount||0); const rows=Array.isArray(data.rows)?data.rows:[];
  const matching=rows.find(r=>r.payment_status==='PAID' && Number(r.payment_amount||0)>=order.amount_mnt);
  if(paid>=order.amount_mnt && matching) {
   // Atomic/idempotent: only one unlock row per user/story.
   await env.DB.batch([
    env.DB.prepare("UPDATE orders SET status='PAID',qpay_payment_id=?,paid_at=datetime('now') WHERE id=? AND status='PENDING'").bind(String(matching.payment_id||''),order.id),
    env.DB.prepare('INSERT OR IGNORE INTO unlocks(user_id,story_id,order_id) VALUES(?,?,?)').bind(order.user_id,order.story_id,order.id)
   ]);
  }
  return json({ok:true});
 } catch { return json({error:'Callback processing failed'},500); }
}
