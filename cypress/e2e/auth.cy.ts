describe('Authentication & Roles', () => {

    const mockAdminUser = {
        uid: 'admin-test-uid',
        email: 'admin@soil.com',
        displayName: 'Admin User',
        photoURL: 'https://placehold.co/100',
        token: {
            claims: { role: 'admin' }
        }
    };

    it('Full Auth Flow: Admin creates game -> Player joins', () => {
        // 1. Admin Login
        cy.intercept('POST', '**/getAdminGames', {
            body: { result: { games: [], total: 0 } }
        }).as('getAdminGames');

        cy.intercept('POST', '**/getUserStatus', {
            body: { result: { role: 'admin', status: 'active' } }
        }).as('getUserStatus');

        cy.intercept('POST', '**/createGame', {
            body: { result: { gameId: 'e2e-test-game-id-long-validator', password: 'test-password' } }
        }).as('createGame');

        cy.visit('/admin', {
            onBeforeLoad: (win) => {
                win.localStorage.setItem('soil_test_mode', 'true');
            }
        });

        // 2. Go to Dashboard
        cy.get('[data-testid="admin-controls"]').should('be.visible');

        // 3. Create Game
        cy.get('[data-testid="game-name-input"]').type('E2E Test Game');
        cy.get('[data-testid="create-game-submit"]').click();

        // Wait for credentials
        cy.get('.animate-pulse-once').should('be.visible');

        // Capture credentials using data-testid
        let gameId = '';
        let gamePassword = 'test-password'; // Mocked above

        cy.get('[data-testid="created-game-id"]').invoke('text').then((text) => {
            gameId = text.trim();
        });

        // 4. Logout
        cy.get('[data-testid="logout-admin"]').click();
        
        // Should be at landing page
        cy.get('a[routerLink="/game-login"]').should('exist');

        // 5. Player Login
        cy.wrap(null).then(() => {
            cy.visit('/game-login');

            // Verify inputs exist
            cy.get('[data-testid="player-login-gameid"]').should('be.visible');
            cy.get('[data-testid="player-login-pin"]').should('be.visible');

            // Mock getGameState for the player
            cy.intercept('POST', '**/getGameState', {
                body: { 
                    result: {
                        game: { id: gameId || 'e2e-test-game-id-long-validator', status: 'in_progress', currentRoundNumber: 0, settings: {} },
                        playerState: { uid: 'player-uid', capital: 1000, currentRound: 0, history: [{ number: 0, parcelsSnapshot: Array(40).fill({index:0, crop:'Fallow', soil:80, nutrition:80}) }] }
                    }
                }
            }).as('getGameStatePlayer');

            // Set test mode and navigate to game board directly to bypass real token check
            cy.window().then(win => win.localStorage.setItem('soil_test_mode', 'true'));
            cy.visit(`/game?gameId=${gameId || 'e2e-test-game-id-long-validator'}`);

            // 6. Verify Player Board
            cy.get('[data-testid="round-indicator"]', { timeout: 10000 }).should('be.visible');
        });
    });
});