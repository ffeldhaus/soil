describe('Basic Player Login Flow', () => {
  // --- Test Data (Assumed to exist in the test environment) ---
  const gameId = 'e2e-game-player-login'; // Hardcoded Game ID
  const playerNumber = '1'; // Hardcoded Player Number (or ID if used in URL)
  const playerPassword = 'e2ePlayerPass123'; // Hardcoded Player Password
  // --- End of Test Data ---

  it('should allow a player to log in and see their game dashboard', () => {
    // 1. Visit Player Login Page
    // Construct the URL with the hardcoded gameId and playerNumber
    cy.visit(`/frontpage/login?gameId=${gameId}&player=${playerNumber}`);

    // 2. Fill Player Login Form
    // The login component should recognize it's in player mode from query params
    // and only require the password.
    cy.get('[data-testid=password-input]').type(playerPassword);

    // 3. Submit Login Form
    cy.get('[data-testid=login-button]').click();

    // 4. Assert Successful Login & Navigation to Game Dashboard
    // Wait for potential async operations after login and navigation.
    // Increased timeout for URL change, especially if backend calls are involved.
    cy.url({ timeout: 10000 }).should('include', `/game/${gameId}/dashboard`);
    // The path might be just `/game/${gameId}` or another specific sub-route.
    // Adjust if needed.

    // Check for a header or a unique element on the game dashboard.
    cy.get('[data-testid=game-dashboard-header]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'Game Dashboard'); // Adjust text based on actual dashboard header.

    // Optionally, check for some player-specific information if available and testable
    // For example, if the player's name or number is displayed:
    // cy.get('[data-testid=player-identifier]').should('contain.text', `Player ${playerNumber}`);
  });
});
