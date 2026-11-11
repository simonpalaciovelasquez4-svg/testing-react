import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GestionUsuarios from './GestionUsuarios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usuariosApi } from '../services/api.js';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../services/api.js', () => ({
  usuariosApi: { listar: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn() },
}));

const USUARIOS = [
  { id: 1, nombre: 'Admin', correo: 'admin@x.com', rol: 'Administrador', estado: 'Activo' },
  { id: 2, nombre: 'Luis', correo: 'luis@x.com', rol: 'Participante', estado: 'Inactivo' },
];

const fila = (nombre) => screen.getByRole('row', { name: new RegExp(nombre) });

function renderPagina() {
  const contexto = { usuario: { id: 1, nombre: 'Admin', rol: 'Administrador' } };
  useAuth.mockReturnValue(contexto);
  return render(
    <MemoryRouter>
      <GestionUsuarios />
    </MemoryRouter>
  );
}

describe('GestionUsuarios', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    usuariosApi.listar.mockResolvedValue(USUARIOS);
  });

  it('lista los usuarios y marca al usuario actual con "(Tú)"', async () => {
    renderPagina();
    expect(await screen.findByText('Luis')).toBeInTheDocument();
    expect(within(fila('Admin')).getByText('(Tú)')).toBeInTheDocument();
    expect(document.title).toBe('Usuarios · Nexo Retos');
  });

  it('no permite eliminarse a uno mismo, pero sí a los demás', async () => {
    renderPagina();
    await screen.findByText('Luis');
    expect(within(fila('Admin')).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    expect(within(fila('Luis')).getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('muestra mensajes para lista vacía y para error', async () => {
    usuariosApi.listar.mockResolvedValue([]);
    const { unmount } = renderPagina();
    expect(await screen.findByText('Todavía no hay usuarios.')).toBeInTheDocument();
    unmount();

    usuariosApi.listar.mockRejectedValue(new Error('Servidor caído'));
    renderPagina();
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor caído');
  });

  it('busca por nombre, correo, rol o estado', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('Luis');

    await user.type(screen.getByLabelText('Buscar usuarios'), 'participante');
    expect(screen.getByText('Luis')).toBeInTheDocument();
    expect(screen.queryByText('(Tú)')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Buscar usuarios'));
    await user.type(screen.getByLabelText('Buscar usuarios'), 'zzzz');
    expect(screen.getByText('No hay usuarios que coincidan con la búsqueda.')).toBeInTheDocument();
  });

  it('crea un usuario con contraseña inicial y recarga la lista', async () => {
    const user = userEvent.setup();
    usuariosApi.crear.mockResolvedValue({});
    renderPagina();
    await screen.findByText('Luis');

    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Correo'), 'ana@x.com');
    await user.type(screen.getByLabelText('Contraseña inicial'), 'clave12345');
    await user.selectOptions(screen.getByLabelText('Rol'), 'Evaluador');
    await user.click(screen.getByRole('button', { name: 'Guardar usuario' }));

    expect(usuariosApi.crear).toHaveBeenCalledWith({
      nombre: 'Ana',
      correo: 'ana@x.com',
      contrasena: 'clave12345',
      rol: 'Evaluador',
      estado: 'Activo',
    });
    await screen.findByText('Luis');
    expect(usuariosApi.listar).toHaveBeenCalledTimes(2);
  });

  it('al editar no pide contraseña y envía solo los campos editables', async () => {
    const user = userEvent.setup();
    usuariosApi.actualizar.mockResolvedValue({});
    renderPagina();
    await screen.findByText('Luis');

    await user.click(within(fila('Luis')).getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('heading', { name: 'Editar usuario' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña inicial')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Rol'), 'Evaluador');
    await user.click(screen.getByRole('button', { name: 'Guardar usuario' }));

    expect(usuariosApi.actualizar).toHaveBeenCalledWith(2, {
      nombre: 'Luis',
      correo: 'luis@x.com',
      rol: 'Evaluador',
      estado: 'Inactivo',
    });
  });

  it('si el backend rechaza el guardado muestra el error y mantiene el formulario', async () => {
    const user = userEvent.setup();
    usuariosApi.crear.mockRejectedValue(new Error('El correo ya existe'));
    renderPagina();
    await screen.findByText('Luis');

    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Correo'), 'ana@x.com');
    await user.type(screen.getByLabelText('Contraseña inicial'), 'clave12345');
    await user.click(screen.getByRole('button', { name: 'Guardar usuario' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El correo ya existe');
    expect(screen.getByRole('heading', { name: 'Crear usuario' })).toBeInTheDocument();
  });

  it('elimina un usuario tras confirmar en el modal', async () => {
    const user = userEvent.setup();
    usuariosApi.eliminar.mockResolvedValue(null);
    renderPagina();
    await screen.findByText('Luis');

    await user.click(within(fila('Luis')).getByRole('button', { name: 'Eliminar' }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Luis')).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Eliminar' }));

    expect(usuariosApi.eliminar).toHaveBeenCalledWith(2);
  });
});
