import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n/index.ts';
import './styles/base.css';
import { App } from './App.tsx';
import { applyTheme, readTheme } from './ui/theme.ts';

applyTheme(readTheme());
const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
