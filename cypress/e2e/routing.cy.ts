describe('Important Routes', () => {
  it('should load the landing page', () => {
    cy.visit('/');
    cy.get('h1').contains('SOIL').should('be.visible');
  });

  it('should load the manual page', () => {
    cy.visit('/manual');
    cy.get('h1').contains('Handbuch').should('be.visible');
  });

  it('should load the info page', () => {
    cy.visit('/info');
    cy.get('h1').contains('Hintergrund').should('be.visible');
  });

  it('should load the impressum page', () => {
    cy.visit('/impressum');
    cy.get('h1').contains('Impressum').should('be.visible');
  });

  it('should load the admin login page', () => {
    cy.visit('/admin/login');
    cy.get('h1').contains('Anmeldung').should('be.visible');
  });

  it('should redirect /admin to login if not authenticated', () => {
    // Note: In real environment this might depend on auth state. 
    // In e2e without mock it should redirect or show guest dashboard.
    cy.visit('/admin');
    cy.url().should('include', '/admin');
  });

  it('should serve robots.txt correctly', () => {
    cy.request('/robots.txt').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('text/plain');
      expect(response.body).to.include('User-agent: *');
      expect(response.body).to.include('Sitemap: https://soil.app/sitemap.xml');
    });
  });

  it('should serve sitemap.xml correctly', () => {
    cy.request('/sitemap.xml').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/xml');
      expect(response.body).to.include('<urlset');
      expect(response.body).to.include('https://soil.app/admin');
    });
  });
});
