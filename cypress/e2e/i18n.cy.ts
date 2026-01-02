describe('Internationalization (i18n)', () => {
  it('should display English content by default', () => {
    cy.visit('/en-US/', {
        onBeforeLoad: (win) => {
            win.localStorage.setItem('soil_user_language', 'en');
        }
    });
    cy.get('[data-testid="landing-agriculture"]').should('contain.text', 'Agriculture');
    cy.get('html').should('have.attr', 'lang', 'en-US');
  });

  it('should display German content when visiting /de/', () => {
    cy.visit('/de/');
    cy.get('[data-testid="landing-agriculture"]').should('contain.text', 'Landwirtschaft');
    cy.get('html').should('have.attr', 'lang', 'de');
  });

  it('should persist language choice in localStorage', () => {
    cy.visit('/de/');
    cy.window().then((win) => {
        expect(win.localStorage.getItem('soil_user_language')).to.eq('de');
    });
  });
});
