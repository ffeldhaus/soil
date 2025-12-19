describe('SOIL Game E2E', () => {
    beforeEach(() => {
        // Enable test mode to bypass Google Login
        cy.window().then((win) => {
            win.localStorage.setItem('soil_test_mode', 'true');
        });

        // Mock backend response for initial game state if needed, 
        // OR just intercept the call to prevent actual network error if backend checks token.
        // Since we are mocking the user, the token sent to backend will be 'mock-token', which will fail backend verification.
        // So we MUST intercept the Cloud Function call.
        cy.intercept('POST', '**/calculateNextRound', {
            data: {
                number: 2,
                decision: {},
                result: {
                    profit: 100,
                    capital: 1100,
                    harvestSummary: {},
                    expenses: { seeds: 10, labor: 0, running: 10, investments: 0, total: 20 },
                    income: 120,
                    events: { weather: 'Normal', vermin: 'None' }
                },
                parcelsSnapshot: Array(40).fill(null).map((_, i) => ({
                    index: i,
                    crop: i === 0 ? 'Wheat' : 'Fallow', // Mock change: Parcel 0 becomes Wheat in Round 2
                    soil: 80,
                    nutrition: 80,
                    yield: 0
                }))
            }
        }).as('nextRound');

        cy.visit('/');
    });

    it('should log in automatically in test mode and display game board', () => {
        // Should not see "Login with Google"
        cy.contains('Login with Google').should('not.exist');
        // Should see "Your Field" header
        cy.contains('Your Field - Round 0').should('exist'); // Text might be slightly different structure in new HUD
        // In board.html: "Your Field - Round {{...}}" is inside main board area. 
        // Wait, I changed HUD to be top bar: "Round {{state.currentRound}}"
        cy.contains('Round 0').should('be.visible');
        // Should see grid
        cy.get('app-parcel').should('have.length', 40);
    });

    it('should select crop and paint/box select parcels', () => {
        // Drag select from Parcel 0 to 1
        cy.get('app-parcel').eq(0).trigger('mousedown', { button: 0 });
        cy.get('app-parcel').eq(1).trigger('mouseenter');
        cy.get('app-parcel').eq(1).trigger('mouseup', { force: true }); // window mouseup might be tricky, try triggering on element or body

        // 2. Button "Plant Selection" is removed. Modal opens automatically on mouseup.
        // cy.contains('button', 'Plant Selection').click();

        // 3. Select Wheat from Modal
        cy.contains('app-planting-modal button', 'Wheat').click();

        // Verify visually? We can't easily check internal state in E2E without exposing it.
        // But the Parcel component should update its input 'parcel' if we had a mechanism.
        // Wait, the frontend purely updates *local* view on 'updateParcelDecision' only if implemented.
        // In `GameService.updateParcelDecision`, I saw: "updatedParcels[index] = { ...updatedParcels[index], crop }".
        // So the UI SHOULD reflect the change immediately.

        // Check if Parcel 1 has Wheat image
        cy.get('app-parcel').eq(1).find('img').should('have.attr', 'src').and('include', 'wheat.jpg');
    });

    it('should move to next round', () => {
        // Click Next Round
        cy.contains('Next Round').click();

        // Wait for mocked backend call
        cy.wait('@nextRound');

        // Round number should update (Mock returns Round 2)
        // AND default parcels should update based on mock (Parcel 0 is Wheat)
        cy.contains('Round 2').should('be.visible');
        cy.get('app-parcel').eq(0).find('img').should('have.attr', 'src').and('include', 'wheat.jpg');
    });
    it('should display valid HUD and allow logout', () => {
        // Verify HUD
        cy.contains('Round 0').should('be.visible');
        cy.contains('Capital: €1,000').should('be.visible');

        // Open Menu
        cy.get('button svg').click({ force: true }); // Select the menu icon button (simplified selector or use class/id)
        cy.contains('Menu').should('be.visible');

        // Logout
        cy.contains('button', 'Logout').click();

        // Should be back at login screen (auto-login might re-trigger if logic isn't careful, 
        // but explicit logout clears user. Test-mode bypass happens on load... 
        // Ideally, logout clears the 'soil_test_mode' or we check that we at least hit the router navigate).
        // Since we are monitoring UI:
        // Actually, Board 'logout()' calls authService.logout() AND router.navigate(['/']).
        // But our test setup 'beforeEach' forces login? 
        // 'beforeEach' runs before each TEST. So this test starts logged in.
        // Clicking logout should remove the board.
        cy.contains('Your Field').should('not.exist');
        // Because of the 'soil_test_mode' local storage, a reload would log back in. 
        // But without reload, we should be out.
    });
});
