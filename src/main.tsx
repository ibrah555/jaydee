import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { initializeDemoUsers, initializeDemoProducts, initializeDemoTransactions } from './services/initializeDB';

// Initialize demo data on app start
initializeDemoUsers();
initializeDemoProducts();
initializeDemoTransactions();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
