-- New clients must commit through the revision-aware RPC. Existing save rows remain.
ALTER TABLE public.game_saves ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.game_saves ADD COLUMN IF NOT EXISTS last_mutation_id uuid;

CREATE OR REPLACE FUNCTION public.commit_game_save_v2(
  p_expected_owner uuid,
  p_expected_revision bigint,
  p_mutation_id uuid,
  p_save_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller uuid := auth.uid();
  current_save public.game_saves%ROWTYPE;
  clean_data jsonb;
  next_revision bigint;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;
  IF p_expected_owner IS DISTINCT FROM caller THEN RAISE EXCEPTION 'Account identity changed' USING ERRCODE='28000'; END IF;
  IF p_mutation_id IS NULL OR p_expected_revision < 0 OR
     jsonb_typeof(p_save_data) IS DISTINCT FROM 'object' OR
     p_save_data->'version' IS DISTINCT FROM '1'::jsonb OR
     octet_length(p_save_data::text) > 20971520 THEN
    RAISE EXCEPTION 'Invalid game save request' USING ERRCODE='22023';
  END IF;
  -- Game progress can never establish store entitlement or a target owner.
  clean_data := p_save_data - 'subscription' - 'storage_owner';
  SELECT * INTO current_save FROM public.game_saves s WHERE s.user_id=caller FOR UPDATE;
  IF FOUND THEN
    IF current_save.last_mutation_id=p_mutation_id THEN
      IF current_save.save_data IS DISTINCT FROM clean_data THEN
        RAISE EXCEPTION 'Mutation content changed' USING ERRCODE='22023';
      END IF;
      RETURN jsonb_build_object('committed',true,'revision',current_save.revision);
    END IF;
    IF p_expected_revision IS DISTINCT FROM current_save.revision THEN
      RETURN jsonb_build_object('committed',false,'revision',current_save.revision);
    END IF;
  ELSIF p_expected_revision IS NOT NULL THEN
    RETURN jsonb_build_object('committed',false,'revision',NULL);
  END IF;

  INSERT INTO public.game_saves AS s(user_id,save_version,save_data,revision,last_mutation_id,updated_at)
    VALUES(caller,1,clean_data,1,p_mutation_id,now())
  ON CONFLICT(user_id) DO UPDATE
    SET save_version=1,save_data=EXCLUDED.save_data,revision=s.revision+1,
        last_mutation_id=EXCLUDED.last_mutation_id,updated_at=now()
    WHERE s.revision=p_expected_revision
  RETURNING s.revision INTO next_revision;
  IF next_revision IS NOT NULL THEN
    RETURN jsonb_build_object('committed',true,'revision',next_revision);
  END IF;
  -- Another device may have created the row after our initial absent-row check.
  SELECT s.revision INTO next_revision FROM public.game_saves s WHERE s.user_id=caller;
  RETURN jsonb_build_object('committed',false,'revision',next_revision);
END;
$$;
REVOKE ALL ON FUNCTION public.commit_game_save_v2(uuid,bigint,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.commit_game_save_v2(uuid,bigint,uuid,jsonb) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.game_saves FROM authenticated;
-- SELECT and existing owner RLS stay in force. service_role privileges are unchanged.
