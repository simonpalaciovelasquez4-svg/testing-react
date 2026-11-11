import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NuevoReto from './NuevoReto.jsx';
import { retosApi, empresasApi, categoriasApi, prioridadesApi } from '../services/api.js';

// Se simula solo la parte de red; soloCampos y CAMPOS_RETO son los reales.
vi.mock('../services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  retosApi: { crear: vi.fn() },
  empresasApi: { listar: vi.fn() },
  categoriasApi: { listar: vi.fn() },
  prioridadesApi: { listar: vi.fn() },
}));

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/retos/nuevo']}>
      <Routes>
        <Route path="/retos/nuevo" element={<NuevoReto />} />
        <Route path="/retos/:id" element={<p>Pantalla de detalle</p>} />
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>
    </MemoryRouter>
  );

async function llenarFormulario(user) {
  await user.type(await screen.findByLabelText('Nombre del reto'), 'Reto de IA');
  await user.type(screen.getByLabelText('Descripción'), 'Clasificar cultivos');
  await user.selectOptions(screen.getByLabelText('Empresa'), '1');
  await user.selectOptions(screen.getByLabelText('Categoría'), '2');
  await user.selectOptions(screen.getByLabelText('Prioridad'), '3');
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-12-01' } });
  fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2026-12-31' } });
}

describe('NuevoReto', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    empresasApi.listar.mockResolvedValue([{ id: 1, nombre: 'Acme' }]);
    categoriasApi.listar.mockResolvedValue([{ id: 2, nombre: 'Tecnología' }]);
    prioridadesApi.listar.mockResolvedValue([{ id: 3, nombre: 'Alta' }]);
  });

  it('muestra "Cargando…" y luego el formulario', async () => {
    renderPagina();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(await screen.findByLabelText('Nombre del reto')).toBeInTheDocument();
    expect(document.title).toBe('Publicar reto · Nexo Retos');
  });

  it('crea el reto con los campos permitidos y navega a su detalle', async () => {
    const user = userEvent.setup();
    retosApi.crear.mockResolvedValue({ id: 9 });
    renderPagina();
    await llenarFormulario(user);
    await user.click(screen.getByRole('button', { name: 'Publicar reto' }));

    expect(retosApi.crear).toHaveBeenCalledWith({
      nombre: 'Reto de IA',
      descripcion: 'Clasificar cultivos',
      empresaId: '1',
      categoriaId: '2',
      prioridadId: '3',
      fechaInicio: '2026-12-01',
      fechaFin: '2026-12-31',
      estado: 'Abierto',
    });
    expect(await screen.findByText('Pantalla de detalle')).toBeInTheDocument();
  });

  it('si el backend responde con error lo muestra y permite reintentar', async () => {
    const user = userEvent.setup();
    retosApi.crear.mockRejectedValue(new Error('Datos inválidos'));
    renderPagina();
    await llenarFormulario(user);
    await user.click(screen.getByRole('button', { name: 'Publicar reto' }));

    expect(await screen.findByText('Datos inválidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar reto' })).toBeEnabled();
  });

  it('muestra el error si fallan los catálogos', async () => {
    empresasApi.listar.mockRejectedValue(new Error('Sin conexión'));
    renderPagina();
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  });
});
