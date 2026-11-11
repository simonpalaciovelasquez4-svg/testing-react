import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from './ConfirmModal.jsx';

function renderModal(props = {}) {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();
  render(
    <ConfirmModal
      abierto
      titulo="Eliminar reto"
      mensaje="¿Seguro?"
      textoConfirmar="Eliminar"
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...props}
    />
  );
  return { onConfirmar, onCancelar };
}

describe('ConfirmModal', () => {
  it('no renderiza nada si está cerrado', () => {
    renderModal({ abierto: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra título y mensaje cuando está abierto', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Eliminar reto')).toBeInTheDocument();
    expect(screen.getByText('¿Seguro?')).toBeInTheDocument();
  });

  it('llama onConfirmar al pulsar el botón de confirmar', async () => {
    const user = userEvent.setup();
    const { onConfirmar } = renderModal();
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('llama onCancelar al pulsar Cancelar', async () => {
    const user = userEvent.setup();
    const { onCancelar } = renderModal();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('se cierra con la tecla Escape', async () => {
    const user = userEvent.setup();
    const { onCancelar } = renderModal();
    await user.keyboard('{Escape}');
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('hacer clic dentro del contenido NO lo cierra, pero sí el fondo', async () => {
    const user = userEvent.setup();
    const { onCancelar } = renderModal();
    await user.click(screen.getByText('¿Seguro?'));
    expect(onCancelar).not.toHaveBeenCalled();
    await user.click(screen.getByRole('dialog'));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('mientras está cargando deshabilita los botones y cambia el texto', () => {
    renderModal({ cargando: true });
    expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('agrega y quita la clase modal-open del body (efecto con limpieza)', () => {
    const { unmount } = render(
      <ConfirmModal abierto titulo="t" mensaje="m" onConfirmar={() => {}} onCancelar={() => {}} />
    );
    expect(document.body).toHaveClass('modal-open');
    unmount();
    expect(document.body).not.toHaveClass('modal-open');
  });
});
