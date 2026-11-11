import '@testing-library/jest-dom/vitest'; // agrega toBeInTheDocument, toHaveClass, toBeDisabled...
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Después de cada prueba: desmontar lo renderizado y limpiar la sesión simulada.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
