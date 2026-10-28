import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Global browser mocks for SSR testing
globalThis.window = {
  speechSynthesis: { cancel: () => {}, speak: () => {} },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};
globalThis.localStorage = globalThis.window.localStorage;

try {
  const App = (await import('../src/App.jsx')).default;
  console.log("App component imported successfully.");
  const html = ReactDOMServer.renderToString(React.createElement(App));
  console.log("RENDER SUCCESSFUL! HTML length:", html.length);
  console.log("Snippet:", html.slice(0, 300));
} catch (err) {
  console.error(">>> RENDER CRASHED WITH ERROR <<<");
  console.error(err);
}
