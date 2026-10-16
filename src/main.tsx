import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import * as store from './ui/store';
import './ui/styles.css';

if (import.meta.env.DEV) (window as unknown as { __owc: typeof store }).__owc = store;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
