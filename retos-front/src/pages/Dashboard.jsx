import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { retosApi } from '../services/api.js';
import useCatalogos, { porId } from '../hooks/useCatalogos.js';
import RetoCard from '../components/RetoCard.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Cargando from '../components/Cargando.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ESTADOS = ['Abierto', 'En revisión', 'Cerrado'];

export default function Dashboard() {
  const { usuario } = useAuth();
  const esAdministrador = usuario?.rol === 'Administrador';
  const puedePublicar = esAdministrador || usuario?.rol === 'Evaluador';
  const { empresas, categorias, prioridades, cargando: cargandoCat, error: errorCat } = useCatalogos();
  const [retos, setRetos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const [empresaId, setEmpresaId] = useState('todas');
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const buscadorRef = useRef(null);

  useEffect(() => {
    document.title = 'Retos · Nexo Retos';
    retosApi.listar()
      .then(setRetos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  // Atajo de teclado: "/" enfoca el buscador.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        buscadorRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const empresasPorId = useMemo(() => porId(empresas), [empresas]);
  const categoriasPorId = useMemo(() => porId(categorias), [categorias]);
  const prioridadesPorId = useMemo(() => porId(prioridades), [prioridades]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return retos.filter((r) => {
      const texto = `${r.nombre} ${r.descripcion}`.toLowerCase();
      return (
        (!q || texto.includes(q)) &&
        (estado === 'todos' || r.estado === estado) &&
        (empresaId === 'todas' || String(r.empresaId) === empresaId)
      );
    });
  }, [retos, busqueda, estado, empresaId]);

  const conteo = (e) => retos.filter((r) => r.estado === e).length;

  const confirmarEliminar = async () => {
    setEliminando(true);
    try {
      await retosApi.eliminar(aEliminar.id);
      setRetos((prev) => prev.filter((r) => r.id !== aEliminar.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setAEliminar(null);
      setEliminando(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="h3 mb-0">Retos</h1>
          <small className="text-secondary">
            {conteo('Abierto')} abiertos · {conteo('En revisión')} en revisión · {conteo('Cerrado')} cerrados
          </small>
        </div>
        {puedePublicar && <Link to="/retos/nuevo" className="btn btn-primary">Publicar reto</Link>}
      </div>

      {esAdministrador ? (
        <section className="card card-body mb-4">
          <h2 className="h5">Panel de administración</h2>
          <p className="text-secondary mb-3">Administra el catálogo, las inscripciones y las cuentas del sistema.</p>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/gestion/empresas" className="btn btn-sm btn-outline-primary">Empresas</Link>
            <Link to="/gestion/prioridades" className="btn btn-sm btn-outline-primary">Prioridades</Link>
            <Link to="/gestion/categorias" className="btn btn-sm btn-outline-primary">Categorías</Link>
            <Link to="/gestion/registros" className="btn btn-sm btn-outline-primary">Inscripciones</Link>
            <Link to="/gestion/usuarios" className="btn btn-sm btn-outline-primary">Usuarios</Link>
          </div>
        </section>
      ) : usuario?.rol === 'Evaluador' ? (
        <section className="card card-body mb-4">
          <h2 className="h5">Panel de evaluador</h2>
          <p className="text-secondary mb-3">Publica retos y administra los catálogos y las inscripciones.</p>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/gestion/empresas" className="btn btn-sm btn-outline-primary">Empresas</Link>
            <Link to="/gestion/prioridades" className="btn btn-sm btn-outline-primary">Prioridades</Link>
            <Link to="/gestion/categorias" className="btn btn-sm btn-outline-primary">Categorías</Link>
            <Link to="/gestion/registros" className="btn btn-sm btn-outline-primary">Inscripciones</Link>
          </div>
        </section>
      ) : (
        <section className="card card-body mb-4">
          <h2 className="h5">Panel de usuario</h2>
          <p className="text-secondary mb-0">Explora los retos y consulta sus empresas, categorías y prioridades. Puedes inscribirte desde cada reto.</p>
        </section>
      )}

      <div className="row g-2 mb-4">
        <div className="col-md-6">
          <input
            ref={buscadorRef}
            className="form-control"
            placeholder='Buscar por nombre o descripción (atajo: "/")'
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="todas">Todas las empresas</option>
            {empresas.map((e) => <option key={e.id} value={String(e.id)}>{e.nombre}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {(error || errorCat) && <div className="alert alert-danger">{error || errorCat}</div>}
      {(cargando || cargandoCat) && <Cargando />}

      {!cargando && filtrados.length === 0 && (
        <div className="text-center text-secondary py-5">
          {retos.length === 0
            ? puedePublicar
              ? <>Aún no hay retos. <Link to="/retos/nuevo">Publica el primero</Link>.</>
              : 'Aún no hay retos.'
            : 'Ningún reto coincide con tu búsqueda.'}
        </div>
      )}

      <div className="row g-3">
        {filtrados.map((r) => (
          <div className="col-md-6 col-lg-4" key={r.id}>
            <RetoCard
              reto={r}
              empresa={empresasPorId[String(r.empresaId)]}
              categoria={categoriasPorId[String(r.categoriaId)]}
              prioridad={prioridadesPorId[String(r.prioridadId)]}
              onEliminar={setAEliminar}
              puedeAdministrar={esAdministrador}
            />
          </div>
        ))}
      </div>

      <ConfirmModal
        abierto={!!aEliminar}
        titulo="Eliminar reto"
        mensaje={<>¿Seguro que quieres eliminar <strong>{aEliminar?.nombre}</strong>? Esta acción no se puede deshacer.</>}
        textoConfirmar="Eliminar"
        cargando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </>
  );
}
