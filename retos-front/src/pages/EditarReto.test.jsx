import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EditarReto from './EditarReto.jsx';
import { retosApi, empresasApi, categoriasApi, prioridadesApi } from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  retosApi: { obtener: vi.fn(), actualizar: vi.fn() },
  empresasApi: { listar: vi.fn() },
  categoriasApi: { listar: vi.fn() },
  prioridadesApi: { listar: vi.fn() },
}));

const RETO = {
  id: 5,
  nombre: 'Reto de IA',
  descripcion: 'Clasificar cultivos',
  empresaId: 1,
  categoriaId: 2,
  prioridadId: 3,
  fechaInicio: '2026-12-01T00:00:00.000Z',
  fechaFin: '2026-12-31T00:00:00.000Z',
  estado: 'Abierto',
};

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/retos/5/editar']}>
      <Routes>
        <Route path="/retos/:id/editar" element={<EditarReto />} />
        <Route path="/retos/:id" element={<p>Pantalla de detalle</p>} />
      </Routes>
    </MemoryRouter>
  );

describe('EditarReto', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    retosApi.obtener.mockResolvedValue(RETO);
    empresasApi.listar.mockResolvedValue([{ id: 1, nombre: 'Acme' }]);
    categoriasApi.listar.mockResolvedValue([{ id: 2, nombre: 'Tecnología' }]);
    prioridadesApi.listar.mockResolvedValue([{ id: 3, nombre: 'Alta' }]);
  });

  it('pide el reto por id y precarga el formulario (fechas recortadas)', async () => {
    renderPagina();
    expect(await screen.findByLabelText('Nombre del reto')).toHaveValue('Reto de IA');
    expect(retosApi.obtener).toHaveBeenCalledWith('5');
    expect(screen.getByLabelText('Empresa')).toHaveValue('1');
    expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('2026-12-01');
    expect(screen.getByLabelText('Fecha de cierre')).toHaveValue('2026-12-31');
  });

  it('guarda los cambios con los campos permitidos y vuelve al detalle', async () => {
    const user = userEvent.setup();
    retosApi.actualizar.mockResolvedValue({});
    renderPagina();

    const nombre = await screen.findByLabelText('Nombre del reto');
    await user.clear(nombre);
    await user.type(nombre, 'Reto renombrado');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // "id" no se envía: soloCampos deja pasar solo CAMPOS_RETO
    expect(retosApi.actualizar).toHaveBeenCalledWith('5', {
      nombre: 'Reto renombrado',
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

  it('si no encuentra el reto muestra el error y no el formulario', async () => {
    retosApi.obtener.mockRejectedValue(new Error('Reto no encontrado'));
    renderPagina();
    expect(await screen.findByText('Reto no encontrado')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre del reto')).not.toBeInTheDocument();
  });

  it('si falla al guardar muestra el error y deja reintentar', async () => {
    const user = userEvent.setup();
    retosApi.actualizar.mockRejectedValue(new Error('No autorizado'));
    renderPagina();

    await screen.findByLabelText('Nombre del reto');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('No autorizado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });
});
