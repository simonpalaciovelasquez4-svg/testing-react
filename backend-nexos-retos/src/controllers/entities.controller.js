import * as entityModel from '../models/entities.model.js'
import * as authModel from '../models/auth.model.js'
import bcrypt from 'bcryptjs'

const allowedValues = {
  retos: { estado: ['Abierto', 'En revisión', 'Cerrado'] },
  usuarios: { rol: ['Participante', 'Evaluador', 'Administrador'], estado: ['Activo', 'Inactivo'] },
  registros: { estado: ['Pendiente', 'Aprobado', 'Rechazado'] },
}

const requiredFields = {
  empresas: ['nombre', 'nit', 'sector', 'contacto', 'correo'],
  categorias: ['nombre', 'descripcion'],
  prioridades: ['nombre', 'nivel'],
  usuarios: ['nombre', 'correo', 'rol', 'estado'],
  retos: ['nombre', 'descripcion', 'empresaId', 'categoriaId', 'prioridadId', 'fechaInicio', 'fechaFin', 'estado'],
  registros: ['usuarioId', 'retoId', 'fechaRegistro', 'estado'],
}

const optionalDefaults = {
  empresas: { telefono: '' },
  registros: { observacion: '' },
}

function validate(entity, body, { partial = false } = {}) {
  const fields = entityModel.entities[entity]
  if (!fields) {
    const error = new Error('Entidad no encontrada.')
    error.status = 404
    throw error
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('El cuerpo de la solicitud debe ser un objeto JSON.')
    error.status = 400
    throw error
  }

  const unknown = Object.keys(body).filter(field => !fields.includes(field))
  if (unknown.length) {
    const error = new Error(`Campos no permitidos: ${unknown.join(', ')}.`)
    error.status = 400
    throw error
  }

  const values = {}
  for (const field of fields) {
    if (body[field] === undefined) {
      if (!partial && requiredFields[entity].includes(field)) {
        const error = new Error(`El campo "${field}" es obligatorio.`)
        error.status = 400
        throw error
      }
      if (!partial && optionalDefaults[entity]?.[field] !== undefined) {
        values[field] = optionalDefaults[entity][field]
      }
      continue
    }

    const value = body[field]
    if (typeof value === 'string') {
      values[field] = value.trim()
      if (requiredFields[entity].includes(field) && !values[field]) {
        const error = new Error(`El campo "${field}" no puede estar vacío.`)
        error.status = 400
        throw error
      }
    } else if (entity === 'prioridades' && field === 'nivel') {
      const number = Number(value)
      if (!Number.isInteger(number) || number < 1) {
        const error = new Error('El nivel debe ser un número entero mayor que cero.')
        error.status = 400
        throw error
      }
      values[field] = number
    } else {
      const error = new Error(`El campo "${field}" debe ser texto.`)
      error.status = 400
      throw error
    }

    const choices = allowedValues[entity]?.[field]
    if (choices && !choices.includes(values[field])) {
      const error = new Error(`El valor de "${field}" no es válido.`)
      error.status = 400
      throw error
    }
  }

  for (const field of ['correo']) {
    if (values[field] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[field])) {
      const error = new Error('Ingresa un correo electrónico válido.')
      error.status = 400
      throw error
    }
  }

  for (const field of ['fechaInicio', 'fechaFin', 'fechaRegistro']) {
    const value = values[field]
    const date = value && new Date(`${value}T00:00:00.000Z`)
    if (value && (
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || Number(value.slice(0, 4)) < 1000
      || Number.isNaN(date.getTime())
      || date.toISOString().slice(0, 10) !== value
    )) {
      const error = new Error(`El campo "${field}" debe tener formato YYYY-MM-DD.`)
      error.status = 400
      throw error
    }
  }

  if (entity === 'retos' && values.fechaInicio && values.fechaFin && values.fechaFin < values.fechaInicio) {
    const error = new Error('La fecha de cierre no puede ser anterior a la fecha de inicio.')
    error.status = 400
    throw error
  }
  return values
}

function forbidden(message) {
  const error = new Error(message)
  error.status = 403
  return error
}

function requireRole(req, roles) {
  if (!roles.includes(req.auth.rol)) {
    throw forbidden('No tienes permisos para realizar esta acción.')
  }
}

const evaluadorPuedeCrear = ['empresas', 'categorias', 'prioridades', 'retos', 'registros']

export async function list(req, res) {
  const { entity } = req.params
  if (entity === 'usuarios') requireRole(req, ['Administrador', 'Evaluador'])
  const data = entity === 'registros' && req.auth.rol === 'Participante'
    ? await entityModel.findRegistrationsByUser(req.auth.userId)
    : await entityModel.findAll(entity)
  res.json({ data })
}

