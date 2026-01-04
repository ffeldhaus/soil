describe('Internationalization (i18n)', () => {
  it('should display English content by default', () => {
    cy.visit('/', {
        onBeforeLoad: (win) => {
            win.localStorage.setItem('soil_user_language', 'en');
        }
    });
    cy.get('[data-testid="landing-agriculture"]').should('contain.text', 'Agriculture');
    cy.get('html').should('have.attr', 'lang', 'en');
  });

  it('should display German content when choosing DE', () => {
    cy.visit('/', {
        onBeforeLoad: (win) => {
            win.localStorage.setItem('soil_user_language', 'de');
        }
    });
    cy.get('[data-testid="landing-agriculture"]').should('contain.text', 'Landwirtschaft');
    cy.get('html').should('have.attr', 'lang', 'de');
  });

  it('should persist language choice in localStorage', () => {
    cy.visit('/');
    // Switch to DE
    cy.get('app-language-switcher button').first().click(); // Open dropdown
    cy.contains('button', 'Deutsch').click(); // Select Deutsch
    cy.window().then((win) => {
        expect(win.localStorage.getItem('soil_user_language')).to.eq('de');
    });
    cy.get('html').should('have.attr', 'lang', 'de');
  });
});
