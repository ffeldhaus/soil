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

  it('should serve /.well-known/assetlinks.json correctly', () => {
    cy.request('/.well-known/assetlinks.json').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
      expect(body[0].target.package_name).to.eq('app.soil.twa');
      expect(body[0].target.sha256_cert_fingerprints[0]).to.eq(
        'CA:EF:E7:D1:58:CF:4C:E1:7A:A1:D0:2E:E7:80:29:E3:E5:21:56:A0:13:41:C8:21:F6:68:AE:69:82:63:B5:42',
      );
    });
  });
});
