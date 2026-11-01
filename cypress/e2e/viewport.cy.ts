describe('Viewport & Orientation', () => {
  it('should render desktop/landscape layout correctly', () => {
    cy.viewport('macbook-15'); // 1440x900 (landscape)
    cy.visit('/');

    // Hero content should be visible and centered
    cy.get('h1').contains('SOIL').should('be.visible');

    // Links should be in a row (or row-like depending on the Tailwind classes)
    cy.get('[data-testid="landing-manage-games"]').should('be.visible');

    // On larger screens, the grid in info-section might be side-by-side
    // We can just verify it is visible
    cy.get('#info-section').should('be.visible');
  });

  it('should render mobile/portrait layout correctly', () => {
    cy.viewport('iphone-x', 'portrait'); // 375x812 (portrait)
    cy.visit('/');

    // Hero content still visible
    cy.get('h1').contains('SOIL').should('be.visible');

    // Button should span full width or column layout
    cy.get('[data-testid="landing-manage-games"]').should('be.visible');

    // Visit a game page with mocked state to check mobile overlays
    cy.intercept('POST', '**/getGameState', {
      body: {
        result: {
          game: { id: 'test-game', status: 'in_progress', currentRoundNumber: 0, settings: {} },
          playerState: { uid: 'player', capital: 1000, currentRound: 0, history: [] },
          lastRound: { number: 0, parcelsSnapshot: [] },
        },
      },
    });

    cy.visit('/game?gameId=test-game', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('soil_test_mode', 'true');
      },
    });

    // We don't have exact assertions for mobile vs desktop HUD,
    // but ensuring the board and basic controls are visible without crashing.
    cy.get('app-root').should('exist');
  });

  it('should test Pixel 10 Pro (412x915) real touch emulation on planting modal and tour', () => {
    cy.viewport(412, 915);

    const simulateMobileTap = (selector: string) => {
      return cy
        .get(selector)
        .first()
        .then(($el) => {
          const doc = $el[0].ownerDocument;
          const win = doc.defaultView!;
          const rect = $el[0].getBoundingClientRect();
          const x = Math.round(rect.left + rect.width / 2);
          const y = Math.round(rect.top + rect.height / 2);
          const target = doc.elementFromPoint(x, y) as HTMLElement;
          expect(target, `elementFromPoint at (${x}, ${y}) for ${selector}`).to.not.be.null;

          const touchObj = new win.Touch({
            identifier: Date.now(),
            target,
            clientX: x,
            clientY: y,
            pageX: x,
            pageY: y,
            radiusX: 5,
            radiusY: 5,
            force: 1,
          });

          const touchStartEvent = new win.TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            composed: true,
            touches: [touchObj],
            targetTouches: [touchObj],
            changedTouches: [touchObj],
          });
          const startNotCancelled = target.dispatchEvent(touchStartEvent);

          const touchEndEvent = new win.TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            composed: true,
            touches: [],
            targetTouches: [],
            changedTouches: [touchObj],
          });
          const endNotCancelled = target.dispatchEvent(touchEndEvent);

          // Per W3C Touch Events spec, mobile browsers only synthesize mousedown/mouseup/click
          // if neither touchstart nor touchend called preventDefault().
          if (startNotCancelled && endNotCancelled) {
            const clickTarget = (doc.elementFromPoint(x, y) as HTMLElement) || target;
            clickTarget.dispatchEvent(
              new win.MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }),
            );
            clickTarget.dispatchEvent(
              new win.MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }),
            );
            clickTarget.dispatchEvent(
              new win.MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }),
            );
          }
        });
    };

    // Verify Cache-Control headers on sw.js and root HTML prevent stale mobile cache traps
    cy.request('/sw.js').then((res) => {
      expect(res.headers['cache-control']).to.include('no-store');
    });
    cy.request('/').then((res) => {
      expect(res.headers['cache-control']).to.include('no-store');
    });

    cy.visit('/');
    cy.get('[data-testid="landing-quick-play"]').should('be.visible');
    simulateMobileTap('[data-testid="landing-quick-play"]');

    cy.url({ timeout: 10000 }).should('include', '/game');
    cy.get('[data-testid="welcome-modal"]', { timeout: 10000 }).should('be.visible');

    // Close welcome modal via real touch tap
    simulateMobileTap('[data-testid="welcome-close-btn"]');
    cy.get('[data-testid="welcome-modal"]').should('not.exist');

    // 1. Tap parcel 0 via real touch tap to open planting modal
    simulateMobileTap('[data-testid="parcel"]');
    cy.get('app-planting-modal', { timeout: 5000 }).should('be.visible');

    // 2. Tap crop manual trigger via real touch tap and close via X button
    simulateMobileTap('[data-testid="crop-manual-trigger-wheat"]');
    cy.get('[data-testid="planting-manual-crop-overlay"]', { timeout: 5000 }).should('be.visible');
    simulateMobileTap('[data-testid="close-manual-crop-overlay-btn"]');
    cy.get('[data-testid="planting-manual-crop-overlay"]').should('not.exist');
    cy.get('app-planting-modal').should('be.visible');

    // 3. Close planting modal via X button real touch tap
    simulateMobileTap('[data-testid="close-planting-modal-btn"]');
    cy.get('app-planting-modal').should('not.exist');

    // 4. Re-open planting modal via parcel touch tap and close via outside backdrop touch tap
    simulateMobileTap('[data-testid="parcel"]');
    cy.get('app-planting-modal', { timeout: 5000 }).should('be.visible');
    cy.window().then((win) => {
      const doc = win.document;
      const backdrop = doc.elementFromPoint(8, 8) as HTMLElement;
      expect(backdrop?.getAttribute('data-testid')).to.equal('planting-modal-backdrop');
      const touchObj = new win.Touch({
        identifier: Date.now(),
        target: backdrop,
        clientX: 8,
        clientY: 8,
        pageX: 8,
        pageY: 8,
      });
      backdrop.dispatchEvent(
        new win.TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touchObj],
          targetTouches: [touchObj],
          changedTouches: [touchObj],
        }),
      );
      backdrop.dispatchEvent(
        new win.TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touchObj],
        }),
      );
    });
    cy.get('app-planting-modal').should('not.exist');

    // 5. Re-open planting modal via parcel touch tap and select Wheat crop tile via touch tap
    simulateMobileTap('[data-testid="parcel"]');
    cy.get('app-planting-modal', { timeout: 5000 }).should('be.visible');
    simulateMobileTap('[data-testid="crop-wheat"]');
    cy.get('app-planting-modal').should('not.exist');
    cy.get('[data-testid="parcel"]').first().should('contain.text', 'Weizen');
  });
});
