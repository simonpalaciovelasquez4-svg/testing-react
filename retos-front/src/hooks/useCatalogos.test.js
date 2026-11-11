import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useCatalogos, { porId } from './useCatalogos.js';
import { empresasApi, categoriasApi, prioridadesApi } from '../services/api.js';

vi.mock('../services/api.js', () => ({
  empresasApi: { listar: vi.fn() },
  categoriasApi: { listar: vi.fn() },
  prioridadesApi: { listar: vi.fn() },
}));

describe('useCatalogos', () => {
  beforeEach(() => vi.resetAllMocks());

  it('empieza cargando y luego entrega los tres catálogos', async () => {
    empresasApi.listar.mockResolvedValue([{ id: 1, nombre: 'Acme' }]);
    categoriasApi.listar.mockResolvedValue([{ id: 2, nombre: 'Tecnología' }]);
    prioridadesApi.listar.mockResolvedValue([{ id: 3, nombre: 'Alta' }]);

    // renderHook permite probar un hook sin necesidad de un componente
    const { result } = renderHook(() => useCatalogos());
    expect(result.current.cargando).toBe(true);
    expect(result.current.empresas).toEqual([]);

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.empresas).toEqual([{ id: 1, nombre: 'Acme' }]);
    expect(result.current.categorias).toEqual([{ id: 2, nombre: 'Tecnología' }]);
    expect(result.current.prioridades).toEqual([{ id: 3, nombre: 'Alta' }]);
    expect(result.current.error).toBe('');
  });

  it('si una petición falla expone el mensaje de error', async () => {
    empresasApi.listar.mockRejectedValue(new Error('Servidor caído'));
    categoriasApi.listar.mockResolvedValue([]);
    prioridadesApi.listar.mockResolvedValue([]);

    const { result } = renderHook(() => useCatalogos());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('Servidor caído');
  });
});

describe('porId', () => {
  it('convierte una lista en un mapa indexado por id (como string)', () => {
    const mapa = porId([{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }]);
    expect(mapa['1'].nombre).toBe('A');
    expect(mapa['2'].nombre).toBe('B');
  });

  it('con una lista vacía devuelve un objeto vacío', () => {
    expect(porId([])).toEqual({});
  });
});
