import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { installAutoReload } from './lib/auto-refresh';
import './app/globals.css';
import './styles/hljs.css';

installAutoReload();

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
}, { capture: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
