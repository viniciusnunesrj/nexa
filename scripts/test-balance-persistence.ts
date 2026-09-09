/**
 * Script de Testes Automatizados para Persistência de Saldo no NEXA
 * Executa exatamente os 6 cenários solicitados pelo usuário.
 */

// 1. Mock LocalStorage environment for Node.js execution
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = String(val); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

(globalThis as any).window = {
  localStorage: mockLocalStorage,
};
(globalThis as any).localStorage = mockLocalStorage;

// Import our services
import { authService, AUTH_USERS_KEY, AUTH_SESSION_KEY } from '../src/services/authService';
import { EconomyService } from '../src/services/economyService';
import { RewardService } from '../src/services/rewardService';
import { MarketplaceService } from '../src/services/marketplaceService';
import { Listing, NexaAsset } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ SUCESSO: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 INICIANDO BATERIA DE TESTES AUTOMATIZADOS (NEXA)');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TESTE 1:
  // Criar novo usuário.
  // Saldo inicial: 1000 NEX.
  // Ganhar partida.
  // Saldo esperado: 1100 NEX.
  // --------------------------------------------------------------------------
  console.log('--- TESTE 1: Criar novo usuário e ganhar partida ---');
  const user1Data = {
    username: 'piloto_alfa',
    email: 'alfa@nexa.game',
    password: 'password123',
    confirmPassword: 'password123',
  };

  const regResult1 = await authService.register(user1Data);
  assert(regResult1.success && !!regResult1.user, 'Usuário 1 cadastrado com sucesso');
  const user1 = regResult1.user!;
  
  assert(user1.balanceNEX === 1000, `Saldo inicial do usuário é 1000 NEX (Atual: ${user1.balanceNEX})`);
  assert(user1.balanceNXA === 100, `Saldo inicial de NXA é 100 NXA (Atual: ${user1.balanceNXA})`);

  // Batalha: Vitória
  const victoryRewards = RewardService.calculateBattleRewards(true, user1.level, user1.id, user1.username);
  assert(victoryRewards.victory === true, 'Batalha calculada como vitória');
  assert(victoryRewards.nexGained === 100, `Recompensa de vitória calculada: +${victoryRewards.nexGained} NEX`);

  // Atualizar saldo persistido através do EconomyService (Single Source of Truth)
  const updatedUser1 = await EconomyService.applyBattleReward(user1.id, {
    nexGained: victoryRewards.nexGained,
    nxaGained: victoryRewards.nxaGained,
    xpGained: victoryRewards.xpGained,
    victory: true,
  });

  assert(updatedUser1.balanceNEX === 1100, `Saldo esperado após vitória é 1100 NEX (Atual: ${updatedUser1.balanceNEX})`);

  // Verificar na base de dados persistida direta
  const user1InDb = EconomyService.getUser(user1.id);
  assert(user1InDb !== null && user1InDb.balanceNEX === 1100, 'Saldo no banco persistente é 1100 NEX');


  // --------------------------------------------------------------------------
  // TESTE 2:
  // Atualizar a página.
  // Saldo deve continuar 1100 NEX.
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 2: Simular atualização da página (Reload) ---');
  // Na atualização de página, o estado React é recriado a partir do storage
  const restoredSessionUser = authService.getCurrentUser();
  assert(restoredSessionUser !== null, 'Sessão restaurada do storage');
  assert(restoredSessionUser!.balanceNEX === 1100, `Saldo após F5/Reload permanece 1100 NEX (Atual: ${restoredSessionUser!.balanceNEX})`);
  
  const freshFromDb = EconomyService.getUser(restoredSessionUser!.id);
  assert(freshFromDb !== null && freshFromDb.balanceNEX === 1100, 'Hydration do EconomyService após Reload mantém 1100 NEX');


  // --------------------------------------------------------------------------
  // TESTE 3:
  // Fazer logout.
  // Fazer login novamente.
  // Saldo deve continuar 1100 NEX.
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 3: Logout e Login novamente ---');
  authService.logout();
  assert(authService.getCurrentUser() === null, 'Sessão limpa após logout');

  const loginResult = await authService.login('piloto_alfa', 'password123');
  assert(loginResult.success && !!loginResult.user, 'Login realizado com sucesso com a senha correta');
  assert(loginResult.user!.balanceNEX === 1100, `Saldo do usuário após novo login continua 1100 NEX (Atual: ${loginResult.user!.balanceNEX})`);


  // --------------------------------------------------------------------------
  // TESTE 4:
  // Criar outro usuário.
  // O segundo usuário não pode receber o saldo do primeiro.
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 4: Criar segundo usuário (Isolamento de Saldo) ---');
  const user2Data = {
    username: 'piloto_beta',
    email: 'beta@nexa.game',
    password: 'password123',
    confirmPassword: 'password123',
  };

  const regResult2 = await authService.register(user2Data);
  assert(regResult2.success && !!regResult2.user, 'Usuário 2 cadastrado com sucesso');
  const user2 = regResult2.user!;

  assert(user2.balanceNEX === 1000, `Usuário 2 começa estritamente com 1000 NEX (Atual: ${user2.balanceNEX})`);
  
  // Re-verificar usuário 1 na base
  const user1Check = EconomyService.getUser(user1.id);
  assert(user1Check !== null && user1Check.balanceNEX === 1100, `Usuário 1 mantém isoladamente seus 1100 NEX (Atual: ${user1Check?.balanceNEX})`);
  assert(user1.id !== user2.id, `Identificadores são estritamente isolados (${user1.id} != ${user2.id})`);


  // --------------------------------------------------------------------------
  // TESTE 5:
  // Jogar novamente.
  // A recompensa deve ser adicionada ao saldo existente, e não substituir o saldo.
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 5: Jogar novamente (Recompensa Aditiva) ---');
  // Usuário 1 joga novamente e ganha (+100 NEX)
  const battle2 = RewardService.calculateBattleRewards(true, user1Check!.level, user1.id, user1.username);
  const user1AfterBattle2 = await EconomyService.applyBattleReward(user1.id, {
    nexGained: battle2.nexGained,
    nxaGained: battle2.nxaGained,
    xpGained: battle2.xpGained,
    victory: true,
  });

  assert(
    user1AfterBattle2.balanceNEX === 1200,
    `Segunda vitória soma ao saldo existente: 1100 + 100 = 1200 NEX (Atual: ${user1AfterBattle2.balanceNEX})`
  );

  // Usuário 1 joga uma terceira partida e é derrotado (+25 NEX consolação)
  const defeatRewards = RewardService.calculateBattleRewards(false, user1AfterBattle2.level, user1.id, user1.username);
  const user1AfterDefeat = await EconomyService.applyBattleReward(user1.id, {
    nexGained: defeatRewards.nexGained,
    nxaGained: defeatRewards.nxaGained,
    xpGained: defeatRewards.xpGained,
    victory: false,
  });

  assert(
    user1AfterDefeat.balanceNEX === 1225,
    `Derrota soma consolação de 25 NEX: 1200 + 25 = 1225 NEX (Atual: ${user1AfterDefeat.balanceNEX})`
  );
  assert(user1AfterDefeat.defeats === 1, `Contador de derrotas incrementado para 1 (Atual: ${user1AfterDefeat.defeats})`);
  assert(user1AfterDefeat.victories === 2, `Contador de vitórias mantido em 2 (Atual: ${user1AfterDefeat.victories})`);


  // --------------------------------------------------------------------------
  // TESTE 6:
  // Verificar que o marketplace continua funcionando normalmente.
  // --------------------------------------------------------------------------
  console.log('\n--- TESTE 6: Marketplace Funcionamento e Débito/Crédito ---');
  // Usuário 1 tem 100 + 10 + 10 = 120 NXA
  const testAsset: NexaAsset = {
    id: 'item-test-market-1',
    name: 'Escudo Quântico Mk-II',
    type: 'Armor',
    rarity: 'Raro',
    level: 2,
    power: 320,
    edition: 'S1',
    ownerId: user2.id,
    ownerName: user2.username,
    createdAt: '2026-03-08',
    description: 'Item de teste de marketplace',
    status: 'LISTED',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  };

  const testListing: Listing = {
    id: 'listing-test-1',
    sellerId: user2.id,
    sellerName: user2.username,
    itemId: testAsset.id,
    price: 40, // 40 NXA
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    itemSnapshot: testAsset,
  };

  // Usuário 1 compra o anúncio do Usuário 2
  const currentBuyer = EconomyService.getUser(user1.id)!;
  const initialBuyerNXA = currentBuyer.balanceNXA;
  const initialSellerNXA = EconomyService.getUser(user2.id)!.balanceNXA;

  const buyResult = MarketplaceService.executeBuy(testListing, currentBuyer);
  assert(buyResult.transferredItem.ownerId === user1.id, 'Posse do item transferida para o comprador (Usuário 1)');

  // Débito do comprador via EconomyService
  const updatedBuyer = EconomyService.removeCurrency(user1.id, 'NXA', testListing.price);
  assert(
    updatedBuyer.balanceNXA === initialBuyerNXA - 40,
    `NXA debitado do comprador: ${initialBuyerNXA} - 40 = ${updatedBuyer.balanceNXA}`
  );

  // Crédito do vendedor via EconomyService
  const updatedSeller = EconomyService.addCurrency(user2.id, 'NXA', buyResult.sellerBalanceGain);
  assert(
    updatedSeller.balanceNXA === Math.round(initialSellerNXA + buyResult.sellerBalanceGain),
    `NXA creditado ao vendedor (com dedução de taxa): ${initialSellerNXA} + ${buyResult.sellerBalanceGain} = ${updatedSeller.balanceNXA}`
  );

  // Saldo NEX do comprador intocado pela transação em NXA
  assert(updatedBuyer.balanceNEX === 1225, `Saldo de NEX permanece intocado (1225 NEX) após compra em NXA`);

  console.log('\n======================================================');
  console.log('🎉 TODOS OS 6 CENÁRIOS FORAM VALIDADOS COM SUCESSO!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Erro fatal ao rodar testes:', err);
  process.exit(1);
});
