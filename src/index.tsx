
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PremiumThemeProvider } from './components/PremiumThemeProvider';
import { SocketProvider } from './context/SocketContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PremiumThemeProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </PremiumThemeProvider>
  </React.StrictMode>
);
