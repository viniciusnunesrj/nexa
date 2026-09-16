import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { GameItem, PlayerBox, BoxRewardSummary, Card, BattleRunResult } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { getTemplateById } from '../config/collectionsData';
import { BOX_DEFINITIONS } from '../config/boxRates';
import { RarityBadge } from '../components/common/RarityBadge';
import { CardImage } from '../components/common/CardImage';
import { BoxOpeningModal } from '../components/boxes/BoxOpeningModal';
import { soundService } from '../services/soundService';
import { EconomyService } from '../services/economyService';
import { isSupabaseConfigured } from '../lib/supabase';
import confetti from 'canvas-confetti';
import {
  Swords,
  Shield,
  Zap,
  Sparkles,
  Trophy,
  CheckCircle2,
  Package,
  Layers,
  X,
  Plus,
  AlertCircle,
} from 'lucide-react';

interface PlayProps {
  onNavigate: (page: string) => void;
}

const RARITY_POWER_BASE: Record<string, number> = {
  Comum: 100,
  Incomum: 180,
  Raro: 280,
  Épico: 420,
  Lendário: 600,
  Mítico: 850,
};

export const Play: React.FC<PlayProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    assets,
    executeBattle,
    openBox,
    battlePreferences,
    isCharacterPersistenceLoading,
    saveBattlePreferences,
  } = useGameState();

  const [mainCardId, setMainCardId] = useState<string | null>(null);

  // ==========================================
  // PARTE 1: CARTAS DO INVENTÁRIO (FONTE ÚNICA)
  // ==========================================
  // Lê todas as cartas reais pertencentes ao jogador no inventário
  const userCards = (
    assets.filter(
      (a) => a.ownerId === user.id && (a.type === 'Card' || (a as any).type === 'card')
    ) as Card[]
  ).map((c) => EconomyService.normalizeCardSynthesis(c));

  // Regra fundamental: Apenas cartas com state === 'FREE' podem jogar
  const freeCards = userCards.filter((c) => c.state === 'FREE');

  // Seleção de cartas para o time da batalha (não altera card.state)
  const [selectedTeamCardIds, setSelectedTeamCardIds] = useState<string[]>([]);
  const hasHydratedBattlePreferences = useRef(false);
  const lastPersistedBattlePreferences = useRef<string | null>(null);

  useEffect(() => {
    if (isCharacterPersistenceLoading || hasHydratedBattlePreferences.current) return;

    if (isSupabaseConfigured()) {
      const team = Array.from(new Set(battlePreferences?.battleTeamCardIds || [])).slice(0, 4);
      setSelectedTeamCardIds(team);
      setMainCardId(
        battlePreferences?.mainCardId && team.includes(battlePreferences.mainCardId)
          ? battlePreferences.mainCardId
          : team[0] || null
      );
    } else {
      let localTeam: string[] = [];
      let localMainCardId: string | null = null;
      try {
        const saved = localStorage.getItem(`nexa_battle_team_${user.id}`);
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          localTeam = Array.from(new Set(parsed)).slice(0, 4);
        } else if (parsed && Array.isArray(parsed.team)) {
          const validTeamIds: string[] = parsed.team.filter(
            (id: unknown): id is string => typeof id === 'string'
          );
          localTeam = Array.from(new Set<string>(validTeamIds)).slice(0, 4);
          localMainCardId = typeof parsed.mainCardId === 'string' ? parsed.mainCardId : null;
        }
      } catch {
        localTeam = [];
      }
      setSelectedTeamCardIds(localTeam);
      setMainCardId(localMainCardId && localTeam.includes(localMainCardId) ? localMainCardId : localTeam[0] || null);
    }
    hasHydratedBattlePreferences.current = true;
  }, [battlePreferences, isCharacterPersistenceLoading, user.id]);

  useEffect(() => {
    if (isCharacterPersistenceLoading || !hasHydratedBattlePreferences.current) return;
    const teamKey = JSON.stringify(selectedTeamCardIds);
    const preferenceKey = JSON.stringify({
      mainCardId,
      team: selectedTeamCardIds,
    });

    if (isSupabaseConfigured()) {
      const serverKey = battlePreferences
        ? JSON.stringify({
            mainCardId: battlePreferences.mainCardId,
            team: battlePreferences.battleTeamCardIds,
          })
        : null;
      if (serverKey === preferenceKey || lastPersistedBattlePreferences.current === preferenceKey) return;
      lastPersistedBattlePreferences.current = preferenceKey;
      saveBattlePreferences(mainCardId, selectedTeamCardIds).catch((error) => {
        console.warn('[Play] Falha ao persistir preferências de batalha:', error);
        lastPersistedBattlePreferences.current = null;
      });
      return;
    }

    try {
      localStorage.setItem(
        `nexa_battle_team_${user.id}`,
        JSON.stringify({ mainCardId, team: selectedTeamCardIds })
      );
    } catch {
      // Offline storage is best effort.
    }
  }, [
    battlePreferences,
    isCharacterPersistenceLoading,
    saveBattlePreferences,
    mainCardId,
    selectedTeamCardIds,
    user.id,
  ]);

  // Filtro de cartas no time: apenas instâncias existentes com state === 'FREE'
  const teamCards = userCards.filter(
    (c) => selectedTeamCardIds.includes(c.id) && c.state === 'FREE'
  );

  // Modo de visualização de cartas: 'free' (apenas FREE) ou 'all' (todas com indicativo)
  const [cardFilterMode, setCardFilterMode] = useState<'free' | 'all'>('free');

  // Cálculo de poder das cartas
  const getCardPower = (c: Card): number => {
    const template = getTemplateById(c.templateId);
    return template
      ? RARITY_POWER_BASE[c.rarity] + template.marketValue + template.synthesisRate * 10
      : RARITY_POWER_BASE[c.rarity] || 100;
  };

  const totalFighterPower = teamCards.reduce((acc, c) => acc + getCardPower(c), 0);
  const mainCard = teamCards.find((card) => card.id === mainCardId) || null;

  // Alternar seleção da carta no time (respeita card.state sem mutação indevida)
  const handleToggleCardSelection = (card: Card) => {
    if (card.state !== 'FREE') {
      return;
    }
    soundService.playClick();
    setSelectedTeamCardIds((prev) => {
      let updated: string[];
      if (prev.includes(card.id)) {
        updated = prev.filter((id) => id !== card.id);
      } else {
        // Mantém uma única formação de até quatro cartas, sem remover outra carta implicitamente.
        if (prev.length >= 4) {
          updated = prev;
        } else {
          updated = [...prev, card.id];
        }
      }
      if (!mainCardId && updated.length > 0) {
        setMainCardId(updated[0]);
      }
      return updated;
    });
  };

  // Remover carta do time diretamente
  const handleRemoveFromTeam = (cardId: string) => {
    soundService.playClick();
    setSelectedTeamCardIds((prev) => {
      const updated = prev.filter((id) => id !== cardId);
      if (mainCardId === cardId) {
        setMainCardId(updated[0] || null);
      }
      return updated;
    });
  };

  const handleSetMainCard = (card: Card) => {
    if (!selectedTeamCardIds.includes(card.id) || card.state !== 'FREE') return;
    soundService.playClick();
    setMainCardId(card.id);
  };

  // Battle state
  const [inBattle, setInBattle] = useState(false);
  const [battleTurn, setBattleTurn] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [enemyHp, setEnemyHp] = useState<number>(100);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [battleResult, setBattleResult] = useState<{
    victory: boolean;
    xpGained: number;
    nexGained: number;
    nxaGained: number;
    droppedItem: GameItem | null;
    droppedBox?: PlayerBox | null;
    battleRun?: BattleRunResult;
  } | null>(null);
  const [activeOpeningSummary, setActiveOpeningSummary] = useState<BoxRewardSummary | null>(null);
  const [battleRun, setBattleRun] = useState<BattleRunResult | null>(null);
  const [battleEventIndex, setBattleEventIndex] = useState(-1);
  const [battleHp, setBattleHp] = useState<Record<string, number>>({});
  const [battleDefeated, setBattleDefeated] = useState<Record<string, boolean>>({});
  const [battleFlash, setBattleFlash] = useState<string | null>(null);
  const [battleNotice, setBattleNotice] = useState<'DEFEATED' | 'NEXT' | null>(null);

  // Bot opponent
  const [enemyData, setEnemyData] = useState({
    name: 'Androide Sentinela X-9',
    power: 1400,
    class: 'Guardião',
    avatar: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
  });

  const arenas = [
    { id: 'arena-1', name: 'Distrito Neon 07', difficulty: 'Normal', mult: '1.0x' },
    { id: 'arena-2', name: 'Reator de Antimatéria', difficulty: 'Desafiador', mult: '1.4x' },
    { id: 'arena-3', name: 'Cidadela Quântica', difficulty: 'Extremo', mult: '2.0x' },
  ];
  const [selectedArena, setSelectedArena] = useState(arenas[0].id);

  const startCombat = async () => {
    if (teamCards.length === 0) return;

    setInBattle(true);
    setBattleResult(null);
    setBattleRun(null);
    setBattleEventIndex(-1);
    setBattleHp({});
    setBattleDefeated({});
    setBattleFlash(null);
    setBattleNotice(null);
    setCombatLogs([
      `Iniciando combate na arena com formação de ${teamCards.length} carta(s).`,
    ]);
    setPlayerHp(100);
    setEnemyHp(100);
    setBattleTurn(1);

    soundService.playLaser();
    try {
      const requestId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const rewards = await executeBattle(requestId);
      const run = rewards.serverBattle ?? rewards.battleRun;
      if (!run) {
        setInBattle(false);
        setBattleResult(rewards);
        return;
      }

      setBattleRun(run);
      const playerRunSnapshots = (run.playerTeam || []) as Array<Record<string, unknown>>;
      const npcRunSnapshots = (run.enemyTeam || []) as Array<Record<string, unknown>>;
      const snapshots = [...playerRunSnapshots, ...npcRunSnapshots];
      const initialHp = Object.fromEntries(
        snapshots.map((snapshot) => [String(snapshot.id), Number(snapshot.maxHp ?? snapshot.max_hp) || 0])
      );
      setBattleHp(initialHp);
      const npcSnapshot = npcRunSnapshots[0] as Record<string, unknown> | undefined;
      setEnemyData((previous) => ({
        ...previous,
        name: String(npcSnapshot?.name || previous.name),
        power: Number(npcSnapshot?.power || previous.power),
      }));
      setEnemyHp(100);
      setPlayerHp(100);
      const events = run.events || [];
      const eventDelay = events.length <= 20 ? 300 : events.length <= 40 ? 240 : events.length <= 60 ? 175 : 125;
      let elapsed = 0;
      events.forEach((event, index) => {
        const scheduledAt = elapsed;
        const defeated = Boolean(event.defeated);
        const defenderId = event.defenderId || '';
        const attackerId = event.attackerId || '';
        elapsed += eventDelay + (defeated ? 500 : 0);
        window.setTimeout(() => {
          setBattleEventIndex(index);
          setBattleFlash(defenderId);
          setBattleHp((previous) => ({
            ...previous,
            [defenderId]: event.defenderHpAfter ?? previous[defenderId] ?? 0,
          }));
          const defenderSnapshot = snapshots.find((snapshot) => String(snapshot.id) === defenderId);
          const defenderMaxHp = Number(defenderSnapshot?.maxHp ?? defenderSnapshot?.max_hp) || 1;
          const defenderPercent = Math.max(0, Math.round(((event.defenderHpAfter ?? 0) / defenderMaxHp) * 100));
          if (event.attackerSide === 'PLAYER') setEnemyHp(defenderPercent);
          else setPlayerHp(defenderPercent);
          setBattleDefeated((previous) => ({ ...previous, [defenderId]: defeated }));
          if (defeated) {
            setBattleNotice('DEFEATED');
            window.setTimeout(() => setBattleNotice('NEXT'), 350);
            window.setTimeout(() => setBattleNotice(null), 850);
          }
          setCombatLogs((previous) => [
            ...previous,
            `${attackerId} atacou por ${event.damage} de dano.${defeated ? ' COMBATENTE DERROTADO. PRÓXIMO COMBATENTE.' : ''}`,
          ]);
          window.setTimeout(() => setBattleFlash(null), 220);
        }, scheduledAt);
      });
      const totalDelay = elapsed;
      window.setTimeout(() => {
        setBattleTurn(run.rounds);
        setInBattle(false);
        setBattleResult({ ...rewards, battleRun: run });
        if (run.outcome === 'VICTORY') {
          soundService.playVictory();
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#22d3ee', '#a855f7', '#f59e0b', '#10b981'] });
        }
      }, totalDelay + 700);
    } catch (error) {
      setInBattle(false);
      setCombatLogs((previous) => [...previous, error instanceof Error ? error.message : 'Não foi possível confirmar a batalha.']);
    }
  };

  // Cards to display in the arsenal picker
  const displayedCards = cardFilterMode === 'free' ? freeCards : userCards;
  const playerSnapshots = (battleRun?.playerTeam || []) as Array<Record<string, unknown>>;
  const npcSnapshots = (battleRun?.enemyTeam || []) as Array<Record<string, unknown>>;
  const activeEvent = battleRun?.events[battleEventIndex];
  const activePlayerId = activeEvent
    ? (activeEvent.attackerSide === 'PLAYER' ? activeEvent.attackerId : activeEvent.defenderId)
    : undefined;
  const activeNpcId = activeEvent
    ? (activeEvent.attackerSide === 'NPC' ? activeEvent.attackerId : activeEvent.defenderId)
    : undefined;
  const activePlayerSnapshot = playerSnapshots.find((snapshot) => String(snapshot.id) === activePlayerId);
  const activeNpcSnapshot = npcSnapshots.find((snapshot) => String(snapshot.id) === activeNpcId);
  const activePlayerHp = activePlayerSnapshot ? battleHp[String(activePlayerSnapshot.id)] ?? Number(activePlayerSnapshot.maxHp ?? activePlayerSnapshot.max_hp) : 0;
  const activeNpcHp = activeNpcSnapshot ? battleHp[String(activeNpcSnapshot.id)] ?? Number(activeNpcSnapshot.maxHp ?? activeNpcSnapshot.max_hp) : 0;
  const renderBattleSlot = (snapshot: Record<string, unknown>, side: 'PLAYER' | 'NPC') => {
    const id = String(snapshot.id);
    const defeated = Boolean(battleDefeated[id]);
    const active = id === (side === 'PLAYER' ? activePlayerId : activeNpcId);
    const hp = battleHp[id] ?? Number(snapshot.maxHp ?? snapshot.max_hp) ?? 0;
    const maxHp = Number(snapshot.maxHp ?? snapshot.max_hp) || 1;
    return (
      <div
        key={id}
        className={`rounded-xl border p-2 text-left transition-all duration-300 ${
          defeated ? 'opacity-40 border-white/10 grayscale' : active ? 'border-cyan-300 bg-cyan-400/15 shadow-[0_0_15px_rgba(34,211,238,.25)]' : 'border-white/10 bg-black/30'
        } ${battleFlash === id ? 'animate-pulse ring-2 ring-rose-400' : ''}`}
      >
        <div className="flex items-center gap-2">
          <CardImage
            templateId={snapshot.templateId ?? snapshot.template_id}
            src={String(snapshot.image || (side === 'PLAYER' ? mainCard?.image || '' : enemyData.avatar))}
            alt=""
            className="h-8 w-8 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-bold text-white">{String(snapshot.name || 'Combatente')}</span>
            <span className="text-[9px] font-mono text-slate-400">{String(snapshot.rarity || '')} • {Number(snapshot.power || 0)} PWR</span>
          </div>
          <span className={`text-[9px] font-mono font-bold ${defeated ? 'text-rose-300' : active ? 'text-cyan-300' : 'text-slate-400'}`}>
            {defeated ? 'DERROTADO' : active ? 'ATIVO' : 'PRÓXIMO'}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-slate-400">
          <span>POSIÇÃO {String(snapshot.position)}/{side === 'PLAYER' ? playerSnapshots.length : npcSnapshots.length}</span>
          <span className={defeated ? 'text-rose-300' : 'text-cyan-300'}>{Math.max(0, Math.round(hp))}/{Math.round(maxHp)} HP</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/60">
          <div className={`h-full transition-all duration-300 ${side === 'PLAYER' ? 'bg-cyan-400' : 'bg-rose-500'}`} style={{ width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Arena Command Header */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-gradient-to-br from-[#07101a] via-[#090a0f] to-[#07080c] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.2em]">
            <Swords className="w-4 h-4" /> Arena // Comando de Combate
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-2 tracking-tight">
            Arena de Batalha
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1.5 max-w-2xl leading-relaxed">
            Configure até quatro cartas <strong className="text-emerald-400">FREE</strong>, escolha o combatente principal e envie sua formação para a Arena.
          </p>
        </div>

        {/* Selected Arena Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 bg-black/25 border border-white/[0.07] p-1.5 rounded-xl xl:min-w-[420px]">
          {arenas.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedArena(a.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedArena === a.id
                  ? 'bg-blue-500/15 text-cyan-200 border border-cyan-500/30 font-bold'
                  : 'text-slate-500 border border-transparent hover:text-slate-200 hover:bg-white/[0.025]'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
        </div>
      </section>

      {/* Main Battle Stage */}
      <section className="relative rounded-2xl bg-[#07090e] border border-blue-500/15 overflow-hidden p-4 sm:p-6">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/[0.16] via-transparent to-black/30 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent pointer-events-none" />
        {battleNotice && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className={`rounded-2xl border px-6 py-4 text-center font-heading font-black uppercase tracking-widest shadow-2xl ${
              battleNotice === 'DEFEATED'
                ? 'border-rose-400/70 bg-rose-950/85 text-rose-200'
                : 'border-cyan-400/70 bg-cyan-950/85 text-cyan-200'
            }`}>
              {battleNotice === 'DEFEATED' ? 'COMBATENTE DERROTADO' : 'PRÓXIMO COMBATENTE'}
            </div>
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Fighter 1: Player's Character + Battle Team Cards */}
          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-rose-500/[0.02] border border-rose-500/15 relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                Sua Formação
              </span>
              {mainCard && <RarityBadge rarity={mainCard.rarity} size="sm" />}
            </div>
            {playerSnapshots.length > 0 && (
              <div className="mb-4 grid w-full grid-cols-1 gap-2">
                <span className="text-left text-[10px] font-mono font-bold uppercase text-cyan-300">MINHA FORMAÇÃO</span>
                {playerSnapshots.map((snapshot) => renderBattleSlot(snapshot, 'PLAYER'))}
              </div>
            )}

            {mainCard ? (
              <>
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border border-cyan-400/60 shadow-[0_0_22px_rgba(34,211,238,0.12)] mb-4 bg-slate-950">
                  <CardImage
                    asset={mainCard}
                    templateId={activePlayerSnapshot?.templateId ?? activePlayerSnapshot?.template_id ?? mainCard.templateId}
                    src={String(activePlayerSnapshot?.image || mainCard.image || '')}
                    alt={String(activePlayerSnapshot?.name || mainCard.name)}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      inBattle ? 'scale-110 animate-pulse' : ''
                    }`}
                  />
                  {inBattle && (
                    <div className="absolute inset-0 bg-cyan-500/20 mix-blend-overlay animate-ping" />
                  )}
                </div>

                <h3 className="font-heading text-xl font-bold text-white">
                  {String(activePlayerSnapshot?.name || mainCard.name)}
                </h3>
                <span className="text-xs font-mono text-slate-400 mt-0.5">
                  {activePlayerSnapshot
                    ? `Posição ${String(activePlayerSnapshot.position)}/${playerSnapshots.length} • ${String(activePlayerSnapshot.rarity)} • ${Number(activePlayerSnapshot.power)} PWR`
                    : 'Aguardando combatente ativo'}
                </span>

                {/* HP Bar */}
                <div className="w-full mt-4">
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">Integridade dos Escudos</span>
                    <span className="text-cyan-400 font-bold">
                      {activePlayerSnapshot ? `${Math.round(activePlayerHp)}/${Math.round(Number(activePlayerSnapshot.maxHp ?? activePlayerSnapshot.max_hp) || 0)} HP` : '0/0 HP'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${activePlayerSnapshot ? Math.max(0, Math.min(100, (activePlayerHp / (Number(activePlayerSnapshot.maxHp ?? activePlayerSnapshot.max_hp) || 1)) * 100)) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Total Power Badge with Card Contribution */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1 text-cyan-300 font-bold bg-cyan-500/[0.07] px-2.5 py-1 rounded-lg border border-cyan-500/20">
                    <Zap className="w-3.5 h-3.5 text-cyan-300" /> {totalFighterPower} PWR Total
                  </span>
                  {totalFighterPower > 0 && (
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      ({teamCards.length} carta{teamCards.length > 1 ? 's' : ''} na formação)
                    </span>
                  )}
                </div>

                {/* Active Team Cards in Battle */}
                <div className="w-full mt-5 pt-4 border-t border-white/10 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" /> Cartas no Time ({teamCards.length}/4):
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Apenas FREE
                    </span>
                  </div>

                  {teamCards.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {teamCards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-black/25 border border-cyan-500/15 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CardImage
                              asset={card}
                              templateId={card.templateId}
                              src={card.image}
                              alt={card.name}
                              className="w-7 h-7 rounded-lg object-cover bg-slate-900 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-white font-bold block truncate text-[11px]">
                                {card.name}
                              </span>
                              {card.id === mainCardId && (
                                <span className="text-[10px] text-amber-300 font-bold block">
                                  PRINCIPAL
                                </span>
                              )}
                              <span className="text-[10px] text-cyan-300 font-bold">
                                +{getCardPower(card)} PWR
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromTeam(card.id)}
                            disabled={inBattle}
                            title="Remover do time"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {card.id !== mainCardId && (
                            <button
                              onClick={() => handleSetMainCard(card)}
                              disabled={inBattle}
                              title="Definir como principal"
                              className="px-1.5 py-1 rounded-md text-[9px] text-amber-300 hover:bg-amber-500/10 transition-colors shrink-0"
                            >
                              Principal
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2.5 px-3 rounded-xl bg-black/40 border border-dashed border-white/10 text-center">
                      <span className="text-[11px] font-mono text-slate-500 block">
                        Nenhuma carta selecionada no time.
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400/80">
                        Selecione cartas FREE abaixo para aumentar seu poder na arena!
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-slate-500 font-mono text-xs">
                Nenhuma carta principal selecionada.
              </div>
            )}
          </div>

          {/* VS Badge in Center on Mobile / Indicator */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex-col items-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-[#07090e] border border-blue-400/60 shadow-[0_0_18px_rgba(59,130,246,0.18)] flex items-center justify-center font-brand font-black text-lg text-cyan-200">
              VS
            </div>
          </div>

          {/* Fighter 2: Opponent Bot */}
          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-rose-500/[0.02] border border-rose-500/15 relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-rose-400 font-bold uppercase">
                Adversário da Arena
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
                IA DE COMBATE
              </span>
            </div>
            {npcSnapshots.length > 0 && (
              <div className="mb-4 grid w-full grid-cols-1 gap-2">
                <span className="text-left text-[10px] font-mono font-bold uppercase text-rose-300">INIMIGOS</span>
                {npcSnapshots.map((snapshot) => renderBattleSlot(snapshot, 'NPC'))}
              </div>
            )}

            <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border border-rose-500/60 shadow-[0_0_22px_rgba(244,63,94,0.10)] mb-4 bg-slate-950">
              <CardImage
                templateId={activeNpcSnapshot?.templateId ?? activeNpcSnapshot?.template_id}
                src={String(activeNpcSnapshot?.image || enemyData.avatar)}
                alt={String(activeNpcSnapshot?.name || enemyData.name)}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  inBattle ? 'scale-110 animate-pulse' : ''
                }`}
              />
            </div>

            <h3 className="font-heading text-xl font-bold text-white">
              {String(activeNpcSnapshot?.name || enemyData.name)}
            </h3>
            <span className="text-xs font-mono text-slate-400 mt-0.5">
              {activeNpcSnapshot
                ? `Posição ${String(activeNpcSnapshot.position)}/${npcSnapshots.length} • ${String(activeNpcSnapshot.rarity)} • ${Number(activeNpcSnapshot.power)} PWR`
                : 'Aguardando combatente ativo'}
            </span>

            {/* Enemy HP Bar */}
            <div className="w-full mt-4">
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Escudos Adversários</span>
                <span className="text-rose-400 font-bold">
                  {activeNpcSnapshot ? `${Math.round(activeNpcHp)}/${Math.round(Number(activeNpcSnapshot.maxHp ?? activeNpcSnapshot.max_hp) || 0)} HP` : '0/0 HP'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${activeNpcSnapshot ? Math.max(0, Math.min(100, (activeNpcHp / (Number(activeNpcSnapshot.maxHp ?? activeNpcSnapshot.max_hp) || 1)) * 100)) : 0}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <Zap className="w-3.5 h-3.5" /> {Number(activeNpcSnapshot?.power || 0)} PWR
              </span>
              <span>Dificuldade: Média</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Battle Log */}
        <div className="relative z-10 mt-5 pt-5 border-t border-white/[0.07] flex flex-col items-center">
          {/* Logs */}
          <div className="w-full max-w-2xl bg-black/30 border border-blue-500/15 rounded-xl px-4 py-3 min-h-[72px] flex flex-col justify-center text-center mb-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Registro Tático // Arena
            </span>
            <p className="font-mono text-xs text-cyan-300 font-medium animate-in fade-in">
              {combatLogs[combatLogs.length - 1] || 'Aguardando início do duelo...'}
            </p>
          </div>

          {/* Launch Button */}
          <button
            onClick={startCombat}
            disabled={inBattle || teamCards.length === 0}
            className={`w-full sm:w-auto min-w-0 sm:min-w-[340px] px-6 sm:px-10 py-4 rounded-xl font-heading font-black text-base sm:text-lg uppercase tracking-[0.08em] transition-all flex items-center justify-center gap-3 border ${
              inBattle
                ? 'bg-slate-900 border-white/[0.06] text-slate-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 border-cyan-300/30 text-[#031018] shadow-[0_0_28px_rgba(14,165,233,0.28)] hover:brightness-110 active:scale-[0.99] [@media(hover:none)]:from-cyan-400 [@media(hover:none)]:via-blue-500 [@media(hover:none)]:to-indigo-500 [@media(hover:none)]:text-[#031018]'
            }`}
          >
            <Swords className="w-6 h-6" />
            <span>{inBattle ? 'Engajando em Batalha...' : 'Iniciar Batalha na Arena'}</span>
          </button>
        </div>
      </section>

      {/* ======================================================= */}
      {/* SELEÇÃO DE CARTAS PARA A BATALHA (DO INVENTÁRIO REAL)   */}
      {/* ======================================================= */}
      <section className="rounded-2xl bg-[#090a0f] border border-white/[0.08] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h3 className="font-heading text-xl font-bold text-white">
                Arsenal de Combate
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Selecione cartas <strong className="text-emerald-400">FREE</strong> para compor a formação. Ativos ocupados ou exauridos permanecem indisponíveis.
            </p>
          </div>

          {/* Toggle Filter: Apenas FREE vs Todas as Cartas */}
          <div className="flex items-center gap-1 bg-black/30 border border-white/[0.07] p-1 rounded-xl shrink-0 self-start sm:self-auto font-mono text-xs">
            <button
              onClick={() => setCardFilterMode('free')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                cardFilterMode === 'free'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-500 border border-transparent hover:text-slate-200 hover:bg-white/[0.025]'
              }`}
            >
              Disponíveis FREE ({freeCards.length})
            </button>
            <button
              onClick={() => setCardFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                cardFilterMode === 'all'
                  ? 'bg-blue-500/15 text-cyan-200 border border-cyan-500/30 font-bold'
                  : 'text-slate-500 border border-transparent hover:text-slate-200 hover:bg-white/[0.025]'
              }`}
            >
              Todas as Cartas ({userCards.length})
            </button>
          </div>
        </div>

        {/* Grid de Cartas */}
        {displayedCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {displayedCards.map((card) => {
              const isSelected = selectedTeamCardIds.includes(card.id) && card.state === 'FREE';
              const isFree = card.state === 'FREE';
              const isActive = card.state === 'ACTIVE';
              const isExhausted = card.state === 'EXHAUSTED';

              return (
                <div
                  key={card.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/[0.055] border-cyan-400/70 ring-1 ring-cyan-400/25 shadow-[0_0_18px_rgba(34,211,238,0.08)]'
                      : isFree
                      ? 'bg-white/[0.025] border-white/[0.07] hover:border-cyan-500/20'
                      : 'bg-black/30 border-white/[0.04] opacity-65'
                  }`}
                >
                  <div>
                    {/* Header with State Badge & Element */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{card.elementIcon || '⚡'}</span>
                        <RarityBadge rarity={card.rarity} size="sm" showDot={false} />
                      </div>

                      {/* State Indicator Badge */}
                      {isFree && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                          FREE
                        </span>
                      )}
                      {isActive && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                          Sintetizando NEX
                        </span>
                      )}
                      {isExhausted && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                          EXHAUSTED
                        </span>
                      )}
                    </div>

                    {/* Card Artwork */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-slate-950 border border-white/10">
                      <CardImage
                        asset={card}
                        templateId={card.templateId}
                        src={card.image}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[10px] font-black uppercase shadow">
                          NO TIME
                        </div>
                      )}
                    </div>

                    {/* Card Details */}
                    <h4 className="font-heading font-bold text-sm text-white truncate">
                      {card.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-xs font-mono">
                      <span className="text-cyan-400 font-bold">
                        +{getCardPower(card)} PWR
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {card.element || 'Neutro'}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-3 border-t border-white/5">
                    {isFree ? (
                      isSelected ? (
                        <button
                          onClick={() => handleToggleCardSelection(card)}
                          className="w-full py-2 px-3 rounded-xl bg-cyan-500/[0.07] border border-cyan-400/40 text-cyan-200 font-mono text-xs font-bold hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-400 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>NO TIME • REMOVER</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleCardSelection(card)}
                          className="w-full py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-100 font-heading text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 hover:scale-[1.02] flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>SELECIONAR</span>
                        </button>
                      )
                    ) : isActive ? (
                      <button
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-amber-300/60 font-mono text-[11px] cursor-not-allowed text-center"
                      >
                        Sintetizando NEX
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-500 font-mono text-[11px] cursor-not-allowed text-center"
                      >
                        Não Jogável (Exaurida)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-black/40 border border-dashed border-white/10 text-center font-mono">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">
              {cardFilterMode === 'free'
                ? 'Nenhuma carta FREE disponível no inventário no momento.'
                : 'Nenhuma carta encontrada em seu inventário.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
              Obtenha cartas abrindo Caixas de Coleção ou forje fragmentos na aba Coleções para reforçar seu time na batalha.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('boxes')}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-colors"
              >
                Abrir Caixas
              </button>
              <button
                onClick={() => onNavigate('collections')}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 border border-white/10 text-xs hover:bg-white/10 transition-colors"
              >
                Ir para Coleções
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Battle Rewards & Loot Reveal Modal */}
      {battleResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#090b11] border border-blue-500/25 p-6 sm:p-7 text-center shadow-[0_0_40px_rgba(14,165,233,0.12)]">
            {/* Header Icon */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cyan-500/[0.08] border border-cyan-400/25 text-cyan-300 mb-4">
              {battleResult.victory ? (
                <Trophy className="w-8 h-8 text-cyan-400 animate-bounce" />
              ) : (
                <Shield className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <h2 className="font-heading text-3xl font-black text-white">
              {battleResult.battleRun?.outcome === 'DRAW'
                ? 'Empate Tático'
                : battleResult.victory
                ? 'Vitória na Arena'
                : 'Batalha Encerrada'}
            </h2>
            <p className="text-xs font-mono text-slate-300 mt-1">
              {battleResult.battleRun?.outcome === 'DRAW'
                ? 'O limite seguro de rounds foi atingido sem vencedor.'
                : battleResult.victory
                ? 'Combate confirmado. Recompensas registradas.'
                : 'Combate encerrado. Resultado e recompensas confirmados.'}
            </p>

            {/* Currency Gains */}
            <div className="grid grid-cols-3 gap-2 my-6 p-4 rounded-2xl bg-slate-950/80 border border-white/10 font-mono">
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">XP GANHO</span>
                <span className="font-bold text-sm text-cyan-300">+{battleResult.xpGained}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">MOEDAS NEX</span>
                <span className="font-bold text-sm text-amber-400">+{battleResult.nexGained}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">TOKENS NXA</span>
                <span className="font-bold text-sm text-cyan-400">+{battleResult.nxaGained}</span>
              </div>
            </div>

            {/* Dropped Item Card */}
            {battleResult.droppedItem && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-cyan-500/40 text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Novo Drop de Ativo Conquistado!
                </div>
                <div className="flex items-center gap-3">
                  <CardImage
                    asset={battleResult.droppedItem}
                    src={battleResult.droppedItem.image}
                    alt={battleResult.droppedItem.name}
                    className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-heading font-bold text-sm text-white truncate">
                      {battleResult.droppedItem.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <RarityBadge rarity={battleResult.droppedItem.rarity} size="sm" />
                      <span className="text-[10px] font-mono text-cyan-300">
                        {battleResult.droppedItem.power} PWR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropped Box Card */}
            {battleResult.droppedBox && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/40 text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 font-bold uppercase mb-2">
                  <Package className="w-3.5 h-3.5" /> Baú de Recompensa Descoberto!
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-sm text-white truncate">
                        {battleResult.droppedBox.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        Nível {battleResult.droppedBox.level} • Pronto para Desbloqueio
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!battleResult.droppedBox) return;
                      const summary = openBox(battleResult.droppedBox.id);
                      if (summary) {
                        setActiveOpeningSummary(summary);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading text-xs font-black uppercase tracking-wider transition-all shrink-0"
                  >
                    Abrir Agora
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setBattleResult(null)}
              className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors uppercase tracking-wider"
            >
              Confirmar e Retornar à Arena
            </button>
          </div>
        </div>
      )}

      {/* Box Opening Modal */}
      {activeOpeningSummary && (
        <BoxOpeningModal
          summary={activeOpeningSummary}
          onClose={() => setActiveOpeningSummary(null)}
          onNavigate={(page) => {
            setActiveOpeningSummary(null);
            onNavigate(page);
          }}
        />
      )}
    </div>
  );
};
