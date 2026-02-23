describe('Account Deletion', () => {
  beforeEach(() => {
    // Clear local storage before each test
    cy.window().then((win) => {
      win.localStorage.clear();
    });
  });

  it('Guest: Clears local data and logs out', () => {
    // 1. Setup Guest session
    cy.visit('/', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('soil_guest_uid', 'guest-123');
        win.localStorage.setItem('soil_guest_name', 'Test Guest');
        win.localStorage.setItem('soil_active_local_game', 'local-game-123');
      },
    });

    // 2. Go to delete account page
    cy.visit('/delete-account');

    // 3. Verify description for Guest
    cy.contains('Lokale Daten löschen').should('be.visible');
    cy.contains('Alle lokal in Ihrem Browser gespeicherten Spieldaten').should('be.visible');

    // 4. Click delete and confirm
    cy.contains('Lokale Daten jetzt unwiderruflich löschen').click();

    // Modal confirmation
    cy.contains('Ja, endgültig löschen').click();

    // 5. Verify local storage is cleared and redirected to landing
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('soil_guest_uid')).to.be.null;
      expect(win.localStorage.getItem('soil_active_local_game')).to.be.null;
    });
  });

  it('Authenticated User: Purges remote and local data', () => {
    const mockUid = 'user-123';

    // 1. Setup Intercepts for deletion
    cy.intercept('POST', '**/deleteAccount', {
      body: { result: { success: true } },
    }).as('deleteAccountCall');

    // 2. Setup session
    cy.visit('/delete-account', {
      onBeforeLoad: (win) => {
        // Mock auth user state by setting test mode and relevant local storage
        win.localStorage.setItem('soil_test_mode', 'true');
        win.localStorage.setItem('soil_test_role', 'admin');
        win.localStorage.setItem('soil_active_local_game', 'draft-game-123');
      },
    });

    // 3. Verify description for Authenticated User
    cy.contains('Konto löschen').should('be.visible');
    cy.contains('Alle Ihre persönlichen Daten (Name, E-Mail) werden unwiderruflich gelöscht').should('be.visible');

    // 4. Trigger deletion
    cy.contains('Konto und Daten jetzt unwiderruflich löschen').click();
    cy.contains('Ja, endgültig löschen').click();

    // 5. Verify call was made and storage cleared
    cy.wait('@deleteAccountCall').its('request.body').should('exist');

    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('soil_active_local_game')).to.be.null;
      // test_mode might be cleared by logout logic
      expect(win.localStorage.getItem('soil_test_mode')).to.be.null;
    });
  });
});
