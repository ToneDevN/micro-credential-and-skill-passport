const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const RAW_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'default_secret_token_encryption_key_32b!';
// Ensure exactly 32-byte Buffer via SHA-256
const SECRET_KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
const IV_LENGTH = 16;

/**
 * Encrypts plaintext string using AES-256-CBC
 * @param {string} text
 * @returns {string} iv:ciphertext
 */
function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts encrypted text (iv:ciphertext)
 * @param {string} encryptedText
 * @returns {string|null} decrypted plaintext or null if invalid/corrupted
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
