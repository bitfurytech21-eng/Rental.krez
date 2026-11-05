import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './PrintStyles.css';
import './i18n/config';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Fatal: #root element not found in DOM.');
}

try {
  const root = createRoot(container);
  root.render(<App />);
} catch (err: any) {
  console.error('[main.tsx] Error rendering App component:', err);
  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #080808; color: #ffffff; font-family: sans-serif; padding: 24px; text-align: center;">
      <h2 style="color: #ff4d4d; font-size: 20px; font-weight: bold; margin-bottom: 8px;">Render Notice</h2>
      <p style="color: #d0d0d0; max-width: 520px; font-size: 14px; margin-bottom: 18px; line-height: 1.5;">${err?.message || String(err)}</p>
      <button onclick="window.location.reload()" style="background: #ffffff; color: #000000; font-weight: 700; border: none; padding: 10px 20px; border-radius: 9999px; cursor: pointer;">Reload Application</button>
    </div>
  `;
}
