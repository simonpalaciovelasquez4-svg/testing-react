import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { retosApi, empresasApi, categoriasApi, prioridadesApi } from '../services/api.js';

// Prueba de integración: Dashboard + RetoCard + ConfirmModal + useCatalogos reales,
// pero SIN backend: la capa de API está simulada.
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../services/api.js', () => {
  const crud = () => ({ listar: vi.fn(), eliminar: vi.fn() });
  return {
    retosApi: crud(),
    empresasApi: crud(),
    categoriasApi: crud(),
    prioridadesApi: crud(),
  };
});

const RETOS = [
  { id: 1, nombre: 'Reto de IA', descripcion: 'Clasificar cultivos', estado: 'Abierto', empresaId: 1, categoriaId: 1, prioridadId: 1, fechaFin: '2026-12-31' },
  { id: 2, nombre: 'Reto blockchain', descripcion: 'Trazabilidad de lotes', estado: 'En revisión', empresaId: 2, categoriaId: 1, prioridadId: 1, fechaFin: '2026-11-30' },
  { id: 3, nombre: 'Reto de datos', descripcion: 'Limpiar ventas', estado: 'Cerrado', empresaId: 1, categoriaId: 1, prioridadId: 1, fechaFin: '2026-10-01' },
];

function renderDashboard(rol = 'Participante') {
  useAuth.mockReturnValue({ usuario: { nombre: 'Ana', rol } });
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    retosApi.listar.mockResolvedValue(RETOS);
    empresasApi.listar.mockResolvedValue([{ id: 1, nombre: 'Acme' }, { id: 2, nombre: 'Globex' }]);
    categoriasApi.listar.mockResolvedValue([{ id: 1, nombre: 'Tecnología' }]);
    prioridadesApi.listar.mockResolvedValue([{ id: 1, nombre: 'Alta' }]);
  });

  it('carga y muestra los retos con el conteo por estado', async () => {
    renderDashboard();
    expect(await screen.findByRole('link', { name: 'Reto de IA' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reto blockchain' })).toBeInTheDocument();
    expect(screen.getByText('1 abiertos · 1 en revisión · 1 cerrados')).toBeInTheDocument();
  });

  it('muestra el error si la API falla', async () => {
    retosApi.listar.mockRejectedValue(new Error('Servidor caído'));
    renderDashboard();
    expect(await screen.findByText('Servidor caído')).toBeInTheDocument();
  });

  it('busca por texto (nombre o descripción)', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByRole('link', { name: 'Reto de IA' });

    await user.type(screen.getByPlaceholderText(/Buscar por nombre/), 'trazabilidad');

    expect(screen.getByRole('link', { name: 'Reto blockchain' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reto de IA' })).not.toBeInTheDocument();
  });

  it('muestra un mensaje cuando ningún reto coincide', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByRole('link', { name: 'Reto de IA' });

    await user.type(screen.getByPlaceholderText(/Buscar por nombre/), 'zzzz');

    expect(screen.getByText('Ningún reto coincide con tu búsqueda.')).toBeInTheDocument();
  });

  it('filtra por estado', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByRole('link', { name: 'Reto de IA' });

    await user.selectOptions(screen.getByDisplayValue('Todos los estados'), 'Cerrado');

    expect(screen.getByRole('link', { name: 'Reto de datos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reto de IA' })).not.toBeInTheDocument();
  });

  it('filtra por empresa', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByRole('option', { name: 'Globex' }); // espera a los catálogos

    await user.selectOptions(screen.getByDisplayValue('Todas las empresas'), '2');

    expect(screen.getByRole('link', { name: 'Reto blockchain' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reto de IA' })).not.toBeInTheDocument();
  });

  it('el atajo "/" enfoca el buscador', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await screen.findByRole('link', { name: 'Reto de IA' });

    await user.keyboard('/');

    expect(screen.getByPlaceholderText(/Buscar por nombre/)).toHaveFocus();
  });

  it('cada rol ve su panel y solo quien puede publica retos', async () => {
    const { unmount } = renderDashboard('Participante');
    await screen.findByRole('link', { name: 'Reto de IA' });
    expect(screen.getByText('Panel de usuario')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Publicar reto' })).not.toBeInTheDocument();
    unmount();

    renderDashboard('Administrador');
    await screen.findByRole('link', { name: 'Reto de IA' });
    expect(screen.getByText('Panel de administración')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Publicar reto' })).toBeInTheDocument();
  });

  it('el administrador elimina un reto tras confirmar en el modal', async () => {
    const user = userEvent.setup();
    retosApi.eliminar.mockResolvedValue(null);
    renderDashboard('Administrador');
    await screen.findByRole('link', { name: 'Reto de IA' });

    await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Reto de IA')).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Eliminar' }));

    expect(retosApi.eliminar).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Reto de IA' })).not.toBeInTheDocument()
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancelar el modal no elimina nada', async () => {
    const user = userEvent.setup();
    renderDashboard('Administrador');
    await screen.findByRole('link', { name: 'Reto de IA' });

    await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(retosApi.eliminar).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Reto de IA' })).toBeInTheDocument();
  });
});
