import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

globalThis.window = {
  speechSynthesis: { cancel: () => {}, speak: () => {} },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};
globalThis.localStorage = globalThis.window.localStorage;

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom'
});

try {
  const { default: App } = await vite.ssrLoadModule('./src/App.jsx');
  console.log("SUCCESSFULLY LOADED APP MODULE!");
  const html = ReactDOMServer.renderToString(React.createElement(App));
  console.log("SUCCESSFULLY RENDERED APP TO STRING! HTML length:", html.length);
  console.log("First 200 chars:", html.slice(0, 200));
} catch (e) {
  console.error(">>> ERROR DURING APP RENDER <<<");
  console.error(e);
} finally {
  await vite.close();
}
