
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('tenant', 'owner', 'admin');
CREATE TYPE public.listing_status AS ENUM ('active', 'filled');
CREATE TYPE public.interest_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.room_type AS ENUM ('private', 'shared', 'studio', 'entire_place');
CREATE TYPE public.furnishing AS ENUM ('furnished', 'semi_furnished', 'unfurnished');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- handle new user trigger: create profile and assign default role (tenant) unless metadata says otherwise
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
  _name TEXT;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, display_name, email) VALUES (NEW.id, _name, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'tenant'::public.app_role);
  IF _role = 'admin' THEN _role := 'tenant'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- listings
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  rent_monthly INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  available_from DATE NOT NULL,
  room_type public.room_type NOT NULL DEFAULT 'private',
  furnishing public.furnishing NOT NULL DEFAULT 'unfurnished',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.listing_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_select_active_or_own_or_admin" ON public.listings FOR SELECT TO authenticated
  USING (status = 'active' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings_insert_owner" ON public.listings FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'owner'));
CREATE POLICY "listings_update_own_or_admin" ON public.listings FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listings_delete_own_or_admin" ON public.listings FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- tenant_profiles
CREATE TABLE public.tenant_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_location TEXT NOT NULL,
  budget_min INT NOT NULL,
  budget_max INT NOT NULL,
  move_in_date DATE NOT NULL,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_profiles TO authenticated;
GRANT ALL ON public.tenant_profiles TO service_role;
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_profiles_select_auth" ON public.tenant_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "tenant_profiles_upsert_own" ON public.tenant_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tenant_profiles_update_own" ON public.tenant_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tenant_profiles_delete_own" ON public.tenant_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER tenant_profiles_updated_at BEFORE UPDATE ON public.tenant_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- compatibility_scores
CREATE TABLE public.compatibility_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  explanation TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'llm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compatibility_scores TO authenticated;
GRANT ALL ON public.compatibility_scores TO service_role;
ALTER TABLE public.compatibility_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores_select_related" ON public.compatibility_scores FOR SELECT TO authenticated
  USING (tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "scores_insert_own" ON public.compatibility_scores FOR INSERT TO authenticated WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "scores_update_own" ON public.compatibility_scores FOR UPDATE TO authenticated USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

-- interests
CREATE TABLE public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.interest_status NOT NULL DEFAULT 'pending',
  score INT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interests TO authenticated;
GRANT ALL ON public.interests TO service_role;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interests_select_party" ON public.interests FOR SELECT TO authenticated
  USING (tenant_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "interests_insert_tenant" ON public.interests FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "interests_update_owner_or_tenant" ON public.interests FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR tenant_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR tenant_id = auth.uid());
CREATE TRIGGER interests_updated_at BEFORE UPDATE ON public.interests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_party" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.interests i WHERE i.id = interest_id AND (i.tenant_id = auth.uid() OR i.owner_id = auth.uid())));
CREATE POLICY "messages_insert_party_accepted" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.interests i WHERE i.id = interest_id AND i.status = 'accepted' AND (i.tenant_id = auth.uid() OR i.owner_id = auth.uid())));

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_owner ON public.listings(owner_id);
CREATE INDEX idx_interests_owner ON public.interests(owner_id);
CREATE INDEX idx_interests_tenant ON public.interests(tenant_id);
CREATE INDEX idx_messages_interest ON public.messages(interest_id, created_at);
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interests;
