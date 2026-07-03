CREATE TABLE public.wishlists (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wishlist" ON public.wishlists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add to own wishlist" ON public.wishlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove from own wishlist" ON public.wishlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);