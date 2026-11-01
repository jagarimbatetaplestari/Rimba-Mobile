-- Close the legacy bucket-wide INSERT policy; permissive policies combine with OR.
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "Rimba avatar uploads stay in the owner folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Rimba avatar updates stay in the owner folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (SELECT auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'], file_size_limit = 5242880
  WHERE id = 'avatars';

-- Read-only inventory for authenticated deletion. Physical removal must use
-- Storage API; never DELETE storage.objects metadata directly.
-- Legacy owner metadata is included even if an older client used another path.
CREATE OR REPLACE FUNCTION public.list_account_media()
RETURNS TABLE(name text, owner_id text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT object.name, COALESCE(object.owner_id, object.owner::text)
  FROM storage.objects AS object
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND object.bucket_id = 'avatars'
    AND ((storage.foldername(object.name))[1] = (SELECT auth.uid())::text
      OR COALESCE(object.owner_id, object.owner::text) = (SELECT auth.uid())::text)
  ORDER BY object.name
  LIMIT 1000;
$$;
REVOKE ALL ON FUNCTION public.list_account_media() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_account_media() TO authenticated;
