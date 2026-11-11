import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function renderNavbar(usuario, logout = vi.fn()) {
  useAuth.mockReturnValue({ usuario, logout });
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Navbar />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>
  );
  return { logout };
}

const enlace = (nombre) => screen.queryByRole('link', { name: nombre });

describe('Navbar', () => {
  beforeEach(() => vi.resetAllMocks());

  it('el participante solo ve los enlaces básicos', () => {
    renderNavbar({ nombre: 'Ana', rol: 'Participante' });
    expect(enlace('Retos')).toBeInTheDocument();
    expect(enlace('Empresas')).toBeInTheDocument();
    expect(enlace('Publicar reto')).not.toBeInTheDocument();
    expect(enlace('Inscripciones')).not.toBeInTheDocument();
    expect(enlace('Usuarios')).not.toBeInTheDocument();
  });

  it('el evaluador puede publicar y ver inscripciones, pero no usuarios', () => {
    renderNavbar({ nombre: 'Luis', rol: 'Evaluador' });
    expect(enlace('Publicar reto')).toBeInTheDocument();
    expect(enlace('Inscripciones')).toBeInTheDocument();
    expect(enlace('Usuarios')).not.toBeInTheDocument();
  });

  it('el administrador ve todos los enlaces', () => {
    renderNavbar({ nombre: 'Admin', rol: 'Administrador' });
    expect(enlace('Publicar reto')).toBeInTheDocument();
    expect(enlace('Inscripciones')).toBeInTheDocument();
    expect(enlace('Usuarios')).toBeInTheDocument();
  });

  it('muestra el nombre y el rol de la persona', () => {
    renderNavbar({ nombre: 'Ana', rol: 'Evaluador' });
    expect(screen.getByText('Ana · Evaluador')).toBeInTheDocument();
  });

  it('cerrar sesión llama logout y lleva a /login', async () => {
    const user = userEvent.setup();
    const { logout } = renderNavbar({ nombre: 'Ana', rol: 'Participante' });
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });
});
