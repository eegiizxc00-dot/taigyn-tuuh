import {json,bodyJson,currentUser,randomId,qpayToken} from '../../_shared.js';
export async function onRequestPost({request,env}) {
 const user=await currentUser(request,env); if(!user)return json({error:'Төлбөр хийхийн тулд нэвтэрнэ үү.'},401);
 if(!env.QPAY_CLIENT_ID||!env.QPAY_CLIENT_SECRET||!env.QPAY_INVOICE_CODE||!env.PUBLIC_BASE_URL)return json({error:'QPay тохиргоо дутуу байна.'},503);
 const b=await bodyJson(request); const slug=String(b?.slug||'');
 const story=await env.DB.prepare('SELECT id,title,price_mnt FROM stories WHERE slug=? AND published=1').bind(slug).first(); if(!story)return json({error:'Зохиол олдсонгүй.'},404);
 const already=await env.DB.prepare('SELECT 1 FROM unlocks WHERE user_id=? AND story_id=?').bind(user.id,story.id).first(); if(already)return json({alreadyUnlocked:true});
 const pending=await env.DB.prepare("SELECT id,qpay_invoice_id FROM orders WHERE user_id=? AND story_id=? AND status='PENDING' ORDER BY created_at DESC LIMIT 1").bind(user.id,story.id).first();
 if(pending?.qpay_invoice_id)return json({orderId:pending.id,invoiceId:pending.qpay_invoice_id,message:'Өмнөх төлбөрийн нэхэмжлэхээ үргэлжлүүлнэ үү.'});
 const orderId=randomId(), sender=`TT-${orderId.replaceAll('-','').slice(0,24)}`;
 await env.DB.prepare("INSERT INTO orders(id,user_id,story_id,amount_mnt,status,qpay_sender_invoice_no) VALUES(?,?,?,?,'PENDING',?)").bind(orderId,user.id,story.id,story.price_mnt,sender).run();
 try {
  const {token,base}=await qpayToken(env);
  const res=await fetch(`${base}/v2/invoice`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({invoice_code:env.QPAY_INVOICE_CODE,sender_invoice_no:sender,invoice_receiver_code:'terminal',invoice_description:`Тайгын Түүх - ${story.title}`,amount:story.price_mnt,callback_url:`${env.PUBLIC_BASE_URL.replace(/\/$/,'')}/api/payments/callback`})});
  const data=await res.json(); if(!res.ok||!data.invoice_id)throw new Error('QPay invoice creation failed');
  await env.DB.prepare('UPDATE orders SET qpay_invoice_id=? WHERE id=?').bind(data.invoice_id,orderId).run();
  return json({orderId,invoiceId:data.invoice_id,qrImage:data.qr_image||null,qrText:data.qr_text||null,urls:data.urls||[],amount:story.price_mnt,currency:'MNT'});
 } catch(e) { await env.DB.prepare("UPDATE orders SET status='FAILED' WHERE id=?").bind(orderId).run(); return json({error:'QPay нэхэмжлэх үүсгэж чадсангүй. Тохиргоогоо шалгана уу.'},502); }
}
