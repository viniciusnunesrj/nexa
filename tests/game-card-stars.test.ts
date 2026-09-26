import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardStars } from '../src/components/common/CardStars';
import { ownedCardStarLevel } from '../src/utils/ownedCardStars';

test('games render the owned ascension from one through five stars', () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    const cards = [{ id: 'owned', templateId: 'template', starLevel: level }];
    for (const stars of [ownedCardStarLevel(cards, 'owned'), ownedCardStarLevel(cards, undefined, 'template')]) {
      const html = renderToStaticMarkup(React.createElement(CardStars, { level: stars }));
      assert.equal(html.match(/★/g)?.length, level);
      assert.ok(html.includes(`Ascensão ${level} de 5 estrelas`));
    }
  }
});

test('instance identity, legacy defaults and current inventory are preserved', () => {
  const cards = [{ id: 'a', templateId: 'same', starLevel: 2 as const }, { id: 'b', templateId: 'same', starLevel: 5 as const }];
  const before = JSON.stringify(cards);
  assert.equal(ownedCardStarLevel(cards, 'a', 'same'), 2);
  assert.equal(ownedCardStarLevel(cards, 'b', 'same'), 5);
  assert.equal(ownedCardStarLevel(cards, 'missing', 'same'), 1);
  assert.equal(ownedCardStarLevel(cards, undefined, 'same'), 5);
  assert.equal(ownedCardStarLevel([{ id: 'old', templateId: 'old' }], 'old'), 1);
  assert.equal(ownedCardStarLevel([], undefined, 'starter'), 1);
  assert.equal(ownedCardStarLevel([{ ...cards[0], starLevel: 4 }], 'a'), 4);
  assert.equal(JSON.stringify(cards), before);
});
