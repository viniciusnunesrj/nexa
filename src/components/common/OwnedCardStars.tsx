import React from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { ownedCardStarLevel } from '../../utils/ownedCardStars';
import { CardStars } from './CardStars';

export function OwnedCardStars({ instanceId, templateId }: { instanceId?: string; templateId?: string }) {
  const { cards } = useGameState();
  return <CardStars level={ownedCardStarLevel(cards, instanceId, templateId)} />;
}
