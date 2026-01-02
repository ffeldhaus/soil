describe('Full Game Playthrough', () => {
    beforeEach(() => {
        cy.viewport(1280, 800);

        // Mock backend responses
        cy.intercept('POST', '**/submitDecision', (req) => {
            req.reply({
                body: {
                    result: {
                        status: 'calculated',
                        nextRound: {
                            number: 2,
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
                    }
                }
            });
        }).as('nextRound');

        let callCount = 0;
        cy.intercept('POST', '**/getGameState', (req) => {
            callCount++;
            req.reply({
                body: {
                    result: {
                        game: { id: 'test-game-id', status: 'in_progress', currentRoundNumber: 0, settings: {} },
                        playerState: { 
                            uid: 'player-test-game-id-1', 
                            capital: callCount === 1 ? 1000 : 1500, 
                            currentRound: 0, 
                            history: [{ number: 0, parcelsSnapshot: Array(40).fill(null).map((_, i) => ({ index: i, crop: 'Fallow', soil: 80, nutrition: 80 })), decision: { parcels: {}, machines: 0 } }] 
                        }
                    }
                }
            });
        }).as('getGameState');

        cy.visit('/de/game?gameId=test-game-id', {
            onBeforeLoad: (win) => {
                win.localStorage.setItem('soil_test_mode', 'true');
            }
        });
    });

    it('should complete a full round with custom settings', () => {
        // 1. Verify Initial State
        cy.get('[data-testid="round-indicator"]').should('be.visible');
        cy.contains('[data-testid="hud-capital"]', '000', { timeout: 10000 }).should('be.visible');

        // 2. Plant Crops
        cy.get('[data-testid="parcel"]').eq(0).trigger('mousedown', { button: 0 });
        cy.get('[data-testid="parcel"]').eq(4).trigger('mouseenter'); 
        cy.get('[data-testid="parcel"]').eq(4).trigger('mouseup', { force: true });

        // Modal should open
        cy.get('[data-testid="crop-wheat"]').click();

        // 3. Configure Round Settings
        // Click Next Round to open settings
        cy.get('[data-testid="next-round-button"]').click();
        
        // Adjust Machines Slider (0->50)
        cy.get('input[type="range"]')
            .invoke('val', 50)
            .trigger('change')
            .trigger('input');

        // Synthetic Fertilizer checkbox (it's the second one usually)
        // Better: use labels but we want language independence.
        // Let's assume order for now or add IDs to checkboxes.
        cy.get('input[type="checkbox"]').eq(1).check();

        // Submit Settings
        cy.get('[data-testid="confirm-round-settings"]').click();

        // 4. Verify Backend Call Payload
        cy.wait('@nextRound').then((interception) => {
            const decision = interception.request.body.data.decision;
            expect(decision.machines).to.eq(50);
            expect(decision.fertilizer).to.be.true;
            expect(decision.parcels[0]).to.eq('Wheat');
        });

        // 5. Verify Next Round State
        cy.get('[data-testid="round-indicator"]').should('contain', '2');
        cy.contains('[data-testid="hud-capital"]', '500', { timeout: 10000 }).should('be.visible');
    });
});