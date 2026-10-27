describe('Opaque Non-Glassmorphic UI & Multi-Resolution Layout', () => {
  const resolutions: [number, number][] = [
    [1920, 1080],
    [1440, 812],
    [1366, 768],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [375, 667],
  ];

  it('enforces non-glassmorphic rendering invariants (no perf-tier, backdrop-filter, or rounded-3xl)', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.get('body').should('not.have.class', 'perf-tier-1');
    cy.get('body').should('not.have.class', 'perf-tier-2');
    cy.get('body').should('not.have.class', 'perf-tier-3');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('soil_perf_tier')).to.be.null;
    });

    cy.get('section').first().should('have.css', 'backdrop-filter', 'none');
    cy.get('[class*="backdrop-blur"]').should('have.length', 0);
    cy.get('[class*="rounded-3xl"]').should('have.length', 0);

    // Footer bar should use semi-transparent bg-gray-950/85 without backdrop-filter
    cy.contains('a', 'Impressum')
      .parent()
      .should('have.class', 'bg-gray-950/85')
      .and('have.css', 'backdrop-filter', 'none');
  });

  it('renders opaque HUD header and conditional side cards on the game board', () => {
    cy.viewport(1440, 812);
    cy.intercept('POST', '**/getGameState', {
      body: {
        result: {
          game: { id: 'test-perf-game', status: 'in_progress', currentRoundNumber: 0, settings: {} },
          playerState: {
            uid: 'player-1',
            capital: 100000,
            currentRound: 0,
            history: [
              {
                number: 0,
                parcelsSnapshot: Array.from({ length: 40 }, (_, i) => ({
                  index: i,
                  crop: 'Fallow',
                  soil: 100,
                  nutrition: 100,
                })),
                decision: { parcels: {}, machines: 0 },
              },
            ],
          },
          lastRound: {
            number: 0,
            parcelsSnapshot: Array.from({ length: 40 }, (_, i) => ({
              index: i,
              crop: 'Fallow',
              soil: 100,
              nutrition: 100,
            })),
          },
        },
      },
    }).as('getGameState');

    cy.visit('/game?gameId=test-perf-game', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('soil_test_mode', 'true');
        win.localStorage.setItem('soil_tour_seen', 'true');
        win.localStorage.setItem('soil_welcome_seen_test-perf-game', 'true');
      },
    });
    cy.wait('@getGameState');

    // HUD top bar is opaque bg-gray-900 without backdrop blur
    cy.get('app-board-hud > div').should('have.class', 'bg-gray-900').and('have.css', 'backdrop-filter', 'none');

    // Weather side card is visible, while Pests and Contract side cards are hidden when inactive in Round 0
    cy.get('[data-testid="side-card-weather"]').should('be.visible');
    cy.get('[data-testid="side-card-pests"]').should('not.exist');
    cy.get('[data-testid="side-card-contract"]').should('not.exist');
  });

  it('renders /manual and /info without horizontal overflow across viewports', () => {
    for (const [w, h] of resolutions) {
      cy.viewport(w, h);
      cy.visit('/manual');
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(w);
      });
    }
  });
});
