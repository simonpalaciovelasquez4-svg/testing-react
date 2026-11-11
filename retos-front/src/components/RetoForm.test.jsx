import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RetoForm from './RetoForm.jsx';

const empresas = [{ id: 1, nombre: 'Acme' }, { id: 2, nombre: 'Globex' }];
const categorias = [{ id: 2, nombre: 'Tecnología' }];
const prioridades = [{ id: 3, nombre: 'Alta' }];

function renderForm(props = {}) {
  const onSubmit = vi.fn();
  render(
    <RetoForm
      empresas={empresas}
      categorias={categorias}
      prioridades={prioridades}
      onSubmit={onSubmit}
      textoBoton="Publicar reto"
      {...props}
    />
  );
  return { onSubmit };
}

// Los inputs type="date" se llenan con fireEvent.change (más estable en jsdom).
const poner = (etiqueta, valor) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

async function llenarTodo(user, { inicio = '2026-12-01', fin = '2026-12-31' } = {}) {
  await user.type(screen.getByLabelText('Nombre del reto'), '  Reto de IA  ');
  await user.type(screen.getByLabelText('Descripción'), 'Clasificar cultivos');
  await user.selectOptions(screen.getByLabelText('Empresa'), '1');
  await user.selectOptions(screen.getByLabelText('Categoría'), '2');
  await user.selectOptions(screen.getByLabelText('Prioridad'), '3');
  poner('Fecha de inicio', inicio);
  poner('Fecha de cierre', fin);
}

describe('RetoForm', () => {
  it('precarga los valores iniciales (modo edición)', () => {
    renderForm({ inicial: { nombre: 'Reto previo', estado: 'Cerrado' } });
    expect(screen.getByLabelText('Nombre del reto')).toHaveValue('Reto previo');
    expect(screen.getByLabelText('Estado')).toHaveValue('Cerrado');
  });

  it('lista las opciones de los catálogos', () => {
    renderForm();
    expect(screen.getByRole('option', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tecnología' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alta' })).toBeInTheDocument();
  });

  it('con el formulario vacío muestra errores, enfoca el primero y NO envía', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Publicar reto' }));

    expect(screen.getByText('Escribe el nombre del reto.')).toBeInTheDocument();
    expect(screen.getByText('Describe el reto.')).toBeInTheDocument();
    expect(screen.getByText('Elige la empresa.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del reto')).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rechaza una fecha de cierre anterior al inicio', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await llenarTodo(user, { inicio: '2026-12-10', fin: '2026-12-01' });
    await user.click(screen.getByRole('button', { name: 'Publicar reto' }));

    expect(screen.getByText('La fecha de cierre no puede ser anterior al inicio.')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de cierre')).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('quita el error de un campo cuando el usuario lo corrige', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Publicar reto' }));
    expect(screen.getByText('Escribe el nombre del reto.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nombre del reto'), 'A');
    expect(screen.queryByText('Escribe el nombre del reto.')).not.toBeInTheDocument();
  });

  it('con datos válidos envía los valores (sin espacios sobrantes)', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await llenarTodo(user);
    await user.click(screen.getByRole('button', { name: 'Publicar reto' }));

    expect(onSubmit).toHaveBeenCalledWith({
      nombre: 'Reto de IA',
      descripcion: 'Clasificar cultivos',
      empresaId: '1',
      categoriaId: '2',
      prioridadId: '3',
      fechaInicio: '2026-12-01',
      fechaFin: '2026-12-31',
      estado: 'Abierto',
    });
  });

  it('muestra el contador de caracteres de la descripción', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Descripción'), 'hola');
    expect(screen.getByText('4/600')).toBeInTheDocument();
  });

  it('mientras envía deshabilita el botón y cambia su texto', () => {
    renderForm({ enviando: true });
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
  });
});
