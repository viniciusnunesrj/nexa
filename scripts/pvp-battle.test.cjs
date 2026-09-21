const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the actual client code against RPC-shaped fixtures, without database writes.
function load(file, imports, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), js)(name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, module, module.exports, ...Object.values(globals));
  return module.exports;
}
const state = load('src/components/arena/pvpBattleState.ts', {});
const { ARENA_CARDS } = load('src/config/arenaCards.ts', {});
const hostDeck = ARENA_CARDS.slice(0, 4).map(card => card.id);
const guestDeck = ARENA_CARDS.slice(4, 8).map(card => card.id);
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate); };

function server() {
  const room = { id: 'room', code: 'ABC123', status: 'READY', round: 1, hostId: 'host', guestId: 'guest', hostHp: 12, guestHp: 12, hostNexos: 12, guestNexos: 12, winnerId: null };
  const history = [], moves = new Map(), calls = [];
  let offline = false, ambiguous = false;
  const client = user => {
    const builder = work => {
      let signal;
      const result = {
        abortSignal(value) { signal = value; return result; },
        single() { return result; },
        eq() { return result; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (signal?.aborted) throw new Error('Aborted');
            if (offline) throw new Error('Offline');
            return work();
          }).then(resolve, reject);
        },
      };
      return result;
    };
    return {
      from(table) {
        assert.equal(table, 'duelo_nexal_pvp_rooms');
        return { select(column) {
          assert.equal(column, user === 'host' ? 'host_deck' : 'guest_deck');
          return builder(() => ({ data: { [column]: user === 'host' ? hostDeck : guestDeck }, error: null }));
        } };
      },
      rpc(name, args) {
        return builder(() => {
          calls.push({ user, name, args });
          if (name === 'get_duelo_nexal_pvp_room') return { data: { ...room } };
          if (name === 'get_duelo_nexal_pvp_round_history') return { data: history.map(item => ({ ...item })) };
          if (name === 'get_duelo_nexal_pvp_move_state') return { data: { round: room.round, status: room.status, submitted: moves.has(`${room.round}:${user}`) } };
          if (name === 'forfeit_duelo_nexal_pvp_room') {
            room.status = 'FINISHED'; room.winnerId = user === 'host' ? 'guest' : 'host';
            return { data: { ...room } };
          }
          assert.equal(name, 'submit_duelo_nexal_pvp_move');
          assert(!moves.has(`${room.round}:${user}`), 'Duplicate submission');
          moves.set(`${room.round}:${user}`, args.p_card_id);
          const round = room.round;
          if (moves.has(`${round}:host`) && moves.has(`${round}:guest`)) {
            // Fixed authoritative fixture, intentionally unrelated to client card powers.
            history.push({ round, winner: 'HOST', damage: 1, hostCard: moves.get(`${round}:host`), guestCard: moves.get(`${round}:guest`), hostAttack: 31, guestAttack: 17, hostNexosSpent: 1, guestNexosSpent: 1, hostHp: 12, guestHp: 12 - round });
            room.hostHp = 12; room.guestHp = 12 - round;
            room.hostNexos = 12 - round; room.guestNexos = 12 - round;
            room.status = round === 4 ? 'FINISHED' : 'PLAYING';
            if (round === 4) room.winnerId = 'host'; else room.round++;
          } else room.status = 'PLAYING';
          if (ambiguous) { ambiguous = false; throw new Error('Response lost after commit'); }
          return { data: { resolved: history.length >= round, round } };
        });
      },
    };
  };
  return { room, history, calls, client, setOffline: value => offline = value, loseResponse: () => ambiguous = true };
}

