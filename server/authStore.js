import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();

const hashPassword = (password) => {
  const salt = randomUUID().replaceAll('-', '');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, key] = String(storedHash || '').split(':');
  if (!salt || !key) return false;
  const hashBuffer = Buffer.from(key, 'hex');
  const suppliedBuffer = scryptSync(password, salt, 64);
  if (hashBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(hashBuffer, suppliedBuffer);
};

const mapUserRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    company: row.companyJson ? JSON.parse(row.companyJson) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const getUserByEmail = async (email) => {
  const normalized = String(email || '').toLowerCase().trim();
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        email,
        password_hash AS "passwordHash",
        first_name AS "firstName",
        last_name AS "lastName",
        role,
        company_json AS "companyJson",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [normalized]);
    return result.rows[0] || null;
  }
  return sqlite
    .prepare(`
      SELECT
        id,
        email,
        password_hash AS passwordHash,
        first_name AS firstName,
        last_name AS lastName,
        role,
        company_json AS companyJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM users
      WHERE email = ?
    `)
    .get(normalized);
};

const createUser = async ({
  email,
  password,
  firstName,
  lastName,
  role = 'CLIENT',
  company = null,
}) => {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const createdAt = nowIso();
  const user = {
    id: `usr_${randomUUID()}`,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    firstName: String(firstName || '').trim() || 'Client',
    lastName: String(lastName || '').trim(),
    role,
    companyJson: company ? JSON.stringify(company) : null,
    createdAt,
    updatedAt: createdAt,
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, company_json, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      user.id,
      user.email,
      user.passwordHash,
      user.firstName,
      user.lastName,
      user.role,
      user.companyJson,
      user.createdAt,
      user.updatedAt,
    ]);
  } else {
    sqlite
      .prepare(`
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, role, company_json, created_at, updated_at
        ) VALUES (
          @id, @email, @passwordHash, @firstName, @lastName, @role, @companyJson, @createdAt, @updatedAt
        )
      `)
      .run(user);
  }
  return mapUserRow(user);
};

const authenticateUser = async ({ email, password }) => {
  const row = await getUserByEmail(email);
  if (!row) return null;
  const valid = verifyPassword(password, row.passwordHash);
  if (!valid) return null;
  return mapUserRow(row);
};

export {
  createUser,
  getUserByEmail,
  authenticateUser,
};
