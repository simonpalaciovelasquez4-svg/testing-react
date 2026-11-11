import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GestionEntidad from './GestionEntidad.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { empresasApi, categoriasApi, prioridadesApi, registrosApi, retosApi, usuariosApi } from '../services/api.js';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../services/api.js', async (importOriginal) => {
  const crud = () => ({ listar: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn() });
  return {
    ...(await importOriginal()),
    empresasApi: crud(),
    categoriasApi: crud(),
    prioridadesApi: crud(),
    registrosApi: crud(),
    retosApi: crud(),
    usuariosApi: crud(),
  };
});

const admin = { id: 1, nombre: 'Admin', rol: 'Administrador' };
const evaluador = { id: 2, nombre: 'Eva', rol: 'Evaluador' };
const participante = { id: 3, nombre: 'Ana', rol: 'Participante' };

const EMPRESA = { id: 1, nombre: 'Acme', nit: '900', sector: 'Tech', contacto: 'Ana', correo: 'a@a.com', telefono: '123' };

function renderGestion(recurso, usuario = admin) {
  const contexto = { usuario }; // objeto estable: evita bucles en useCallback/useEffect
  useAuth.mockReturnValue(contexto);
  return render(
    <MemoryRouter initialEntries={[`/gestion/${recurso}`]}>
      <Routes>
        <Route path="/gestion/:recurso" element={<GestionEntidad />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GestionEntidad', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    empresasApi.listar.mockResolvedValue([EMPRESA]);
    categoriasApi.listar.mockResolvedValue([]);
    prioridadesApi.listar.mockResolvedValue([]);
  });

  it('un recurso que no existe muestra un aviso', () => {
    renderGestion('nada');
    expect(screen.getByText(/Ese módulo no existe/)).toBeInTheDocument();
  });

  it('lista los elementos en una tabla', async () => {
    renderGestion('empresas');
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'NIT' })).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(document.title).toBe('Empresas · Nexo Retos');
  });

  it('con la lista vacía muestra un mensaje', async () => {
    empresasApi.listar.mockResolvedValue([]);
    renderGestion('empresas');
    expect(await screen.findByText('Todavía no hay empresas.')).toBeInTheDocument();
  });

  it('si falla la carga muestra la alerta de error', async () => {
    empresasApi.listar.mockRejectedValue(new Error('Servidor caído'));
    renderGestion('empresas');
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor caído');
  });

  describe('permisos por rol', () => {
    it('el participante solo consulta: sin crear ni acciones', async () => {
      renderGestion('empresas', participante);
      await screen.findByText('Acme');
      expect(screen.queryByRole('button', { name: /Crear/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument();
    });

    it('el evaluador puede crear categorías pero no editar ni eliminar', async () => {
      categoriasApi.listar.mockResolvedValue([{ id: 1, nombre: 'Tecnología', descripcion: 'Retos tech' }]);
      renderGestion('categorias', evaluador);
      await screen.findByText('Tecnología');
      expect(screen.getByRole('button', { name: 'Crear categoría' })).toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument();
    });

    it('el administrador ve crear, editar y eliminar', async () => {
      renderGestion('empresas', admin);
      await screen.findByText('Acme');
      expect(screen.getByRole('button', { name: 'Crear empresa' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
    });
  });

  describe('crear', () => {
    it('crea una empresa y recarga la lista', async () => {
      const user = userEvent.setup();
      empresasApi.crear.mockResolvedValue({});
      renderGestion('empresas');
      await screen.findByText('Acme');

      await user.click(screen.getByRole('button', { name: 'Crear empresa' }));
      expect(screen.getByRole('heading', { name: 'Crear empresa' })).toBeInTheDocument();

      await user.type(screen.getByLabelText('Nombre'), 'Globex');
      await user.type(screen.getByLabelText('NIT'), '800');
      await user.type(screen.getByLabelText('Sector'), 'Agro');
      await user.type(screen.getByLabelText('Contacto'), 'Luis');
      await user.type(screen.getByLabelText('Correo'), 'luis@globex.com');
      await user.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(empresasApi.crear).toHaveBeenCalledWith({
        nombre: 'Globex', nit: '800', sector: 'Agro', contacto: 'Luis', correo: 'luis@globex.com', telefono: '',
      });
      await screen.findByText('Acme');
      expect(empresasApi.listar).toHaveBeenCalledTimes(2); // carga inicial + recarga
      expect(screen.queryByRole('heading', { name: 'Crear empresa' })).not.toBeInTheDocument();
    });

    it('en prioridades convierte el nivel a número', async () => {
      const user = userEvent.setup();
      prioridadesApi.crear.mockResolvedValue({});
      renderGestion('prioridades');
      await screen.findByText('Todavía no hay prioridades.');

      await user.click(screen.getByRole('button', { name: 'Crear prioridad' }));
      await user.type(screen.getByLabelText('Nombre'), 'Alta');
      await user.type(screen.getByLabelText('Nivel'), '2');
      await user.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(prioridadesApi.crear).toHaveBeenCalledWith({ nombre: 'Alta', nivel: 2 });
    });

    it('cancelar cierra el formulario sin llamar a la API', async () => {
      const user = userEvent.setup();
      renderGestion('empresas');
      await screen.findByText('Acme');

      await user.click(screen.getByRole('button', { name: 'Crear empresa' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('heading', { name: 'Crear empresa' })).not.toBeInTheDocument();
      expect(empresasApi.crear).not.toHaveBeenCalled();
    });

    it('si el backend rechaza, muestra el error y deja el formulario abierto', async () => {
      const user = userEvent.setup();
      empresasApi.crear.mockRejectedValue(new Error('NIT duplicado'));
      renderGestion('empresas');
      await screen.findByText('Acme');

      await user.click(screen.getByRole('button', { name: 'Crear empresa' }));
      await user.type(screen.getByLabelText('Nombre'), 'X');
      await user.type(screen.getByLabelText('NIT'), '1');
      await user.type(screen.getByLabelText('Sector'), 'X');
      await user.type(screen.getByLabelText('Contacto'), 'X');
      await user.type(screen.getByLabelText('Correo'), 'x@x.com');
      await user.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('NIT duplicado');
      expect(screen.getByRole('heading', { name: 'Crear empresa' })).toBeInTheDocument();
    });
  });

  describe('editar y eliminar', () => {
    it('edita una empresa: precarga los datos y envía el cambio con su id', async () => {
      const user = userEvent.setup();
      empresasApi.actualizar.mockResolvedValue({});
      renderGestion('empresas');

      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      expect(screen.getByRole('heading', { name: 'Editar empresa' })).toBeInTheDocument();
      const nombre = screen.getByLabelText('Nombre');
      expect(nombre).toHaveValue('Acme');

      await user.clear(nombre);
      await user.type(nombre, 'Acme SAS');
      await user.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(empresasApi.actualizar).toHaveBeenCalledWith(1, {
        nombre: 'Acme SAS', nit: '900', sector: 'Tech', contacto: 'Ana', correo: 'a@a.com', telefono: '123',
      });
    });

    it('elimina tras confirmar en el modal', async () => {
      const user = userEvent.setup();
      empresasApi.eliminar.mockResolvedValue(null);
      renderGestion('empresas');

      await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText('Eliminar empresa')).toBeInTheDocument();
      expect(within(modal).getByText('Acme')).toBeInTheDocument();
      await user.click(within(modal).getByRole('button', { name: 'Eliminar' }));

      expect(empresasApi.eliminar).toHaveBeenCalledWith(1);
      await screen.findByText('Acme'); // la recarga (mock) vuelve a traer la lista
      expect(empresasApi.listar).toHaveBeenCalledTimes(2);
    });

    it('si falla al eliminar muestra el error y cierra el modal', async () => {
      const user = userEvent.setup();
      empresasApi.eliminar.mockRejectedValue(new Error('Tiene retos asociados'));
      renderGestion('empresas');

      await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Tiene retos asociados');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('inscripciones (registros)', () => {
    beforeEach(() => {
      registrosApi.listar.mockResolvedValue([
        { id: 1, usuarioId: 2, retoId: 1, fechaRegistro: '2026-11-05T00:00:00.000Z', estado: 'Pendiente', observacion: '' },
      ]);
      retosApi.listar.mockResolvedValue([{ id: 1, nombre: 'Reto de IA' }]);
      usuariosApi.listar.mockResolvedValue([{ id: 2, nombre: 'Luis' }]);
    });

    it('resuelve los nombres de participante y reto, y recorta la fecha', async () => {
      renderGestion('registros', evaluador);
      expect(await screen.findByText('Luis')).toBeInTheDocument();
      expect(screen.getByText('Reto de IA')).toBeInTheDocument();
      expect(screen.getByText('2026-11-05')).toBeInTheDocument();
    });

    it('el evaluador puede editar solo estado y observación, y no eliminar', async () => {
      const user = userEvent.setup();
      renderGestion('registros', evaluador);

      await user.click(await screen.findByRole('button', { name: 'Editar' }));

      expect(screen.getByLabelText('Estado')).toBeInTheDocument();
      expect(screen.getByLabelText('Observación')).toBeInTheDocument();
      expect(screen.queryByLabelText('Reto')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    });
  });
});
