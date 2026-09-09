import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { Character, GameItem, PlayerBox, BoxRewardSummary, Card } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { BOX_DEFINITIONS } from '../config/boxRates';
import { RarityBadge } from '../components/common/RarityBadge';
import { BoxOpeningModal } from '../components/boxes/BoxOpeningModal';
import { soundService } from '../services/soundService';
import { EconomyService } from '../services/economyService';
import confetti from 'canvas-confetti';
import {
  Swords,
  Shield,
  Zap,
  Sparkles,
  Trophy,
  ArrowRight,
  Flame,
  CheckCircle2,
  RotateCcw,
  Package,
  PackageOpen,
  Layers,
  X,
  Plus,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface PlayProps {
  onNavigate: (page: string) => void;
}

const CARD_POWER_MAP: Record<string, number> = {
  Comum: 300,
  Incomum: 550,
  Raro: 900,
  Épico: 1400,
  Lendário: 2000,
  Mítico: 2800,
};

export const Play: React.FC<PlayProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { assets, executeBattle, equipCharacter, openBox } = useGameState();

  // User characters from inventory
  const characters = assets.filter(
    (a) => a.ownerId === user.id && a.type === 'Character'
  ) as Character[];

  const [selectedCharId, setSelectedCharId] = useState<string>(
    characters.find((c) => c.isEquipped)?.id || characters[0]?.id || ''
  );

  const selectedChar = characters.find((c) => c.id === selectedCharId) || characters[0];

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
  const [selectedTeamCardIds, setSelectedTeamCardIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`nexa_battle_team_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filtro de cartas no time: apenas instâncias existentes com state === 'FREE'
  const teamCards = userCards.filter(
    (c) => selectedTeamCardIds.includes(c.id) && c.state === 'FREE'
  );

  // Modo de visualização de cartas: 'free' (apenas FREE) ou 'all' (todas com indicativo)
  const [cardFilterMode, setCardFilterMode] = useState<'free' | 'all'>('free');

  // Cálculo de poder das cartas
  const getCardPower = (c: Card): number => {
    return CARD_POWER_MAP[c.rarity] || 500;
  };

  const cardsBonusPower = teamCards.reduce((acc, c) => acc + getCardPower(c), 0);
  const totalFighterPower = (selectedChar ? selectedChar.power : 1000) + cardsBonusPower;

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
        // Permite até 4 cartas de suporte no time de batalha
        if (prev.length >= 4) {
          updated = [...prev.slice(1), card.id];
        } else {
          updated = [...prev, card.id];
        }
      }
      try {
        localStorage.setItem(`nexa_battle_team_${user.id}`, JSON.stringify(updated));
      } catch {
        // Ignore local storage error
      }
      return updated;
    });
  };

  // Remover carta do time diretamente
  const handleRemoveFromTeam = (cardId: string) => {
    soundService.playClick();
    setSelectedTeamCardIds((prev) => {
      const updated = prev.filter((id) => id !== cardId);
      try {
        localStorage.setItem(`nexa_battle_team_${user.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
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
  } | null>(null);
  const [activeOpeningSummary, setActiveOpeningSummary] = useState<BoxRewardSummary | null>(null);

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

  const startCombat = () => {
    if (!selectedChar && teamCards.length === 0) return;

    setInBattle(true);
    setBattleResult(null);
    setCombatLogs([
      teamCards.length > 0
        ? `Iniciando combate na arena com formação de ${teamCards.length} carta(s) de suporte!`
        : 'Iniciando protocolo de combate na arena...',
    ]);
    setPlayerHp(100);
    setEnemyHp(100);
    setBattleTurn(1);

    // Dynamic enemy power scaled to player's total power
    const enemyPwr = Math.floor(totalFighterPower * (0.85 + Math.random() * 0.35));
    setEnemyData({
      name: ['Autômato de Plasma', 'Sentinela X-9', 'Ciborgue Renegado', 'Titã de Sucata'][
        Math.floor(Math.random() * 4)
      ],
      power: enemyPwr,
      class: 'Guerreiro',
      avatar: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=400&auto=format&fit=crop&q=80',
    });

    soundService.playLaser();

    // Simulated turns
    setTimeout(() => {
      setBattleTurn(2);
      soundService.playLaser();
      setEnemyHp((prev) => Math.max(25, prev - 45));

      if (teamCards.length > 0) {
        const randomCard = teamCards[Math.floor(Math.random() * teamCards.length)];
        setCombatLogs((prev) => [
          ...prev,
          `${randomCard.name} liberou rajada elemental (+${getCardPower(randomCard)} PWR) causando 450 de dano!`,
        ]);
      } else {
        setCombatLogs((prev) => [
          ...prev,
          `${selectedChar?.name || 'Seu combatente'} disparou uma rajada devastadora causando 450 de dano!`,
        ]);
      }
    }, 900);

    setTimeout(() => {
      setBattleTurn(3);
      soundService.playLaser();
      setPlayerHp((prev) => Math.max(30, prev - 35));
      setCombatLogs((prev) => [
        ...prev,
        `O adversário contra-atacou com raio de pulso iônico! Escudos em 65%.`,
      ]);
    }, 1800);

    setTimeout(() => {
      // Execute battle logic (updates victories, XP, currencies, and drops)
      const combatantId = selectedChar ? selectedChar.id : teamCards[0]?.id || user.id;
      const rewards = executeBattle(combatantId);
      setBattleTurn(4);
      setInBattle(false);
      setBattleResult(rewards);

      if (rewards.victory) {
        setEnemyHp(0);
        setCombatLogs((prev) => [
          ...prev,
          `Golpe Crítico fulminante! Vitória maiúscula na arena com espólios conquistados!`,
        ]);
        soundService.playVictory();
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22d3ee', '#a855f7', '#f59e0b', '#10b981'],
          });
        } catch {
          // Ignore
        }
      } else {
        setPlayerHp(0);
        setCombatLogs((prev) => [
          ...prev,
          `Defesa sobrecarregada! Vitória do adversário. Recompensas de consolação atribuídas.`,
        ]);
      }
    }, 2800);
  };

  // Cards to display in the arsenal picker
  const displayedCards = cardFilterMode === 'free' ? freeCards : userCards;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <Swords className="w-4 h-4" /> Módulo de Batalha & Looting
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1">
            Arena de Batalha
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Monte seu time com seus personagens e cartas <strong className="text-emerald-400">FREE</strong> do inventário para desafiar a arena.
          </p>
        </div>

        {/* Selected Arena Picker */}
        <div className="flex items-center gap-2 bg-[#0d0d15] border border-white/10 p-1.5 rounded-xl">
          {arenas.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedArena(a.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedArena === a.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Battle Stage */}
      <div className="relative rounded-3xl bg-[#0a0a12] border border-white/10 overflow-hidden shadow-2xl p-6 sm:p-10">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-black pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Fighter 1: Player's Character + Battle Team Cards */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                Seu Combatente & Formação
              </span>
              {selectedChar && <RarityBadge rarity={selectedChar.rarity} size="sm" />}
            </div>

            {selectedChar ? (
              <>
                <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.3)] mb-4 bg-slate-950">
                  <img
                    src={selectedChar.image}
                    alt={selectedChar.name}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      inBattle ? 'scale-110 animate-pulse' : ''
                    }`}
                  />
                  {inBattle && (
                    <div className="absolute inset-0 bg-cyan-500/20 mix-blend-overlay animate-ping" />
                  )}
                </div>

                <h3 className="font-heading text-xl font-bold text-white">
                  {selectedChar.name}
                </h3>
                <span className="text-xs font-mono text-slate-400 mt-0.5">
                  Classe: {selectedChar.class} • Nível {selectedChar.level}
                </span>

                {/* HP Bar */}
                <div className="w-full mt-4">
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">Integridade dos Escudos</span>
                    <span className="text-cyan-400 font-bold">{playerHp}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${playerHp}%` }}
                    />
                  </div>
                </div>

                {/* Total Power Badge with Card Contribution */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-300">
                  <span className="flex items-center gap-1 text-cyan-400 font-bold bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                    <Zap className="w-3.5 h-3.5 text-cyan-300" /> {totalFighterPower} PWR Total
                  </span>
                  {cardsBonusPower > 0 && (
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      (+{cardsBonusPower} de {teamCards.length} carta{teamCards.length > 1 ? 's' : ''})
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
                          className="flex items-center justify-between p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={card.image}
                              alt={card.name}
                              className="w-7 h-7 rounded-lg object-cover bg-slate-900 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-white font-bold block truncate text-[11px]">
                                {card.name}
                              </span>
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
                Nenhum combatente selecionado.
              </div>
            )}
          </div>

          {/* VS Badge in Center on Mobile / Indicator */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex-col items-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-slate-950 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.5)] flex items-center justify-center font-brand font-black text-xl text-cyan-300">
              VS
            </div>
          </div>

          {/* Fighter 2: Opponent Bot */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-rose-400 font-bold uppercase">
                Adversário da Arena
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
                IA DE COMBATE
              </span>
            </div>

            <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)] mb-4 bg-slate-950">
              <img
                src={enemyData.avatar}
                alt={enemyData.name}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  inBattle ? 'scale-110 animate-pulse' : ''
                }`}
              />
            </div>

            <h3 className="font-heading text-xl font-bold text-white">
              {enemyData.name}
            </h3>
            <span className="text-xs font-mono text-slate-400 mt-0.5">
              Classe: {enemyData.class} • Unidade de Teste
            </span>

            {/* Enemy HP Bar */}
            <div className="w-full mt-4">
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">Escudos Adversários</span>
                <span className="text-rose-400 font-bold">{enemyHp}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${enemyHp}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <Zap className="w-3.5 h-3.5" /> {enemyData.power} PWR
              </span>
              <span>Dificuldade: Média</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Battle Log */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col items-center">
          {/* Logs */}
          <div className="w-full max-w-xl bg-slate-950/80 border border-white/10 rounded-2xl p-4 min-h-[90px] flex flex-col justify-center text-center mb-6">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Registro Tático do Combate:
            </span>
            <p className="font-mono text-xs text-cyan-300 font-medium animate-in fade-in">
              {combatLogs[combatLogs.length - 1] || 'Aguardando início do duelo...'}
            </p>
          </div>

          {/* Launch Button */}
          <button
            onClick={startCombat}
            disabled={inBattle || (!selectedChar && teamCards.length === 0)}
            className="px-10 py-4 rounded-2xl font-black text-lg uppercase bg-red-600 text-white border-4 border-yellow-300" ${
  inBattle
    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
    : 'bg-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.6)] md:bg-gradient-to-r md:from-cyan-500 md:to-indigo-600 md:hover:from-cyan-400 md:hover:to-indigo-500 md:hover:scale-105'
}`}
          >
            <Swords className="w-6 h-6" />
            <span>{inBattle ? 'Engajando em Batalha...' : 'Iniciar Batalha na Arena'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* SELEÇÃO DE CARTAS PARA A BATALHA (DO INVENTÁRIO REAL)   */}
      {/* ======================================================= */}
      <div className="rounded-2xl bg-[#0b0b12] border border-white/10 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h3 className="font-heading text-xl font-bold text-white">
                Cartas para a Batalha (Inventário)
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Cartas <strong className="text-emerald-400">FREE</strong> do seu inventário estão prontas para jogar. Cartas em síntese (<strong className="text-amber-400">ACTIVE</strong>) ou exauridas não podem ser selecionadas.
            </p>
          </div>

          {/* Toggle Filter: Apenas FREE vs Todas as Cartas */}
          <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xl shrink-0 self-start sm:self-auto font-mono text-xs">
            <button
              onClick={() => setCardFilterMode('free')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                cardFilterMode === 'free'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Disponíveis FREE ({freeCards.length})
            </button>
            <button
              onClick={() => setCardFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                cardFilterMode === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
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
                      ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                      : isFree
                      ? 'bg-white/5 border-white/10 hover:border-white/20'
                      : 'bg-black/40 border-white/5 opacity-70'
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
                      <img
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
                          className="w-full py-2 px-3 rounded-xl bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-mono text-xs font-bold hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-400 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>NO TIME • REMOVER</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleCardSelection(card)}
                          className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 hover:scale-[1.02] flex items-center justify-center gap-1.5"
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
      </div>

      {/* Switch Character Arsenal Picker */}
      <div className="rounded-2xl bg-[#0b0b12] border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-bold text-white">
            Selecionar Líder / Personagem Principal
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {characters.length} combatente(s) disponíveis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {characters.map((char) => {
            const isSelected = char.id === selectedCharId;
            return (
              <div
                key={char.id}
                onClick={() => {
                  setSelectedCharId(char.id);
                  soundService.playClick();
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-400 text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <img
                  src={char.image}
                  alt={char.name}
                  className="w-12 h-12 rounded-lg object-cover bg-slate-950"
                />
                <div className="min-w-0">
                  <h5 className="font-heading font-bold text-xs text-white truncate">
                    {char.name}
                  </h5>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <RarityBadge rarity={char.rarity} size="sm" showDot={false} />
                    <span className="text-[10px] font-mono text-cyan-400">{char.power} PWR</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Battle Rewards & Loot Reveal Modal */}
      {battleResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0e0e1a] border border-cyan-500/50 p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            {/* Header Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              {battleResult.victory ? (
                <Trophy className="w-8 h-8 text-cyan-400 animate-bounce" />
              ) : (
                <Shield className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <h2 className="font-heading text-3xl font-black text-white">
              {battleResult.victory ? 'Vitória Esmagadora!' : 'Batalha Encerrada'}
            </h2>
            <p className="text-xs font-mono text-slate-300 mt-1">
              {battleResult.victory
                ? 'Você dominou a arena e coletou espólios cibernéticos!'
                : 'Você sobreviveu com honra. Recursos de consolação atribuídos.'}
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
                  <img
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
