import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Search, ScrollText, Swords, X, Zap } from 'lucide-react';
import { RIFTBATTLE_V2_CARDS } from '../features/riftbattle-v2/cardCatalog';
import { createOwnedRiftBattleCards } from '../features/riftbattle-v2/inventoryAdapter';
import { finishAuthoritativeRiftBattleV2, startAuthoritativeRiftBattleV2, type RiftBattleReward } from '../services/riftBattleV2Service';
import { SupabaseService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import type { Card } from '../types/collections';
import { applyRiftBattleAction, initializeRiftBattle } from '../features/riftbattle-v2/battleEngine';
import {
  RIFTBATTLE_ARENAS,
  RIFTBATTLE_STANDARD_ARENA,
  getRiftBattleArena,
} from '../features/riftbattle-v2/arenaConfig';
import { chooseRiftBattleAiAction, type RiftBattleDifficulty } from '../features/riftbattle-v2/ai';
import type {
  RiftBattleAction,
  RiftBattleCard,
  RiftBattleCardStateEntry,
  RiftBattlePlayerId,
  RiftBattleState,
} from '../features/riftbattle-v2/types';
import { getCardImage } from '../utils/cardImage';

const PLAYER_ONE_TEAM = ['card-knight-blade', 'card-flame-guardian', 'card-storm-guardian', 'card-abyss-devourer'];
const PLAYER_TWO_TEAM = ['card-dragon-gold', 'card-knight-black', 'card-mage-ice', 'card-mage-shadow'];
const PASSIVE_ABILITIES = new Set(['INVESTIDA', 'ESCUDO', 'PROTECAO', 'RECARGA']);
const ACTIVE_ABILITIES = new Set(['BARREIRA', 'REPARO', 'RUPTURA', 'IMPULSO', 'SOBRECARGA', 'MARCA']);
const ABILITY_DESCRIPTIONS: Record<string, string> = {
  INVESTIDA: 'Pode agir no turno em que entra em campo.',
  ESCUDO: 'Reduz o próximo dano recebido.',
  PROTECAO: 'Reduz dano enquanto outra carta aliada está ativa.',
  RECARGA: 'Recupera energia uma vez ao entrar em campo.',
  BARREIRA: 'Gasta energia para reduzir o próximo dano.',
  REPARO: 'Recupera 2 HP uma vez.',
  RUPTURA: 'Ataca ignorando a defesa do alvo.',
  IMPULSO: 'Concede prioridade a uma carta aliada.',
  SOBRECARGA: 'Ataca com força ampliada.',
  MARCA: 'Marca um inimigo para receber dano adicional.',
};
const HUMAN_PLAYER_ID: RiftBattlePlayerId = 'PLAYER_ONE';
const AI_PLAYER_ID: RiftBattlePlayerId = 'PLAYER_TWO';
const AI_ACTION_DELAY_MS = 700;
const MAX_AI_ACTIONS_PER_TURN = 10;

const cardById = (id: string) => RIFTBATTLE_V2_CARDS.find((card) => card.id === id)!;
const getBattleCardImage = (card: RiftBattleCard) => getCardImage(card.templateId ?? card.id);
const createInitialState = (
  playerIds: string[] = PLAYER_ONE_TEAM,
  aiIds: string[] = PLAYER_TWO_TEAM,
  arena = RIFTBATTLE_STANDARD_ARENA,
): RiftBattleState =>
  initializeRiftBattle(playerIds.map(cardById), aiIds.map(cardById), arena);
const needsTarget = (ability?: string) =>
  ability === 'RUPTURA' || ability === 'SOBRECARGA' || ability === 'IMPULSO' || ability === 'MARCA';

type Feedback = { id: string; text: string; kind: 'damage' | 'heal' | 'defeat' };
type CombatAnimation = {
  attackerId: string;
  targetId: string;
  targetPlayerId: RiftBattlePlayerId;
  phase: 'PREPARE' | 'ATTACK' | 'IMPACT' | 'RECOVER';
  defeated: boolean;
  previousHp?: number;
  token: number;
};
type AbilityAnimation = { abilityId: string; actorPlayerId: RiftBattlePlayerId; token: number };
type DeployAnimation = { cardId: string; cardName: string; actorPlayerId: RiftBattlePlayerId; investida: boolean; token: number };
type TurnAnimation = { playerId: RiftBattlePlayerId; turn: number; energy: number; token: number };
type LogEntry = { id: number; text: string };

interface BattleCardProps {
  entry: RiftBattleCardStateEntry;
  compact?: boolean;
  enemy?: boolean;
  selected?: boolean;
  targetable?: boolean;
  dimmed?: boolean;
  feedback?: Feedback;
  combatAnimation?: CombatAnimation;
  canDeploy?: boolean;
  lastSurvivor?: boolean;
  onSelect: () => void;
}

const BattleCard: React.FC<BattleCardProps> = ({
  entry,
  compact = false,
  enemy = false,
  selected = false,
  targetable = false,
  dimmed = false,
  feedback,
  combatAnimation,
  canDeploy = false,
  lastSurvivor = false,
  onSelect,
}) => {
  const displayedHp = isNaN(combatAnimation?.previousHp ?? NaN) || combatAnimation?.targetId !== entry.card.id || (combatAnimation.phase !== 'PREPARE' && combatAnimation.phase !== 'ATTACK')
    ? entry.currentHp
    : combatAnimation.previousHp!;
  const hpPercent = Math.max(0, Math.min(100, (displayedHp / entry.card.stats.hp) * 100));
  const isDefeated = entry.state === 'DEFEATED';
  const isPreparing = entry.state === 'ACTIVE' && entry.enteredThisTurn;
  const used = entry.state === 'ACTIVE' && entry.hasActedThisTurn;
  const isAttacking = combatAnimation?.attackerId === entry.card.id;
  const isImpacted = combatAnimation?.targetId === entry.card.id;
  const isKoSequence = isImpacted && isDefeated;
  const isCritical = !isDefeated && entry.currentHp > 0 && hpPercent <= 30;
  const isThreatened = targetable && !isDefeated;
  const attackArchetype = entry.card.archetype;
  const archetypeClass = isAttacking ? `nexa-archetype-${attackArchetype.toLowerCase()}` : '';
  const archetypeTravel = attackArchetype === 'SPEED' ? 196 : attackArchetype === 'TANK' ? 158 : attackArchetype === 'ASSAULT' ? 184 : attackArchetype === 'SUPPORT' ? 164 : 174;
  const archetypeScale = attackArchetype === 'TANK' ? 1.29 : attackArchetype === 'SPEED' ? 1.23 : attackArchetype === 'ASSAULT' ? 1.31 : attackArchetype === 'SUPPORT' ? 1.25 : 1.27;
  const attackMotionStyle: React.CSSProperties | undefined = isAttacking && combatAnimation
    ? {
        transform: combatAnimation.phase === 'PREPARE'
          ? `translateY(${enemy ? '-26px' : '26px'}) scale(0.965) rotateX(${enemy ? '-5deg' : '5deg'})`
          : combatAnimation.phase === 'ATTACK'
            ? `translateY(${enemy ? archetypeTravel : -archetypeTravel}px) scale(${archetypeScale}) rotateX(${enemy ? '5deg' : '-5deg'})`
            : combatAnimation.phase === 'IMPACT'
              ? `translateY(${enemy ? archetypeTravel + 16 : -(archetypeTravel + 16)}px) scale(${archetypeScale - 0.055}) rotateX(${enemy ? '9deg' : '-9deg'})`
              : `translateY(0px) scale(1) rotateX(0deg)`,
        transitionProperty: 'transform, filter, opacity',
        transitionDuration: combatAnimation.phase === 'PREPARE'
          ? '460ms'
          : combatAnimation.phase === 'ATTACK'
            ? '720ms'
            : combatAnimation.phase === 'IMPACT'
              ? '210ms'
              : '760ms',
        transitionTimingFunction: combatAnimation.phase === 'ATTACK'
          ? 'cubic-bezier(0.22, 0.72, 0.2, 1)'
          : combatAnimation.phase === 'RECOVER'
            ? 'cubic-bezier(0.2, 0.75, 0.25, 1)'
            : 'ease-out',
      }
    : undefined;
  const impactReactionStyle: React.CSSProperties | undefined = isImpacted && combatAnimation?.phase === 'IMPACT'
    ? {
        transform: `translateY(${enemy ? '-44px' : '44px'}) translateX(${enemy ? '-13px' : '13px'}) scale(0.885) rotate(${enemy ? '-5.2deg' : '5.2deg'})`,
        transition: 'transform 290ms cubic-bezier(.12,.9,.22,1), filter 290ms ease-out',
        filter: 'brightness(1.42) saturate(1.28)',
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={entry.card.name}
      style={attackMotionStyle ?? impactReactionStyle}
      className={[
        'relative w-full overflow-visible rounded-2xl border text-left transition-all duration-200 motion-reduce:transition-none',
        archetypeClass,
        compact ? 'p-1.5' : 'p-2 sm:p-3',
        isAttacking
          ? `z-30 ${combatAnimation?.phase === 'PREPARE' ? 'brightness-125 drop-shadow-[0_0_18px_rgba(255,255,255,0.28)]' : combatAnimation?.phase === 'IMPACT' ? 'brightness-150' : 'brightness-110'}`
          : isImpacted
            ? `z-20 ${combatAnimation?.phase === 'IMPACT' ? 'brightness-140' : ''} ${isKoSequence && combatAnimation?.phase === 'RECOVER' ? 'grayscale opacity-45 scale-95' : ''}`
            : selected
          ? 'border-cyan-200 bg-cyan-400/15 shadow-[0_0_28px_rgba(34,211,238,0.32)] -translate-y-1'
          : targetable
            ? 'border-fuchsia-200 bg-fuchsia-500/15 shadow-[0_0_26px_rgba(217,70,239,0.3)] animate-pulse'
            : dimmed
              ? 'border-white/10 bg-slate-950/45 opacity-70'
              : enemy
                ? 'border-fuchsia-300/25 bg-[linear-gradient(155deg,rgba(33,13,50,0.96),rgba(7,12,28,0.98))] shadow-[0_14px_30px_rgba(168,44,214,0.16)] hover:border-fuchsia-200/60'
                : 'border-cyan-300/25 bg-[linear-gradient(155deg,rgba(8,32,49,0.96),rgba(7,12,28,0.98))] shadow-[0_14px_30px_rgba(34,211,238,0.14)] hover:border-cyan-200/60',
        isDefeated ? 'pointer-events-none opacity-35 grayscale' : '',
        canDeploy && !isDefeated ? 'border-cyan-400/45' : '',
        isCritical ? 'nexa-card-critical' : '',
        lastSurvivor && !isDefeated ? 'nexa-last-survivor' : '',
        isThreatened ? 'nexa-card-threatened' : '',
      ].join(' ')}
    >
      {!compact && isCritical && <span className="nexa-critical-warning pointer-events-none absolute -right-2 top-7 z-30 rounded-md border border-rose-200/60 bg-rose-950/90 px-1.5 py-0.5 text-[8px] font-black tracking-[0.16em] text-rose-100">CRÍTICO</span>}
      {!compact && lastSurvivor && !isDefeated && (
        <>
          <div className="nexa-last-nexus-crown" aria-hidden="true" />
          <span className="nexa-survivor-label pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-black tracking-[0.28em] text-white">ÚLTIMO NEXO</span>
        </>
      )}
      {!compact && (
        <div className="absolute -top-2 left-2 z-10 flex gap-1 text-[9px] font-bold uppercase tracking-wider">
          {isPreparing && <span className="rounded bg-amber-400/90 px-1.5 py-0.5 text-slate-950">Preparando</span>}
          {used && !isPreparing && <span className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-300">Ação usada</span>}
        </div>
      )}
      {isAttacking && combatAnimation?.phase === 'PREPARE' && <span className={`pointer-events-none absolute -inset-3 z-20 rounded-[1.35rem] border opacity-90 animate-pulse ${enemy ? 'border-fuchsia-200/70 shadow-[0_0_34px_rgba(217,70,239,0.75),inset_0_0_24px_rgba(217,70,239,0.22)]' : 'border-cyan-100/70 shadow-[0_0_34px_rgba(34,211,238,0.75),inset_0_0_24px_rgba(34,211,238,0.22)]'}`} />}
      {isAttacking && (combatAnimation?.phase === 'ATTACK' || combatAnimation?.phase === 'IMPACT') && <>
        <span className={`pointer-events-none absolute left-1/2 z-20 h-28 w-2 -translate-x-1/2 rounded-full blur-[2px] ${enemy ? '-top-24 bg-gradient-to-b from-transparent via-fuchsia-300 to-white shadow-[0_0_24px_rgba(217,70,239,1)]' : '-bottom-24 bg-gradient-to-t from-transparent via-cyan-200 to-white shadow-[0_0_24px_rgba(34,211,238,1)]'}`} />
        <span className={`pointer-events-none absolute left-1/2 z-10 h-20 w-16 -translate-x-1/2 rounded-[50%] blur-xl ${enemy ? '-top-14 bg-fuchsia-400/45' : '-bottom-14 bg-cyan-300/45'}`} />
      </>}
      {isAttacking && (combatAnimation?.phase === 'ATTACK' || combatAnimation?.phase === 'IMPACT') && <>
        {attackArchetype === 'ASSAULT' && <><span className="nexa-signature-assault pointer-events-none absolute left-1/2 top-1/2 z-30 h-2 w-[175%] -translate-x-1/2 -translate-y-1/2 -rotate-[16deg] rounded-full"/><span className="nexa-signature-assault nexa-signature-assault-b pointer-events-none absolute left-1/2 top-1/2 z-30 h-1.5 w-[150%] -translate-x-1/2 -translate-y-1/2 rotate-[20deg] rounded-full"/></>}
        {attackArchetype === 'TANK' && <><span className="nexa-signature-tank pointer-events-none absolute left-1/2 top-1/2 z-30 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px]"/><span className="nexa-signature-tank-core pointer-events-none absolute left-1/2 top-1/2 z-30 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"/></>}
        {attackArchetype === 'SPEED' && <>{[0,1,2,3].map((i)=><span key={`speed-${i}`} className={`nexa-signature-speed nexa-signature-speed-${i} pointer-events-none absolute left-1/2 z-30 h-px w-[150%] -translate-x-1/2 bg-cyan-100`}/>)}</>}
        {attackArchetype === 'SUPPORT' && <><span className="nexa-signature-support pointer-events-none absolute left-1/2 top-1/2 z-30 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-200/80"/><span className="nexa-signature-support-core pointer-events-none absolute left-1/2 top-1/2 z-30 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"/></>}
        {attackArchetype === 'BALANCED' && <><span className="nexa-signature-balanced pointer-events-none absolute left-1/2 top-1/2 z-30 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-cyan-100/80"/><span className="nexa-signature-balanced nexa-signature-balanced-b pointer-events-none absolute left-1/2 top-1/2 z-30 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-fuchsia-200/80"/></>}
      </>}
      {isImpacted && combatAnimation?.phase === 'IMPACT' && <>
        <span className="nexa-damage-surface pointer-events-none absolute inset-0 z-[35] rounded-2xl" />
        <span className="nexa-damage-crack nexa-damage-crack-a pointer-events-none absolute left-[16%] top-[28%] z-[36] h-[2px] w-[72%] origin-left rotate-[18deg] bg-white" />
        <span className="nexa-damage-crack nexa-damage-crack-b pointer-events-none absolute left-[28%] top-[58%] z-[36] h-[2px] w-[58%] origin-left -rotate-[27deg] bg-cyan-100" />
        <span className="nexa-impact-flash pointer-events-none absolute -inset-6 z-20 rounded-[50%]" />
        <span className="nexa-impact-ring pointer-events-none absolute left-1/2 top-1/2 z-30 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90" />
        <span className="nexa-impact-ring nexa-impact-ring-2 pointer-events-none absolute left-1/2 top-1/2 z-30 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-200/80" />
        <span className="nexa-impact-slash pointer-events-none absolute left-1/2 top-1/2 z-30 h-1.5 w-[145%] -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] rounded-full bg-white" />
        <span className="nexa-impact-slash nexa-impact-slash-2 pointer-events-none absolute left-1/2 top-1/2 z-30 h-1 w-[120%] -translate-x-1/2 -translate-y-1/2 rotate-[31deg] rounded-full bg-cyan-100" />
        <span className="nexa-impact-core pointer-events-none absolute left-1/2 top-1/2 z-30 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        {[0,1,2,3,4,5,6,7].map((spark) => <span key={`impact-${spark}`} className={`nexa-spark nexa-spark-${spark} pointer-events-none absolute left-1/2 top-1/2 z-30 h-1.5 w-7 rounded-full bg-gradient-to-r from-white via-cyan-100 to-transparent`} />)}
        {[0,1,2,3,4,5].map((debris) => <span key={`debris-${debris}`} className={`nexa-debris nexa-debris-${debris} pointer-events-none absolute left-1/2 top-1/2 z-30 h-2.5 w-1 bg-fuchsia-100`} />)}
        <span className="nexa-shock-line pointer-events-none absolute left-1/2 top-1/2 z-30 h-[2px] w-[180%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white to-transparent" />
      </>}
      {isKoSequence && combatAnimation?.phase === 'RECOVER' && <>
        <span className="nexa-ko-collapse pointer-events-none absolute -inset-2 z-[34] rounded-2xl" />
        <span className="nexa-ko-void" aria-hidden="true" />
        <span className="nexa-ko-disintegrate" aria-hidden="true" />
        <span className="nexa-ko-vacancy" aria-hidden="true" />
        <span className="nexa-ko-fracture nexa-ko-fracture-a pointer-events-none absolute left-[8%] top-[34%] z-[38] h-[2px] w-[86%] rotate-[13deg] bg-white" />
        <span className="nexa-ko-fracture nexa-ko-fracture-b pointer-events-none absolute left-[15%] top-[54%] z-[38] h-[2px] w-[74%] -rotate-[21deg] bg-fuchsia-100" />
        <span className="nexa-ko-fracture nexa-ko-fracture-c pointer-events-none absolute left-[24%] top-[69%] z-[38] h-[2px] w-[58%] rotate-[31deg] bg-cyan-100" />
        <span className="nexa-ko-aura pointer-events-none absolute -inset-5 z-20 rounded-2xl" />
        <span className="nexa-ko-scan pointer-events-none absolute inset-x-0 top-0 z-30 h-1 bg-white" />
        <span className="nexa-ko-text pointer-events-none absolute inset-x-0 top-1/2 z-40 -translate-y-1/2 text-center text-3xl font-black tracking-[0.35em] text-white">KO</span>
        {[0,1,2,3,4,5,6,7,8,9,10,11].map((particle) => <span key={`ko-${particle}`} className={`nexa-ko-particle nexa-ko-particle-${particle} pointer-events-none absolute left-1/2 top-1/2 z-30 h-2 w-2 rounded-sm bg-cyan-100`} />)}
        <span className="nexa-ko-glitch nexa-ko-glitch-a pointer-events-none absolute inset-x-1 top-[24%] z-30 h-[3px] bg-cyan-100" />
        <span className="nexa-ko-glitch nexa-ko-glitch-b pointer-events-none absolute inset-x-2 top-[61%] z-30 h-[2px] bg-fuchsia-200" />
      </>}
      {feedback && (!isImpacted || combatAnimation?.phase === 'IMPACT' || combatAnimation?.phase === 'RECOVER') && (
        <>
          <span className={`nexa-damage-number nexa-damage-readout ${
            feedback.kind === 'heal'
              ? 'nexa-damage-readout--heal'
              : feedback.kind === 'defeat'
                ? 'nexa-damage-readout--defeat'
                : 'text-rose-200'
          }`}>{feedback.text}</span>
          {feedback.kind === 'damage' && <span className="nexa-hp-shock" aria-hidden="true" />}
        </>
      )}
      {!compact && <span className={`pointer-events-none absolute inset-1 z-10 rounded-[0.85rem] border ${enemy ? 'border-fuchsia-200/10' : 'border-cyan-100/10'}`} />}
      <img
        src={getBattleCardImage(entry.card)}
        alt=""
        className={compact ? 'h-12 w-full rounded-lg object-cover brightness-110 sm:h-14' : 'h-20 w-full rounded-xl object-cover brightness-110 contrast-105 sm:h-24 lg:h-[clamp(78px,11vh,112px)]'}
      />
      <div className={compact ? 'px-0.5 pt-1' : 'pt-2'}>
        <strong className="block truncate text-xs font-bold text-slate-100 sm:text-sm">{entry.card.name}</strong>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">
          <span className="font-bold">HP {displayedHp}/{entry.card.stats.hp}</span>
          {!compact && <span className="text-slate-500">·</span>}
          {!compact && <span>⚡ {entry.card.deployCost}</span>}
        </div>
        {!compact && (
          <>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <span className={`block h-full rounded-full transition-all duration-500 ease-out ${hpPercent <= 30 ? 'bg-rose-400' : 'bg-gradient-to-r from-cyan-400 to-emerald-300'}`} style={{ width: `${hpPercent}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-3 text-[10px] font-bold text-slate-400">
              <span>⚔ {entry.card.stats.attack}</span>
              <span>◆ {entry.card.stats.defense}</span>
              <span>⚡ {entry.card.stats.speed}</span>
            </div>
          </>
        )}
        <span className="mt-1 block truncate text-[10px] font-semibold tracking-wide text-cyan-200">
          {entry.card.ability ? entry.card.ability.id : '—'}
        </span>
      </div>
    </button>
  );
};

const EnergyPips: React.FC<{ current: number; max: number }> = ({ current, max }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: max }, (_, index) => (
      <span key={index} className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${index < current ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]' : 'bg-slate-700'}`} />
    ))}
    <span className="ml-1 text-xs font-bold text-cyan-100">{current}/{max}</span>
  </div>
);

const LifeDots: React.FC<{ player: RiftBattleState['players'][RiftBattlePlayerId] }> = ({ player }) => (
  <div className="flex gap-1" aria-label={`${player.cards.filter((card) => card.state !== 'DEFEATED').length} cartas vivas`}>
    {player.cards.map((card) => <span key={card.card.id} className={`h-2 w-2 rounded-full ${card.state === 'DEFEATED' ? 'bg-slate-700' : 'bg-cyan-300 shadow-[0_0_7px_rgba(103,232,249,0.8)]'}`} />)}
  </div>
);

const FormationGlyphs: React.FC<{ player: RiftBattleState['players'][RiftBattlePlayerId] }> = ({ player }) => (
  <div className="mt-2 flex gap-1" aria-label="Composição da formação">
    {player.cards.map((entry) => (
      <span key={entry.card.id} className={`flex h-5 w-5 items-center justify-center rounded border text-[9px] font-black ${
        entry.state === 'DEFEATED'
          ? 'border-slate-700 bg-slate-900/70 text-slate-600'
          : entry.state === 'ACTIVE'
            ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-200'
            : 'border-fuchsia-300/35 bg-fuchsia-400/10 text-fuchsia-200'
      }`}>
        {entry.state === 'DEFEATED' ? 'X' : entry.state === 'ACTIVE' ? 'A' : 'R'}
      </span>
    ))}
  </div>
);

const CatalogCard: React.FC<{ card: RiftBattleCard; selected: boolean; onSelect: () => void }> = ({ card, selected, onSelect }) => (
  <button type="button" onClick={onSelect} className={`relative rounded-2xl border p-2 text-left transition-all ${selected ? 'border-cyan-200 bg-cyan-400/15 shadow-[0_0_24px_rgba(34,211,238,0.3)]' : 'border-white/10 bg-[#0b1220]/90 hover:border-cyan-300/50'}`}>
    {selected && <span className="absolute right-2 top-2 z-10 rounded bg-cyan-300 px-1.5 py-0.5 text-[9px] font-black text-slate-950">SELECIONADA</span>}
    <img src={getBattleCardImage(card)} alt="" className="h-28 w-full rounded-xl object-cover sm:h-36" />
    <strong className="mt-2 block truncate text-xs text-slate-100">{card.name}</strong>
    <div className="mt-1 grid grid-cols-3 text-[10px] font-bold text-slate-400"><span>HP {card.stats.hp}</span><span>⚔ {card.stats.attack}</span><span>◆ {card.stats.defense}</span></div>
    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400"><span>SPD {card.stats.speed}</span><span>⚡ {card.deployCost}</span></div>
    <span className="mt-1 block truncate text-[10px] font-bold text-cyan-200">{card.ability ? `${PASSIVE_ABILITIES.has(card.ability.id) ? 'PASSIVA' : 'ATIVA'} · ${card.ability.id}` : 'Sem habilidade'} · {card.archetype}</span>
    {card.ability && <span className="mt-0.5 block truncate text-[9px] text-slate-500">{ABILITY_DESCRIPTIONS[card.ability.id]}</span>}
  </button>
);

export const RiftBattleV2: React.FC = () => {
  const { user, syncUser } = useAuth();
  const { assets } = useGameState();
  const ownedCards = useMemo(
    () => assets.filter((asset): asset is Card => asset.type === 'Card' && asset.ownerId === user.id),
    [assets, user.id],
  );
  const ownedPlayableCards = useMemo(
    () => createOwnedRiftBattleCards(ownedCards),
    [ownedCards],
  );
  const ownedPlayableById = useMemo(
    () => new Map(ownedPlayableCards.map((card) => [card.id, card])),
    [ownedPlayableCards],
  );

  const [state, setState] = useState<RiftBattleState>(() => createInitialState());
  const [screen, setScreen] = useState<'SETUP' | 'VS' | 'BATTLE'>('SETUP');
  const [selectedSquad, setSelectedSquad] = useState<string[]>([]);
  const [selectedArenaId, setSelectedArenaId] = useState(RIFTBATTLE_STANDARD_ARENA.id);
  const selectedArena = getRiftBattleArena(selectedArenaId);
  const [opponentTeam, setOpponentTeam] = useState<string[]>(PLAYER_TWO_TEAM);
  const [difficulty, setDifficulty] = useState<RiftBattleDifficulty>('OPERADOR');
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState<number>();
  const [showHints, setShowHints] = useState(true);
  const [intro, setIntro] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const [selectedAction, setSelectedAction] = useState<'ATTACK' | 'ABILITY'>();
  const [message, setMessage] = useState('');
  const validationRequestRef = useRef<{ key: string; requestId: string }>();
  const validationBusyRef = useRef(false);
  const validationEpochRef = useRef(0);
  const validationOwnerRef = useRef(user.id);
  validationOwnerRef.current = user.id;
  const [validating, setValidating] = useState(false);
  useEffect(() => () => { validationEpochRef.current += 1; }, []);
  const [feedback, setFeedback] = useState<Feedback>();
  const [combatAnimation, setCombatAnimation] = useState<CombatAnimation>();
  const [abilityAnimation, setAbilityAnimation] = useState<AbilityAnimation>();
  const [deployAnimation, setDeployAnimation] = useState<DeployAnimation>();
  const [turnAnimation, setTurnAnimation] = useState<TurnAnimation>();
  const [showResultCinematic, setShowResultCinematic] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [logId, setLogId] = useState(0);
  const stateRef = useRef(state);
  const aiTimerRef = useRef<number>();
  const aiRunningRef = useRef(false);
  const aiTurnRef = useRef<string>();
  const aiActionsRef = useRef(0);
  const introTimerRef = useRef<number>();
  const previousTurnRef = useRef<{ playerId: RiftBattlePlayerId; turn: number }>();
  const preparedStateRef = useRef<RiftBattleState>();
  const runIdRef = useRef<string>();
  const playerActionsRef = useRef<RiftBattleAction[]>([]);
  const settlementBusyRef = useRef(false);
  const [earnedReward, setEarnedReward] = useState<RiftBattleReward>();

  const currentPlayer = state.players[state.currentPlayerId];
  const opponentId: RiftBattlePlayerId = state.currentPlayerId === 'PLAYER_ONE' ? 'PLAYER_TWO' : 'PLAYER_ONE';
  const opponent = state.players[opponentId];

  const humanAliveCount = state.players[HUMAN_PLAYER_ID].cards.filter((entry) => entry.state !== 'DEFEATED').length;
  const aiAliveCount = state.players[AI_PLAYER_ID].cards.filter((entry) => entry.state !== 'DEFEATED').length;
  const lastNexusSide =
    humanAliveCount === 1 && aiAliveCount === 1 ? 'BOTH'
      : humanAliveCount === 1 ? 'HUMAN'
        : aiAliveCount === 1 ? 'AI'
          : undefined;

  const selectedEntry = currentPlayer.cards.find((entry) => entry.card.id === selectedCardId);
  const selectedAbility = selectedEntry?.card.ability?.id;
  const targetMode = Boolean(selectedAction);
  const targetPlayer = selectedAbility === 'IMPULSO' ? currentPlayer : opponent;
  const activeCards = currentPlayer.cards.filter((entry) => entry.state === 'ACTIVE');
  const filteredCatalog = useMemo(
    () => ownedPlayableCards.filter((card) => card.name.toLowerCase().includes(search.toLowerCase()) && (!costFilter || card.deployCost === costFilter)),
    [ownedPlayableCards, search, costFilter],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setSelectedSquad((current) => current.filter((id) => ownedPlayableById.has(id)));
  }, [ownedPlayableById]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(undefined), 2850);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!abilityAnimation) return;
    const timer = window.setTimeout(() => setAbilityAnimation(undefined), 1900);
    return () => window.clearTimeout(timer);
  }, [abilityAnimation]);

  useEffect(() => {
    if (!deployAnimation) return;
    const timer = window.setTimeout(() => setDeployAnimation(undefined), deployAnimation.investida ? 2100 : 1800);
    return () => window.clearTimeout(timer);
  }, [deployAnimation]);

  useEffect(() => {
    if (screen !== 'BATTLE' || intro || state.phase === 'FINISHED') return;
    const previous = previousTurnRef.current;
    const changed = previous && (previous.playerId !== state.currentPlayerId || previous.turn !== state.turn);
    previousTurnRef.current = { playerId: state.currentPlayerId, turn: state.turn };
    if (!changed) return;
    const player = state.players[state.currentPlayerId];
    setTurnAnimation({ playerId: state.currentPlayerId, turn: state.turn, energy: player.maxEnergy, token: Date.now() });
  }, [screen, intro, state.currentPlayerId, state.turn, state.phase]);

  useEffect(() => {
    if (!turnAnimation) return;
    const timer = window.setTimeout(() => setTurnAnimation(undefined), 1450);
    return () => window.clearTimeout(timer);
  }, [turnAnimation]);

  useEffect(() => {
    if (!combatAnimation) return;
    const nextPhase: CombatAnimation['phase'] | undefined =
      combatAnimation.phase === 'PREPARE' ? 'ATTACK'
        : combatAnimation.phase === 'ATTACK' ? 'IMPACT'
          : combatAnimation.phase === 'IMPACT' ? 'RECOVER'
            : undefined;
    const duration = combatAnimation.phase === 'PREPARE' ? 400
      : combatAnimation.phase === 'ATTACK' ? 650
        : combatAnimation.phase === 'IMPACT' ? 720
          : combatAnimation.defeated ? 1900 : 1050;
    const timer = window.setTimeout(() => {
      if (nextPhase) setCombatAnimation((current) => current ? { ...current, phase: nextPhase } : undefined);
      else setCombatAnimation(undefined);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [combatAnimation]);

  useEffect(() => {
    if (!state.result) {
      setShowResultCinematic(false);
      return;
    }
    // Keep the final KO visible before the arena-wide result presentation takes over.
    const delay = combatAnimation ? (combatAnimation.defeated ? 2050 : 1050) : 450;
    const timer = window.setTimeout(() => setShowResultCinematic(true), delay);
    return () => window.clearTimeout(timer);
  }, [state.result, combatAnimation?.token]);

  useEffect(() => {
    if (!state.result || !runIdRef.current || settlementBusyRef.current || earnedReward) return;
    settlementBusyRef.current = true;
    const runId = runIdRef.current;
    const actions = [...playerActionsRef.current];
    void (async () => {
      try {
        const settled = await finishAuthoritativeRiftBattleV2(runId, actions);
        setEarnedReward(settled.reward);
        const confirmed = await SupabaseService.fetchRemoteProfile(user.id);
        if (confirmed) syncUser(confirmed);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Falha ao confirmar a recompensa.');
        settlementBusyRef.current = false;
      }
    })();
  }, [state.result, earnedReward, user.id, syncUser]);

  const addLog = (text: string) => {
    setLogId((id) => {
      const nextId = id + 1;
      setLogs((items) => [...items, { id: nextId, text }].slice(-5));
      return nextId;
    });
  };

  const perform = (action: RiftBattleAction, successText?: string) => {
    if (combatAnimation || abilityAnimation || deployAnimation) return;
    try {
      const previous = state;
      const next = applyRiftBattleAction(previous, action);
      const previousTarget = action.type === 'ATTACK' || action.type === 'USE_ABILITY'
        ? (action.type === 'ATTACK' ? previous.players[opponentId] : previous.players[opponentId])
        : undefined;
      const nextTarget = action.type === 'ATTACK' || action.type === 'USE_ABILITY'
        ? (action.type === 'ATTACK' ? next.players[opponentId] : next.players[opponentId])
        : undefined;
      if (previousTarget && nextTarget) {
        const changed = nextTarget.cards.find((card) => {
          const oldCard = previousTarget.cards.find((item) => item.card.id === card.card.id);
          return oldCard && card.currentHp < oldCard.currentHp;
        });
        const healed = next.players[state.currentPlayerId].cards.find((card) => {
          const oldCard = previous.players[state.currentPlayerId].cards.find((item) => item.card.id === card.card.id);
          return oldCard && card.currentHp > oldCard.currentHp;
        });
        if (changed) {
          const oldCard = previousTarget.cards.find((card) => card.card.id === changed.card.id)!;
          setFeedback({ id: changed.card.id, text: `-${oldCard.currentHp - changed.currentHp}`, kind: changed.currentHp === 0 ? 'defeat' : 'damage' });
          addLog(`${changed.card.name} sofreu ${oldCard.currentHp - changed.currentHp} de dano.`);
          if (changed.currentHp === 0) addLog(`${changed.card.name} foi derrotada.`);
        } else if (healed) {
          const oldCard = previous.players[state.currentPlayerId].cards.find((card) => card.card.id === healed.card.id)!;
          setFeedback({ id: healed.card.id, text: `+${healed.currentHp - oldCard.currentHp} HP`, kind: 'heal' });
          addLog(`${healed.card.name} recuperou ${healed.currentHp - oldCard.currentHp} HP.`);
        }
      }
      if (action.type === 'DEPLOY_CARD') {
        const deployed = next.players[state.currentPlayerId].cards.find((entry) => entry.card.id === action.cardId);
        if (deployed) setDeployAnimation({ cardId: deployed.card.id, cardName: deployed.card.name, actorPlayerId: state.currentPlayerId, investida: deployed.card.ability?.id === 'INVESTIDA', token: Date.now() });
      }
      if (action.type === 'ATTACK') {
        const resolvedTarget = next.players[opponentId].cards.find((entry) => entry.card.id === action.targetId);
        setCombatAnimation({ attackerId: action.attackerId, targetId: action.targetId, targetPlayerId: opponentId, phase: 'PREPARE', defeated: resolvedTarget?.state === 'DEFEATED', previousHp: previous.players[opponentId].cards.find((entry) => entry.card.id === action.targetId)?.currentHp, token: Date.now() });
      }
      if (action.type === 'USE_ABILITY') {
        setAbilityAnimation({ abilityId: action.abilityId, actorPlayerId: state.currentPlayerId, token: Date.now() });
      }
      setState(next);
      stateRef.current = next;
      if (action.playerId === HUMAN_PLAYER_ID) playerActionsRef.current.push(action);
      setSelectedAction(undefined);
      setSelectedCardId(undefined);
      setMessage('');
      if (successText) addLog(successText);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ação inválida.');
    }
  };

  const performAiAction = () => {
    const current = stateRef.current;
    if (current.phase === 'FINISHED' || current.currentPlayerId !== AI_PLAYER_ID) {
      aiRunningRef.current = false;
      return;
    }
    if (aiActionsRef.current >= MAX_AI_ACTIONS_PER_TURN) {
      try {
        const next = applyRiftBattleAction(current, { type: 'END_TURN', playerId: AI_PLAYER_ID });
        stateRef.current = next;
        setState(next);
        addLog('IA encerrou o turno por segurança.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Não foi possível encerrar o turno da IA.');
      }
      aiRunningRef.current = false;
      return;
    }

    const action = chooseRiftBattleAiAction(current, AI_PLAYER_ID, difficulty);
    if (!action) {
      aiRunningRef.current = false;
      return;
    }
    let nextAiDelay = AI_ACTION_DELAY_MS;
    try {
      const next = applyRiftBattleAction(current, action);
      stateRef.current = next;
      setState(next);
      aiActionsRef.current += 1;
      const actor = current.players[AI_PLAYER_ID].cards.find((entry) =>
        action.type === 'DEPLOY_CARD'
          ? entry.card.id === action.cardId
          : action.type === 'ATTACK'
            ? entry.card.id === action.attackerId
            : action.type === 'USE_ABILITY'
              ? entry.card.id === action.cardId
              : false,
      );
      const targetId = action.type === 'ATTACK' ? action.targetId : action.type === 'USE_ABILITY' ? action.targetCardId : undefined;
      const targetOwner = action.type === 'USE_ABILITY' && action.abilityId === 'IMPULSO' ? AI_PLAYER_ID : HUMAN_PLAYER_ID;
      const target = targetId ? next.players[targetOwner].cards.find((entry) => entry.card.id === targetId) : undefined;
      const changedTarget = targetId ? next.players[targetOwner].cards.find((entry) => entry.card.id === targetId) : undefined;
      const previousTarget = targetId ? current.players[targetOwner].cards.find((entry) => entry.card.id === targetId) : undefined;
      if (action.type === 'DEPLOY_CARD') {
        addLog(`${actor?.card.name ?? 'Carta'} entrou em campo.`);
        if (actor) setDeployAnimation({ cardId: actor.card.id, cardName: actor.card.name, actorPlayerId: AI_PLAYER_ID, investida: actor.card.ability?.id === 'INVESTIDA', token: Date.now() });
        nextAiDelay = Math.max(nextAiDelay, actor?.card.ability?.id === 'INVESTIDA' ? 2450 : 2100);
      }
      if (action.type === 'ATTACK') addLog(`${actor?.card.name ?? 'Carta'} atacou ${target?.card.name ?? 'o alvo'}.`);
      if (action.type === 'USE_ABILITY') addLog(`${actor?.card.name ?? 'Carta'} usou ${action.abilityId}.`);
      if (action.type === 'END_TURN') addLog('IA encerrou o turno.');
      if (changedTarget && previousTarget && changedTarget.currentHp < previousTarget.currentHp) {
        const damage = previousTarget.currentHp - changedTarget.currentHp;
        setFeedback({ id: changedTarget.card.id, text: `-${damage}`, kind: changedTarget.currentHp === 0 ? 'defeat' : 'damage' });
        addLog(`${changedTarget.card.name} sofreu ${damage} de dano.`);
        if (changedTarget.currentHp === 0) addLog(`${changedTarget.card.name} foi derrotada.`);
      }
      if (action.type === 'ATTACK') {
        setCombatAnimation({ attackerId: action.attackerId, targetId: action.targetId, targetPlayerId: targetOwner, phase: 'PREPARE', defeated: changedTarget?.state === 'DEFEATED', previousHp: previousTarget?.currentHp, token: Date.now() });
        nextAiDelay = changedTarget?.state === 'DEFEATED' ? 4100 : 3250;
      }
      if (action.type === 'USE_ABILITY') {
        setAbilityAnimation({ abilityId: action.abilityId, actorPlayerId: AI_PLAYER_ID, token: Date.now() });
        nextAiDelay = Math.max(nextAiDelay, 2250);
      }
      if (targetOwner === AI_PLAYER_ID && changedTarget && previousTarget && changedTarget.currentHp > previousTarget.currentHp) {
        addLog(`${changedTarget.card.name} recuperou ${changedTarget.currentHp - previousTarget.currentHp} HP.`);
      }
      if (next.result) aiRunningRef.current = false;
    } catch (error) {
      addLog(`Ação da IA rejeitada: ${error instanceof Error ? error.message : 'ação inválida.'}`);
      try {
        const next = applyRiftBattleAction(current, { type: 'END_TURN', playerId: AI_PLAYER_ID });
        stateRef.current = next;
        setState(next);
      } catch (endError) {
        setMessage(endError instanceof Error ? endError.message : 'A IA não conseguiu encerrar o turno.');
      }
      aiRunningRef.current = false;
      return;
    }
    if (stateRef.current.currentPlayerId === AI_PLAYER_ID && !stateRef.current.result) {
      aiTimerRef.current = window.setTimeout(performAiAction, nextAiDelay);
    } else {
      aiRunningRef.current = false;
    }
  };

  useEffect(() => {
    if (state.currentPlayerId !== AI_PLAYER_ID || state.phase === 'FINISHED') {
      if (state.currentPlayerId === HUMAN_PLAYER_ID) aiRunningRef.current = false;
      return;
    }
    const turnKey = `${state.turn}:${state.currentPlayerId}`;
    if (aiTurnRef.current !== turnKey) {
      aiTurnRef.current = turnKey;
      aiActionsRef.current = 0;
    }
    if (!aiRunningRef.current) {
      aiRunningRef.current = true;
      aiTimerRef.current = window.setTimeout(performAiAction, AI_ACTION_DELAY_MS);
    }
    return () => {
      if (aiTimerRef.current !== undefined) window.clearTimeout(aiTimerRef.current);
      aiRunningRef.current = false;
    };
  }, [state.currentPlayerId, state.turn, state.phase, difficulty]);

  useEffect(() => () => {
    if (aiTimerRef.current !== undefined) window.clearTimeout(aiTimerRef.current);
    if (introTimerRef.current !== undefined) window.clearTimeout(introTimerRef.current);
    aiRunningRef.current = false;
  }, []);

  const selectCard = (playerId: RiftBattlePlayerId, entry: RiftBattleCardStateEntry) => {
    if (combatAnimation || abilityAnimation || deployAnimation) return;
    if (state.currentPlayerId !== HUMAN_PLAYER_ID) return;
    if (targetMode && playerId !== state.currentPlayerId && entry.state === 'ACTIVE' && entry.currentHp > 0) {
      if (selectedAction === 'ATTACK' || needsTarget(selectedAbility)) {
        perform(
          selectedAction === 'ATTACK'
            ? { type: 'ATTACK', playerId: state.currentPlayerId, attackerId: selectedEntry!.card.id, targetId: entry.card.id }
            : { type: 'USE_ABILITY', playerId: state.currentPlayerId, cardId: selectedEntry!.card.id, abilityId: selectedAbility!, targetCardId: entry.card.id },
          selectedAction === 'ATTACK' ? 'Ataque realizado.' : `${selectedAbility} utilizada.`,
        );
      }
      return;
    }
    if (targetMode && playerId === state.currentPlayerId && selectedAbility === 'IMPULSO' && entry.state === 'ACTIVE') {
      perform({ type: 'USE_ABILITY', playerId: state.currentPlayerId, cardId: selectedEntry!.card.id, abilityId: 'IMPULSO', targetCardId: entry.card.id }, 'IMPULSO utilizado.');
      return;
    }
    if (playerId === state.currentPlayerId) {
      setSelectedCardId(entry.card.id);
      setSelectedAction(undefined);
      setMessage('');
    }
  };

  const getOwnedBattleCard = (id: string): RiftBattleCard => {
    const card = ownedPlayableById.get(id);
    if (!card) throw new Error('Carta do inventário não está mais disponível para batalha.');
    return card;
  };

  const prepareMatch = async (): Promise<RiftBattleState | null> => {
    if (validationBusyRef.current) return null;
    const epoch = validationEpochRef.current;
    const owner = user.id;
    validationBusyRef.current = true;
    setValidating(true);
    setMessage('');
    setEarnedReward(undefined);
    try {
      const key = JSON.stringify([owner, selectedArena.id, selectedSquad, difficulty]);
      if (validationRequestRef.current?.key !== key) {
        validationRequestRef.current = { key, requestId: crypto.randomUUID() };
      }
      const started = await startAuthoritativeRiftBattleV2({
        requestId: validationRequestRef.current.requestId,
        arenaId: selectedArena.id,
        instanceIds: selectedSquad,
        difficulty,
      });
      if (epoch !== validationEpochRef.current || owner !== validationOwnerRef.current) return null;
      const next = initializeRiftBattle(started.playerCards, started.opponentCards, started.arena);
      runIdRef.current = started.runId;
      playerActionsRef.current = [];
      preparedStateRef.current = next;
      setOpponentTeam(started.opponentCards.map((card) => card.id));
      return next;
    } catch (error) {
      if (epoch === validationEpochRef.current) {
        setMessage(error instanceof Error ? error.message : 'Falha ao iniciar a partida segura.');
      }
      return null;
    } finally {
      validationBusyRef.current = false;
      if (epoch === validationEpochRef.current) setValidating(false);
    }
  };

  const reset = async () => {
    const next = await prepareMatch();
    if (!next) return;
    if (aiTimerRef.current !== undefined) window.clearTimeout(aiTimerRef.current);
    aiRunningRef.current = false;
    if (introTimerRef.current !== undefined) window.clearTimeout(introTimerRef.current);
    stateRef.current = next;
    setState(next);
    setScreen('BATTLE');
    setIntro(false);
    setSelectedCardId(undefined);
    setSelectedAction(undefined);
    setMessage('');
    setFeedback(undefined);
    setCombatAnimation(undefined);
    setShowResultCinematic(false);
    setEarnedReward(undefined);
    settlementBusyRef.current = false;
    validationRequestRef.current = undefined;
    setLogs([]);
  };

  const alterSquad = () => {
    if (validationBusyRef.current) return;
    validationRequestRef.current = undefined;
    preparedStateRef.current = undefined;
    runIdRef.current = undefined;
    playerActionsRef.current = [];
    setEarnedReward(undefined);
    if (aiTimerRef.current !== undefined) window.clearTimeout(aiTimerRef.current);
    aiRunningRef.current = false;
    setScreen('SETUP');
    setIntro(false);
    setSelectedSquad([]);
    setSearch('');
    setCostFilter(undefined);
  };

  const continueToMatch = async () => {
    if (selectedSquad.length !== selectedArena.teamSize) return;
    validationRequestRef.current = undefined;
    const next = await prepareMatch();
    if (!next) return;
    setScreen('VS');
  };

  const startBattle = async () => {
    const next = preparedStateRef.current ?? await prepareMatch();
    if (!next) return;
    preparedStateRef.current = undefined;
    stateRef.current = next;
    setState(next);
    setScreen('BATTLE');
    setShowResultCinematic(false);
    setIntro(true);
    setTurnAnimation(undefined);
    previousTurnRef.current = undefined;
    if (introTimerRef.current !== undefined) window.clearTimeout(introTimerRef.current);
    introTimerRef.current = window.setTimeout(() => setIntro(false), 800);
  };

  const renderZone = (playerId: RiftBattlePlayerId, title: string) => {
    const player = state.players[playerId];
    const active = player.cards.filter((entry) => entry.state === 'ACTIVE');
    const reserve = player.cards.filter((entry) => entry.state === 'RESERVE');
    const defeated = player.cards.filter((entry) => entry.state === 'DEFEATED');
    const aliveCount = player.cards.filter((entry) => entry.state !== 'DEFEATED').length;
    const isCurrent = playerId === state.currentPlayerId;
    const isWarLayout = state.arena.activeSlots >= 4;
    const defeatedSnapshot = combatAnimation?.targetPlayerId === playerId
      ? player.cards.find((entry) => entry.card.id === combatAnimation.targetId && entry.state === 'DEFEATED')
      : undefined;
    const visualActive = defeatedSnapshot && combatAnimation
      ? [defeatedSnapshot, ...active].slice(0, state.arena.activeSlots)
      : active;

    const renderReserveRail = (entries: RiftBattleCardStateEntry[]) => {
      const reserveCardWidth =
        entries.length >= 6 ? 'w-[66px] sm:w-[72px]' :
        entries.length === 5 ? 'w-[72px] sm:w-[78px]' :
        entries.length === 4 ? 'w-[78px] sm:w-[86px]' :
        entries.length === 3 ? 'w-[86px] sm:w-[96px]' :
        entries.length === 2 ? 'w-[96px] sm:w-[108px]' :
        'w-[108px] sm:w-[118px]';

      return (
        <div className={`relative flex min-h-[76px] w-full max-w-[470px] shrink-0 items-center justify-center gap-1.5 rounded-xl border bg-slate-950/25 px-2 pb-1 pt-4 shadow-[inset_0_0_18px_rgba(255,255,255,0.04)] ${playerId === AI_PLAYER_ID ? 'border-fuchsia-300/20 bg-fuchsia-500/[0.05]' : 'border-cyan-300/20 bg-cyan-500/[0.05]'}`}>
          <span className={`pointer-events-none absolute left-2 top-1 text-[7px] font-black uppercase tracking-[0.22em] ${playerId === AI_PLAYER_ID ? 'text-fuchsia-200/55' : 'text-cyan-200/55'}`}>{playerId === AI_PLAYER_ID ? 'RESERVA INIMIGA' : 'SUA RESERVA'}</span>
          {active.length < state.arena.activeSlots && reserve.length > 0 && isCurrent && !combatAnimation && <span className="nexa-reserve-ready" aria-hidden="true" />}
          {entries.map((entry) => (
            <div key={entry.card.id} className={`${reserveCardWidth} shrink-0 opacity-75 transition-all hover:opacity-100`}>
              <BattleCard entry={entry} compact enemy={playerId === AI_PLAYER_ID} canDeploy={isCurrent && !targetMode} selected={selectedCardId === entry.card.id} dimmed={targetMode} combatAnimation={combatAnimation} onSelect={() => selectCard(playerId, entry)} />
            </div>
          ))}
        </div>
      );
    };

    return (
      <section className={`relative z-10 self-start px-1 sm:px-2 ${isWarLayout ? 'py-0' : state.arena.activeSlots === 3 ? 'py-0 lg:scale-[0.88]' : 'py-1'} ${isCurrent ? 'text-cyan-50' : 'text-fuchsia-50'} ${state.arena.activeSlots >= 3 ? '' : playerId === AI_PLAYER_ID ? 'lg:translate-y-0 lg:scale-[0.95]' : 'lg:translate-y-[-2px] lg:scale-[1.04]'}`}>
        <div className="relative z-20 mb-1 flex items-center justify-between px-2 pb-1 sm:px-3 lg:hidden">
          <div>
            <div className="flex items-center gap-2"><p className={`text-[11px] font-black uppercase tracking-[0.28em] ${isCurrent ? 'text-cyan-200' : 'text-fuchsia-200'}`}>{title}</p><LifeDots player={player} /></div>
            <span className="hidden text-[9px] text-slate-500 sm:inline">{defeated.length ? `${defeated.length} eliminada${defeated.length > 1 ? 's' : ''}` : 'formação completa'}</span>
          </div>
          <div className={`text-right text-xs font-bold ${isCurrent ? 'text-cyan-100' : 'text-fuchsia-100'}`}>⚡ {player.currentEnergy}/{player.maxEnergy}</div>
        </div>

        <div className={`relative mx-auto flex max-w-5xl flex-col items-center justify-center gap-1.5 ${isWarLayout ? 'lg:max-w-[650px]' : state.arena.activeSlots === 3 ? 'lg:max-w-[620px]' : 'lg:max-w-[560px]'}`}>
          {playerId === AI_PLAYER_ID && reserve.length > 0 && renderReserveRail(reserve)}

          <div className={`relative w-full rounded-2xl border px-2 pb-2 pt-5 ${isWarLayout ? 'max-w-[560px]' : state.arena.activeSlots === 3 ? 'max-w-[500px]' : 'max-w-[420px]'} ${playerId === AI_PLAYER_ID ? 'border-fuchsia-300/15 bg-fuchsia-500/[0.025]' : 'border-cyan-300/15 bg-cyan-500/[0.025]'}`}>
            <span className={`pointer-events-none absolute left-3 top-1 text-[8px] font-black uppercase tracking-[0.28em] ${playerId === AI_PLAYER_ID ? 'text-fuchsia-100/65' : 'text-cyan-100/65'}`}>{playerId === AI_PLAYER_ID ? 'CAMPO INIMIGO' : 'SEU CAMPO'}</span>
            <div
              className={`grid min-w-0 flex-1 ${isWarLayout ? 'gap-2' : 'gap-1.5 sm:gap-2 lg:gap-3'}`}
              style={{
                maxWidth: isWarLayout ? 540 : state.arena.activeSlots === 3 ? 465 : 390,
                gridTemplateColumns: `repeat(${state.arena.activeSlots}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: state.arena.activeSlots }, (_, index) => index).map((index) => {
                const entry = visualActive[index];
                return entry ? (
                  <div key={entry.card.id} className={`relative rounded-[1.35rem] ${isWarLayout ? 'p-0.5' : 'p-1.5'} ${playerId === AI_PLAYER_ID ? 'bg-[radial-gradient(ellipse_at_center_bottom,rgba(217,70,239,0.3),transparent_68%)]' : 'bg-[radial-gradient(ellipse_at_center_bottom,rgba(34,211,238,0.3),transparent_68%)]'} ${selectedCardId === entry.card.id ? 'scale-[1.025] drop-shadow-[0_0_18px_rgba(103,232,249,0.38)]' : ''}`}>
                    <div className={`pointer-events-none absolute bottom-0 left-1/2 h-5 w-[86%] -translate-x-1/2 rounded-[50%] border ${playerId === AI_PLAYER_ID ? 'border-fuchsia-300/35 bg-fuchsia-400/35 shadow-[0_0_22px_rgba(217,70,239,0.6)]' : 'border-cyan-300/35 bg-cyan-300/35 shadow-[0_0_22px_rgba(34,211,238,0.6)]'} blur-[3px]`} />
                    <span className={`pointer-events-none absolute bottom-1 left-1/2 h-px w-[68%] -translate-x-1/2 ${playerId === AI_PLAYER_ID ? 'bg-fuchsia-100/50' : 'bg-cyan-100/50'}`} />
                    <BattleCard entry={entry} enemy={playerId === AI_PLAYER_ID} selected={selectedCardId === entry.card.id} dimmed={targetMode && isCurrent} targetable={targetMode && playerId === opponentId && entry.currentHp > 0} feedback={feedback?.id === entry.card.id ? feedback : undefined} combatAnimation={combatAnimation} lastSurvivor={aliveCount === 1 && entry.state !== 'DEFEATED'} onSelect={() => selectCard(playerId, entry)} />
                  </div>
                ) : (
                  <div key={index} className={`nexa-empty-active-slot relative flex ${isWarLayout ? 'aspect-[5/6]' : 'aspect-[4/5]'} min-h-0 flex-col items-center justify-center rounded-[1.35rem] border ${playerId === AI_PLAYER_ID ? 'border-fuchsia-300/25 bg-fuchsia-500/[0.025] shadow-[inset_0_0_24px_rgba(217,70,239,0.08)]' : 'border-cyan-300/25 bg-cyan-500/[0.025] shadow-[inset_0_0_24px_rgba(34,211,238,0.08)]'} text-center text-xs text-slate-500`}>
                    {reserve.length > 0 && <span className="nexa-vacant-active" aria-hidden="true" />}
                    {reserve.length > 0 && isCurrent && !combatAnimation && <span className="nexa-deploy-guide" aria-hidden="true" />}
                    <span className={`relative z-10 flex h-9 w-14 items-center justify-center rounded-[50%] border ${playerId === AI_PLAYER_ID ? 'border-fuchsia-300/30 text-fuchsia-200/70' : 'border-cyan-300/30 text-cyan-200/70'} shadow-[0_0_18px_currentColor]`}><span className="text-2xl font-light">+</span></span>
                  </div>
                );
              })}
            </div>
          </div>

          {playerId === 'PLAYER_ONE' && reserve.length > 0 && renderReserveRail(reserve)}
        </div>
      </section>
    );
  };

  const renderSetup = () => {
    const archetypes = selectedSquad.reduce<Record<string, number>>((counts, id) => {
      const archetype = getOwnedBattleCard(id).archetype;
      counts[archetype] = (counts[archetype] ?? 0) + 1;
      return counts;
    }, {});
    const averageCost = selectedSquad.length
      ? (selectedSquad.reduce((sum, id) => sum + getOwnedBattleCard(id).deployCost, 0) / selectedSquad.length).toFixed(1)
      : '—';
    return (
      <div className="relative mx-auto max-w-6xl overflow-hidden px-3 pb-6 text-slate-100 sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.09),transparent_42%),radial-gradient(ellipse_at_bottom,rgba(217,70,239,0.08),transparent_52%)]" />
        <header className="py-5 text-center sm:py-6">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-300">Entrada local no Rift</p>
          <h1 className="mt-1.5 text-3xl font-black tracking-tight sm:text-4xl">RIFT<span className="text-fuchsia-300">BATTLE</span></h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-400">Monte seu esquadrão e atravesse o Rift em uma batalha PvE estratégica.</p>
        </header>

        <section className="mb-3 rounded-2xl border border-fuchsia-300/15 bg-[#100d20]/65 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-fuchsia-200">Escolha a arena</p>
              <p className="mt-0.5 text-xs text-slate-500">Mesmo esquadrão, regras diferentes.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {RIFTBATTLE_ARENAS.map((arena) => (
                <button key={arena.id} type="button" onClick={() => { setSelectedArenaId(arena.id); setSelectedSquad([]); setOpponentTeam([]); }} className={`rounded-xl border px-3 py-2 text-left transition ${selectedArenaId === arena.id ? 'border-cyan-300/60 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-slate-950/30 text-slate-500 hover:text-slate-300'}`}>
                  <span className="block text-[9px] font-black uppercase tracking-wider">{arena.name}</span>
                  <span className="mt-0.5 block text-[8px] opacity-70">{arena.activeSlots} ativas · {arena.abilitiesEnabled ? 'habilidades ON' : 'habilidades OFF'}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-300/20 bg-[#091525]/72 p-3 shadow-[0_0_35px_rgba(34,211,238,0.07)] sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200">Monte seu esquadrão</p><p className="mt-0.5 text-xs text-slate-400">Escolha {selectedArena.teamSize} cartas · {selectedArena.activeSlots} ativas + {selectedArena.teamSize - selectedArena.activeSlots} reserva · {selectedArena.abilitiesEnabled ? 'habilidades liberadas' : 'habilidades desativadas'}.</p></div>
            <div className="flex items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{ownedPlayableCards.length} elegíveis</span><span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-black text-cyan-100">{selectedSquad.length} / {selectedArena.teamSize}</span></div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: selectedArena.teamSize }, (_, index) => {
              const id = selectedSquad[index];
              const card = id ? ownedPlayableById.get(id) : undefined;
              return card ? (
                <div key={id} className="flex h-[58px] items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/[0.07] p-1.5">
                  <img src={getBattleCardImage(card)} alt="" className="h-full w-12 rounded-lg object-cover" />
                  <div className="min-w-0"><span className="text-[8px] font-black text-cyan-300">SLOT {index + 1} · {index < selectedArena.activeSlots ? 'ATIVA' : 'RESERVA'}</span><p className="mt-0.5 truncate text-[10px] font-bold text-slate-100">{card.name}</p></div>
                </div>
              ) : <div key={`empty-${index}`} className="flex h-[58px] items-center justify-center rounded-xl border border-dashed border-white/10 text-[9px] uppercase tracking-widest text-slate-600">Slot {index + 1} · {index < selectedArena.activeSlots ? 'Ativa' : 'Reserva'}</div>;
            })}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2"><Search size={14} className="text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar carta..." className="w-full bg-transparent text-xs outline-none placeholder:text-slate-600" /></label>
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/45 p-1">
              <button type="button" onClick={() => setCostFilter(undefined)} className={`rounded-lg px-2 py-1 text-[9px] font-bold ${!costFilter ? 'bg-cyan-300 text-slate-950' : 'text-slate-400'}`}>TODAS</button>
              {[1, 2, 3, 4, 5].map((cost) => <button type="button" key={cost} onClick={() => setCostFilter(costFilter === cost ? undefined : cost)} className={`rounded-lg px-2 py-1 text-[9px] font-bold ${costFilter === cost ? 'bg-cyan-300 text-slate-950' : 'text-slate-400'}`}>CUSTO {cost}</button>)}
            </div>
          </div>
          {ownedPlayableCards.length < selectedArena.teamSize && <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-100">Esta arena exige {selectedArena.teamSize} cartas elegíveis. Seu inventário possui {ownedPlayableCards.length} carta{ownedPlayableCards.length === 1 ? '' : 's'} disponível{ownedPlayableCards.length === 1 ? '' : 'is'} para batalha.</div>}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{filteredCatalog.map((card) => <CatalogCard key={card.id} card={card} selected={selectedSquad.includes(card.id)} onSelect={() => setSelectedSquad((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : current.length < selectedArena.teamSize ? [...current, card.id] : current)} />)}</div>
        </section>

        <section className="mt-3 rounded-2xl border border-white/10 bg-[#080d16]/85 p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-200">Resumo do esquadrão</p>
                <span className="text-[10px] text-slate-400">Custo médio <strong className="text-cyan-200">{averageCost}</strong></span>
                {Object.entries(archetypes).map(([name, count]) => <span key={name} className="text-[10px] text-slate-400"><strong className="text-fuchsia-200">{count}</strong> {name}</span>)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-500">
                <span>{selectedArena.activeSlots} ativas + {selectedArena.teamSize - selectedArena.activeSlots} reserva</span><span>Energia {selectedArena.energyByTurn.join(' → ')}</span><span>1 ação por carta / turno</span><span>Vitória: elimine {selectedArena.teamSize} cartas</span><span>Habilidades {selectedArena.abilitiesEnabled ? 'ativas' : 'desativadas'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div><p className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Dificuldade</p><div className="flex gap-1">{(['RECRUTA', 'OPERADOR', 'NEXUS'] as RiftBattleDifficulty[]).map((level) => <button type="button" key={level} onClick={() => setDifficulty(level)} className={`rounded-lg px-2.5 py-2 text-[9px] font-black ${difficulty === level ? 'bg-fuchsia-300 text-slate-950' : 'border border-white/10 text-slate-400'}`}>{level}</button>)}</div></div>
              <button type="button" disabled={selectedSquad.length !== selectedArena.teamSize} onClick={continueToMatch} className="mt-4 rounded-xl bg-cyan-300 px-6 py-2.5 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30">CONTINUAR</button>
            </div>
          </div>
        </section>
        {showHints && <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between rounded-xl border border-cyan-300/15 bg-cyan-400/[0.03] px-3 py-2 text-[10px] text-cyan-100"><span>{selectedArena.name}: {selectedArena.teamSize} cartas, {selectedArena.activeSlots} ativas. Elimine todo o esquadrão adversário.</span><button type="button" onClick={() => setShowHints(false)} className="ml-3 text-[9px] font-black uppercase text-slate-500">Ocultar</button></div>}
      </div>
    );
  };

  const renderVs = () => (
    <div className="relative mx-auto max-w-5xl px-3 py-5 text-slate-100 sm:px-5 sm:py-6">
      <div className="text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.38em] text-cyan-300">Esquadrão confirmado</p>
        <h1 className="mt-1.5 text-3xl font-black sm:text-4xl">VOCÊ <span className="text-fuchsia-300">VS</span> ADVERSÁRIO</h1>
        <p className="mx-auto mt-2 inline-flex rounded-full border border-fuchsia-300/25 bg-fuchsia-400/[0.05] px-3 py-1 text-[10px] font-bold text-fuchsia-200">{difficulty}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.025] p-3">
        <div className="mb-2 flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200">Seu esquadrão</p><span className="text-[9px] text-slate-500">{selectedArena.activeSlots} ativas · {selectedArena.teamSize - selectedArena.activeSlots} reserva</span></div>
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">{selectedSquad.map((id) => { const card = ownedPlayableById.get(id); return card ? <CatalogCard key={id} card={card} selected onSelect={() => undefined} /> : null; })}</div>
      </div>

      <div className="relative my-2 flex items-center gap-3"><span className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-300/25 to-fuchsia-300/10"/><span className="text-sm font-black tracking-[0.35em] text-fuchsia-200">VS</span><span className="h-px flex-1 bg-gradient-to-l from-transparent via-fuchsia-300/25 to-fuchsia-300/10"/></div>

      <div className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-200">Adversário</p><span className="text-[9px] text-slate-500">{selectedArena.teamSize} cartas</span></div>
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">{opponentTeam.map((id) => <CatalogCard key={id} card={cardById(id)} selected={false} onSelect={() => undefined} />)}</div>
      </div>

      {message && <p role="alert" className="mt-3 text-center text-xs text-rose-200">{message}</p>}
      <div className="sticky bottom-3 z-20 mx-auto mt-3 flex w-fit flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-[#070b13]/90 p-2 shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur-xl">
        <button type="button" disabled={validating} onClick={() => { validationRequestRef.current = undefined; setMessage(''); setScreen('SETUP'); }} className="rounded-xl border border-white/15 px-5 py-2.5 text-[10px] font-black text-slate-300">ALTERAR ESQUADRÃO</button>
        <button type="button" disabled={validating} onClick={startBattle} className="rounded-xl bg-cyan-300 px-7 py-2.5 text-[10px] font-black text-slate-950">{validating ? 'VALIDANDO...' : 'INICIAR BATALHA'}</button>
      </div>
    </div>
  );

  const availableAbility = state.arena.abilitiesEnabled ? selectedEntry?.card.ability?.id : undefined;
  const canAct = selectedEntry?.state === 'ACTIVE'
    && !selectedEntry.hasActedThisTurn
    && (!selectedEntry.enteredThisTurn || (state.arena.abilitiesEnabled && selectedEntry.card.ability?.id === 'INVESTIDA'));
  const selectedIsPreparing = selectedEntry?.state === 'ACTIVE'
    && selectedEntry.enteredThisTurn
    && (!state.arena.abilitiesEnabled || selectedEntry.card.ability?.id !== 'INVESTIDA');
  const selectedHasInvestidaReady = selectedEntry?.state === 'ACTIVE'
    && selectedEntry.enteredThisTurn
    && state.arena.abilitiesEnabled
    && selectedEntry.card.ability?.id === 'INVESTIDA'
    && !selectedEntry.hasActedThisTurn;
  const selectedAlreadyActed = selectedEntry?.state === 'ACTIVE' && selectedEntry.hasActedThisTurn;
  const actionHint = targetMode
    ? (selectedAbility === 'IMPULSO' ? 'Escolha uma carta aliada ativa.' : 'Escolha uma carta inimiga ativa.')
    : selectedHasInvestidaReady
      ? 'INVESTIDA ativa: esta unidade pode agir imediatamente.'
      : selectedIsPreparing
        ? 'Esta unidade entrou agora e poderá agir no próximo turno.'
        : selectedAlreadyActed
        ? 'Esta unidade já realizou sua ação neste turno.'
        : selectedEntry?.state === 'RESERVE'
          ? (activeCards.length < state.arena.activeSlots ? 'Espaço ativo disponível: coloque esta carta em campo.' : 'Os espaços ativos estão ocupados.')
          : selectedEntry
            ? 'Escolha ATACAR ou use a habilidade disponível.'
            : 'Selecione uma carta ativa para agir.';
  const humanPlayer = state.players[HUMAN_PLAYER_ID];
  const readyActionCount = humanPlayer.cards.filter((entry) =>
    entry.state === 'ACTIVE'
    && entry.currentHp > 0
    && !entry.hasActedThisTurn
    && (!entry.enteredThisTurn || (state.arena.abilitiesEnabled && entry.card.ability?.id === 'INVESTIDA'))
  ).length;
  const affordableReserveCount = humanPlayer.cards.filter((entry) =>
    entry.state === 'RESERVE' && entry.card.deployCost <= humanPlayer.currentEnergy
  ).length;
  const hasOpenActiveSlot = humanPlayer.cards.filter((entry) => entry.state === 'ACTIVE').length < state.arena.activeSlots;
  const hasUsefulTurnOption = state.currentPlayerId === HUMAN_PLAYER_ID
    && (readyActionCount > 0 || (hasOpenActiveSlot && affordableReserveCount > 0));
  const endTurnLabel = readyActionCount > 0
    ? `ENCERRAR · ${readyActionCount} ${readyActionCount === 1 ? 'AÇÃO RESTANTE' : 'AÇÕES RESTANTES'}`
    : hasOpenActiveSlot && affordableReserveCount > 0
      ? 'ENCERRAR · DEPLOY DISPONÍVEL'
      : 'ENCERRAR TURNO';
  const aiPlayer = state.players[AI_PLAYER_ID];
  const selectedDetails = selectedEntry?.card;
  const renderHudCard = (label: string, card: RiftBattleCard | undefined) => card ? (
    <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/55 p-2">
      <div className="flex gap-2">
        <img src={getBattleCardImage(card)} alt="" className="h-14 w-11 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="truncate text-xs font-black text-slate-100">{card.name}</p>
          <p className="mt-1 text-[10px] text-slate-300">HP {selectedEntry?.currentHp ?? card.stats.hp}/{card.stats.hp} · ⚡ {card.deployCost}</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] font-bold text-slate-400">
        <span>ATK {card.stats.attack}</span><span>DEF {card.stats.defense}</span><span>SPD {card.stats.speed}</span>
      </div>
      {card.ability && <p className="mt-2 text-[10px] font-black text-fuchsia-200">{card.ability.id}</p>}
      {card.ability && <p className="mt-0.5 text-[9px] leading-relaxed text-slate-500">{ABILITY_DESCRIPTIONS[card.ability.id]}</p>}
    </div>
  ) : null;

  if (screen === 'SETUP') return renderSetup();
  if (screen === 'VS') return renderVs();

  const impactAttacker = combatAnimation
    ? [state.players.PLAYER_ONE, state.players.PLAYER_TWO]
        .flatMap((player) => player.cards)
        .find((entry) => entry.card.id === combatAnimation.attackerId)?.card
    : undefined;
  const impactArchetype = impactAttacker?.archetype;

  return (
    <>
    <style>{`
      @keyframes nexaImpactFlash { 0%{opacity:0;transform:scale(.35)} 18%{opacity:1;transform:scale(.9)} 55%{opacity:.75;transform:scale(1.18)} 100%{opacity:0;transform:scale(1.5)} }
      @keyframes nexaImpactRing { 0%{opacity:1;transform:translate(-50%,-50%) scale(.25)} 100%{opacity:0;transform:translate(-50%,-50%) scale(2.35)} }
      @keyframes nexaSlash { 0%{opacity:0;transform:translate(-50%,-50%) rotate(-18deg) scaleX(.1)} 20%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) rotate(-18deg) scaleX(1.2)} }
      @keyframes nexaSlash2 { 0%{opacity:0;transform:translate(-50%,-50%) rotate(31deg) scaleX(.1)} 25%{opacity:.9} 100%{opacity:0;transform:translate(-50%,-50%) rotate(31deg) scaleX(1.1)} }
      @keyframes nexaCore { 0%{opacity:0;transform:translate(-50%,-50%) scale(.2)} 30%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) scale(2.4)} }
      @keyframes nexaSpark { 0%{opacity:1;transform:translate(-50%,-50%) rotate(var(--r)) translateX(8px) scaleX(.4)} 100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(92px) scaleX(1.4)} }
      @keyframes nexaKoAura { 0%,15%{opacity:0} 30%{opacity:1} 75%{opacity:.8} 100%{opacity:0;transform:scale(1.15)} }
      @keyframes nexaKoScan { 0%{opacity:0;top:0} 18%{opacity:1} 75%{opacity:.8} 100%{opacity:0;top:100%} }
      @keyframes nexaKoText { 0%,12%{opacity:0;transform:translateY(-50%) scale(.45);letter-spacing:.7em} 30%{opacity:1;transform:translateY(-50%) scale(1.18)} 48%,75%{opacity:1;transform:translateY(-50%) scale(1)} 100%{opacity:0;transform:translateY(-65%) scale(1.12)} }
      @keyframes nexaKoParticle { 0%,18%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(0) scale(.3)} 35%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(var(--d)) scale(0) rotate(160deg)} }
      .nexa-impact-flash{background:radial-gradient(circle,rgba(255,255,255,.95) 0%,rgba(103,232,249,.55) 22%,rgba(251,113,133,.32) 48%,transparent 72%);filter:blur(2px);animation:nexaImpactFlash 560ms ease-out both;box-shadow:0 0 55px rgba(103,232,249,.7)}
      .nexa-impact-ring{animation:nexaImpactRing 620ms cubic-bezier(.1,.7,.2,1) both;box-shadow:0 0 22px rgba(255,255,255,.95)} .nexa-impact-ring-2{animation-delay:90ms}
      .nexa-impact-slash{animation:nexaSlash 480ms ease-out both;box-shadow:0 0 16px white,0 0 30px rgba(251,113,133,.9)} .nexa-impact-slash-2{animation:nexaSlash2 520ms 70ms ease-out both;box-shadow:0 0 14px rgba(103,232,249,1)}
      .nexa-impact-core{animation:nexaCore 520ms ease-out both;filter:blur(2px);box-shadow:0 0 32px white,0 0 58px rgba(103,232,249,.95)}
      .nexa-spark{animation:nexaSpark 560ms ease-out both;transform-origin:left center}.nexa-spark-0{--r:0deg}.nexa-spark-1{--r:45deg}.nexa-spark-2{--r:90deg}.nexa-spark-3{--r:135deg}.nexa-spark-4{--r:180deg}.nexa-spark-5{--r:225deg}.nexa-spark-6{--r:270deg}.nexa-spark-7{--r:315deg}
      .nexa-ko-aura{background:radial-gradient(circle,rgba(255,255,255,.32),rgba(34,211,238,.22) 35%,rgba(217,70,239,.2) 58%,transparent 72%);box-shadow:0 0 60px rgba(34,211,238,.55),inset 0 0 36px rgba(217,70,239,.35);animation:nexaKoAura 1700ms ease-out both}
      .nexa-ko-scan{box-shadow:0 0 12px white,0 0 26px cyan;animation:nexaKoScan 1500ms 120ms ease-in both}.nexa-ko-text{text-shadow:0 0 8px white,0 0 20px #22d3ee,0 0 36px #d946ef;animation:nexaKoText 1700ms ease-out both}
      .nexa-ko-particle{animation:nexaKoParticle 1500ms ease-out both;box-shadow:0 0 9px cyan}.nexa-ko-particle-0{--r:0deg;--d:92px}.nexa-ko-particle-1{--r:30deg;--d:76px}.nexa-ko-particle-2{--r:60deg;--d:100px}.nexa-ko-particle-3{--r:90deg;--d:82px}.nexa-ko-particle-4{--r:120deg;--d:94px}.nexa-ko-particle-5{--r:150deg;--d:72px}.nexa-ko-particle-6{--r:180deg;--d:102px}.nexa-ko-particle-7{--r:210deg;--d:78px}.nexa-ko-particle-8{--r:240deg;--d:96px}.nexa-ko-particle-9{--r:270deg;--d:86px}.nexa-ko-particle-10{--r:300deg;--d:104px}.nexa-ko-particle-11{--r:330deg;--d:80px}
      @keyframes nexaDebris { 0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(5px) scaleY(.4)} 18%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(var(--d)) scaleY(1.6)} }
      @keyframes nexaShockLine { 0%{opacity:0;transform:translate(-50%,-50%) scaleX(.08)} 20%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) scaleX(1)} }
      @keyframes nexaDamageNumber { 0%{opacity:0;transform:translateY(12px) scale(.35)} 16%{opacity:1;transform:translateY(0) scale(1.5)} 38%{transform:translateY(-4px) scale(1.08)} 72%{opacity:1;transform:translateY(-9px) scale(1)} 100%{opacity:0;transform:translateY(-24px) scale(.9)} }
      @keyframes nexaKoGlitchA { 0%,12%,100%{opacity:0;transform:translateX(0)} 18%{opacity:1;transform:translateX(-16px)} 26%{opacity:.8;transform:translateX(12px)} 34%{opacity:0} 52%{opacity:.9;transform:translateX(18px)} 61%{opacity:0} }
      @keyframes nexaKoGlitchB { 0%,24%,100%{opacity:0;transform:translateX(0)} 31%{opacity:.9;transform:translateX(14px)} 40%{opacity:0} 67%{opacity:.8;transform:translateX(-18px)} 76%{opacity:0} }
      .nexa-debris{animation:nexaDebris 650ms cubic-bezier(.1,.7,.2,1) both;box-shadow:0 0 10px currentColor}.nexa-debris-0{--r:18deg;--d:78px}.nexa-debris-1{--r:72deg;--d:68px}.nexa-debris-2{--r:142deg;--d:84px}.nexa-debris-3{--r:205deg;--d:74px}.nexa-debris-4{--r:266deg;--d:88px}.nexa-debris-5{--r:326deg;--d:70px}
      .nexa-shock-line{animation:nexaShockLine 520ms ease-out both;box-shadow:0 0 12px white,0 0 30px rgba(217,70,239,.75)}
      .nexa-damage-number{animation:nexaDamageNumber 1000ms cubic-bezier(.16,.8,.24,1) both;text-shadow:0 0 8px currentColor,0 0 22px rgba(255,255,255,.45)}
      .nexa-ko-glitch{mix-blend-mode:screen;filter:blur(.3px);box-shadow:0 0 12px currentColor}.nexa-ko-glitch-a{animation:nexaKoGlitchA 1650ms ease-out both}.nexa-ko-glitch-b{animation:nexaKoGlitchB 1650ms ease-out both}
      @keyframes nexaArenaImpact { 0%,100%{opacity:0;transform:scale(.78)} 12%{opacity:.95} 42%{opacity:.42;transform:scale(1.18)} 100%{opacity:0;transform:scale(1.48)} }
      @keyframes nexaArenaBeam { 0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) scaleX(.05)} 16%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) scaleX(1)} }
      @keyframes nexaArenaPulse { 0%{opacity:0;transform:translate(-50%,-50%) scale(.2)} 20%{opacity:.85} 100%{opacity:0;transform:translate(-50%,-50%) scale(5.4)} }
      @keyframes nexaArenaShake { 0%,100%{transform:translate3d(0,0,0)} 18%{transform:translate3d(-5px,2px,0)} 34%{transform:translate3d(6px,-3px,0)} 52%{transform:translate3d(-4px,1px,0)} 70%{transform:translate3d(3px,-1px,0)} }
      @keyframes nexaCameraCharge { 0%{transform:scale(1) translateY(0);filter:brightness(1)} 100%{transform:scale(.992) translateY(2px);filter:brightness(.92) saturate(1.12)} }
      @keyframes nexaCameraRush { 0%{transform:scale(.992) translateY(2px)} 62%{transform:scale(1.018) translateY(var(--camera-y))} 100%{transform:scale(1.026) translateY(var(--camera-y));filter:brightness(1.08) saturate(1.2)} }
      @keyframes nexaCameraImpact { 0%{transform:scale(1.026) translate3d(0,var(--camera-y),0)} 10%{transform:scale(1.045) translate3d(-8px,calc(var(--camera-y) + 3px),0)} 24%{transform:scale(1.035) translate3d(10px,calc(var(--camera-y) - 4px),0)} 42%{transform:scale(1.03) translate3d(-6px,calc(var(--camera-y) + 2px),0)} 65%{transform:scale(1.025) translate3d(4px,var(--camera-y),0)} 100%{transform:scale(1.018) translate3d(0,0,0)} }
      @keyframes nexaCameraRecover { 0%{transform:scale(1.018);filter:brightness(1.08) saturate(1.15)} 100%{transform:scale(1);filter:brightness(1) saturate(1)} }
      @keyframes nexaFloorImpact { 0%{opacity:0;transform:translate(-50%,-50%) scale(.25)} 20%{opacity:.9} 100%{opacity:0;transform:translate(-50%,-50%) scale(3.8)} }
      @keyframes nexaImpactVignette { 0%,100%{opacity:0} 12%{opacity:.72} 48%{opacity:.26} }
      .nexa-camera-charge{animation:nexaCameraCharge 400ms ease-out both}.nexa-camera-rush{animation:nexaCameraRush 650ms cubic-bezier(.16,.72,.18,1) both}.nexa-camera-impact{animation:nexaCameraImpact 550ms cubic-bezier(.18,.8,.2,1) both}.nexa-camera-recover{animation:nexaCameraRecover 900ms ease-out both}
      .nexa-floor-impact{animation:nexaFloorImpact 820ms ease-out both;box-shadow:0 0 34px rgba(255,255,255,.85),0 0 85px rgba(34,211,238,.38)}
      .nexa-impact-vignette{animation:nexaImpactVignette 650ms ease-out both;background:radial-gradient(circle at center,transparent 22%,rgba(5,8,20,.2) 55%,rgba(2,4,12,.82) 100%)}
      @keyframes nexaCriticalPulse { 0%,100%{box-shadow:0 14px 30px rgba(244,63,94,.08),0 0 0 rgba(244,63,94,0);filter:saturate(1)} 50%{box-shadow:0 14px 30px rgba(244,63,94,.18),0 0 30px rgba(244,63,94,.34);filter:saturate(1.22) brightness(1.06)} }
      @keyframes nexaCriticalWarning { 0%,100%{opacity:.55;transform:translateX(0) scale(.96)} 50%{opacity:1;transform:translateX(-2px) scale(1.06)} }
      @keyframes nexaLastSurvivor { 0%,100%{box-shadow:0 0 22px rgba(255,255,255,.12),0 0 40px rgba(34,211,238,.18)} 50%{box-shadow:0 0 38px rgba(255,255,255,.28),0 0 72px rgba(217,70,239,.28);filter:brightness(1.08)} }
      @keyframes nexaSurvivorLabel { 0%,70%{opacity:0;transform:translate(-50%,-50%) scale(.5);filter:blur(6px)} 78%{opacity:1;transform:translate(-50%,-50%) scale(1.18);filter:blur(0)} 88%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-70%) scale(1.04)} }
      @keyframes nexaThreat { 0%,100%{box-shadow:0 0 18px rgba(217,70,239,.18)} 50%{box-shadow:0 0 42px rgba(217,70,239,.52),inset 0 0 18px rgba(217,70,239,.12)} }
      .nexa-card-critical{animation:nexaCriticalPulse 1.15s ease-in-out infinite}.nexa-critical-warning{animation:nexaCriticalWarning .72s ease-in-out infinite}.nexa-last-survivor{animation:nexaLastSurvivor 1.5s ease-in-out infinite}.nexa-survivor-label{animation:nexaSurvivorLabel 2.4s ease-out both;text-shadow:0 0 10px white,0 0 24px #22d3ee,0 0 42px #d946ef}.nexa-card-threatened{animation:nexaThreat .9s ease-in-out infinite}
      @keyframes nexaResultBackdrop { 0%{opacity:0} 28%{opacity:1} 100%{opacity:1} }
      @keyframes nexaResultRift { 0%{opacity:0;transform:translate(-50%,-50%) scale(.08) rotate(0deg)} 30%{opacity:1;transform:translate(-50%,-50%) scale(.8) rotate(70deg)} 65%{opacity:.9;transform:translate(-50%,-50%) scale(1.22) rotate(145deg)} 100%{opacity:.45;transform:translate(-50%,-50%) scale(1.65) rotate(220deg)} }
      @keyframes nexaResultBurst { 0%,22%{opacity:0;transform:translate(-50%,-50%) scale(.15)} 38%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) scale(4.8)} }
      @keyframes nexaResultTitle { 0%,34%{opacity:0;transform:translateY(32px) scale(.72);letter-spacing:.65em;filter:blur(8px)} 52%{opacity:1;transform:translateY(-4px) scale(1.12);filter:blur(0)} 70%,100%{opacity:1;transform:translateY(0) scale(1);letter-spacing:.18em;filter:blur(0)} }
      @keyframes nexaResultPanel { 0%,62%{opacity:0;transform:translateY(24px) scale(.96)} 78%,100%{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes nexaResultShard { 0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(20px) scale(.3)} 25%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(var(--d)) scale(0) rotate(220deg)} }
      .nexa-arena-impact{animation:nexaArenaImpact 760ms ease-out both;background:radial-gradient(circle,rgba(255,255,255,.98) 0%,rgba(103,232,249,.48) 12%,rgba(217,70,239,.26) 32%,transparent 66%);filter:blur(1px);mix-blend-mode:screen}
      .nexa-arena-beam{animation:nexaArenaBeam 720ms cubic-bezier(.1,.75,.2,1) both;transform-origin:left center;box-shadow:0 0 12px white,0 0 34px rgba(34,211,238,.8)}
      .nexa-arena-pulse{animation:nexaArenaPulse 820ms ease-out both;box-shadow:0 0 28px rgba(255,255,255,.8),0 0 70px rgba(217,70,239,.45)}
      .nexa-arena-shake{animation:nexaArenaShake 520ms ease-out both}
      .nexa-result-backdrop{animation:nexaResultBackdrop 900ms ease-out both}.nexa-result-rift{animation:nexaResultRift 2300ms cubic-bezier(.15,.72,.2,1) both}.nexa-result-burst{animation:nexaResultBurst 1700ms ease-out both}.nexa-result-title{animation:nexaResultTitle 1900ms cubic-bezier(.16,.8,.22,1) both}.nexa-result-panel{animation:nexaResultPanel 2200ms ease-out both}
      .nexa-result-shard{animation:nexaResultShard 1800ms ease-out both;box-shadow:0 0 12px currentColor}.nexa-result-shard:nth-child(3n){color:#67e8f9}.nexa-result-shard:nth-child(3n+1){color:#e879f9}.nexa-result-shard:nth-child(3n+2){color:white}

      @keyframes nexaAbilityVeil{0%{opacity:0}18%,68%{opacity:1}100%{opacity:0}}
      @keyframes nexaAbilityTitle{0%{opacity:0;transform:translate(-50%,-50%) scale(.35);letter-spacing:.8em;filter:blur(10px)}22%{opacity:1;transform:translate(-50%,-50%) scale(1.18);filter:blur(0)}55%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-65%) scale(1.1)}}
      @keyframes nexaAbilityRing{0%{opacity:0;transform:translate(-50%,-50%) scale(.12) rotate(0)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(3.8) rotate(130deg)}}
      @keyframes nexaAbilitySlash{0%{opacity:0;transform:translate(-50%,-50%) rotate(-28deg) scaleX(.05)}20%{opacity:1}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(-28deg) scaleX(2.1)}}
      @keyframes nexaAbilityShield{0%{opacity:0;transform:translate(-50%,-50%) scale(.25) rotateX(70deg)}28%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotateX(0)}72%{opacity:.9;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.3)}}
      @keyframes nexaAbilityBolt{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(10px) scaleX(.1)}18%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(210px) scaleX(1.6)}}
      @keyframes nexaAbilityGlyph{0%{opacity:0;transform:translate(-50%,-50%) scale(2.2) rotate(-35deg)}28%{opacity:1;transform:translate(-50%,-50%) scale(.9) rotate(0)}72%{opacity:1;transform:translate(-50%,-50%) scale(1.08) rotate(8deg)}100%{opacity:0;transform:translate(-50%,-50%) scale(.5) rotate(30deg)}}
      .nexa-ability-veil{animation:nexaAbilityVeil 1900ms ease-out both;background:radial-gradient(circle at center,rgba(255,255,255,.08),rgba(34,211,238,.09) 25%,rgba(217,70,239,.08) 48%,transparent 72%);mix-blend-mode:screen}
      .nexa-ability-title{animation:nexaAbilityTitle 1900ms cubic-bezier(.16,.8,.22,1) both;text-shadow:0 0 10px white,0 0 28px #22d3ee,0 0 55px #d946ef}
      .nexa-ability-ring{animation:nexaAbilityRing 1500ms ease-out both;box-shadow:0 0 28px currentColor,inset 0 0 24px currentColor}
      .nexa-ability-slash{animation:nexaAbilitySlash 1250ms ease-out both;box-shadow:0 0 16px white,0 0 42px #d946ef}
      .nexa-ability-shield{animation:nexaAbilityShield 1750ms cubic-bezier(.16,.8,.22,1) both;clip-path:polygon(50% 0,92% 22%,82% 76%,50% 100%,18% 76%,8% 22%);box-shadow:0 0 42px #22d3ee,inset 0 0 42px rgba(34,211,238,.45)}
      .nexa-ability-bolt{animation:nexaAbilityBolt 1300ms ease-out both;transform-origin:left center;box-shadow:0 0 12px white,0 0 28px currentColor}
      .nexa-ability-glyph{animation:nexaAbilityGlyph 1700ms cubic-bezier(.16,.8,.22,1) both;text-shadow:0 0 18px currentColor,0 0 48px currentColor}
      @keyframes nexaDeployVeil{0%{opacity:0}18%,72%{opacity:1}100%{opacity:0}}
      @keyframes nexaDeployRift{0%{opacity:0;transform:translate(-50%,-50%) scale(.18) rotate(0deg)}22%{opacity:1}72%{opacity:.9;transform:translate(-50%,-50%) scale(1.25) rotate(130deg)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.6) rotate(180deg)}}
      @keyframes nexaDeployBeam{0%{opacity:0;transform:translateX(-50%) scaleY(.05)}20%{opacity:1;transform:translateX(-50%) scaleY(1)}68%{opacity:.95}100%{opacity:0;transform:translateX(-50%) scaleY(.25)}}
      @keyframes nexaDeployCard{0%{opacity:0;transform:translate(-50%,-50%) scale(1.75) rotateX(68deg);filter:blur(10px) brightness(2.2)}26%{opacity:1;transform:translate(-50%,-50%) scale(1.18) rotateX(0);filter:blur(0) brightness(1.65)}62%{transform:translate(-50%,-50%) scale(1);filter:brightness(1.15)}100%{opacity:0;transform:translate(-50%,-50%) scale(.88);filter:brightness(1)}}
      @keyframes nexaDeployRing{0%{opacity:0;transform:translate(-50%,-50%) scale(.15)}24%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(4.4)}}
      @keyframes nexaDeployParticle{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(var(--d)) scale(.2)}24%{opacity:1}76%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(10px) scale(1.4)}}
      @keyframes nexaDeployInvestida{0%,55%{opacity:0;transform:translate(-50%,-50%) scale(.4)}70%{opacity:1;transform:translate(-50%,-50%) scale(1.22)}100%{opacity:0;transform:translate(-50%,-70%) scale(1)}}
      .nexa-deploy-veil{animation:nexaDeployVeil 1800ms ease-out both;background:radial-gradient(circle at center,rgba(255,255,255,.12),rgba(34,211,238,.11) 25%,rgba(217,70,239,.12) 48%,transparent 74%);mix-blend-mode:screen}
      .nexa-deploy-rift{animation:nexaDeployRift 1750ms cubic-bezier(.16,.8,.22,1) both;box-shadow:0 0 35px currentColor,inset 0 0 35px currentColor}
      .nexa-deploy-beam{animation:nexaDeployBeam 1600ms ease-out both;transform-origin:center bottom;filter:blur(1px);mix-blend-mode:screen}
      .nexa-deploy-card{animation:nexaDeployCard 1750ms cubic-bezier(.16,.82,.2,1) both;box-shadow:0 0 35px currentColor,0 0 85px currentColor}
      .nexa-deploy-ring{animation:nexaDeployRing 1350ms 180ms ease-out both;box-shadow:0 0 26px currentColor}
      .nexa-deploy-particle{animation:nexaDeployParticle 1550ms ease-in-out both;box-shadow:0 0 10px currentColor}
      .nexa-deploy-investida{animation:nexaDeployInvestida 2050ms ease-out both;text-shadow:0 0 10px white,0 0 28px #22d3ee,0 0 55px #d946ef}

      @keyframes nexaTurnVeil { 0%{opacity:0} 16%{opacity:1} 72%{opacity:.82} 100%{opacity:0} }
      @keyframes nexaTurnRift { 0%{opacity:0;transform:translate(-50%,-50%) scale(.35) rotate(-18deg)} 22%{opacity:1;transform:translate(-50%,-50%) scale(1.08) rotate(0)} 68%{opacity:.9;transform:translate(-50%,-50%) scale(.96) rotate(5deg)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.7) rotate(16deg)} }
      @keyframes nexaTurnTitle { 0%,10%{opacity:0;transform:translate(-50%,-50%) scale(.45);letter-spacing:.75em;filter:blur(10px)} 27%{opacity:1;transform:translate(-50%,-50%) scale(1.16);letter-spacing:.34em;filter:blur(0)} 65%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-62%) scale(1.06)} }
      @keyframes nexaEnergyOrb { 0%,22%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(0) scale(.2)} 40%{opacity:1} 72%{opacity:1;transform:translate(-50%,-50%) rotate(var(--r)) translateX(var(--d)) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(calc(var(--d) + 24px)) scale(.25)} }
      @keyframes nexaEnergyCore { 0%{opacity:0;transform:translate(-50%,-50%) scale(.1)} 25%{opacity:1;transform:translate(-50%,-50%) scale(1.35)} 62%{opacity:1;transform:translate(-50%,-50%) scale(.9)} 100%{opacity:0;transform:translate(-50%,-50%) scale(2.3)} }
      @keyframes nexaTurnSweep { 0%{opacity:0;transform:translateX(-120%) skewX(-20deg)} 25%{opacity:.8} 100%{opacity:0;transform:translateX(120%) skewX(-20deg)} }
      .nexa-turn-veil{animation:nexaTurnVeil 1450ms ease-out both;background:radial-gradient(circle at center,rgba(255,255,255,.09),rgba(34,211,238,.08) 28%,rgba(217,70,239,.09) 52%,transparent 76%);backdrop-filter:brightness(.78) saturate(1.15)}
      .nexa-turn-rift{animation:nexaTurnRift 1350ms cubic-bezier(.16,.8,.2,1) both;box-shadow:0 0 35px currentColor,inset 0 0 40px currentColor}
      .nexa-turn-title{animation:nexaTurnTitle 1400ms ease-out both;text-shadow:0 0 10px white,0 0 30px currentColor,0 0 70px currentColor}
      .nexa-energy-core{animation:nexaEnergyCore 1250ms 80ms ease-out both;box-shadow:0 0 28px white,0 0 65px currentColor}
      .nexa-energy-orb{animation:nexaEnergyOrb 1250ms ease-out both;box-shadow:0 0 12px currentColor}
      .nexa-turn-sweep{animation:nexaTurnSweep 900ms 180ms ease-out both;filter:blur(2px)}

      @keyframes nexaRiftBreathe { 0%,100%{opacity:.34;transform:translate(-50%,-50%) scale(.94) rotate(-3deg)} 50%{opacity:.7;transform:translate(-50%,-50%) scale(1.08) rotate(3deg)} }
      @keyframes nexaRiftCharge { 0%{opacity:.28;transform:translate(-50%,-50%) scale(.88)} 100%{opacity:.92;transform:translate(-50%,-50%) scale(1.16);filter:brightness(1.45)} }
      @keyframes nexaRiftRush { 0%{opacity:.6;transform:translate(-50%,-50%) scale(1)} 55%{opacity:1;transform:translate(-50%,-50%) scale(1.38,0.72)} 100%{opacity:.76;transform:translate(-50%,-50%) scale(1.14,.88)} }
      @keyframes nexaRiftImpact { 0%{opacity:.95;transform:translate(-50%,-50%) scale(.75)} 18%{opacity:1;transform:translate(-50%,-50%) scale(1.65)} 48%{opacity:.78;transform:translate(-50%,-50%) scale(1.12)} 100%{opacity:.38;transform:translate(-50%,-50%) scale(.98)} }
      @keyframes nexaAmbientSweep { 0%{opacity:0;transform:translateX(-65%) skewX(-18deg)} 25%{opacity:.7} 100%{opacity:0;transform:translateX(65%) skewX(-18deg)} }
      @keyframes nexaRailPulse { 0%,100%{opacity:.2;filter:brightness(.8)} 50%{opacity:.85;filter:brightness(1.8)} }
      .nexa-rift-heart{animation:nexaRiftBreathe 3.6s ease-in-out infinite;box-shadow:0 0 42px rgba(34,211,238,.26),0 0 80px rgba(217,70,239,.2),inset 0 0 38px rgba(255,255,255,.08)}
      .nexa-rift-heart[data-phase="PREPARE"]{animation:nexaRiftCharge 400ms ease-out both}.nexa-rift-heart[data-phase="ATTACK"]{animation:nexaRiftRush 650ms cubic-bezier(.16,.72,.18,1) both}.nexa-rift-heart[data-phase="IMPACT"]{animation:nexaRiftImpact 550ms ease-out both}
      .nexa-ambient-sweep{animation:nexaAmbientSweep 950ms ease-out both}.nexa-rail-pulse{animation:nexaRailPulse 1.6s ease-in-out infinite}

      @keyframes nexaFlowAftershock { 0%{opacity:0;transform:translate(-50%,-50%) scale(.25)} 18%{opacity:.9} 62%{opacity:.42;transform:translate(-50%,-50%) scale(2.8)} 100%{opacity:0;transform:translate(-50%,-50%) scale(4.6)} }
      @keyframes nexaFlowArc { 0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) scaleX(.12)} 20%{opacity:.95} 72%{opacity:.5} 100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) scaleX(1.18)} }
      @keyframes nexaFlowDust { 0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(18px) scale(.35)} 24%{opacity:.9} 100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateX(var(--d)) scale(.05)} }
      @keyframes nexaFlowKoBridge { 0%{opacity:0;transform:translate(-50%,-50%) scale(.45)} 18%{opacity:.9} 48%{opacity:.7;transform:translate(-50%,-50%) scale(1.08)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.55)} }
      @keyframes nexaFlowLane { 0%{opacity:0;transform:scaleX(.1)} 25%{opacity:.65} 100%{opacity:0;transform:scaleX(1)} }
      .nexa-flow-aftershock{animation:nexaFlowAftershock 1050ms cubic-bezier(.12,.72,.18,1) both;box-shadow:0 0 28px rgba(255,255,255,.8),0 0 70px rgba(34,211,238,.4)}
      .nexa-flow-arc{animation:nexaFlowArc 980ms ease-out both;transform-origin:left center;filter:blur(.2px);box-shadow:0 0 14px currentColor}
      .nexa-flow-dust{animation:nexaFlowDust 1150ms ease-out both;box-shadow:0 0 10px currentColor}
      .nexa-flow-ko-bridge{animation:nexaFlowKoBridge 1500ms ease-out both;background:radial-gradient(circle,rgba(255,255,255,.34),rgba(34,211,238,.16) 32%,rgba(217,70,239,.14) 54%,transparent 72%)}
      .nexa-flow-lane{animation:nexaFlowLane 900ms ease-out both;transform-origin:center}

      @keyframes nexaSigAssault{0%{opacity:0;transform:translate(-50%,-50%) rotate(-16deg) scaleX(.12)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(-16deg) scaleX(1.15)}}
      @keyframes nexaSigTank{0%{opacity:0;transform:translate(-50%,-50%) scale(.35)}35%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.65)}}
      @keyframes nexaSigSpeed{0%{opacity:0;transform:translateX(-65%) scaleX(.15)}25%{opacity:1}100%{opacity:0;transform:translateX(-35%) scaleX(1)}}
      @keyframes nexaSigSupport{0%{opacity:0;transform:translate(-50%,-50%) scale(.4) rotate(0)}40%{opacity:.95}100%{opacity:0;transform:translate(-50%,-50%) scale(1.45) rotate(90deg)}}
      @keyframes nexaSigBalanced{0%{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(.35)}35%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(135deg) scale(1.45)}}
      .nexa-signature-assault{background:linear-gradient(90deg,transparent,#fff 30%,#fb7185 55%,transparent);box-shadow:0 0 18px #fff,0 0 38px rgba(251,113,133,.85);animation:nexaSigAssault 620ms ease-out both}.nexa-signature-assault-b{animation-delay:80ms}
      .nexa-signature-tank{border-color:rgba(255,255,255,.9);box-shadow:0 0 24px #fff,0 0 65px rgba(217,70,239,.65),inset 0 0 30px rgba(217,70,239,.5);animation:nexaSigTank 720ms cubic-bezier(.1,.75,.2,1) both}.nexa-signature-tank-core{background:radial-gradient(circle,#fff,rgba(217,70,239,.75),transparent 70%);filter:blur(2px);animation:nexaSigTank 650ms ease-out both}
      .nexa-signature-speed{top:28%;box-shadow:0 0 12px cyan;animation:nexaSigSpeed 470ms ease-out both}.nexa-signature-speed-1{top:42%;animation-delay:45ms}.nexa-signature-speed-2{top:58%;animation-delay:85ms}.nexa-signature-speed-3{top:72%;animation-delay:125ms}
      .nexa-signature-support{box-shadow:0 0 25px rgba(110,231,183,.85),inset 0 0 25px rgba(34,211,238,.35);animation:nexaSigSupport 780ms ease-out both}.nexa-signature-support-core{box-shadow:0 0 24px #fff,0 0 50px rgba(110,231,183,.9);animation:nexaSigSupport 700ms ease-out both}
      .nexa-signature-balanced{box-shadow:0 0 22px rgba(34,211,238,.8);animation:nexaSigBalanced 720ms ease-out both}.nexa-signature-balanced-b{animation-delay:90ms;box-shadow:0 0 22px rgba(217,70,239,.8)}
      .nexa-archetype-assault{filter:saturate(1.12)}.nexa-archetype-tank{filter:contrast(1.08)}.nexa-archetype-speed{filter:brightness(1.08)}.nexa-archetype-support{filter:saturate(1.06)}
      @keyframes nexaImpactAssault{0%{opacity:0;transform:translate(-50%,-50%) rotate(-22deg) scaleX(.12)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(-22deg) scaleX(1.35)}}
      @keyframes nexaImpactTank{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}28%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(2.1)}}
      @keyframes nexaImpactSpeed{0%{opacity:0;transform:translateX(-80%) scaleX(.1)}25%{opacity:1}100%{opacity:0;transform:translateX(35%) scaleX(1.25)}}
      @keyframes nexaImpactSupport{0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(0deg)}35%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.8) rotate(120deg)}}
      @keyframes nexaImpactBalanced{0%{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(.25)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(225deg) scale(1.7)}}
      .nexa-impact-assault{animation:nexaImpactAssault 650ms ease-out both;background:linear-gradient(90deg,transparent,#fff 28%,#fb7185 58%,transparent);box-shadow:0 0 20px white,0 0 44px rgba(251,113,133,.9)}
      .nexa-impact-tank{animation:nexaImpactTank 760ms cubic-bezier(.12,.72,.2,1) both;border:4px solid rgba(255,255,255,.9);box-shadow:0 0 28px white,0 0 80px rgba(217,70,239,.7),inset 0 0 45px rgba(217,70,239,.45)}
      .nexa-impact-speed{animation:nexaImpactSpeed 500ms ease-out both;background:linear-gradient(90deg,transparent,#fff 35%,#67e8f9 65%,transparent);box-shadow:0 0 16px cyan}
      .nexa-impact-support{animation:nexaImpactSupport 820ms ease-out both;border:2px solid rgba(110,231,183,.9);box-shadow:0 0 30px rgba(110,231,183,.85),inset 0 0 28px rgba(34,211,238,.3)}
      .nexa-impact-balanced{animation:nexaImpactBalanced 740ms ease-out both;border:2px solid rgba(255,255,255,.85);box-shadow:0 0 28px rgba(34,211,238,.75),0 0 58px rgba(217,70,239,.5)}
      @keyframes nexaDamageSurface { 0%{opacity:0;filter:brightness(1)} 12%{opacity:1;background:rgba(255,255,255,.82);filter:brightness(2.2) saturate(1.5)} 28%{opacity:.8;background:linear-gradient(105deg,rgba(255,255,255,.72),rgba(34,211,238,.28) 42%,rgba(217,70,239,.22) 68%,transparent)} 48%{opacity:.34;transform:translateX(-2px) skewX(-1deg)} 62%{opacity:.55;transform:translateX(3px) skewX(1deg)} 100%{opacity:0;transform:none;filter:brightness(1)} }
      @keyframes nexaDamageCrack { 0%,8%{opacity:0;transform:scaleX(.05)} 22%{opacity:1;transform:scaleX(1)} 58%{opacity:.8} 100%{opacity:0;transform:scaleX(1.12)} }
      .nexa-damage-surface{mix-blend-mode:screen;box-shadow:inset 0 0 30px rgba(255,255,255,.45),0 0 24px rgba(34,211,238,.28);animation:nexaDamageSurface 650ms ease-out both}
      .nexa-damage-crack{transform-origin:left center;filter:drop-shadow(0 0 4px white);animation:nexaDamageCrack 720ms cubic-bezier(.12,.75,.2,1) both}.nexa-damage-crack-b{animation-delay:55ms}
      @keyframes nexaKoCollapse { 0%,8%{opacity:0;transform:scale(1);filter:brightness(1)} 18%{opacity:1;filter:brightness(1.8) saturate(1.7)} 34%{opacity:.9;transform:scale(1.035) skewX(-1deg)} 47%{opacity:.7;transform:scale(.99) skewX(2deg)} 62%{opacity:.82;transform:scale(1.02) skewX(-2deg);filter:brightness(2.1)} 78%{opacity:.48;transform:scale(.94);filter:brightness(1.2) blur(.4px)} 100%{opacity:0;transform:scale(.78);filter:brightness(.55) blur(2px)} }
      @keyframes nexaKoFracture { 0%,14%{opacity:0;transform:scaleX(.04)} 28%{opacity:1;transform:scaleX(1)} 58%{opacity:.95} 82%{opacity:.55;transform:scaleX(1.15)} 100%{opacity:0;transform:scaleX(.7)} }
      .nexa-ko-collapse{background:repeating-linear-gradient(180deg,rgba(255,255,255,.08) 0 2px,transparent 2px 7px),radial-gradient(circle,rgba(255,255,255,.3),rgba(34,211,238,.16) 38%,rgba(217,70,239,.14) 62%,transparent 76%);mix-blend-mode:screen;box-shadow:inset 0 0 34px rgba(255,255,255,.32);animation:nexaKoCollapse 1750ms cubic-bezier(.18,.72,.2,1) both}
      .nexa-ko-fracture{transform-origin:left center;box-shadow:0 0 8px white,0 0 18px currentColor;animation:nexaKoFracture 1550ms ease-out both}.nexa-ko-fracture-b{animation-delay:100ms}.nexa-ko-fracture-c{animation-delay:190ms}
        /* NEXA VFX — cinematic anticipation / hit-stop */
        @keyframes nexaAnticipationDim {
          0% { opacity: 0; }
          32% { opacity: .42; }
          72% { opacity: .34; }
          100% { opacity: 0; }
        }
        @keyframes nexaAnticipationCore {
          0% { transform: translate(-50%,-50%) scale(.28); opacity: 0; filter: blur(7px); }
          35% { opacity: .78; }
          78% { transform: translate(-50%,-50%) scale(1.02); opacity: 1; filter: blur(0); }
          100% { transform: translate(-50%,-50%) scale(1.42); opacity: 0; filter: blur(3px); }
        }
        @keyframes nexaAnticipationRing {
          0% { transform: translate(-50%,-50%) scale(1.55); opacity: 0; }
          30% { opacity: .72; }
          82% { transform: translate(-50%,-50%) scale(.62); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(.48); opacity: 0; }
        }
        @keyframes nexaAnticipationLine {
          0% { transform: translateX(-50%) scaleX(.08); opacity: 0; }
          40% { opacity: .7; }
          82% { transform: translateX(-50%) scaleX(1); opacity: 1; }
          100% { transform: translateX(-50%) scaleX(1.18); opacity: 0; }
        }
        @keyframes nexaAnticipationText {
          0% { transform: translate(-50%,-50%) scale(.82); opacity: 0; letter-spacing: .55em; }
          38% { opacity: .9; }
          76% { transform: translate(-50%,-50%) scale(1.04); opacity: 1; letter-spacing: .28em; }
          100% { transform: translate(-50%,-50%) scale(1.1); opacity: 0; letter-spacing: .18em; }
        }
        .nexa-anticipation {
          position: absolute;
          inset: 0;
          z-index: 57;
          pointer-events: none;
          overflow: hidden;
        }
        .nexa-anticipation::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 48%, transparent 0 17%, rgba(2,6,23,.2) 36%, rgba(2,6,23,.72) 100%);
          animation: nexaAnticipationDim 400ms ease-out both;
        }
        .nexa-anticipation-core {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 72px;
          height: 72px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,.98) 0 8%, rgba(34,211,238,.9) 18%, rgba(168,85,247,.72) 42%, transparent 72%);
          box-shadow: 0 0 26px rgba(34,211,238,.9), 0 0 70px rgba(168,85,247,.55);
          animation: nexaAnticipationCore 400ms cubic-bezier(.2,.7,.2,1) both;
        }
        .nexa-anticipation-ring {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 190px;
          height: 190px;
          border-radius: 999px;
          border: 2px solid rgba(103,232,249,.88);
          box-shadow: inset 0 0 22px rgba(34,211,238,.38), 0 0 28px rgba(168,85,247,.35);
          animation: nexaAnticipationRing 400ms cubic-bezier(.22,.8,.22,1) both;
        }
        .nexa-anticipation-line {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(76%, 720px);
          height: 1px;
          transform-origin: center;
          background: linear-gradient(90deg, transparent, rgba(34,211,238,.85), white, rgba(217,70,239,.8), transparent);
          box-shadow: 0 0 12px rgba(103,232,249,.75);
          animation: nexaAnticipationLine 400ms ease-out both;
        }
        .nexa-anticipation-label {
          position: absolute;
          left: 50%;
          top: 34%;
          transform: translate(-50%,-50%);
          color: rgba(224,247,255,.96);
          font-size: clamp(9px, .8vw, 12px);
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
          text-shadow: 0 0 10px rgba(34,211,238,.9), 0 0 22px rgba(168,85,247,.65);
          animation: nexaAnticipationText 400ms ease-out both;
        }

      @media (prefers-reduced-motion:reduce){.nexa-impact-flash,.nexa-impact-ring,.nexa-impact-slash,.nexa-impact-core,.nexa-spark,.nexa-ko-aura,.nexa-ko-scan,.nexa-ko-text,.nexa-ko-particle,.nexa-debris,.nexa-shock-line,.nexa-damage-number,.nexa-ko-glitch,.nexa-arena-impact,.nexa-arena-beam,.nexa-arena-pulse,.nexa-arena-shake,.nexa-camera-charge,.nexa-camera-rush,.nexa-camera-impact,.nexa-camera-recover,.nexa-floor-impact,.nexa-impact-vignette,.nexa-result-backdrop,.nexa-result-rift,.nexa-result-burst,.nexa-result-title,.nexa-result-panel,.nexa-result-shard,.nexa-ability-veil,.nexa-ability-title,.nexa-ability-ring,.nexa-ability-slash,.nexa-ability-shield,.nexa-ability-bolt,.nexa-ability-glyph,.nexa-deploy-veil,.nexa-deploy-rift,.nexa-deploy-beam,.nexa-deploy-card,.nexa-deploy-ring,.nexa-deploy-particle,.nexa-deploy-investida,.nexa-turn-veil,.nexa-turn-rift,.nexa-turn-title,.nexa-energy-core,.nexa-energy-orb,.nexa-turn-sweep,.nexa-flow-aftershock,.nexa-flow-arc,.nexa-flow-dust,.nexa-flow-ko-bridge,.nexa-flow-lane,.nexa-signature-assault,.nexa-signature-tank,.nexa-signature-tank-core,.nexa-signature-speed,.nexa-signature-support,.nexa-signature-support-core,.nexa-signature-balanced{animation:none!important}}
        /* NEXA VFX — event hierarchy: KO / Last Nexus / Match Result */
        @keyframes nexaKoArenaSurge {
          0% { opacity: 0; transform: scale(.72); }
          22% { opacity: .82; }
          58% { opacity: .48; transform: scale(1.06); }
          100% { opacity: 0; transform: scale(1.38); }
        }
        @keyframes nexaKoEnergyColumn {
          0% { opacity: 0; transform: translate(-50%, 18%) scaleY(.18); }
          28% { opacity: .9; }
          70% { opacity: .72; transform: translate(-50%, -4%) scaleY(1); }
          100% { opacity: 0; transform: translate(-50%, -18%) scaleY(1.28); }
        }
        @keyframes nexaKoFinalFlash {
          0%, 58% { opacity: 0; }
          66% { opacity: .78; }
          76% { opacity: .08; }
          100% { opacity: 0; }
        }
        @keyframes nexaLastNexusCrown {
          0%,100% { opacity: .34; transform: translate(-50%,-50%) scale(.94) rotate(0deg); }
          50% { opacity: .86; transform: translate(-50%,-50%) scale(1.08) rotate(180deg); }
        }
        @keyframes nexaResultRiftBurst {
          0% { opacity: 0; transform: translate(-50%,-50%) scale(.18); filter: blur(12px); }
          34% { opacity: 1; }
          72% { opacity: .86; transform: translate(-50%,-50%) scale(1.08); filter: blur(0); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.62); filter: blur(5px); }
        }
        .nexa-ko-arena-surge {
          position:absolute; inset:0; z-index:54; pointer-events:none; overflow:hidden;
        }
        .nexa-ko-arena-surge::before {
          content:""; position:absolute; left:50%; top:48%; width:min(72vw,760px); aspect-ratio:1;
          border-radius:999px; border:2px solid rgba(103,232,249,.7);
          box-shadow:0 0 45px rgba(34,211,238,.42), inset 0 0 80px rgba(217,70,239,.16);
          transform:translate(-50%,-50%);
          animation:nexaKoArenaSurge 1450ms cubic-bezier(.16,.8,.2,1) both;
        }
        .nexa-ko-energy-column {
          position:absolute; left:50%; bottom:16%; width:90px; height:68%;
          transform-origin:bottom center;
          background:linear-gradient(to top, transparent, rgba(34,211,238,.2), rgba(255,255,255,.88), rgba(217,70,239,.25), transparent);
          filter:blur(8px);
          animation:nexaKoEnergyColumn 1350ms ease-out both;
        }
        .nexa-ko-final-flash {
          position:absolute; inset:0;
          background:radial-gradient(circle at 50% 48%, rgba(255,255,255,.9), rgba(34,211,238,.24) 22%, transparent 58%);
          animation:nexaKoFinalFlash 1450ms ease-out both;
        }
        .nexa-last-nexus-crown {
          position:absolute; left:50%; top:50%; width:128%; aspect-ratio:1; border-radius:999px;
          border:1px dashed rgba(250,204,21,.65);
          box-shadow:0 0 28px rgba(250,204,21,.28), inset 0 0 26px rgba(34,211,238,.16);
          pointer-events:none;
          animation:nexaLastNexusCrown 2400ms linear infinite;
        }
        .nexa-result-rift-burst {
          position:absolute; left:50%; top:48%; width:min(58vw,620px); aspect-ratio:1; border-radius:999px;
          background:
            radial-gradient(circle, rgba(255,255,255,.96) 0 4%, rgba(34,211,238,.78) 10%, rgba(168,85,247,.46) 28%, transparent 66%);
          box-shadow:0 0 90px rgba(34,211,238,.58), 0 0 150px rgba(168,85,247,.32);
          pointer-events:none;
          animation:nexaResultRiftBurst 1500ms cubic-bezier(.18,.78,.18,1) both;
        }

    

        /* NEXA VFX — event scale polish */
        @keyframes nexaCriticalHeartbeat {
          0%,100% { opacity:.18; transform:scale(.96); }
          45% { opacity:.56; transform:scale(1.04); }
          58% { opacity:.24; transform:scale(1); }
          72% { opacity:.5; transform:scale(1.025); }
        }
        @keyframes nexaKoDebrisOrbit {
          0% { opacity:0; transform:translate(-50%,-50%) rotate(0deg) scale(.4); }
          24% { opacity:.9; }
          100% { opacity:0; transform:translate(-50%,-50%) rotate(210deg) scale(1.5); }
        }
        @keyframes nexaResultScan {
          0% { opacity:0; transform:translateY(-30vh); }
          25% { opacity:.65; }
          100% { opacity:0; transform:translateY(55vh); }
        }
        .nexa-critical-warning::after {
          content:"";
          position:absolute;
          inset:-7px;
          border-radius:inherit;
          border:1px solid rgba(248,113,113,.45);
          box-shadow:0 0 22px rgba(239,68,68,.18);
          pointer-events:none;
          animation:nexaCriticalHeartbeat 1450ms ease-in-out infinite;
        }
        .nexa-ko-arena-surge::after {
          content:"";
          position:absolute;
          left:50%; top:48%;
          width:min(48vw,500px); aspect-ratio:1;
          border-radius:999px;
          border:1px dashed rgba(255,255,255,.42);
          box-shadow:0 0 38px rgba(34,211,238,.22), inset 0 0 34px rgba(217,70,239,.16);
          animation:nexaKoDebrisOrbit 1450ms cubic-bezier(.15,.72,.18,1) both;
        }
        .nexa-result-rift-burst::after {
          content:"";
          position:absolute;
          left:-60vw; right:-60vw; top:50%;
          height:2px;
          background:linear-gradient(90deg,transparent,rgba(34,211,238,.72),white,rgba(217,70,239,.68),transparent);
          box-shadow:0 0 18px rgba(103,232,249,.65);
          animation:nexaResultScan 1250ms ease-out both;
        }


        /* NEXA VFX — battlefield depth / physical presence */
        @keyframes nexaPlatformFloat {
          0%,100% { transform:translateY(0) rotateX(1deg); }
          50% { transform:translateY(-3px) rotateX(2.2deg); }
        }
        @keyframes nexaPlatformEnergy {
          0%,100% { opacity:.22; transform:translate(-50%,-50%) scale(.94); }
          50% { opacity:.52; transform:translate(-50%,-50%) scale(1.04); }
        }
        @keyframes nexaCardDepthIdle {
          0%,100% { filter:drop-shadow(0 10px 12px rgba(0,0,0,.42)); }
          50% { filter:drop-shadow(0 16px 18px rgba(0,0,0,.55)); }
        }
        @keyframes nexaFloorDepthSweep {
          0% { opacity:0; transform:translateY(-18%) scaleY(.72); }
          28% { opacity:.26; }
          100% { opacity:0; transform:translateY(24%) scaleY(1.12); }
        }
        .nexa-battlefield-depth {
          position:absolute;
          inset:0;
          pointer-events:none;
          overflow:hidden;
          perspective:1100px;
          transform-style:preserve-3d;
          z-index:1;
        }
        .nexa-battlefield-depth::before {
          content:"";
          position:absolute;
          left:8%; right:8%; top:21%; bottom:7%;
          background:
            linear-gradient(to bottom, rgba(34,211,238,.025), transparent 26%, rgba(168,85,247,.025) 72%, transparent),
            repeating-linear-gradient(90deg, transparent 0 72px, rgba(103,232,249,.035) 73px 74px);
          clip-path:polygon(18% 0,82% 0,100% 100%,0 100%);
          transform:rotateX(62deg) translateZ(-35px);
          transform-origin:center bottom;
          opacity:.72;
        }
        .nexa-battlefield-depth::after {
          content:"";
          position:absolute;
          left:17%; right:17%; top:29%; bottom:10%;
          border-left:1px solid rgba(34,211,238,.08);
          border-right:1px solid rgba(217,70,239,.08);
          box-shadow:inset 0 -30px 60px rgba(2,6,23,.42);
          clip-path:polygon(20% 0,80% 0,100% 100%,0 100%);
        }
        .nexa-depth-floor-sweep {
          position:absolute;
          left:15%; right:15%; top:30%;
          height:44%;
          background:linear-gradient(to bottom,transparent,rgba(103,232,249,.09),transparent);
          clip-path:polygon(22% 0,78% 0,100% 100%,0 100%);
          transform-origin:center bottom;
          animation:nexaFloorDepthSweep 4200ms ease-in-out infinite;
        }
        .nexa-depth-side-left,.nexa-depth-side-right {
          position:absolute;
          top:17%; bottom:8%;
          width:10%;
          opacity:.42;
          filter:blur(.2px);
        }
        .nexa-depth-side-left {
          left:4%;
          border-left:1px solid rgba(34,211,238,.22);
          background:linear-gradient(90deg,rgba(34,211,238,.055),transparent);
          transform:skewY(-8deg);
        }
        .nexa-depth-side-right {
          right:4%;
          border-right:1px solid rgba(217,70,239,.2);
          background:linear-gradient(-90deg,rgba(217,70,239,.05),transparent);
          transform:skewY(8deg);
        }
        .nexa-platform-depth-glow {
          position:absolute;
          left:50%; top:50%;
          width:118%; height:118%;
          border-radius:50%;
          border:1px solid rgba(103,232,249,.12);
          box-shadow:0 20px 34px rgba(0,0,0,.34),0 0 22px rgba(34,211,238,.08);
          transform:translate(-50%,-50%);
          pointer-events:none;
          animation:nexaPlatformEnergy 3200ms ease-in-out infinite;
        }


        /* NEXA VFX — physical card presence */
        @keyframes nexaCardContactShadow {
          0%,100% { opacity:.32; transform:translateX(-50%) scaleX(.82); filter:blur(7px); }
          50% { opacity:.48; transform:translateX(-50%) scaleX(1); filter:blur(9px); }
        }
        @keyframes nexaCardHoverBody {
          0%,100% { transform:translateY(0) rotateX(0deg); }
          50% { transform:translateY(-2px) rotateX(1.2deg); }
        }
        @keyframes nexaCardEdgePulse {
          0%,100% { opacity:.18; }
          50% { opacity:.48; }
        }
        .nexa-card-physical {
          position:relative;
          transform-style:preserve-3d;
          perspective:800px;
          isolation:isolate;
        }
        .nexa-card-physical::before {
          content:"";
          position:absolute;
          z-index:-2;
          left:50%;
          bottom:-12px;
          width:78%;
          height:16px;
          border-radius:50%;
          background:radial-gradient(ellipse,rgba(0,0,0,.72) 0%,rgba(0,0,0,.38) 42%,transparent 74%);
          animation:nexaCardContactShadow 2600ms ease-in-out infinite;
          pointer-events:none;
        }
        .nexa-card-physical::after {
          content:"";
          position:absolute;
          z-index:31;
          inset:1px;
          border-radius:inherit;
          border:1px solid rgba(165,243,252,.12);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 -8px 20px rgba(2,6,23,.18);
          opacity:.32;
          pointer-events:none;
          animation:nexaCardEdgePulse 3000ms ease-in-out infinite;
        }
        .nexa-card-physical:not(.nexa-card-attacking):not(.nexa-card-impact):not(.nexa-card-ko) {
          animation:nexaCardHoverBody 2800ms ease-in-out infinite;
        }
        .nexa-card-physical:hover {
          transform:translateY(-4px) rotateX(1.5deg);
        }
        @media (hover:none) {
          .nexa-card-physical:hover { transform:none; }
        }


        /* NEXA VFX — duel lock / attacker-target faceoff */
        @keyframes nexaDuelLockDim {
          0% { opacity:0; }
          30% { opacity:.28; }
          78% { opacity:.22; }
          100% { opacity:0; }
        }
        @keyframes nexaDuelLockBeam {
          0% { opacity:0; transform:translate(-50%,-50%) scaleX(.08); }
          32% { opacity:.7; }
          78% { opacity:.95; transform:translate(-50%,-50%) scaleX(1); }
          100% { opacity:0; transform:translate(-50%,-50%) scaleX(1.08); }
        }
        @keyframes nexaDuelReticle {
          0% { opacity:0; transform:translate(-50%,-50%) scale(1.45) rotate(-18deg); }
          34% { opacity:.82; }
          82% { opacity:1; transform:translate(-50%,-50%) scale(.86) rotate(8deg); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(.72) rotate(14deg); }
        }
        @keyframes nexaDuelPulse {
          0%,100% { opacity:.18; transform:translate(-50%,-50%) scale(.8); }
          50% { opacity:.72; transform:translate(-50%,-50%) scale(1.08); }
        }
        .nexa-duel-lock {
          position:absolute;
          inset:0;
          z-index:56;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-duel-lock::before {
          content:"";
          position:absolute;
          inset:0;
          background:radial-gradient(ellipse at 50% 49%,transparent 0 24%,rgba(2,6,23,.16) 44%,rgba(2,6,23,.54) 100%);
          animation:nexaDuelLockDim 520ms ease-out both;
        }
        .nexa-duel-lock-beam {
          position:absolute;
          left:50%;
          top:49%;
          width:min(68%,680px);
          height:2px;
          transform-origin:center;
          background:linear-gradient(90deg,transparent,rgba(34,211,238,.82),white,rgba(217,70,239,.8),transparent);
          box-shadow:0 0 12px rgba(103,232,249,.75),0 0 28px rgba(217,70,239,.3);
          animation:nexaDuelLockBeam 520ms cubic-bezier(.18,.76,.2,1) both;
        }
        .nexa-duel-lock-reticle {
          position:absolute;
          left:50%;
          top:49%;
          width:112px;
          height:112px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.5);
          box-shadow:0 0 0 8px rgba(34,211,238,.04),0 0 30px rgba(168,85,247,.22);
          animation:nexaDuelReticle 520ms ease-out both;
        }
        .nexa-duel-lock-reticle::before,
        .nexa-duel-lock-reticle::after {
          content:"";
          position:absolute;
          left:50%;
          top:50%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.8),transparent);
          transform:translate(-50%,-50%);
        }
        .nexa-duel-lock-reticle::before { width:150%; height:1px; }
        .nexa-duel-lock-reticle::after { width:1px; height:150%; background:linear-gradient(transparent,rgba(255,255,255,.8),transparent); }
        .nexa-duel-lock-pulse {
          position:absolute;
          left:50%;
          top:49%;
          width:190px;
          height:190px;
          border-radius:999px;
          border:1px dashed rgba(103,232,249,.28);
          animation:nexaDuelPulse 420ms ease-in-out both;
        }


        /* NEXA VFX — attack trajectory / acceleration / contact */
        @keyframes nexaAttackWake {
          0% { opacity:0; transform:translate(-50%,-50%) scaleY(.25) scaleX(.45); }
          22% { opacity:.24; }
          68% { opacity:.82; transform:translate(-50%,-50%) scaleY(1) scaleX(1); }
          100% { opacity:0; transform:translate(-50%,-50%) scaleY(1.12) scaleX(1.2); }
        }
        @keyframes nexaAttackSpeedLines {
          0% { opacity:0; transform:translateY(var(--attack-line-from, 30px)) scaleY(.35); }
          28% { opacity:.22; }
          72% { opacity:.68; transform:translateY(0) scaleY(1); }
          100% { opacity:0; transform:translateY(var(--attack-line-to, -30px)) scaleY(1.12); }
        }
        @keyframes nexaContactCompression {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.35,.18); }
          32% { opacity:.95; }
          68% { opacity:.72; transform:translate(-50%,-50%) scale(1.1,.52); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.45,.22); }
        }
        @keyframes nexaReturnWake {
          0% { opacity:.48; transform:translate(-50%,-50%) scale(1); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(.52); }
        }
        .nexa-attack-trajectory {
          position:absolute;
          inset:0;
          z-index:52;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-attack-wake {
          position:absolute;
          left:50%;
          top:50%;
          width:clamp(90px,13vw,180px);
          height:62%;
          border-radius:50%;
          background:linear-gradient(
            to bottom,
            transparent,
            rgba(34,211,238,.08) 24%,
            rgba(255,255,255,.24) 50%,
            rgba(217,70,239,.09) 76%,
            transparent
          );
          filter:blur(5px);
          animation:nexaAttackWake 650ms cubic-bezier(.12,.68,.16,1) both;
        }
        .nexa-attack-speed-lines {
          position:absolute;
          left:24%;
          right:24%;
          top:18%;
          bottom:18%;
          background:
            linear-gradient(90deg,transparent 0 12%,rgba(103,232,249,.22) 12.4% 12.7%,transparent 13.1% 31%,rgba(255,255,255,.18) 31.4% 31.6%,transparent 32% 68%,rgba(217,70,239,.18) 68.4% 68.7%,transparent 69.1% 87%,rgba(103,232,249,.16) 87.4% 87.6%,transparent 88%);
          filter:blur(.2px);
          animation:nexaAttackSpeedLines 650ms cubic-bezier(.1,.72,.18,1) both;
        }
        .nexa-contact-compression {
          position:absolute;
          left:50%;
          top:49%;
          width:min(52vw,520px);
          height:96px;
          border-radius:50%;
          background:radial-gradient(ellipse,rgba(255,255,255,.78),rgba(34,211,238,.32) 18%,rgba(217,70,239,.18) 42%,transparent 72%);
          box-shadow:0 0 34px rgba(103,232,249,.42);
          animation:nexaContactCompression 550ms cubic-bezier(.12,.78,.16,1) both;
        }
        .nexa-return-wake {
          position:absolute;
          left:50%;
          top:49%;
          width:min(36vw,360px);
          height:42%;
          border-radius:50%;
          border:1px solid rgba(103,232,249,.14);
          box-shadow:0 0 34px rgba(34,211,238,.12), inset 0 0 38px rgba(217,70,239,.08);
          animation:nexaReturnWake 900ms ease-out both;
        }


        /* NEXA VFX — combat readability / visual hierarchy */
        @keyframes nexaFocusVignette {
          0% { opacity:0; }
          28% { opacity:.34; }
          78% { opacity:.28; }
          100% { opacity:0; }
        }
        @keyframes nexaHudQuiet {
          0%,100% { opacity:0; }
          25%,78% { opacity:1; }
        }
        @keyframes nexaImpactFocus {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.55); }
          32% { opacity:.7; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.28); }
        }
        .nexa-combat-focus {
          position:absolute;
          inset:0;
          z-index:48;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-combat-focus::before {
          content:"";
          position:absolute;
          inset:0;
          background:
            radial-gradient(ellipse at 50% 49%, transparent 0 23%, rgba(2,6,23,.06) 38%, rgba(2,6,23,.44) 100%);
          animation:nexaFocusVignette var(--focus-duration,650ms) ease-out both;
        }
        .nexa-combat-focus::after {
          content:"";
          position:absolute;
          left:50%; top:49%;
          width:min(74vw,760px);
          height:min(46vh,390px);
          border-radius:50%;
          border:1px solid rgba(103,232,249,.055);
          box-shadow:inset 0 0 80px rgba(34,211,238,.025),0 0 70px rgba(168,85,247,.025);
          transform:translate(-50%,-50%);
        }
        .nexa-impact-focus-ring {
          position:absolute;
          left:50%; top:49%;
          width:min(34vw,350px);
          aspect-ratio:1;
          border-radius:999px;
          border:1px solid rgba(255,255,255,.22);
          box-shadow:0 0 30px rgba(103,232,249,.18);
          animation:nexaImpactFocus 550ms ease-out both;
        }
        .nexa-hud-quiet-mask {
          position:absolute;
          inset:0;
          z-index:47;
          pointer-events:none;
          box-shadow:inset 210px 0 100px -105px rgba(2,6,23,.34), inset -210px 0 100px -105px rgba(2,6,23,.34);
          animation:nexaHudQuiet var(--focus-duration,650ms) ease-out both;
        }
        @media (max-width: 900px) {
          .nexa-hud-quiet-mask {
            box-shadow:inset 70px 0 60px -45px rgba(2,6,23,.26), inset -70px 0 60px -45px rgba(2,6,23,.26);
          }
          .nexa-combat-focus::before {
            background:radial-gradient(ellipse at 50% 49%,transparent 0 30%,rgba(2,6,23,.04) 48%,rgba(2,6,23,.3) 100%);
          }
        }


        /* NEXA VFX — platform/card arena integration */
        @keyframes nexaPlatformCharge {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.62); }
          35% { opacity:.48; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.12); }
        }
        @keyframes nexaPlatformLaunch {
          0% { opacity:.15; transform:translate(-50%,-50%) scale(.78,.48); }
          45% { opacity:.72; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.35,.8); }
        }
        @keyframes nexaPlatformImpact {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.35); }
          20% { opacity:.9; }
          72% { opacity:.42; transform:translate(-50%,-50%) scale(1.22); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.52); }
        }
        @keyframes nexaPlatformKo {
          0% { opacity:.15; transform:translate(-50%,-50%) scale(.72) rotate(0deg); }
          30% { opacity:.82; }
          72% { opacity:.54; transform:translate(-50%,-50%) scale(1.15) rotate(9deg); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.55) rotate(18deg); }
        }
        .nexa-platform-response {
          position:absolute;
          inset:0;
          z-index:24;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-platform-response-ring {
          position:absolute;
          left:50%;
          top:49%;
          width:min(58vw,590px);
          height:min(34vh,280px);
          border-radius:50%;
          border:1px solid rgba(103,232,249,.28);
          box-shadow:0 0 30px rgba(34,211,238,.16),inset 0 0 36px rgba(168,85,247,.08);
        }
        .nexa-platform-response--prepare .nexa-platform-response-ring {
          animation:nexaPlatformCharge 520ms ease-out both;
        }
        .nexa-platform-response--attack .nexa-platform-response-ring {
          background:radial-gradient(ellipse,rgba(34,211,238,.08),transparent 64%);
          animation:nexaPlatformLaunch 650ms cubic-bezier(.12,.72,.16,1) both;
        }
        .nexa-platform-response--impact .nexa-platform-response-ring {
          border-color:rgba(255,255,255,.48);
          background:radial-gradient(ellipse,rgba(255,255,255,.18),rgba(34,211,238,.09) 26%,rgba(217,70,239,.07) 48%,transparent 72%);
          animation:nexaPlatformImpact 550ms ease-out both;
        }
        .nexa-platform-response--ko .nexa-platform-response-ring {
          border:1px dashed rgba(103,232,249,.48);
          box-shadow:0 0 42px rgba(34,211,238,.25),0 0 70px rgba(217,70,239,.13);
          animation:nexaPlatformKo 1500ms cubic-bezier(.12,.72,.16,1) both;
        }
        .nexa-platform-response-line {
          position:absolute;
          left:18%;
          right:18%;
          top:49%;
          height:1px;
          background:linear-gradient(90deg,transparent,rgba(34,211,238,.38),rgba(255,255,255,.7),rgba(217,70,239,.34),transparent);
          box-shadow:0 0 10px rgba(103,232,249,.4);
          opacity:.55;
        }


        /* NEXA VFX — central Rift reactor */
        @keyframes nexaReactorIdle {
          0%,100% { opacity:.34; transform:translate(-50%,-50%) scale(.94); filter:blur(.2px); }
          50% { opacity:.62; transform:translate(-50%,-50%) scale(1.04); filter:blur(0); }
        }
        @keyframes nexaReactorCharge {
          0% { opacity:.2; transform:translate(-50%,-50%) scale(.72) rotate(0deg); }
          60% { opacity:.9; }
          100% { opacity:.48; transform:translate(-50%,-50%) scale(1.05) rotate(28deg); }
        }
        @keyframes nexaReactorAttack {
          0% { opacity:.25; transform:translate(-50%,-50%) scale(.82,.7); }
          42% { opacity:.86; }
          100% { opacity:.18; transform:translate(-50%,-50%) scale(1.18,1.02); }
        }
        @keyframes nexaReactorImpact {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.25); }
          20% { opacity:1; }
          65% { opacity:.72; transform:translate(-50%,-50%) scale(1.12); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.55); }
        }
        @keyframes nexaReactorKo {
          0% { opacity:.2; transform:translate(-50%,-50%) scale(.62) rotate(0deg); }
          25% { opacity:.95; }
          58% { opacity:.5; transform:translate(-50%,-50%) scale(1.12) rotate(18deg); }
          72% { opacity:.9; transform:translate(-50%,-50%) scale(.92) rotate(-7deg); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.62) rotate(32deg); }
        }
        @keyframes nexaReactorArc {
          0%,100% { opacity:.08; transform:translate(-50%,-50%) rotate(0deg); }
          50% { opacity:.52; transform:translate(-50%,-50%) rotate(180deg); }
        }
        .nexa-rift-reactor {
          position:absolute;
          inset:0;
          z-index:20;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-rift-reactor-core {
          position:absolute;
          left:50%; top:49%;
          width:clamp(110px,15vw,210px);
          aspect-ratio:1;
          border-radius:999px;
          background:
            radial-gradient(circle,rgba(255,255,255,.82) 0 3%,rgba(34,211,238,.34) 9%,rgba(168,85,247,.2) 28%,rgba(2,6,23,.04) 52%,transparent 70%);
          box-shadow:0 0 28px rgba(34,211,238,.2),0 0 68px rgba(168,85,247,.12);
          animation:nexaReactorIdle 3300ms ease-in-out infinite;
        }
        .nexa-rift-reactor-ring {
          position:absolute;
          left:50%; top:49%;
          width:clamp(150px,21vw,290px);
          aspect-ratio:1;
          border-radius:999px;
          border:1px solid rgba(103,232,249,.15);
          border-left-color:rgba(217,70,239,.25);
          border-right-color:rgba(255,255,255,.22);
          animation:nexaReactorArc 7600ms linear infinite;
        }
        .nexa-rift-reactor--prepare .nexa-rift-reactor-core {
          animation:nexaReactorCharge 520ms cubic-bezier(.16,.74,.18,1) both;
        }
        .nexa-rift-reactor--attack .nexa-rift-reactor-core {
          animation:nexaReactorAttack 650ms cubic-bezier(.12,.7,.16,1) both;
        }
        .nexa-rift-reactor--impact .nexa-rift-reactor-core {
          background:radial-gradient(circle,white 0 5%,rgba(103,232,249,.78) 12%,rgba(217,70,239,.38) 30%,transparent 68%);
          animation:nexaReactorImpact 550ms ease-out both;
        }
        .nexa-rift-reactor--ko .nexa-rift-reactor-core {
          background:radial-gradient(circle,white 0 4%,rgba(34,211,238,.66) 11%,rgba(217,70,239,.48) 31%,rgba(239,68,68,.14) 48%,transparent 72%);
          animation:nexaReactorKo 1500ms cubic-bezier(.13,.72,.16,1) both;
        }
        .nexa-rift-reactor--ko .nexa-rift-reactor-ring {
          border-style:dashed;
          animation-duration:620ms;
        }
        @media (max-width:900px) {
          .nexa-rift-reactor-core { width:clamp(92px,24vw,150px); }
          .nexa-rift-reactor-ring { width:clamp(126px,32vw,205px); }
        }


        /* NEXA VFX — idle arena polish / unified ambience */
        @keyframes nexaAmbientBreath {
          0%,100% { opacity:.18; transform:scale(1); }
          50% { opacity:.34; transform:scale(1.025); }
        }
        @keyframes nexaAmbientScan {
          0% { opacity:0; transform:translateY(-24vh); }
          18% { opacity:.18; }
          72% { opacity:.12; }
          100% { opacity:0; transform:translateY(42vh); }
        }
        @keyframes nexaAmbientDust {
          0% { opacity:0; transform:translate3d(0,18px,0) scale(.7); }
          22% { opacity:.34; }
          78% { opacity:.2; }
          100% { opacity:0; transform:translate3d(12px,-44px,0) scale(1.08); }
        }
        @keyframes nexaArenaEdgePulse {
          0%,100% { opacity:.12; }
          50% { opacity:.28; }
        }
        .nexa-idle-ambience {
          position:absolute;
          inset:0;
          z-index:6;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-idle-ambience::before {
          content:"";
          position:absolute;
          inset:8% 9% 5%;
          border-radius:36%;
          background:
            radial-gradient(ellipse at 50% 46%,rgba(34,211,238,.035),transparent 45%),
            radial-gradient(ellipse at 50% 56%,rgba(168,85,247,.028),transparent 58%);
          animation:nexaAmbientBreath 4600ms ease-in-out infinite;
        }
        .nexa-idle-ambience::after {
          content:"";
          position:absolute;
          left:10%; right:10%; top:16%; bottom:7%;
          border-left:1px solid rgba(34,211,238,.055);
          border-right:1px solid rgba(217,70,239,.05);
          box-shadow:inset 0 -28px 60px rgba(2,6,23,.12);
          animation:nexaArenaEdgePulse 3800ms ease-in-out infinite;
        }
        .nexa-idle-scan {
          position:absolute;
          left:15%; right:15%; top:28%;
          height:1px;
          background:linear-gradient(90deg,transparent,rgba(103,232,249,.22),rgba(255,255,255,.22),rgba(217,70,239,.18),transparent);
          box-shadow:0 0 8px rgba(103,232,249,.12);
          animation:nexaAmbientScan 7200ms linear infinite;
        }
        .nexa-idle-dust {
          position:absolute;
          width:3px; height:3px;
          border-radius:999px;
          background:rgba(165,243,252,.65);
          box-shadow:0 0 8px rgba(34,211,238,.45);
          animation:nexaAmbientDust var(--dust-duration,5200ms) ease-in-out infinite;
          animation-delay:var(--dust-delay,0ms);
        }
        .nexa-idle-dust--magenta {
          background:rgba(240,171,252,.5);
          box-shadow:0 0 8px rgba(217,70,239,.34);
        }
        .nexa-idle-ambience--combat {
          opacity:.42;
          transition:opacity 180ms ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .nexa-idle-ambience::before,
          .nexa-idle-ambience::after,
          .nexa-idle-scan,
          .nexa-idle-dust { animation:none !important; }
        }


        /* NEXA VFX — decision feedback / tactical targeting */
        @keyframes nexaDecisionSweep {
          0% { opacity:0; transform:translateX(-50%) scaleX(.15); }
          35% { opacity:.5; }
          100% { opacity:0; transform:translateX(-50%) scaleX(1); }
        }
        @keyframes nexaDecisionReticle {
          0%,100% { opacity:.28; transform:translate(-50%,-50%) scale(.92) rotate(0deg); }
          50% { opacity:.72; transform:translate(-50%,-50%) scale(1.04) rotate(90deg); }
        }
        @keyframes nexaDecisionPulse {
          0%,100% { opacity:.14; transform:translate(-50%,-50%) scale(.86); }
          50% { opacity:.42; transform:translate(-50%,-50%) scale(1.08); }
        }
        @keyframes nexaDecisionLabel {
          0% { opacity:0; transform:translate(-50%,5px); letter-spacing:.42em; }
          28% { opacity:.8; }
          100% { opacity:.46; transform:translate(-50%,0); letter-spacing:.24em; }
        }
        .nexa-decision-feedback {
          position:absolute;
          inset:0;
          z-index:33;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-decision-feedback::before {
          content:"";
          position:absolute;
          left:50%; top:49%;
          width:min(62vw,640px); height:min(36vh,300px);
          border-radius:50%;
          border:1px solid rgba(103,232,249,.08);
          box-shadow:inset 0 0 46px rgba(34,211,238,.035),0 0 38px rgba(168,85,247,.025);
          transform:translate(-50%,-50%);
          animation:nexaDecisionPulse 2100ms ease-in-out infinite;
        }
        .nexa-decision-reticle {
          position:absolute;
          left:50%; top:49%;
          width:82px; height:82px;
          border-radius:999px;
          border:1px dashed rgba(103,232,249,.26);
          box-shadow:0 0 18px rgba(34,211,238,.12);
          animation:nexaDecisionReticle 3200ms linear infinite;
        }
        .nexa-decision-sweep {
          position:absolute;
          left:50%; top:49%;
          width:min(56vw,560px); height:1px;
          transform-origin:center;
          background:linear-gradient(90deg,transparent,rgba(34,211,238,.34),rgba(255,255,255,.42),rgba(217,70,239,.28),transparent);
          box-shadow:0 0 8px rgba(103,232,249,.24);
          animation:nexaDecisionSweep 1300ms ease-out infinite;
        }
        .nexa-decision-label {
          position:absolute;
          left:50%; top:29%;
          transform:translateX(-50%);
          color:rgba(207,250,254,.7);
          font-size:9px;
          font-weight:900;
          text-transform:uppercase;
          white-space:nowrap;
          text-shadow:0 0 10px rgba(34,211,238,.32);
          animation:nexaDecisionLabel 480ms ease-out both;
        }
        .nexa-decision-feedback--target .nexa-decision-reticle {
          border-color:rgba(248,113,113,.42);
          box-shadow:0 0 20px rgba(239,68,68,.16),0 0 34px rgba(217,70,239,.08);
        }
        .nexa-decision-feedback--target .nexa-decision-sweep {
          background:linear-gradient(90deg,transparent,rgba(217,70,239,.3),rgba(255,255,255,.46),rgba(248,113,113,.32),transparent);
        }
        @media (max-width:900px) {
          .nexa-decision-label { top:24%; font-size:8px; }
          .nexa-decision-reticle { width:64px; height:64px; }
        }


        /* NEXA VFX — arena control / turn ownership */
        @keyframes nexaTurnControlEnter {
          0% { opacity:0; transform:translateY(var(--turn-shift,14px)) scale(.96); }
          34% { opacity:.72; }
          100% { opacity:.34; transform:translateY(0) scale(1); }
        }
        @keyframes nexaTurnRailPulse {
          0%,100% { opacity:.18; filter:blur(.2px); }
          50% { opacity:.5; filter:blur(0); }
        }
        @keyframes nexaTurnBeacon {
          0%,100% { opacity:.22; transform:translate(-50%,-50%) scale(.92); }
          50% { opacity:.54; transform:translate(-50%,-50%) scale(1.06); }
        }
        .nexa-turn-control {
          position:absolute;
          inset:0;
          z-index:8;
          pointer-events:none;
          overflow:hidden;
          animation:nexaTurnControlEnter 620ms ease-out both;
        }
        .nexa-turn-control__wash {
          position:absolute;
          left:5%; right:5%;
          height:44%;
          border-radius:50%;
          opacity:.52;
        }
        .nexa-turn-control--human .nexa-turn-control__wash {
          bottom:-8%;
          background:radial-gradient(ellipse at 50% 100%,rgba(34,211,238,.12),rgba(14,116,144,.035) 45%,transparent 72%);
        }
        .nexa-turn-control--ai .nexa-turn-control__wash {
          top:-8%;
          background:radial-gradient(ellipse at 50% 0%,rgba(217,70,239,.11),rgba(126,34,206,.035) 45%,transparent 72%);
        }
        .nexa-turn-control__rail {
          position:absolute;
          left:14%; right:14%;
          height:1px;
          box-shadow:0 0 12px currentColor;
          animation:nexaTurnRailPulse 2200ms ease-in-out infinite;
        }
        .nexa-turn-control--human .nexa-turn-control__rail {
          bottom:13%;
          color:rgba(103,232,249,.58);
          background:linear-gradient(90deg,transparent,currentColor,rgba(255,255,255,.5),currentColor,transparent);
        }
        .nexa-turn-control--ai .nexa-turn-control__rail {
          top:13%;
          color:rgba(232,121,249,.52);
          background:linear-gradient(90deg,transparent,currentColor,rgba(255,255,255,.44),currentColor,transparent);
        }
        .nexa-turn-control__beacon {
          position:absolute;
          left:50%;
          width:min(46vw,460px);
          height:86px;
          border-radius:50%;
          border:1px solid currentColor;
          animation:nexaTurnBeacon 2600ms ease-in-out infinite;
        }
        .nexa-turn-control--human .nexa-turn-control__beacon {
          bottom:-3%;
          color:rgba(103,232,249,.2);
          transform:translate(-50%,-50%);
          box-shadow:0 0 32px rgba(34,211,238,.08);
        }
        .nexa-turn-control--ai .nexa-turn-control__beacon {
          top:5%;
          color:rgba(232,121,249,.18);
          transform:translate(-50%,-50%);
          box-shadow:0 0 32px rgba(217,70,239,.07);
        }
        .nexa-turn-control--combat { opacity:.42; transition:opacity 160ms ease; }
        @media (max-width:900px) {
          .nexa-turn-control__wash { opacity:.36; }
          .nexa-turn-control__rail { left:20%; right:20%; }
        }


        /* NEXA VFX — reserve link / deploy handoff polish */
        @keyframes nexaReserveLink {
          0% { opacity:0; transform:translate(-50%,-50%) scaleX(.18); }
          26% { opacity:.62; }
          74% { opacity:.42; }
          100% { opacity:0; transform:translate(-50%,-50%) scaleX(1); }
        }
        @keyframes nexaDeployLock {
          0% { opacity:0; transform:translate(-50%,-50%) scale(1.45) rotate(-18deg); }
          38% { opacity:.75; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(.72) rotate(0deg); }
        }
        @keyframes nexaDeployFloorWake {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.35,.18); }
          34% { opacity:.7; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.5,.72); }
        }
        .nexa-deploy-handoff {
          position:absolute;
          inset:0;
          z-index:44;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-deploy-handoff__link {
          position:absolute;
          left:50%;
          width:min(48vw,480px);
          height:2px;
          transform-origin:center;
          background:linear-gradient(90deg,transparent,currentColor,rgba(255,255,255,.78),currentColor,transparent);
          box-shadow:0 0 12px currentColor;
          animation:nexaReserveLink 1180ms cubic-bezier(.14,.72,.18,1) both;
        }
        .nexa-deploy-handoff--human .nexa-deploy-handoff__link {
          top:67%; color:rgba(103,232,249,.52);
        }
        .nexa-deploy-handoff--ai .nexa-deploy-handoff__link {
          top:33%; color:rgba(232,121,249,.48);
        }
        .nexa-deploy-handoff__lock {
          position:absolute;
          left:50%;
          width:118px; height:118px;
          border-radius:999px;
          border:1px dashed currentColor;
          box-shadow:0 0 24px currentColor;
          animation:nexaDeployLock 980ms ease-out both;
        }
        .nexa-deploy-handoff--human .nexa-deploy-handoff__lock {
          top:67%; color:rgba(103,232,249,.34);
        }
        .nexa-deploy-handoff--ai .nexa-deploy-handoff__lock {
          top:33%; color:rgba(232,121,249,.3);
        }
        .nexa-deploy-handoff__floor {
          position:absolute;
          left:50%;
          width:min(42vw,420px); height:100px;
          border-radius:50%;
          border:1px solid currentColor;
          background:radial-gradient(ellipse,rgba(255,255,255,.07),transparent 66%);
          animation:nexaDeployFloorWake 1450ms ease-out both;
        }
        .nexa-deploy-handoff--human .nexa-deploy-handoff__floor {
          top:74%; color:rgba(103,232,249,.24);
        }
        .nexa-deploy-handoff--ai .nexa-deploy-handoff__floor {
          top:26%; color:rgba(232,121,249,.22);
        }
        @media (max-width:900px) {
          .nexa-deploy-handoff__link { width:62vw; }
          .nexa-deploy-handoff__lock { width:88px; height:88px; }
        }


        /* NEXA VFX — ability language / shared signatures */
        @keyframes nexaAbilityField {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.42); }
          28% { opacity:.66; }
          72% { opacity:.38; transform:translate(-50%,-50%) scale(1.02); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.28); }
        }
        @keyframes nexaAbilityNodes {
          0% { opacity:0; transform:translate(-50%,-50%) rotate(0deg) scale(.7); }
          35% { opacity:.7; }
          100% { opacity:0; transform:translate(-50%,-50%) rotate(120deg) scale(1.18); }
        }
        @keyframes nexaAbilityCorePulse {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.25); }
          30% { opacity:.9; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.5); }
        }
        .nexa-ability-language {
          position:absolute;
          inset:0;
          z-index:39;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-ability-language__field {
          position:absolute;
          left:50%; top:50%;
          width:min(54vw,540px);
          height:min(40vh,330px);
          border-radius:50%;
          border:1px solid currentColor;
          background:radial-gradient(ellipse,rgba(255,255,255,.055),transparent 64%);
          box-shadow:0 0 38px currentColor,inset 0 0 42px rgba(255,255,255,.025);
          animation:nexaAbilityField 1550ms cubic-bezier(.14,.72,.18,1) both;
        }
        .nexa-ability-language__nodes {
          position:absolute;
          left:50%; top:50%;
          width:220px; height:220px;
          border-radius:999px;
          border:1px dashed currentColor;
          animation:nexaAbilityNodes 1450ms ease-out both;
        }
        .nexa-ability-language__core {
          position:absolute;
          left:50%; top:50%;
          width:92px; height:92px;
          border-radius:999px;
          background:radial-gradient(circle,rgba(255,255,255,.48),currentColor 8%,transparent 64%);
          animation:nexaAbilityCorePulse 1100ms ease-out both;
        }
        .nexa-ability-language--offense { color:rgba(248,113,113,.24); }
        .nexa-ability-language--defense { color:rgba(103,232,249,.22); }
        .nexa-ability-language--support { color:rgba(110,231,183,.22); }
        .nexa-ability-language--control { color:rgba(232,121,249,.22); }
        .nexa-ability-language--offense .nexa-ability-language__field {
          background:radial-gradient(ellipse,rgba(248,113,113,.12),rgba(217,70,239,.05) 36%,transparent 68%);
        }
        .nexa-ability-language--defense .nexa-ability-language__field {
          background:radial-gradient(ellipse,rgba(103,232,249,.11),rgba(59,130,246,.04) 42%,transparent 70%);
        }
        .nexa-ability-language--support .nexa-ability-language__field {
          background:radial-gradient(ellipse,rgba(110,231,183,.11),rgba(34,211,238,.035) 42%,transparent 70%);
        }
        .nexa-ability-language--control .nexa-ability-language__field {
          background:radial-gradient(ellipse,rgba(232,121,249,.11),rgba(168,85,247,.045) 42%,transparent 70%);
        }
        @media (max-width:900px) {
          .nexa-ability-language__nodes { width:160px; height:160px; }
          .nexa-ability-language__core { width:70px; height:70px; }
        }


        /* NEXA UX — invalid action / resource feedback */
        @keyframes nexaResourceReject {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.72); }
          18% { opacity:.92; transform:translate(-50%,-50%) scale(1.04); }
          36% { transform:translate(calc(-50% - 5px),-50%) scale(1); }
          50% { transform:translate(calc(-50% + 5px),-50%) scale(1); }
          64% { transform:translate(calc(-50% - 3px),-50%) scale(1); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.08); }
        }
        @keyframes nexaResourceDrain {
          0% { opacity:0; transform:translateY(-10px) scaleX(.3); }
          30% { opacity:.7; }
          100% { opacity:0; transform:translateY(18px) scaleX(1); }
        }
        .nexa-action-reject {
          position:absolute;
          inset:0;
          z-index:58;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-action-reject__core {
          position:absolute;
          left:50%; top:49%;
          width:min(42vw,420px);
          min-width:220px;
          border-radius:18px;
          border:1px solid rgba(251,113,133,.48);
          background:linear-gradient(180deg,rgba(76,5,25,.72),rgba(15,23,42,.82));
          box-shadow:0 0 30px rgba(244,63,94,.16),inset 0 0 24px rgba(244,63,94,.06);
          padding:12px 18px;
          text-align:center;
          animation:nexaResourceReject 1150ms ease-out both;
        }
        .nexa-action-reject__title {
          display:block;
          color:rgba(254,205,211,.95);
          font-size:10px;
          font-weight:900;
          letter-spacing:.28em;
          text-transform:uppercase;
        }
        .nexa-action-reject__line {
          position:absolute;
          left:23%; right:23%; top:57%;
          height:1px;
          background:linear-gradient(90deg,transparent,rgba(251,113,133,.55),rgba(255,255,255,.45),rgba(251,113,133,.55),transparent);
          animation:nexaResourceDrain 950ms ease-out both;
        }
        .nexa-action-reject--energy .nexa-action-reject__core {
          border-color:rgba(250,204,21,.42);
          background:linear-gradient(180deg,rgba(66,32,6,.7),rgba(15,23,42,.84));
          box-shadow:0 0 30px rgba(250,204,21,.12),inset 0 0 24px rgba(250,204,21,.05);
        }
        .nexa-action-reject--energy .nexa-action-reject__title { color:rgba(254,240,138,.96); }
        .nexa-action-reject--energy .nexa-action-reject__line {
          background:linear-gradient(90deg,transparent,rgba(250,204,21,.5),rgba(255,255,255,.4),rgba(250,204,21,.5),transparent);
        }
        @media (max-width:900px) {
          .nexa-action-reject__core { width:72vw; min-width:0; padding:10px 14px; }
          .nexa-action-reject__title { font-size:9px; letter-spacing:.2em; }
        }


        /* NEXA VFX — KO continuity / terminal transition */
        @keyframes nexaKoAftershock {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.28); }
          18% { opacity:.82; }
          58% { opacity:.36; transform:translate(-50%,-50%) scale(1.08); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.62); }
        }
        @keyframes nexaKoVacuum {
          0% { opacity:0; transform:translate(-50%,-50%) scale(1.3); }
          28% { opacity:.52; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(.18); }
        }
        @keyframes nexaTerminalConverge {
          0% { opacity:0; transform:translate(-50%,-50%) scale(1.5); }
          32% { opacity:.48; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(.42); }
        }
        .nexa-ko-continuity {
          position:absolute;
          inset:0;
          z-index:43;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-ko-continuity__aftershock {
          position:absolute;
          left:50%; top:49%;
          width:min(52vw,520px); height:min(32vh,270px);
          border-radius:50%;
          border:1px solid rgba(255,255,255,.36);
          box-shadow:0 0 32px rgba(34,211,238,.18),0 0 62px rgba(217,70,239,.12);
          animation:nexaKoAftershock 1550ms ease-out both;
        }
        .nexa-ko-continuity__vacuum {
          position:absolute;
          left:50%; top:49%;
          width:min(38vw,380px); aspect-ratio:1;
          border-radius:999px;
          background:radial-gradient(circle,rgba(2,6,23,.7),rgba(34,211,238,.08) 38%,transparent 70%);
          border:1px dashed rgba(103,232,249,.18);
          animation:nexaKoVacuum 1350ms cubic-bezier(.18,.72,.18,1) both;
        }
        .nexa-terminal-bridge {
          position:absolute;
          inset:0;
          z-index:46;
          pointer-events:none;
          overflow:hidden;
          background:radial-gradient(circle at 50% 49%,rgba(255,255,255,.035),rgba(2,6,23,.16) 42%,rgba(2,6,23,.5) 100%);
        }
        .nexa-terminal-bridge__ring {
          position:absolute;
          left:50%; top:49%;
          width:min(68vw,690px); aspect-ratio:1;
          border-radius:999px;
          border:1px solid rgba(103,232,249,.18);
          box-shadow:0 0 55px rgba(34,211,238,.1),inset 0 0 55px rgba(217,70,239,.07);
          animation:nexaTerminalConverge 1750ms ease-in both;
        }
        .nexa-terminal-bridge__label {
          position:absolute;
          left:50%; top:49%;
          transform:translate(-50%,-50%);
          font-size:9px;
          font-weight:900;
          letter-spacing:.42em;
          text-transform:uppercase;
          color:rgba(207,250,254,.58);
          text-shadow:0 0 14px rgba(34,211,238,.3);
          white-space:nowrap;
        }
        @media (max-width:900px) {
          .nexa-terminal-bridge__label { font-size:8px; letter-spacing:.26em; }
        }


        /* NEXA VFX — Last Nexus escalation / endgame pressure */
        @keyframes nexaLastNexusBreath {
          0%,100% { opacity:.16; transform:translate(-50%,-50%) scale(.92); }
          50% { opacity:.5; transform:translate(-50%,-50%) scale(1.06); }
        }
        @keyframes nexaLastNexusRails {
          0%,100% { opacity:.12; }
          50% { opacity:.44; }
        }
        @keyframes nexaLastNexusScan {
          0% { opacity:0; transform:translateY(-28px); }
          30% { opacity:.48; }
          100% { opacity:0; transform:translateY(32px); }
        }
        .nexa-last-nexus-arena {
          position:absolute;
          inset:0;
          z-index:18;
          pointer-events:none;
          overflow:hidden;
        }
        .nexa-last-nexus-arena__field {
          position:absolute;
          left:50%; top:49%;
          width:min(72vw,720px); height:min(52vh,430px);
          border-radius:50%;
          border:1px solid currentColor;
          box-shadow:0 0 46px currentColor,inset 0 0 62px rgba(255,255,255,.025);
          animation:nexaLastNexusBreath 1800ms ease-in-out infinite;
        }
        .nexa-last-nexus-arena__rails {
          position:absolute;
          inset:8% 10%;
          border-top:1px solid currentColor;
          border-bottom:1px solid currentColor;
          animation:nexaLastNexusRails 1500ms ease-in-out infinite;
        }
        .nexa-last-nexus-arena__scan {
          position:absolute;
          left:24%; right:24%; top:49%;
          height:1px;
          background:linear-gradient(90deg,transparent,currentColor,rgba(255,255,255,.6),currentColor,transparent);
          box-shadow:0 0 10px currentColor;
          animation:nexaLastNexusScan 1900ms ease-in-out infinite;
        }
        .nexa-last-nexus-arena--human { color:rgba(103,232,249,.22); }
        .nexa-last-nexus-arena--ai { color:rgba(232,121,249,.2); }
        .nexa-last-nexus-arena--both {
          color:rgba(255,255,255,.18);
          background:
            radial-gradient(ellipse at 50% 72%,rgba(34,211,238,.045),transparent 38%),
            radial-gradient(ellipse at 50% 28%,rgba(217,70,239,.045),transparent 38%);
        }
        .nexa-last-nexus-arena--combat { opacity:.45; transition:opacity 160ms ease; }
        @media (max-width:900px) {
          .nexa-last-nexus-arena__rails { inset:12% 6%; }
          .nexa-last-nexus-arena__field { width:82vw; height:42vh; }
        }


        /* NEXA VFX — result presentation polish */
        @keyframes nexaResultSeal {
          0% { opacity:0; transform:translate(-50%,-50%) scale(1.8) rotate(-28deg); }
          34% { opacity:.62; }
          100% { opacity:.12; transform:translate(-50%,-50%) scale(.92) rotate(0deg); }
        }
        @keyframes nexaResultHorizon {
          0% { opacity:0; transform:scaleX(.08); }
          38% { opacity:.72; }
          100% { opacity:.2; transform:scaleX(1); }
        }
        @keyframes nexaResultControls {
          0%,62% { opacity:0; transform:translateY(12px); }
          100% { opacity:1; transform:translateY(0); }
        }
        @keyframes nexaResultStatus {
          0%,38% { opacity:0; letter-spacing:.5em; }
          100% { opacity:.8; letter-spacing:.28em; }
        }
        .nexa-result-seal {
          position:absolute;
          left:50%; top:50%;
          width:min(74vw,740px); aspect-ratio:1;
          border-radius:999px;
          border:1px dashed rgba(255,255,255,.16);
          box-shadow:0 0 70px rgba(34,211,238,.08),inset 0 0 70px rgba(217,70,239,.06);
          animation:nexaResultSeal 2300ms cubic-bezier(.15,.72,.2,1) both;
        }
        .nexa-result-horizon {
          position:absolute;
          left:12%; right:12%; top:50%;
          height:1px;
          transform-origin:center;
          background:linear-gradient(90deg,transparent,rgba(103,232,249,.36),rgba(255,255,255,.72),rgba(232,121,249,.36),transparent);
          box-shadow:0 0 16px rgba(255,255,255,.24);
          animation:nexaResultHorizon 1900ms ease-out both;
        }
        .nexa-result-status {
          margin-top:10px;
          font-size:9px;
          font-weight:800;
          text-transform:uppercase;
          color:rgba(148,163,184,.78);
          animation:nexaResultStatus 1800ms ease-out both;
        }
        .nexa-result-controls {
          animation:nexaResultControls 2400ms ease-out both;
        }
        @media (max-width:900px) {
          .nexa-result-seal { width:92vw; }
          .nexa-result-horizon { left:4%; right:4%; }
        }


        /* NEXA VFX — Physical Combat Pass, tuned from ia2.mp4 */
        @keyframes nexaCombatFocusIn {
          0% { opacity:0; }
          100% { opacity:1; }
        }
        @keyframes nexaImpactPlate {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.22); }
          24% { opacity:.68; }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.45); }
        }
        .nexa-physical-combat-focus {
          position:absolute;
          inset:0;
          z-index:24;
          pointer-events:none;
          overflow:hidden;
          background:radial-gradient(ellipse at 50% 49%,transparent 0 23%,rgba(2,6,23,.12) 43%,rgba(2,6,23,.48) 100%);
          animation:nexaCombatFocusIn 180ms ease-out both;
        }
        .nexa-physical-combat-focus--impact {
          background:radial-gradient(ellipse at 50% 49%,rgba(255,255,255,.025) 0 18%,rgba(2,6,23,.18) 44%,rgba(2,6,23,.58) 100%);
        }
        .nexa-physical-combat-focus__plate {
          position:absolute;
          left:50%; top:49%;
          width:min(46vw,460px); height:min(28vh,230px);
          border-radius:50%;
          border:1px solid rgba(255,255,255,.22);
          box-shadow:0 0 28px rgba(34,211,238,.12),0 0 48px rgba(217,70,239,.08);
          animation:nexaImpactPlate 820ms ease-out both;
        }
        /* Quiet secondary spectacle while the cards themselves perform the hit. */
        .nexa-physical-combat-focus ~ .nexa-idle-polish,
        .nexa-physical-combat-focus ~ .nexa-turn-control,
        .nexa-physical-combat-focus ~ .nexa-last-nexus-arena {
          opacity:.32;
        }
        @media (max-width:900px) {
          .nexa-physical-combat-focus {
            background:radial-gradient(ellipse at 50% 49%,transparent 0 28%,rgba(2,6,23,.08) 52%,rgba(2,6,23,.34) 100%);
          }
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-physical-combat-focus__plate { animation:none; opacity:.18; }
        }


        /* NEXA VFX — Combat camera pass */
        @keyframes nexaCameraPrepare {
          0% { transform:scale(1); filter:brightness(1); }
          100% { transform:scale(1.012); filter:brightness(.94); }
        }
        @keyframes nexaCameraAttack {
          0% { transform:scale(1.012); }
          72% { transform:scale(1.026); }
          100% { transform:scale(1.034); }
        }
        @keyframes nexaCameraImpact {
          0% { transform:translate3d(0,0,0) scale(1.034); }
          18% { transform:translate3d(-5px,2px,0) scale(1.044); }
          36% { transform:translate3d(5px,-2px,0) scale(1.038); }
          54% { transform:translate3d(-3px,1px,0) scale(1.041); }
          74% { transform:translate3d(2px,-1px,0) scale(1.036); }
          100% { transform:translate3d(0,0,0) scale(1.028); }
        }
        @keyframes nexaCameraRecover {
          0% { transform:scale(1.028); filter:brightness(.97); }
          100% { transform:scale(1); filter:brightness(1); }
        }
        .nexa-combat-camera {
          transform-origin:50% 49%;
          will-change:transform,filter;
        }
        .nexa-combat-camera--prepare { animation:nexaCameraPrepare 460ms ease-out both; }
        .nexa-combat-camera--attack { animation:nexaCameraAttack 720ms cubic-bezier(.18,.72,.18,1) both; }
        .nexa-combat-camera--impact { animation:nexaCameraImpact 520ms ease-out both; }
        .nexa-combat-camera--recover { animation:nexaCameraRecover 760ms cubic-bezier(.2,.75,.25,1) both; }
        @media (max-width:900px) {
          @keyframes nexaCameraImpact {
            0% { transform:translate3d(0,0,0) scale(1.018); }
            25% { transform:translate3d(-2px,1px,0) scale(1.024); }
            50% { transform:translate3d(2px,-1px,0) scale(1.021); }
            100% { transform:translate3d(0,0,0) scale(1.014); }
          }
          .nexa-combat-camera--attack { animation-duration:680ms; }
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-combat-camera--prepare,
          .nexa-combat-camera--attack,
          .nexa-combat-camera--impact,
          .nexa-combat-camera--recover { animation:none; }
        }


        /* NEXA VFX — Quiet arena / combat hierarchy pass */
        @keyframes nexaCombatQuietIn {
          0% { opacity:0; }
          100% { opacity:1; }
        }
        .nexa-combat-quiet {
          position:absolute;
          inset:0;
          z-index:23;
          pointer-events:none;
          overflow:hidden;
          animation:nexaCombatQuietIn 180ms ease-out both;
        }
        .nexa-combat-quiet::before {
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(90deg,rgba(2,6,23,.34),transparent 23%,transparent 77%,rgba(2,6,23,.34)),
            radial-gradient(ellipse at 50% 49%,transparent 0 27%,rgba(2,6,23,.08) 48%,rgba(2,6,23,.25) 100%);
        }
        .nexa-combat-quiet--prepare::before { opacity:.72; }
        .nexa-combat-quiet--attack::before { opacity:.9; }
        .nexa-combat-quiet--impact::before { opacity:1; }
        .nexa-combat-quiet--recover::before { opacity:.58; }

        /* The arena breathes quietly between actions; spectacle belongs to actions. */
        .nexa-arena-ambient,
        .nexa-rift-reactor,
        .nexa-idle-polish {
          transition:opacity 220ms ease,filter 220ms ease;
        }
        .nexa-neutral-calm {
          position:absolute;
          inset:0;
          z-index:2;
          pointer-events:none;
          background:radial-gradient(ellipse at 50% 49%,rgba(34,211,238,.018),transparent 38%,rgba(2,6,23,.055) 78%);
          opacity:.72;
        }
        @media (max-width:900px) {
          .nexa-combat-quiet::before {
            background:
              linear-gradient(90deg,rgba(2,6,23,.2),transparent 18%,transparent 82%,rgba(2,6,23,.2)),
              radial-gradient(ellipse at 50% 49%,transparent 0 32%,rgba(2,6,23,.06) 58%,rgba(2,6,23,.18) 100%);
          }
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-combat-quiet { animation:none; }
        }


        /* NEXA VFX — Damage readability pass */
        @keyframes nexaDamageReadout {
          0% { opacity:0; transform:translate3d(0,12px,0) scale(.55); filter:blur(5px); }
          24% { opacity:1; transform:translate3d(0,-4px,0) scale(1.28); filter:blur(0); }
          58% { opacity:1; transform:translate3d(0,-10px,0) scale(1); }
          100% { opacity:0; transform:translate3d(0,-30px,0) scale(.92); }
        }
        @keyframes nexaDamageHalo {
          0% { opacity:0; transform:scale(.55); }
          28% { opacity:.88; }
          100% { opacity:0; transform:scale(1.42); }
        }
        @keyframes nexaHpShock {
          0% { opacity:0; transform:scaleX(.25); }
          28% { opacity:.95; transform:scaleX(1); }
          100% { opacity:0; transform:scaleX(.72); }
        }
        .nexa-damage-readout {
          position:absolute;
          z-index:52;
          right:-14px;
          top:-36px;
          min-width:54px;
          text-align:center;
          font-size:clamp(1.7rem,2.3vw,2.45rem);
          line-height:1;
          font-weight:950;
          letter-spacing:-.06em;
          text-shadow:0 2px 2px rgba(2,6,23,.9),0 0 18px currentColor;
          animation:nexaDamageReadout 1180ms cubic-bezier(.16,.82,.22,1) both;
          pointer-events:none;
        }
        .nexa-damage-readout::before {
          content:"";
          position:absolute;
          z-index:-1;
          left:50%; top:50%;
          width:72px; height:72px;
          margin:-36px;
          border-radius:50%;
          border:1px solid currentColor;
          box-shadow:0 0 24px currentColor;
          opacity:.2;
          animation:nexaDamageHalo 900ms ease-out both;
        }
        .nexa-hp-shock {
          position:absolute;
          z-index:34;
          left:8%; right:8%;
          bottom:7px;
          height:3px;
          transform-origin:center;
          border-radius:999px;
          background:linear-gradient(90deg,transparent,rgba(251,113,133,.9),white,rgba(251,113,133,.9),transparent);
          box-shadow:0 0 14px rgba(251,113,133,.7);
          animation:nexaHpShock 760ms ease-out both;
          pointer-events:none;
        }
        .nexa-damage-readout--heal {
          color:#6ee7b7;
          text-shadow:0 2px 2px rgba(2,6,23,.9),0 0 18px rgba(52,211,153,.85);
        }
        .nexa-damage-readout--defeat {
          color:#fda4af;
          font-size:clamp(1.9rem,2.6vw,2.7rem);
        }
        @media (max-width:900px) {
          .nexa-damage-readout { right:-8px; top:-28px; font-size:1.65rem; min-width:44px; }
          .nexa-damage-readout::before { width:56px; height:56px; margin:-28px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-damage-readout { animation:none; opacity:1; transform:none; }
          .nexa-damage-readout::before,.nexa-hp-shock { animation:none; opacity:.35; }
        }


        /* NEXA VFX — Physical KO refinement */
        @keyframes nexaKoVoid {
          0%,18% { opacity:0; transform:translate(-50%,-50%) scale(.3); }
          42% { opacity:.82; transform:translate(-50%,-50%) scale(.9); }
          76% { opacity:.55; transform:translate(-50%,-50%) scale(1.28); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.7); }
        }
        @keyframes nexaKoDisintegrate {
          0%,16% { opacity:0; transform:translateY(0) scaleY(.08); filter:blur(1px); }
          36% { opacity:.9; transform:translateY(0) scaleY(.45); }
          72% { opacity:.65; transform:translateY(-12px) scaleY(1); filter:blur(2px); }
          100% { opacity:0; transform:translateY(-30px) scaleY(1.18); filter:blur(6px); }
        }
        @keyframes nexaKoPlatformVacancy {
          0%,48% { opacity:0; transform:translate(-50%,-50%) scale(.5); }
          72% { opacity:.65; }
          100% { opacity:.12; transform:translate(-50%,-50%) scale(1.35); }
        }
        .nexa-ko-void {
          position:absolute; left:50%; top:50%; z-index:33;
          width:118%; aspect-ratio:1; border-radius:50%;
          background:radial-gradient(circle,rgba(2,6,23,.96) 0 18%,rgba(217,70,239,.28) 30%,rgba(34,211,238,.16) 48%,transparent 70%);
          box-shadow:0 0 34px rgba(217,70,239,.28),inset 0 0 28px rgba(2,6,23,.95);
          animation:nexaKoVoid 1700ms cubic-bezier(.18,.72,.2,1) both;
          pointer-events:none;
        }
        .nexa-ko-disintegrate {
          position:absolute; inset:5%; z-index:39; border-radius:inherit;
          background:repeating-linear-gradient(0deg,transparent 0 7px,rgba(255,255,255,.48) 8px,rgba(34,211,238,.28) 9px,transparent 11px);
          mix-blend-mode:screen;
          transform-origin:bottom;
          animation:nexaKoDisintegrate 1650ms ease-out both;
          pointer-events:none;
        }
        .nexa-ko-vacancy {
          position:absolute; left:50%; top:50%; z-index:18;
          width:92%; height:44%; border-radius:50%;
          border:1px dashed rgba(103,232,249,.35);
          box-shadow:0 0 24px rgba(34,211,238,.16),inset 0 0 24px rgba(217,70,239,.08);
          animation:nexaKoPlatformVacancy 1750ms ease-out both;
          pointer-events:none;
        }
        @media (max-width:900px) {
          .nexa-ko-void { width:108%; }
          .nexa-ko-disintegrate { inset:8%; }
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-ko-void,.nexa-ko-disintegrate,.nexa-ko-vacancy { animation:none; opacity:.18; }
        }


        /* NEXA VFX — Post-KO reserve handoff */
        @keyframes nexaVacantSlot {
          0% { opacity:0; transform:scale(.82); }
          40% { opacity:.58; transform:scale(1.04); }
          100% { opacity:.28; transform:scale(1); }
        }
        @keyframes nexaReserveReady {
          0%,100% { opacity:.32; box-shadow:0 0 10px rgba(34,211,238,.08); }
          50% { opacity:.88; box-shadow:0 0 26px rgba(34,211,238,.3); }
        }
        @keyframes nexaDeployGuide {
          0% { opacity:0; transform:translate(-50%,-50%) scaleX(.15); }
          35% { opacity:.72; }
          100% { opacity:.12; transform:translate(-50%,-50%) scaleX(1); }
        }
        .nexa-vacant-active {
          position:absolute; inset:0; z-index:3; border-radius:1.35rem;
          border:1px dashed rgba(103,232,249,.2);
          background:radial-gradient(ellipse at center bottom,rgba(34,211,238,.07),transparent 66%);
          animation:nexaVacantSlot 900ms ease-out both;
          pointer-events:none;
        }
        .nexa-reserve-ready {
          position:absolute; inset:-3px; z-index:8; border-radius:.9rem;
          border:1px solid rgba(103,232,249,.36);
          animation:nexaReserveReady 1450ms ease-in-out infinite;
          pointer-events:none;
        }
        .nexa-deploy-guide {
          position:absolute; left:50%; top:50%; z-index:7;
          width:66%; height:1px;
          background:linear-gradient(90deg,transparent,rgba(103,232,249,.72),white,rgba(103,232,249,.72),transparent);
          transform-origin:center;
          animation:nexaDeployGuide 1300ms ease-out both;
          pointer-events:none;
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-vacant-active,.nexa-reserve-ready,.nexa-deploy-guide { animation:none; opacity:.3; }
        }


        /* NEXA VFX — final cleanup / mobile / accessibility */
        .nexa-vfx-cleanup-shield {
          position:absolute;
          inset:0;
          pointer-events:none;
          z-index:1;
        }
        @media (max-width:900px) {
          /* Mobile keeps the event readable without rendering every decorative particle. */
          .nexa-result-shard:nth-child(2n),
          .nexa-ko-particle:nth-child(2n),
          .nexa-debris:nth-child(2n),
          .nexa-spark:nth-child(2n),
          .nexa-ability-bolt:nth-child(2n) {
            display:none !important;
          }
          .nexa-result-backdrop { backdrop-filter:blur(6px); }
          .nexa-card-physical::before { filter:blur(5px); }
          .nexa-combat-quiet::before { opacity:.72; }
        }
        @media (max-width:560px) {
          .nexa-result-shard:nth-child(3n),
          .nexa-ko-particle:nth-child(3n),
          .nexa-debris:nth-child(3n),
          .nexa-spark:nth-child(3n) {
            display:none !important;
          }
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-card-physical,
          .nexa-card-physical::before,
          .nexa-card-physical::after,
          .nexa-rift-reactor,
          .nexa-last-nexus-arena,
          .nexa-turn-control,
          .nexa-result-shard,
          .nexa-ko-particle,
          .nexa-debris,
          .nexa-spark,
          .nexa-ability-bolt,
          .nexa-damage-readout,
          .nexa-damage-readout::before,
          .nexa-hp-shock,
          .nexa-reserve-ready,
          .nexa-deploy-guide {
            animation-duration:1ms !important;
            animation-iteration-count:1 !important;
            transition-duration:1ms !important;
          }
        }


        /* NEXA polish — card-first combat hierarchy */
        .nexa-ability-event {
          transform:scale(.76);
          transform-origin:center;
        }
        .nexa-ability-language {
          transform:scale(.82);
          transform-origin:center;
        }
        @media (max-width:900px) {
          .nexa-ability-event { transform:scale(.7); }
          .nexa-ability-language { transform:scale(.76); }
        }


        /* NEXA composition pass — center stage first */
        .nexa-side-hud {
          transition:opacity 260ms ease, filter 260ms ease, transform 260ms ease;
        }
        .nexa-side-hud--combat {
          opacity:.48;
          filter:saturate(.72) brightness(.72);
        }
        @media (min-width:1024px) {
          .nexa-side-hud--combat:first-of-type { transform:translateX(-3px) scale(.985); }
          main + .nexa-side-hud--combat { transform:translateX(3px) scale(.985); }
        }
        @media (max-width:900px) {
          .nexa-side-hud--combat { opacity:.62; }
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-side-hud { transition:none; }
        }


        /* NEXA composition refinement — cards stay dominant, slots recede */
        @media (min-width:1024px) {
          .nexa-empty-active-slot {
            transform:scale(.88);
            opacity:.68;
          }
          .nexa-empty-active-slot .nexa-vacant-active {
            opacity:.18;
          }
        }
        @media (max-width:900px) {
          .nexa-empty-active-slot {
            opacity:.78;
          }
        }


        /* NEXA final collision pass — contact, compression, separation */
        @keyframes nexaContactShadow {
          0% { opacity:0; transform:translate(-50%,-50%) scale(.35,.7); }
          38% { opacity:.82; transform:translate(-50%,-50%) scale(1.12,.82); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(1.48,.46); }
        }
        @keyframes nexaContactLine {
          0% { opacity:0; transform:translate(-50%,-50%) scaleX(.18); }
          35% { opacity:.95; transform:translate(-50%,-50%) scaleX(1); }
          100% { opacity:0; transform:translate(-50%,-50%) scaleX(1.32); }
        }
        .nexa-contact-physical {
          position:absolute;
          inset:0;
          z-index:34;
          pointer-events:none;
        }
        .nexa-contact-physical::before {
          content:'';
          position:absolute;
          left:50%;
          top:50%;
          width:190px;
          height:42px;
          border-radius:50%;
          border:1px solid rgba(255,255,255,.5);
          background:radial-gradient(ellipse,rgba(255,255,255,.18),rgba(103,232,249,.08) 35%,transparent 70%);
          filter:blur(1px);
          animation:nexaContactShadow 520ms ease-out both;
        }
        .nexa-contact-physical::after {
          content:'';
          position:absolute;
          left:50%;
          top:50%;
          width:220px;
          height:2px;
          background:linear-gradient(90deg,transparent,rgba(103,232,249,.65),white,rgba(217,70,239,.62),transparent);
          box-shadow:0 0 12px rgba(255,255,255,.42);
          animation:nexaContactLine 430ms ease-out both;
        }
        @media (max-width:900px) {
          .nexa-contact-physical::before { width:132px; height:30px; }
          .nexa-contact-physical::after { width:154px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .nexa-contact-physical::before,
          .nexa-contact-physical::after { animation:none; opacity:.35; }
        }
        .nexa-board-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(103,232,249,.30) rgba(15,23,42,.18);
          scrollbar-gutter: stable;
        }
        .nexa-board-scroll::-webkit-scrollbar { width: 7px; }
        .nexa-board-scroll::-webkit-scrollbar-track { background: rgba(15,23,42,.18); }
        .nexa-board-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg,rgba(217,70,239,.34),rgba(103,232,249,.34));
          border-radius: 999px;
        }
        @media (max-width:1023px) {
          .nexa-board-scroll { overflow: visible; scrollbar-gutter: auto; }
        }
