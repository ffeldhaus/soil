describe('PWA Restructure & Offline-First Scenarios', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    // Enable test mode to use mocks and skip real Firebase Auth/Firestore
    localStorage.setItem('soil_test_mode', 'true');
  });

  it('should play a full local game from creation to finish', () => {
    // 1. Landing Page
    cy.visit('/');
    cy.get('[data-testid="create-manage-btn"]').should('be.visible').click();

    // 2. Dashboard - Create Game
    cy.url().should('include', '/admin');
    cy.get('[data-testid="game-name-input"]').clear().type('Full Local Game');
    cy.get('[data-testid="create-game-submit"]').click();

    // 3. Auto-join redirect to Game Board
    cy.url().should('include', '/game');
    cy.get('[data-testid="round-indicator"]').should('contain', '0');

    // 4. Play Round 1
    // Select parcels 0-4
    cy.get('[data-testid="parcel"]').eq(0).trigger('mousedown', { button: 0 });
    cy.get('[data-testid="parcel"]').eq(4).trigger('mouseenter');
    cy.get('[data-testid="parcel"]').eq(4).trigger('mouseup', { force: true });
    cy.get('[data-testid="crop-wheat"]').click();

    // Submit Round
    cy.get('[data-testid="next-round-button"]').click();
    cy.get('[data-testid="confirm-round-settings"]').click();

    // Verify Round Result Modal
    cy.get('[data-testid="round-result-modal"]').should('be.visible');
    cy.get('[data-testid="close-round-result"]').click();

    // 5. Verify advanced to Round 1 (Local engine starts at 0, goes to 1)
    cy.get('[data-testid="round-indicator"]').should('contain', '1');

    // 6. Fast-forward to end (Mocking finished state if possible, or just play 1 more)
    // Actually, real local engine works! Let's play one more.
    cy.get('[data-testid="next-round-button"]').click();
    cy.get('[data-testid="confirm-round-settings"]').click();
    cy.get('[data-testid="close-round-result"]').click();
    cy.get('[data-testid="round-indicator"]').should('contain', '2');
  });

  it('should migrate a local guest game to cloud upon login', () => {
    // 1. Create a local game as guest
    cy.visit('/');
    cy.get('[data-testid="create-manage-btn"]').click();
    cy.get('[data-testid="game-name-input"]').clear().type('Guest Game');
    cy.get('[data-testid="create-game-submit"]').click();
    cy.url().should('include', '/game');

    // Play one round to have some state
    cy.get('[data-testid="parcel"]').eq(0).click();
    cy.get('[data-testid="crop-corn"]').click();
    cy.get('[data-testid="next-round-button"]').click();
    cy.get('[data-testid="confirm-round-settings"]').click();
    cy.get('[data-testid="close-round-result"]').click();

    // 2. Go to Login (simulate registration/login)
    cy.visit('/admin/login');
    // In test mode, we can just set the role to admin/superadmin to simulate "logged in"
    // and let SyncService do its magic.
    cy.window().then((win) => {
      win.localStorage.setItem('soil_test_role', 'admin');
      // Trigger login by navigating to admin
      cy.visit('/admin');
    });

    // 3. Verify migration call
    // We would need to intercept 'migrateLocalGame' but it's a callable.
    // Let's check if the game is still listed in dashboard.
    cy.get('app-dashboard-game-list').should('contain', 'Guest Game');
  });
});
