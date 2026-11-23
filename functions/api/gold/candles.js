// Read-only market data endpoint. Never return broker credentials to the browser.
const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const out=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers});
function normalize(candles){
 return (Array.isArray(candles)?candles:[]).filter(c=>c.complete===true && c.mid && c.time).map(c=>({
  time:Math.floor(Date.parse(c.time)/1000),open:Number(c.mid.o),high:Number(c.mid.h),
  low:Number(c.mid.l),close:Number(c.mid.c),volume:Number(c.volume||0)
 })).filter(c=>Number.isFinite(c.time)&&[c.open,c.high,c.low,c.close].every(Number.isFinite)).sort((a,b)=>a.time-b.time);
}
async function getCandles(base,token,frame){
 const url=new URL(base+'/v3/instruments/XAU_USD/candles');
 url.searchParams.set('granularity',frame);
 url.searchParams.set('count','480');
 url.searchParams.set('price','M');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);
 try{
  const res=await fetch(url.toString(),{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:controller.signal});
  if(!res.ok){let msg='OANDA HTTP '+res.status;try{const b=await res.json();msg=b.errorMessage||msg}catch{}throw new Error(msg)}
  const data=await res.json();return normalize(data.candles);
 }finally{clearTimeout(timer)}
}
export async function onRequestGet({request,env}){
 const token=env.OANDA_API_TOKEN;
 if(!token)return out({error:'Бодит ханшийн API тохируулаагүй. Demo горим сонгоно уу.',code:'NO_FEED'},503);
 const origin=new URL(request.url).origin;
 // No proxy URL can be supplied by the caller: prevent SSRF.
 const base=env.OANDA_ENV==='live'?'https://api-fxtrade.oanda.com':'https://api-fxpractice.oanda.com';
 try{
  const [m1,m5]=await Promise.all([getCandles(base,token,'M1'),getCandles(base,token,'M5')]);
  if(m1.length<80||m5.length<210)return out({error:'Анализ хийхэд хангалттай M1/M5 candle олдсонгүй.',code:'SHORT_DATA'},502);
  return out({source:'OANDA',mode:env.OANDA_ENV==='live'?'live':'practice',instrument:'XAU_USD',priceType:'mid',fetchedAt:new Date().toISOString(),m1,m5});
 }catch(e){return out({error:'OANDA өгөгдөл татахад алдаа гарлаа. API эрх, зах зээлийн хэрэгслийн хандалтаа шалгана уу.',detail:String(e.message||e).slice(0,180),code:'FEED_ERROR'},502)}
}
