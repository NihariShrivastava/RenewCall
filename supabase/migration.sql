-- ========================================================
-- RENEWCALL DATABASE SCHEMA MIGRATION
-- Project: Insurance Renewal Follow-Up Calling System
-- Compatible with Supabase PostgreSQL (PostgREST / JSONB)
-- ========================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
-- Custom auth system with plain-text credentials for Admin transparency
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL DEFAULT '',
    email VARCHAR(100) NOT NULL DEFAULT '',
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'telecaller')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    first_login BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. UPLOAD BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.upload_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    column_headers JSONB NOT NULL DEFAULT '[]'::jsonb,
    column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_rows INT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES public.upload_batches(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb, -- The FULL original Excel row, dynamic columns
    customer_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    policy_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'pending', 'done', 'closed', 'reverted')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    skip_count INT NOT NULL DEFAULT 0,
    next_call_date DATE,
    last_remark TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LEAD ACTIVITY (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.lead_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN ('assigned', 'skipped', 'done', 'closed', 'reverted', 'remark', 'reassigned', 'unassigned')),
    remark TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CUSTOM DASHBOARDS TABLE
CREATE TABLE IF NOT EXISTS public.custom_dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_next_call_date ON public.leads(next_call_date);
CREATE INDEX IF NOT EXISTS idx_leads_policy_date ON public.leads(policy_date);
CREATE INDEX IF NOT EXISTS idx_leads_batch_id ON public.leads(batch_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);

-- GIN Index on dynamic data JSONB for rapid searching across any Excel column
CREATE INDEX IF NOT EXISTS idx_leads_data_gin ON public.leads USING GIN (data);

CREATE INDEX IF NOT EXISTS idx_lead_activity_lead_id ON public.lead_activity(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_user_id ON public.lead_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_created_at ON public.lead_activity(created_at);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_dashboards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to allow safe re-running
DROP POLICY IF EXISTS "Public full access users" ON public.users;
CREATE POLICY "Public full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access upload_batches" ON public.upload_batches;
CREATE POLICY "Public full access upload_batches" ON public.upload_batches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access leads" ON public.leads;
CREATE POLICY "Public full access leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access lead_activity" ON public.lead_activity;
CREATE POLICY "Public full access lead_activity" ON public.lead_activity FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access custom_dashboards" ON public.custom_dashboards;
CREATE POLICY "Public full access custom_dashboards" ON public.custom_dashboards FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- SEED INITIAL DATA (DEFAULT ADMIN ONLY)
-- ========================================================
INSERT INTO public.users (username, password, full_name, phone, email, role, is_active, first_login)
VALUES 
  ('admin', 'admin123', 'Administrator', '9876543210', 'admin@renewcall.com', 'admin', true, false)
ON CONFLICT (username) DO NOTHING;

-- Cleanup any legacy mock telecallers if previously inserted
DELETE FROM public.users WHERE username IN ('kuldeep', 'rohit', 'himanshi');
