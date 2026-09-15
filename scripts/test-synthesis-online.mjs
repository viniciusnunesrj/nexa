// Real services bundled in memory; mocked transport. No SQL or network execution.
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = `
import assert from 'node:assert/strict';
import { EconomyService } from './src/services/economyService';
import { SupabaseService } from './src/services/supabaseService';
import { LedgerService } from './src/services/ledgerService';
import { AUTH_USERS_KEY, ASSETS_STORAGE_KEY } from './src/services/authService';
const storage = new Map();
globalThis.window = {localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}};
let cards = [], profile = {id:'pilot',username:'Pilot',balance_nex:100,balance_nxa:20,level:7};
let rpcReply = {success:true}, completeRpc = null, defer = false, readFails = false;
const calls = [];
globalThis.fakeSupabase = {
 rpc: async (name,args) => {
  calls.push({name,args});
  if (defer) return new Promise(resolve=>{completeRpc=resolve});
  return {data:rpcReply,error:null};
 },
 from: table => ({select(){return this},eq(){return this},
  maybeSingle:async()=>({data:profile,error:readFails?{message:'read failed'}:null}),
  then(resolve,reject){return Promise.resolve({data:cards,error:readFails?{message:'read failed'}:null}).then(resolve,reject)}
 })
};
const card = {id:'card-1',ownerId:'pilot',type:'Card',name:'Test',rarity:'Raro',state:'FREE',cardStatus:'FREE',status:'IDLE',synthesisRate:10,synthesisCap:100,accumulatedNex:0,tradeable:true};
const nativeAdd = EconomyService.addCurrency, nativeLedger = LedgerService.recordEntry;
EconomyService.addCurrency = () => {throw new Error('Online must not add local currency')};
LedgerService.recordEntry = () => {throw new Error('Online must not write a second ledger')};
assert.throws(()=>EconomyService.synthesizeCard(card,'pilot'),/online aguardado/);
assert.throws(()=>EconomyService.claimSynthesisReward('pilot',card),/online aguardado/);
assert.throws(()=>EconomyService.advanceCardSynthesisTime(card,100),/servidor/);
const before = JSON.stringify([...storage]);
defer=true;
const starting=EconomyService.executeSynthesisOnline('START','pilot',card.id);
assert.equal(calls.length,1);
assert.equal(JSON.stringify([...storage]),before);
await assert.rejects(EconomyService.executeSynthesisOnline('START','pilot','card-2'),/andamento/);
assert.equal(calls.length,1);
cards=[{id:card.id,owner_id:'pilot',state:'ACTIVE',card_status:'ACTIVE',status:'ACTIVE',synthesis_rate:10,synthesis_cap:100,synthesized_at:'2026-09-01T00:00:00Z'}];
completeRpc({data:{success:true},error:null});
const started=await starting;
assert.equal(started.cards[0].state,'ACTIVE');
assert.equal(started.cards[0].synthesizedAt,Date.parse('2026-09-01T00:00:00Z'));
assert.equal(JSON.stringify([...storage]),before);
const claiming=EconomyService.executeSynthesisOnline('CLAIM','pilot',card.id);
assert.deepEqual(calls.at(-1).args,{p_user_id:'pilot',p_card_id:card.id});
assert.equal(JSON.stringify([...storage]),before);
await assert.rejects(EconomyService.executeSynthesisOnline('CLAIM','pilot',card.id),/andamento/);
cards=[];profile={...profile,balance_nex:107.25};
completeRpc({data:{success:true,claimed_nex:7.25,new_balance:107.25,card_name:'Test'},error:null});
const claimed=await claiming;
assert.equal(claimed.claimedNEX,7.25);
assert.equal(claimed.profile.balanceNEX,107.25);
assert.equal(claimed.cards.length,0);
assert.equal(JSON.stringify([...storage]),before);
defer=false;
for (const reply of [null,{}, {success:false,error:'denied'}]) {
 rpcReply=reply;
 await assert.rejects(EconomyService.executeSynthesisOnline('START','pilot','bad-start'));
 await assert.rejects(EconomyService.executeSynthesisOnline('CLAIM','pilot','bad-claim'));
}
for(const value of [undefined,null,'',false,'NaN',Infinity,-1,0]) {
 rpcReply={success:true,claimed_nex:value,new_balance:100};
 assert.equal((await SupabaseService.claimSynthesisAtomic({userId:'pilot',cardId:'bad'})).success,false);
}
rpcReply={success:true,claimed_nex:5,new_balance:null};
assert.equal((await SupabaseService.claimSynthesisAtomic({userId:'pilot',cardId:'bad'})).success,false);
rpcReply={success:true,claimed_nex:'3.5',new_balance:'110.75'};
readFails=true;
const count=calls.length;
await assert.rejects(EconomyService.executeSynthesisOnline('CLAIM','pilot','refresh-failed'),/read failed/);
assert.equal(calls.length,count+1);
readFails=false;profile={...profile,balance_nex:110.75};
const recovered=await EconomyService.executeSynthesisOnline('CLAIM','pilot','refresh-failed');
assert.equal(calls.length,count+1,'only refresh may repeat after a confirmed RPC');
assert.equal(recovered.claimedNEX,3.5);
rpcReply={success:true};profile=null;
await assert.rejects(EconomyService.executeSynthesisOnline('START','pilot','missing-profile'),/Perfil remoto/);
assert.equal(JSON.stringify([...storage]),before);

// Synchronous offline behavior is preserved, including yield and burn.
globalThis.offlineTest=true;
EconomyService.addCurrency=nativeAdd;LedgerService.recordEntry=nativeLedger;
storage.set(AUTH_USERS_KEY,JSON.stringify([{id:'pilot',username:'Pilot',balanceNEX:100,balanceNXA:20,passwordHash:'',salt:''}]));
storage.set(ASSETS_STORAGE_KEY,JSON.stringify([card]));
const rpcCount=calls.length;
const local=EconomyService.synthesizeCard(card,'pilot',1000000);
assert.equal(local.state,'ACTIVE');
const reward=EconomyService.claimSynthesisReward('pilot',local,1000000+3600000);
assert.equal(reward.claimedNEX,10);
assert.equal(reward.user.balanceNEX,110);
assert(!JSON.parse(storage.get(ASSETS_STORAGE_KEY)).some(c=>c.id===card.id));
assert.equal(calls.length,rpcCount);
console.log('PASS: pending/failed/confirmed RPCs, strict payloads, server rewards, no local writes online, read-only recovery, offline yield/burn');
`;
const result = await build({
 stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'synthesis-test.ts',loader:'ts'},
 bundle:true,write:false,platform:'node',format:'esm',
 plugins:[{name:'isolated-supabase',setup(builder){
  builder.onLoad({filter:/[\\/]lib[\\/]supabase\.ts$/},()=>({contents:
   `export const supabase=new Proxy({},{get:(_,key)=>globalThis.fakeSupabase[key]});
    export const isSupabaseConfigured=()=>!globalThis.offlineTest;
    export const getSupabaseConfigurationError=()=>null;
    export const SUPABASE_STATUS={isConfigured:true};`,loader:'ts'}));
 }}]
});
await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const context=readFileSync('src/contexts/GameStateContext.tsx','utf8');
const online=context.split('const executeOnlineSynthesis =')[1].split('const synthesizeCard =')[0];
assert(online.indexOf('await EconomyService.executeSynthesisOnline')<online.indexOf('setAssets('));
assert(online.includes('!isAuthenticated || !currentUser'));
assert(online.includes('synthesisPending.current = true'));
assert(online.includes('synthesisPending.current = false'));
assert(!online.includes('LedgerService.recordEntry')&&!online.includes('addCurrency'));
const ui=readFileSync('src/pages/Collections.tsx','utf8');
assert(ui.includes('const claimed = await claimCardSynthesis'));
assert(ui.includes('if (claimed > 0) setClaimModalCard(null)'));
const migration=readFileSync('supabase/migrations/20260916010000_synthesis_client_hardening.sql','utf8').replace(/\r\n/g,'\n');
assert(migration.includes('SECURITY INVOKER'));
assert(migration.includes('row_security_active'));
assert(migration.includes('FOR INSERT TO authenticated, anon WITH CHECK (false)'));
const preflight = migration.split('DO $check$')[1].split('$check$;')[0];
for (const catalog of ['pg_policy', 'pg_proc', 'pg_trigger']) assert(preflight.includes('pg_catalog.' + catalog));
for (const name of ['synthesis_no_client_mint', 'protect_synthesis_fields_v1', 'synthesis_fields_v1']) {
 assert(preflight.includes(name), 'new object conflicts must be checked before DDL');
}
assert(preflight.includes('p.pronargs = 3 AND p.pronargdefaults = 1'));
assert(preflight.includes('p.proargmodes IS NULL'));
assert(preflight.includes("ARRAY['p_user_id', 'p_card_id', 'p_nex_reward']::text[]"));
assert(preflight.includes('pg_catalog.pg_get_expr(p.proargdefaults, 0)'));
assert(preflight.includes("IN ('NULL', 'NULL::numeric', 'NULL::pg_catalog.numeric')"));
assert(!/\bDROP\s+(POLICY|FUNCTION|TRIGGER)\b/i.test(migration));
for(const field of ['state','card_status','status','accumulated_nex','synthesis_rate','synthesis_cap','synthesized_at','last_accrual_at','exhausted_at','tradeable','synthesizable']) {
 assert(migration.includes('NEW.'+field)&&migration.includes('OLD.'+field));
}
assert(!/CREATE OR REPLACE FUNCTION public.claim_synthesis/.test(migration));
const start = migration.split('CREATE OR REPLACE FUNCTION public.start_synthesis_atomic(')[1].split('ALTER FUNCTION public.claim_synthesis')[0];
const isolation = start.indexOf("current_setting('transaction_isolation') <> 'read committed'");
const advisory = start.indexOf("pg_try_advisory_xact_lock(hashtextextended('nexa:synthesis:start:' || v_effective_user_id, 0))");
const cardLock = start.indexOf('FOR UPDATE;');
const slots = start.indexOf('SELECT unlocked_slots');
const count = start.indexOf('SELECT count(*)');
const update = start.indexOf('UPDATE public.user_cards');
assert(isolation >= 0 && isolation < advisory && advisory < cardLock);
assert(cardLock < slots && slots < count && count < update);
assert(start.indexOf('v_auth_uid := auth.uid()::text;') < advisory);
assert(start.includes("v_active_count >= COALESCE(v_unlocked_slots, 3)"));
assert(!start.includes('pg_advisory_unlock'), 'lock must last until transaction ends');
assert(!/FROM public.profiles[^;]*FOR UPDATE/.test(start), 'do not add profile/card inversion');
// The baseline business logic must remain verbatim after removing only the new
// concurrency block; this protects ownership, state checks and activation fields.
const schema = readFileSync('supabase/schema.sql','utf8').replace(/\r\n/g,'\n');
const original = schema.split('CREATE OR REPLACE FUNCTION start_synthesis_atomic(')[1].split('$$ LANGUAGE plpgsql SECURITY DEFINER;')[0];
const withoutLock = start.slice(0,start.indexOf('$$ LANGUAGE plpgsql VOLATILE'))
 .replace(/\n\n  -- Fresh READ COMMITTED[\s\S]*?  -- 1\. Bloqueia carta/, '\n\n  -- 1. Bloqueia carta');
assert.equal(withoutLock, original, 'business logic must match the existing RPC exactly');
console.log('PASS: START per-user transaction lock precedes Card/slot/count/update; original business logic preserved.');
console.log('PASS: UI confirmation/authentication guards and static hardening contracts. PostgreSQL NOT executed.');
