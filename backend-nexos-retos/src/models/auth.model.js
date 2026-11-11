import { randomUUID } from 'node:crypto'
import pool from '../config/database.js'

const userFields = 'id, nombre, correo, rol, estado'
const credentialUserFields = 'u.id, u.nombre, u.correo, u.rol, u.estado'

export async function createUser({ nombre, correo, rol, estado = 'Activo', passwordHash }) {
  const id = randomUUID()
  const now = new Date()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.execute(
      'INSERT INTO usuarios (id, nombre, correo, rol, estado, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, nombre, correo, rol, estado, now, now],
    )
    await connection.execute(
      'INSERT INTO auth_credentials (userId, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      [id, passwordHash, now, now],
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  return findUserById(id)
}

export async function createParticipant({ nombre, correo, passwordHash }) {
  return createUser({ nombre, correo, rol: 'Participante', passwordHash })
}

export async function addAdminCredentials({ userId, passwordHash }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [users] = await connection.execute(
      'SELECT rol FROM usuarios WHERE id = ? FOR UPDATE',
      [userId],
    )
    if (!users.length || users[0].rol !== 'Administrador') {
      const error = new Error('Solo se pueden configurar credenciales para una cuenta administradora.')
      error.status = 403
      throw error
    }

    const [credentials] = await connection.execute(
      'SELECT userId FROM auth_credentials WHERE userId = ?',
      [userId],
    )
    if (credentials.length) {
      const error = new Error('La cuenta ya tiene credenciales configuradas.')
      error.status = 409
      throw error
    }

    const now = new Date()
    await connection.execute(
      'INSERT INTO auth_credentials (userId, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      [userId, passwordHash, now, now],
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  return findUserById(userId)
}

export async function findCredentialsByEmail(correo) {
  const [rows] = await pool.execute(
    `SELECT ${credentialUserFields}, c.passwordHash
     FROM usuarios u
     JOIN auth_credentials c ON c.userId = u.id
     WHERE u.correo = ?`,
    [correo],
  )
  return rows[0] ?? null
}

export async function findUserById(id) {
  const [rows] = await pool.execute(
    `SELECT ${userFields} FROM usuarios WHERE id = ?`,
    [id],
  )
  return rows[0] ?? null
}
