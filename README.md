# AegisHealth EHR & Tamper-Evident Audit System

Production-oriented Electronic Health Record (EHR) web application featuring column-level encryption (AES-256-GCM), five-tier role-based access control (RBAC), and a tamper-evident cryptographic audit log.

---

## 1. Quick Evaluation & Test Personas

Use the **Role Selector** in the top navigation bar or the **1-Click Test Personas** on the Sign-In page (`/login`) to instantly switch between the five supported roles:

| Role | Name & Email | Permissions & Boundaries |
| :--- | :--- | :--- |
| **Doctor** | `dr_sarah_chen@aegishealth.org`<br>Dr. Sarah Chen, MD | Access assigned patients (`PAT-101`, `PAT-102`, `PAT-103`), create and edit encounters, record observations, prescribe medications. Access to unassigned chart (`PAT-104`) requires **Break-Glass Emergency Access**. |
| **Patient** | `alex_morgan@example.com`<br>Alex Morgan | View personal health summary, lab results (HbA1c, CMP-14), appointments, active consents, and inspect the transparent **"Who accessed my records"** disclosure history. |
| **Insurance** | `elena_rostova@apexinsurance.com`<br>Elena Rostova | Minimum-necessary claim adjudication (`CLM-2026-8801`, `CLM-2026-8802`). Can approve, reject, or request additional information with mandatory justification. Direct clinical record tampering is blocked. |
| **Administrator** | `marcus_vance@aegishealth.org`<br>Marcus Vance | User management (invitations, suspensions), RBAC permissions catalog, envelope key rotation (KMS DEK v1 to v2), backup/recovery status. Administratively barred from viewing clinical health notes. |
| **Security Auditor**| `dr_hassan_malik@auditguard.org`<br>Dr. Hassan Malik | Independent regulatory oversight. Inspect append-only audit stream, execute **Cryptographic Integrity Verification**, review security events, and export signed compliance dossiers. |

---

## 2. Core Architectural Features

1. **Column-Level Envelope Encryption (AES-256-GCM)**
   - Protects clinical notes, diagnoses, and personal contact details at the application layer.
   - Nonces are 96-bit cryptographically random buffers generated via `crypto.getRandomValues`.
   - Bound Authenticated Additional Data (`aad:${orgId}:${recordId}:${fieldName}`) prevents ciphertext relocation attacks.

2. **Tamper-Evident SHA-256 Audit Trail**
   - Every read, write, export, authentication, and access denial updates an append-only cryptographic hash chain.
   - Built-in verification engine validates sequential hashes and link integrity.
   - Testable via the **"Simulate Tamper"** button in `/admin/audit/integrity` to demonstrate mathematical detection of altered records.

3. **Type 2 Slowly Changing Dimension (SCD) Record Versioning**
   - All mutations to patient records, clinical encounters, and consents create immutable historical versions.
   - Enforces optimistic concurrency control (`expectedVersion`) to prevent overwrite conflicts.

4. **Emergency Break-Glass Access Workflow**
   - Clinicians in urgent care situations can request time-bound (1-hour) emergency access to unassigned patient charts by submitting a clinical justification, immediately creating an elevated security event.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Design Tokens:** Clean healthcare enterprise palette (Navy `#142238`, Royal Blue `#2457C5`, Cool Gray `#F4F7FB`, Border `#DCE3EC`)
- **Typography:** Plus Jakarta Sans (Display & Hierarchy) & IBM Plex Mono (Cryptographic Hashes & Tabular Numerals)
- **Security:** Web Cryptography API (AES-256-GCM, HMAC-SHA-256, SHA-256)
