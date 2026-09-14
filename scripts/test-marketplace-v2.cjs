// Static PostgreSQL contract checks + tests of the actual frontend service.
// No database connection. These checks do not execute or prove PostgreSQL behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sql = fs.readFileSync('supabase/migrations/20260915010000_card_marketplace_v2.sql', 'utf8');
const context = fs.readFileSync('src/contexts/GameStateContext.tsx', 'utf8');
const check = (name, pattern) => { assert.match(sql, pattern, name); console.log('STATIC PASS:', name); };
check('CREATE/BUY own card, missing card rejected', /IF NOT FOUND THEN RAISE EXCEPTION 'Card missing';[\s\S]*?c.owner_id IS DISTINCT FROM seller_id/);
check('CREATE/BUY reject ACTIVE/EXHAUSTED/non-tradeable/synthesis', /c.state IS DISTINCT FROM 'FREE' OR c.card_status IS DISTINCT FROM 'FREE'[\s\S]*?c.tradeable IS DISTINCT FROM true[\s\S]*?c.synthesized_at IS NOT NULL[\s\S]*?c.last_accrual_at IS NOT NULL OR c.exhausted_at IS NOT NULL/);
check('CREATE requires IDLE', /c.status IS DISTINCT FROM 'IDLE'/);
check('CREATE price zero/negative/excessive/precision/NaN rejected', /p_price IS NULL OR NOT\(p_price>0 AND p_price<=1000000 AND p_price=round\(p_price,2\)\)/);
check('CREATE rejects duplicate active listing', /marketplace_listings WHERE item_id=c.id AND status='ACTIVE'\) THEN RAISE EXCEPTION/);
check('CREATE reservation unique per Card and listing', /card_id text PRIMARY KEY[\s\S]*?listing_id text NOT NULL UNIQUE/);
check('CREATE snapshot from actual row', /public.marketplace_card_snapshot_v2\(c\)\) RETURNING/);
check('BUY insufficient balance and autocompra', /IF u=seller_id THEN RAISE EXCEPTION[\s\S]*?buyer.balance_nxa<reservation.price/);
check('BUY/CANCEL reject SOLD/CANCELLED', /IF NOT FOUND OR l.status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION/);
check('BUY/CANCEL revalidate card, seller, price and reservation', /reservation.card_id IS DISTINCT FROM c.id OR reservation.seller_id IS DISTINCT FROM seller_id[\s\S]*?l.item_id IS DISTINCT FROM c.id OR l.seller_id IS DISTINCT FROM seller_id OR l.price IS DISTINCT FROM reservation.price[\s\S]*?c.status IS DISTINCT FROM 'LISTED'/);
check('BUY exact transfer owner predicate + row_count zero rejected', /WHERE id=l.item_id AND owner_id=l.seller_id AND status='LISTED'[\s\S]*?GET DIAGNOSTICS transferred=ROW_COUNT;\s*IF transferred<>1 THEN RAISE EXCEPTION/);
check('BUY debit/credit/fee server-side', /fee:=round\(reservation.price\*0.02,2\)[\s\S]*?balance_nxa=balance_nxa-reservation.price[\s\S]*?balance_nxa=balance_nxa\+reservation.price-fee/);
check('CANCEL owner only', /IF u<>seller_id THEN RAISE EXCEPTION 'Only seller can cancel'/);
check('CREATE/BUY/CANCEL replay stored original and compare intent', /PRIMARY KEY\(owner_id,request_id\)[\s\S]*?previous.intent IS DISTINCT FROM operation_intent[\s\S]*?RETURN previous.result/);
check('Persist response with operation intent', /INSERT INTO public.marketplace_operations_v2\(owner_id,request_id,intent,result\)/);
check('Private reservations deny direct writes', /REVOKE ALL ON public.marketplace_operations_v2,public.marketplace_reservations_v2 FROM PUBLIC,anon,authenticated/);
check('Guard reserved card from all writers', /CREATE TRIGGER guard_marketplace_card_v2 BEFORE UPDATE OR DELETE ON public.user_cards/);
check('Guard reserved listing against legacy update/reactivation', /CREATE TRIGGER guard_marketplace_listing_v2 BEFORE INSERT OR UPDATE OR DELETE ON public.marketplace_listings/);
check('Legacy listing rejected before balances', /Legacy, closed or unreserved listing is not eligible for v2/);
assert(!sql.includes('user_inventory_items'));
assert(!sql.includes('EXCEPTION WHEN'), 'No caught partial commit');
assert(!/REVOKE[^;]*buy_marketplace_listing_atomic/.test(sql));
assert(!/GRANT\s+(ALL|INSERT|UPDATE|DELETE)[^;]*authenticated/.test(sql));
const dispatcher = sql.split('CREATE OR REPLACE FUNCTION public.marketplace_operation_v2')[1].split('CREATE OR REPLACE FUNCTION')[0];
assert(dispatcher.indexOf('RETURN previous.result') < dispatcher.indexOf('UPDATE public.user_cards'));
assert(dispatcher.indexOf('IF transferred<>1') < dispatcher.indexOf('UPDATE public.profiles SET balance_nxa'));
const advisory = dispatcher.indexOf('pg_try_advisory_xact_lock');
const profiles = dispatcher.indexOf('FOR UPDATE NOWAIT');
const table = dispatcher.indexOf('LOCK TABLE public.user_cards IN ROW EXCLUSIVE MODE NOWAIT');
const card = dispatcher.indexOf('SELECT * INTO c FROM public.user_cards');
const listing = dispatcher.indexOf('SELECT * INTO l FROM public.marketplace_listings');
assert(advisory < profiles && profiles < table && table < card && card < listing);
assert(dispatcher.includes('ORDER BY id LOOP'));
assert(!/FOR UPDATE(?! NOWAIT)/.test(dispatcher));
for (const op of ['CREATE','BUY','CANCEL']) assert(context.includes(`executeOnlineMarketplace('${op}'`));
assert(!context.includes('buyMarketplaceListingAtomic'));
assert(!context.includes('SupabaseService.createListing'));
assert(!context.includes('SupabaseService.updateListing'));
assert(!context.includes('for (const c of existingCards) cardMap.set'));
console.log('STATIC PASS: locks fail fast, exact transfer before debit, no offline online fallthrough');

