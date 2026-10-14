import {json,currentUser} from '../../_shared.js';
export async function onRequestGet({request,env}) { const user=await currentUser(request,env); return json({user:user?{id:user.id,email:user.email}:null}); }
