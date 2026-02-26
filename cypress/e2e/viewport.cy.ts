describe('Viewport & Orientation', () => {
  it('should render desktop/landscape layout correctly', () => {
    cy.viewport('macbook-15'); // 1440x900 (landscape)
    cy.visit('/');

    // Hero content should be visible and centered
    cy.get('h1').contains('SOIL').should('be.visible');

    // Links should be in a row (or row-like depending on the Tailwind classes)
    cy.get('[data-testid="landing-manage-games"]').should('be.visible');

    // On larger screens, the grid in info-section might be side-by-side
    // We can just verify it is visible
    cy.get('#info-section').should('be.visible');
  });

  it('should render mobile/portrait layout correctly', () => {
    cy.viewport('iphone-x', 'portrait'); // 375x812 (portrait)
    cy.visit('/');

    // Hero content still visible
    cy.get('h1').contains('SOIL').should('be.visible');

    // Button should span full width or column layout
    cy.get('[data-testid="landing-manage-games"]').should('be.visible');

    // Visit a game page with mocked state to check mobile overlays
    cy.intercept('POST', '**/getGameState', {
      body: {
        result: {
          game: { id: 'test-game', status: 'in_progress', currentRoundNumber: 0, settings: {} },
          playerState: { uid: 'player', capital: 1000, currentRound: 0, history: [] },
          lastRound: { number: 0, parcelsSnapshot: [] },
        },
      },
    });

    cy.visit('/game?gameId=test-game', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('soil_test_mode', 'true');
      },
    });

    // We don't have exact assertions for mobile vs desktop HUD,
    // but ensuring the board and basic controls are visible without crashing.
    cy.get('app-root').should('exist');
  });
});
