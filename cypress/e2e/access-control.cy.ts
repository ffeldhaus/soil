describe('Access Control', () => {
    it('should show login options on game page when not logged in', () => {
        cy.visit('/de/game');
        cy.get('[data-testid="login-google"]').should('be.visible');
        cy.get('[data-testid="login-player-submit"]').should('be.visible');
    });

    it('should show action buttons on landing page', () => {
        cy.visit('/de');
        cy.get('[data-testid="landing-enter-game"]').should('be.visible');
        cy.get('[data-testid="landing-admin-login"]').should('be.visible');
        cy.get('[data-testid="landing-register"]').should('be.visible');
    });
});