import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Registro from './Registro.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function renderRegistro(registrar = vi.fn()) {
  useAuth.mockReturnValue({ usuario: null, registrar });
  const { container } = render(
    <MemoryRouter initialEntries={['/registro']}>
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>
    </MemoryRouter>
  );
  return { registrar, form: container.querySelector('form') };
}

describe('Registro', () => {
  beforeEach(() => vi.resetAllMocks());

  it('contraseña corta: muestra el error y NO llama a registrar', async () => {
    const user = userEvent.setup();
    const { registrar, form } = renderRegistro();
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Correo'), 'ana@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'corta');

    // fireEvent.submit se salta la validación nativa del navegador (minLength),
    // así probamos la validación propia del componente.
    fireEvent.submit(form);

    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();
  });

  it('datos válidos: llama a registrar y navega al inicio', async () => {
    const user = userEvent.setup();
    const { registrar } = renderRegistro(vi.fn().mockResolvedValue());
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Correo'), 'ana@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave12345');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(registrar).toHaveBeenCalledWith({
      nombre: 'Ana',
      correo: 'ana@correo.com',
      contrasena: 'clave12345',
    });
    expect(await screen.findByText('Inicio')).toBeInTheDocument();
  });

  it('si el backend rechaza el registro muestra su mensaje', async () => {
    const user = userEvent.setup();
    renderRegistro(vi.fn().mockRejectedValue(new Error('El correo ya existe')));
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Correo'), 'ana@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave12345');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('El correo ya existe')).toBeInTheDocument();
  });
});
