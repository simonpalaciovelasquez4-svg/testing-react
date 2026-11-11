import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RetoCard from './RetoCard.jsx';

const reto = {
  id: 7,
  nombre: 'Reto de IA',
  descripcion: 'Clasificar imágenes de cultivos',
  estado: 'Abierto',
  fechaFin: '2026-12-31T00:00:00.000Z',
};

// RetoCard usa <Link>, así que necesita un Router alrededor.
const renderCard = (props) =>
  render(
    <MemoryRouter>
      <RetoCard reto={reto} {...props} />
    </MemoryRouter>
  );

describe('RetoCard', () => {
  it('muestra los datos del reto y enlaza al detalle', () => {
    renderCard({
      empresa: { nombre: 'Acme' },
      categoria: { nombre: 'Tecnología' },
      prioridad: { nombre: 'Alta' },
    });
    expect(screen.getByRole('link', { name: 'Reto de IA' })).toHaveAttribute('href', '/retos/7');
    expect(screen.getByText('Clasificar imágenes de cultivos')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Tecnología')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
  });

  it('recorta la fecha a YYYY-MM-DD', () => {
    renderCard();
    expect(screen.getByText('2026-12-31')).toBeInTheDocument();
  });

  it('muestra una raya cuando faltan empresa, categoría, prioridad o fecha', () => {
    render(
      <MemoryRouter>
        <RetoCard reto={{ ...reto, fechaFin: undefined }} />
      </MemoryRouter>
    );
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('oculta Editar y Eliminar si no puede administrar', () => {
    renderCard();
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });

  it('con permisos muestra Editar y Eliminar, y Eliminar avisa con el reto', async () => {
    const user = userEvent.setup();
    const onEliminar = vi.fn();
    renderCard({ puedeAdministrar: true, onEliminar });
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/retos/7/editar');
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onEliminar).toHaveBeenCalledWith(reto);
  });
});
