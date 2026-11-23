const $=id=>document.getElementById(id);
const state={mode:'demo',frame:'M1',m1:[],m5:[],last:null,loading:false,updatedAt:null};
const fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
function ema(values,period){
 const result=Array(values.length).fill(null);
 if(values.length<period)return result;
 let sum=0;for(let i=0;i<period;i++)sum+=values[i];let prev=sum/period;result[period-1]=prev;
 const k=2/(period+1);for(let i=period;i<values.length;i++){prev=values[i]*k+prev*(1-k);result[i]=prev}return result;
}
function rsi(close,period=14){
 if(close.length<=period)return null;
 let gain=0,loss=0;for(let i=1;i<=period;i++){let delta=close[i]-close[i-1];gain+=Math.max(0,delta);loss+=Math.max(0,-delta)}
 gain/=period;loss/=period;
 for(let i=period+1;i<close.length;i++){const d=close[i]-close[i-1];gain=(gain*(period-1)+Math.max(d,0))/period;loss=(loss*(period-1)+Math.max(-d,0))/period}
 return loss===0?(gain===0?50:100):100-100/(1+gain/loss);
}
function atr(rows,n=14){
 if(rows.length<=n)return null;
 const values=[];for(let i=1;i<rows.length;i++){const a=rows[i],p=rows[i-1];values.push(Math.max(a.high-a.low,Math.abs(a.high-p.close),Math.abs(a.low-p.close)))}
 if(values.length<n)return null;let v=values.slice(0,n).reduce((a,b)=>a+b,0)/n;
 for(let i=n;i<values.length;i++)v=(v*(n-1)+values[i])/n;
 return v;
}
function evaluate(m1,m5){
 if(m1.length<80||m5.length<210)return {side:'WAIT',score:0,checks:[],message:'Индикатор тооцоход хангалттай өгөгдөл алга.',trend:'N/A',rsi:null,atr:null};
 const closes=m1.map(b=>b.close),close5=m5.map(b=>b.close),last=m1.at(-1);
 const e20=ema(closes,20).at(-1),e50=ema(closes,50).at(-1);
 const e50m5=ema(close5,50).at(-1),e200m5=ema(close5,200).at(-1);
 const momentum=rsi(closes),volatility=atr(m1);
 const trend=e50m5>e200m5?'BUY':e50m5<e200m5?'SELL':'WAIT';
 const aligned=trend==='BUY'?e20>e50:trend==='SELL'?e20<e50:false;
 const momentumPass=trend==='BUY'?momentum>=51&&momentum<=72:trend==='SELL'?momentum<=49&&momentum>=28:false;
 const previous=m1.slice(-14,-1),high=Math.max(...previous.map(x=>x.high)),low=Math.min(...previous.map(x=>x.low));
 const broke=trend==='BUY'?last.close>high:trend==='SELL'?last.close<low:false;
 const sweep=trend==='BUY'?previous.slice(-5).some(x=>x.low<Math.min(...previous.slice(0,8).map(z=>z.low))&&x.close>x.low):trend==='SELL'?previous.slice(-5).some(x=>x.high>Math.max(...previous.slice(0,8).map(z=>z.high))&&x.close<x.high):false;
 const candleBody=Math.abs(last.close-last.open),range=Math.max(.0001,last.high-last.low);
 const candlePass=trend==='BUY'?last.close>last.open&&candleBody/range>.35:trend==='SELL'?last.close<last.open&&candleBody/range>.35:false;
 const atrPct=volatility/last.close*100;
 const volPass=atrPct>=.008&&atrPct<=.6;
 const checks=[
  {label:'M5 EMA 50 / 200 тренд',pass:trend!=='WAIT',weight:20,detail:trend==='BUY'?'Өсөх':trend==='SELL'?'Буурах':'Тодорхойгүй'},
  {label:'M1 EMA 20 / 50 нийцэл',pass:aligned,weight:20},
  {label:'RSI 14 momentum',pass:momentumPass,weight:15,detail:fmt(momentum,1)},
  {label:'Сүүлийн 13 candle breakout',pass:broke,weight:20},
  {label:'Liquidity sweep шинж',pass:sweep,weight:10},
  {label:'Баталгаажуулах candle',pass:candlePass,weight:10},
  {label:'ATR volatility filter',pass:volPass,weight:5,detail:fmt(atrPct,3)+'%'}
 ];
 const score=checks.reduce((a,b)=>a+(b.pass?b.weight:0),0);
 const valid=score>=85&&aligned&&momentumPass&&(broke||sweep)&&candlePass&&volPass&&trend!=='WAIT';
 const side=valid?trend:'WAIT';
 let entry=null,sl=null,tp=null;
 if(side!=='WAIT'){
  entry=last.close;
  const stopDistance=Math.max(volatility*1.5,entry*.00015);
  sl=side==='BUY'?entry-stopDistance:entry+stopDistance;
  tp=side==='BUY'?entry+stopDistance*1.8:entry-stopDistance*1.8;
 }
 return {side,score,checks,trend,rsi:momentum,atr:volatility,entry,sl,tp,price:last.close,message:valid?'Туршилтын шалгуур бүрдлээ. Spread болон мэдээний эрсдэлийг шалгана уу.':'A+ нөхцөл бүрдээгүй. Арилжаа нээхгүй, WAIT.',e20,e50};
}
function demoRows(){
 // All prices below are synthetic, fixed generation using time-indexed arithmetic.
 const end=Math.floor(Date.now()/60000)-1;const start=end-1599;
 let last=3250;const rows=[];
 for(let i=0;i<1600;i++){
  const tick=start+i;const wave=Math.sin(tick*.091)*.38+Math.sin(tick*.019)*.75+Math.sin(tick*.33)*.12;
  const delta=wave*.20+Math.sin(tick*.43)*.18;
  const open=last,close=open+delta;
  const upper=.12+Math.abs(Math.sin(tick*.71))*.25,lower=.12+Math.abs(Math.cos(tick*.51))*.22;
  rows.push({time:tick*60,open,high:Math.max(open,close)+upper,low:Math.min(open,close)-lower,close,volume:80+Math.floor(35*Math.abs(Math.sin(tick*.21)))});
  last=close;
 }
 // 5-minute candles must be aggregated from the same synthetic M1 stream.
 const groups=new Map();
 for(const c of rows){const t=Math.floor(c.time/300)*300;let g=groups.get(t);if(!g){g={time:t,open:c.open,high:c.high,low:c.low,close:c.close,volume:0};groups.set(t,g)}
 g.high=Math.max(g.high,c.high);g.low=Math.min(g.low,c.low);g.close=c.close;g.volume+=c.volume}
 const m5=[...groups.values()].filter(c=>c.time+300<=Math.floor(Date.now()/60000)*60);
 return {m1:rows,m5,source:'SYNTHETIC',mode:'demo',priceType:'mid',fetchedAt:new Date().toISOString()};
}
function drawChart(rows){
 const canvas=$('chart'),rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 if(rect.width<20)return;
 canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
 const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
 const w=rect.width,h=rect.height;ctx.fillStyle='#0b1813';ctx.fillRect(0,0,w,h);
 const visible=rows.slice(-80);if(!visible.length)return;
 const pad={l:14,r:60,t:15,b:27};const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
 const min=Math.min(...visible.map(c=>c.low)),max=Math.max(...visible.map(c=>c.high)),extra=Math.max((max-min)*.08,.15),lower=min-extra,upper=max+extra;
 const y=v=>pad.t+(upper-v)/(upper-lower)*ph;
 ctx.font='11px system-ui';ctx.lineWidth=1;
 for(let i=0;i<=4;i++){let val=lower+(upper-lower)*i/4,yp=y(val);ctx.strokeStyle='#294337';ctx.beginPath();ctx.moveTo(pad.l,yp);ctx.lineTo(w-pad.r+4,yp);ctx.stroke();ctx.fillStyle='#9bab9c';ctx.fillText(fmt(val),w-pad.r+10,yp+4)}
 const step=pw/visible.length,body=Math.max(2,Math.min(10,step*.65));
 visible.forEach((c,i)=>{const x=pad.l+step*(i+.5),up=c.close>=c.open,colour=up?'#76c99b':'#e47d79';ctx.strokeStyle=colour;ctx.fillStyle=colour;ctx.beginPath();ctx.moveTo(x,y(c.high));ctx.lineTo(x,y(c.low));ctx.stroke();let top=y(Math.max(c.open,c.close)),bot=y(Math.min(c.open,c.close));ctx.fillRect(x-body/2,top,body,Math.max(1,bot-top))});
 const every=Math.max(1,Math.floor(visible.length/5));ctx.fillStyle='#94a697';visible.forEach((c,i)=>{if(i%every!==0)return;const dt=new Date(c.time*1000);const time=dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});ctx.fillText(time,pad.l+i*step,h-8)});
}
function render(){
 const m1=state.m1,m5=state.m5;
 if(!m1.length||!m5.length)return;
 const a=evaluate(m1,m5);state.last=a;
 $('price').textContent=fmt(m1.at(-1).close);$('priceNote').textContent=(state.mode==='demo'?'SYNTHETIC / DEMO':'OANDA / '+(state.feedMode||'practice').toUpperCase())+' · MID';
 $('score').textContent=a.score+' / 100';$('signal').textContent=a.side;
 $('signal').className='value '+(a.side==='BUY'?'bull':a.side==='SELL'?'bear':'neutral');
 $('signalNote').textContent=a.side==='WAIT'?'Нөхцөл дутуу':'Оношилгооны дохио';
 $('trend').textContent=a.trend==='BUY'?'BULLISH':a.trend==='SELL'?'BEARISH':'—';
 $('trend').className='value '+(a.trend==='BUY'?'bull':a.trend==='SELL'?'bear':'neutral');
 $('trendNote').textContent='M5 · EMA 50 / EMA 200';
 $('checks').replaceChildren();
 a.checks.forEach(c=>{const row=document.createElement('div');row.className='check';const label=document.createElement('span');label.textContent=c.label+(c.detail?' · '+c.detail:'');const marker=document.createElement('strong');marker.className='mark '+(c.pass?'yes':'no');marker.textContent=(c.pass?'✓':'×')+' '+c.weight+' оноо';row.append(label,marker);$('checks').append(row)});
 $('reason').textContent=a.message;
 $('reason').className='alert'+(a.side!=='WAIT'?' good':'');
 $('entry').textContent=fmt(a.entry);$('sl').textContent=fmt(a.sl);$('tp').textContent=fmt(a.tp);
 $('chartLabel').textContent=state.frame+' · 80 candle · UTC';
 drawChart(state.frame==='M1'?m1:m5);
 renderRisk();
 $('timestamp').textContent='Шинэчилсэн: '+new Date(state.updatedAt).toLocaleString('mn-MN',{hour:'2-digit',minute:'2-digit'})+(state.mode==='demo'?' · Зохиомол өгөгдөл':' · OANDA');
 $('feedPill').textContent=state.mode==='demo'?'DEMO':'OANDA';
}
function renderRisk(){
 const balance=Number($('balance').value),risk=Number($('riskPercent').value),a=state.last;
 if(!Number.isFinite(balance)||balance<=0||!Number.isFinite(risk)||risk<=0||risk>5){$('riskAmount').textContent='Дансны хэмжээ эерэг, эрсдэл 0–5% хооронд байна.';return}
 $('riskAmount').textContent='Нэг арилжаанд алдаж болох дээд хэмжээ: $'+fmt(balance*risk/100)+(a?.side==='WAIT'?' · Setup байхгүй: арилжаа нээхгүй.':' · Энэ нь stop loss баталгаатай биелнэ гэсэн үг биш.');
}
async function refresh(){
 if(state.loading)return;state.loading=true;$('refreshBtn').disabled=true;
 $('timestamp').textContent='Өгөгдөл ачаалж байна...';
 try{
  let result;
  if(state.mode==='demo'){result=demoRows()}
  else{
   const response=await fetch('/api/gold/candles',{cache:'no-store'});
   result=await response.json();
   if(!response.ok)throw new Error(result.error||'API алдаа');
   if(result.source!=='OANDA')throw new Error('Live өгөгдлийн эх үүсвэр баталгаажаагүй');
  }
  state.m1=result.m1;state.m5=result.m5;state.feedMode=result.mode;state.updatedAt=result.fetchedAt||new Date().toISOString();
  $('notice').className='alert'+(state.mode==='live'?' good':'');
  $('notice').textContent=state.mode==='demo'?'DEMO: бүх үнэ, график, дохио нь зохиомол. Бодит арилжаанд ашиглахгүй.':'OANDA '+result.mode.toUpperCase()+' ханш · MID candle · зөвхөн бүрэн хаагдсан candle-д тулгуурлан тооцлоо. Spread, slippage, эдийн засгийн мэдээг тусад нь шалгана уу.';
  render();
 }catch(e){
  state.m1=[];state.m5=[];state.last=null;
  $('feedPill').textContent='NO FEED';$('notice').className='alert error';
  $('notice').textContent=e.message+' Зохиомол өгөгдөл харуулахын тулд Demo сонгоно уу.';
  $('timestamp').textContent='Өгөгдөл татаж чадсангүй';$('price').textContent='—';$('signal').textContent='WAIT';$('score').textContent='— / 100';$('trend').textContent='—';$('checks').textContent='Өгөгдөл алга';$('reason').textContent='Бодит дохио гаргах боломжгүй';$('entry').textContent='—';$('sl').textContent='—';$('tp').textContent='—';drawChart([]);
 }finally{state.loading=false;$('refreshBtn').disabled=false}
}
function selectMode(mode){state.mode=mode;$('demoBtn').classList.toggle('active',mode==='demo');$('liveBtn').classList.toggle('active',mode==='live');refresh()}
function selectFrame(frame){state.frame=frame;$('m1Btn').classList.toggle('active',frame==='M1');$('m5Btn').classList.toggle('active',frame==='M5');render()}
$('demoBtn').onclick=()=>selectMode('demo');$('liveBtn').onclick=()=>selectMode('live');$('m1Btn').onclick=()=>selectFrame('M1');$('m5Btn').onclick=()=>selectFrame('M5');$('refreshBtn').onclick=refresh;
$('balance').oninput=renderRisk;$('riskPercent').oninput=renderRisk;
window.addEventListener('resize',()=>drawChart(state.frame==='M1'?state.m1:state.m5));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.mode==='live')refresh()});
setInterval(()=>{if(!document.hidden&&state.mode==='live')refresh()},60000);
refresh();
