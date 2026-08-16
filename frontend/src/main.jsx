import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/error-boundary.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);