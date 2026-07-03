
CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);
