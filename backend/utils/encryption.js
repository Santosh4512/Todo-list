const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.AUTH_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-secret-key-please-change-it1234';
const KEY = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const encryptText = (plainText) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

const decryptText = (encryptedText) => {
  if (!encryptedText) return null;
  const data = Buffer.from(encryptedText, 'base64');
  const iv = data.slice(0, IV_LENGTH);
  const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
};

module.exports = { encryptText, decryptText };