`}

      </style>
      

    <div className="relative mx-auto min-h-0 max-w-6xl overflow-visible pb-2 text-slate-100 lg:flex lg:h-[calc(100dvh-7rem)] lg:overflow-hidden lg:flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(45,20,80,0.38),transparent_62%),radial-gradient(ellipse_at_20%_55%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(ellipse_at_80%_45%,rgba(217,70,239,0.13),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-[-15%] top-1/2 -z-10 h-[46%] -translate-y-1/2 skew-y-[-4deg] opacity-30 [background-image:linear-gradient(rgba(103,232,249,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.12)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-32 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
      {combatAnimation?.phase === 'IMPACT' && (
        <div key={`arena-impact-${combatAnimation.token}`} className="pointer-events-none absolute inset-0 z-[35] overflow-hidden">
          <span className="nexa-arena-impact absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <span className="nexa-arena-pulse absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80" />
          <span className="nexa-floor-impact absolute left-1/2 top-[58%] h-16 w-44 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-cyan-100/75" />
          <span className="nexa-impact-vignette absolute inset-0" />
          {impactArchetype === 'ASSAULT' && <><span className="nexa-impact-assault absolute left-1/2 top-1/2 h-3 w-[72%]" /><span className="nexa-impact-assault absolute left-1/2 top-1/2 h-2 w-[58%] rotate-[44deg]" style={{ animationDelay: '70ms' }} /></>}
          {impactArchetype === 'TANK' && <><span className="nexa-impact-tank absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full" /><span className="nexa-impact-tank absolute left-1/2 top-[58%] h-16 w-64 -translate-x-1/2 -translate-y-1/2 rounded-[50%]" style={{ animationDelay: '80ms' }} /></>}
          {impactArchetype === 'SPEED' && <>{[0,1,2,3].map((lane) => <span key={`speed-impact-${lane}`} className="nexa-impact-speed absolute left-[12%] right-[12%] h-[3px]" style={{ top: `${36 + lane * 9}%`, animationDelay: `${lane * 45}ms` }} />)}</>}
          {impactArchetype === 'SUPPORT' && <><span className="nexa-impact-support absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full" /><span className="nexa-impact-support absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ animationDelay: '90ms' }} /></>}
          {impactArchetype === 'BALANCED' && <><span className="nexa-impact-balanced absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rotate-45" /><span className="nexa-impact-balanced absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45" style={{ animationDelay: '90ms' }} /></>}
          {[0,1,2,3,4,5].map((beam) => <span key={beam} className="nexa-arena-beam absolute left-1/2 top-1/2 h-[3px] w-[46%] bg-gradient-to-r from-white via-cyan-200 to-transparent" style={{ '--r': `${beam * 30 + 7}deg` } as React.CSSProperties} />)}
        </div>
      )}

      {combatAnimation?.phase === 'RECOVER' && (
        <div key={`flow-${combatAnimation.token}`} className="pointer-events-none absolute inset-0 z-[34] overflow-hidden rounded-[2rem]">
          <span className={`nexa-flow-aftershock absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border ${combatAnimation.defeated ? 'border-fuchsia-100/85' : 'border-cyan-100/70'}`} />
          <span className="nexa-flow-lane absolute left-[12%] right-[12%] top-1/2 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent shadow-[0_0_18px_rgba(255,255,255,.55)]" />
          {[0,1,2,3].map((arc) => <span key={`flow-arc-${arc}`} className={`nexa-flow-arc absolute left-1/2 top-1/2 h-[2px] w-[38%] ${arc % 2 ? 'bg-gradient-to-r from-white via-fuchsia-200 to-transparent text-fuchsia-300' : 'bg-gradient-to-r from-white via-cyan-100 to-transparent text-cyan-300'}`} style={{ '--r': `${arc * 45 + 12}deg` } as React.CSSProperties} />)}
          {Array.from({ length: 14 }, (_, particle) => <span key={`flow-dust-${particle}`} className={`nexa-flow-dust absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full ${particle % 3 === 0 ? 'bg-fuchsia-100 text-fuchsia-300' : 'bg-cyan-100 text-cyan-300'}`} style={{ '--r': `${particle * (360 / 14)}deg`, '--d': `${110 + (particle % 5) * 25}px` } as React.CSSProperties} />)}
          {combatAnimation.defeated && <span className="nexa-flow-ko-bridge absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full" />}
        </div>
      )}
      <header className="flex h-6 items-center justify-end">
        <button type="button" onClick={reset} className="rounded-lg border border-white/10 p-1.5 text-slate-500 hover:border-cyan-300/50 hover:text-cyan-200" title="Reiniciar partida" aria-label="Reiniciar partida"><RotateCcw size={14} /></button>
      </header>

      {intro && <div className="mb-4 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.3em] text-fuchsia-100">RIFT ESTABILIZADO · COMBATE INICIADO</div>}

      {message && <div className="mb-3 flex items-center justify-between rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"><span>{message}</span><button type="button" onClick={() => setMessage('')}><X size={14} /></button></div>}

      <div className={`lg:grid lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:gap-3 ${state.arena.activeSlots >= 4 ? 'lg:grid-cols-[128px_minmax(0,1fr)_170px]' : state.arena.activeSlots === 3 ? 'lg:grid-cols-[145px_minmax(0,1fr)_185px]' : 'lg:grid-cols-[168px_minmax(0,1fr)_210px]'}`}>
      <aside className={`nexa-side-hud hidden min-h-0 flex-col justify-between rounded-2xl border border-cyan-300/15 bg-slate-950/25 p-3 text-xs backdrop-blur-sm lg:flex ${combatAnimation ? "nexa-side-hud--combat" : ""}`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200">Você</p>
          <LifeDots player={humanPlayer} />
          <p className="mt-1 text-[10px] text-slate-500">{humanPlayer.cards.filter((card) => card.state !== 'DEFEATED').length} cartas vivas</p>
          <FormationGlyphs player={humanPlayer} />
          <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-[10px] text-slate-400">
            <p className="font-black uppercase tracking-widest text-slate-500">Formação</p>
            <p>{humanPlayer.cards.filter((card) => card.state === 'ACTIVE').length} ativas · {humanPlayer.cards.filter((card) => card.state === 'RESERVE').length} reserva</p>
            <p className="font-black uppercase tracking-widest text-slate-500">Energia</p>
            <EnergyPips current={humanPlayer.currentEnergy} max={humanPlayer.maxEnergy} />
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-200">Adversário</p>
            <LifeDots player={aiPlayer} />
            <p className="mt-1 text-[10px] text-slate-500">{aiPlayer.cards.filter((card) => card.state !== 'DEFEATED').length} cartas vivas · IA {difficulty}</p>
            <FormationGlyphs player={aiPlayer} />
          </div>
        </div>
        <button type="button" aria-expanded={showLog} onClick={() => setShowLog((open) => !open)} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:border-cyan-300/40 hover:text-cyan-200"><ScrollText size={13} /> Registro de combate</button>
      </aside>

      <main
        style={{ '--camera-y': combatAnimation?.targetPlayerId === AI_PLAYER_ID ? '-7px' : '7px' } as React.CSSProperties}
        className={`nexa-board-scroll relative grid min-w-0 gap-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[2rem] border border-white/[0.08] bg-slate-950/25 shadow-[inset_0_0_60px_rgba(2,6,23,0.42),0_18px_50px_rgba(0,0,0,0.24)] [perspective:900px] lg:h-full lg:min-h-0 ${state.arena.activeSlots >= 4 ? 'lg:grid-rows-[max-content_124px_max-content]' : state.arena.activeSlots === 3 ? 'lg:grid-rows-[max-content_52px_max-content]' : 'lg:grid-rows-[max-content_64px_max-content]'} ${
          combatAnimation?.phase === 'PREPARE' ? 'nexa-camera-charge' :
          combatAnimation?.phase === 'ATTACK' ? 'nexa-camera-rush' :
          combatAnimation?.phase === 'IMPACT' ? 'nexa-camera-impact' :
          combatAnimation?.phase === 'RECOVER' ? 'nexa-camera-recover' : ''
        }`}
      >

          {!combatAnimation && !abilityAnimation && !deployAnimation && !turnAnimation && !state.result && (
            <div className="nexa-neutral-calm" aria-hidden="true" />
          )}
          {combatAnimation?.phase === 'IMPACT' && <div className="nexa-contact-physical" aria-hidden="true" />}
          {combatAnimation && (
            <div
              className={`nexa-combat-quiet nexa-combat-quiet--${combatAnimation.phase.toLowerCase()}`}
              aria-hidden="true"
            />
          )}


          <div
            className={`nexa-combat-camera absolute inset-0 pointer-events-none ${
              combatAnimation?.phase === 'PREPARE' ? 'nexa-combat-camera--prepare'
                : combatAnimation?.phase === 'ATTACK' ? 'nexa-combat-camera--attack'
                  : combatAnimation?.phase === 'IMPACT' ? 'nexa-combat-camera--impact'
                    : combatAnimation?.phase === 'RECOVER' ? 'nexa-combat-camera--recover'
                      : ''
            }`}
            aria-hidden="true"
          >
            <span className="absolute inset-[8%] rounded-[2rem] border border-white/[0.025]" />
          </div>


          {combatAnimation && (
            <div
              className={`nexa-physical-combat-focus ${
                combatAnimation.phase === 'IMPACT' ? 'nexa-physical-combat-focus--impact' : ''
              }`}
              aria-hidden="true"
            >
              {combatAnimation.phase === 'IMPACT' && <span className="nexa-physical-combat-focus__plate" />}
            </div>
          )}


          {lastNexusSide && !state.result && (
            <div
              className={`nexa-last-nexus-arena ${
                lastNexusSide === 'HUMAN'
                  ? 'nexa-last-nexus-arena--human'
                  : lastNexusSide === 'AI'
                    ? 'nexa-last-nexus-arena--ai'
                    : 'nexa-last-nexus-arena--both'
              } ${combatAnimation ? 'nexa-last-nexus-arena--combat' : ''}`}
              aria-hidden="true"
            >
              <span className="nexa-last-nexus-arena__field" />
              <span className="nexa-last-nexus-arena__rails" />
              <span className="nexa-last-nexus-arena__scan" />
            </div>
          )}


          {combatAnimation?.isKo && combatAnimation.phase === 'RECOVER' && (
            <div className="nexa-ko-continuity" aria-hidden="true">
              <span className="nexa-ko-continuity__aftershock" />
              <span className="nexa-ko-continuity__vacuum" />
            </div>
          )}
          {state.result && !showResultCinematic && (
            <div className="nexa-terminal-bridge" aria-hidden="true">
              <span className="nexa-terminal-bridge__ring" />
              <span className="nexa-terminal-bridge__label">
                {state.result.winnerId === HUMAN_PLAYER_ID ? 'RIFT EM CONVERGÊNCIA' : 'SINAL EM COLAPSO'}
              </span>
            </div>
          )}


          {message && !state.result && !combatAnimation && !abilityAnimation && !deployAnimation && (
            <div
              className={`nexa-action-reject ${
                /energia|energy|custo|cost/i.test(message) ? 'nexa-action-reject--energy' : ''
              }`}
              aria-hidden="true"
            >
              <div className="nexa-action-reject__core">
                <span className="nexa-action-reject__title">
                  {/energia|energy|custo|cost/i.test(message) ? 'ENERGIA INSUFICIENTE' : 'AÇÃO NÃO DISPONÍVEL'}
                </span>
              </div>
              <span className="nexa-action-reject__line" />
            </div>
          )}


          <div
            className={`nexa-turn-control ${
              state.currentPlayerId === HUMAN_PLAYER_ID ? 'nexa-turn-control--human' : 'nexa-turn-control--ai'
            } ${combatAnimation ? 'nexa-turn-control--combat' : ''}`}
            aria-hidden="true"
            style={{ '--turn-shift': state.currentPlayerId === HUMAN_PLAYER_ID ? '14px' : '-14px' } as React.CSSProperties}
          >
            <div className="nexa-turn-control__wash" />
            <div className="nexa-turn-control__rail" />
            <div className="nexa-turn-control__beacon" />
          </div>


          {selectedCardId && !combatAnimation && (
            <div className={`nexa-decision-feedback ${Boolean(selectedAction) ? 'nexa-decision-feedback--target' : ''}`} aria-hidden="true">
              <div className="nexa-decision-reticle" />
              <div className="nexa-decision-sweep" />
              <div className="nexa-decision-label">{Boolean(selectedAction) ? 'SELECIONE O ALVO' : 'UNIDADE SINCRONIZADA'}</div>
            </div>
          )}


          <div
            className={`nexa-idle-ambience ${combatAnimation ? 'nexa-idle-ambience--combat' : ''}`}
            aria-hidden="true"
          >
            <div className="nexa-idle-scan" />
            <i className="nexa-idle-dust" style={{ left: '28%', top: '68%', '--dust-duration': '5100ms', '--dust-delay': '-900ms' } as React.CSSProperties} />
            <i className="nexa-idle-dust nexa-idle-dust--magenta" style={{ left: '72%', top: '62%', '--dust-duration': '5900ms', '--dust-delay': '-2400ms' } as React.CSSProperties} />
            <i className="nexa-idle-dust" style={{ left: '39%', top: '46%', '--dust-duration': '6400ms', '--dust-delay': '-3300ms' } as React.CSSProperties} />
            <i className="nexa-idle-dust nexa-idle-dust--magenta" style={{ left: '61%', top: '43%', '--dust-duration': '5600ms', '--dust-delay': '-1700ms' } as React.CSSProperties} />
            <i className="nexa-idle-dust" style={{ left: '48%', top: '73%', '--dust-duration': '6900ms', '--dust-delay': '-4100ms' } as React.CSSProperties} />
          </div>


          <div
            className={`nexa-rift-reactor ${
              !combatAnimation
                ? ''
                : combatAnimation.phase === 'PREPARE'
                  ? 'nexa-rift-reactor--prepare'
                  : combatAnimation.phase === 'ATTACK'
                    ? 'nexa-rift-reactor--attack'
                    : combatAnimation.phase === 'IMPACT'
                      ? 'nexa-rift-reactor--impact'
                      : combatAnimation.isKo
                        ? 'nexa-rift-reactor--ko'
                        : ''
            }`}
            aria-hidden="true"
          >
            <div className="nexa-rift-reactor-core" />
            <div className="nexa-rift-reactor-ring" />
          </div>


          {combatAnimation && (
            <div
              className={`nexa-platform-response ${
                combatAnimation.phase === 'PREPARE'
                  ? 'nexa-platform-response--prepare'
                  : combatAnimation.phase === 'ATTACK'
                    ? 'nexa-platform-response--attack'
                    : combatAnimation.phase === 'IMPACT'
                      ? 'nexa-platform-response--impact'
                      : combatAnimation.isKo
                        ? 'nexa-platform-response--ko'
                        : ''
              }`}
              aria-hidden="true"
            >
              <div className="nexa-platform-response-ring" />
              {(combatAnimation.phase === 'ATTACK' || combatAnimation.phase === 'IMPACT') && (
                <div className="nexa-platform-response-line" />
              )}
            </div>
          )}


          {combatAnimation && (
            <>
              <div
                className="nexa-hud-quiet-mask"
                aria-hidden="true"
                style={{ '--focus-duration': combatAnimation.phase === 'RECOVER' ? '900ms' : combatAnimation.phase === 'IMPACT' ? '550ms' : '650ms' } as React.CSSProperties}
              />
              <div
                className="nexa-combat-focus"
                aria-hidden="true"
                style={{ '--focus-duration': combatAnimation.phase === 'RECOVER' ? '900ms' : combatAnimation.phase === 'IMPACT' ? '550ms' : '650ms' } as React.CSSProperties}
              >
                {combatAnimation.phase === 'IMPACT' && <div className="nexa-impact-focus-ring" />}
              </div>
            </>
          )}


          {combatAnimation?.phase === 'ATTACK' && (
            <div className="nexa-attack-trajectory" aria-hidden="true">
              <div className="nexa-attack-wake" />
              <div className="nexa-attack-speed-lines" />
            </div>
          )}
          {combatAnimation?.phase === 'IMPACT' && (
            <div className="nexa-attack-trajectory" aria-hidden="true">
              <div className="nexa-contact-compression" />
            </div>
          )}
          {combatAnimation?.phase === 'RECOVER' && !combatAnimation.isKo && (
            <div className="nexa-attack-trajectory" aria-hidden="true">
              <div className="nexa-return-wake" />
            </div>
          )}


          {combatAnimation?.phase === 'PREPARE' && (
            <div className="nexa-duel-lock" aria-hidden="true">
              <div className="nexa-duel-lock-beam" />
              <div className="nexa-duel-lock-pulse" />
              <div className="nexa-duel-lock-reticle" />
            </div>
          )}


          <div className="nexa-battlefield-depth" aria-hidden="true">
            <div className="nexa-depth-floor-sweep" />
            <div className="nexa-depth-side-left" />
            <div className="nexa-depth-side-right" />
          </div>


          {combatAnimation?.phase === 'RECOVER' && combatAnimation.isKo && (
            <div className="nexa-ko-arena-surge" aria-hidden="true">
              <div className="nexa-ko-energy-column" />
              <div className="nexa-ko-final-flash" />
              <div className="absolute left-1/2 top-[48%] h-3/4 w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-100/80 to-transparent blur-[1px]" />
            </div>
          )}


          {combatAnimation?.phase === 'PREPARE' && (
            <div className="nexa-anticipation" aria-hidden="true">
              <div className="nexa-anticipation-core" />
              <div className="nexa-anticipation-ring" />
              <div className="nexa-anticipation-line" />
              <div className="nexa-anticipation-label">SINCRONIZANDO IMPACTO</div>
            </div>
          )}

        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[2rem]">
          <span data-phase={combatAnimation?.phase ?? 'IDLE'} className="nexa-rift-heart absolute left-1/2 top-1/2 h-28 w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/25 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.2)_0%,rgba(34,211,238,.18)_20%,rgba(168,85,247,.16)_46%,transparent_72%)]" />
          <span className="nexa-rail-pulse absolute left-[8%] top-[49%] h-px w-[34%] origin-right -rotate-[7deg] bg-gradient-to-r from-transparent via-cyan-200/45 to-white/70" />
          <span className="nexa-rail-pulse absolute right-[8%] top-[49%] h-px w-[34%] origin-left rotate-[7deg] bg-gradient-to-l from-transparent via-fuchsia-200/45 to-white/70" style={{ animationDelay: '420ms' }} />
          <span className="absolute left-1/2 top-1/2 h-[44%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-white/[0.06] shadow-[0_0_80px_rgba(34,211,238,0.08),inset_0_0_70px_rgba(217,70,239,0.06)]" />
          {(combatAnimation?.phase === 'ATTACK' || combatAnimation?.phase === 'IMPACT') && <span key={`ambient-${combatAnimation.token}-${combatAnimation.phase}`} className="nexa-ambient-sweep absolute -left-1/3 top-[18%] h-[64%] w-2/3 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-xl" />}
        </div>
        {turnAnimation && (
          <div key={`turn-${turnAnimation.token}`} className="pointer-events-none absolute inset-[-8%] z-[38] overflow-hidden rounded-[2.5rem]">
            <div className="nexa-turn-veil absolute inset-0" />
            <span className={`nexa-turn-rift absolute left-1/2 top-1/2 h-36 w-72 rounded-[50%] border-2 ${turnAnimation.playerId === HUMAN_PLAYER_ID ? 'border-cyan-100/80 text-cyan-300' : 'border-fuchsia-100/80 text-fuchsia-300'}`} />
            <span className={`nexa-energy-core absolute left-1/2 top-1/2 h-20 w-20 rounded-full bg-white ${turnAnimation.playerId === HUMAN_PLAYER_ID ? 'text-cyan-300' : 'text-fuchsia-300'}`} />
            <span className={`nexa-turn-sweep absolute left-0 top-1/2 h-24 w-full -translate-y-1/2 bg-gradient-to-r from-transparent ${turnAnimation.playerId === HUMAN_PLAYER_ID ? 'via-cyan-200/35' : 'via-fuchsia-200/35'} to-transparent`} />
            {Array.from({ length: Math.max(3, turnAnimation.energy) }, (_, orb) => (
              <span key={orb} className={`nexa-energy-orb absolute left-1/2 top-1/2 h-4 w-4 rounded-full ${turnAnimation.playerId === HUMAN_PLAYER_ID ? 'bg-cyan-100 text-cyan-300' : 'bg-fuchsia-100 text-fuchsia-300'}`} style={{ '--r': `${-90 + (360 / Math.max(3, turnAnimation.energy)) * orb}deg`, '--d': `${92 + (orb % 2) * 24}px` } as React.CSSProperties} />
            ))}
            <div className={`nexa-turn-title absolute left-1/2 top-1/2 z-40 whitespace-nowrap text-center font-black ${turnAnimation.playerId === HUMAN_PLAYER_ID ? 'text-cyan-100' : 'text-fuchsia-100'}`}>
              <span className="block text-[10px] tracking-[0.55em] text-white/70 sm:text-xs">TURNO {turnAnimation.turn}</span>
              <span className="mt-1 block text-2xl tracking-[0.28em] sm:text-4xl">{turnAnimation.playerId === HUMAN_PLAYER_ID ? 'SUA CONEXÃO' : 'CONEXÃO INIMIGA'}</span>
              <span className="mt-2 block text-xs tracking-[0.32em] sm:text-sm">ENERGIA {turnAnimation.energy}</span>
            </div>
          </div>
        )}
        {deployAnimation && (
          <div
            className={`nexa-deploy-handoff ${
              deployAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'nexa-deploy-handoff--human' : 'nexa-deploy-handoff--ai'
            }`}
            aria-hidden="true"
          >
            <span className="nexa-deploy-handoff__link" />
            <span className="nexa-deploy-handoff__lock" />
            <span className="nexa-deploy-handoff__floor" />
          </div>
        )}
        {deployAnimation && (
          <div key={`deploy-${deployAnimation.token}`} className="pointer-events-none absolute inset-[-8%] z-[45] overflow-visible">
            <div className="nexa-deploy-veil absolute inset-0 rounded-[2.5rem]" />
            <span className={`nexa-deploy-rift absolute left-1/2 ${deployAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'top-[72%] text-cyan-300 border-cyan-100/80' : 'top-[28%] text-fuchsia-300 border-fuchsia-100/80'} h-32 w-64 rounded-[50%] border-2`} />
            <span className={`nexa-deploy-beam absolute left-1/2 ${deployAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'bottom-[20%] origin-bottom bg-gradient-to-t from-cyan-300/10 via-cyan-100/85 to-white/10' : 'top-[20%] origin-top bg-gradient-to-b from-fuchsia-300/10 via-fuchsia-100/85 to-white/10'} h-[48%] w-28 -translate-x-1/2 [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)]`} />
            <div className={`nexa-card-physical nexa-deploy-card absolute left-1/2 ${deployAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'top-[67%] text-cyan-300' : 'top-[33%] text-fuchsia-300'} w-28 rounded-2xl border border-white/70 bg-slate-950/90 p-1.5 sm:w-36`}>
              <img src={getCardImage(deployAnimation.cardId)} alt="" className="h-28 w-full rounded-xl object-cover sm:h-36" />
              <p className="mt-1 truncate text-center text-[10px] font-black text-white sm:text-xs">{deployAnimation.cardName}</p>
            </div>
            <span className={`nexa-deploy-ring absolute left-1/2 ${deployAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'top-[67%] border-cyan-100 text-cyan-300' : 'top-[33%] border-fuchsia-100 text-fuchsia-300'} h-24 w-24 rounded-full border-2`} />
            {Array.from({ length: 18 }, (_, particle) => <span key={particle} className={`nexa-deploy-particle absolute left-1/2 ${deployAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'top-[67%] bg-cyan-100 text-cyan-300' : 'top-[33%] bg-fuchsia-100 text-fuchsia-300'} h-1.5 w-5 rounded-full`} style={{ '--r': `${particle * 20}deg`, '--d': `${105 + (particle % 4) * 24}px` } as React.CSSProperties} />)}
            {deployAnimation.investida && <div className={`nexa-deploy-investida absolute left-1/2 ${deployAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'top-[48%] text-cyan-100' : 'top-[52%] text-fuchsia-100'} z-50 whitespace-nowrap text-2xl font-black tracking-[0.35em] sm:text-4xl`}>INVESTIDA</div>}
          </div>
        )}
        {abilityAnimation && (
          <div
            className={`nexa-ability-language ${
              abilityAnimation.abilityId === 'RUPTURA' || abilityAnimation.abilityId === 'SOBRECARGA'
                ? 'nexa-ability-language--offense'
                : abilityAnimation.abilityId === 'BARREIRA' || abilityAnimation.abilityId === 'ESCUDO' || abilityAnimation.abilityId === 'PROTECAO'
                  ? 'nexa-ability-language--defense'
                  : abilityAnimation.abilityId === 'REPARO' || abilityAnimation.abilityId === 'RECARGA'
                    ? 'nexa-ability-language--support'
                    : 'nexa-ability-language--control'
            }`}
            aria-hidden="true"
          >
            <span className="nexa-ability-language__field" />
            <span className="nexa-ability-language__nodes" />
            <span className="nexa-ability-language__core" />
          </div>
        )}
        {abilityAnimation && (
          <div key={abilityAnimation.token} className="nexa-ability-event pointer-events-none absolute inset-[-8%] z-40 overflow-visible">
            <div className="nexa-ability-veil absolute inset-0 rounded-[2.5rem]" />
            <div className={`nexa-ability-title absolute left-1/2 top-1/2 z-50 whitespace-nowrap text-2xl font-black tracking-[0.38em] sm:text-4xl ${abilityAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'text-cyan-100' : 'text-fuchsia-100'}`}>{abilityAnimation.abilityId}</div>
            {(abilityAnimation.abilityId === 'RUPTURA' || abilityAnimation.abilityId === 'SOBRECARGA') && <>
              <span className="nexa-ability-slash absolute left-1/2 top-1/2 z-40 h-2 w-[62%] bg-gradient-to-r from-transparent via-white to-transparent" />
              <span className="nexa-ability-slash absolute left-1/2 top-1/2 z-40 h-1 w-[48%] rotate-[54deg] bg-gradient-to-r from-transparent via-fuchsia-200 to-transparent [animation-delay:120ms]" />
            </>}
            {abilityAnimation.abilityId === 'BARREIRA' && <span className="nexa-ability-shield absolute left-1/2 top-1/2 z-40 h-56 w-44 border-4 border-cyan-100/90 bg-cyan-300/10" />}
            {abilityAnimation.abilityId === 'MARCA' && <span className="nexa-ability-glyph absolute left-1/2 top-1/2 z-40 text-8xl font-black text-fuchsia-200">◇</span>}
            {abilityAnimation.abilityId === 'REPARO' && <span className="nexa-ability-glyph absolute left-1/2 top-1/2 z-40 text-8xl font-black text-emerald-200">✚</span>}
            {abilityAnimation.abilityId === 'IMPULSO' && <span className="nexa-ability-glyph absolute left-1/2 top-1/2 z-40 text-8xl font-black text-cyan-100">»</span>}
            <span className={`nexa-ability-ring absolute left-1/2 top-1/2 z-30 h-36 w-36 rounded-full border-2 ${abilityAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'border-cyan-100 text-cyan-300' : 'border-fuchsia-100 text-fuchsia-300'}`} />
            <span className={`nexa-ability-ring absolute left-1/2 top-1/2 z-30 h-52 w-52 rounded-full border ${abilityAnimation.actorPlayerId === HUMAN_PLAYER_ID ? 'border-fuchsia-200 text-fuchsia-300' : 'border-cyan-200 text-cyan-300'} [animation-delay:140ms]`} />
            {[0,1,2,3,4,5,6,7,8,9,10,11].map((bolt) => <span key={bolt} className={`nexa-ability-bolt absolute left-1/2 top-1/2 z-30 h-1 w-16 ${bolt % 2 ? 'bg-fuchsia-100 text-fuchsia-300' : 'bg-cyan-100 text-cyan-300'}`} style={{ '--r': `${bolt * 30}deg` } as React.CSSProperties} />)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-[-8%] inset-y-0 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_12%,rgba(217,70,239,0.24),transparent_32%),radial-gradient(ellipse_at_50%_88%,rgba(34,211,238,0.24),transparent_32%),linear-gradient(180deg,rgba(3,7,18,0.94),rgba(5,13,25,0.72),rgba(2,10,18,0.94))]" />
        <div className="pointer-events-none absolute inset-x-8 top-3 -z-10 h-[22%] rounded-[1.5rem] border border-fuchsia-200/10 bg-[linear-gradient(90deg,transparent_4%,rgba(217,70,239,0.08)_4.3%,transparent_4.6%,transparent_28%,rgba(217,70,239,0.06)_28.3%,transparent_28.6%,transparent_70%,rgba(217,70,239,0.06)_70.3%,transparent_70.6%)] shadow-[inset_0_-18px_35px_rgba(217,70,239,0.08)]" />
        <div className="pointer-events-none absolute inset-x-8 bottom-3 -z-10 h-[22%] rounded-[1.5rem] border border-cyan-200/10 bg-[linear-gradient(90deg,transparent_4%,rgba(34,211,238,0.08)_4.3%,transparent_4.6%,transparent_28%,rgba(34,211,238,0.06)_28.3%,transparent_28.6%,transparent_70%,rgba(34,211,238,0.06)_70.3%,transparent_70.6%)] shadow-[inset_0_18px_35px_rgba(34,211,238,0.08)]" />
        <div className="pointer-events-none absolute inset-x-[-14%] top-[18%] bottom-[-2%] -z-10 origin-bottom rotateX-[58deg] skew-x-[-3deg] opacity-45 [background-image:linear-gradient(rgba(103,232,249,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.18)_1px,transparent_1px)] [background-size:42px_32px] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_88%,transparent)]" />
        <div className="pointer-events-none absolute left-1/2 top-[47%] -z-10 h-24 w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-gradient-to-r from-cyan-400/10 via-fuchsia-400/20 to-cyan-400/10 blur-2xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-px w-[92%] -translate-x-1/2 bg-gradient-to-r from-transparent via-fuchsia-300/45 to-transparent shadow-[0_0_20px_rgba(217,70,239,0.8)]" />
        {renderZone('PLAYER_TWO', 'Adversário')}
        <div className={`relative flex items-center justify-center gap-3 py-0.5 text-xs font-black tracking-[0.3em] ${state.arena.activeSlots >= 4 ? 'min-h-[124px]' : state.arena.activeSlots === 3 ? 'min-h-[36px]' : 'min-h-[50px]'} ${targetMode ? 'text-cyan-100' : 'text-fuchsia-200'}`}>
          {state.arena.activeSlots >= 4 && (
            <>
              <div className="pointer-events-none absolute inset-x-[2%] top-1/2 h-[108px] -translate-y-1/2 overflow-hidden rounded-[50%] border-y border-fuchsia-300/10 bg-gradient-to-b from-fuchsia-500/[0.03] via-slate-950/35 to-cyan-400/[0.04] shadow-[inset_0_18px_40px_rgba(217,70,239,0.05),inset_0_-18px_40px_rgba(34,211,238,0.05)]">
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-fuchsia-300/55 to-transparent shadow-[0_0_18px_rgba(217,70,239,0.85)]" />
                <span className="absolute left-[4%] right-[4%] top-1/2 h-[7px] -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-100/90 to-transparent opacity-90 blur-[1px] [clip-path:polygon(0_48%,8%_43%,13%_58%,19%_35%,25%_55%,31%_39%,38%_62%,44%_34%,51%_57%,57%_40%,64%_61%,70%_37%,77%_56%,84%_42%,91%_59%,100%_48%,100%_55%,91%_66%,84%_49%,77%_65%,70%_45%,64%_70%,57%_48%,51%_67%,44%_43%,38%_71%,31%_47%,25%_64%,19%_44%,13%_67%,8%_51%,0_57%)] shadow-[0_0_16px_rgba(103,232,249,0.95)]" />
                <span className="absolute left-[9%] top-[20%] h-[38px] w-[2px] rotate-[62deg] bg-cyan-100/70 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                <span className="absolute right-[14%] top-[12%] h-[42px] w-[2px] -rotate-[58deg] bg-fuchsia-100/65 shadow-[0_0_10px_rgba(244,114,182,0.9)]" />
                <span className="absolute left-1/2 top-[9px] -translate-x-1/2 whitespace-nowrap text-[7px] font-black uppercase tracking-[0.34em] text-fuchsia-200/35">FRONTEIRA DO RIFT</span>
                <span className="absolute left-1/2 bottom-[8px] -translate-x-1/2 whitespace-nowrap text-[7px] font-black uppercase tracking-[0.34em] text-cyan-200/30">ZONA DE CONFRONTO</span>
              </div>
            </>
          )}
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <span className={`h-px flex-1 bg-gradient-to-r from-transparent ${targetMode ? 'via-cyan-300/80' : 'via-fuchsia-400/70'} to-transparent`} />
          <span className={`relative flex h-10 min-w-32 items-center justify-center rounded-[50%] border px-5 shadow-[0_0_28px_rgba(217,70,239,0.35)] motion-safe:animate-pulse ${targetMode ? 'border-cyan-200/70 bg-cyan-400/10' : 'border-fuchsia-300/50 bg-fuchsia-500/10'} before:absolute before:inset-1 before:rounded-[50%] before:border before:border-white/15 before:content-[''] after:absolute after:-inset-x-8 after:top-1/2 after:h-px after:bg-gradient-to-r after:from-transparent after:via-fuchsia-200/50 after:to-transparent after:content-['']`}>◇ RIFT ◇</span>
          <span className="text-center text-[9px] leading-relaxed tracking-[0.18em] text-slate-400">{targetMode ? (selectedAbility === 'IMPULSO' ? 'ALIADO' : 'INIMIGO') : <><span className="block">TURNO {state.turn}</span><span>{state.currentPlayerId === HUMAN_PLAYER_ID ? 'SEU TURNO' : 'ADVERSÁRIO'}</span></>}</span>
          <span className={`h-px flex-1 bg-gradient-to-r from-transparent ${targetMode ? 'via-cyan-300/80' : 'via-fuchsia-400/70'} to-transparent`} />
        </div>
        {renderZone('PLAYER_ONE', 'Você')}
      </main>

      <aside className={`nexa-side-hud hidden min-h-0 flex-col rounded-2xl border border-fuchsia-300/15 bg-slate-950/30 p-3 text-xs backdrop-blur-sm lg:flex ${combatAnimation ? "nexa-side-hud--combat" : ""}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-200">RiftBattle</p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{targetMode ? (selectedAbility === 'IMPULSO' ? 'Selecione um aliado' : 'Selecione um alvo') : `Turno ${state.turn}`}</p>
        {!targetMode && selectedDetails && renderHudCard('Carta selecionada', selectedDetails)}
        <div className={`mt-3 rounded-xl border px-3 py-2 text-[10px] leading-relaxed ${targetMode ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-white/[0.025] text-slate-400'}`}>
          <span className="font-black uppercase tracking-[0.14em] text-slate-500">Próxima ação</span>
          <p className="mt-1">{actionHint}</p>
        </div>
        {targetMode && <div className="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-3 text-center"><p className="text-xs font-black text-cyan-100">SELECIONE UM ALVO</p><p className="mt-1 text-[10px] text-slate-400">Toque em uma carta válida na arena.</p><button type="button" onClick={() => setSelectedAction(undefined)} className="mt-3 w-full rounded-lg border border-white/15 px-2 py-2 text-[10px] font-black text-slate-300">CANCELAR</button></div>}
        {!targetMode && <div className="mt-4 border-t border-white/10 pt-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Energia</p><EnergyPips current={currentPlayer.currentEnergy} max={currentPlayer.maxEnergy} /></div>}
        <div className="mt-auto space-y-2 pt-4">
          {!targetMode && state.currentPlayerId === HUMAN_PLAYER_ID && selectedEntry?.state === 'RESERVE' && <button type="button" onClick={() => perform({ type: 'DEPLOY_CARD', playerId: HUMAN_PLAYER_ID, cardId: selectedEntry.card.id }, 'Carta colocada em campo.')} className="w-full rounded-lg bg-cyan-400 px-2 py-2 text-[10px] font-black text-slate-950">COLOCAR EM CAMPO</button>}
          {!targetMode && canAct && <button type="button" onClick={() => setSelectedAction('ATTACK')} className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-cyan-300/50 px-2 py-2 text-[10px] font-black text-cyan-100"><Swords size={13} /> ATACAR</button>}
          {!targetMode && canAct && availableAbility && ACTIVE_ABILITIES.has(availableAbility) && <button type="button" onClick={() => availableAbility && (needsTarget(availableAbility) ? setSelectedAction('ABILITY') : perform({ type: 'USE_ABILITY', playerId: state.currentPlayerId, cardId: selectedEntry!.card.id, abilityId: availableAbility }, `${availableAbility} utilizada.`))} className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-fuchsia-300/50 px-2 py-2 text-[10px] font-black text-fuchsia-100"><Zap size={13} /> {availableAbility}</button>}
          {state.currentPlayerId === HUMAN_PLAYER_ID ? <button type="button" onClick={() => perform({ type: 'END_TURN', playerId: HUMAN_PLAYER_ID }, 'Turno encerrado.')} className={`w-full rounded-lg border px-2 py-2 text-[10px] font-black transition-colors ${!targetMode && !hasUsefulTurnOption ? 'border-cyan-300/35 bg-cyan-400/[0.06] text-cyan-100' : hasUsefulTurnOption ? 'border-amber-300/35 bg-amber-400/[0.06] text-amber-100' : 'border-white/20 text-slate-100'}`}>{endTurnLabel}</button> : <div className="rounded-lg border border-fuchsia-300/20 px-2 py-2 text-center text-[10px] font-black text-fuchsia-200">ADVERSÁRIO ANALISANDO...</div>}
        </div>
      </aside>
      </div>

      <section className="relative z-30 shrink-0 border-t border-cyan-400/20 bg-[#07101b]/95 px-3 py-1.5 shadow-[0_-12px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:sticky sm:bottom-0 sm:mt-1 sm:rounded-2xl sm:border lg:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <div className="mr-auto min-w-[150px] max-w-[280px]"><p className="text-[10px] uppercase tracking-widest text-slate-500">{targetMode ? 'Aguardando alvo' : selectedEntry ? 'Carta selecionada' : 'Próxima ação'}</p><p className="truncate text-sm font-bold text-slate-100">{targetMode ? 'SELECIONE UM ALVO' : selectedEntry?.card.name ?? 'Selecione uma carta'}</p><p className="mt-0.5 truncate text-[9px] text-slate-500">{actionHint}</p>{state.currentPlayerId === HUMAN_PLAYER_ID && <p className={`mt-0.5 text-[9px] font-black uppercase tracking-wider ${hasUsefulTurnOption ? 'text-amber-200/80' : 'text-cyan-200/70'}`}>{readyActionCount > 0 ? `${readyActionCount} ${readyActionCount === 1 ? 'ação pronta' : 'ações prontas'}` : hasOpenActiveSlot && affordableReserveCount > 0 ? `${affordableReserveCount} deploy disponível` : 'turno pode ser encerrado'}</p>}</div>
          {targetMode && <button type="button" onClick={() => setSelectedAction(undefined)} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-slate-300">CANCELAR</button>}
          {!targetMode && state.currentPlayerId === HUMAN_PLAYER_ID && selectedEntry?.state === 'RESERVE' && <button type="button" onClick={() => perform({ type: 'DEPLOY_CARD', playerId: HUMAN_PLAYER_ID, cardId: selectedEntry.card.id }, 'Carta colocada em campo.')} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950">COLOCAR EM CAMPO</button>}
          {!targetMode && canAct && <button type="button" onClick={() => setSelectedAction('ATTACK')} className="inline-flex items-center gap-1 rounded-xl border border-cyan-300/50 px-3 py-2 text-xs font-black text-cyan-100"><Swords size={14} /> ATACAR</button>}
          {!targetMode && canAct && availableAbility && ACTIVE_ABILITIES.has(availableAbility) && <button type="button" onClick={() => availableAbility && (needsTarget(availableAbility) ? setSelectedAction('ABILITY') : perform({ type: 'USE_ABILITY', playerId: state.currentPlayerId, cardId: selectedEntry.card.id, abilityId: availableAbility }, `${availableAbility} utilizada.`))} className="inline-flex items-center gap-1 rounded-xl border border-fuchsia-300/50 px-3 py-2 text-xs font-black text-fuchsia-100"><Zap size={14} /> {availableAbility}</button>}
          {!targetMode && canAct && availableAbility && PASSIVE_ABILITIES.has(availableAbility) && <span className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Passiva · {availableAbility}</span>}
          {state.currentPlayerId === HUMAN_PLAYER_ID ? <button type="button" onClick={() => perform({ type: 'END_TURN', playerId: HUMAN_PLAYER_ID }, 'Turno encerrado.')} className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${!targetMode && !hasUsefulTurnOption ? 'border-cyan-300/35 bg-cyan-400/[0.06] text-cyan-100' : hasUsefulTurnOption ? 'border-amber-300/35 bg-amber-400/[0.06] text-amber-100' : 'border-white/20 text-slate-100'}`}>{endTurnLabel}</button> : <span className="rounded-xl border border-fuchsia-300/20 px-3 py-2 text-xs font-black text-fuchsia-200">ADVERSÁRIO JOGANDO...</span>}
        </div>
      </section>

      <div className="relative mt-2 flex items-center justify-between">
        <button type="button" aria-expanded={showLog} onClick={() => setShowLog((open) => !open)} className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300"><ScrollText size={14} /> Registro de combate {showLog ? '▲' : '▼'}</button>
        <span className="text-[10px] uppercase tracking-widest text-slate-600">Alpha local · {state.arena.name} · economia isolada</span>
        {showLog && (
          <div className="absolute bottom-8 left-0 z-40 w-[min(380px,calc(100vw-1.5rem))] max-h-[min(260px,40vh)] overflow-y-auto rounded-xl border border-white/15 bg-slate-950/95 p-3 text-xs text-slate-300 shadow-[0_12px_35px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-black uppercase tracking-widest text-cyan-200">Registro de combate</span>
              <button type="button" aria-label="Fechar registro de combate" onClick={() => setShowLog(false)} className="rounded-md border border-white/15 p-1 text-slate-400 hover:border-cyan-300/50 hover:text-cyan-200"><X size={14} /></button>
            </div>
            {logs.length ? logs.map((entry) => <p key={entry.id} className="border-b border-white/5 py-1.5 last:border-0">{entry.text}</p>) : <p className="text-slate-500">Nenhum evento ainda.</p>}
          </div>
        )}
      </div>

      {state.result && showResultCinematic && (
        <div className="nexa-result-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#02030a]/90 p-4 backdrop-blur-md">

          <span className="nexa-result-seal pointer-events-none" aria-hidden="true" />
          <span className="nexa-result-horizon pointer-events-none" aria-hidden="true" />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.18),transparent_24%),radial-gradient(circle_at_center,rgba(217,70,239,.18),transparent_48%)]" />
          <div className="nexa-result-rift pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] rounded-full border-[3px] border-cyan-200/60 shadow-[0_0_45px_rgba(34,211,238,.9),inset_0_0_55px_rgba(217,70,239,.55)] before:absolute before:inset-8 before:rounded-full before:border before:border-fuchsia-300/70 after:absolute after:inset-20 after:rounded-full after:border-2 after:border-white/40" />
          <div className="nexa-result-burst pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 rounded-full border-4 border-white/90 shadow-[0_0_55px_white,0_0_110px_rgba(34,211,238,.8)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2">
            {Array.from({ length: 24 }, (_, shard) => <span key={shard} className="nexa-result-shard absolute left-0 top-0 h-2 w-8 bg-current" style={{ '--r': `${shard * 15}deg`, '--d': `${190 + (shard % 5) * 38}px` } as React.CSSProperties} />)}
          </div>
          <div className="relative z-10 w-full max-w-xl text-center">
            <div className="nexa-result-rift-burst" aria-hidden="true" />
              <p className="nexa-result-title text-[11px] font-black uppercase tracking-[0.55em] text-fuchsia-200">{state.result.winnerId === HUMAN_PLAYER_ID ? 'RIFT CONQUISTADO' : 'CONEXÃO PERDIDA'}</p>
            <h2 className={`nexa-result-title mt-3 text-5xl font-black sm:text-7xl ${state.result.winnerId === HUMAN_PLAYER_ID ? 'text-cyan-100 [text-shadow:0_0_18px_#22d3ee,0_0_50px_#06b6d4]' : 'text-fuchsia-100 [text-shadow:0_0_18px_#d946ef,0_0_50px_#a21caf]'}`}>{state.result.winnerId === HUMAN_PLAYER_ID ? 'VITÓRIA' : 'DERROTA'}</h2>
            <div className="nexa-result-panel mx-auto mt-7 max-w-sm rounded-3xl border border-white/15 bg-[#07111e]/80 p-5 shadow-[0_0_55px_rgba(0,0,0,.7)] backdrop-blur-xl">
              <p className="text-sm text-slate-300">{state.result.winnerId === HUMAN_PLAYER_ID ? 'A formação adversária foi desintegrada.' : 'Sua formação perdeu a conexão com o Rift.'}</p>

              <p className="nexa-result-status">
                {state.result.winnerId === HUMAN_PLAYER_ID ? 'NEXO ESTABILIZADO · ACESSO CONFIRMADO' : 'NEXO INTERROMPIDO · RECALIBRAÇÃO NECESSÁRIA'}
              </p>
              <div className="mt-4 grid gap-2 text-xs text-slate-400"><span>DIFICULDADE <strong className="text-fuchsia-200">{difficulty}</strong></span><span>TURNO {state.result.turn}</span><span>SUAS CARTAS RESTANTES {state.players[HUMAN_PLAYER_ID].cards.filter((entry) => entry.state !== 'DEFEATED').length}</span><span>CARTAS ADVERSÁRIAS RESTANTES {state.players[AI_PLAYER_ID].cards.filter((entry) => entry.state !== 'DEFEATED').length}</span></div>
              <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                <span>DURAÇÃO · {state.turn} TURNOS</span>
                <span>·</span>
                <span>{state.arena.teamSize} CARTAS · {state.arena.activeSlots} ATIVAS</span>
              </div>
              {earnedReward ? (
                <div className="mt-3 rounded-xl border border-cyan-300/25 bg-cyan-400/[0.06] px-3 py-2 text-xs font-black text-cyan-100">
                  +{earnedReward.nex_gained} NEX · +{earnedReward.nxa_gained} NXA · +{earnedReward.xp_gained} XP
                </div>
              ) : (
                <p className="mt-2 text-[9px] uppercase tracking-[0.22em] text-slate-500">{message || 'CONFIRMANDO RECOMPENSA NO SERVIDOR...'}</p>
              )}
              <div className="nexa-result-controls mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={reset} className="rounded-xl bg-cyan-300 px-5 py-3 text-xs font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.35)]">JOGAR NOVAMENTE</button><button type="button" onClick={alterSquad} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black text-slate-300">ALTERAR ESQUADRÃO</button></div>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
};

export default RiftBattleV2;
