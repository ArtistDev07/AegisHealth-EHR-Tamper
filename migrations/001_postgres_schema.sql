-- AegisHealth Production PostgreSQL Relational Schema & Constraints
-- Designed for High Availability with Connection Pooling & Multi-AZ Replication

CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
    status VARCHAR(32) DEFAULT 'ACTIVE',
    contact_email VARCHAR(255) NOT NULL,
    retention_years INT DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    title VARCHAR(128),
    department VARCHAR(128),
    mfa_enabled BOOLEAN DEFAULT true,
    account_status VARCHAR(32) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_credentials (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id),
    medical_record_number VARCHAR(64) NOT NULL,
    mrn_blind_index VARCHAR(128) NOT NULL, -- Keyed HMAC-SHA-256 for searchable lookup without plaintext leakage
    email_blind_index VARCHAR(128) NOT NULL,
    record_status VARCHAR(32) DEFAULT 'ACTIVE',
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn_blind_index ON patients(mrn_blind_index);
CREATE INDEX IF NOT EXISTS idx_patients_email_blind_index ON patients(email_blind_index);
CREATE INDEX IF NOT EXISTS idx_patients_org ON patients(organization_id);

CREATE TABLE IF NOT EXISTS clinical_encounters (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) REFERENCES organizations(id),
    patient_id VARCHAR(64) REFERENCES patients(id) ON DELETE CASCADE,
    clinician_id VARCHAR(64) REFERENCES users(id),
    encounter_type VARCHAR(64) NOT NULL,
    encounter_status VARCHAR(32) DEFAULT 'DRAFT',
    encounter_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason_for_visit TEXT NOT NULL,
    clinical_notes_encrypted JSONB NOT NULL, -- AES-256-GCM Envelope encrypted
    assessment TEXT,
    plan TEXT,
    diagnoses JSONB DEFAULT '[]'::jsonb,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_encounters_patient ON clinical_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_clinician ON clinical_encounters(clinician_id);

-- Tamper-Evident Append-Only Cryptographic Audit Log
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    sequence_number BIGSERIAL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    organization_id VARCHAR(64) REFERENCES organizations(id),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_reference VARCHAR(255) NOT NULL,
    request_id VARCHAR(64),
    outcome VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64),
    purpose TEXT,
    record_version INT,
    field_diff JSONB,
    previous_event_hash VARCHAR(64) NOT NULL,
    event_hash VARCHAR(64) NOT NULL,
    checkpoint_signature VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_audit_sequence ON audit_events(sequence_number);
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_events(action);

-- Type 2 Slowly Changing Dimension (SCD) Record Versions
CREATE TABLE IF NOT EXISTS record_versions (
    id VARCHAR(64) PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    version_number INT NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_current BOOLEAN DEFAULT true,
    recorded_by VARCHAR(64) NOT NULL,
    recorded_by_name VARCHAR(255) NOT NULL,
    change_reason TEXT,
    snapshot_encrypted JSONB NOT NULL,
    previous_version_id VARCHAR(64),
    audit_event_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scd_entity ON record_versions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scd_current ON record_versions(entity_id, is_current);

-- Emergency Break-Glass Time-Bound Grants
CREATE TABLE IF NOT EXISTS break_glass_grants (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    patient_id VARCHAR(64) REFERENCES patients(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    clinical_justification TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE'
);

CREATE INDEX IF NOT EXISTS idx_break_glass_active ON break_glass_grants(user_id, patient_id, expires_at);
