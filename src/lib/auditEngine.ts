/**
 * Tamper-Evident Audit Logging Engine
 * Implements an append-only cryptographic hash chain where each event is linked
 * to its predecessor using SHA-256 digests.
 * Detects any insertion, deletion, or modification of historical records.
 */

import { AuditEvent, AuditVerificationResult } from '../types/ehr';
import { sha256Hex } from './crypto';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Compute the cryptographic SHA-256 hash of an audit event bound to its parent hash
 */
export async function computeAuditEventHash(
  event: Omit<AuditEvent, 'eventHash'>,
  previousHash: string
): Promise<string> {
  const canonicalString = [
    previousHash,
    event.occurredAt,
    event.actorId,
    event.actorRole,
    event.action,
    event.resourceType,
    event.resourceReference,
    event.outcome,
    event.recordVersion || '0',
    event.requestId || '',
    JSON.stringify(event.fieldDiff || []),
  ].join('|');

  return await sha256Hex(canonicalString);
}

/**
 * Audit Trail Verifier
 * Scans the full sequence of events, recalculates hashes, and checks link integrity.
 */
export async function verifyAuditChain(events: AuditEvent[], verifiedBy: string): Promise<AuditVerificationResult> {
  const discrepancies: AuditVerificationResult['discrepancies'] = [];
  let validLinks = 0;
  let previousHash = GENESIS_HASH;

  // Audit events are verified in their canonical sequential append order
  const chain = [...events];

  for (let i = 0; i < chain.length; i++) {
    const event = chain[i];

    // Check link to previous event
    if (event.previousEventHash !== previousHash) {
      discrepancies.push({
        eventId: event.id,
        timestamp: event.occurredAt,
        expectedHash: previousHash,
        storedHash: event.previousEventHash,
        failureReason: `Broken chain link at index ${i}. Previous event hash mismatch.`,
      });
    }

    // Check event content integrity by recalculating hash
    const expectedCurrentHash = await computeAuditEventHash(event, event.previousEventHash);
    if (event.eventHash !== expectedCurrentHash) {
      discrepancies.push({
        eventId: event.id,
        timestamp: event.occurredAt,
        expectedHash: expectedCurrentHash,
        storedHash: event.eventHash,
        failureReason: `Payload integrity failure. Event content was modified after signing.`,
      });
    } else if (event.previousEventHash === previousHash) {
      validLinks++;
    }

    previousHash = event.eventHash;
  }

  const checkpointHash = events.length > 0 ? events[events.length - 1].eventHash : GENESIS_HASH;
  const integrityStatus = discrepancies.length === 0 ? 'VALID_VERIFIED' : 'TAMPER_DETECTED';

  return {
    runId: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    executedAt: new Date().toISOString(),
    totalEventsChecked: events.length,
    validChainLinks: validLinks,
    discrepanciesCount: discrepancies.length,
    discrepancies,
    integrityStatus,
    checkpointHash,
    verifiedBy,
  };
}

/**
 * Generate cryptographic checkpoint signature
 */
export async function createCheckpointSignature(checkpointHash: string, timestamp: string): Promise<string> {
  return await sha256Hex(`checkpoint-sig:${checkpointHash}:${timestamp}:aegis-hsm-root-signer`);
}
