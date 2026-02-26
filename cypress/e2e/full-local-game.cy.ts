describe('Full Local Game & Research Upload', () => {
  const gameName = `Research E2E ${Date.now()}`;

  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('should play a full 10-round game and verify research upload call', () => {
    // 1. Login and Create Game
    cy.visit('/game-login');
    cy.window().then((win) => {
      win.localStorage.setItem('soil_test_mode', 'true');
      win.localStorage.setItem('soil_test_role', 'admin');
      win.localStorage.setItem('soil_tour_disabled', 'true');
    });
    cy.visit('/admin');

    cy.get('[data-testid="game-name-input"]').type(gameName);
    cy.get('[data-testid="num-players-input"]').invoke('val', 1).trigger('change');
    cy.get('[data-testid="num-rounds-input"]').invoke('val', 10).trigger('change').trigger('input');

    // Intercept upload to verify it happens
    cy.intercept('POST', '**/uploadFinishedGame').as('uploadFinished');

    cy.get('[data-testid="create-game-submit"]').click();

    // 2. Play 10 Rounds (0 to 9)
    cy.url({ timeout: 15000 }).should('include', '/game');

    for (let round = 0; round < 10; round++) {
      // 2.1. Wait for Round Indicator to show current round
      if (round > 0) cy.wait(500);

      cy.contains('[data-testid="round-indicator"]', `Runde ${round}`, { timeout: 30000 }).should('be.visible');

      // 2.2. Dismiss weather/pest modal
      if (round > 0) {
        cy.get('body').then(($body) => {
          if ($body.find('[data-testid="close-event-modal"]').length > 0) {
            cy.get('[data-testid="close-event-modal"]').click({ force: true });
          }
        });
      }

      // 2.3. Submit Round
      // We don't need to plant every round to keep it fast, fallow is fine
      cy.get('[data-testid="next-round-button"]', { timeout: 10000 })
        .should('not.contain', 'Warten')
        .should('not.be.disabled')
        .click({ force: true });

      cy.get('[data-testid="confirm-round-settings"]', { timeout: 10000 }).should('be.visible').click({ force: true });

      // 2.4. Close Result Modal
      if (round < 9) {
        cy.get('[data-testid="close-round-result"]', { timeout: 20000 }).should('be.visible').click({ force: true });
      }
    }

    // 2.5. Handle Game End Modal
    cy.contains('Spiel beendet!', { timeout: 20000 }).should('be.visible');
    cy.contains('Ergebnisse ansehen').click({ force: true });

    // 3. Verify Upload Call
    // This is the source of truth: the frontend successfully sent the data
    cy.wait('@uploadFinished', { timeout: 30000 }).then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body.result.success).to.be.true;

      const gameData = interception.request.body.data.gameData;
      expect(gameData.game.status).to.eq('finished');

      // Verify payload size is reasonable (> 20KB for 10 rounds)
      const sizeInBytes = JSON.stringify(interception.request.body).length;
      expect(sizeInBytes).to.be.greaterThan(20000);
    });

    // Note: Verification in Super Admin table is skipped in CI due to
    // emulator Firestore consistency delays but the upload call is verified.
  });
});
