describe('Admin Registration and Login Flow', () => {
  const uniqueEmail = `admin-${Date.now()}@example.com`;
  const password = 'password123';
  const knownAdminEmail = 'pre-existing-admin@example.com'; // For login failure test

  it('should allow an admin to register and then log in', () => {
    // 1. Visit Registration Page
    cy.visit('/frontpage/register');

    // 2. Fill Registration Form
    cy.get('[data-testid=firstName-input]').type('Test');
    cy.get('[data-testid=lastName-input]').type('Admin');
    cy.get('[data-testid=institution-input]').type('Test University');
    cy.get('[data-testid=email-input]').type(uniqueEmail);
    cy.get('[data-testid=password-input]').type(password);
    cy.get('[data-testid=confirmPassword-input]').type(password);

    // 3. Submit Registration Form
    cy.get('[data-testid=register-button]').click();

    // 4. Assert Successful Registration & Navigation to Login
    cy.url().should('include', '/frontpage/login');
    cy.location('search').should('include', `email=${encodeURIComponent(uniqueEmail)}`);

    // 5. Verify Email is Pre-filled and Login
    cy.get('[data-testid=email-input]').should('have.value', uniqueEmail);
    cy.get('[data-testid=password-input]').type(password);
    cy.get('[data-testid=login-button]').click();

    // 6. Assert Successful Login & Navigation to Admin Dashboard
    cy.url({ timeout: 10000 }).should('include', '/admin');
    cy.get('[data-testid=admin-dashboard-header]', { timeout: 10000 }).should('be.visible').and('contain.text', 'Admin Dashboard');
  });

  it('should fail to log in with incorrect credentials and show an error', () => {
    // 1. Visit Login Page
    cy.visit('/frontpage/login');

    // 2. Fill Login Form with Incorrect Password
    // Assuming 'pre-existing-admin@example.com' is an account that exists,
    // but we are providing the wrong password.
    // If this admin does not exist, the error message might be different,
    // or the test might pass for the wrong reason.
    cy.get('[data-testid=email-input]').type(knownAdminEmail);
    cy.get('[data-testid=password-input]').type('wrongPassword123');

    // 3. Submit Login Form
    cy.get('[data-testid=login-button]').click();

    // 4. Assert Login Failure
    // Assuming the NotificationService.showError renders an element with this data-testid.
    // The text 'Invalid email or password' is an assumption of the error message.
    // This selector might need to be more generic if the error message container is standard (e.g., a MatSnackBar).
    cy.get('[data-testid=notification-error-message]', { timeout: 5000 })
      .should('be.visible')
      .and('contain.text', 'Invalid email or password'); // Adjust text based on actual error

    // Assert that the user remains on the login page
    cy.url().should('include', '/frontpage/login');

    // Assert that elements from a protected admin page are not present
    cy.get('[data-testid=admin-dashboard-header]').should('not.exist');
  });
});
