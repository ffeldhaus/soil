describe('SOIL Game E2E', () => {
  beforeEach(() => {
    // Set viewport to desktop size to ensure UI elements are visible
    cy.viewport(1280, 800);

    // Mock backend response for submitDecision
    cy.intercept('POST', '**/submitDecision', {
      body: {
        result: {
          status: 'calculated',
          nextRound: {
            number: 2,
            decision: { parcels: {}, machines: 0 },
            result: {
              profit: 100,
              capital: 1100,
              harvestSummary: {},
              expenses: { seeds: 10, labor: 0, running: 10, investments: 0, total: 20 },
              income: 120,
              events: { weather: 'Normal', vermin: 'None' },
            },
            parcelsSnapshot: Array(40)
              .fill(null)
              .map((_, i) => ({
                index: i,
                crop: i === 0 ? 'Wheat' : 'Fallow',
                soil: 80,
                nutrition: 80,
                yield: 0,
              })),
          },
        },
      },
    }).as('nextRound');

    cy.intercept('POST', '**/getGameState', {
      body: {
        result: {
          game: {
            id: 'test-game-id',
            status: 'in_progress',
            currentRoundNumber: 0,
            settings: { length: 10, difficulty: 'normal' },
            players: {
              'player-test-game-id-1': { displayName: 'Test User', capital: 1000 },
            },
          },
          playerState: {
            uid: 'player-test-game-id-1',
            displayName: 'Test User',
            capital: 1000,
            currentRound: 0,
            history: [
              {
                number: 0,
                parcelsSnapshot: Array(40)
                  .fill(null)
                  .map((_, i) => ({
                    index: i,
                    crop: 'Fallow',
                    soil: 80,
                    nutrition: 80,
                    yield: 0,
                  })),
                decision: { parcels: {}, machines: 0 },
              },
            ],
          },
          lastRound: {
            number: 0,
            parcelsSnapshot: Array(40)
              .fill(null)
              .map((_, i) => ({
                index: i,
                crop: 'Fallow',
                soil: 80,
                nutrition: 80,
              })),
          },
        },
      },
    }).as('getGameState');

    cy.visit('/game?gameId=test-game-id', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('soil_test_mode', 'true');
      },
    });

    // Wait for game state to load
    cy.wait('@getGameState');

    // Verify app root exists
    cy.get('app-root').should('exist');
  });

  it('should log in automatically in test mode and display game board', () => {
    // Should not see "Login with Google"
    cy.get('[data-testid="login-google"]').should('not.exist');

    // Should see Round Indicator
    cy.get('[data-testid="round-indicator"]').should('be.visible');

    // Should see grid with 40 parcels
    cy.get('[data-testid="parcel"]').should('have.length', 40);
  });

  it('should select crop and paint/box select parcels', () => {
    // Wait for board to be ready
    cy.get('[data-testid="parcel"]').should('have.length', 40);

    // Drag select from Parcel 0 to 1
    cy.get('[data-testid="parcel"]').eq(0).trigger('mousedown', { button: 0 });
    cy.get('[data-testid="parcel"]').eq(1).trigger('mouseenter');
    cy.get('[data-testid="parcel"]').eq(1).trigger('mouseup', { force: true });

    // 3. Select Wheat from Modal
    cy.get('[data-testid="crop-wheat"]').click();

    // Check if Parcel 1 has an image
    cy.get('[data-testid="parcel"]').eq(1).find('img').should('exist');
  });

  it('should move to next round', () => {
    // Click Next Round
    cy.get('[data-testid="next-round-button"]').click();

    // Confirm Modal
    cy.get('[data-testid="confirm-round-settings"]').click();

    // Wait for mocked backend call
    cy.wait('@nextRound');

    // Close Round Result Modal
    cy.get('[data-testid="close-round-result"]').click();

    // Round number should update (Mock returns Round 2)
    cy.get('[data-testid="round-indicator"]').should('contain', '2');

    // Parcel 0 should have an image (Wheat)
    cy.get('[data-testid="parcel"]').eq(0).find('img').should('exist');
  });

  it('should display valid HUD and allow logout', () => {
    // Verify HUD
    cy.get('[data-testid="round-indicator"]').should('be.visible');

    cy.contains('[data-testid="hud-capital"]', '000', { timeout: 10000 }).should('be.visible');

    cy.get('[data-testid="logout-button"]').click({ force: true });

    // Should be back at login screen
    cy.get('[data-testid="parcel"]').should('not.exist');
  });
});
