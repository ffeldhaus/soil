describe('Game Scenarios', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  const plantSomeCrops = () => {
    // Select Parcel 0-4
    cy.get('[data-testid="parcel"]').eq(0).trigger('mousedown', { button: 0 });
    cy.get('[data-testid="parcel"]').eq(4).trigger('mouseenter');
    cy.get('[data-testid="parcel"]').eq(4).trigger('mouseup', { force: true });

    // Select Wheat (or any crop available)
    cy.get('[data-testid="crop-wheat"]').click();
  };

  const advanceRound = (isLastRound = false, options?: { fixPrices?: boolean }) => {
    cy.get('[data-testid="next-round-button"]').click();

    if (options?.fixPrices) {
      // Find price fixing buttons for planted crops (Wheat)
      cy.get('[data-testid="price-fixing-Wheat"]').click();
    }

    cy.get('[data-testid="confirm-round-settings"]').click();

    if (isLastRound) {
      cy.get('.celebration-container', { timeout: 40000 }).should('exist');
      cy.contains('Spiel beendet!').should('be.visible');
      cy.contains('Ergebnisse ansehen').click();
    } else {
      // For server games, if we are waiting for others, the result modal won't appear immediately.
      // The UI shows "Warten auf andere..." on the next round button if submitted.
      // But if we are the LAST one to submit, the result modal pops up.
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="close-round-result"]').length > 0) {
          cy.get('[data-testid="close-round-result"]', { timeout: 20000 }).click();
        } else {
          // We are waiting.
          cy.get('[data-testid="next-round-button"]').should('contain', 'Warten');
        }
      });
    }
  };

  const createGame = (config: {
    name: string;
    numPlayers: number;
    numAi: number;
    numRounds: number;
    advancedPricing?: boolean;
  }) => {
    cy.visit('/admin');

    cy.window().then((win) => {
      win.localStorage.setItem('soil_test_mode', 'true');
      win.localStorage.setItem('soil_test_role', 'admin');
    });
    cy.reload();

    cy.get('[data-testid="game-name-input"]').clear().type(config.name);
    cy.get('[data-testid="player-label-input"]').clear().type('Farmer');
    cy.get('[data-testid="num-players-input"]').invoke('val', config.numPlayers).trigger('change').trigger('input');
    cy.get('[data-testid="num-ai-input"]').invoke('val', config.numAi).trigger('change').trigger('input');
    cy.get('[data-testid="num-rounds-input"]').invoke('val', config.numRounds).trigger('change').trigger('input');

    if (config.advancedPricing) {
      cy.get('[data-testid="advanced-pricing-checkbox"]').check();
    }

    cy.get('[data-testid="create-game-submit"]').click();

    // Get PIN and Game ID
    return cy
      .get('[data-testid="created-game-id"]')
      .invoke('text')
      .then((gameId) => {
        return cy
          .get('[data-testid="created-game-pin"]')
          .invoke('text')
          .then((pin) => {
            return { gameId: gameId.trim(), pin: pin.trim() };
          });
      });
  };

  const joinAndSubmit = (gameId: string, pin: string, isFirstRound: boolean, isLastRound: boolean) => {
    cy.visit(`/game?gameId=${gameId}`);
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="player-login-pin"]').length > 0) {
        cy.get('[data-testid="player-login-pin"]').type(pin);
        cy.get('[data-testid="player-login-submit"]').click();
      }
    });

    if (isFirstRound) plantSomeCrops();
    advanceRound(isLastRound);
  };

  it('Scenario 1: Local Game - 1 Human Player, 10 Rounds', () => {
    createGame({ name: 'Local 1P', numPlayers: 1, numAi: 0, numRounds: 10 }).then(({ gameId, pin }) => {
      cy.visit(`/game?gameId=${gameId}`);
      cy.get('[data-testid="player-login-pin"]').type(pin);
      cy.get('[data-testid="player-login-submit"]').click();

      for (let r = 1; r <= 10; r++) {
        cy.get('[data-testid="round-indicator"]').should('contain', `Runde ${r}`);
        if (r === 1) plantSomeCrops();
        advanceRound(r === 10);
      }

      cy.contains('Zusammenfassung').should('be.visible');
    });
  });

  it('Scenario 2: Local Game - 1 Human + 9 AI, 10 Rounds, Market Option', () => {
    createGame({ name: 'Local 1H9A', numPlayers: 10, numAi: 9, numRounds: 10, advancedPricing: true }).then(
      ({ gameId, pin }) => {
        cy.visit(`/game?gameId=${gameId}`);
        cy.get('[data-testid="player-login-pin"]').type(pin);
        cy.get('[data-testid="player-login-submit"]').click();

        for (let r = 1; r <= 10; r++) {
          cy.get('[data-testid="round-indicator"]').should('contain', `Runde ${r}`);
          if (r === 1) plantSomeCrops();
          advanceRound(r === 10, { fixPrices: r % 2 === 0 });
        }
        cy.contains('Zusammenfassung').should('be.visible');
      },
    );
  });

  it('Scenario 3: Server Game - 2 Human Players, 10 Rounds', () => {
    createGame({ name: 'Cloud 2P', numPlayers: 2, numAi: 0, numRounds: 10 }).then(({ gameId, pin: pin1 }) => {
      // Get PIN for Player 2
      cy.visit('/admin');
      cy.get(`[data-testid="expand-game-${gameId}"]`).click();
      cy.get('[data-testid="player-pin-2"]')
        .invoke('text')
        .then((pin2) => {
          for (let r = 1; r <= 10; r++) {
            // Player 1 turn
            cy.session(`p1-r${r}`, () => joinAndSubmit(gameId, pin1, r === 1, r === 10));
            // Player 2 turn
            cy.session(`p2-r${r}`, () => joinAndSubmit(gameId, pin2, r === 1, r === 10));
          }
          cy.visit(`/game?gameId=${gameId}`);
          cy.get('[data-testid="player-login-pin"]').type(pin1);
          cy.get('[data-testid="player-login-submit"]').click();
          cy.contains('Zusammenfassung').should('be.visible');
        });
    });
  });

  it('Scenario 4: Server Game - 5 Human + 5 AI, 10 Rounds', () => {
    createGame({ name: 'Cloud 5H5A', numPlayers: 10, numAi: 5, numRounds: 10 }).then(({ gameId, pin: pin1 }) => {
      cy.visit('/admin');
      cy.get(`[data-testid="expand-game-${gameId}"]`).click();

      const pins = [pin1];
      cy.get('[data-testid="player-pin-2"]')
        .invoke('text')
        .then((p2) => pins.push(p2));
      cy.get('[data-testid="player-pin-3"]')
        .invoke('text')
        .then((p3) => pins.push(p3));
      cy.get('[data-testid="player-pin-4"]')
        .invoke('text')
        .then((p4) => pins.push(p4));
      cy.get('[data-testid="player-pin-5"]')
        .invoke('text')
        .then((p5) => {
          pins.push(p5);

          for (let r = 1; r <= 10; r++) {
            for (let p = 0; p < 5; p++) {
              cy.session(`p${p + 1}-r${r}`, () => joinAndSubmit(gameId, pins[p], r === 1, r === 10));
            }
          }
          cy.visit(`/game?gameId=${gameId}`);
          cy.get('[data-testid="player-login-pin"]').type(pin1);
          cy.get('[data-testid="player-login-submit"]').click();
          cy.contains('Zusammenfassung').should('be.visible');
        });
    });
  });
});
