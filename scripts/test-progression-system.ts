/**
 * Script de Testes Automatizados para o Sistema de Level e Progressão do NEXA
 * Valida rigorosamente todos os 9 cenários exigidos na especificação.
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
import { authService, AUTH_USERS_KEY } from '../src/services/authService';
import { ProgressionService } from '../src/services/progressionService';
import { EconomyService } from '../src/services/economyService';
import { BoxService } from '../src/services/boxService';
import { MarketplaceService } from '../src/services/marketplaceService';
import { LEVEL_CONFIG, LEVEL_REWARDS, getUnlockedSlotsForLevel, getXpRequiredForLevel } from '../src/config/levelConfig';
import { NexaAsset, Card } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ SUCESSO: ${message}`);
  }
}

async function runProgressionTests() {
  console.log('\n==================================================================');
  console.log('⭐ INICIANDO BATERIA DE TESTES DO SISTEMA DE LEVEL & PROGRESSÃO');
  console.log('==================================================================\n');

  // --------------------------------------------------------------------------
  // CENÁRIO 1: Criar novo jogador
  // Level = 1, XP = 0, 1 personagem inicial, 1 Caixa de Recruta
  // --------------------------------------------------------------------------
  console.log('--- CENÁRIO 1: Criação de Nova Conta de Piloto ---');
  const regResult = await authService.register({
    username: 'piloto_novato',
    email: 'novato@nexa.game',
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert(regResult.success && !!regResult.user, 'Conta criada com sucesso');
  let user = regResult.user!;

  assert(user.level === 1, `Level inicial é 1 (Atual: ${user.level})`);
  assert(user.experience === 0, `XP inicial é 0 (Atual: ${user.experience})`);
  assert(user.unlockedSlots === 3, `Slots iniciais de síntese = 3 (Atual: ${user.unlockedSlots})`);
  assert(user.maxExperience === LEVEL_CONFIG[1].xpRequired, `maxExperience corresponde à config de Nv 1 (${user.maxExperience})`);

  // Helper para carregar ativos do storage
  const getStoredAssets = (userId: string): NexaAsset[] => {
    try {
      const raw = mockLocalStorage.getItem('nexa_assets_v1');
      const all: NexaAsset[] = raw ? JSON.parse(raw) : [];
      return all.filter((a) => a.ownerId === userId);
    } catch {
      return [];
    }
  };

  // Verificar inventário de itens e caixas
  const userAssets = getStoredAssets(user.id);
  const characters = userAssets.filter((a) => a.type === 'Character');
  assert(characters.length >= 1, `Recebeu ao menos 1 personagem inicial (Total: ${characters.length})`);

  const userBoxes = BoxService.getAvailableBoxes(user.id);
  const recruitBoxes = userBoxes.filter((b) => b.boxType === 'RECRUIT');
  assert(recruitBoxes.length >= 1, `Recebeu 1 Caixa de Recruta (Total: ${recruitBoxes.length})`);

  // --------------------------------------------------------------------------
  // CENÁRIO 2: Ganhar XP suficiente para level 2
  // Subir de nível, receber Caixa Comum, slots continuam 3
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO 2: Subir para o Nível 2 e Coletar Recompensa ---');
  const xpNeededForLvl2 = LEVEL_CONFIG[1].xpRequired; // 250 XP
  console.log(`Adicionando ${xpNeededForLvl2} XP ao usuário...`);
  
  const resultLvl2 = ProgressionService.addExperience(user.id, xpNeededForLvl2);
  assert(resultLvl2.leveledUp, 'Detectou level-up com sucesso');
  assert(resultLvl2.newLevel === 2, `Novo nível é 2 (Atual: ${resultLvl2.newLevel})`);
  assert(resultLvl2.unlockedSlots === 3, `Slots de síntese no nível 2 permanecem 3 (Atual: ${resultLvl2.unlockedSlots})`);
  
  // Verificar se a recompensa (Caixa Comum) foi concedida
  const commonBoxRewards = resultLvl2.rewardsGranted.filter((r) => r.type === 'BOX' && r.boxType === 'BASIC');
  assert(commonBoxRewards.length === 1, 'Recompensa do Nível 2 concedida: Caixa Comum');

  const updatedBoxesLvl2 = BoxService.getAvailableBoxes(user.id);
  const commonBoxes = updatedBoxesLvl2.filter((b) => b.boxType === 'BASIC');
  assert(commonBoxes.length === 1, 'Caixa Comum está presente no inventário de caixas do jogador');

  // Atualizar referência do usuário
  user = ProgressionService.getUser(user.id)!;
  assert(user.level === 2, 'Usuário persistido está no nível 2');
  assert(user.levelRewardsClaimed?.includes(2), 'Registro de recompensa do nível 2 está marcado como coletado');

  // --------------------------------------------------------------------------
  // CENÁRIO 3: Subir para level 5
  // Receber Caixa Rara
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO 3: Subir para o Nível 5 e Receber Caixa Rara ---');
  // Precisamos atingir o nível 5: dar XP necessária
  const xpToReachLvl5 = LEVEL_CONFIG[2].xpRequired + LEVEL_CONFIG[3].xpRequired + LEVEL_CONFIG[4].xpRequired;
  console.log(`Adicionando ${xpToReachLvl5} XP para alcançar Nível 5...`);

  const resultLvl5 = ProgressionService.addExperience(user.id, xpToReachLvl5);
  assert(resultLvl5.leveledUp, 'Subiu de nível');
  assert(resultLvl5.newLevel === 5, `Alcançou Nível 5 (Atual: ${resultLvl5.newLevel})`);

  const rareBoxRewards = resultLvl5.rewardsGranted.filter((r) => r.type === 'BOX' && r.boxType === 'ADVANCED');
  assert(rareBoxRewards.length === 1, 'Recompensa do Nível 5 concedida: Caixa Rara');

  const updatedBoxesLvl5 = BoxService.getAvailableBoxes(user.id);
  const rareBoxes = updatedBoxesLvl5.filter((b) => b.boxType === 'ADVANCED');
  assert(rareBoxes.length === 1, 'Caixa Rara está no inventário de caixas');

  user = ProgressionService.getUser(user.id)!;
  assert(user.levelRewardsClaimed?.includes(5), 'Recompensa do nível 5 registrada como coletada');

  // --------------------------------------------------------------------------
  // CENÁRIO 4: Subir para level 10
  // Receber Personagem Raro + 100 NEX, desbloqueio de coleções, slots aumentam para 4
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO 4: Subir para o Nível 10 (Marco Épico) ---');
  let xpToReachLvl10 = 0;
  for (let l = 5; l < 10; l++) {
    xpToReachLvl10 += LEVEL_CONFIG[l].xpRequired;
  }
  const balanceBeforeLvl10 = user.balanceNEX;
  console.log(`Adicionando ${xpToReachLvl10} XP para alcançar Nível 10...`);

  const resultLvl10 = ProgressionService.addExperience(user.id, xpToReachLvl10);
  assert(resultLvl10.newLevel === 10, `Alcançou Nível 10 (Atual: ${resultLvl10.newLevel})`);
  assert(resultLvl10.unlockedSlots === 4, `Slots de síntese aumentaram para 4 (Atual: ${resultLvl10.unlockedSlots})`);
  assert(resultLvl10.newSlotsUnlocked, 'Notificação de novo slot desbloqueado está ativa');

  user = ProgressionService.getUser(user.id)!;
  assert(user.unlockedSlots === 4, `Slots persistidos no usuário = 4 (Atual: ${user.unlockedSlots})`);
  // Recompensas acumuladas nos níveis 7 (+100), 9 (+150) e 10 (+100) = +350 NEX
  assert(user.balanceNEX === balanceBeforeLvl10 + 350, `Saldo NEX aumentou corretamente com os níveis 7, 9 e 10 (Antes: ${balanceBeforeLvl10}, Atual: ${user.balanceNEX})`);

  // Verificar se o Personagem Raro foi adicionado
  const assetsAfterLvl10 = getStoredAssets(user.id);
  const rareChars = assetsAfterLvl10.filter((a) => a.type === 'Character' && a.rarity === 'Raro');
  assert(rareChars.length >= 1, `Personagem Raro adicionado ao inventário (Total: ${rareChars.length})`);

  // --------------------------------------------------------------------------
  // CENÁRIO 5: Tentar receber recompensa do level 10 novamente
  // Deve ser bloqueado
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO 5: Tentar Coletar Recompensa do Nível 10 Novamente ---');
  const doubleClaimResult = ProgressionService.claimLevelReward(user.id, 10);
  assert(!doubleClaimResult.success, `Tentativa de duplicidade bloqueada com sucesso (${doubleClaimResult.message})`);

  // --------------------------------------------------------------------------
  // CENÁRIO 6: Ganhar XP suficiente para subir múltiplos níveis de uma vez
  // Ex: Nível 10 pulando para Nível 16
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO 6: Salto de Múltiplos Níveis (Multi-Level Jump) ---');
  let multiXp = 0;
  for (let l = 10; l < 16; l++) {
    multiXp += LEVEL_CONFIG[l].xpRequired;
  }
  // Adicionar um pouco mais de XP de folga
  multiXp += 150;
  console.log(`Adicionando ${multiXp} XP para pular do Nível 10 até o Nível 16...`);

  const multiResult = ProgressionService.addExperience(user.id, multiXp);
  assert(multiResult.newLevel === 16, `Subiu do nível 10 para 16 (Atual: ${multiResult.newLevel})`);
  assert(multiResult.levelsGained.length === 6, `Passou por 6 níveis: ${multiResult.levelsGained.join(', ')}`);

  // Verificar se a recompensa do nível 15 (Caixa Épica) foi processada
  const epicBoxRewards = multiResult.rewardsGranted.filter((r) => r.level === 15);
  assert(epicBoxRewards.length === 1, 'Recompensa intermediária do Nível 15 (Caixa Épica) foi processada corretamente');

  user = ProgressionService.getUser(user.id)!;
  assert(user.levelRewardsClaimed?.includes(15), 'Nível 15 marcado como coletado');

  // --------------------------------------------------------------------------
  // CENÁRIO 7: Limite de Slots de Síntese
  // Nível 16 -> 4 slots
  // Testar getUnlockedSlots e controle
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO 7: Verificação do Limite de Slots por Nível ---');
  assert(ProgressionService.getUnlockedSlots(1) === 3, 'Nível 1 tem 3 slots');
  assert(ProgressionService.getUnlockedSlots(9) === 3, 'Nível 9 tem 3 slots');
  assert(ProgressionService.getUnlockedSlots(10) === 4, 'Nível 10 tem 4 slots');
  assert(ProgressionService.getUnlockedSlots(19) === 4, 'Nível 19 tem 4 slots');
  assert(ProgressionService.getUnlockedSlots(20) === 5, 'Nível 20 tem 5 slots');
  assert(ProgressionService.getUnlockedSlots(29) === 5, 'Nível 29 tem 5 slots');
  assert(ProgressionService.getUnlockedSlots(30) === 6, 'Nível 30 tem 6 slots');
  assert(ProgressionService.getUnlockedSlots(50) === 6, 'Nível 50 tem 6 slots');

  const currentMaxSlots = ProgressionService.getUnlockedSlots(user.level);
  assert(currentMaxSlots === 4, `No nível 16 o limite é 4 slots (Atual: ${currentMaxSlots})`);

  // --------------------------------------------------------------------------
  // CENÁRIO 8: Persistência / Recarregamento de Dados
  // Ler direto do mock storage e re-inicializar
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO 8: Teste de Persistência no LocalStorage ---');
  const storedUsersRaw = mockLocalStorage.getItem(AUTH_USERS_KEY);
  assert(!!storedUsersRaw, 'Dados de usuários encontrados no localStorage');
  const parsedUsers = JSON.parse(storedUsersRaw);
  const persistedUser = parsedUsers.find((u: any) => u.id === user.id);

  assert(persistedUser.level === 16, `Nível persistido é 16 (Atual: ${persistedUser.level})`);
  assert(persistedUser.unlockedSlots === 4, `Slots persistidos é 4 (Atual: ${persistedUser.unlockedSlots})`);
  assert(Array.isArray(persistedUser.levelRewardsClaimed), 'levelRewardsClaimed é um array persistido');
  assert(persistedUser.levelRewardsClaimed.includes(2), 'Contém recompensa Nv 2');
  assert(persistedUser.levelRewardsClaimed.includes(5), 'Contém recompensa Nv 5');
  assert(persistedUser.levelRewardsClaimed.includes(10), 'Contém recompensa Nv 10');
  assert(persistedUser.levelRewardsClaimed.includes(15), 'Contém recompensa Nv 15');

  const history = ProgressionService.getLevelHistory(user.id);
  assert(history.length > 0, `Histórico de level-up gravado com sucesso (${history.length} registros)`);

  // --------------------------------------------------------------------------
  // CENÁRIO 9: Marketplace e Caixas Continuam Funcionando
  // Não quebrar nenhuma funcionalidade existente
  // --------------------------------------------------------------------------
  console.log('\n--- CENÁRIO 9: Marketplace e Caixas intactos ---');
  // Obter um item do usuário para listar no marketplace
  const userItems = getStoredAssets(user.id);
  const itemToList = userItems[0];
  assert(!!itemToList, 'Usuário possui item para transacionar no Marketplace');

  // Criar listagem
  const listing = MarketplaceService.createListing(itemToList, 20, user);
  assert(listing.status === 'ACTIVE', 'Listagem criada com sucesso no Marketplace');
  assert(listing.price === 20, 'Preço de listagem registrado corretamente');

  // Abrir uma caixa comum do usuário
  const userBoxesNow = BoxService.getAvailableBoxes(user.id);
  const boxToOpen = userBoxesNow.find((b) => b.boxType === 'BASIC');
  assert(!!boxToOpen, 'Usuário possui caixa comum para abrir');

  const openResult = BoxService.openBox(user.id, boxToOpen!.id);
  assert(
    (openResult.cards && openResult.cards.length > 0) ||
    (openResult.duplicateCardsConverted && openResult.duplicateCardsConverted.length > 0),
    'Caixa aberta com sucesso, gerou nova carta ou conversão em fragmentos'
  );

  console.log('\n==================================================================');
  console.log('🎉 TODOS OS 9 CENÁRIOS FORAM VALIDADOS COM SUCESSO ABSOLUTO!');
  console.log('==================================================================\n');
}

runProgressionTests().catch((err) => {
  console.error('Erro durante execução dos testes:', err);
  process.exit(1);
});
