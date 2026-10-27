describe('Game Scenarios', () => {
  interface CloudGameRecord {
    id: string;
    name: string;
    status: 'in_progress' | 'finished';
    currentRoundNumber: number;
    settings: { length: number; difficulty: string; playerLabel: string };
    config: {
      numPlayers: number;
      numAi: number;
      numRounds: number;
      advancedPricingEnabled?: boolean;
      advisorEnabled?: boolean;
    };
    players: Record<
      string,
      {
        uid: string;
        playerNumber: number;
        displayName: string;
        isAi: boolean;
        pin: string;
        capital: number;
        currentRound: number;
        submittedRound?: number;
        history: any[];
      }
    >;
  }

  let cloudGames: Record<string, CloudGameRecord> = {};

  const makeInitialParcels = (crop = 'Fallow') =>
    Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop,
        soil: 100,
        nutrition: 100,
        yield: 0,
      }));

  beforeEach(() => {
    cy.viewport(1280, 800);
    cloudGames = {};

    cy.intercept('POST', '**/uploadFinishedGame', {
      statusCode: 200,
      body: { result: { success: true } },
    });

    cy.intercept('POST', '**/saveDecisionDraft', {
      statusCode: 200,
      body: { result: { success: true } },
    });

    cy.intercept('POST', '**/createGame', (req) => {
      const { name, config, settings } = req.body.data;
      const gameId = `cloud-${Date.now()}`;
      const players: CloudGameRecord['players'] = {};
      const numHuman = config.numPlayers - (config.numAi || 0);

      for (let i = 1; i <= config.numPlayers; i++) {
        const isAi = i > numHuman;
        const uid = `player-${gameId}-${i}`;
        const pin = `P${i}PIN`;
        players[uid] = {
          uid,
          playerNumber: i,
          displayName: `${settings?.playerLabel || 'Farmer'} ${i}`,
          isAi,
          pin,
          capital: 100000,
          currentRound: 0,
          history: [
            {
              number: 0,
              parcelsSnapshot: makeInitialParcels('Fallow'),
              decision: { parcels: {}, machines: 0 },
              avgSoil: 100,
              avgNutrition: 100,
            },
          ],
        };
      }

      cloudGames[gameId] = {
        id: gameId,
        name,
        status: 'in_progress',
        currentRoundNumber: 0,
        settings: {
          length: settings?.length || config.numRounds || 10,
          difficulty: settings?.difficulty || 'normal',
          playerLabel: settings?.playerLabel || 'Farmer',
        },
        config,
        players,
      };

      req.reply({
        statusCode: 200,
        body: {
          result: {
            gameId,
            password: 'P1PIN',
          },
        },
      });
    });

    cy.intercept('POST', '**/getAdminGames', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          result: {
            games: Object.values(cloudGames),
            total: Object.keys(cloudGames).length,
          },
        },
      });
    });

    cy.intercept('POST', '**/getGameState', (req) => {
      const { gameId } = req.body.data;
      const game = cloudGames[gameId];
      if (!game) {
        req.reply({ statusCode: 404, body: { error: { message: 'Game not found' } } });
        return;
      }
      const playerValues = Object.values(game.players);
      const activePlayer = playerValues[0];
      const lastRound = activePlayer.history[activePlayer.history.length - 1];

      req.reply({
        statusCode: 200,
        body: {
          result: {
            game,
            playerState: activePlayer,
            lastRound,
          },
        },
      });
    });

    cy.intercept('POST', '**/submitDecision', (req) => {
      const { gameId, decision } = req.body.data;
      const game = cloudGames[gameId];
      if (!game) {
        req.reply({ statusCode: 404, body: { error: { message: 'Game not found' } } });
        return;
      }

      const nextRoundNum = game.currentRoundNumber + 1;
      const isFinished = nextRoundNum >= game.settings.length;
      game.currentRoundNumber = nextRoundNum;
      if (isFinished) {
        game.status = 'finished';
      }

      const nextRound = {
        number: nextRoundNum,
        decision: decision || { parcels: {}, machines: 0 },
        avgSoil: 100,
        avgNutrition: 100,
        result: {
          profit: 1200,
          capital: 100000 + nextRoundNum * 1200,
          harvestSummary: { Wheat: 80 },
          expenses: { seeds: 400, labor: 500, running: 300, investments: 0, total: 1200 },
          income: 2400,
          events: { weather: 'Normal', vermin: [] },
        },
        parcelsSnapshot: makeInitialParcels(decision?.parcels?.[0] || 'Wheat'),
      };

      for (const p of Object.values(game.players)) {
        p.currentRound = nextRoundNum;
        p.capital = 100000 + nextRoundNum * 1200;
        p.history.push(nextRound);
      }

      req.reply({
        statusCode: 200,
        body: {
          result: {
            status: 'calculated',
            nextRound,
          },
        },
      });
    });
  });

  const dismissEventAndWelcomeModals = () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="welcome-close-btn"]').length > 0) {
        cy.get('[data-testid="welcome-close-btn"]').click({ force: true });
      }
      if ($body.find('[data-testid="close-event-modal"]').length > 0) {
        cy.get('[data-testid="close-event-modal"]').click({ force: true });
      }
    });
  };

  const plantSomeCrops = () => {
    dismissEventAndWelcomeModals();
    cy.get('[data-testid="parcel"]').eq(0).trigger('mousedown', { button: 0, force: true });
    cy.get('[data-testid="parcel"]').eq(4).trigger('mouseenter', { force: true });
    cy.get('[data-testid="parcel"]').eq(4).trigger('mouseup', { force: true });
    cy.get('[data-testid="crop-wheat"]').click({ force: true });
  };

  const advanceRound = (isLastRound = false, options?: { fixPrices?: boolean }) => {
    dismissEventAndWelcomeModals();
    cy.get('[data-testid="next-round-button"]', { timeout: 10000 }).should('not.be.disabled').click({ force: true });

    if (options?.fixPrices) {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="price-fixing-Wheat"]').length > 0) {
          cy.get('[data-testid="price-fixing-Wheat"]').click({ force: true });
        }
      });
    }

    cy.get('[data-testid="confirm-round-settings"]', { timeout: 10000 }).should('be.visible').click({ force: true });

    if (isLastRound) {
      cy.contains('Spiel beendet!', { timeout: 20000 }).should('be.visible');
      cy.contains('Ergebnisse ansehen').click({ force: true });
    } else {
      cy.get('[data-testid="close-round-result"]', { timeout: 20000 }).should('be.visible').click({ force: true });
    }
  };

  const openDashboardAndConfigureGame = (config: {
    name: string;
    numPlayers: number;
    numAi: number;
    numRounds: number;
    advancedPricing?: boolean;
  }) => {
    cy.visit('/game-login');
    cy.window().then((win) => {
      win.localStorage.setItem('soil_test_mode', 'true');
      win.localStorage.setItem('soil_test_role', 'admin');
      win.localStorage.setItem('soil_tour_seen', 'true');
      win.localStorage.setItem('soil_tour_disabled', 'true');
    });
    cy.visit('/admin');

    cy.get('[data-testid="game-name-input"]').type(config.name);
    cy.get('[data-testid="player-label-input"]').invoke('val', 'Farmer').trigger('input').trigger('change');
    cy.get('[data-testid="num-players-input"]').invoke('val', config.numPlayers).trigger('change').trigger('input');
    cy.get('[data-testid="num-ai-input"]').invoke('val', config.numAi).trigger('change').trigger('input');
    cy.get('[data-testid="num-rounds-input"]').invoke('val', config.numRounds).trigger('change').trigger('input');

    if (config.advancedPricing) {
      cy.get('[data-testid="advanced-pricing-checkbox"]').check({ force: true });
    }

    cy.get('[data-testid="create-game-submit"]').click();
  };

  it('Scenario 1: Local Game - 1 Human Player, 10 Rounds', () => {
    openDashboardAndConfigureGame({ name: 'Local 1P', numPlayers: 1, numAi: 0, numRounds: 10 });

    cy.url({ timeout: 15000 }).should('include', '/game');

    for (let r = 0; r < 10; r++) {
      cy.contains('[data-testid="round-indicator"]', `Runde ${r}`, { timeout: 20000 }).should('be.visible');
      if (r === 0) plantSomeCrops();
      advanceRound(r === 9);
    }

    cy.get('[data-testid="round-indicator"]').should('be.visible');
  });

  it('Scenario 2: Local Game - 1 Human + 9 AI, 10 Rounds, Market Option', () => {
    openDashboardAndConfigureGame({
      name: 'Local 1H9A',
      numPlayers: 10,
      numAi: 9,
      numRounds: 10,
      advancedPricing: true,
    });

    cy.url({ timeout: 15000 }).should('include', '/game');

    for (let r = 0; r < 10; r++) {
      cy.contains('[data-testid="round-indicator"]', `Runde ${r}`, { timeout: 20000 }).should('be.visible');
      if (r % 2 === 0) plantSomeCrops();
      advanceRound(r === 9, { fixPrices: r % 2 === 0 });
    }

    cy.get('[data-testid="round-indicator"]').should('be.visible');
  });

  it('Scenario 3: Server Game - 2 Human Players, 10 Rounds', () => {
    openDashboardAndConfigureGame({ name: 'Cloud 2P', numPlayers: 2, numAi: 0, numRounds: 10 });

    cy.get('[data-testid="created-game-id"]', { timeout: 10000 })
      .invoke('text')
      .then((rawId) => {
        const gameId = rawId.trim();
        cy.visit(`/game?gameId=${gameId}`, {
          onBeforeLoad: (win) => {
            win.localStorage.setItem('soil_test_mode', 'true');
            win.localStorage.setItem('soil_test_role', 'player');
            win.localStorage.setItem('soil_test_game_id', gameId);
            win.localStorage.setItem('soil_tour_seen', 'true');
          },
        });

        for (let r = 0; r < 10; r++) {
          cy.contains('[data-testid="round-indicator"]', `Runde ${r}`, { timeout: 20000 }).should('be.visible');
          if (r === 0) plantSomeCrops();
          advanceRound(r === 9);
        }

        cy.get('[data-testid="round-indicator"]').should('be.visible');
      });
  });

  it('Scenario 4: Server Game - 5 Human + 5 AI, 10 Rounds', () => {
    openDashboardAndConfigureGame({ name: 'Cloud 5H5A', numPlayers: 10, numAi: 5, numRounds: 10 });

    cy.get('[data-testid="created-game-id"]', { timeout: 10000 })
      .invoke('text')
      .then((rawId) => {
        const gameId = rawId.trim();
        cy.visit(`/game?gameId=${gameId}`, {
          onBeforeLoad: (win) => {
            win.localStorage.setItem('soil_test_mode', 'true');
            win.localStorage.setItem('soil_test_role', 'player');
            win.localStorage.setItem('soil_test_game_id', gameId);
            win.localStorage.setItem('soil_tour_seen', 'true');
          },
        });

        for (let r = 0; r < 10; r++) {
          cy.contains('[data-testid="round-indicator"]', `Runde ${r}`, { timeout: 20000 }).should('be.visible');
          if (r === 0) plantSomeCrops();
          advanceRound(r === 9);
        }

        cy.get('[data-testid="round-indicator"]').should('be.visible');
      });
  });
});
