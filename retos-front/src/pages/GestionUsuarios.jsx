import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Cargando from '../components/Cargando.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usuariosApi } from '../services/api.js';

const ROLES = ['Participante', 'Evaluador', 'Administrador'];
const ESTADOS = ['Activo', 'Inactivo'];
const FORMULARIO_VACIO = { nombre: '', correo: '', contrasena: '', rol: 'Participante', estado: 'Activo' };

export default function GestionUsuarios() {
  const { usuario: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [usuarioEliminar, setUsuarioEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setUsuarios(await usuariosApi.listar());
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Usuarios · Nexo Retos';
    cargarUsuarios();
  }, [cargarUsuarios]);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    return usuarios.filter((usuario) => (
      !termino
      || `${usuario.nombre} ${usuario.correo} ${usuario.rol} ${usuario.estado}`
        .toLocaleLowerCase()
        .includes(termino)
    ));
  }, [usuarios, busqueda]);

  const iniciarCreacion = () => {
    setFormulario({ id: null, valores: { ...FORMULARIO_VACIO } });
    setError('');
  };

  const iniciarEdicion = (usuario) => {
    setFormulario({
      id: usuario.id,
      valores: {
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        estado: usuario.estado,
      },
    });
    setError('');
  };

  const cambiarCampo = (event) => {
    const { name, value } = event.target;
    setFormulario((actual) => ({
      ...actual,
      valores: { ...actual.valores, [name]: value },
    }));
  };

  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const { valores } = formulario;
      if (formulario.id) {
        const { nombre, correo, rol, estado } = valores;
        await usuariosApi.actualizar(formulario.id, { nombre, correo, rol, estado });
      } else {
        await usuariosApi.crear(valores);
      }
      setFormulario(null);
      await cargarUsuarios();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarUsuario = async () => {
    setEliminando(true);
    setError('');
    try {
      await usuariosApi.eliminar(usuarioEliminar.id);
      setUsuarioEliminar(null);
      await cargarUsuarios();
    } catch (e) {
      setError(e.message);
      setUsuarioEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <Link to="/" className="text-decoration-none small">← Volver al panel</Link>
          <h1 className="h3 mb-1 mt-1">Gestión de usuarios</h1>
          <p className="text-secondary mb-0">Crea cuentas y administra sus roles y acceso.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={iniciarCreacion}>
          Crear usuario
        </button>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {formulario && (
        <form className="card card-body mb-4" onSubmit={guardar}>
          <h2 className="h5 mb-3">{formulario.id ? 'Editar usuario' : 'Crear usuario'}</h2>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="usuario-nombre" className="form-label">Nombre</label>
              <input
                id="usuario-nombre"
                name="nombre"
                className="form-control"
                value={formulario.valores.nombre}
                onChange={cambiarCampo}
                autoComplete="name"
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="usuario-correo" className="form-label">Correo</label>
              <input
                id="usuario-correo"
                name="correo"
                type="email"
                className="form-control"
                value={formulario.valores.correo}
                onChange={cambiarCampo}
                autoComplete="email"
                required
              />
            </div>
            {!formulario.id && (
              <div className="col-md-6 mb-3">
                <label htmlFor="usuario-contrasena" className="form-label">Contraseña inicial</label>
                <input
                  id="usuario-contrasena"
                  name="contrasena"
                  type="password"
                  className="form-control"
                  value={formulario.valores.contrasena}
                  onChange={cambiarCampo}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
                <div className="form-text">Debe tener al menos 8 caracteres.</div>
              </div>
            )}
            <div className="col-md-3 mb-3">
              <label htmlFor="usuario-rol" className="form-label">Rol</label>
              <select
                id="usuario-rol"
                name="rol"
                className="form-select"
                value={formulario.valores.rol}
                onChange={cambiarCampo}
                required
              >
                {ROLES.map((rol) => <option key={rol}>{rol}</option>)}
              </select>
            </div>
            <div className="col-md-3 mb-3">
              <label htmlFor="usuario-estado" className="form-label">Estado</label>
              <select
                id="usuario-estado"
                name="estado"
                className="form-select"
                value={formulario.valores.estado}
                onChange={cambiarCampo}
                required
              >
                {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
              </select>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar usuario'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setFormulario(null)}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="card card-body mb-3">
        <label htmlFor="buscar-usuarios" className="form-label">Buscar usuarios</label>
        <input
          id="buscar-usuarios"
          className="form-control"
          type="search"
          placeholder="Nombre, correo, rol o estado"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
      </div>

      {cargando ? <Cargando /> : usuariosFiltrados.length === 0 ? (
        <div className="card card-body text-center text-secondary py-5">
          {usuarios.length === 0 ? 'Todavía no hay usuarios.' : 'No hay usuarios que coincidan con la búsqueda.'}
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      {usuario.nombre}
                      {String(usuario.id) === String(usuarioActual?.id) && (
                        <span className="text-secondary small ms-2">(Tú)</span>
                      )}
                    </td>
                    <td>{usuario.correo}</td>
                    <td>{usuario.rol}</td>
                    <td>
                      <span className={`badge ${usuario.estado === 'Activo' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {usuario.estado}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => iniciarEdicion(usuario)}
                      >
                        Editar
                      </button>
                      {String(usuario.id) !== String(usuarioActual?.id) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setUsuarioEliminar(usuario)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        abierto={!!usuarioEliminar}
        titulo="Eliminar usuario"
        mensaje={<>¿Seguro que quieres eliminar a <strong>{usuarioEliminar?.nombre}</strong>? Esta acción no se puede deshacer.</>}
        textoConfirmar="Eliminar"
        cargando={eliminando}
        onConfirmar={eliminarUsuario}
        onCancelar={() => setUsuarioEliminar(null)}
      />
    </>
  );
}
