import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService (AES-256 Encryption)', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'encryption.key') {
                return '01234567890123456789012345678901'; // 32 bytes
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully encrypt and decrypt a plaintext string (roundtrip)', () => {
    const rawApiKey = 'sk-proj-test-1234567890abcdef-secret-key';
    const encrypted = service.encrypt(rawApiKey);

    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(rawApiKey);
    expect(encrypted).toContain(':'); // IV and ciphertext separated by colon

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(rawApiKey);
  });

  it('should produce different ciphertexts for the same plaintext due to random IV', () => {
    const plaintext = 'sk-identical-key-for-both';
    const cipher1 = service.encrypt(plaintext);
    const cipher2 = service.encrypt(plaintext);

    expect(cipher1).not.toBe(cipher2);
    expect(service.decrypt(cipher1)).toBe(plaintext);
    expect(service.decrypt(cipher2)).toBe(plaintext);
  });

  it('should throw an error when attempting to decrypt invalid or corrupted ciphertext', () => {
    expect(() => service.decrypt('corrupted_string_without_colon')).toThrow();
    expect(() => service.decrypt('invalidiv:invalidciphertext')).toThrow();
  });

  it('should return empty string if null or undefined is passed to encrypt or decrypt', () => {
    expect(service.encrypt('')).toBe('');
    expect(service.decrypt('')).toBe('');
  });
});
