-- Server-owned verification cache. Sandbox never updates production subscription rights.
CREATE TABLE public.billing_sync_state (
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 environment text NOT NULL CHECK(environment IN ('production','sandbox')),
 state jsonb,
 checked_at timestamptz,
 lease uuid,
 lease_event_id text,
 lease_expires_at timestamptz,
 PRIMARY KEY(owner_id,environment)
);
ALTER TABLE public.billing_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_owner_read ON public.billing_sync_state FOR SELECT TO authenticated USING ((select auth.uid())=owner_id);
REVOKE ALL ON public.billing_sync_state FROM PUBLIC,anon,authenticated;
GRANT SELECT(owner_id,environment,state,checked_at) ON public.billing_sync_state TO authenticated;
GRANT ALL ON public.billing_sync_state TO service_role;
CREATE TABLE public.billing_webhook_receipts (
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 environment text NOT NULL CHECK(environment IN ('production','sandbox')),
 event_id text NOT NULL CHECK(length(event_id) BETWEEN 1 AND 256),
 processed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,environment,event_id)
);
ALTER TABLE public.billing_webhook_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_webhook_receipts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.billing_webhook_receipts TO service_role;

CREATE FUNCTION public.begin_billing_sync_v1(p_owner uuid,p_environment text,p_event_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_row public.billing_sync_state%ROWTYPE; token uuid;
BEGIN
 IF p_owner IS NULL OR p_environment NOT IN ('production','sandbox') OR p_environment IS NULL OR (p_event_id IS NOT NULL AND length(p_event_id) NOT BETWEEN 1 AND 256) THEN RAISE EXCEPTION 'Invalid billing request'; END IF;
 BEGIN
  INSERT INTO public.billing_sync_state(owner_id,environment) VALUES(p_owner,p_environment) ON CONFLICT DO NOTHING;
 EXCEPTION WHEN foreign_key_violation THEN RETURN jsonb_build_object('missing',true); END;
 SELECT * INTO current_row FROM public.billing_sync_state WHERE owner_id=p_owner AND environment=p_environment FOR UPDATE;
 IF p_event_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.billing_webhook_receipts WHERE owner_id=p_owner AND environment=p_environment AND event_id=p_event_id) THEN RETURN jsonb_build_object('duplicate',true); END IF;
 IF current_row.lease IS NOT NULL AND current_row.lease_expires_at>clock_timestamp() THEN RETURN jsonb_build_object('busy',true); END IF;
 token:=gen_random_uuid();
 UPDATE public.billing_sync_state SET lease=token,lease_event_id=p_event_id,lease_expires_at=clock_timestamp()+interval '30 seconds' WHERE owner_id=p_owner AND environment=p_environment;
 RETURN jsonb_build_object('lease',token);
END;
$$;
CREATE FUNCTION public.finish_billing_sync_v1(p_owner uuid,p_environment text,p_event_id text,p_lease uuid,p_state jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_row public.billing_sync_state%ROWTYPE; paid boolean; expiration timestamptz;
BEGIN
 SELECT * INTO current_row FROM public.billing_sync_state WHERE owner_id=p_owner AND environment=p_environment FOR UPDATE;
 IF NOT FOUND OR p_lease IS NULL OR current_row.lease IS DISTINCT FROM p_lease OR current_row.lease_event_id IS DISTINCT FROM p_event_id OR current_row.lease_expires_at<=clock_timestamp() THEN RETURN jsonb_build_object('applied',false); END IF;
 IF jsonb_typeof(p_state) IS DISTINCT FROM 'object' OR octet_length(p_state::text)>4096 OR p_state->>'environment' IS DISTINCT FROM p_environment OR jsonb_typeof(p_state->'isPro') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid verified entitlement'; END IF;
 paid:=(p_state->>'isPro')::boolean;
 expiration:=(p_state->>'expiresAt')::timestamptz;
 IF paid THEN
  IF p_state->>'store' IS NULL OR p_state->>'store' NOT IN ('app_store','play_store') THEN RAISE EXCEPTION 'Invalid verified store'; END IF;
  IF p_state->>'tier' IS NULL OR p_state->>'productId' IS NULL OR NOT ((p_state->>'tier'='pro_monthly' AND p_state->>'productId'='rimba_pro_monthly') OR (p_state->>'tier'='pro_annual' AND p_state->>'productId'='rimba_pro_annual') OR (p_state->>'tier'='pioneer_lifetime' AND p_state->>'productId'='rimba_pioneer_lifetime')) THEN RAISE EXCEPTION 'Invalid verified product'; END IF;
  IF p_state->>'tier'='pioneer_lifetime' THEN
   IF expiration IS NOT NULL OR p_state->>'status' IS DISTINCT FROM 'lifetime' THEN RAISE EXCEPTION 'Invalid lifetime state'; END IF;
  ELSE
   IF expiration IS NULL OR expiration<=clock_timestamp() OR p_state->>'status' IS NULL OR p_state->>'status' NOT IN ('active','trialing','canceled','grace_period') THEN RAISE EXCEPTION 'Invalid active state'; END IF;
  END IF;
 ELSE
  IF p_state->>'tier' IS DISTINCT FROM 'free' OR expiration IS NOT NULL OR p_state->>'status' IS NULL OR p_state->>'status' NOT IN ('none','expired') THEN RAISE EXCEPTION 'Invalid free state'; END IF;
 END IF;
 UPDATE public.billing_sync_state SET state=p_state,checked_at=clock_timestamp(),lease=NULL,lease_event_id=NULL,lease_expires_at=NULL WHERE owner_id=p_owner AND environment=p_environment;
 IF p_environment='production' THEN
  INSERT INTO public.user_subscriptions(user_id,tier,status,is_pro,expires_at,store,real_trees_pledged,pioneer_badge,tree_certificate_id,updated_at)
   VALUES(p_owner,p_state->>'tier',p_state->>'status',paid,expiration,coalesce(p_state->>'store','app_store'),0,paid AND p_state->>'tier'='pioneer_lifetime',NULL,clock_timestamp())
  ON CONFLICT(user_id) DO UPDATE SET tier=EXCLUDED.tier,status=EXCLUDED.status,is_pro=EXCLUDED.is_pro,expires_at=EXCLUDED.expires_at,store=EXCLUDED.store,real_trees_pledged=0,pioneer_badge=EXCLUDED.pioneer_badge,tree_certificate_id=NULL,updated_at=EXCLUDED.updated_at;
 END IF;
 IF p_event_id IS NOT NULL THEN INSERT INTO public.billing_webhook_receipts(owner_id,environment,event_id) VALUES(p_owner,p_environment,p_event_id) ON CONFLICT DO NOTHING; END IF;
 RETURN jsonb_build_object('applied',true);
END;
$$;
CREATE FUNCTION public.cancel_billing_sync_v1(p_owner uuid,p_environment text,p_event_id text,p_lease uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 UPDATE public.billing_sync_state SET lease=NULL,lease_event_id=NULL,lease_expires_at=NULL WHERE owner_id=p_owner AND environment=p_environment AND lease=p_lease AND lease_event_id IS NOT DISTINCT FROM p_event_id;
$$;
REVOKE ALL ON FUNCTION public.begin_billing_sync_v1(uuid,text,text),public.finish_billing_sync_v1(uuid,text,text,uuid,jsonb),public.cancel_billing_sync_v1(uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_billing_sync_v1(uuid,text,text),public.finish_billing_sync_v1(uuid,text,text,uuid,jsonb),public.cancel_billing_sync_v1(uuid,text,text,uuid) TO service_role;
