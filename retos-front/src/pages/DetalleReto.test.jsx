import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DetalleReto from './DetalleReto.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { retosApi, registrosApi, usuariosApi, empresasApi, categoriasApi, prioridadesApi } from '../services/api.js';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../services/api.js', () => ({
  retosApi: { obtener: vi.fn() },
  registrosApi: { listar: vi.fn(), actualizar: vi.fn(), crear: vi.fn() },
  usuariosApi: { listar: vi.fn() },
  empresasApi: { listar: vi.fn() },
  categoriasApi: { listar: vi.fn() },
  prioridadesApi: { listar: vi.fn() },
}));

const RETO = {
  id: 1,
  nombre: 'Reto de IA',
  descripcion: 'Clasificar cultivos',
  estado: 'Abierto',
  empresaId: 1,
  categoriaId: 1,
  prioridadId: 1,
  fechaInicio: '2026-12-01',
  fechaFin: '2026-12-31',
};

const REGISTROS = [
  { id: 10, usuarioId: 2, retoId: 1, estado: 'Pendiente', fechaRegistro: '2026-11-05', observacion: 'Me interesa' },
  { id: 11, usuarioId: 3, retoId: 99, estado: 'Pendiente', fechaRegistro: '2026-11-06', observacion: '' }, // de otro reto
];

function renderDetalle(usuario) {
  const contexto = { usuario }; // objeto estable entre renders
  useAuth.mockReturnValue(contexto);
  return render(
    <MemoryRouter initialEntries={['/retos/1']}>
      <Routes>
        <Route path="/retos/:id" element={<DetalleReto />} />
      </Routes>
    </MemoryRouter>
  );
}

const participante = { id: 5, nombre: 'Ana', rol: 'Participante' };
const evaluador = { id: 6, nombre: 'Eva', rol: 'Evaluador' };
const admin = { id: 7, nombre: 'Admin', rol: 'Administrador' };

describe('DetalleReto', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    retosApi.obtener.mockResolvedValue(RETO);
    registrosApi.listar.mockResolvedValue(REGISTROS);
    usuariosApi.listar.mockResolvedValue([{ id: 2, nombre: 'Luis', correo: 'luis@correo.com' }]);
    empresasApi.listar.mockResolvedValue([{ id: 1, nombre: 'Acme' }]);
    categoriasApi.listar.mockResolvedValue([{ id: 1, nombre: 'Tecnología' }]);
    prioridadesApi.listar.mockResolvedValue([{ id: 1, nombre: 'Alta' }]);
  });

  it('muestra el detalle del reto y los nombres de sus catálogos', async () => {
    renderDetalle(participante);
    expect(await screen.findByRole('heading', { name: 'Reto de IA' })).toBeInTheDocument();
    expect(screen.getByText('Clasificar cultivos')).toBeInTheDocument();
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Tecnología')).toBeInTheDocument();
    expect(screen.getByText('2026-12-01')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Reto de IA · Nexo Retos'));
  });

  it('si el reto no se puede cargar muestra el error', async () => {
    retosApi.obtener.mockRejectedValue(new Error('Reto no encontrado'));
    renderDetalle(participante);
    expect(await screen.findByText('Reto no encontrado')).toBeInTheDocument();
  });

  describe('como Participante', () => {
    it('puede inscribirse y luego ve su estado', async () => {
      const user = userEvent.setup();
      registrosApi.listar.mockResolvedValue([]);
      registrosApi.crear.mockResolvedValue({ id: 20, usuarioId: 5, retoId: 1, estado: 'Pendiente' });
      renderDetalle(participante);

      await user.type(await screen.findByLabelText(/Cuéntanos brevemente/), 'Quiero participar');
      await user.click(screen.getByRole('button', { name: 'Inscribirme' }));

      expect(registrosApi.crear).toHaveBeenCalledWith({ retoId: '1', observacion: 'Quiero participar' });
      expect(await screen.findByText(/Ya estás inscrito en este reto/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inscribirme' })).not.toBeInTheDocument();
    });

    it('si ya estaba inscrito no ve el botón de inscribirse', async () => {
      registrosApi.listar.mockResolvedValue([
        { id: 30, usuarioId: 5, retoId: 1, estado: 'Aprobado' },
      ]);
      renderDetalle(participante);
      expect(await screen.findByText(/Ya estás inscrito en este reto/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inscribirme' })).not.toBeInTheDocument();
    });

    it('si el reto no está abierto el botón dice "Inscripciones cerradas" y está deshabilitado', async () => {
      retosApi.obtener.mockResolvedValue({ ...RETO, estado: 'Cerrado' });
      registrosApi.listar.mockResolvedValue([]);
      renderDetalle(participante);
      expect(await screen.findByRole('button', { name: 'Inscripciones cerradas' })).toBeDisabled();
    });

    it('no ve la tabla de participantes ni el botón de editar', async () => {
      renderDetalle(participante);
      await screen.findByRole('heading', { name: 'Reto de IA' });
      expect(screen.queryByText(/Participantes registrados/)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Editar reto' })).not.toBeInTheDocument();
    });
  });

  describe('como Evaluador / Administrador', () => {
    it('el evaluador ve solo los participantes de ESTE reto, sin botón de editar', async () => {
      renderDetalle(evaluador);
      expect(await screen.findByText('Participantes registrados (1)')).toBeInTheDocument();
      expect(await screen.findByText('Luis')).toBeInTheDocument();
      expect(screen.getByText('luis@correo.com')).toBeInTheDocument();
      expect(screen.getByText('Me interesa')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Editar reto' })).not.toBeInTheDocument();
    });

    it('el administrador ve el enlace para editar el reto', async () => {
      renderDetalle(admin);
      expect(await screen.findByRole('link', { name: 'Editar reto' })).toHaveAttribute('href', '/retos/1/editar');
    });

    it('sin inscritos muestra un mensaje', async () => {
      registrosApi.listar.mockResolvedValue([]);
      renderDetalle(evaluador);
      expect(await screen.findByText('Todavía nadie se ha registrado en este reto.')).toBeInTheDocument();
    });

    it('aprobar una inscripción llama a la API y deshabilita el botón', async () => {
      const user = userEvent.setup();
      registrosApi.actualizar.mockResolvedValue({});
      renderDetalle(evaluador);

      await user.click(await screen.findByRole('button', { name: 'Aprobar' }));

      expect(registrosApi.actualizar).toHaveBeenCalledWith(10, { estado: 'Aprobado' });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Aprobar' })).toBeDisabled());
      expect(screen.getByRole('button', { name: 'Rechazar' })).toBeEnabled();
    });

    it('si falla el cambio de estado muestra el error', async () => {
      const user = userEvent.setup();
      registrosApi.actualizar.mockRejectedValue(new Error('No se pudo actualizar'));
      renderDetalle(evaluador);

      await user.click(await screen.findByRole('button', { name: 'Rechazar' }));

      expect(await screen.findByText('No se pudo actualizar')).toBeInTheDocument();
    });
  });
});
