DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);