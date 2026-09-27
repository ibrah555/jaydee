import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { initializeDemoUsers, initializeDefaultAttributes } from './services/initializeDB';

// Initialize users and default attributes on app start
initializeDemoUsers();
initializeDefaultAttributes();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
