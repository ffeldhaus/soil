describe('Performance Tiers', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
    // Clear localStorage to start fresh
    cy.window().then((win) => {
      win.localStorage.clear();
    });
  });

  it('should start with tier 3 and apply class to body', () => {
    cy.visit('/');
    cy.get('body').should('have.class', 'perf-tier-3');
  });

  it('should persist tier in localStorage', () => {
    cy.visit('/');
    cy.get('body').should('have.class', 'perf-tier-3');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('soil_perf_tier')).to.equal('3');
    });
  });

  it('should apply tier 2 when set in localStorage', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('soil_perf_tier', '2');
    });
    cy.visit('/');
    cy.get('body').should('have.class', 'perf-tier-2');
    
    // Verify that backdrop-blur is removed in Tier 2
    // We can check if a modal background (if any) has backdrop-filter none
    // But since we are at landing, let's just check body context
  });

  it('should apply tier 1 when set in localStorage', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('soil_perf_tier', '1');
    });
    cy.visit('/');
    cy.get('body').should('have.class', 'perf-tier-1');
  });

  it('should ensure overlays are fully opaque in Tier 1', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('soil_perf_tier', '1');
    });
    cy.visit('/');
    
    // Trigger something that has an overlay, e.g. login error or just check footer/nav if they use bg-black/XX
    // Actually, we can just check the computed style of any element with a background class
    cy.get('body').should('have.class', 'perf-tier-1');
    
    // Find an element that usually has transparency and check if it's now opaque
    // Many sections in landing have bg-gray-900/80
    cy.get('section').first().should('have.css', 'background-color', 'rgb(0, 0, 0)'); // Tier 1 forces black for overlays
  });
});
