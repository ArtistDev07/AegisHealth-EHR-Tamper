/**
 * Cryptographic Subsystem for Column-Level Encryption & Envelope Key Management
 * Uses standard Web Crypto API (AES-256-GCM, HMAC-SHA-256, SHA-256, PBKDF2) with:
 * - 256-bit AES-GCM authenticated cipher
 * - 96-bit unique cryptographically secure nonces per operation (no nonce reuse)
 * - Authenticated Additional Data (AAD) binding to (recordId:fieldName:orgId) to prevent ciphertext relocation attacks
 * - Keyed HMAC blind indexing for deterministic searchable identifiers without plaintext leakage
 * - PBKDF2 password hashing with 100,000 iterations for secure authentication
 */

import { keyProvider, BLIND_INDEX_HMAC_SECRET, LOCAL_DEV_MASTER_KEK_SECRET } from './keyManagement';

export interface CiphertextContainer {
  version: number;
  keyId: string;
  iv: string; // Base64
  ciphertext: string; // Base64
  tag: string; // Base64 authentication tag (128-bit)
  aadHash: string; // SHA-256 hash of bound authenticated additional data
}

// Master Key (KEK) & Active Data Encryption Keys (DEK) references
export const MOCK_KEK_SECRET = LOCAL_DEV_MASTER_KEK_SECRET;
export const DEK_SECRETS: Record<string, string> = {
  'key-dek-v1': 'aegis-dek-v1-super-secret-patient-field-encryption-key-01',
  'key-dek-v2': 'aegis-dek-v2-rotated-patient-field-encryption-key-02-future',
};

// Convert string to Uint8Array as BufferSource
export function strToBuffer(str: string): BufferSource {
  return new TextEncoder().encode(str) as unknown as BufferSource;
}

// Convert Uint8Array to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer as any);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Retrieve 256-bit CryptoKey via secure Key Provider abstraction
export async function getCryptoKey(keyId: string): Promise<CryptoKey> {
  return await keyProvider.getEncryptionKey(keyId);
}

/**
 * Encrypt a sensitive plaintext string with AES-256-GCM.
 * Binds Authenticated Additional Data (AAD) to prevent ciphertext swapping.
 */
export async function encryptField(
  plaintext: string,
  context: { recordId: string; fieldName: string; organizationId: string },
  overrideKeyId?: string
): Promise<CiphertextContainer> {
  const keyId = overrideKeyId || keyProvider.getActiveKeyId();
  const cryptoKey = await getCryptoKey(keyId);

  // Generate 12-byte (96-bit) cryptographically random IV (nonce)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Construct Authenticated Additional Data string
  const aadString = `aad:${context.organizationId}:${context.recordId}:${context.fieldName}`;
  const aadBuffer = strToBuffer(aadString);

  // Encrypt with AES-GCM (automatically includes 128-bit authentication tag at the end)
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aadBuffer,
      tagLength: 128,
    },
    cryptoKey,
    strToBuffer(plaintext)
  );

  // In Web Crypto AES-GCM, the ciphertext buffer includes the 16-byte tag at the end
  const encryptedBytes = new Uint8Array(encrypted);
  const tagLength = 16;
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - tagLength);

  // Compute AAD hash for validation
  const aadHashBuffer = await crypto.subtle.digest('SHA-256', aadBuffer);
  const aadHash = bufferToBase64(aadHashBuffer);

  return {
    version: keyId === 'key-dek-v2' ? 2 : 1,
    keyId,
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBytes),
    tag: bufferToBase64(tagBytes),
    aadHash,
  };
}

/**
 * Decrypt a CiphertextContainer with AES-256-GCM.
 * Validates authentication tag and bound AAD context.
 */
export async function decryptField(
  container: CiphertextContainer,
  context: { recordId: string; fieldName: string; organizationId: string }
): Promise<string> {
  try {
    const cryptoKey = await getCryptoKey(container.keyId);
    const iv = base64ToBuffer(container.iv);
    const ciphertext = base64ToBuffer(container.ciphertext);
    const tag = base64ToBuffer(container.tag);

    // Reconstruct full buffer (ciphertext + tag) for Web Crypto
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext, 0);
    combined.set(tag, ciphertext.length);

    const aadString = `aad:${context.organizationId}:${context.recordId}:${context.fieldName}`;
    const aadBuffer = strToBuffer(aadString);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
        additionalData: aadBuffer,
        tagLength: 128,
      },
      cryptoKey,
      combined as unknown as BufferSource
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    throw new Error(
      `Decryption failed for field '${context.fieldName}'. Ciphertext integrity check failed or context mismatched.`
    );
  }
}

/**
 * Re-encrypt ciphertext from existing key version to a target key version (Key Rotation).
 * Verifies authenticity of source ciphertext before re-encrypting.
 */
export async function reEncryptField(
  container: CiphertextContainer,
  newKeyId: string,
  context: { recordId: string; fieldName: string; organizationId: string }
): Promise<CiphertextContainer> {
  const decrypted = await decryptField(container, context);
  return await encryptField(decrypted, context, newKeyId);
}

/**
 * Generate a deterministic keyed blind index hash for search queries (HMAC-SHA-256)
 * Normalized and salt-keyed with isolated blind-index secret and tenant scoping
 * so raw medical record numbers or emails are never indexed or queried in plaintext.
 */
export async function generateBlindIndex(
  value: string,
  domain: 'MRN' | 'EMAIL',
  tenantId: string = 'org-aegis-01'
): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const salt = `blind-index-salt-${tenantId}-${domain}-${BLIND_INDEX_HMAC_SECRET}`;
  const key = await crypto.subtle.importKey(
    'raw',
    strToBuffer(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, strToBuffer(normalized));
  return bufferToBase64(signature);
}

/**
 * Compute SHA-256 hex digest
 */
export async function sha256Hex(input: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', strToBuffer(input));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * PBKDF2 Password Hashing & Verification
 * 100,000 iterations with SHA-256
 */
export async function hashPassword(password: string, existingSaltHex?: string): Promise<{ hashHex: string; saltHex: string }> {
  let saltBytes: Uint8Array;
  if (existingSaltHex) {
    const saltMatch = existingSaltHex.match(/.{1,2}/g) || [];
    saltBytes = new Uint8Array(saltMatch.map(byte => parseInt(byte, 16)));
  } else {
    saltBytes = crypto.getRandomValues(new Uint8Array(16));
  }

  const baseKey = await crypto.subtle.importKey(
    'raw',
    strToBuffer(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const saltArray = Array.from(saltBytes);
  const saltHex = saltArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { hashHex, saltHex };
}

export async function verifyPassword(password: string, storedHashHex: string, saltHex: string): Promise<boolean> {
  const { hashHex } = await hashPassword(password, saltHex);
  return hashHex === storedHashHex;
}

/**
 * Key Rotation Utilities
 */
export function getActiveKeyId(): string {
  return keyProvider.getActiveKeyId();
}

export function setActiveKeyId(newKeyId: string): void {
  keyProvider.setActiveKeyId(newKeyId);
}
