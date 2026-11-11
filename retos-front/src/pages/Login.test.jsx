import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function renderLogin({ usuario = null, login = vi.fn() } = {}) {
  useAuth.mockReturnValue({ usuario, login });
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<p>Pantalla de registro</p>} />
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>
    </MemoryRouter>
  );
  return { login };
}

async function llenarYEnviar(user) {
  await user.type(screen.getByLabelText('Correo'), 'ana@correo.com');
  await user.type(screen.getByLabelText('Contraseña'), 'clave12345');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Login', () => {
  beforeEach(() => vi.resetAllMocks());

  it('muestra los campos y el botón', () => {
    renderLogin();
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('cambia el título de la pestaña', () => {
    renderLogin();
    expect(document.title).toBe('Iniciar sesión · Nexo Retos');
  });

  it('envía las credenciales y navega al inicio si todo sale bien', async () => {
    const user = userEvent.setup();
    const { login } = renderLogin({ login: vi.fn().mockResolvedValue() });
    await llenarYEnviar(user);

    expect(login).toHaveBeenCalledWith({ correo: 'ana@correo.com', contrasena: 'clave12345' });
    expect(await screen.findByText('Inicio')).toBeInTheDocument();
  });

  it('si el login falla muestra el error y vuelve a habilitar el botón', async () => {
    const user = userEvent.setup();
    renderLogin({ login: vi.fn().mockRejectedValue(new Error('Credenciales inválidas')) });
    await llenarYEnviar(user);

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('mientras espera la respuesta muestra "Entrando…" y deshabilita el botón', async () => {
    const user = userEvent.setup();
    renderLogin({ login: vi.fn(() => new Promise(() => {})) }); // promesa que nunca termina
    await llenarYEnviar(user);

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
  });

  it('si ya hay sesión redirige al inicio', () => {
    renderLogin({ usuario: { nombre: 'Ana' } });
    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });

  it('tiene un enlace a la pantalla de registro', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('link', { name: 'Regístrate' }));
    expect(screen.getByText('Pantalla de registro')).toBeInTheDocument();
  });
});
