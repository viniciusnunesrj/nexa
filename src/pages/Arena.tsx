import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Swords } from 'lucide-react';
import { ARENA_CARDS } from '../config/arenaCards';
import type { ArenaCard } from '../config/arenaCards';
import { CardImage } from '../components/common/CardImage';
import { PvpBattleBoard } from '../components/arena/PvpBattleBoard';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { SupabaseService } from '../services/supabaseService';
import { EconomyService } from '../services/economyService';

interface ArenaProps { onNavigate: (page: string) => void; }
type MatchResult = 'VICTORY' | 'DEFEAT' | 'DRAW' | null;
type DuelPhase = 'SELECT' | 'LOCK' | 'CPU' | 'ENTER' | 'REVEAL' | 'CALC' | 'VS' | 'IMPACT' | 'DAMAGE' | 'RESULT' | 'NEXT';
export interface ArenaMatchSummary {
  winner: 'PLAYER' | 'CPU' | 'DRAW';
  playerFinalHp: number; cpuFinalHp: number;
  playerRoundsWon: number; cpuRoundsWon: number; roundsPlayed: number;
  playerNexosRemaining: number; cpuNexosRemaining: number;
}
interface ArenaRewards {
  nex: number; xp: number; nxa: number; levelUps: number;
  profileSynced: boolean;
}
type RewardStatus = { requestId: string; status: 'pending' | 'success' | 'error'; rewards?: ArenaRewards };
interface DuelState {
  requestId: string;
  playerCards: ArenaCard[]; cpuCards: ArenaCard[]; usedPlayer: string[]; usedCpu: string[];
  playerHp: number; cpuHp: number; playerNexos: number; cpuNexos: number; round: number;
  selectedId: string | null; investment: number; cpuInvestment: number; revealedCpu: ArenaCard | null;
  phase: DuelPhase; playerAttack: number | null; cpuAttack: number | null; roundMessage: string | null;
  roundDamage: number; result: MatchResult; matchSummary: ArenaMatchSummary | null; calcStep: number; playerWins: number; cpuWins: number;
}

const MAX_DECK_SIZE = 4;
const MAX_ROUNDS = 4;
const ROUND_TIME_SECONDS = 30; // Timeout plays an available card with zero Nexos.
const ELEMENT_ICONS: Record<string, string> = { Fogo: '🔥', Água: '💧', Natureza: '🌿', Sombra: '☾', Luz: '✦', Arcano: '◇' };
const rarityStyle: Record<string, string> = { Comum: 'border-slate-300/40', Incomum: 'border-cyan-300/50', Raro: 'border-blue-400/70 shadow-blue-500/10', Épico: 'border-fuchsia-400/70 shadow-fuchsia-500/20', Lendário: 'border-amber-300 shadow-amber-400/25', Mítico: 'border-violet-300 shadow-violet-400/30' };
const shuffleCards = (cards: ArenaCard[]) => {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};
const freshDuel = (deck: ArenaCard[]): DuelState => {
  const playerCards = deck.slice(0, MAX_ROUNDS);
  const playerIds = new Set(playerCards.map((card) => card.id));
  const cpuPool = ARENA_CARDS.filter((card) => !playerIds.has(card.id));
  const cpuCards = shuffleCards(cpuPool).slice(0, MAX_ROUNDS);
  return { requestId: crypto.randomUUID(), playerCards, cpuCards, usedPlayer: [], usedCpu: [], playerHp: 12, cpuHp: 12, playerNexos: 12, cpuNexos: 12, round: 1, selectedId: null, investment: 0, cpuInvestment: 0, revealedCpu: null, phase: 'SELECT', playerAttack: null, cpuAttack: null, roundMessage: null, roundDamage: 0, result: null, matchSummary: null, calcStep: 1, playerWins: 0, cpuWins: 0 };
};
const attackValue = (card: ArenaCard, nexos: number) => card.power + nexos * 2 + (card.abilityKind === 'IMPULSO' && nexos >= 3 ? 2 : 0);

