import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Reemplazamos el contexto real por uno falso que controlamos en cada prueba.
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function renderRuta(roles) {
  return render(
    <MemoryRouter initialEntries={['/privada']}>
      <Routes>
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route path="/" element={<p>Inicio</p>} />
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path="/privada" element={<p>Contenido privado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.resetAllMocks());

  it('muestra "Verificando sesión…" mientras se valida el token', () => {
    useAuth.mockReturnValue({ usuario: null, cargando: true });
    renderRuta();
    expect(screen.getByText('Verificando sesión…')).toBeInTheDocument();
  });

  it('sin sesión redirige a /login', () => {
    useAuth.mockReturnValue({ usuario: null, cargando: false });
    renderRuta();
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  it('con sesión y sin restricción de rol deja pasar', () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Participante' }, cargando: false });
    renderRuta();
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });

  it('con un rol no permitido redirige al inicio', () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Participante' }, cargando: false });
    renderRuta(['Administrador']);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('con el rol permitido muestra el contenido', () => {
    useAuth.mockReturnValue({ usuario: { rol: 'Administrador' }, cargando: false });
    renderRuta(['Administrador', 'Evaluador']);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });
});
