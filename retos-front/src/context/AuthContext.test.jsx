import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { authApi } from '../services/api.js';

vi.mock('../services/api.js', () => ({
  authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}));

// Componente mínimo que "consume" el contexto para poder probarlo.
function Consumidor() {
  const { usuario, cargando, login, logout } = useAuth();
  return (
    <div>
      <p>{cargando ? 'validando' : 'listo'}</p>
      <p>{usuario ? `Hola ${usuario.nombre}` : 'anónimo'}</p>
      <button onClick={() => login({ correo: 'a@a.com', contrasena: '12345678' })}>entrar</button>
      <button onClick={logout}>salir</button>
    </div>
  );
}

const renderAuth = () =>
  render(
    <AuthProvider>
      <Consumidor />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sin token empieza como anónimo y no consulta /auth/me', () => {
    renderAuth();
    expect(screen.getByText('anónimo')).toBeInTheDocument();
    expect(screen.getByText('listo')).toBeInTheDocument();
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it('con token guardado valida la sesión con /auth/me', async () => {
    localStorage.setItem('token', 'tok');
    authApi.me.mockResolvedValue({ nombre: 'Luis' });
    renderAuth();
    expect(await screen.findByText('Hola Luis')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('listo')).toBeInTheDocument());
  });

  it('si el token es inválido lo borra y queda anónimo', async () => {
    localStorage.setItem('token', 'malo');
    authApi.me.mockRejectedValue(new Error('401'));
    renderAuth();
    await waitFor(() => expect(screen.getByText('listo')).toBeInTheDocument());
    expect(screen.getByText('anónimo')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('login guarda el token y el usuario', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ user: { nombre: 'Ana' }, token: 'tok-123' });
    renderAuth();
    await user.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByText('Hola Ana')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('tok-123');
  });

  it('logout borra el token y el usuario', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ user: { nombre: 'Ana' }, token: 'tok-123' });
    renderAuth();
    await user.click(screen.getByRole('button', { name: 'entrar' }));
    await screen.findByText('Hola Ana');

    await user.click(screen.getByRole('button', { name: 'salir' }));
    expect(screen.getByText('anónimo')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('el evento auth:expired cierra la sesión', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ user: { nombre: 'Ana' }, token: 'tok-123' });
    renderAuth();
    await user.click(screen.getByRole('button', { name: 'entrar' }));
    await screen.findByText('Hola Ana');

    act(() => {
      window.dispatchEvent(new Event('auth:expired'));
    });

    expect(screen.getByText('anónimo')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
