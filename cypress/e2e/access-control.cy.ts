describe('Access Control', () => {
  it('should redirect to landing page when visiting game page while not logged in', () => {
    cy.visit('/game');
    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
    cy.get('[data-testid="landing-manage-games"]').should('be.visible');
  });

  it('should show action buttons on landing page', () => {
    cy.visit('/');
    cy.get('[data-testid="landing-manage-games"]').should('be.visible');
  });
});
