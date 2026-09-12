// Render the real components with isolated context data; no network or storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let context;
let search = '';
let hovered = null;
function load(path, imports) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  }}).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (!(name in imports)) throw new Error(name);
    return imports[name];
  } });
  return module.exports;
}
const { PriceHistoryChart } = load('src/components/market/PriceHistoryChart.tsx', {
  react: { ...React, useState: () => [hovered, () => {}] },
});
const { HistoryPage } = load('src/pages/History.tsx', {
  react: { ...React, useState: () => [search, () => {}] },
  '../contexts/GameStateContext': { useGameState: () => context },
  '../components/market/PriceHistoryChart': { PriceHistoryChart },
  '../components/common/RarityBadge': { RarityBadge: () => null },
  'lucide-react': new Proxy({}, { get: () => () => null }),
});
const render = () => renderToStaticMarkup(React.createElement(HistoryPage));
for (const stats of [null, undefined, {}, { currentFloorPrice: null, totalVolumeNXA: NaN, priceHistory: {} }]) {
  for (const transactions of [null, undefined, {}, [], [null, 4, {}, { id: {}, itemSnapshot: null, amount: null, fee: NaN }]]) {
    context = { marketStats: stats, transactions };
    search = '';
    assert.match(render(), /Indisponível/);
    search = 'pilot';
    assert.doesNotThrow(render);
  }
}
search = '';
context = { marketStats: { allTimeHigh: 4321, currentFloorPrice: 0, totalVolumeNXA: 123, priceHistory: [] },
  transactions: [{ id: 'tx-123', timestamp: '2026-09-12', itemSnapshot: { name: 'Item' }, buyerName: 'Pilot', sellerName: 'Seller', amount: 20, fee: 0.4 }] };
const html = render();
assert.ok(html.includes((4321).toLocaleString()));
assert.match(html, /0 NXA/);
assert.match(html, /Item/);
assert.doesNotMatch(html, /18\.4%|undefined|NaN/);
for (const data of [null, {}, [], [null, { price: NaN }]]) {
  assert.match(renderToStaticMarkup(React.createElement(PriceHistoryChart, { data })), /Sem dados históricos/);
}
const single = { date: '12/09', price: 100 };
for (const data of [[single], [null, single, { date: '13/09', price: 120, volume: 4 }], [{ date: '12/09', price: Number.MAX_VALUE }]]) {
  hovered = data.includes(single) ? single : null;
  const chart = renderToStaticMarkup(React.createElement(PriceHistoryChart, { data, floorPrice: undefined }));
  assert.doesNotMatch(chart, /NaN|Infinity|18\.4%/);
  assert.match(chart, /Indisponível/);
  if (data.length === 1) assert.match(chart, /cx="415"/);
}
console.log('PASS: History malformed/empty/valid data, search, missing metrics, chart 0/1/multiple points and missing hover volume');
