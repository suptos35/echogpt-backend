import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey =
      this.configService.get<string>('encryption.key') ||
      '01234567890123456789012345678901';
    // Ensure key is strictly 32 bytes for AES-256
    this.key = Buffer.from(rawKey.padEnd(32, '0').slice(0, 32), 'utf-8');
  }

  /**
   * Encrypt plaintext string using AES-256-CBC with a random 16-byte IV
   * Returns formatted string: "<iv_hex>:<ciphertext_hex>"
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return '';
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt AES-256-CBC ciphertext string formatted as "<iv_hex>:<ciphertext_hex>"
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      return '';
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid ciphertext format: missing IV separator');
    }

    const [ivHex, encryptedText] = parts;
    if (ivHex.length !== 32 || !encryptedText) {
      throw new Error('Invalid ciphertext format: malformed IV or payload');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
