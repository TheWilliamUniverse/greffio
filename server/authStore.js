import { createHash, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';
import { mergeProfile, sanitizePhones, validateProfile } from './utils/userProfile.js';

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
  let profile = null;
  try {
    profile = row.profileJson ? JSON.parse(row.profileJson) : null;
  } catch (_error) {
    profile = null;
  }
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone || null,
    role: row.role,
    company: row.companyJson ? JSON.parse(row.companyJson) : null,
    profile,
    mfaEnabled: Boolean(row.mfaEnabled),
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
        phone,
        profile_json AS "profileJson",
        mfa_enabled AS "mfaEnabled",
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
        phone,
        profile_json AS profileJson,
        mfa_enabled AS mfaEnabled,
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

const normalizeLoginEmail = (email) => {
  const raw = String(email || '').trim().toLowerCase();
  if (raw === 'pdg') return 'pdg@greffio.temp';
  return raw;
};

const isTempAccessExpired = (profile) => {
  const expiresAt = profile?.tempAccessExpiresAt;
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
};

const authenticateUser = async ({ email, password }) => {
  const row = await getUserByEmail(normalizeLoginEmail(email));
  if (!row) return null;
  const valid = verifyPassword(password, row.passwordHash);
  if (!valid) return null;
  const user = mapUserRow(row);
  if (isTempAccessExpired(user?.profile)) return null;
  return user;
};

const createPasswordResetToken = async ({
  userId,
  expiresAt,
}) => {
  const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = {
    id: `prt_${randomUUID()}`,
    userId,
    tokenHash,
    expiresAt,
    consumedAt: null,
    createdAt: nowIso(),
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO password_reset_tokens (
        id, user_id, token_hash, expires_at, consumed_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      record.id,
      record.userId,
      record.tokenHash,
      record.expiresAt,
      record.consumedAt,
      record.createdAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO password_reset_tokens (
        id, user_id, token_hash, expires_at, consumed_at, created_at
      ) VALUES (
        @id, @userId, @tokenHash, @expiresAt, @consumedAt, @createdAt
      )
    `).run(record);
  }
  return token;
};

const consumePasswordResetToken = async ({ token }) => {
  const tokenHash = createHash('sha256').update(String(token || '')).digest('hex');
  const now = nowIso();
  let row = null;
  if (hasPostgres) {
    const result = await query(`
      SELECT id, user_id AS "userId", expires_at AS "expiresAt", consumed_at AS "consumedAt"
      FROM password_reset_tokens
      WHERE token_hash = $1
      LIMIT 1
    `, [tokenHash]);
    row = result.rows[0] || null;
  } else {
    row = sqlite.prepare(`
      SELECT id, user_id AS userId, expires_at AS expiresAt, consumed_at AS consumedAt
      FROM password_reset_tokens
      WHERE token_hash = ?
      LIMIT 1
    `).get(tokenHash) || null;
  }
  if (!row || row.consumedAt || new Date(row.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  if (hasPostgres) {
    await query('UPDATE password_reset_tokens SET consumed_at = $1 WHERE id = $2', [now, row.id]);
  } else {
    sqlite.prepare('UPDATE password_reset_tokens SET consumed_at = ? WHERE id = ?').run(now, row.id);
  }
  return row.userId;
};

const updateUserPasswordById = async ({ userId, password }) => {
  const passwordHash = hashPassword(password);
  const updatedAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE users
      SET password_hash = $1, updated_at = $2
      WHERE id = $3
    `, [passwordHash, updatedAt, userId]);
    return;
  }
  sqlite.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = ?
    WHERE id = ?
  `).run(passwordHash, updatedAt, userId);
};

const updateUserRoleByEmail = async ({
  email,
  role,
  firstName = null,
  lastName = null,
  company = undefined,
}) => {
  const normalized = String(email || '').toLowerCase().trim();
  const updatedAt = nowIso();
  const normalizedFirstName = firstName == null ? null : String(firstName).trim();
  const normalizedLastName = lastName == null ? null : String(lastName).trim();
  const companyJson = company === undefined ? undefined : JSON.stringify(company || null);

  if (hasPostgres) {
    const result = await query(`
      UPDATE users
      SET
        role = $2,
        first_name = COALESCE(NULLIF($3, ''), first_name),
        last_name = COALESCE(NULLIF($4, ''), last_name),
        company_json = CASE WHEN $5::text IS NULL THEN company_json ELSE $5::text END,
        updated_at = $6
      WHERE email = $1
      RETURNING
        id,
        email,
        first_name AS "firstName",
        last_name AS "lastName",
        role,
        company_json AS "companyJson",
        phone,
        profile_json AS "profileJson",
        mfa_enabled AS "mfaEnabled",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `, [
      normalized,
      role,
      normalizedFirstName,
      normalizedLastName,
      companyJson === undefined ? null : companyJson,
      updatedAt,
    ]);
    return mapUserRow(result.rows[0] || null);
  }

  const current = await getUserByEmail(normalized);
  if (!current) return null;

  const nextUser = {
    email: normalized,
    role,
    firstName: normalizedFirstName || current.firstName,
    lastName: normalizedLastName || current.lastName,
    companyJson: companyJson === undefined ? current.companyJson : companyJson,
    updatedAt,
  };

  sqlite
    .prepare(`
      UPDATE users
      SET
        role = @role,
        first_name = @firstName,
        last_name = @lastName,
        company_json = @companyJson,
        updated_at = @updatedAt
      WHERE email = @email
    `)
    .run(nextUser);

  return mapUserRow(await getUserByEmail(normalized));
};

const getUserById = async (userId) => {
  if (!userId) return null;
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
        phone,
        profile_json AS "profileJson",
        mfa_enabled AS "mfaEnabled",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      WHERE id = $1
      LIMIT 1
    `, [userId]);
    return mapUserRow(result.rows[0] || null);
  }
  const row = sqlite.prepare(`
    SELECT
      id,
      email,
      password_hash AS passwordHash,
      first_name AS firstName,
      last_name AS lastName,
      role,
      company_json AS companyJson,
      phone,
      profile_json AS profileJson,
      mfa_enabled AS mfaEnabled,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM users
    WHERE id = ?
  `).get(userId);
  return mapUserRow(row);
};

