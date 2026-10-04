import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AdminApp } from './AdminApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <AdminApp />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>,
);
