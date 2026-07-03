
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate every policy that referenced public.has_role
DROP POLICY IF EXISTS scores_select_related ON public.compatibility_scores;
CREATE POLICY scores_select_related ON public.compatibility_scores
  FOR SELECT TO authenticated USING (
    tenant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = compatibility_scores.listing_id AND l.owner_id = auth.uid())
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS interests_select_party ON public.interests;
CREATE POLICY interests_select_party ON public.interests
  FOR SELECT TO authenticated USING (
    tenant_id = auth.uid() OR owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS listings_insert_owner ON public.listings;
CREATE POLICY listings_insert_owner ON public.listings
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid() AND private.has_role(auth.uid(), 'owner'::public.app_role)
  );

DROP POLICY IF EXISTS listings_delete_own_or_admin ON public.listings;
CREATE POLICY listings_delete_own_or_admin ON public.listings
  FOR DELETE TO authenticated USING (
    owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS listings_select_active_or_own_or_admin ON public.listings;
CREATE POLICY listings_select_active_or_own_or_admin ON public.listings
  FOR SELECT TO authenticated USING (
    status = 'active'::public.listing_status OR owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS listings_update_own_or_admin ON public.listings;
CREATE POLICY listings_update_own_or_admin ON public.listings
  FOR UPDATE TO authenticated USING (
    owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)
  ) WITH CHECK (
    owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Notifications: only allow inserting your own notifications
DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_own ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Profiles: hide email column from regular authenticated reads
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, created_at, updated_at) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Tenant profiles: restrict reads to self, interested listing owners, and admins
DROP POLICY IF EXISTS tenant_profiles_select_auth ON public.tenant_profiles;
CREATE POLICY tenant_profiles_select_own_or_interested_owner ON public.tenant_profiles
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.interests i
      WHERE i.tenant_id = tenant_profiles.user_id AND i.owner_id = auth.uid()
    )
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );
