/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {string} legalStructure - SAS, SARL, EIRL, Micro-entreprise, Auto-entrepreneur
 * @property {string} location
 * @property {string} lastLogin - ISO date string
 * @property {string} createdAt - ISO date string
 */

/**
 * @typedef {Object} Dossier
 * @property {string} id
 * @property {string} title
 * @property {string} status - En cours, Terminé, En attente
 * @property {string} type
 * @property {string} createdAt - ISO date string
 * @property {string} dueDate - ISO date string
 * @property {string[]} documents - Array of document IDs
 * @property {string} description
 */

/**
 * @typedef {Object} Document
 * @property {string} id
 * @property {string} name
 * @property {string} status - Demandé, En attente, Validé, Refusé
 * @property {string} dossierID
 * @property {string} uploadedAt - ISO date string
 * @property {number} size - in bytes
 * @property {number} progress - 0-100
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} message
 * @property {string} type - success, error, info, warning
 * @property {string} createdAt - ISO date string
 * @property {boolean} read
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} role - user, assistant
 * @property {string} content
 * @property {string} timestamp - ISO date string
 */

/**
 * @typedef {Object} AIContext
 * @property {string} userStructure
 * @property {string} userLocation
 * @property {number} activeDossiers
 */

export {};