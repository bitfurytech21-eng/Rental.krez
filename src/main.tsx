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
  console.log('[main.tsx] Attempting to create root and render App...');
  const root = createRoot(container);
  root.render(<App />);
  console.log('[main.tsx] App successfully rendered to root.');
} catch (err: any) {
  console.error('[main.tsx] Error rendering App component:', err);
  // Build the fallback notice with safe DOM APIs instead of innerHTML so that an
  // error message containing markup cannot be injected into the page.
  container.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.setAttribute(
    'style',
    'min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #080808; color: #ffffff; font-family: sans-serif; padding: 24px; text-align: center;'
  );
  const heading = document.createElement('h2');
  heading.setAttribute('style', 'color: #ff4d4d; font-size: 20px; font-weight: bold; margin-bottom: 8px;');
  heading.textContent = 'Render Notice';
  const message = document.createElement('p');
  message.setAttribute('style', 'color: #d0d0d0; max-width: 520px; font-size: 14px; margin-bottom: 18px; line-height: 1.5;');
  message.textContent = err?.message || String(err);
  const reloadBtn = document.createElement('button');
  reloadBtn.setAttribute('style', 'background: #ffffff; color: #000000; font-weight: 700; border: none; padding: 10px 20px; border-radius: 9999px; cursor: pointer;');
  reloadBtn.textContent = 'Reload Application';
  reloadBtn.addEventListener('click', () => window.location.reload());
  wrapper.appendChild(heading);
  wrapper.appendChild(message);
  wrapper.appendChild(reloadBtn);
  container.appendChild(wrapper);
}
