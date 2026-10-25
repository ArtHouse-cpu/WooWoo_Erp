import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App';
import { MembershipProvider } from './context/MembershipContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <MembershipProvider>
    <App />
    </MembershipProvider>
  </StrictMode>,
);
