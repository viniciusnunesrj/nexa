// Read-only GET with the already-configured public key. Never logs credentials.
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
const env = parse(readFileSync('.env.local'));
const url = new URL(env.VITE_SUPABASE_URL);
if (url.origin !== 'https://udnphyrtmlszcznamepd.supabase.co') throw new Error('Unexpected project');
const key = env.VITE_SUPABASE_ANON_KEY;
const publicKey = key?.startsWith('sb_publishable_') || (() => {
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; }
  catch { return false; }
})();
if (!publicKey) throw new Error('A public key is required');
const response = await fetch(new URL('/rest/v1/operations?select=owner_id&limit=0', url), {
  method: 'GET', headers: { apikey:key, 'Accept-Profile':'star_system_private' },
  signal:AbortSignal.timeout(15000),
});
const body = await response.json();
console.log(JSON.stringify({status:response.status,code:body.code,message:body.message,
  privateSchemaExcluded:response.status===406 && body.code==='PGRST106'}));