export async function get(req, res) {
  const { entity, id } = req.params
  if (entity === 'usuarios') {
    requireRole(req, ['Administrador', 'Evaluador'])
  }
  const item = await entityModel.findById(entity, id)
  if (!item) return res.status(404).json({ error: { message: 'Registro no encontrado.' } })
  if (entity === 'registros' && req.auth.rol === 'Participante' && String(item.usuarioId) !== String(req.auth.userId)) {
    return res.status(404).json({ error: { message: 'Registro no encontrado.' } })
  }
  return res.json({ data: item })
}

export async function create(req, res) {
  const { entity } = req.params
  if (req.auth.rol === 'Participante') {
    if (entity !== 'registros') {
      throw forbidden('Solo puedes inscribirte en retos.')
    }
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      const error = new Error('El cuerpo de la solicitud debe ser un objeto JSON.')
      error.status = 400
      throw error
    }
    const unknown = Object.keys(body).filter(field => !['retoId', 'observacion'].includes(field))
    if (unknown.length) {
      const error = new Error(`Campos no permitidos: ${unknown.join(', ')}.`)
      error.status = 400
      throw error
    }
    const registration = validate('registros', body, { partial: true })
    if (!registration.retoId) {
      const error = new Error('El campo "retoId" es obligatorio.')
      error.status = 400
      throw error
    }
    const reto = await entityModel.findById('retos', registration.retoId)
    if (!reto) {
      const error = new Error('El reto seleccionado no existe.')
      error.status = 404
      throw error
    }
    if (reto.estado !== 'Abierto') {
      const error = new Error('Solo puedes inscribirte en retos abiertos.')
      error.status = 409
      throw error
    }
    const today = new Date().toISOString().slice(0, 10)
    const values = validate('registros', {
      ...registration,
      usuarioId: req.auth.userId,
      fechaRegistro: today,
      estado: 'Pendiente',
    })
    return res.status(201).json({ data: await entityModel.create(entity, values) })
  }

  if (entity === 'usuarios') {
    requireRole(req, ['Administrador'])
    const { contrasena, ...userBody } = req.body ?? {}
    if (typeof contrasena !== 'string' || contrasena.length < 8 || Buffer.byteLength(contrasena) > 72) {
      const error = new Error('La contraseña debe tener entre 8 y 72 bytes.')
      error.status = 400
      throw error
    }
    const values = validate(entity, userBody)
    values.correo = values.correo.toLowerCase()
    const passwordHash = await bcrypt.hash(contrasena, 12)
    const item = await authModel.createUser({ ...values, passwordHash })
    return res.status(201).json({ data: item })
  }

  if (req.auth.rol === 'Evaluador' && !evaluadorPuedeCrear.includes(entity)) {
    throw forbidden('El evaluador no puede crear este tipo de registro.')
  }
  if (req.auth.rol !== 'Administrador' && req.auth.rol !== 'Evaluador') {
    throw forbidden('No tienes permisos para crear este registro.')
  }
  const item = await entityModel.create(entity, validate(entity, req.body))
  return res.status(201).json({ data: item })
}

export async function update(req, res) {
  const { entity, id } = req.params
  if (req.auth.rol === 'Evaluador' && entity === 'registros') {
    const unknown = Object.keys(req.body ?? {}).filter(field => !['estado', 'observacion'].includes(field))
    if (unknown.length) {
      const error = new Error(`Campos no permitidos: ${unknown.join(', ')}.`)
      error.status = 400
      throw error
    }
    const existing = await entityModel.findById(entity, id)
    if (!existing) return res.status(404).json({ error: { message: 'Registro no encontrado.' } })
    const values = validate(entity, req.body, { partial: true })
    if (!values.estado) {
      const error = new Error('El estado es obligatorio.')
      error.status = 400
      throw error
    }
    return res.json({ data: await entityModel.update(entity, id, values) })
  }

  requireRole(req, ['Administrador'])
  const values = validate(entity, req.body, { partial: true })
  const item = await entityModel.update(entity, id, values)
  if (!item) return res.status(404).json({ error: { message: 'Registro no encontrado.' } })
  return res.json({ data: item })
}

export async function remove(req, res) {
  requireRole(req, ['Administrador'])
  if (req.params.entity === 'usuarios' && String(req.auth.userId) === String(req.params.id)) {
    throw forbidden('No puedes eliminar tu propia cuenta.')
  }
  const removed = await entityModel.remove(req.params.entity, req.params.id)
  if (!removed) return res.status(404).json({ error: { message: 'Registro no encontrado.' } })
  return res.status(204).end()
}

export async function getAllData(req, res) {
  const data = {}
  for (const entity of Object.keys(entityModel.entities)) {
    if (req.auth.rol === 'Participante' && entity === 'usuarios') continue
    data[entity] = entity === 'registros' && req.auth.rol === 'Participante'
      ? await entityModel.findRegistrationsByUser(req.auth.userId)
      : await entityModel.findAll(entity)
  }
  return res.json({ data })
}
