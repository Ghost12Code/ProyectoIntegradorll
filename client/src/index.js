// Bloqueo total y agresivo del error inofensivo de ResizeObserver para que nunca más aparezca
const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver')) return;
  originalError.call(console, ...args);
};
window.addEventListener('error', e => {
  if (e.message && e.message.includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

//react
import React from "react";
import ReactDOM from "react-dom";

//third party
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

//project Import
import { store, persister } from "./store";
//import { createRoot } from "react-dom/client";
//import * as serviceWorker from './serviceWorker';
import App from "./App";
import config from "./config";

//css
import "./index.css";

//-----------------------|| REACT DOM RENDER  ||-----------------------//

ReactDOM.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persister}>
      <BrowserRouter basename={config.basename}>
        <App />
      </BrowserRouter>
    </PersistGate>
  </Provider>,
  document.getElementById("root")
);
