import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { soloCampos, CAMPOS_RETO, authApi, retosApi } from './api.js';

// Respuesta falsa de fetch
const respuesta = ({ ok = true, status = 200, json } = {}) => ({
  ok,
  status,
  json: json ?? (async () => ({})),
});

describe('soloCampos (función pura)', () => {
  it('deja solo los campos permitidos', () => {
    const salida = soloCampos({ nombre: 'A', intruso: 'x' }, ['nombre']);
    expect(salida).toEqual({ nombre: 'A' });
  });

  it('convierte los números a string', () => {
    expect(soloCampos({ empresaId: 5 }, ['empresaId'])).toEqual({ empresaId: '5' });
  });

  it('ignora undefined y null', () => {
    const salida = soloCampos({ nombre: 'A', descripcion: null, estado: undefined }, CAMPOS_RETO);
    expect(salida).toEqual({ nombre: 'A' });
  });
});

describe('cliente de la API (fetch simulado)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login envía POST con el cuerpo en JSON y devuelve json.data', async () => {
    fetch.mockResolvedValue(respuesta({ json: async () => ({ data: { token: 'abc' } }) }));

    const resultado = await authApi.login({ correo: 'a@a.com', contrasena: '12345678' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ correo: 'a@a.com', contrasena: '12345678' }),
      })
    );
    expect(resultado).toEqual({ token: 'abc' });
  });

  it('agrega el header Authorization cuando hay token guardado', async () => {
    localStorage.setItem('token', 'mi-token');
    fetch.mockResolvedValue(respuesta({ json: async () => ({ data: [] }) }));

    await retosApi.listar();

    const [, opciones] = fetch.mock.calls[0];
    expect(opciones.headers.Authorization).toBe('Bearer mi-token');
  });

  it('lanza un Error con el mensaje que manda el backend', async () => {
    fetch.mockResolvedValue(
      respuesta({ ok: false, status: 400, json: async () => ({ error: { message: 'Correo ya registrado' } }) })
    );
    await expect(authApi.register({})).rejects.toThrow('Correo ya registrado');
  });

  it('si el error no es JSON usa "Error <status>"', async () => {
    fetch.mockResolvedValue(
      respuesta({ ok: false, status: 500, json: async () => { throw new Error('no es json'); } })
    );
    await expect(retosApi.listar()).rejects.toThrow('Error 500');
  });

  it('un 401 con token dispara el evento auth:expired', async () => {
    localStorage.setItem('token', 'vencido');
    const escucha = vi.fn();
    window.addEventListener('auth:expired', escucha);
    fetch.mockResolvedValue(
      respuesta({ ok: false, status: 401, json: async () => ({ error: { message: 'Token vencido' } }) })
    );

    await expect(authApi.me()).rejects.toThrow('Token vencido');
    expect(escucha).toHaveBeenCalledTimes(1);

    window.removeEventListener('auth:expired', escucha);
  });

  it('una respuesta 204 devuelve null', async () => {
    fetch.mockResolvedValue(respuesta({ status: 204 }));
    expect(await retosApi.eliminar(1)).toBeNull();
  });
});