const updateUserProfile = async ({ userId, firstName, lastName, phone, profile }) => {
  if (!userId) return null;
  const current = await getUserById(userId);
  if (!current) return null;

  const mergedProfile = mergeProfile(current.profile, profile || {});
  const normalizedPhones = sanitizePhones(mergedProfile.phones);
  mergedProfile.phones = normalizedPhones;
  const primaryPhone = normalizedPhones.find((entry) => entry.isPrimary)?.number || phone || current.phone || null;

  const errors = validateProfile({
    firstName: firstName ?? current.firstName,
    lastName: lastName ?? current.lastName,
    email: current.email,
    phones: normalizedPhones,
    address: mergedProfile.address,
  });
  if (Object.keys(errors).length) {
    const error = new Error('PROFILE_VALIDATION_FAILED');
    error.details = errors;
    throw error;
  }

  const updatedAt = nowIso();
  const profileJson = JSON.stringify(mergedProfile);
  const nextFirstName = String(firstName ?? current.firstName).trim();
  const nextLastName = String(lastName ?? current.lastName).trim();

  if (hasPostgres) {
    const result = await query(`
      UPDATE users
      SET
        first_name = $2,
        last_name = $3,
        phone = $4,
        profile_json = $5,
        updated_at = $6
      WHERE id = $1
      RETURNING
        id,
        email,
        first_name AS "firstName",
        last_name AS "lastName",
        role,
        company_json AS "companyJson",
        phone,
        profile_json AS "profileJson",
        mfa_enabled AS "mfaEnabled",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `, [userId, nextFirstName, nextLastName, primaryPhone, profileJson, updatedAt]);
    return mapUserRow(result.rows[0] || null);
  }

  sqlite.prepare(`
    UPDATE users
    SET
      first_name = @firstName,
      last_name = @lastName,
      phone = @phone,
      profile_json = @profileJson,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id: userId,
    firstName: nextFirstName,
    lastName: nextLastName,
    phone: primaryPhone,
    profileJson,
    updatedAt,
  });

  return getUserById(userId);
};

const verifyUserPassword = async ({ email, password }) => {
  const row = await getUserByEmail(email);
  if (!row) return false;
  return verifyPassword(password, row.passwordHash);
};

const listAllUserRecords = async () => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        email,
        first_name AS "firstName",
        last_name AS "lastName",
        role,
        company_json AS "companyJson",
        profile_json AS "profileJson",
        phone,
        created_at AS "createdAt"
      FROM users
      ORDER BY created_at ASC
    `);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT
      id,
      email,
      first_name AS firstName,
      last_name AS lastName,
      role,
      company_json AS companyJson,
      profile_json AS profileJson,
      phone,
      created_at AS createdAt
    FROM users
    ORDER BY created_at ASC
  `).all();
};

const replaceUserRecord = async ({
  id,
  email,
  password,
  firstName,
  lastName,
  role,
  companyJson = null,
  profileJson = null,
  phone = null,
  createdAt,
}) => {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const passwordHash = hashPassword(password);
  const updatedAt = nowIso();
  const created = createdAt || updatedAt;
  if (hasPostgres) {
    await query(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, company_json, profile_json, phone,
        mfa_enabled, totp_secret_encrypted, totp_pending_secret_encrypted, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,NULL,NULL,$10,$11)
    `, [
      id,
      normalizedEmail,
      passwordHash,
      String(firstName || '').trim() || 'Client',
      String(lastName || '').trim(),
      role,
      companyJson,
      profileJson,
      phone,
      created,
      updatedAt,
    ]);
    return;
  }
  sqlite.prepare(`
    INSERT INTO users (
      id, email, password_hash, first_name, last_name, role, company_json, profile_json, phone,
      mfa_enabled, totp_secret_encrypted, totp_pending_secret_encrypted, created_at, updated_at
    ) VALUES (
      @id, @email, @passwordHash, @firstName, @lastName, @role, @companyJson, @profileJson, @phone,
      0, NULL, NULL, @createdAt, @updatedAt
    )
  `).run({
    id,
    email: normalizedEmail,
    passwordHash,
    firstName: String(firstName || '').trim() || 'Client',
    lastName: String(lastName || '').trim(),
    role,
    companyJson,
    profileJson,
    phone,
    createdAt: created,
    updatedAt,
  });
};

const deleteAllUsers = async () => {
  if (hasPostgres) {
    await query('DELETE FROM users');
    return;
  }
  sqlite.prepare('DELETE FROM users').run();
};

export {
  createUser,
  getUserByEmail,
  getUserById,
  authenticateUser,
  updateUserRoleByEmail,
  updateUserProfile,
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserPasswordById,
  verifyUserPassword,
  listAllUserRecords,
  replaceUserRecord,
  deleteAllUsers,
  hashPassword,
};
