import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pool from '../config/database.js'
import { addAdminCredentials, createUser } from '../models/auth.model.js'

const nombre = process.env.ADMIN_NAME?.trim()
const correo = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const contrasena = process.env.ADMIN_PASSWORD
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

try {
  if (!nombre || !emailPattern.test(correo || '')) {
    throw new Error('Define ADMIN_NAME y un ADMIN_EMAIL válido en el entorno.')
  }
  if (typeof contrasena !== 'string' || contrasena.length < 12 || Buffer.byteLength(contrasena) > 72) {
    throw new Error('ADMIN_PASSWORD debe tener entre 12 y 72 bytes.')
  }

  const passwordHash = await bcrypt.hash(contrasena, 12)
  const [existing] = await pool.execute('SELECT id, rol FROM usuarios WHERE correo = ?', [correo])
  if (existing.length) {
    if (existing[0].rol !== 'Administrador') {
      throw new Error('Ese correo ya pertenece a un usuario que no es administrador.')
    }
    await addAdminCredentials({ userId: existing[0].id, passwordHash })
    console.log(`Credenciales de administrador configuradas para ${correo}.`)
  } else {
    await createUser({ nombre, correo, rol: 'Administrador', passwordHash })
    console.log(`Cuenta de administrador creada para ${correo}.`)
  }
} catch (error) {
  console.error(`No se pudo crear el administrador: ${error.message}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
