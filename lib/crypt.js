const crypto = require('crypto');

function generateSecretKey(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) { randomString += characters[bytes[i] % characters.length]; }
    return randomString;
}

function createCipheriv(iv, key) {
  return crypto.createCipheriv('aes-256-cbc', key, iv);
}

function createDecipheriv(iv, key) {
  return crypto.createDecipheriv('aes-256-cbc', key, iv);
}

function encryptData(data, key) {
    const content_iv = crypto.randomBytes(16);
    const data_cipher = createCipheriv(content_iv, key);
    const encrypted_data = Buffer.concat([content_iv, data_cipher.update(data), data_cipher.final()]);
    return encrypted_data;
}

function decryptData(data, key) {
    const content_iv = data.slice(0, 16);
    const encrypted_data = data.slice(16);
    const data_decipher = createDecipheriv(content_iv, key);
    const decrypted_data = Buffer.concat([data_decipher.update(encrypted_data), data_decipher.final()]);
    return decrypted_data;
}

module.exports = {
    generateSecretKey,
    createCipheriv,
    createDecipheriv,
    encryptData,
    decryptData
};
