import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage root directory outside web root (./storage/documents)
const STORAGE_ROOT = process.env.STORAGE_PATH || path.resolve(__dirname, '../../storage/documents');

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ENCRYPTION_MAGIC = Buffer.from('NEXTAL_ENC_V1'); // 13 bytes

export function getEncryptionKey() {
  const keyStr = process.env.DOCUMENT_ENCRYPTION_KEY || 'nextal_doc_encryption_key_32_b!';
  const keyBuf = Buffer.from(keyStr, keyStr.length === 64 ? 'hex' : 'utf8');
  if (keyBuf.length !== 32) {
    return crypto.createHash('sha256').update(keyBuf).digest();
  }
  return keyBuf;
}

/**
 * Validates file buffer by inspecting magic bytes
 * Ensures content-type matches actual binary payload, not just extension
 *
 * @param {Buffer} buffer
 * @returns {string|null} Detected MIME type or null if invalid
 */
export function detectMimeType(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // PNG magic bytes: \x89PNG\r\n\x1a\n (89 50 4E 47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // JPEG / JPG magic bytes: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  return null;
}

export class StorageService {
  constructor(storageDir = STORAGE_ROOT) {
    this.storageDir = storageDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Validates and saves a file to storage
   *
   * @param {Object} params
   * @param {Buffer} params.buffer - File buffer
   * @param {string} params.originalName - Uploaded file name
   * @param {string} [params.mimeType] - Declared mime type
   * @returns {Promise<{ storagePath: string, fileName: string, mimeType: string, size: number }>}
   */
  async saveFile({ buffer, originalName, mimeType }) {
    if (!buffer || buffer.length === 0) {
      const err = new Error('Empty file uploaded');
      err.status = 400;
      err.code = 'INVALID_FILE_EMPTY';
      throw err;
    }

    if (buffer.length > MAX_FILE_SIZE) {
      const err = new Error('File exceeds maximum size limit of 10 MB');
      err.status = 400;
      err.code = 'FILE_TOO_LARGE';
      throw err;
    }

    const detectedMime = detectMimeType(buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      const err = new Error('Invalid file format. Only PDF, JPG, and PNG are allowed');
      err.status = 400;
      err.code = 'INVALID_FILE_TYPE';
      throw err;
    }

    // Generate unique storage filename with original extension
    const ext = path.extname(originalName) || (detectedMime === 'application/pdf' ? '.pdf' : detectedMime === 'image/png' ? '.png' : '.jpg');
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safeFileName = `${Date.now()}_${randomHex}${ext.toLowerCase()}`;
    const destination = path.join(this.storageDir, safeFileName);

    // Encrypt file at rest with AES-256-GCM (W3 / FR-EM5)
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedData = Buffer.concat([
      ENCRYPTION_MAGIC,
      iv,
      authTag,
      ciphertext,
    ]);

    await fs.promises.writeFile(destination, encryptedData);

    return {
      storagePath: safeFileName,
      fileName: path.basename(originalName),
      mimeType: detectedMime,
      size: buffer.length,
    };
  }

  /**
   * Retrieves a file for download/streaming, decrypting if encrypted (W3 / FR-EM5)
   *
   * @param {string} storagePath - Relative storage filename
   * @returns {Promise<{ stream: NodeJS.ReadableStream, mimeType: string, size: number, exists: boolean }>}
   */
  async getFile(storagePath) {
    const safePath = path.basename(storagePath);
    const fullPath = path.join(this.storageDir, safePath);

    if (!fs.existsSync(fullPath)) {
      const err = new Error('File not found in storage');
      err.status = 404;
      err.code = 'FILE_NOT_FOUND';
      throw err;
    }

    const rawBuffer = await fs.promises.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';

    // Check if file is encrypted with NEXTAL_ENC_V1
    if (
      rawBuffer.length >= ENCRYPTION_MAGIC.length + 28 &&
      rawBuffer.subarray(0, ENCRYPTION_MAGIC.length).equals(ENCRYPTION_MAGIC)
    ) {
      const key = getEncryptionKey();
      const iv = rawBuffer.subarray(13, 25);
      const authTag = rawBuffer.subarray(25, 41);
      const ciphertext = rawBuffer.subarray(41);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      return {
        stream: Readable.from(decrypted),
        mimeType,
        size: decrypted.length,
        exists: true,
      };
    }

    // Unencrypted legacy fallback
    return {
      stream: fs.createReadStream(fullPath),
      mimeType,
      size: rawBuffer.length,
      exists: true,
    };
  }

  /**
   * Deletes a file from storage
   *
   * @param {string} storagePath
   */
  async deleteFile(storagePath) {
    if (!storagePath) return;
    const safePath = path.basename(storagePath);
    const fullPath = path.join(this.storageDir, safePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath).catch(() => {});
    }
  }
}

export const storage = new StorageService();
export default storage;
