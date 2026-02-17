describe('Advisor and Tour E2E', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);

    // Clear localStorage to ensure tour shows
    cy.window().then((win) => {
      win.localStorage.clear();
      win.localStorage.setItem('soil_test_mode', 'true');
    });

    cy.intercept('POST', '**/getGameState', {
      body: {
        result: {
          game: {
            id: 'test-game-id',
            status: 'in_progress',
            currentRoundNumber: 1,
            settings: { length: 10, difficulty: 'normal' },
            config: { advisorEnabled: true },
            players: {
              'player-test-game-id-1': { displayName: 'Test User', capital: 100000 },
            },
          },
          playerState: {
            uid: 'player-test-game-id-1',
            displayName: 'Test User',
            capital: 100000,
            currentRound: 1,
            history: [
              {
                number: 0,
                parcelsSnapshot: Array(40)
                  .fill(null)
                  .map((_, i) => ({ index: i, crop: 'Fallow', soil: 100, nutrition: 100 })),
                decision: { parcels: {}, machines: 0 },
              },
              {
                number: 1,
                parcelsSnapshot: Array(40)
                  .fill(null)
                  .map((_, i) => ({ index: i, crop: 'Wheat', soil: 90, nutrition: 90 })),
                decision: { parcels: {}, machines: 0 },
                result: {
                  profit: -3000,
                  capital: 97000,
                  harvestSummary: { Wheat: 10 },
                  expenses: { total: 5000 },
                  income: 2000,
                  events: { weather: 'Normal', vermin: [] },
                },
              },
            ],
          },
          lastRound: {
            number: 1,
            parcelsSnapshot: Array(40)
              .fill(null)
              .map((_, i) => ({ index: i, crop: 'Wheat', soil: 90, nutrition: 90 })),
          },
        },
      },
    }).as('getGameState');
  });

  it('should show guided tour on first visit and allow skipping', () => {
    cy.visit('/game?gameId=test-game-id');
    cy.wait('@getGameState');

    // Tour should be visible
    cy.get('.shepherd-element').should('be.visible');
    cy.contains('Willkommen bei SOIL!').should('be.visible');

    // Click "Überspringen"
    cy.contains('Überspringen').click();
    cy.get('.shepherd-element').should('not.exist');

    // Reload - tour should NOT show again
    cy.reload();
    cy.wait('@getGameState');
    cy.get('.shepherd-element').should('not.exist');
  });

  it('should allow manual re-triggering of the tour', () => {
    // Mark as seen first
    cy.window().then((win) => {
      win.localStorage.setItem('soil_tour_seen', 'true');
    });

    cy.visit('/game?gameId=test-game-id');
    cy.wait('@getGameState');
    cy.get('.shepherd-element').should('not.exist');

    // Click help icon in HUD
    cy.get('button[title="Geführte Tour starten"]').click();
    cy.get('.shepherd-element').should('be.visible');
    cy.contains('Willkommen bei SOIL!').should('be.visible');

    // Close tour
    cy.get('.shepherd-cancel-icon').click();
    cy.get('.shepherd-element').should('not.exist');
  });

  it('should show advisor in Round Result Modal', () => {
    cy.visit('/game?gameId=test-game-id');
    cy.wait('@getGameState');

    // Manually trigger result modal by clicking round indicator (since we are at round 1)
    // Actually, in the real app it shows after submission. Here we mock history.
    // Let's mock a transition to see it.

    // For this test, we can just check if the advisor is rendered in the settings modal
    cy.get('[data-testid="next-round-button"]').click();
    cy.get('app-game-advisor').should('be.visible');
    cy.contains('Landwirtschaftlicher Berater').should('be.visible');

    // Check for specific insights based on our mock data (profit -3000 -> Hoher Verlust)
    cy.contains('Hoher Verlust').should('be.visible');
    cy.contains('Bodenqualität sinkt').should('be.visible');
  });

  it('should respect advisorEnabled config', () => {
    // Change intercept to disabled advisor
    cy.intercept('POST', '**/getGameState', {
      body: {
        result: {
          game: {
            id: 'test-game-id',
            status: 'in_progress',
            currentRoundNumber: 1,
            config: { advisorEnabled: false },
            settings: { length: 10, difficulty: 'normal' },
            players: { 'player-test-game-id-1': { displayName: 'Test User', capital: 100000 } },
          },
          playerState: {
            uid: 'player-test-game-id-1',
            history: [{ number: 1, result: { profit: -3000 }, parcelsSnapshot: [] }],
          },
          lastRound: { number: 1, parcelsSnapshot: [] },
        },
      },
    }).as('getGameStateDisabled');

    cy.visit('/game?gameId=test-game-id');
    cy.wait('@getGameStateDisabled');

    cy.get('[data-testid="next-round-button"]').click();
    cy.get('app-game-advisor').should('not.exist');
  });
});
