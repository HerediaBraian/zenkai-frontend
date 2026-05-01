-- =====================================================================
-- ZENKAI - Setup de Roles y Permisos
-- Correr en el SQL Editor de tu Supabase de producción
-- Es IDEMPOTENTE: podés correrlo varias veces sin romper nada.
-- También aplicable con: npx supabase db push (si el proyecto está linkeado)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Función helper update_updated_at_column (por si no existe)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 1) Enum de roles
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'usuario');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Tabla user_roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3) Tabla user_status
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4) Funciones (security definer)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin_email(_email TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE
AS $$ SELECT lower(_email) = 'pfbraianheredia@gmail.com' $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'usuario' THEN 3
  END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'super_admin'::app_role)
$$;

-- ---------------------------------------------------------------------
-- 5) Trigger: asignar rol automáticamente al crear cuenta nueva
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin_email(NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.user_status (user_id, email, is_active)
  VALUES (NEW.id, NEW.email, true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ---------------------------------------------------------------------
-- 6) BACKFILL: asignar roles a los usuarios YA EXISTENTES
--    (esto es lo que va a darle super_admin a tu cuenta)
-- ---------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM auth.users
WHERE public.is_super_admin_email(email)
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'usuario'::public.app_role FROM auth.users
WHERE NOT public.is_super_admin_email(email)
  AND id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;

INSERT INTO public.user_status (user_id, email, is_active)
SELECT id, email, true FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7) RLS user_roles
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins see all roles" ON public.user_roles;
CREATE POLICY "Admins see all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert roles (not super_admin)" ON public.user_roles;
CREATE POLICY "Admins insert roles (not super_admin)" ON public.user_roles
  FOR INSERT WITH CHECK (
    (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
    AND role <> 'super_admin'
  );

DROP POLICY IF EXISTS "Admins delete roles (not super_admin)" ON public.user_roles;
CREATE POLICY "Admins delete roles (not super_admin)" ON public.user_roles
  FOR DELETE USING (
    (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
    AND role <> 'super_admin'
  );

-- ---------------------------------------------------------------------
-- 8) RLS user_status
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users see own status" ON public.user_status;
CREATE POLICY "Users see own status" ON public.user_status
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins see all status" ON public.user_status;
CREATE POLICY "Admins see all status" ON public.user_status
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update status" ON public.user_status;
CREATE POLICY "Admins update status" ON public.user_status
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert status" ON public.user_status;
CREATE POLICY "Admins insert status" ON public.user_status
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_user_status_updated_at ON public.user_status;
CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 9) Permisos sobre las funciones SECURITY DEFINER
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_super_admin_email(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_super_admin_email(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_super(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin_or_super(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10) Policies "Admins read all" sobre todas las tablas operativas
--     (admin/super_admin pueden VER datos de todos los usuarios)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins read all clients" ON public.clients;
CREATE POLICY "Admins read all clients" ON public.clients
  FOR SELECT USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins read all activities" ON public.activities;
CREATE POLICY "Admins read all activities" ON public.activities
  FOR SELECT USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins read all schedules" ON public.schedules;
CREATE POLICY "Admins read all schedules" ON public.schedules
  FOR SELECT USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins read all enrollments" ON public.enrollments;
CREATE POLICY "Admins read all enrollments" ON public.enrollments
  FOR SELECT USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins read all attendance" ON public.attendance;
CREATE POLICY "Admins read all attendance" ON public.attendance
  FOR SELECT USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins read all income" ON public.income;
CREATE POLICY "Admins read all income" ON public.income
  FOR SELECT USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins read all financial_config" ON public.financial_config;
CREATE POLICY "Admins read all financial_config" ON public.financial_config
  FOR SELECT USING (public.is_admin_or_super(auth.uid()));

-- WODs (saltean si las tablas no existen aún en producción)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='wods') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins read all wods" ON public.wods';
    EXECUTE 'CREATE POLICY "Admins read all wods" ON public.wods FOR SELECT USING (public.is_admin_or_super(auth.uid()))';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='wod_results') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins read all wod_results" ON public.wod_results';
    EXECUTE 'CREATE POLICY "Admins read all wod_results" ON public.wod_results FOR SELECT USING (public.is_admin_or_super(auth.uid()))';
  END IF;
END $$;

-- =====================================================================
-- VERIFICACIÓN FINAL: descomentá para confirmar que tu cuenta quedó como super_admin
-- =====================================================================
-- SELECT u.email, ur.role
-- FROM auth.users u
-- JOIN public.user_roles ur ON ur.user_id = u.id
-- WHERE u.email = 'pfbraianheredia@gmail.com';
