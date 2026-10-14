const encoder = new TextEncoder();
export function json(data, status=200) { return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}); }
export async function bodyJson(request) { try { return await request.json(); } catch { return null; } }
export function randomId() { return crypto.randomUUID(); }
function toB64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function fromB64(s) { s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
export async function hashPassword(password, saltText) {
  const salt = saltText ? fromB64(saltText) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'}, key, 256);
  return {hash:toB64(bits), salt:toB64(salt)};
}
export async function signSession(user, secret) {
  const payload = toB64(encoder.encode(JSON.stringify({id:user.id,email:user.email,exp:Date.now()+7*24*60*60*1000})));
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const sig = toB64(await crypto.subtle.sign('HMAC',key,encoder.encode(payload)));
  return `${payload}.${sig}`;
}
export async function currentUser(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const token = cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith('tt_session='))?.slice('tt_session='.length);
  if (!token || !env.SESSION_SECRET) return null;
  const [payload,sig] = token.split('.'); if(!payload||!sig) return null;
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  try {
    const valid = await crypto.subtle.verify('HMAC',key,fromB64(sig),encoder.encode(payload)); if(!valid)return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64(payload)));
    if(data.exp < Date.now())return null;
    return data;
  } catch { return null; }
}
export function sessionCookie(token, secure=true) { return `tt_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure?'; Secure':''}`; }
export async function qpayToken(env) {
  const base = env.QPAY_BASE_URL || 'https://merchant.qpay.mn';
  const auth = btoa(`${env.QPAY_CLIENT_ID}:${env.QPAY_CLIENT_SECRET}`);
  const r = await fetch(`${base}/v2/auth/token`, {method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/json'}});
  const d = await r.json(); if(!r.ok || !d.access_token) throw new Error('QPay authentication failed');
  return {token:d.access_token,base};
}
