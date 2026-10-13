# AegisHealth EHR & Tamper-Evident Audit System — Architecture & Security Specification

## 1. System Overview & Core Capabilities

AegisHealth is a production-oriented Electronic Health Record (EHR) system featuring:
1. **Column-Level Envelope Encryption:** Sensitive Protected Health Information (PHI) such as clinical SOAP notes, personal identifiers, and diagnoses are encrypted at the field level with AES-256-GCM before persistent storage. Data Encryption Keys (DEKs) are managed separately from application databases.
2. **Deep Role-Based Access Control (RBAC):** Deny-by-default access control strictly segregated across five distinct roles:
   - **Doctor:** Direct care clinicians accessing assigned patients, entering vitals, documenting clinical encounters, and ordering medications. Unassigned charts require an audited emergency Break-Glass grant.
   - **Patient:** Individuals accessing their own personal health record, lab results, appointments, and transparent "Who accessed my records" disclosure audit log.
   - **Insurance Agent:** Third-party claims adjudicators restricted strictly to minimum-necessary medical evidence for assigned claims. Prohibited from viewing unapproved records or modifying clinical facts.
   - **System Administrator:** Platform operators managing user provisioning, RBAC definitions, encryption key rotation, and system health. Administratively barred from direct clinical chart inspection.
   - **Security Auditor:** Independent regulatory compliance monitors with read-only access to audit logs, security events, and cryptographic chain verification.
3. **Tamper-Evident Historical Auditing:** Every sensitive read, write, export, authentication attempt, and access denial is written to an append-only cryptographic hash chain where each event is bound to its predecessor via SHA-256 digests.
4. **Type 2 Slowly Changing Dimension (SCD) Record Versioning:** Clinical record edits preserve immutable historical versions with optimistic concurrency control (`expectedVersion`) preventing overwrite collisions.

---

## 2. Cryptographic Architecture

### 2.1 Authenticated Encryption (AES-256-GCM)
- **Algorithm:** AES-256 in Galois/Counter Mode (GCM).
- **Initialization Vector (Nonce):** 96-bit cryptographically secure pseudorandom numbers generated via `crypto.getRandomValues`. Nonce reuse is strictly prohibited.
- **Authentication Tag:** 128-bit integrity tag appended to the ciphertext.
- **Authenticated Additional Data (AAD):** Binds ciphertext to `aad:${organizationId}:${recordId}:${fieldName}` to prevent ciphertext relocation or field-swapping attacks.

### 2.2 Blind Indexing (HMAC-SHA-256)
Searchable identifiers (Medical Record Numbers, Emails) are normalized and hashed using keyed HMAC-SHA-256 blind indexing so exact queries can be resolved without storing or querying raw plaintext identifiers.

### 2.3 Key Lifecycle & Envelope Rotation
The system supports multi-version key rings (`key-dek-v1`, `key-dek-v2`) wrapped by an external Key Encryption Key (KEK). Rotating keys preserves decryptability of existing historical ciphertext.

---

## 3. Tamper-Evident Audit Logging Engine

### 3.1 Hash Chaining Model
Each audit block is cryptographically chained:
$$\text{EventHash}_i = \text{SHA256}(\text{EventHash}_{i-1} \parallel \text{Timestamp} \parallel \text{ActorID} \parallel \text{Action} \parallel \text{ResourceType} \parallel \text{ResourceRef} \parallel \text{Outcome} \parallel \text{Version})$$

### 3.2 Verification Algorithm
The verification engine walks the chain from genesis, recalculates each digest, and validates sequential parent links. If an adversary modifies any historical log or injects a record, the verification immediately identifies the exact corrupted node and discrepancy.

---

## 4. Emergency Break-Glass Workflow
In life-threatening circumstances, clinicians can request time-bound (1-hour) emergency access to unassigned patient charts by submitting a mandatory clinical justification. This immediately generates a high-priority security audit alert for retrospective review.
