describe('Full Game Playthrough (1 Human Player)', () => {
    beforeEach(() => {
        // Enable test mode to bypass Google Login
        cy.window().then((win) => {
            win.localStorage.setItem('soil_test_mode', 'true');
        });

        // Mock backend responses
        cy.intercept('POST', '**/calculateNextRound', (req) => {
            // Echo back updated state based on decision (simplified mock logic)
            const currentRound = (req.body.data.decision?.parcels[0] === 'Wheat') ? 1 : 0; // Heuristic
            // Actually, we can just increment whatever state we track, or return a static sequence
            // For E2E, we mostly care that the UI sends the right things and updates on response.

            req.reply({
                data: {
                    number: 2, // Simulate moving to Round 2
                    decision: req.body.data.decision,
                    result: {
                        profit: 500,
                        capital: 1500,
                        harvestSummary: { Wheat: 100 },
                        expenses: { seeds: 50, labor: 0, running: 100, investments: 0, total: 150 },
                        income: 650,
                        events: { weather: 'Normal', vermin: 'None' }
                    },
                    parcelsSnapshot: Array(40).fill(null).map((_, i) => ({
                        index: i,
                        crop: req.body.data.decision.parcels[i] || 'Fallow',
                        soil: 80,
                        nutrition: 80,
                        yield: 10
                    }))
                }
            });
        }).as('nextRound');

        cy.visit('/');
    });

    it('should complete a full round with custom settings', () => {
        // 1. Verify Initial State
        cy.contains('Round 0').should('be.visible');
        cy.contains('Capital: €1,000').should('be.visible');

        // 2. Plant Crops
        // Select first 5 parcels
        cy.get('app-parcel').eq(0).trigger('mousedown', { button: 0 });
        cy.get('app-parcel').eq(4).trigger('mousemove'); // Drag
        cy.get('app-parcel').eq(4).trigger('mouseup', { force: true });

        // Modal should open
        cy.contains('Select Crop to Plant').should('be.visible');
        cy.contains('button', 'Wheat').click();

        // Verify Wheat planted on grid (UI check)
        cy.get('app-parcel').eq(0).find('img').should('have.attr', 'src').and('include', 'weizen.jpg');

        // 3. Configure Round Settings
        cy.contains('button', 'Round Options').click();
        cy.contains('Round Settings').should('be.visible');

        // Adjust Machines Slider (0->50)
        cy.get('input[type="range"]')
            .invoke('val', 50)
            .trigger('change')
            .trigger('input'); // Trigger Angular update

        // Toggle Fertilizer
        cy.contains('Synthetic Fertilizer').parent().click();

        // Submit Settings
        cy.contains('button', 'Confirm Settings').click();
        cy.contains('Round Settings').should('not.exist');

        // 4. Submit Round
        cy.contains('Next Round').click();

        // 5. Verify Backend Call Payload
        cy.wait('@nextRound').then((interception) => {
            const decision = interception.request.body.data.decision;
            expect(decision.machines).to.eq(50); // String or number? Input range is usually string in HTML, but ngModel should bind number?
            expect(decision.fertilizer).to.be.true;
            expect(decision.parcels[0]).to.eq('Wheat');
        });

        // 6. Verify Next Round State
        cy.contains('Round 2').should('be.visible');
        cy.contains('Capital: €1,500').should('be.visible');
    });
});
