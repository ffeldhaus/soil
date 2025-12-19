describe('Authentication & Roles', () => {

    beforeEach(() => {
        cy.visit('/');
    });

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
        // Mock Firebase Functions calls
        cy.intercept('POST', '**/getAdminGames', {
            statusCode: 200,
            body: { result: { games: [], total: 0 } }
        }).as('getAdminGames');

        cy.intercept('POST', '**/createGame', {
            statusCode: 200,
            body: { result: { gameId: 'test-game-id', password: 'test-password' } }
        }).as('createGame');

        cy.window().then((win) => {
            win.localStorage.setItem('soil_test_mode', 'true');
        });
        cy.reload();

        // 2. Go to Dashboard
        // Admin is automatically redirected to /admin from /game
        cy.url().should('include', '/admin');
        cy.contains('Admin Controls').should('be.visible');
        // cy.get('button').contains('Menu').click(); // Not needed due to redirect
        // cy.get('a').contains('Admin Dashboard').click();

        // 3. Create Game
        cy.contains('Create New Game').click();

        // Wait for credentials
        cy.get('.animate-pulse-once').should('be.visible');

        // Capture credentials
        let gameId = '';
        let gamePassword = '';

        cy.contains('Game ID').next().invoke('text').then((text) => {
            gameId = text.trim();
            console.log('Captured Game ID:', gameId);
        });

        cy.contains('Password').next().invoke('text').then((text) => {
            gamePassword = text.trim();
            console.log('Captured Password:', gamePassword);
        });

        // 4. Logout
        cy.contains('Logout').click();
        cy.url().should('not.include', '/admin');

        // 5. Player Login
        cy.wrap(null).then(() => {
            // Enforce ordering with cy.wrap/then to ensure variables are set
            cy.log(`Logging in as Player for Game: ${gameId} with Pwd: ${gamePassword}`);

            cy.get('input[placeholder="Game ID"]').type(gameId);
            cy.get('input[placeholder="Player # (e.g. 1)"]').type('1');
            cy.get('input[placeholder="Game Password"]').type(gamePassword);

            cy.get('button').contains('Login').click();

            // 6. Verify Player Board
            // Should show "Your Field" and not the login screen
            cy.contains('Your Field').should('be.visible');
            cy.contains('Round 0').should('be.visible');
        });
    });
});
