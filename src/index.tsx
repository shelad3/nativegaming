import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PremiumThemeProvider } from './components/PremiumThemeProvider';
import { SocketProvider } from './context/SocketContext';

// Top-level crash detection
window.addEventListener('error', (event) => {
  console.error('[CRITICAL_UNCAUGHT]', event.error);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  console.log('⚛️ Attempting to mount React root...');
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
  console.log('✅ React mount command issued');
} catch (err) {
  console.error('[MOUNT_FAILURE]', err);
  rootElement.innerHTML = `
    <div style="background:#050505; color:#ef4444; font-family:monospace; padding:20px; text-align:center; height:100vh; display:flex; flex-direction:column; justify-content:center;">
      <h1 style="font-size:12px; margin-bottom:10px;">SYSTEM_MOUNT_FAILURE</h1>
      <p style="font-size:10px; opacity:0.7;">Check console for uplink diagnostics.</p>
    </div>
  `;
}
