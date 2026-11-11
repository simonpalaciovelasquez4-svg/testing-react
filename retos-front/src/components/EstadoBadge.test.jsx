import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstadoBadge from './EstadoBadge.jsx';

describe('EstadoBadge', () => {
  it('muestra el estado con el color correspondiente', () => {
    render(<EstadoBadge estado="Abierto" />);
    expect(screen.getByText('Abierto')).toHaveClass('badge', 'text-bg-success');
  });

  it.each([
    ['En revisión', 'text-bg-warning'],
    ['Cerrado', 'text-bg-dark'],
    ['Rechazado', 'text-bg-danger'],
  ])('el estado %s usa la clase %s', (estado, clase) => {
    render(<EstadoBadge estado={estado} />);
    expect(screen.getByText(estado)).toHaveClass(clase);
  });

  it('usa el color secundario si el estado no es conocido', () => {
    render(<EstadoBadge estado="Raro" />);
    expect(screen.getByText('Raro')).toHaveClass('text-bg-secondary');
  });

  it('muestra una raya si no hay estado', () => {
    render(<EstadoBadge />);
    expect(screen.getByText('—')).toHaveClass('text-bg-secondary');
  });
});