function mount(api, user) {
  const slots = [], effects = [], cleanups = [], timers = new Map();
  let cursor = 0, timerId = 0, unmounted = false, lateWrites = 0, exits = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { if (unmounted) lateWrites++; slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useEffect(effect) { const index = cursor++; if (!(index in slots)) { slots[index] = true; effects.push(effect); } },
  };
  const { PvpBattleBoard } = load('src/components/arena/PvpBattleBoard.tsx', {
    react: { ...react, default: react },
    '../../config/arenaCards': { ARENA_CARDS },
    '../../lib/supabase': { supabase: api.client(user) },
    '../common/CardImage': { CardImage: () => null },
    './pvpBattleState': state,
    './PvpRoundReveal': { PvpRoundReveal: () => null },
  }, {
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
    window: { confirm: () => true },
  });
  const render = () => { cursor = 0; return PvpBattleBoard({ roomId: 'room', userId: user, onExit() { exits++; } }); };
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...tree.props.children.flat(Infinity).flatMap(nodes)];
  const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) : tree?.props?.children.flat(Infinity).map(text).join(' ') || '';
  const find = predicate => nodes(render()).find(predicate);
  render(); effects.forEach(effect => cleanups.push(effect()));
  return {
    text: () => text(render()),
    exit: () => find(node => node.type === 'button' && text(node).includes('SAIR DA SALA · VOLTAR À ARENA')).props.onClick(),
    get exits() { return exits; },
    choose(id) { const button = find(node => node.type === 'button' && node.props.children.some(child => child?.props?.id === id)); assert(button && !button.props.disabled); button.props.onClick(); },
    confirm: () => find(node => node.type === 'button' && /CONFIRMAR|ENVIANDO/.test(text(node))),
    async tick() { const pending = [...timers.values()]; timers.clear(); await Promise.all(pending.map(callback => callback())); await flush(); },
    unmount() { unmounted = true; cleanups.forEach(cleanup => cleanup()); },
    get timers() { return timers.size; },
    get lateWrites() { return lateWrites; },
  };
}

test('host and guest: four rounds, authoritative attacks, automatic advancement and final perspectives', async () => {
  const api = server(), host = mount(api, 'host'), guest = mount(api, 'guest');
  await flush();
  for (let round = 1; round <= 4; round++) {
    host.choose(hostDeck[round - 1]);
    const confirm = host.confirm();
    await Promise.all([confirm.props.onClick(), confirm.props.onClick()]);
    assert.match(host.text(), /Jogada confirmada. Aguardando adversário/);
    assert(host.confirm().props.disabled);
    guest.choose(guestDeck[round - 1]);
    await guest.confirm().props.onClick();
    await host.tick();
    assert.match(host.text(), /Ataque\s+31/);
    assert.match(guest.text(), /Ataque\s+17/);
    if (round < 4) { assert.match(host.text(), new RegExp(`RODADA ${round + 1}`)); assert(host.confirm().props.disabled); }
  }
  assert.match(host.text(), /VITÓRIA/);
  assert.match(guest.text(), /DERROTA/);
  assert.equal(api.calls.filter(call => call.name === 'submit_duelo_nexal_pvp_move').length, 8);
  host.unmount(); guest.unmount();
  assert.equal(host.timers + guest.timers, 0);
});

test('refresh restores server deck, used cards and pending submission; lost response never resubmits', async () => {
  const api = server();
  let host = mount(api, 'host'); const guest = mount(api, 'guest');
  await flush();
  host.choose(hostDeck[0]); api.loseResponse(); await host.confirm().props.onClick();
  assert(host.confirm().props.disabled);
  host.unmount(); host = mount(api, 'host'); await flush();
  assert.match(host.text(), /Jogada confirmada/);
  assert(host.confirm().props.disabled);
  guest.choose(guestDeck[0]); await guest.confirm().props.onClick(); await host.tick();
  host.unmount(); host = mount(api, 'host'); await flush();
  assert.throws(() => host.choose(hostDeck[0]));
  host.choose(hostDeck[1]);
  api.setOffline(true); await host.tick(); assert(host.confirm().props.disabled);
  api.setOffline(false); await host.tick(); assert(!host.confirm().props.disabled);
  host.unmount(); guest.unmount();
});

test('forfeit without a final round result and cleanup during initial reads', async () => {
  const api = server(); api.room.status = 'FINISHED'; api.room.winnerId = 'guest';
  const host = mount(api, 'host'); await flush(); assert.match(host.text(), /DERROTA/); host.unmount();
  const interrupted = mount(server(), 'guest'); interrupted.unmount(); await flush();
  assert.equal(interrupted.timers, 0); assert.equal(interrupted.lateWrites, 0);
});

test('snapshot rejects mixed rounds and retries; participant and cancellation guards', async () => {
  const api = server(); const base = api.client('host');
  let roomsRead = 0;
  const changing = { ...base, rpc(name, args) {
    if (name === 'get_duelo_nexal_pvp_room' && ++roomsRead === 2) api.room.status = 'PLAYING';
    return base.rpc(name, args);
  } };
  const snapshot = await state.readPvpSnapshot(changing, 'room', 'host', new AbortController().signal);
  assert.equal(snapshot.room.status, 'PLAYING');
  assert(roomsRead >= 4);
  assert.throws(() => state.pvpPerspective(snapshot, 'outsider'));
  const abort = new AbortController(); abort.abort();
  await assert.rejects(state.readPvpSnapshot(base, 'room', 'host', abort.signal));
});

