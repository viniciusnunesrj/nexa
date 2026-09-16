// Actual service/context tests with mocked transport + static SQL checks.
// No SQL is executed here. Real database assertions: supabase/tests/trade_offers_v2.sql.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sql = fs.readFileSync('supabase/migrations/20260919010000_trade_offers_v2.sql','utf8');
const context = fs.readFileSync('src/contexts/GameStateContext.tsx','utf8');
const check = (label, pattern) => { assert.match(sql,pattern,label); console.log('STATIC PASS:',label); };
check('transaction encloses preflight and all new objects', /BEGIN;[\s\S]*DO \$preflight\$[\s\S]*COMMIT;\s*$/);
check('conflicts abort without silent overwrite', /Unexpected existing P2P function/);
check('auth and isolation', /v_uid text := auth.uid\(\)::text[\s\S]*IF v_uid IS NULL THEN RAISE[\s\S]*transaction_isolation[^\n]*read committed/);
check('self offer rejected', /p_receiver_id IS NULL OR p_receiver_id=v_uid THEN RAISE/);
check('duplicate IDs rejected across both sides', /cardinality\(v_all\)<>\(SELECT count\(DISTINCT x\)/);
check('official ownership', /v_card.owner_id IS DISTINCT FROM v_owner THEN RAISE/);
check('unavailable cards + marketplace rejected', /v_card.state IS DISTINCT FROM 'FREE'[\s\S]*v_card.card_status IS DISTINCT FROM 'FREE'[\s\S]*v_card.tradeable IS DISTINCT FROM true[\s\S]*marketplace_reservations_v2 WHERE card_id=v_id[\s\S]*marketplace_listings WHERE item_id=v_id AND status='ACTIVE'/);
check('recipient accept/reject and sender cancel', /p_operation IN \('ACCEPT','REJECT'\) AND v_uid<>v_offer.receiver_id[\s\S]*p_operation='CANCEL' AND v_uid<>v_offer.sender_id/);
check('double accept, cancelled, rejected and expiry blocked', /v_offer.status<>'PENDING' THEN RAISE[\s\S]*v_offer.expires_at<=now\(\) THEN RAISE/);
check('balances validated without receiver balance oracle on CREATE', /p_operation='ACCEPT' AND \(v_receiver.balance_nxa IS NULL[\s\S]*v_receiver.balance_nxa<v_offer.requested_nxa/);
check('ownership updated from official names', /v_name:=CASE WHEN v_target=v_receiver.id THEN v_receiver.username ELSE v_sender.username END[\s\S]*SET owner_id=v_target,owner_name=v_name[\s\S]*GET DIAGNOSTICS v_changed=ROW_COUNT/);
check('sender debit and receiver credit', /balance_nxa=balance_nxa-v_offer.offered_nxa\+v_offer.requested_nxa[\s\S]*balance_nxa=balance_nxa-v_offer.requested_nxa\+v_offer.offered_nxa/);
check('persistent request dedup and intent mismatch', /PRIMARY KEY\(user_id,request_id\)[\s\S]*v_previous.intent IS DISTINCT FROM v_intent[\s\S]*RETURN v_previous.result/);
check('participant privacy in RLS', /FOR SELECT TO authenticated\s+USING \(auth.uid\(\)::text IN \(sender_id,receiver_id\)\)/);
check('participant privacy in listing', /FROM public.trade_offers_v2 t WHERE auth.uid\(\)::text IN \(t.sender_id,t.receiver_id\)/);
check('anonymous execution revoked', /FROM PUBLIC,anon,authenticated,service_role;[\s\S]*GRANT EXECUTE/);
assert(!/CREATE OR REPLACE|DROP |EXCEPTION WHEN/.test(sql));
assert(!/UPDATE public\.(user_cards|profiles)[\s\S]*?EXCEPTION WHEN/.test(sql));
const body = sql.split('CREATE FUNCTION public.trade_operation_v2')[1].split('CREATE FUNCTION public.create_trade_offer_v2')[0];
const indices = ['pg_try_advisory_xact_lock','FROM public.trade_offers_v2 WHERE id=p_offer_id',
  'PERFORM 1 FROM public.profiles','LOCK TABLE public.user_cards IN ROW EXCLUSIVE MODE NOWAIT',
  'SELECT * INTO v_card FROM public.user_cards','UPDATE public.user_cards SET owner_id',
  'UPDATE public.profiles SET balance_nxa','INSERT INTO public.transactions',"SET status='ACCEPTED'",'INSERT INTO public.trade_requests_v2'].map(x=>body.indexOf(x));
assert(indices.every((n,i)=>n>=0 && (!i || n>indices[i-1])), 'locks, transfers, balances, ledger, terminal status, receipt');
assert(!/FOR UPDATE(?! NOWAIT)/.test(body));
assert.match(body,/ORDER BY x COLLATE "C"/);
assert(!/profiles\.\*|SELECT.*email/.test(sql));
for(const op of ['CREATE','ACCEPT','REJECT','CANCEL']) assert(context.includes(`executeOnlineTrade('${op}'`));
assert.match(context,/if \(!isSupabaseConfigured\(\)\) localStorage.setItem\(TRADES_KEY/);
assert.match(context,/const \[trades, setTrades\][\s\S]*?if \(isSupabaseConfigured\(\)\) return \[\]/);
assert.match(context,/tradeOwnerId !== currentUser\?\.id \? \[\] : trades/);
console.log('STATIC PASS: lock order, fail-fast compatibility, server ledger, no optimistic online fallthrough');

const storage = new Map(), calls = [], responses = new Map();
let session = 'sender', fault = null, confirmedCount = 0, nextId = 0, sessionCalls = 0;
let rows = [], cards = [], profile = {id:'sender',balanceNXA:71}, ledger = [];
const supabase = {
  auth: { getUser: async () => { sessionCalls++; return { data: {user:session ? {id:session} : null} }; } },
  rpc: async (name,args) => {
    calls.push({name,args});
    if(name==='fetch_my_trade_offers_v2') return fault==='read' ? {error:{message:'read failed'}} : {data:rows};
    if(name==='fetch_trade_cards_v2') return {data:cards};
    assert([...storage.values()].includes(args.p_request_id),'persist before RPC');
    if(fault==='reject') { fault=null; return {error:{message:'server rejected'}}; }
    const operation = name.split('_')[0].toUpperCase();
    if(!responses.has(args.p_request_id)) {
      confirmedCount++;
      responses.set(args.p_request_id,{success:true,operation,offer_id:'offer-1',card:'obsolete-snapshot'});
    }
    if(fault==='timeout') { fault=null; throw new Error('timeout after commit'); }
    if(fault==='switch') { fault=null; session='third'; }
    return {data:responses.get(args.p_request_id)};
  },
  from: table => ({ select(){return this},eq(){return this},order(){return this},limit(){return this},
    then(resolve,reject){return Promise.resolve({data:table==='user_cards'?cards:ledger}).then(resolve,reject)} }),
};
const api = { randomUUID:()=>`request-${++nextId}`, getRandomValues:b=>{b.fill(7);return b} };
const sandbox = {exports:{},console,Uint8Array,crypto:api,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  require:name=>{
    if(name==='../lib/supabase') return {supabase,isSupabaseConfigured:()=>true};
    if(name==='../lib/supabaseMappers') return {mapRowToCard:r=>({...r,type:'Card'}),mapRowToLedgerEntry:r=>r};
    if(name==='./supabaseService') return {SupabaseService:{fetchRemoteProfile:async()=>profile}};
    throw new Error('Unexpected import '+name);
  },
};
const source = fs.readFileSync('src/services/tradeOnlineService.ts','utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
const service = sandbox.exports.TradeOnlineService;
const input = {receiverId:'receiver',offeredItemIds:['a'],requestedItemIds:['b'],offeredNXA:10,requestedNXA:2};
async function rejects(p,pattern){await assert.rejects(p,pattern)}
async function run() {
  session=null;
  await rejects(service.execute('sender','CREATE',input),/Sessão/);
  assert.equal(calls.length,0,'no fallback user RPC');
  session='sender';
  await rejects(service.execute('sender','CREATE',{...input,receiverId:'sender'}),/inválida/);
  await rejects(service.execute('sender','CREATE',{...input,requestedItemIds:['a']}),/duplicadas/);
  for(const n of [-1,NaN,Infinity,0.25,1000001]) await rejects(service.execute('sender','CREATE',{...input,offeredNXA:n}),/inválida/);
  fault='reject';
  await rejects(service.execute('sender','CREATE',input),/server rejected/);
  assert.equal(confirmedCount,0);
  fault='timeout';
  await rejects(service.execute('sender','CREATE',input),/timeout/);
  const firstId=calls.filter(c=>c.name==='create_trade_offer_v2')[0].args.p_request_id;
  assert.equal(confirmedCount,1);
  const state = await service.execute('sender','CREATE',input);
  assert.equal(confirmedCount,1,'retry reuses server receipt');
  assert.equal(state.profile.balanceNXA,71,'only confirmed remote balance returned');
  assert.equal(state.cards.length,0,'receipt card ignored');
  const creates=calls.filter(c=>c.name==='create_trade_offer_v2');
  assert(creates.every(c=>c.args.p_request_id===firstId));
  assert(!Object.keys(creates[0].args).some(k=>/sender|user|snapshot|rarity|balance/.test(k)));
  assert.equal(storage.size,0);
  for(const operation of ['ACCEPT','REJECT','CANCEL']) {
    fault='reject'; await rejects(service.execute('sender',operation,'offer-1'),/server rejected/);
    await service.execute('sender',operation,'offer-1');
  }
  fault='read';
  await rejects(service.execute('sender','ACCEPT','offer-refresh'),/read failed/);
  const before=confirmedCount;
  fault=null; await service.execute('sender','ACCEPT','offer-refresh');
  assert.equal(confirmedCount,before,'failed refresh retains retry token');
  fault='switch'; await rejects(service.execute('sender','CANCEL','offer-switch'),/Sessão/);
  session='sender';
  rows=[{id:'private',sender_id:'other',receiver_id:'third'}];
  await rejects(service.fetchOffers('sender'),/inválida/);
  rows=[];
  cards=[{owner_id:'third'}]; await rejects(service.fetchCandidates('sender','receiver'),/inválidas/);
  await rejects(service.refresh('sender'),/inválido/);
  cards=[]; profile=null; await rejects(service.refresh('sender'),/inválido/); profile={id:'sender'};
  api.randomUUID=undefined;
  await service.execute('sender','REJECT','fallback');
  assert.match(calls.find(c=>c.args.p_offer_id==='fallback').args.p_request_id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  api.getRandomValues=undefined;
  const count=calls.length;
  await rejects(service.execute('sender','CANCEL','no-crypto'),/seguro/);
  assert.equal(calls.length,count);
  assert(sessionCalls>0);
  console.log('PASS: auth, payload, validation, errors, lost response, refresh failure, retry, session switch, privacy and secure UUID');

  // Execute the actual context handler to prove it waits before touching local state.
  const handler = context.slice(context.indexOf('  const executeOnlineTrade ='), context.indexOf('  const [marketStats,'));
  let resolveRpc, applied=0, localWrites=0;
  const ref=()=>({current:false});
  const ctx = { isAuthenticated:true,currentUser:{id:'sender'},marketUser:{current:'sender'},
    tradePending:ref(),marketPending:ref(),synthesisPending:ref(),marketRevision:{current:0},tradeRevision:{current:0},
    notify(){},setTradeBusy(){},setTradeError(){},applyTradeState(){applied++},
    updateUserBalance(){localWrites++},setAssets(){localWrites++},
    TradeOnlineService:{execute:()=>new Promise(resolve=>{resolveRpc=resolve})},exports:{},
  };
  vm.runInNewContext(ts.transpileModule(handler+'\nexports.execute=executeOnlineTrade;',
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,ctx);
  const pending=ctx.exports.execute('ACCEPT','offer');
  assert.equal(applied,0); assert.equal(localWrites,0);
  assert.equal(await ctx.exports.execute('ACCEPT','offer'),false,'double click blocked');
  resolveRpc({}); assert.equal(await pending,true); assert.equal(applied,1); assert.equal(localWrites,0);
  assert.equal(ctx.tradePending.current,false); assert.equal(ctx.marketPending.current,false); assert.equal(ctx.synthesisPending.current,false);
  ctx.TradeOnlineService.execute=async()=>{throw new Error('failed')};
  assert.equal(await ctx.exports.execute('ACCEPT','offer'),false); assert.equal(applied,1);
  console.log('PASS: actual context awaits remote confirmation, guards duplicate requests, clears barriers on errors');
  let online=true;
  const securityContext={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/securityService.ts','utf8'),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,securityContext);
  const legacyContext={exports:{},require:name=>{
    if(name==='../lib/supabase') return {isSupabaseConfigured:()=>online};
    if(name==='./securityService') return securityContext.exports;
    throw new Error('Unexpected legacy import '+name);
  }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/tradeService.ts','utf8'),
    {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,legacyContext);
  const legacy=legacyContext.exports.TradeService;
  const sender={id:'a',username:'A',balanceNXA:20}, receiver={id:'b',username:'B',balanceNXA:20};
  assert.throws(()=>legacy.createTradeOffer(sender,receiver,[],10,[],2),/servidor/);
  assert.throws(()=>legacy.executeAccept({},receiver),/servidor/);
  online=false;
  const offline=legacy.createTradeOffer(sender,receiver,[],10,[],2);
  const accepted=legacy.executeAccept(offline,receiver);
  assert.equal(offline.status,'PENDING'); assert.equal(accepted.receiverNXAChange,8); assert.equal(accepted.senderNXAChange,-8);
  console.log('PASS: legacy settlement is blocked online and offline trade behavior remains intact');
  console.log('P2P v2 local tests PASS. PostgreSQL integration/concurrency still require a disposable database; no SQL executed.');
}
run().catch(e=>{console.error(e);process.exitCode=1});
