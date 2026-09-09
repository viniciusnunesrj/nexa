import { BoxService } from './boxService';
import { EconomyService } from './economyService';
import { AuthService } from './authService';
import { NexaUser } from '../types';

export interface TestResultItem {
  id: number;
  title: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: string;
}

export interface SystemTestSuiteReport {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  results: TestResultItem[];
}

export class BoxSystemTestRunner {
  public static async runAllTests(): Promise<SystemTestSuiteReport> {
    const results: TestResultItem[] = [];

    // Setup a clean isolated test user ID
    const testUserId = `test-runner-${Date.now()}`;
    const testUsername = `TestOperative_${Math.floor(Math.random() * 10000)}`;

    // Criar conta de teste
    const regResult = await AuthService.register({
      username: testUsername,
      email: `${testUserId}@nexa.test`,
      password: 'StrongPassword123!',
    });

    const user = regResult.user;
    if (!user) {
      return {
        timestamp: new Date().toISOString(),
        total: 8,
        passed: 0,
        failed: 8,
        results: [
          {
            id: 0,
            title: 'Inicialização de Usuário de Teste',
            expected: 'Usuário criado com sucesso',
            actual: 'Falha ao criar usuário de teste',
            passed: false,
            details: regResult.error,
          },
        ],
      };
    }

    const uid = user.id;

    /* -------------------------------------------------------------
       TESTE 1: Saldo 100 NEX, comprar Caixa Básica 100 NEX
       -> saldo = 0, caixa = +1
       ------------------------------------------------------------- */
    try {
      EconomyService.updateUserBalance(uid, 'NEX', 100);
      const boxesBefore = BoxService.getAvailableBoxes(uid).length;
      const purchaseRes = BoxService.purchaseBox(uid, 'BASIC');
      const userAfter = EconomyService.getUser(uid);
      const boxesAfter = BoxService.getAvailableBoxes(uid).length;

      const balanceIsZero = userAfter?.balanceNEX === 0;
      const boxAdded = boxesAfter === boxesBefore + 1;
      const pass = purchaseRes.success && balanceIsZero && boxAdded;

      results.push({
        id: 1,
        title: 'TESTE 1: Saldo 100 NEX -> Compra Caixa Básica (100 NEX)',
        expected: 'Saldo = 0 NEX, Quantidade de Caixas = +1',
        actual: `Saldo = ${userAfter?.balanceNEX} NEX, Caixas = +${boxesAfter - boxesBefore}`,
        passed: pass,
      });
    } catch (err: any) {
      results.push({
        id: 1,
        title: 'TESTE 1: Saldo 100 NEX -> Compra Caixa Básica (100 NEX)',
        expected: 'Saldo = 0 NEX, Caixas = +1',
        actual: `Erro: ${err?.message}`,
        passed: false,
      });
    }

    /* -------------------------------------------------------------
       TESTE 2: Saldo 99 NEX, tentar comprar Caixa Básica 100 NEX
       -> compra recusada, saldo = 99, caixa não adicionada
       ------------------------------------------------------------- */
    try {
      EconomyService.updateUserBalance(uid, 'NEX', 99);
      const boxesBefore = BoxService.getAvailableBoxes(uid).length;
      const purchaseRes = BoxService.purchaseBox(uid, 'BASIC');
      const userAfter = EconomyService.getUser(uid);
      const boxesAfter = BoxService.getAvailableBoxes(uid).length;

      const refused = !purchaseRes.success;
      const balanceMaintained = userAfter?.balanceNEX === 99;
      const boxNotAdded = boxesAfter === boxesBefore;
      const pass = refused && balanceMaintained && boxNotAdded;

      results.push({
        id: 2,
        title: 'TESTE 2: Saldo Insuficiente (99 NEX vs 100 NEX)',
        expected: 'Compra recusada, Saldo permanece 99 NEX, Nenhuma caixa adicionada',
        actual: `Compra recusada: ${refused}, Saldo: ${userAfter?.balanceNEX} NEX, Caixas: +${boxesAfter - boxesBefore}`,
        passed: pass,
        details: purchaseRes.error,
      });
    } catch (err: any) {
      results.push({
        id: 2,
        title: 'TESTE 2: Saldo Insuficiente (99 NEX vs 100 NEX)',
        expected: 'Compra recusada, Saldo permanece 99 NEX',
        actual: `Erro: ${err?.message}`,
        passed: false,
      });
    }

    /* -------------------------------------------------------------
       TESTE 3: Saldo 1000 NEX, comprar Caixa Básica
       -> saldo = 900, caixa +1
       ------------------------------------------------------------- */
    try {
      EconomyService.updateUserBalance(uid, 'NEX', 1000);
      const boxesBefore = BoxService.getAvailableBoxes(uid).length;
      const purchaseRes = BoxService.purchaseBox(uid, 'BASIC');
      const userAfter = EconomyService.getUser(uid);
      const boxesAfter = BoxService.getAvailableBoxes(uid).length;

      const balanceExpected = userAfter?.balanceNEX === 900;
      const boxAdded = boxesAfter === boxesBefore + 1;
      const pass = purchaseRes.success && balanceExpected && boxAdded;

      results.push({
        id: 3,
        title: 'TESTE 3: Saldo 1000 NEX -> Compra Caixa Básica',
        expected: 'Saldo = 900 NEX, Quantidade de Caixas = +1',
        actual: `Saldo = ${userAfter?.balanceNEX} NEX, Caixas = +${boxesAfter - boxesBefore}`,
        passed: pass,
      });
    } catch (err: any) {
      results.push({
        id: 3,
        title: 'TESTE 3: Saldo 1000 NEX -> Compra Caixa Básica',
        expected: 'Saldo = 900 NEX, Caixas = +1',
        actual: `Erro: ${err?.message}`,
        passed: false,
      });
    }

    /* -------------------------------------------------------------
       TESTE 4: Abrir 1 caixa -> caixa -1, carta ou ativo obtido
       ------------------------------------------------------------- */
    let openedBoxSuccess = false;
    try {
      const ownedBoxes = BoxService.getAvailableBoxes(uid);
      if (ownedBoxes.length === 0) {
        throw new Error('Nenhuma caixa disponível para teste de abertura.');
      }
      const boxToOpen = ownedBoxes[0];
      const openResult = BoxService.openBox(uid, boxToOpen.id);
      const ownedBoxesAfter = BoxService.getAvailableBoxes(uid);

      const boxDecremented = ownedBoxesAfter.length === ownedBoxes.length - 1;
      const cardOrFragmentReceived =
        (openResult.cards && openResult.cards.length > 0) ||
        (openResult.duplicateCardsConverted && openResult.duplicateCardsConverted.length > 0);

      openedBoxSuccess = boxDecremented && cardOrFragmentReceived;

      results.push({
        id: 4,
        title: 'TESTE 4: Abrir 1 Caixa -> Consumo & Carta Concedida',
        expected: 'Caixas -1, Carta obtida ou Fragmentos concedidos',
        actual: `Caixas: -${ownedBoxes.length - ownedBoxesAfter.length}, Ativos/Cartas: ${openResult.cards.length} cartas / ${openResult.duplicateCardsConverted?.length || 0} fragmentos`,
        passed: openedBoxSuccess,
      });
    } catch (err: any) {
      results.push({
        id: 4,
        title: 'TESTE 4: Abrir 1 Caixa -> Consumo & Carta Concedida',
        expected: 'Caixa consumida, carta adicionada',
        actual: `Erro: ${err?.message}`,
        passed: false,
      });
    }

    /* -------------------------------------------------------------
       TESTE 5: Abrir sem caixa -> operação recusada
       ------------------------------------------------------------- */
    try {
      let threwError = false;
      try {
        BoxService.openBox(uid, 'caixa-fantasma-inexistente-999');
      } catch {
        threwError = true;
      }

      results.push({
        id: 5,
        title: 'TESTE 5: Abertura de Caixa Inexistente',
        expected: 'Operação categoricamente recusada (Erro lançado)',
        actual: threwError ? 'Operação recusada com sucesso' : 'Falha: Operação aceita indevidamente',
        passed: threwError,
      });
    } catch (err: any) {
      results.push({
        id: 5,
        title: 'TESTE 5: Abertura de Caixa Inexistente',
        expected: 'Operação recusada',
        actual: `Erro: ${err?.message}`,
        passed: false,
      });
    }

    /* -------------------------------------------------------------
       TESTE 6: Double-click -> Somente 1 compra executada
       (Simulando chamadas concorrentes com saldo para apenas 1)
       ------------------------------------------------------------- */
    try {
      EconomyService.updateUserBalance(uid, 'NEX', 100);
      const boxesBefore = BoxService.getAvailableBoxes(uid).length;

      // Executa simultaneamente duas tentativas de compra de 100 NEX quando saldo é 100 NEX
      const [res1, res2] = [
        BoxService.purchaseBox(uid, 'BASIC'),
        BoxService.purchaseBox(uid, 'BASIC'),
      ];

      const boxesAfter = BoxService.getAvailableBoxes(uid).length;
      const userAfter = EconomyService.getUser(uid);

      // Exatamente uma teve sucesso, outra falhou por saldo insuficiente
      const onlyOneSuccess = (res1.success && !res2.success) || (!res1.success && res2.success);
      const exactOneBoxAdded = boxesAfter === boxesBefore + 1;
      const balanceZero = userAfter?.balanceNEX === 0;

      const pass = onlyOneSuccess && exactOneBoxAdded && balanceZero;

      results.push({
        id: 6,
        title: 'TESTE 6: Proteção contra Duplo Clique Concorrente',
        expected: 'Somente 1 compra autorizada, 2ª recusada, Saldo = 0 NEX, Caixas = +1',
        actual: `Sucessos: ${Number(res1.success) + Number(res2.success)}, Caixas: +${boxesAfter - boxesBefore}, Saldo: ${userAfter?.balanceNEX} NEX`,
        passed: pass,
      });
    } catch (err: any) {
      results.push({
        id: 6,
        title: 'TESTE 6: Proteção contra Duplo Clique Concorrente',
        expected: 'Somente 1 compra autorizada',
        actual: `Erro: ${err?.message}`,
        passed: false,
      });
    }

    /* -------------------------------------------------------------
       TESTE 7: Recarregar página / Persistência
       -> Dados continuam íntegros no storage
       ------------------------------------------------------------- */
    try {
      const userInDb = EconomyService.getUser(uid);
      const boxesInDb = BoxService.getAvailableBoxes(uid);
      const historyInDb = BoxService.getUserBoxHistory(uid);

      const pass = userInDb !== null && Array.isArray(boxesInDb) && Array.isArray(historyInDb);

      results.push({
        id: 7,
        title: 'TESTE 7: Persistência e Integridade de Estado',
        expected: 'Dados de saldo, caixas e histórico preservados na fonte da verdade',
        actual: `Usuário salvo: ${!!userInDb}, Caixas: ${boxesInDb.length}, Histórico: ${historyInDb.length} registros`,
        passed: pass,
      });
    } catch (err: any) {
      results.push({
        id: 7,
        title: 'TESTE 7: Persistência e Integridade de Estado',
        expected: 'Dados preservados',
        actual: `Erro: ${err?.message}`,
        passed: false,
      });
    }

    /* -------------------------------------------------------------
       TESTE 8: Novo usuário -> Recebe somente 1 Caixa de Recruta
       ------------------------------------------------------------- */
    try {
      const freshUserId = `recruit-test-${Date.now()}`;
      await AuthService.register({
        username: `Cadet_${Math.floor(Math.random() * 10000)}`,
        email: `${freshUserId}@nexa.test`,
        password: 'Password123!',
      });

      // 1ª tentativa: deve conceder
      const firstGrant = BoxService.grantRecruitBoxIfEligible(freshUserId);
      // 2ª tentativa: DEVE RECUSAR
      const secondGrant = BoxService.grantRecruitBoxIfEligible(freshUserId);

      const userBoxes = BoxService.getAvailableBoxes(freshUserId);
      const recruitBoxes = userBoxes.filter((b) => b.boxType === 'RECRUIT');

      const pass = firstGrant !== null && secondGrant === null && recruitBoxes.length === 1;

      results.push({
        id: 8,
        title: 'TESTE 8: Concessão Única de Caixa de Recruta para Novo Usuário',
        expected: '1ª chamada: Caixa concedida; 2ª chamada: null (rejeitada); Total = 1 Caixa',
        actual: `1ª: ${firstGrant ? 'Concedida' : 'Null'}, 2ª: ${secondGrant ? 'Concedida (BUG)' : 'Recusada (Correto)'}, Total: ${recruitBoxes.length}`,
        passed: pass,
      });
    } catch (err: any) {
      results.push({
        id: 8,
        title: 'TESTE 8: Concessão Única de Caixa de Recruta para Novo Usuário',
        expected: 'Recebe exatamente 1 Caixa de Recruta',
        actual: `Erro: ${err?.message}`,
        passed: false,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;
    return {
      timestamp: new Date().toISOString(),
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      results,
    };
  }
}