// Local snapshot only; no currency, XP or persistence side effects.
const completedMatch = (duel: DuelState): ArenaMatchSummary | null => {
  if (duel.playerHp > 0 && duel.cpuHp > 0 && duel.round < MAX_ROUNDS) return null;
  return {
    winner: duel.playerHp <= 0 ? 'CPU' : duel.cpuHp <= 0 ? 'PLAYER' : duel.playerHp > duel.cpuHp ? 'PLAYER' : duel.playerHp < duel.cpuHp ? 'CPU' : 'DRAW',
    playerFinalHp: Math.max(0, duel.playerHp), cpuFinalHp: Math.max(0, duel.cpuHp),
    playerRoundsWon: duel.playerWins, cpuRoundsWon: duel.cpuWins, roundsPlayed: duel.round,
    playerNexosRemaining: duel.playerNexos, cpuNexosRemaining: duel.cpuNexos,
  };
};
const lockRound = (current: DuelState | null, automatic: boolean, cardRoll: number, investmentRoll: number): DuelState | null => {
  if (!current || current.result || current.matchSummary || current.phase !== 'SELECT' || current.round > MAX_ROUNDS) return current;
  const available = current.playerCards.filter((card) => !current.usedPlayer.includes(card.id));
  const playerCard = automatic ? available[0] : available.find((card) => card.id === current.selectedId);
  const cpuAvailable = current.cpuCards.filter((card) => !current.usedCpu.includes(card.id));
  if (!playerCard || !cpuAvailable.length) return current;
  const investment = automatic ? 0 : Math.max(0, Math.min(current.playerNexos, current.investment));
  // CPU chooses without reading the player's selected card or investment.
  // It manages its 12 Nexos across the remaining rounds instead of spending randomly 0-3 every time.
  const roundsLeft = Math.max(1, MAX_ROUNDS - current.round + 1);
  const reservePerRound = Math.floor(current.cpuNexos / roundsLeft);
  const pressure = current.cpuHp < current.playerHp ? 1 : current.cpuHp > current.playerHp ? -1 : 0;
  const targetInvestment = Math.max(0, Math.min(4, reservePerRound + pressure));
  const investmentVariance = investmentRoll < 0.22 ? -1 : investmentRoll > 0.78 ? 1 : 0;
  const cpuInvestment = Math.max(0, Math.min(current.cpuNexos, targetInvestment + investmentVariance));
  const cardScores = cpuAvailable.map((card) => {
    const impulseValue = card.abilityKind === 'IMPULSO' && cpuInvestment >= 3 ? 2 : 0;
    const utilityValue = card.abilityKind === 'BLINDAGEM' ? 0.7 : card.abilityKind === 'DRENO' && current.cpuHp < 12 ? 0.6 : card.abilityKind === 'ECO' && current.cpuNexos < 12 ? 0.5 : 0;
    return { card, score: card.power + impulseValue + card.damage * 0.35 + utilityValue };
  }).sort((a, b) => b.score - a.score);
  const choiceWindow = Math.min(cardScores.length, current.round >= 3 || pressure > 0 ? 2 : 3);
  const cpuCard = cardScores[Math.floor(cardRoll * choiceWindow)]?.card ?? cpuAvailable[0];
  return { ...current, selectedId: playerCard.id, investment, revealedCpu: cpuCard, playerAttack: attackValue(playerCard, investment), cpuAttack: attackValue(cpuCard, cpuInvestment), cpuInvestment, usedPlayer: [...current.usedPlayer, playerCard.id], usedCpu: [...current.usedCpu, cpuCard.id], calcStep: 1, phase: 'LOCK' };
};
export const Arena: React.FC<ArenaProps> = ({ onNavigate }) => {
  const { cards } = useGameState();
  const { currentUser } = useAuth();
  const ownedTemplateIds = new Set(cards.map((card) => card.templateId));
  const isAvailable = (card: ArenaCard) => card.starter === true || ownedTemplateIds.has(card.id);
  const [selectedDeck, setDeck] = useState<ArenaCard[]>([]);
  const [collectionView, setCollectionView] = useState<'AVAILABLE' | 'ALL'>('AVAILABLE');
  const [rarityFilter, setRarityFilter] = useState<string>('Todas');
  const [pvpOpen, setPvpOpen] = useState(false);
  const [pvpCode, setPvpCode] = useState('');
  const [pvpStatus, setPvpStatus] = useState('');
  const [pvpRoomId, setPvpRoomId] = useState<string | null>(null);
  const [pvpRoomState, setPvpRoomState] = useState<any>(null);
  useEffect(() => {
    if (!currentUser || pvpRoomId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const recover = async () => {
      try {
        const { data, error } = await supabase.rpc('get_duelo_nexal_pvp_active_room').abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        if (!data?.id) return;
        setPvpRoomId(data.id); setPvpRoomState(data); setPvpCode(data.code || ''); setPvpOpen(true);
        setPvpStatus(data.status === 'WAITING' ? 'Sala anterior recuperada. Aguardando adversário.' : 'Partida PvP em andamento recuperada.');
      } catch {
        if (!controller.signal.aborted) {
          setPvpStatus('Não foi possível recuperar a sala. Tentando novamente...');
          timer = setTimeout(recover, 1500);
        }
      }
    };
    void recover();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [currentUser?.id, pvpRoomId]);
  // Revalidate against the current inventory, including after returning from battle.
  const deck = selectedDeck.filter(isAvailable);
  const canStart = deck.length === MAX_DECK_SIZE && new Set(deck.map((card) => card.id)).size === MAX_DECK_SIZE;
  const visibleCards = useMemo(() => ARENA_CARDS.filter((card) => (collectionView === 'ALL' || isAvailable(card)) && (rarityFilter === 'Todas' || card.rarity === rarityFilter)), [collectionView, rarityFilter, cards]);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const toggleCard = (card: ArenaCard) => {
    if (!isAvailable(card)) return;
    setDeck((previous) => {
      const current = previous.filter(isAvailable);
      return current.some((item) => item.id === card.id) ? current.filter((item) => item.id !== card.id) : current.length < MAX_DECK_SIZE ? [...current, card] : current;
    });
  };
  const createPvpRoom = async () => { if (!canStart) return; setPvpStatus('Criando sala...'); const { data, error } = await supabase.rpc('create_duelo_nexal_pvp_room', { p_deck: deck.map(card => card.id) }); if (error || !data) { setPvpStatus('Não foi possível criar a sala.'); return; } const room = Array.isArray(data) ? data[0] : data; setPvpCode(room.code); setPvpRoomId(room.id); setPvpRoomState(room); setPvpStatus('Sala criada. Compartilhe o código e aguarde o adversário.'); };
  const joinPvpRoom = async () => { if (!canStart || !pvpCode.trim()) return; setPvpStatus('Entrando na sala...'); const { data, error } = await supabase.rpc('join_duelo_nexal_pvp_room', { p_code: pvpCode.trim().toUpperCase(), p_deck: deck.map(card => card.id) }); if (error || !data) { setPvpStatus('Sala indisponível ou código inválido.'); return; } const room = Array.isArray(data) ? data[0] : data; setPvpRoomId(room.id); setPvpRoomState(room); setPvpStatus('Adversário conectado. Sala pronta.'); };
  const pvpConnected = !!currentUser && !!pvpRoomState &&
    !!(pvpRoomState.guestId || pvpRoomState.guest_id) &&
    ['READY', 'PLAYING', 'FINISHED'].includes(pvpRoomState.status);
  useEffect(() => {
    if (!pvpRoomId || pvpConnected) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const { data, error } = await supabase.rpc('get_duelo_nexal_pvp_room', { p_room_id: pvpRoomId }).abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error || !data) setPvpStatus('Conexão interrompida. Tentando recuperar a sala...');
        else setPvpRoomState(data);
      } catch {
        if (!controller.signal.aborted) setPvpStatus('Conexão interrompida. Tentando recuperar a sala...');
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 1500);
      }
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [pvpRoomId, pvpConnected]);
  const cancelWaitingPvp = async () => {
    if (!pvpRoomId || pvpRoomState?.status !== 'WAITING') return;
    const { error } = await supabase.rpc('cancel_duelo_nexal_pvp_room', { p_room_id: pvpRoomId });
    if (error) { setPvpStatus('Não foi possível cancelar a sala.'); return; }
    setPvpRoomId(null); setPvpRoomState(null); setPvpCode(''); setPvpStatus('Sala cancelada.');
  };
  if (pvpConnected && pvpRoomId && currentUser) return <PvpBattleBoard key={pvpRoomId + currentUser.id} roomId={pvpRoomId} userId={currentUser.id} onExit={() => { setPvpRoomId(null); setPvpRoomState(null); setPvpCode(''); setPvpStatus(''); }} />;
  if (duel) return <DuelView duel={duel} setDuel={setDuel} onBack={() => setDuel(null)} onGames={() => onNavigate('games')} />;
  return <div className="arena-lobby mx-auto max-w-5xl space-y-5"><header className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.18),transparent_45%),#0a0e1c] p-6 sm:p-8"><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-mono font-bold tracking-[.3em] text-cyan-300">NEXA / ARENA</p><h1 className="mt-1 font-heading text-3xl font-black text-white sm:text-4xl">NEXA ARENA</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Monte seu esquadrão e entre no Duelo Nexal.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[9px] font-black tracking-[.14em] text-cyan-200">PVE · DISPONÍVEL</span><span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-[9px] font-black tracking-[.14em] text-purple-200">PVP · EM PREPARAÇÃO</span></div></div><button type="button" onClick={() => onNavigate('games')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase text-slate-200"><ArrowLeft className="h-4 w-4" /> Voltar para Jogos</button></div></header><section className="arena-deck-panel rounded-2xl border border-cyan-400/20 bg-[#0b1020]/90 p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-xl font-black text-white">Seu Deck <span className="text-cyan-300">{deck.length}/{MAX_DECK_SIZE}</span></h2><p className="mt-1 text-xs text-slate-400">Escolha 4 cartas para começar.</p></div><button type="button" onClick={() => setDeck([])} disabled={!deck.length} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-slate-300 disabled:opacity-40">Limpar Deck</button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: MAX_DECK_SIZE }, (_, index) => deck[index] ? <BattleCard key={deck[index].id} card={deck[index]} compact /> : <div key={index} className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-slate-600">Slot {index + 1}</div>)}</div></section><section className="rounded-2xl border border-white/10 bg-[#090d18]/70 p-4 sm:p-5"><div className="mb-4 flex flex-col gap-3"><div className="flex items-end justify-between"><div><h2 className="font-heading text-xl font-black text-white">Cartas para o Duelo</h2><p className="mt-1 text-xs text-slate-400">PODER, DANO e habilidade são o foco da Arena.</p></div><span className="text-xs font-mono text-slate-500">{visibleCards.length}/{ARENA_CARDS.length}</span></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setCollectionView('AVAILABLE')} className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${collectionView === 'AVAILABLE' ? 'border-cyan-300 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-400'}`}>Disponíveis</button><button type="button" onClick={() => setCollectionView('ALL')} className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${collectionView === 'ALL' ? 'border-cyan-300 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-400'}`}>Todas</button>{['Todas','Comum','Incomum','Raro','Épico','Lendário','Mítico'].map((rarity) => <button key={rarity} type="button" onClick={() => setRarityFilter(rarity)} className={`rounded-lg border px-2.5 py-2 text-[9px] font-bold ${rarityFilter === rarity ? 'border-purple-300 bg-purple-400/10 text-purple-200' : 'border-white/10 text-slate-500'}`}>{rarity}</button>)}</div></div>{visibleCards.length ? <div className="arena-card-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{visibleCards.map((card) => <button key={card.id} type="button" disabled={!isAvailable(card)} onClick={() => toggleCard(card)} className={`arena-card-choice text-left disabled:opacity-40 disabled:cursor-not-allowed ${deck.some((item) => item.id === card.id) ? 'arena-card-selected ring-2 ring-cyan-300' : ''}`}><BattleCard card={card} selected={deck.some((item) => item.id === card.id)} compact /><span className="mt-1 block text-center text-[9px] font-bold tracking-wider text-cyan-200">{card.starter ? 'STARTER' : isAvailable(card) ? 'DISPONÍVEL' : 'NÃO POSSUÍDA'}</span></button>)}</div> : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">Nenhuma carta neste filtro.</div>}</section><div className="grid gap-3 sm:grid-cols-2"><button type="button" disabled={!canStart} onClick={() => { if (canStart) setDuel(freshDuel(deck)); }} className="arena-start flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-5 py-4 font-heading text-sm font-black uppercase tracking-[.14em] text-white disabled:cursor-not-allowed disabled:opacity-40"><Swords className="h-5 w-5" /> Duelo PVE</button><button type="button" disabled={!canStart} onClick={() => setPvpOpen((value) => !value)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-400/35 bg-purple-500/10 px-5 py-4 font-heading text-sm font-black uppercase tracking-[.14em] text-purple-200 disabled:opacity-40"><Swords className="h-5 w-5" /> PVP · Sala privada</button></div>{pvpOpen && <div className="mt-3 rounded-xl border border-purple-400/20 bg-[#120d24] p-4"><p className="text-xs text-slate-300">Use seu deck atual de 4 cartas. Crie uma sala ou digite o código recebido.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input value={pvpCode} onChange={(e) => setPvpCode(e.target.value.toUpperCase().slice(0,6))} placeholder="CÓDIGO DA SALA" className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 font-mono text-sm font-black tracking-[.2em] text-white outline-none focus:border-purple-300" /><button type="button" onClick={createPvpRoom} className="rounded-lg bg-purple-600 px-4 py-3 text-xs font-black uppercase text-white">Criar sala</button><button type="button" disabled={!pvpCode.trim()} onClick={joinPvpRoom} className="rounded-lg border border-purple-300/40 px-4 py-3 text-xs font-black uppercase text-purple-100 disabled:opacity-40">Entrar</button></div>{pvpStatus && <p className="mt-3 text-xs font-bold text-purple-200">{pvpStatus}{pvpCode && pvpStatus.startsWith('Sala criada') ? ` · CÓDIGO: ${pvpCode}` : ''}</p>}{pvpRoomState && <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase"><span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">Sala {pvpRoomState.code || pvpCode}</span><span className="rounded-full border border-purple-400/30 px-3 py-1 text-purple-200">{pvpRoomState.guestId || pvpRoomState.guest_id ? '2/2 jogadores' : '1/2 jogadores'}</span><span className="rounded-full border border-cyan-400/30 px-3 py-1 text-cyan-200">{pvpRoomState.status}</span></div>}{pvpRoomState?.status === 'WAITING' && <button type="button" onClick={cancelWaitingPvp} className="mt-3 w-full rounded-lg border border-rose-400/20 px-4 py-3 text-xs font-black uppercase text-rose-300">Cancelar sala</button>}{pvpRoomState && (pvpRoomState.guestId || pvpRoomState.guest_id) && <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center text-xs font-black uppercase text-emerald-200">Conexão confirmada · 2/2 jogadores</div>}</div>}<style>{`
  .arena-lobby > header { box-shadow:0 18px 55px #02061755; }
  .arena-deck-panel { box-shadow:inset 0 1px #ffffff08,0 18px 55px #02061744; }
  .arena-card-choice { position:relative; border-radius:.85rem; transition:transform 180ms ease,filter 180ms ease,box-shadow 180ms ease; }
  .arena-card-choice:not(:disabled):hover { transform:translateY(-5px) scale(1.015); filter:brightness(1.08); z-index:3; }
  .arena-card-selected { transform:translateY(-4px); box-shadow:0 0 28px #22d3ee35; }
  .arena-card-selected::after { content:'NO DECK'; position:absolute; z-index:20; top:.45rem; right:.45rem; padding:.18rem .4rem; border-radius:999px; background:#22d3ee; color:#06202a; font-size:.48rem; font-weight:1000; letter-spacing:.08em; box-shadow:0 0 16px #22d3ee88; }
  .arena-start { position:sticky; bottom:1rem; z-index:25; box-shadow:0 12px 40px #02061799,0 0 30px #22d3ee20; transition:transform 180ms ease,filter 180ms ease; }
  .arena-start:not(:disabled):hover { transform:translateY(-2px); filter:brightness(1.12); }
    @media (max-width:640px){ .arena-lobby{gap:1rem}.arena-card-grid{gap:.55rem}.arena-start{bottom:.5rem} }
`}</style></div>;
};

const DuelView: React.FC<{ duel: DuelState; setDuel: React.Dispatch<React.SetStateAction<DuelState | null>>; onBack: () => void; onGames: () => void }> = ({ duel, setDuel, onBack, onGames }) => {
  const selectedCard = duel.playerCards.find((card) => card.id === duel.selectedId) || null;
  const { currentUser, syncUser } = useAuth();
  const rewardRequests = useRef(new Map<string, Promise<ArenaRewards>>());
  const [rewardStatus, setRewardStatus] = useState<RewardStatus>({ requestId: duel.requestId, status: 'pending' });
  useEffect(() => {
    if (!duel.result || !duel.matchSummary) return;
    const requestId = duel.requestId;
    const outcome = duel.result;
    const summary = duel.matchSummary;
    const userId = currentUser?.id;
    let subscribed = true;
    let request = rewardRequests.current.get(requestId);
    if (!request) {
      // Cache the promise before awaiting it, including failures. StrictMode and
      // profile-driven renders subscribe to this request instead of sending again.
      request = (async (): Promise<ArenaRewards> => {
        if (!isSupabaseConfigured() || !userId) throw new Error('Sessão online necessária.');
        const { data, error } = await supabase.rpc('complete_duelo_nexal_pve', {
          p_request_id: requestId,
          p_outcome: outcome,
          p_result_snapshot: {
            playerFinalHp: summary.playerFinalHp, cpuFinalHp: summary.cpuFinalHp,
            playerRoundsWon: summary.playerRoundsWon, cpuRoundsWon: summary.cpuRoundsWon,
            roundsPlayed: summary.roundsPlayed, playerNexosRemaining: summary.playerNexosRemaining,
            cpuNexosRemaining: summary.cpuNexosRemaining,
          },
        });
        if (error || data?.success !== true) throw new Error('Recompensa não confirmada.');
        const amounts = [data.nex_gained, data.xp_gained, data.nxa_gained];
        if (amounts.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) throw new Error('Resposta de recompensa inválida.');
        // An idempotent response may omit level_ups; never infer extra rewards.
        const levelUps = data.level_ups === undefined ? 0 : data.level_ups;
        if (typeof levelUps !== 'number' || !Number.isInteger(levelUps) || levelUps < 0) throw new Error('Resposta de nível inválida.');
        let profileSynced = false;
        try {
          const profile = await SupabaseService.fetchRemoteProfile(userId);
          if (!profile) throw new Error('Perfil não encontrado.');
          SupabaseService.acceptConfirmedProfile(profile);
          EconomyService.hydrateProfileFromSupabase(profile);
          syncUser(profile);
          profileSynced = true;
        } catch {
          // A profile refresh failure must not retry the reward RPC or grant locally.
          console.warn('[NEXA ARENA] Recompensa registrada; atualização do perfil pendente.');
        }
        return { nex: data.nex_gained, xp: data.xp_gained, nxa: data.nxa_gained, levelUps, profileSynced };
      })();
      rewardRequests.current.set(requestId, request);
    }
    setRewardStatus({ requestId, status: 'pending' });
    void request.then(
      (rewards) => { if (subscribed) setRewardStatus({ requestId, status: 'success', rewards }); },
      () => { if (subscribed) setRewardStatus({ requestId, status: 'error' }); },
    );
    return () => { subscribed = false; };
  }, [duel.requestId, duel.result, duel.matchSummary, currentUser?.id, syncUser]);
  const boardRef = useRef<HTMLDivElement>(null);
  const [gameFullscreen, setGameFullscreen] = useState(false);
  const enterGameMode = async () => {
    const el = boardRef.current;
    if (!el) return;
    try { if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen(); } catch {}
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };
      if (orientation.lock) await orientation.lock('landscape');
    } catch {}
    setGameFullscreen(true);
  };
  useEffect(() => {
    const syncFullscreen = () => setGameFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);
  const cpuTarget = useRef<HTMLDivElement>(null);
  const playerTarget = useRef<HTMLDivElement>(null);
  const slots = useRef<Record<string, HTMLDivElement | null>>({});
  const [travel, setTravel] = useState<Record<string, { x: number; y: number }>>({});
  const [secondsLeft, setSecondsLeft] = useState(ROUND_TIME_SECONDS);
  useEffect(() => {
    if (duel.phase !== 'SELECT' || duel.result) return;
    const deadline = Date.now() + ROUND_TIME_SECONDS * 1000;
    setSecondsLeft(ROUND_TIME_SECONDS);
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        const cardRoll = Math.random();
        const investmentRoll = Math.random();
        setDuel((current) => current?.round === duel.round ? lockRound(current, true, cardRoll, investmentRoll) : current);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [duel.round, duel.phase, duel.result, setDuel]);
  // Measure reserved slots, never the transformed cards, including after a resize.
  useLayoutEffect(() => {
    const measure = () => {
      // Reserve the actual layout above the canvas plus a small bottom margin.
      const board = boardRef.current;
      if (board) board.style.setProperty('--nexa-board-top', `${Math.max(0, board.getBoundingClientRect().top + window.scrollY)}px`);
      const next: Record<string, { x: number; y: number }> = {};
      for (const [key, slot] of Object.entries<HTMLDivElement | null>(slots.current)) {
        const target = key.startsWith('cpu:') ? cpuTarget.current : playerTarget.current;
        if (!slot || !target) continue;
        const from = slot.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        next[key] = { x: to.left + to.width / 2 - from.left - from.width / 2, y: to.top + to.height / 2 - from.top - from.height / 2 };
      }
      setTravel(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (boardRef.current) observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, [duel.result]);
  const movingStyle = (key: string, active: boolean): React.CSSProperties => ({
    transform: active && travel[key] ? `translate(${travel[key].x}px, ${travel[key].y}px) scale(1.18)` : 'translate(0, 0) scale(1)',
    transition: 'transform 350ms ease-out',
  });

  useEffect(() => {
    if (duel.phase === 'SELECT' || duel.result) return;
    const phase = duel.phase;
    const delays: Record<Exclude<DuelPhase, 'SELECT'>, number> = {
      LOCK: 150, CPU: 200, ENTER: 350, REVEAL: 1150, CALC: 1450,
      VS: 1150, IMPACT: 650, DAMAGE: 950, RESULT: 1400, NEXT: 700,
    };
    const timer = window.setTimeout(() => setDuel((current) => {
      if (!current || current.result || current.phase !== phase) return current;
      if (phase === 'IMPACT') {
        if (!current || !current.revealedCpu || current.playerAttack === null || current.cpuAttack === null) return current; const playerCard = current.playerCards.find((card) => card.id === current.selectedId); if (!playerCard) return current; const playerWins = current.playerAttack > current.cpuAttack; const cpuWins = current.cpuAttack > current.playerAttack; const damage = playerWins ? Math.max(1, playerCard.damage - (current.revealedCpu.abilityKind === 'BLINDAGEM' ? 2 : 0)) : cpuWins ? Math.max(1, current.revealedCpu.damage - (playerCard.abilityKind === 'BLINDAGEM' ? 2 : 0)) : 0; let playerHp = current.playerHp; let cpuHp = current.cpuHp; let playerNexos = Math.max(0, current.playerNexos - current.investment); let cpuNexos = Math.max(0, current.cpuNexos - current.cpuInvestment); if (playerWins) { cpuHp -= damage; if (playerCard.abilityKind === 'DRENO') playerHp = Math.min(12, playerHp + 1); if (playerCard.abilityKind === 'ECO') playerNexos = Math.min(12, playerNexos + 1); } if (cpuWins) { playerHp -= damage; if (current.revealedCpu.abilityKind === 'DRENO') cpuHp = Math.min(12, cpuHp + 1); if (current.revealedCpu.abilityKind === 'ECO') cpuNexos = Math.min(12, cpuNexos + 1); } const resolved: DuelState = { ...current, playerHp, cpuHp, playerNexos, cpuNexos, roundDamage: damage, roundMessage: playerWins ? `CPU sofreu -${damage} PV` : cpuWins ? `VOCÊ sofreu -${damage} PV` : 'EMPATE NO CONFRONTO', playerWins: current.playerWins + (playerWins ? 1 : 0), cpuWins: current.cpuWins + (cpuWins ? 1 : 0), phase: 'DAMAGE' }; return { ...resolved, matchSummary: completedMatch(resolved) };
      }
      // A terminal match is locked as soon as damage lands. Finish its presentation
      // before the final overlay, without returning through NEXT to the normal board.
      if (phase === 'RESULT' && current.matchSummary) {
        const result: MatchResult = current.matchSummary.winner === 'PLAYER' ? 'VICTORY' : current.matchSummary.winner === 'CPU' ? 'DEFEAT' : 'DRAW';
        return { ...current, result };
      }
      if (phase === 'NEXT') {
        return { ...current, round: current.round + 1, selectedId: null, investment: 0, cpuInvestment: 0, revealedCpu: null, playerAttack: null, cpuAttack: null, roundMessage: null, roundDamage: 0, calcStep: 1, phase: 'SELECT' };
      }
      if (phase === 'CALC') return current.calcStep < 4 ? { ...current, calcStep: current.calcStep + 1 } : { ...current, phase: 'VS' };
      const next: Partial<Record<DuelPhase, DuelPhase>> = { LOCK: 'CPU', CPU: 'ENTER', ENTER: 'REVEAL', REVEAL: 'CALC', VS: 'IMPACT', DAMAGE: 'RESULT', RESULT: 'NEXT' };
      return { ...current, phase: next[phase] || current.phase };
    }), delays[phase]);
    return () => window.clearTimeout(timer);
  }, [duel.phase, duel.calcStep, duel.result, setDuel]);
  const chooseCard = (id: string) => setDuel((current) => current && current.phase === 'SELECT' && !current.result && !current.matchSummary && !current.usedPlayer.includes(id) && current.playerCards.some((card) => card.id === id) ? { ...current, selectedId: id, investment: 0 } : current);
  const confirm = () => {
    const cardRoll = Math.random();
    const investmentRoll = Math.random();
    setDuel((current) => lockRound(current, false, cardRoll, investmentRoll));
  };
  const playing = duel.phase !== 'SELECT' || !!duel.result;
  const advancing = !duel.result && !['SELECT', 'LOCK', 'CPU', 'NEXT'].includes(duel.phase);
  const showdown = ['REVEAL', 'CALC', 'VS', 'IMPACT', 'DAMAGE', 'RESULT'].includes(duel.phase);
  const nexosActive = ['CALC', 'VS', 'IMPACT'].includes(duel.phase);
  const playerWonRound = (duel.playerAttack ?? 0) > (duel.cpuAttack ?? 0);
  const cpuWonRound = (duel.cpuAttack ?? 0) > (duel.playerAttack ?? 0);
  const cpuFaceUp = !['SELECT', 'LOCK', 'CPU', 'ENTER'].includes(duel.phase);
  const calculationStep = duel.phase === 'CALC' ? duel.calcStep : ['VS', 'IMPACT', 'DAMAGE', 'RESULT'].includes(duel.phase) ? 4 : 0;
  const roundOutcome = duel.playerAttack === duel.cpuAttack ? 'EMPATE' : duel.playerAttack! > duel.cpuAttack! ? 'VITÓRIA NA RODADA' : 'DERROTA NA RODADA';
  const stageText: Record<DuelPhase, string> = { SELECT: 'Escolha uma carta e seus Nexos', LOCK: 'Jogada confirmada', CPU: 'CPU prepara sua carta', ENTER: 'Cartas em confronto', REVEAL: 'Revelando a CPU', CALC: 'Calculando ataque', VS: 'Ataques finais', IMPACT: 'Impacto!', DAMAGE: duel.roundMessage || 'Dano aplicado', RESULT: roundOutcome, NEXT: 'Preparando próxima rodada' };
  const phonePortrait = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px) and (orientation: portrait)').matches;
  return <>{phonePortrait && <div className="fixed inset-0 z-[10000] grid place-items-center bg-[#030711] p-8 text-center text-white"><div><div className="mx-auto mb-6 text-6xl">↻</div><h2 className="text-2xl font-black text-cyan-300">GIRE O CELULAR</h2><p className="mt-3 text-sm text-slate-300">O Duelo Nexal foi preparado para jogar com o celular deitado.</p><button type="button" onClick={enterGameMode} className="mt-6 rounded-xl bg-cyan-300 px-6 py-3 font-black text-slate-950">TELA CHEIA E JOGAR</button></div></div>}<div ref={boardRef} className="duel-canvas" data-confrontation={advancing} data-showdown={showdown} data-nexos={nexosActive} data-phase={duel.phase} data-winner={playerWonRound ? 'player' : cpuWonRound ? 'cpu' : 'draw'}>
    <style>{`
      .duel-canvas { position: relative; width: min(100%, max(0px, calc((100dvh - var(--nexa-board-top, 160px) - 24px) * 16 / 9))); aspect-ratio: 16 / 9; margin-inline: auto; min-height: 0; box-sizing: border-box; overflow: hidden; isolation: isolate; container-type: inline-size; color: #eef6ff; border: 1px solid #22445a; border-radius: 1.4cqw; background: linear-gradient(145deg, #091726, #111529 60%, #0b1020); }
      .duel-layout { position: absolute; inset: 0; display: grid; grid-template-rows: 9% 38% 6% 38% 9%; min-height: 0; }
      .duel-fullscreen-button { position:absolute; z-index:90; right:1.2%; bottom:1.2%; padding:.55cqw .9cqw; border:1px solid #67e8f966; border-radius:.55cqw; background:#071827e8; color:#67e8f9; font-size:.85cqw; font-weight:900; }
      .duel-canvas:fullscreen { width:100vw!important; height:100vh!important; max-width:none!important; aspect-ratio:auto!important; border:0!important; border-radius:0!important; }

      .duel-rotate-hint { display:none; }
      @media (max-width: 639px) and (orientation: portrait) {
        .duel-canvas::after { content:'GIRE O CELULAR PARA JOGAR'; position:absolute; inset:0; z-index:100; display:grid; place-items:center; padding:2rem; background:#030711f7; color:#67e8f9; font-size:clamp(18px,5vw,28px); font-weight:900; letter-spacing:.08em; text-align:center; }
      }
      @media (orientation: landscape) and (max-width: 1100px) {
        .duel-canvas { position:fixed!important; left:0!important; top:0!important; right:auto!important; bottom:auto!important; z-index:9999!important; width:100vw!important; height:100dvh!important; max-width:none!important; max-height:100dvh!important; aspect-ratio:auto!important; margin:0!important; border:0!important; border-radius:0!important; overflow:hidden!important; padding-top:env(safe-area-inset-top)!important; padding-right:env(safe-area-inset-right)!important; padding-bottom:env(safe-area-inset-bottom)!important; padding-left:env(safe-area-inset-left)!important; }
        .duel-layout { position:absolute!important; top:env(safe-area-inset-top)!important; right:env(safe-area-inset-right)!important; bottom:env(safe-area-inset-bottom)!important; left:env(safe-area-inset-left)!important; grid-template-rows: 9% 38% 6% 38% 9%; }
        .duel-row { height:100%!important; }
        .duel-slot { height:min(94%,34dvh)!important; }
      }
      .duel-hud { display: flex; align-items: center; justify-content: space-between; gap: 1cqw; padding: 0 2cqw; min-width: 0; overflow: hidden; font-size: 1.1cqw; }
      .duel-hud > div:first-child { flex-wrap: nowrap; gap: 1cqw; font-size: 1.2cqw; white-space: nowrap; }
      .duel-hud > div:first-child > div { width: 10cqw; height: .6cqw; }
      .duel-hud p { margin: 0; max-width: 48%; text-align: right; font-size: 1cqw; line-height: 1.3; }
      .duel-round { text-align: right; color: #a5b4fc; font-weight: 800; font-size: 1.1cqw; letter-spacing: .08em; }
      .duel-row { display: flex; justify-content: center; align-items: center; gap: 1.2cqw; min-height: 0; }
      .duel-slot { position: relative; height: 94%; width: auto; aspect-ratio: .70 / 1; flex: 0 0 auto; min-width: 0; min-height: 0; border-radius: .8cqw; background: #050d18; box-shadow: inset 0 0 0 1px #ffffff14; }
      /* Keep shared ancestors open so movers use the canvas stacking context. */
      .duel-layout, .duel-row, .duel-slot { z-index: auto; isolation: auto; }
      .duel-mover, .duel-hud, .duel-gap { z-index: 1; }
      .duel-slot[data-active="true"] > .duel-mover { z-index: 30; }
      /* Lift the original moving elements above the scrim; never clone/remount cards. */
      .duel-confrontation { position: absolute; inset: 0; z-index: 20; background: radial-gradient(circle at 50% 50%, #17255444 0 15%, #030915d9 48%, #020611f2 100%); pointer-events: none; }
      .duel-confrontation::after { content: ''; position: absolute; left: 18%; right: 18%; top: 50%; height: 1px; background: linear-gradient(90deg, transparent, #67e8f966, #c4b5fd88, #67e8f966, transparent); box-shadow: 0 0 2.2cqw #67e8f944; opacity: .8; }
      .duel-canvas[data-confrontation="true"] .duel-slot:not([data-active="true"]) .duel-mover { opacity: .22; }
      .duel-canvas[data-confrontation="true"] .duel-hud { opacity: .55; }
      .duel-canvas[data-confrontation="true"] .duel-gap { visibility: hidden; }
      .duel-mover { position: absolute; inset: 0; display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; perspective: 900px; transform-origin: center; }
      button.duel-mover { cursor: pointer; }
      button.duel-mover:disabled { cursor: default; }
      button.duel-mover:focus-visible { outline: 2px solid #67e8f9; outline-offset: 3px; }
      .duel-motion-content { position: absolute; inset: 0; width: 100%; height: 100%; }
      .duel-canvas[data-showdown="true"] .duel-slot[data-active="true"] .duel-motion-content { filter: drop-shadow(0 0 1.2cqw #22d3ee55); }
      .duel-canvas[data-phase="REVEAL"] .duel-slot[data-active="true"] .duel-motion-content { animation: nexa-reveal-pulse 700ms ease-out; }
      .duel-canvas[data-phase="CALC"] .duel-slot[data-active="true"] .duel-motion-content { animation: nexa-charge 560ms ease-in-out infinite alternate; }
      .duel-canvas[data-phase="VS"] .duel-slot[data-active="true"] .duel-motion-content { animation: nexa-ready 520ms ease-out; }
      .duel-spent-nexos { position: absolute; z-index: 42; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: .25cqw; pointer-events: none; font-size: .72cqw; font-weight: 900; letter-spacing: .08em; color: #fde047; text-shadow: 0 0 .8cqw #facc15aa; }
      .duel-spent-cpu { top: 38%; --nexo-flight: -3.4cqw; }
      .duel-spent-player { bottom: 38%; --nexo-flight: 3.4cqw; color: #67e8f9; text-shadow: 0 0 .8cqw #22d3eeaa; }
      .duel-spent-gems { display: flex; justify-content: center; gap: .22cqw; }
      .duel-spent-gems span { opacity: 0; animation: nexa-spent-gem 620ms ease-out forwards; animation-delay: calc(var(--nexo-i) * 90ms); }
      .duel-canvas[data-phase="CALC"] .duel-spent-gems span { animation: nexa-spent-gem-charge 1150ms cubic-bezier(.2,.7,.2,1) forwards; animation-delay: calc(var(--nexo-i) * 120ms); }
      .duel-canvas[data-phase="CALC"] .duel-spent-nexos strong { animation: nexa-nexo-label 1350ms ease-out both; }
      .duel-canvas[data-phase="VS"] .duel-spent-gems span { opacity: .2; transform: translateY(var(--nexo-flight)) scale(.25); }
      .duel-canvas[data-phase="IMPACT"] .duel-spent-nexos { opacity: 0; }
      .duel-canvas[data-phase="IMPACT"] .duel-confrontation::before { content: ''; position: absolute; z-index: 3; left: 50%; top: 50%; width: 8cqw; height: 8cqw; transform: translate(-50%,-50%); border-radius: 999px; background: radial-gradient(circle,#fff 0 3%,#67e8f9bb 8%,#a78bfa66 25%,transparent 67%); animation: nexa-burst 520ms ease-out forwards; }
      .duel-canvas[data-phase="IMPACT"][data-winner="player"] .duel-row[aria-label="Suas cartas"] .duel-slot[data-active="true"] .duel-motion-content { animation: nexa-strike-up 620ms cubic-bezier(.2,.85,.25,1); }
      .duel-canvas[data-phase="IMPACT"][data-winner="cpu"] .duel-row[aria-label="Cartas da CPU"] .duel-slot[data-active="true"] .duel-motion-content { animation: nexa-strike-down 620ms cubic-bezier(.2,.85,.25,1); }
      .duel-canvas[data-phase="DAMAGE"][data-winner="player"] .duel-hud:first-child { animation: nexa-hud-hit 720ms ease-out; }
      .duel-canvas[data-phase="DAMAGE"][data-winner="cpu"] .duel-hud:last-child { animation: nexa-hud-hit 720ms ease-out; }
      .duel-portrait { position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; min-width: 0; aspect-ratio: .70 / 1; box-sizing: border-box; overflow: hidden; border: 1px solid #627393; border-radius: .8cqw; background: #0d1b2c; }
      .duel-portrait[data-selected="true"] { border-color: #67e8f9; box-shadow: 0 0 1.2cqw #22d3ee55; }
      .duel-portrait[data-used="true"], .duel-turn[data-used="true"] { opacity: .35; filter: grayscale(1); }
       .duel-front { display: grid; grid-template-rows: 7% 10% minmax(0, 1fr) 9% 8%; padding: .45cqw; gap: .12cqw; }
      .duel-meta { display: flex; align-items: center; justify-content: space-between; gap: .3cqw; overflow: hidden; font-size: .68cqw; text-transform: uppercase; color: #a5b4fc; white-space: nowrap; }
      .duel-name { align-self: center; margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; font-size: 1.12cqw; font-weight: 900; line-height: 1.1; }
       .duel-art { position: relative; display: grid; place-items: center; min-height: 0; overflow: hidden; border-block: 1px solid #ffffff1c; background: linear-gradient(150deg, #1c3b52, #282347); font-size: 5.3cqw; line-height: 1; }
      .duel-art > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; }
      .duel-card-stats { display: flex; align-items: center; justify-content: space-between; gap: .4cqw; min-width: 0; overflow: hidden; font-size: .78cqw; white-space: nowrap; }
      .duel-card-stats b { color: #67e8f9; }
      .duel-card-stats span:last-child b { color: #fda4af; }
      .duel-ability { align-self: center; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; font-size: .72cqw; line-height: 1; color: #cbd5e1; }
      .duel-back { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1cqw; border-color: #8b7ac9; background: repeating-linear-gradient(135deg, #ffffff03 0 1px, transparent 1px 1cqw), linear-gradient(145deg, #142039, #241c3a); }
      .duel-back::before { content: ''; position: absolute; inset: .7cqw; border: 1px solid #a5b4fc40; border-radius: .5cqw; }
      .duel-back strong { font-size: 1.5cqw; letter-spacing: .2em; color: #ddd6fe; }
      .duel-back span { font-size: 5cqw; line-height: 1; color: #67e8f9; }
      .duel-back small { font-size: .75cqw; letter-spacing: .1em; color: #c4b5fd; }
      .duel-turn { position: absolute; inset: 0; width: 100%; height: 100%; transform-style: preserve-3d; }
      .duel-turn-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      .duel-gap { display: flex; align-items: center; justify-content: center; min-height: 0; pointer-events: none; }
      .duel-gap p { margin: 0; font-size: 1.05cqw; font-weight: 800; letter-spacing: .16em; color: #a5c5d9; }
      .duel-gap strong { font-size: 1.8cqw; color: #c4b5fd; }
      .duel-anchor { position: absolute; top: 50%; width: 0; height: 0; pointer-events: none; }
      .duel-anchor-cpu { left: 32%; }
      .duel-anchor-player { left: 68%; }
      .duel-invest { position: absolute; right: 1%; top: 23%; width: 16%; }
      .duel-invest-panel { padding: .8cqw; border: 1px solid #67e8f940; border-radius: .8cqw; background: #071827; text-align: center; font-size: 1cqw; }
      .duel-invest-panel > strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #67e8f9; }
      .duel-invest-panel p { margin: .7cqw 0; line-height: 1.3; }
      .duel-invest-ability { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; color: #cbd5e1; }
      .duel-invest-controls { display: flex; align-items: center; justify-content: center; gap: .8cqw; }
      .duel-invest-controls button { width: 3cqw; height: 3cqw; border: 1px solid #67e8f94d; border-radius: .4cqw; font-size: 2cqw; }
      .duel-invest-controls strong { font-size: 1.5cqw; color: #fde68a; }
      .duel-confirm { width: 100%; padding: .9cqw .2cqw; border-radius: .5cqw; background: #fbbf24; color: #071827; font-size: .85cqw; font-weight: 900; }
      .duel-invest button:disabled { opacity: .35; cursor: default; }
      .duel-calculation { width: 100%; box-sizing: border-box; padding: .4cqw; font-size: 1cqw; line-height: 1.3; }
      .duel-calculation span, .duel-calculation > strong { display: flex; justify-content: space-between; gap: .3cqw; margin: .2cqw 0; animation: duel-value-in 200ms ease-out; }
      .duel-calculation > strong { color: #fde68a; border-top: 1px solid #fde68a55; padding-top: .4cqw; }
      .duel-calculation b { color: #67e8f9; }
      @keyframes duel-value-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      .duel-announcement { position: absolute; z-index: 40; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; width: 18%; box-sizing: border-box; padding: .65cqw .5cqw; overflow-wrap: anywhere; background: #07101ed9; border: 1px solid #67e8f955; border-radius: 999px; pointer-events: none; text-align: center; box-shadow: 0 0 2.4cqw #22d3ee22; animation: nexa-announcement-in 260ms ease-out; }
      .duel-announcement small { font-size: .85cqw; color: #cbd5e1; }
      .duel-announcement strong { font-size: 2cqw; color: #fde68a; }
      .duel-round-result { animation:nexa-round-result 1.25s ease-out both; }
      .duel-next-round { position:absolute; inset:0; z-index:38; display:grid; place-items:center; pointer-events:none; background:radial-gradient(circle at center,#0f274044 0,transparent 42%); }
      .duel-next-round span { padding:.55cqw 1.3cqw; border-top:1px solid #67e8f966; border-bottom:1px solid #67e8f966; color:#bae6fd; font-size:1.05cqw; font-weight:900; letter-spacing:.24em; text-shadow:0 0 1cqw #22d3eeaa; animation:nexa-next-round 650ms ease-out both; }
      .duel-canvas[data-phase="NEXT"] .duel-slot[data-active="true"] .duel-motion-content { animation:nexa-card-return 650ms ease-in both; }
      @keyframes nexa-round-result { 0%{opacity:0;transform:translate(-50%,-50%) scale(.72)} 18%{opacity:1;transform:translate(-50%,-50%) scale(1.06)} 72%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:.15;transform:translate(-50%,-50%) scale(.94)} }
      @keyframes nexa-next-round { 0%{opacity:0;transform:scaleX(.45)} 35%{opacity:1;transform:scaleX(1.04)} 75%{opacity:1} 100%{opacity:0;transform:scaleX(1)} }
      @keyframes nexa-card-return { 0%{opacity:1;filter:brightness(1.15)} 70%{opacity:.72;filter:brightness(.8) grayscale(.35)} 100%{opacity:.35;filter:grayscale(1)} }
      .duel-versus { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: .7cqw; width: 100%; }
      .duel-versus b { font-size: 2.7cqw; font-variant-numeric: tabular-nums; }
      .duel-versus span { font-size: 1.4cqw; color: #c4b5fd; }
      .duel-attack-meter { display:grid; grid-template-columns:1fr 1fr; gap:.35cqw; width:100%; height:.32cqw; margin-top:.2cqw; }
      .duel-attack-meter i { display:block; width:0; height:100%; border-radius:999px; background:linear-gradient(90deg,#f59e0b,#fde047); box-shadow:0 0 .7cqw #facc1588; animation:nexa-attack-count 900ms cubic-bezier(.15,.75,.2,1) forwards; }
      .duel-attack-meter i:last-child { justify-self:end; background:linear-gradient(90deg,#22d3ee,#a78bfa); box-shadow:0 0 .7cqw #22d3ee88; }
      .duel-canvas[data-phase="IMPACT"] .duel-attack-race { animation:nexa-announcement-hit 650ms ease-out both; }
      @keyframes nexa-attack-count { from { width:0; opacity:.35; } to { width:min(calc(var(--attack) * 5%),100%); opacity:1; } }
      @keyframes nexa-announcement-hit { 0% { transform:translate(-50%,-50%) scale(1); } 35% { transform:translate(-50%,-50%) scale(1.08); filter:brightness(1.45); } 100% { transform:translate(-50%,-50%) scale(.96); opacity:.25; } }
      .duel-damage { position: absolute; z-index: 40; top: 28%; transform: translateX(-50%); color: #fda4af; text-shadow: 0 2px 5px #000; font-size: 3cqw; font-weight: 900; pointer-events: none; animation: duel-damage-in 800ms ease-out; }
      .duel-damage-cpu { left: 32%; animation-name: duel-damage-to-cpu; }
      .duel-damage-player { left: 68%; animation-name: duel-damage-to-player; }
      .duel-ability-flash { position:absolute; z-index:43; left:50%; transform:translateX(-50%); padding:.35cqw .8cqw; border-radius:999px; font-size:.78cqw; letter-spacing:.08em; pointer-events:none; animation:nexa-ability-pop 850ms ease-out both; }
      .duel-ability-cpu { top:35%; }
      .duel-ability-player { bottom:35%; }
      .duel-ability-dreno { color:#f0abfc; border:1px solid #e879f955; background:#581c8755; box-shadow:0 0 1.5cqw #d946ef44; }
      .duel-ability-eco { color:#67e8f9; border:1px solid #22d3ee55; background:#164e6355; box-shadow:0 0 1.5cqw #22d3ee44; }
      .duel-ability-impulso { color:#fde68a; border:1px solid #facc1555; background:#713f1255; box-shadow:0 0 1.5cqw #facc1544; }
      .duel-ability-blindagem { color:#bfdbfe; border:1px solid #60a5fa55; background:#1e3a8a55; box-shadow:0 0 1.5cqw #60a5fa44; }
      @keyframes nexa-ability-pop { 0%{opacity:0;transform:translateX(-50%) scale(.65)} 25%{opacity:1;transform:translateX(-50%) scale(1.08)} 72%{opacity:1} 100%{opacity:0;transform:translateX(-50%) translateY(-.35cqw) scale(.96)} }
      @keyframes duel-damage-in { from { opacity: 0; margin-top: 1cqw; } 25% { opacity: 1; } to { margin-top: -1cqw; } }
      @keyframes duel-damage-to-cpu { 0% { opacity:0; transform:translate(-50%,1.2cqw) scale(.65); } 25% { opacity:1; transform:translate(-50%,0) scale(1.22); } 68% { opacity:1; transform:translate(-50%,-2.8cqw) scale(1); } 100% { opacity:0; transform:translate(-50%,-5cqw) scale(.78); } }
      @keyframes duel-damage-to-player { 0% { opacity:0; transform:translate(-50%,-1.2cqw) scale(.65); } 25% { opacity:1; transform:translate(-50%,0) scale(1.22); } 68% { opacity:1; transform:translate(-50%,2.8cqw) scale(1); } 100% { opacity:0; transform:translate(-50%,5cqw) scale(.78); } }
      .duel-turn[data-used="true"] .duel-portrait { opacity: 1; filter: none; }
      .duel-round span { font-size: 1cqw; color: #67e8f9; }
      .duel-finish { position: absolute; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2cqw; background: #07101ef5; text-align: center; }
      .duel-finish > span { color: #67e8f9; font-size: 1cqw; letter-spacing: .2em; }
      .duel-finish::before { content:''; position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 50% 42%,#22d3ee20,transparent 34%); animation:nexa-finish-bg 1.1s ease-out both; }
      .duel-finish[data-result="player"]::before { background:radial-gradient(circle at 50% 42%,#facc1530,transparent 36%); }
      .duel-finish[data-result="cpu"]::before { background:radial-gradient(circle at 50% 42%,#fb718525,transparent 36%); }
      .duel-finish > *:not(.duel-finish-burst) { position:relative; z-index:2; animation:nexa-finish-content .7s ease-out both; }
      .duel-finish h2 { text-shadow:0 0 2cqw #facc1555; animation:nexa-finish-title .9s cubic-bezier(.2,.8,.2,1) both !important; }
      .duel-finish[data-result="cpu"] h2 { color:#fda4af; text-shadow:0 0 2cqw #fb718555; }
      .duel-finish[data-result="draw"] h2 { color:#c4b5fd; text-shadow:0 0 2cqw #a78bfa55; }
      .duel-finish-burst { position:absolute; z-index:1; left:50%; top:42%; width:18cqw; height:18cqw; transform:translate(-50%,-50%); pointer-events:none; }
      .duel-finish-burst i { position:absolute; inset:50%; border:1px solid #67e8f977; border-radius:50%; animation:nexa-finish-ring 1.15s ease-out both; }
      .duel-finish-burst i:nth-child(2){animation-delay:.12s}.duel-finish-burst i:nth-child(3){animation-delay:.24s}
      .duel-rewards { min-width:20cqw; padding:.7cqw 1.2cqw; border:1px solid #67e8f933; border-radius:.8cqw; background:#071827aa; box-shadow:inset 0 0 1.5cqw #22d3ee11; }
      .duel-rewards strong { color:#67e8f9; letter-spacing:.12em; }
      @keyframes nexa-finish-bg { from{opacity:0;transform:scale(.7)} to{opacity:1;transform:scale(1)} }
      @keyframes nexa-finish-content { from{opacity:0;transform:translateY(1cqw)} to{opacity:1;transform:translateY(0)} }
      @keyframes nexa-finish-title { 0%{opacity:0;transform:scale(.45);letter-spacing:.45em} 55%{opacity:1;transform:scale(1.12);letter-spacing:.12em} 100%{transform:scale(1);letter-spacing:.04em} }
      @keyframes nexa-finish-ring { 0%{opacity:.9;transform:translate(-50%,-50%) scale(.1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.35)} }
      .duel-finish h2 { margin: 0; color: #fde68a; font-size: 4cqw; font-weight: 900; }
      .duel-finish p { margin: 0; font-size: 1.4cqw; }
      .duel-finish > div { display: flex; gap: 1cqw; margin-top: 1cqw; }
      .duel-finish button { padding: 1.2cqw 2cqw; border: 1px solid #67e8f955; border-radius: .7cqw; font-size: 1.2cqw; font-weight: 800; background: #193a4e; }
      .duel-finish button:first-child { background: #67e8f9; color: #07101e; }
      .nexa-impact { animation: nexa-impact 520ms ease-out; }
      .nexa-defeated { box-shadow:0 0 2.2cqw #fb718555; }
      .duel-canvas[data-phase="DAMAGE"][data-winner="player"] .duel-row[aria-label="Suas cartas"] .duel-slot[data-active="true"] .duel-motion-content,
      .duel-canvas[data-phase="DAMAGE"][data-winner="cpu"] .duel-row[aria-label="Cartas da CPU"] .duel-slot[data-active="true"] .duel-motion-content { animation:nexa-winner-hold 900ms ease-out; z-index:6; }
      @keyframes nexa-winner-hold { 0% { transform:scale(1.08); filter:brightness(1.55); } 35% { transform:scale(1.13); filter:brightness(1.3) drop-shadow(0 0 1.4cqw #fde04766); } 100% { transform:scale(1.04); filter:brightness(1.08); } }
      @keyframes nexa-impact { 0% { transform: translateX(0); } 18% { transform: translateX(-.35cqw); filter: brightness(2); } 32% { transform: translateX(.45cqw); } 48% { transform: translateX(-.25cqw); } 70% { transform: translateX(.12cqw); } 100% { transform: translateX(0); filter: brightness(.85); } }
      .nexa-clash { animation: nexa-clash 620ms cubic-bezier(.2,.8,.2,1); }
      @keyframes nexa-clash { 0% { transform: scale(1); } 35% { transform: scale(1.1); filter: brightness(1.7); } 48% { transform: scale(.97); } 70% { transform: scale(1.035); } 100% { transform: scale(1); filter: brightness(1); } }
      @keyframes nexa-reveal-pulse { 0% { transform: scale(.94); opacity: .55; } 55% { transform: scale(1.055); filter: brightness(1.55); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes nexa-charge { from { filter: drop-shadow(0 0 .5cqw #22d3ee55) brightness(1); } to { filter: drop-shadow(0 0 1.8cqw #a78bfa88) brightness(1.16); } }
      @keyframes nexa-ready { 0% { transform: scale(1); } 45% { transform: scale(1.045); } 100% { transform: scale(1); } }
      @keyframes nexa-announcement-in { from { opacity: 0; transform: translate(-50%, -50%) scale(.75); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      @keyframes nexa-spent-gem { 0% { opacity: 0; transform: translateY(1.4cqw) scale(.45); } 65% { opacity: 1; transform: translateY(-.15cqw) scale(1.25); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes nexa-spent-gem-charge { 0% { opacity: 0; transform: translateY(0) scale(.35); } 16% { opacity: 1; transform: translateY(0) scale(1.28); filter: brightness(1.9); } 46% { opacity: 1; transform: translateY(0) scale(1.08); filter: brightness(1.55); } 82% { opacity: 1; transform: translateY(var(--nexo-flight)) scale(.78); filter: brightness(2.25); } 100% { opacity: 0; transform: translateY(var(--nexo-flight)) scale(.15); filter: brightness(2.8); } }
      @keyframes nexa-nexo-label { 0%,18% { opacity: 0; transform: scale(.85); } 38%,75% { opacity: 1; transform: scale(1); } 100% { opacity: .25; transform: scale(.94); } }
      @keyframes nexa-burst { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.2); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%,-50%) scale(2.8); } }
      @keyframes nexa-strike-up { 0% { transform: translateY(0) scale(1); } 32% { transform: translateY(-5.5cqw) scale(1.08) rotate(-1deg); filter: brightness(1.55); } 46% { transform: translateY(-6.2cqw) scale(1.11); } 72% { transform: translateY(-1.2cqw) scale(1.02); } 100% { transform: translateY(0) scale(1); } }
      @keyframes nexa-strike-down { 0% { transform: translateY(0) scale(1); } 32% { transform: translateY(5.5cqw) scale(1.08) rotate(1deg); filter: brightness(1.55); } 46% { transform: translateY(6.2cqw) scale(1.11); } 72% { transform: translateY(1.2cqw) scale(1.02); } 100% { transform: translateY(0) scale(1); } }
      @keyframes nexa-hud-hit { 0% { filter: none; transform: translateX(0); } 16% { filter: brightness(1.9); transform: translateX(-.45cqw); } 30% { transform: translateX(.35cqw); } 45% { transform: translateX(-.2cqw); } 70% { filter: brightness(1.15); transform: translateX(.08cqw); } 100% { filter: none; transform: translateX(0); } }
    `}</style>
    {!gameFullscreen && <button type="button" onClick={enterGameMode} className="duel-fullscreen-button">⛶ TELA CHEIA</button>}
    <div className="duel-layout">
      <header className="duel-hud">
        <DuelStats label="CPU" hp={duel.cpuHp} nexos={duel.cpuNexos} />
        <div className="duel-round">DUELO NEXAL · RODADA {duel.round}/{MAX_ROUNDS}<br /><span title="Ao zerar: carta disponível com 0 Nexos" role="timer">◷ {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')} · {duel.phase === 'SELECT' ? 'TEMPO DA RODADA' : 'PAUSADO'}</span></div>
      </header>
      <div className="duel-row" aria-label="Cartas da CPU">
        {duel.cpuCards.map((card) => {
          const active = playing && duel.revealedCpu?.id === card.id;
          const used = duel.usedCpu.includes(card.id);
          return <div key={card.id} ref={(node) => { slots.current['cpu:' + card.id] = node; }} className="duel-slot" data-active={active}>
            <div className="duel-mover" style={movingStyle('cpu:' + card.id, active && advancing)}>
              <div className={`duel-motion-content ${active && duel.phase === 'DAMAGE' && duel.cpuAttack! < duel.playerAttack! ? 'nexa-impact nexa-defeated' : active && duel.phase === 'IMPACT' ? 'nexa-clash' : ''}`}>
                <FlipCard card={card} active={active} revealed={active ? cpuFaceUp : used} used={used && !active} details={active && calculationStep > 0 ? <AttackBreakdown card={card} nexos={duel.cpuInvestment} attack={duel.cpuAttack!} step={calculationStep} /> : undefined} />
              </div>
            </div>
          </div>;
        })}
      </div>
      <SpentNexos count={duel.cpuInvestment} side="cpu" visible={nexosActive} />
      <SpentNexos count={duel.investment} side="player" visible={nexosActive} />
      <div className="duel-gap">
        {!playing && !selectedCard ? <p>ESCOLHA SEU CAMPEÃO</p> : <strong>VS</strong>}
      </div>
      <div className="duel-row" aria-label="Suas cartas">
        {duel.playerCards.map((card) => {
          const active = playing && duel.selectedId === card.id;
          const used = duel.usedPlayer.includes(card.id);
          return <div key={card.id} ref={(node) => { slots.current['player:' + card.id] = node; }} className="duel-slot" data-active={active}>
            <button type="button" aria-label={`${card.name}${used ? ', usada' : ''}`} aria-pressed={duel.selectedId === card.id} disabled={used || playing} onClick={() => chooseCard(card.id)} className="duel-mover" style={movingStyle('player:' + card.id, active && advancing)}>
              <div className={`duel-motion-content ${active && duel.phase === 'DAMAGE' && duel.playerAttack! < duel.cpuAttack! ? 'nexa-impact nexa-defeated' : active && duel.phase === 'IMPACT' ? 'nexa-clash' : ''}`}>
                <DuelPortrait card={card} selected={duel.selectedId === card.id} used={used && !active} details={active && calculationStep > 0 ? <AttackBreakdown card={card} nexos={duel.investment} attack={duel.playerAttack!} step={calculationStep} /> : undefined} />
              </div>
            </button>
          </div>;
        })}
      </div>
      <footer className="duel-hud">
        <DuelStats label="VOCÊ" hp={duel.playerHp} nexos={duel.playerNexos} player />
        <p role="status" aria-live="polite">{stageText[duel.phase]}</p>
      </footer>
    </div>
    {advancing && <div className="duel-confrontation" aria-hidden="true" />}
    <div ref={cpuTarget} className="duel-anchor duel-anchor-cpu" />
    <div ref={playerTarget} className="duel-anchor duel-anchor-player" />
    {!playing && selectedCard && <aside className="duel-invest"><InvestPanel card={selectedCard} duel={duel} setDuel={setDuel} confirm={confirm} /></aside>}
    {['VS', 'IMPACT'].includes(duel.phase) && <div className="duel-announcement duel-attack-race" role="status"><small>ATAQUE · CPU × VOCÊ</small><strong className="duel-versus"><b>{duel.cpuAttack}</b><span>VS</span><b>{duel.playerAttack}</b></strong><div className="duel-attack-meter"><i style={{ '--attack': Math.max(1, duel.cpuAttack ?? 1) } as React.CSSProperties} /><i style={{ '--attack': Math.max(1, duel.playerAttack ?? 1) } as React.CSSProperties} /></div></div>}
    {duel.phase === 'DAMAGE' && <div className={`duel-damage ${duel.playerAttack! > duel.cpuAttack! ? 'duel-damage-cpu' : 'duel-damage-player'}`} role="status">{duel.roundDamage ? `−${duel.roundDamage} PV` : 'SEM DANO'}</div>}
    {duel.phase === 'RESULT' && <div className="duel-announcement duel-round-result" role="status"><small>RESULTADO DA RODADA</small><strong>{roundOutcome}</strong><small>{duel.roundMessage}</small></div>}
    {duel.phase === 'NEXT' && <div className="duel-next-round" aria-hidden="true"><span>RODADA {Math.min(MAX_ROUNDS, duel.round + 1)}</span></div>}
    {duel.result && duel.matchSummary && <DuelResult summary={duel.matchSummary} rewardStatus={rewardStatus.requestId === duel.requestId ? rewardStatus : { requestId: duel.requestId, status: 'pending' }} onAgain={() => { setSecondsLeft(ROUND_TIME_SECONDS); setDuel(freshDuel(duel.playerCards)); }} onGames={onGames} />}
  </div></>;};

// Battle-only presentation: deck selection keeps its existing BattleCard markup.
const DuelPortrait: React.FC<{ card: ArenaCard; selected?: boolean; used?: boolean; hidden?: boolean; details?: React.ReactNode }> = ({ card, selected = false, used = false, hidden = false, details }) => hidden
  ? <div className="duel-portrait duel-back"><strong>NEXA</strong><span>◇</span><small>CARTA OCULTA</small></div>
  : <div className="duel-portrait duel-front" data-selected={selected} data-used={used}>
    <div className="duel-meta"><span>{card.element} · {card.rarity}</span><span>{used ? 'USADA' : 'NEXA'}</span></div>
    <p className="duel-name" title={card.name}>{card.name}</p>
    <div className="duel-art">{details || <CardImage templateId={card.id} alt={card.name} className="h-full w-full object-cover" loading="lazy" />}</div>
    <div className="duel-card-stats"><span><b>PODER</b> {card.power}</span><span><b>DANO</b> {card.damage}</span></div>
    <p className="duel-ability" title={card.ability}>{card.ability}</p>
  </div>;
const AttackBreakdown: React.FC<{ card: ArenaCard; nexos: number; attack: number; step: number }> = ({ card, nexos, attack, step }) => {
  // The final value comes from the existing attackValue calculation at confirmation.
  const nexoAttack = nexos * 2;
  const bonus = attack - card.power - nexoAttack;
  return <div className="duel-calculation">
    <span>PODER <b>{card.power}</b></span>
    {step >= 2 && <span>+ NEXOS ({nexos} × 2) <b>{nexoAttack}</b></span>}
    {step >= 3 && <span>{bonus ? '+ BÔNUS · IMPULSO' : 'BÔNUS DE ATAQUE'} <b>{bonus ? `+${bonus}` : '—'}</b></span>}
    {step >= 4 && <strong>= ATAQUE FINAL <b>{attack}</b></strong>}
  </div>;
};
const AbilityFlash: React.FC<{ card?: ArenaCard; won: boolean; visible: boolean; side: 'cpu' | 'player' }> = ({ card, won, visible, side }) => {
  if (!visible || !card || !won) return null;
  const text = card.abilityKind === 'DRENO' ? 'DRENO · +1 PV' : card.abilityKind === 'ECO' ? 'ECO · +1 NEXO' : card.abilityKind === 'IMPULSO' ? 'IMPULSO ATIVO' : card.abilityKind === 'BLINDAGEM' ? 'BLINDAGEM' : card.ability;
  return <div className={`duel-ability-flash duel-ability-${side} duel-ability-${card.abilityKind.toLowerCase()}`}><strong>{text}</strong></div>;
};
const DuelStats: React.FC<{ label: string; hp: number; nexos: number; player?: boolean }> = ({ label, hp, nexos, player = false }) => <div className="flex items-center gap-x-2 text-[10px] font-bold whitespace-nowrap"><span className={player ? 'text-cyan-300' : 'text-rose-300'}>{label}</span><span>{hp}/12 PV</span><LifeBar hp={hp} player={player} /><span className={player ? 'text-cyan-300' : 'text-amber-300'}>◆ {nexos}</span></div>;
const InvestPanel: React.FC<{ card: ArenaCard; duel: DuelState; setDuel: React.Dispatch<React.SetStateAction<DuelState | null>>; confirm: () => void }> = ({ card, duel, setDuel, confirm }) => <div className="duel-invest-panel">
  <strong>{card.name}</strong>
  <p>PODER {card.power} · DANO {card.damage}</p>
  <p className="duel-invest-ability">{card.ability || 'Sem habilidade'}</p>
  <p>◆ {duel.playerNexos} Nexos disponíveis</p>
  <div className="duel-invest-controls">
    <button type="button" aria-label="Diminuir Nexos" disabled={duel.phase !== 'SELECT' || duel.investment <= 0} onClick={() => setDuel((current) => current?.phase === 'SELECT' ? { ...current, investment: Math.max(0, current.investment - 1) } : current)}>−</button>
    <strong>{duel.investment}</strong>
    <button type="button" aria-label="Aumentar Nexos" disabled={duel.phase !== 'SELECT' || duel.investment >= duel.playerNexos} onClick={() => setDuel((current) => current?.phase === 'SELECT' ? { ...current, investment: Math.min(current.playerNexos, current.investment + 1) } : current)}>+</button>
  </div>
  <p>ATAQUE PREVISTO <b>{attackValue(card, duel.investment)}</b></p>
  <button type="button" className="duel-confirm" disabled={duel.phase !== 'SELECT'} onClick={confirm}>CONFIRMAR JOGADA</button>
</div>;
const LifeBar: React.FC<{ hp: number; player?: boolean }> = ({ hp, player = false }) => <div className="h-2 w-20 overflow-hidden rounded-full bg-black/50 sm:w-32"><div className={`h-full transition-[width] duration-700 ease-out ${player ? 'bg-gradient-to-r from-cyan-400 to-emerald-300' : 'bg-gradient-to-r from-rose-500 to-orange-400'}`} style={{ width: `${Math.max(0, hp) / 12 * 100}%` }} /></div>;
const NexoBar: React.FC<{ count: number; highlighted?: boolean; player?: boolean }> = ({ count, highlighted = false, player = false }) => <div className={`grid grid-cols-6 gap-[2px] text-[7px] leading-none ${highlighted || player ? 'text-cyan-300' : 'text-amber-300'}`} aria-label={`${count} de 12 Nexos`}>{Array.from({ length: 12 }, (_, index) => <span key={index} className={index < count ? 'opacity-100 drop-shadow-[0_0_4px_currentColor]' : 'opacity-15'}>◆</span>)}</div>;
const SpentNexos: React.FC<{ count: number; side: 'cpu' | 'player'; visible: boolean }> = ({ count, side, visible }) => visible && count > 0 ? <div className={`duel-spent-nexos duel-spent-${side}`} aria-label={`${count} Nexos investidos`}><div className="duel-spent-gems">{Array.from({ length: count }, (_, index) => <span key={index} style={{ '--nexo-i': index } as React.CSSProperties}>◆</span>)}</div><strong>+{count} NEXOS</strong></div> : null;
const HiddenCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => <div className={`relative flex ${compact ? 'min-h-[110px]' : 'h-[205px] w-[150px] sm:h-[220px] sm:w-[168px]'} w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-purple-300/50 bg-[radial-gradient(circle_at_50%_35%,rgba(97,58,178,.55),transparent_35%),linear-gradient(145deg,#11162e,#090b19)] text-center shadow-[inset_0_0_25px_rgba(168,85,247,.22),0_0_16px_rgba(168,85,247,.18)]`}><div className="absolute inset-2 rounded-lg border border-cyan-300/20" /><span className="relative font-heading text-sm font-black tracking-[.25em] text-purple-200">NEXA</span><span className="relative my-1 text-3xl text-cyan-300 drop-shadow-[0_0_10px_currentColor]">◇</span><span className="relative text-[7px] font-bold uppercase tracking-[.2em] text-purple-300">DUEL<br />CARTA OCULTA</span></div>;
const DuelResult: React.FC<{ summary: ArenaMatchSummary; rewardStatus: RewardStatus; onAgain: () => void; onGames: () => void }> = ({ summary, rewardStatus, onAgain, onGames }) => <div className="duel-finish" data-result={summary.winner.toLowerCase()} role="dialog" aria-modal="true" aria-labelledby="duel-final-title">
  <div className="duel-finish-burst" aria-hidden="true"><i /><i /><i /></div>
  <span>NEXA · FIM DA PARTIDA</span>
  <h2 id="duel-final-title">{summary.winner === 'PLAYER' ? 'VITÓRIA' : summary.winner === 'CPU' ? 'DERROTA' : 'EMPATE'}</h2>
  <p>PV FINAL · VOCÊ {summary.playerFinalHp} × CPU {summary.cpuFinalHp}</p>
  <p>RODADAS VENCIDAS · VOCÊ {summary.playerRoundsWon} × CPU {summary.cpuRoundsWon}</p>
  <p>NEXOS RESTANTES · VOCÊ {summary.playerNexosRemaining} × CPU {summary.cpuNexosRemaining}</p>
  <p>{summary.roundsPlayed}/{MAX_ROUNDS} RODADAS DISPUTADAS</p>
  <section className="duel-rewards" aria-live="polite" style={{ fontSize: '1.4cqw' }}>
    {rewardStatus.status === 'pending' && <p>Calculando recompensas...</p>}
    {rewardStatus.status === 'error' && <p>Não foi possível registrar a recompensa.</p>}
    {rewardStatus.status === 'success' && rewardStatus.rewards && <>
      <strong>RECOMPENSAS</strong>
      <p>+ {rewardStatus.rewards.nex} NEX · + {rewardStatus.rewards.xp} XP</p>
      {rewardStatus.rewards.nxa > 0 && <p>+ {rewardStatus.rewards.nxa} NXA</p>}
      {rewardStatus.rewards.levelUps > 0 && <p>LEVEL UP!</p>}
      {!rewardStatus.rewards.profileSynced && <p>Recompensa registrada. Atualização do perfil pendente.</p>}
    </>}
  </section>
  <div><button type="button" autoFocus onClick={onAgain}>JOGAR NOVAMENTE</button><button type="button" onClick={onGames}>VOLTAR AOS JOGOS</button></div>
</div>;
const FlipCard: React.FC<{ card: ArenaCard; active: boolean; revealed: boolean; used: boolean; details?: React.ReactNode }> = ({ card, active, revealed, used, details }) => <div className="duel-turn" data-used={used} style={{ transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: active ? 'transform 450ms ease-out' : 'none' }}><div className="duel-turn-face"><DuelPortrait card={card} hidden /></div><div className="duel-turn-face" style={{ transform: 'rotateY(180deg)' }}><DuelPortrait card={card} selected={active} used={used} details={details} /></div></div>;
const BattleCard: React.FC<{ card: ArenaCard; compact?: boolean; battle?: boolean; selected?: boolean; hidden?: boolean; used?: boolean }> = ({ card, compact = false, battle = false, selected = false, hidden = false, used = false }) => hidden ? <HiddenCard compact={compact} /> : <div className={`relative overflow-hidden rounded-xl border ${selected ? 'border-cyan-300 shadow-[0_0_32px_rgba(34,211,238,.48)]' : rarityStyle[card.rarity] || 'border-white/20'} bg-[#0b1222] ${battle ? 'h-[220px] w-[165px] p-2' : compact ? 'p-2 sm:p-2.5' : 'p-3'}`}><div className={`absolute inset-0 opacity-75 ${card.element === 'Fogo' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(249,115,22,.42),transparent_48%)]' : card.element === 'Água' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,.42),transparent_48%)]' : (card.element === 'Ar' || card.element === 'Raio') ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(96,165,250,.42),transparent_48%)]' : (card.element === 'Terra' || card.element === 'Natureza') ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(132,204,22,.38),transparent_48%)]' : 'bg-[radial-gradient(circle_at_50%_42%,rgba(168,85,247,.45),transparent_48%)]'}`} /><div className="relative z-10 flex items-center justify-between text-[7px] font-black uppercase tracking-wider text-cyan-200"><span>{card.element} · {card.rarity}</span><span>{used ? 'USADA' : 'NEXA'}</span></div><p className={`relative z-10 mt-1 truncate text-center font-heading font-black text-white ${battle ? 'text-sm' : 'text-[10px]'}`}>{card.name}</p><div className={`relative z-10 my-1.5 flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/20 ${battle ? 'h-[132px]' : 'aspect-[3/4]'}`}><CardImage templateId={card.id} alt={card.name} className="absolute inset-0 h-full w-full object-cover object-top" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" /><span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[7px] font-bold uppercase text-slate-100">{ELEMENT_ICONS[card.element] || '✦'} {card.element}</span></div><div className="relative z-10 flex justify-between text-[9px] font-mono text-slate-100"><span><b className="text-cyan-300">PODER</b> {card.power}</span><span><b className="text-rose-300">DANO</b> {card.damage}</span></div>{card.ability && <p className={`relative z-10 mt-1 truncate text-center text-[8px] ${battle ? 'text-amber-200' : 'text-slate-400'}`}>{card.ability}</p>}{selected && <Check className="absolute right-2 top-2 z-20 h-3 w-3 text-cyan-300" />}</div>;
