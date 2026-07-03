DROP POLICY IF EXISTS interests_insert_tenant ON public.interests;

CREATE POLICY interests_insert_tenant ON public.interests
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = interests.listing_id
      AND l.owner_id = interests.owner_id
  )
);