test('server knockout ends before round four, with both final perspectives', async () => {
  const api = server();
  Object.assign(api.room, { status: 'FINISHED', round: 1, hostHp: 0, winnerId: 'guest' });
  api.history.push({ round: 1, winner: 'GUEST', damage: 12, hostCard: hostDeck[0], guestCard: guestDeck[0], hostAttack: 1, guestAttack: 40, hostNexosSpent: 0, guestNexosSpent: 12, hostHp: 0, guestHp: 12 });
  const host = mount(api, 'host'), guest = mount(api, 'guest');
  await flush();
  assert.match(host.text(), /DERROTA/); assert.match(guest.text(), /VITÓRIA/);
  assert.equal(host.confirm(), undefined); assert.equal(guest.confirm(), undefined);
  host.unmount(); guest.unmount();
});

test('draw finish offers exit and compact history retains cards, investment, attack and damage', async () => {
  const api = server();
  Object.assign(api.room, { status: 'FINISHED', round: 1, winnerId: null, hostHp: 7, guestHp: 7 });
  api.history.push({ round: 1, winner: 'DRAW', damage: 0, hostCard: hostDeck[0], guestCard: guestDeck[0], hostAttack: 21, guestAttack: 21, hostNexosSpent: 4, guestNexosSpent: 5, hostHp: 7, guestHp: 7 });
  const host = mount(api, 'host'); await flush();
  const text = host.text();
  assert.match(text, /EMPATE/); assert.match(text, /VOCÊ · PV FINAL/); assert.match(text, /ADVERSÁRIO · PV FINAL/);
  assert(text.includes(ARENA_CARDS[0].name)); assert(text.includes(ARENA_CARDS[4].name));
  assert.match(text, /4\s+Nexos/); assert.match(text, /5\s+Nexos/); assert.match(text, /Ataque\s+21/); assert.match(text, /0\s+de dano/);
  host.exit(); assert.equal(host.exits, 1); host.unmount();
});

test('visual reveal uses seven stages, ignores repeated polls, skips restored history and cleans timers', () => {
  const slots = [], effects = [], timers = new Map();
  let cursor = 0, timerId = 0;
  const react = {
    Fragment: 'fragment',
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = cursor++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = value; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useEffect(effect, deps) {
      const i = cursor++, old = slots[i];
      if (!old || deps.some((dep, index) => dep !== old.deps[index])) {
        effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; });
      }
    },
  };
  const { PvpRoundReveal } = load('src/components/arena/PvpRoundReveal.tsx', {
    react: { ...react, default: react }, '../../config/arenaCards': { ARENA_CARDS },
    '../common/CardImage': { CardImage: () => null }, './pvpRoundReveal.css': {},
  }, { setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; }, clearTimeout: id => timers.delete(id) });
  const api = server();
  let snapshot = { room: { ...api.room }, deck: hostDeck, history: [], submitted: false };
  const render = () => {
    cursor = 0; const tree = PvpRoundReveal({ snapshot, userId: 'host' });
    effects.splice(0).forEach(effect => effect()); return tree;
  };
  assert.equal(render(), null);
  const result = { round: 1, winner: 'HOST', damage: 2, hostCard: hostDeck[0], guestCard: guestDeck[0], hostAttack: 25, guestAttack: 18, hostNexosSpent: 3, guestNexosSpent: 2, hostHp: 12, guestHp: 10 };
  snapshot = { ...snapshot, history: [result], room: { ...api.room, round: 2 } };
  render(); let tree = render();
  assert.match(tree.props.className, /step-1/); assert.equal(timers.size, 7);
  snapshot = { ...snapshot, history: [{ ...result }] }; render(); render();
  assert.equal(timers.size, 7, 'Polling must not restart presentation');
  const scheduled = [...timers.values()].sort((a, b) => a.delay - b.delay);
  for (let index = 0; index < 6; index++) {
    scheduled[index].callback(); tree = render(); assert.match(tree.props.className, new RegExp(`step-${index + 2}`));
  }
  scheduled[6].callback(); assert.equal(render(), null); assert.equal(timers.size, 0);
  slots.length = 0; // A remount with history should not replay it.
  assert.equal(render(), null); assert.equal(render(), null); assert.equal(timers.size, 0);
  snapshot = { ...snapshot, history: [result, { ...result, round: 2 }] }; render(); render();
  assert.equal(timers.size, 7);
  slots.forEach(slot => slot?.cleanup?.()); assert.equal(timers.size, 0);
});
