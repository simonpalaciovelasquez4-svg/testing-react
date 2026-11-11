import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Cargando from './Cargando.jsx';

describe('Cargando', () => {
  it('muestra el texto por defecto y el spinner accesible', () => {
    render(<Cargando />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('acepta un texto personalizado', () => {
    render(<Cargando texto="Verificando sesión…" />);
    expect(screen.getByText('Verificando sesión…')).toBeInTheDocument();
  });
});
