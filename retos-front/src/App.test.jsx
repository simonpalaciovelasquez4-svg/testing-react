import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Prueba de rutas de toda la app: se simula la sesión y la red, todo lo demás es real.
vi.mock('./context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('./services/api.js', async (importOriginal) => {
  const crud = () => ({
    listar: vi.fn(async () => []),
    obtener: vi.fn(async () => ({})),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  });
  return {
    ...(await importOriginal()),
    retosApi: crud(),
    registrosApi: crud(),
    empresasApi: crud(),
    categoriasApi: crud(),
    prioridadesApi: crud(),
    usuariosApi: crud(),
  };
});

function renderEn(ruta, usuario) {
  useAuth.mockReturnValue({ usuario, cargando: false, logout: vi.fn() });
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>
  );
}

const participante = { id: 1, nombre: 'Ana', rol: 'Participante' };
const evaluador = { id: 2, nombre: 'Eva', rol: 'Evaluador' };
const admin = { id: 3, nombre: 'Admin', rol: 'Administrador' };

describe('Rutas de la aplicación', () => {
  beforeEach(() => useAuth.mockReset());

  it('sin sesión, una ruta privada lleva al login', () => {
    renderEn('/', null);
    expect(screen.getByText('Inicia sesión para publicar y gestionar retos.')).toBeInTheDocument();
  });

  it('/registro es pública', () => {
    renderEn('/registro', null);
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('una ruta desconocida muestra la página 404', () => {
    renderEn('/no-existe', null);
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });

  it('con sesión, "/" muestra el Dashboard dentro del Layout con Navbar', async () => {
    renderEn('/', participante);
    expect(await screen.findByText('Panel de usuario')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('el participante no puede entrar a /retos/nuevo: vuelve al inicio', async () => {
    renderEn('/retos/nuevo', participante);
    expect(await screen.findByText('Panel de usuario')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Publicar reto' })).not.toBeInTheDocument();
  });

  it('el evaluador sí puede publicar retos', async () => {
    renderEn('/retos/nuevo', evaluador);
    expect(await screen.findByRole('heading', { name: 'Publicar reto' })).toBeInTheDocument();
  });

  it('solo el administrador entra a la gestión de usuarios', async () => {
    const { unmount } = renderEn('/gestion/usuarios', evaluador);
    expect(await screen.findByText('Panel de evaluador')).toBeInTheDocument();
    unmount();

    renderEn('/gestion/usuarios', admin);
    expect(await screen.findByRole('heading', { name: 'Gestión de usuarios' })).toBeInTheDocument();
  });
});
