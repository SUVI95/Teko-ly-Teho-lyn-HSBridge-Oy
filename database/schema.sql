-- Database schema for student learning platform
-- PostgreSQL database schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE
);

-- Student progress table
CREATE TABLE IF NOT EXISTS student_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(100) NOT NULL,
    section_id VARCHAR(100),
    completed BOOLEAN DEFAULT FALSE,
    progress_data JSONB,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent INTEGER DEFAULT 0, -- in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_id, section_id)
);

-- Checklist items completion
CREATE TABLE IF NOT EXISTS checklist_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_id, item_id)
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for password resets
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module ON student_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_checklist_user_module ON checklist_items(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_student_progress_updated_at 
    BEFORE UPDATE ON student_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Reflections table for storing user reflections/feedback
CREATE TABLE IF NOT EXISTS reflections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(100) NOT NULL,
    reflection_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Closing actions table for Module 10
CREATE TABLE IF NOT EXISTS closing_actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reflections
CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_module ON reflections(module_id);
CREATE INDEX IF NOT EXISTS idx_closing_actions_user_id ON closing_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);

-- Feedback table for course feedback
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(100),
    question_type VARCHAR(50) NOT NULL, -- 'what_learned', 'learned_new', 'course_feedback'
    feedback_text TEXT,
    rating INTEGER, -- 1-5 for course feedback
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_module ON feedback(module_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(question_type);

-- GDPR Consent table
CREATE TABLE IF NOT EXISTS gdpr_consent (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    consent_given BOOLEAN NOT NULL,
    consent_type VARCHAR(50) NOT NULL DEFAULT 'data_processing', -- 'data_processing', 'cookies', etc.
    ip_address VARCHAR(45), -- IPv6 can be up to 45 chars
    user_agent TEXT,
    consent_text TEXT, -- Store the exact text user consented to
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, consent_type)
);

-- Indexes for GDPR consent
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_user_id ON gdpr_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_type ON gdpr_consent(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_created ON gdpr_consent(created_at);

-- Pre-course needs mapping (onboarding)
CREATE TABLE IF NOT EXISTS user_onboarding (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employment_status VARCHAR(120) NOT NULL,
    profession VARCHAR(500) NOT NULL,
    biggest_challenge TEXT NOT NULL,
    current_task TEXT,
    ai_experience VARCHAR(120) NOT NULL,
    known_ai_tools TEXT,
    ai_goals TEXT NOT NULL,
    ai_confidence VARCHAR(120),
    desired_outcome TEXT,
    recommended_tool VARCHAR(120),
    ai_feeling VARCHAR(200) NOT NULL,
    ai_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_created ON user_onboarding(created_at);

-- Loppumoduuli — Sinä ja tekoäly
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS final_module_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reflection_text TEXT NOT NULL,
    answers_json JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT final_module_reflections_user_unique UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_final_module_reflections_user ON final_module_reflections(user_id);

CREATE TABLE IF NOT EXISTS final_module_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    automation_name VARCHAR(200) NOT NULL,
    generated_prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_final_module_automations_user ON final_module_automations(user_id);

CREATE TABLE IF NOT EXISTS final_module_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_path VARCHAR(500) NOT NULL,
    caption TEXT NOT NULL,
    image_prompt_used TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_final_module_gallery_user ON final_module_gallery(user_id);
CREATE INDEX IF NOT EXISTS idx_final_module_gallery_created ON final_module_gallery(created_at DESC);

-- Myytinmurtaja
CREATE TABLE IF NOT EXISTS mythology_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    myth_selected TEXT NOT NULL,
    perplexity_finding TEXT,
    claude_argument TEXT,
    own_voice TEXT,
    final_argument TEXT NOT NULL,
    ai_evaluation TEXT,
    strength_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mythology_submissions_user ON mythology_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mythology_submissions_score ON mythology_submissions(strength_score DESC);

-- Rikkinäinen Prompti
CREATE TABLE IF NOT EXISTS broken_prompt_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_broken_prompt_user ON broken_prompt_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_broken_prompt_round ON broken_prompt_submissions(round);
