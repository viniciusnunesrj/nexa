import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Shield, Coins, Flame, Info, CheckCircle2 } from 'lucide-react';
import { BoxType } from '../../types';
import { BOX_DEFINITIONS, BOX_CONFIG, PITY_CONFIG } from '../../config/boxRates';
import { getTemplatesByCollection } from '../../config/collectionsData';
import { RARITY_CONFIG } from '../../config/designTokens';
import { RarityBadge } from '../common/RarityBadge';

interface BoxRewardsModalProps {
  boxType: BoxType;
  isOpen: boolean;
  onClose: () => void;
}

export const BoxRewardsModal: React.FC<BoxRewardsModalProps> = ({ boxType, isOpen, onClose }) => {
  if (!isOpen) return null;

  const def = BOX_DEFINITIONS[boxType];
  const config = BOX_CONFIG[boxType];
  const dropRates = config?.rates || {
    Comum: 0,
    Incomum: 0,
    Raro: 0,
    Épico: 0,
    Lendário: 0,
    Mítico: 0,
  };

  // Check if it's tied to a collection
  let collectionId: string | null = null;
  if (boxType === 'GUARDIANS') collectionId = 'guardians';
  else if (boxType === 'COLLECTION_DRAGONS') collectionId = 'dragons';
  else if (boxType === 'COLLECTION_KNIGHTS') collectionId = 'knights';
  else if (boxType === 'COLLECTION_ABYSS') collectionId = 'abyss';
  else if (boxType === 'COLLECTION_MAGES') collectionId = 'mages';
  else if (boxType === 'COLLECTION_GODS') collectionId = 'gods';
  else if (boxType === 'COLLECTION_COSMIC') collectionId = 'cosmic';
  else if (boxType === 'COLLECTION_HUNTERS') collectionId = 'hunters';

  const collectionCards = collectionId ? getTemplatesByCollection(collectionId) : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-[#0e0e18] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg"
                style={{
                  backgroundColor: `${def.accentColor}15`,
                  borderColor: `${def.accentColor}40`,
                }}
              >
                <Sparkles className="w-6 h-6" style={{ color: def.accentColor }} />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                  Tabela Oficial de Probabilidades
                </span>
                <h2 className="text-2xl font-black text-white font-heading">{def.name}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description & Guarantees */}
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">{def.description}</p>
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-3">
              <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-cyan-200 block uppercase font-mono">Garantias da Caixa:</span>
                <span className="text-slate-300">{def.guarantees}</span>
              </div>
            </div>
          </div>

          {/* Detailed Content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-2">
            {/* Rarity Rates */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase pb-1">
                <span>Raridade do Drop</span>
                <span>Probabilidade</span>
              </div>
              {(['Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'] as const).map((rarity) => {
                const rate = dropRates[rarity] || 0;
                const percentage = (rate * 100).toFixed(rate < 0.01 && rate > 0 ? 3 : 1);
                const rarityStyle = RARITY_CONFIG[rarity];

                return (
                  <div
                    key={rarity}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      rate > 0
                        ? 'bg-[#141424] border-white/10 hover:border-white/20'
                        : 'bg-black/30 border-white/5 opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: rarityStyle?.color || '#94a3b8' }}
                      />
                      <span className="font-bold text-sm text-white">{rarity}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span
                        className="text-base font-black"
                        style={{ color: rate > 0 ? rarityStyle?.color || '#fff' : '#64748b' }}
                      >
                        {rate > 0 ? `${percentage}%` : '0%'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* If Collection Box: show specific card catalog */}
            {collectionCards.length > 0 && (
              <div className="mt-6 space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-400 uppercase">
                  <span>Cartas Exclusivas desta Caixa ({collectionCards.length})</span>
                  <span>Raridade / Geração</span>
                </div>
                {collectionCards.map((card) => (
                  <div
                    key={card.templateId}
                    className="p-3 rounded-2xl bg-[#141424] border border-white/10 flex items-center justify-between gap-4 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-12 h-16 object-cover rounded-xl border border-white/10"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{card.elementIcon}</span>
                          <span className="font-bold text-white text-sm">{card.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <RarityBadge rarity={card.rarity} size="xs" />
                          <span className="text-[11px] text-cyan-300 font-mono">
                            +{card.synthesisRate} NEX/h
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-300 block">{card.element}</span>
                      <span className="text-[10px] text-slate-500 block">Cap: {card.synthesisCap} NEX</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pity guarantee note for Premium */}
            {boxType === 'PREMIUM' && (
              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                <span className="font-bold block uppercase font-mono mb-1">Regra de Pity Ativa:</span>
                A cada 5 caixas Premium abertas sem obter item Épico, Lendário ou Mítico, a 5ª caixa garante
                100% de probabilidade de obter item Épico ou superior.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm hover:brightness-110 shadow-lg"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