const source = fs.readFileSync('src/services/marketplaceOnlineService.ts','utf8');
const calls = [], storage = new Map();
let fault = null, storedResponse = null, mintCount = 0, nextId = 0, remoteCards = [], remoteListings = [];
const outcomes = new Map();
const supabase = {
 rpc: async (name,args) => {
  if (name === 'fetch_marketplace_listings_v2') {
   if (fault === 'refresh') { fault = null; return {error:{message:'refresh unavailable'}}; }
   return {data: remoteListings};
  }
  calls.push({name,args});
  assert([...storage.values()].includes(args.p_request_id), 'request ID must be persisted before RPC');
  const op = name.startsWith('create_') ? 'CREATE' : name.startsWith('buy_') ? 'BUY' : 'CANCEL';
  if (fault === 'reject') { fault = null; return {error:{message:'rejected'}}; }
  if (!outcomes.has(args.p_request_id)) { mintCount++; outcomes.set(args.p_request_id,{success:true,operation:op,card:{id:'historical-do-not-mint'}}); }
  storedResponse = outcomes.get(args.p_request_id);
  if (fault === 'timeout') { fault = null; throw new Error('timeout after commit'); }
  return {data: storedResponse};
 },
 from: name => ({select: () => ({eq: (_,id) => name === 'profiles'
   ? {single: async () => ({data:{id,balance_nxa:125}})} : Promise.resolve({data:remoteCards})})})
};
const moduleExports = {};
const cryptoMock = {
 randomUUID:()=>`request-${++nextId}`,
 getRandomValues:()=>{ throw new Error('randomUUID must be preferred when available'); }
};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports:moduleExports,
 require:id => {
  if (id === '../lib/supabase') return {supabase,isSupabaseConfigured:()=>true};
  if (id === './supabaseService') return {SupabaseService:{
   fetchRemoteProfile: async userId => ({id:userId,balance_nxa:125})
  }};
  if (id === '../lib/supabaseMappers') return {mapRowToCard:x=>x,mapRowToListing:x=>x,mapProfileToNexaUser:x=>x};
  throw new Error(id);
 },
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 crypto:cryptoMock
});
(async()=>{
 const service=moduleExports.MarketplaceOnlineService;
 const eligible={type:'Card',status:'IDLE',state:'FREE',cardStatus:'FREE',tradeable:true};
 assert(moduleExports.canSellOnlineCard(eligible));
 for(const delta of [{type:'Weapon'},{state:'ACTIVE'},{state:'EXHAUSTED'},{tradeable:false},{status:'LISTED'},{synthesizedAt:123}]) assert(!moduleExports.canSellOnlineCard({...eligible,...delta}));
 for(const price of [0,-1,1000001,NaN,Infinity,1.123,'200']) await assert.rejects(service.execute('buyer','CREATE','card',price));
 assert.equal(calls.length,0);
 for(const op of ['CREATE','BUY','CANCEL']) {
  fault='timeout'; const before=mintCount;
  await assert.rejects(service.execute('buyer',op,'subject',op==='CREATE'?123.45:undefined),/timeout/);
  const original=calls.at(-1);
  remoteCards=[];remoteListings=[];
  const state=await service.execute('buyer',op,'subject',op==='CREATE'?123.45:undefined);
  assert.equal(calls.at(-1).args.p_request_id,original.args.p_request_id);
  assert.equal(mintCount,before+1,'mock server receives same id; frontend does not request a second intent');
  assert.equal(state.cards.length,0,'historical RPC card must not resurrect inventory');
  assert.equal(state.listings.length,0);
  assert.equal(storage.size,0);
  assert.deepEqual(Object.keys(original.args).sort(),op==='CREATE'?['p_card_id','p_price','p_request_id']:['p_listing_id','p_request_id']);
 }
 fault='refresh';
 await assert.rejects(service.execute('buyer','BUY','refresh-case'),/refresh unavailable/);
 const token=calls.at(-1).args.p_request_id;
 await service.execute('buyer','BUY','refresh-case');
 assert.equal(calls.at(-1).args.p_request_id,token);
 fault='reject';
 await assert.rejects(service.execute('buyer','CANCEL','denied'),/rejected/);
 assert.equal(storage.size,1,'failure does not announce success or discard pending intent');
 delete cryptoMock.randomUUID;
 let randomValuesCalls = 0;
 cryptoMock.getRandomValues = bytes => {
  assert.equal(bytes.length,16);
  bytes.fill(255 - randomValuesCalls++);
  return bytes;
 };
 for (const op of ['CREATE','BUY','CANCEL']) {
  const before = randomValuesCalls;
  fault='timeout';
  await assert.rejects(service.execute('buyer',op,'lan',op==='CREATE'?123.45:undefined),/timeout/);
  const requestId = calls.at(-1).args.p_request_id;
  assert.match(requestId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  if (before === 0) assert.equal(requestId,'ffffffff-ffff-4fff-bfff-ffffffffffff');
  await service.execute('buyer',op,'lan',op==='CREATE'?123.45:undefined);
  assert.equal(calls.at(-1).args.p_request_id,requestId);
  assert.equal(randomValuesCalls,before+1,'retry must not generate another UUID');
 }
 delete cryptoMock.getRandomValues;
 const callsBefore = calls.length, storageBefore = storage.size;
 await assert.rejects(service.execute('buyer','CREATE','no-crypto',10),/Não foi possível gerar um request ID seguro/);
 assert.equal(calls.length,callsBefore,'no insecure request may reach RPC');
 assert.equal(storage.size,storageBefore,'no insecure request may be stored');
 console.log('PASS: native UUID preference, LAN UUID v4 fallback, persisted retries, no insecure fallback');
 console.log('PASS: frontend eligibility, finite prices, minimal RPC args, CREATE/BUY/CANCEL timeout retry, refresh retry, empty authoritative inventory, error propagation');
 console.log('PostgreSQL execution/concurrency: NOT RUN (static review only).');
})().catch(err=>{console.error(err);process.exitCode=1;});
