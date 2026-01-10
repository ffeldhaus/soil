// Hide fetch/XHR requests from command log
const app = window.top;
if (app && !app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML = `
    .command-name-request,
    .command-name-xhr,
    .command-name-fetch {
      display: none;
    }
  `;
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Suppress Firestore long-polling logs in console
const origLog = window.console.log;
window.console.log = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Firestore') && args[0].includes('Listen')) {
    return;
  }
  origLog(...args);
};
