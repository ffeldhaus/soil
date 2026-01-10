import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  e2e: {
    baseUrl: 'http://localhost:4200',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
  },
});
