-- No client table grants or client-authored broadcasts: every transition is a locked RPC.
CREATE SCHEMA IF NOT EXISTS campfire_private;
REVOKE ALL ON SCHEMA campfire_private FROM PUBLIC,anon,authenticated;
CREATE TABLE public.campfire_moderators(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE public.campfire_suspensions(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.campfire_rooms(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 invite text NOT NULL UNIQUE DEFAULT substr(encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex'),1,32),
 host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 create_request uuid NOT NULL, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 5 AND 180),
 mode text NOT NULL CHECK(mode IN('shared_destiny','gentle_circle')),
 status text NOT NULL DEFAULT 'lobby' CHECK(status IN('lobby','active','completed','severed')),
 revision integer NOT NULL DEFAULT 1, started_at timestamptz, severed_by text,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '6 hours',
 UNIQUE(host_id,create_request)
);
CREATE TABLE public.campfire_members(
 room_id uuid NOT NULL REFERENCES public.campfire_rooms(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 40),
 animal text NOT NULL CHECK(animal IN('fox','bunny','koala','bird','bee')),
 status text NOT NULL DEFAULT 'ready' CHECK(status IN('ready','focusing','completed','abandoned','left')),
 joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_id,user_id)
);
CREATE INDEX campfire_members_user ON public.campfire_members(user_id,room_id);
CREATE TABLE public.campfire_blocks(
 blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 PRIMARY KEY(blocker_id,target_id),CHECK(blocker_id<>target_id)
);
CREATE TABLE public.campfire_requests(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, request_id uuid NOT NULL,
 room_id uuid NOT NULL REFERENCES public.campfire_rooms(id) ON DELETE CASCADE,
 command text NOT NULL, mode text, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,request_id)
);
CREATE TABLE public.campfire_reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 target_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 room_id uuid REFERENCES public.campfire_rooms(id) ON DELETE SET NULL,
 reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 500), evidence jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE public.campfire_moderation_actions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_id uuid NOT NULL REFERENCES public.campfire_reports(id),
 moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 action text NOT NULL CHECK(action IN('dismiss','remove','suspend')), note text NOT NULL CHECK(length(note) BETWEEN 3 AND 500),
 created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['campfire_moderators','campfire_suspensions','campfire_rooms','campfire_members','campfire_blocks','campfire_requests','campfire_reports','campfire_moderation_actions'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;

CREATE FUNCTION campfire_private.actor() RETURNS uuid LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor) THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND is_anonymous IS TRUE) THEN RAISE EXCEPTION 'A permanent account is required'; END IF;
 IF EXISTS(SELECT 1 FROM public.campfire_suspensions WHERE user_id=actor) THEN RAISE EXCEPTION 'Account suspended'; END IF;
 RETURN actor;
END $$;
CREATE FUNCTION campfire_private.is_moderator() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.campfire_moderators WHERE user_id=auth.uid());
$$;
CREATE FUNCTION campfire_private.validate_content(p_text text,p_max integer) RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 IF p_text IS NULL OR length(btrim(p_text)) NOT BETWEEN 1 AND p_max OR p_text ~ '[[:cntrl:]]'
 OR regexp_replace(lower(normalize(p_text,NFKC)),'[^a-z]','','g') ~ '(fuck|shit|bitch|cunt|nigger|kontol|memek|ngentot|anjing|bangsat)' THEN
  RAISE EXCEPTION 'Invalid or abusive content';
 END IF;
END $$;
CREATE FUNCTION campfire_private.snapshot(p_room uuid,p_actor uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',r.id,'code',r.invite,'name',r.name,'durationMinutes',r.duration_minutes,'mode',r.mode,
 'status',r.status,'revision',r.revision,'startedAt',r.started_at,'severedBy',NULL,'myParticipantId',p_actor,
 'participants',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.display_name,'animal',m.animal,'species','oak',
 'isHost',m.user_id=r.host_id,'status',m.status,'joinedAt',m.joined_at) ORDER BY m.joined_at,m.user_id)
 FROM public.campfire_members m WHERE m.room_id=r.id AND m.status<>'left'
 AND NOT EXISTS(SELECT 1 FROM public.campfire_suspensions s WHERE s.user_id=m.user_id)
 AND NOT EXISTS(SELECT 1 FROM public.campfire_blocks b WHERE (b.blocker_id=p_actor AND b.target_id=m.user_id) OR (b.target_id=p_actor AND b.blocker_id=m.user_id))), '[]'::jsonb))
 FROM public.campfire_rooms r WHERE r.id=p_room;
$$;
CREATE FUNCTION campfire_private.require_member(p_room uuid,p_actor uuid) RETURNS void LANGUAGE plpgsql STABLE SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.campfire_members m JOIN public.campfire_rooms r ON r.id=m.room_id
 WHERE m.room_id=p_room AND m.user_id=p_actor AND m.status<>'left' AND r.expires_at>now()) THEN RAISE EXCEPTION 'Membership required'; END IF;
END $$;

CREATE FUNCTION public.campfire_create_v1(p_request_id uuid,p_name text,p_display_name text,p_duration_minutes integer,p_mode text,p_animal text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=campfire_private.actor(); room uuid; BEGIN
 -- Serialize all membership mutations per actor; all room mutations then lock the room.
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,0));
 PERFORM campfire_private.actor();
 IF p_request_id IS NULL THEN RAISE EXCEPTION 'Request ID required'; END IF;
 SELECT id INTO room FROM public.campfire_rooms WHERE host_id=actor AND create_request=p_request_id;
 IF room IS NOT NULL THEN PERFORM campfire_private.require_member(room,actor); RETURN campfire_private.snapshot(room,actor); END IF;
 PERFORM campfire_private.validate_content(p_name,80); PERFORM campfire_private.validate_content(p_display_name,40);
 IF (SELECT count(*) FROM public.campfire_rooms WHERE host_id=actor AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'Room creation rate limit'; END IF;
 IF EXISTS(SELECT 1 FROM public.campfire_members m JOIN public.campfire_rooms r ON r.id=m.room_id WHERE m.user_id=actor AND m.status NOT IN('left','abandoned','completed') AND r.status IN('lobby','active') AND r.expires_at>now()) THEN RAISE EXCEPTION 'Leave your current room first'; END IF;
 INSERT INTO public.campfire_rooms(host_id,create_request,name,duration_minutes,mode) VALUES(actor,p_request_id,btrim(p_name),p_duration_minutes,p_mode) RETURNING id INTO room;
 INSERT INTO public.campfire_members(room_id,user_id,display_name,animal) VALUES(room,actor,btrim(p_display_name),p_animal);
 RETURN campfire_private.snapshot(room,actor);
END $$;
CREATE FUNCTION public.campfire_join_v1(p_invite text,p_display_name text,p_animal text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=campfire_private.actor(); r public.campfire_rooms%ROWTYPE; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,0));
 PERFORM campfire_private.actor();
 PERFORM campfire_private.validate_content(p_display_name,40);
 IF p_invite IS NULL OR p_invite!~'^[a-fA-F0-9]{32}$' THEN RAISE EXCEPTION 'Invalid invite'; END IF;
 SELECT * INTO r FROM public.campfire_rooms WHERE invite=lower(p_invite) FOR UPDATE;
 IF NOT FOUND OR r.expires_at<=now() OR r.status<>'lobby' THEN RAISE EXCEPTION 'Room closed or unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.campfire_members m JOIN public.campfire_blocks b ON (b.blocker_id=actor AND b.target_id=m.user_id) OR (b.target_id=actor AND b.blocker_id=m.user_id) WHERE m.room_id=r.id) THEN RAISE EXCEPTION 'Room blocked'; END IF;
 IF EXISTS(SELECT 1 FROM public.campfire_suspensions WHERE user_id=r.host_id) THEN RAISE EXCEPTION 'Room closed or unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.campfire_members WHERE room_id=r.id AND user_id=actor AND status<>'left') THEN RETURN campfire_private.snapshot(r.id,actor); END IF;
 IF EXISTS(SELECT 1 FROM public.campfire_members m JOIN public.campfire_rooms x ON x.id=m.room_id WHERE m.user_id=actor AND m.status NOT IN('left','abandoned','completed') AND x.status IN('lobby','active') AND x.expires_at>now()) THEN RAISE EXCEPTION 'Leave your current room first'; END IF;
 IF (SELECT count(*) FROM public.campfire_members WHERE room_id=r.id AND status<>'left')>=8 THEN RAISE EXCEPTION 'Room full'; END IF;
 INSERT INTO public.campfire_members(room_id,user_id,display_name,animal) VALUES(r.id,actor,btrim(p_display_name),p_animal)
 ON CONFLICT(room_id,user_id) DO UPDATE SET status='ready',display_name=EXCLUDED.display_name,animal=EXCLUDED.animal,joined_at=now();
 UPDATE public.campfire_rooms SET revision=revision+1 WHERE id=r.id;
 RETURN campfire_private.snapshot(r.id,actor);
END $$;
CREATE FUNCTION public.campfire_read_v1(p_room_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=campfire_private.actor(); BEGIN
 PERFORM campfire_private.require_member(p_room_id,actor);
 RETURN campfire_private.snapshot(p_room_id,actor);
END $$;
CREATE FUNCTION public.campfire_command_v1(p_room_id uuid,p_request_id uuid,p_expected_revision integer,p_command text,p_mode text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=campfire_private.actor(); r public.campfire_rooms%ROWTYPE; previous public.campfire_requests%ROWTYPE; myname text; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,0));
 PERFORM campfire_private.actor();
 SELECT * INTO r FROM public.campfire_rooms WHERE id=p_room_id FOR UPDATE;
 SELECT * INTO previous FROM public.campfire_requests WHERE user_id=actor AND request_id=p_request_id;
 IF FOUND THEN
  IF previous.room_id IS DISTINCT FROM p_room_id OR previous.command IS DISTINCT FROM p_command OR previous.mode IS DISTINCT FROM p_mode THEN RAISE EXCEPTION 'Request ID reused'; END IF;
  IF p_command='leave' THEN RETURN jsonb_build_object('id',r.id,'revision',r.revision,'left',true); END IF;
  PERFORM campfire_private.require_member(p_room_id,actor);
  RETURN campfire_private.snapshot(p_room_id,actor);
 END IF;
 PERFORM campfire_private.require_member(p_room_id,actor);
 IF p_request_id IS NULL THEN RAISE EXCEPTION 'Request ID required'; END IF;
 IF (SELECT count(*) FROM public.campfire_requests WHERE user_id=actor AND created_at>now()-interval '1 minute')>=60 THEN RAISE EXCEPTION 'Command rate limit'; END IF;
 IF r.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
 SELECT display_name INTO myname FROM public.campfire_members WHERE room_id=r.id AND user_id=actor;
 IF p_command IN('start','mode') THEN
  IF r.host_id<>actor THEN RAISE EXCEPTION 'Host required'; END IF;
  IF r.status<>'lobby' THEN RAISE EXCEPTION 'Room is not in lobby'; END IF;
  IF p_command='mode' THEN
   IF p_mode IS NULL OR p_mode NOT IN('shared_destiny','gentle_circle') THEN RAISE EXCEPTION 'Invalid mode'; END IF;
   UPDATE public.campfire_rooms SET mode=p_mode WHERE id=r.id;
  ELSE
   UPDATE public.campfire_rooms SET status='active',started_at=now() WHERE id=r.id;
   UPDATE public.campfire_members SET status='focusing' WHERE room_id=r.id AND status='ready';
  END IF;
 ELSIF p_command IN('leave','abandon') THEN
  IF p_command='abandon' AND r.status<>'active' THEN RAISE EXCEPTION 'Room is not active'; END IF;
  IF r.status='active' AND r.mode='shared_destiny' OR r.host_id=actor AND r.status='lobby' THEN
   UPDATE public.campfire_rooms SET status='severed',severed_by=NULL WHERE id=r.id;
  END IF;
  UPDATE public.campfire_members SET status=CASE WHEN p_command='leave' THEN 'left' ELSE 'abandoned' END WHERE room_id=r.id AND user_id=actor;
 ELSIF p_command='complete' THEN
  IF r.status<>'active' THEN RAISE EXCEPTION 'Room is not active'; END IF;
  IF now()<r.started_at+make_interval(mins=>r.duration_minutes) THEN RAISE EXCEPTION 'Focus duration not elapsed'; END IF;
  UPDATE public.campfire_members SET status='completed' WHERE room_id=r.id AND user_id=actor AND status='focusing';
  IF NOT EXISTS(SELECT 1 FROM public.campfire_members WHERE room_id=r.id AND status='focusing') THEN UPDATE public.campfire_rooms SET status='completed' WHERE id=r.id; END IF;
 ELSE RAISE EXCEPTION 'Invalid command'; END IF;
 UPDATE public.campfire_rooms SET revision=revision+1 WHERE id=r.id;
 INSERT INTO public.campfire_requests(user_id,request_id,room_id,command,mode) VALUES(actor,p_request_id,r.id,p_command,p_mode);
 IF p_command='leave' THEN RETURN jsonb_build_object('id',r.id,'revision',r.revision+1,'left',true); END IF;
 RETURN campfire_private.snapshot(r.id,actor);
END $$;

CREATE FUNCTION public.campfire_report_v1(p_room_id uuid,p_target_user uuid,p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=campfire_private.actor(); report uuid; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,0));
 PERFORM campfire_private.actor();
 PERFORM campfire_private.require_member(p_room_id,actor);
 IF p_target_user IS NULL OR p_target_user=actor OR NOT EXISTS(SELECT 1 FROM public.campfire_members WHERE room_id=p_room_id AND user_id=p_target_user) THEN RAISE EXCEPTION 'Invalid report target'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Invalid report reason'; END IF;
 IF (SELECT count(*) FROM public.campfire_reports WHERE reporter_id=actor AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'Report rate limit'; END IF;
 INSERT INTO public.campfire_reports(reporter_id,target_id,room_id,reason,evidence) VALUES(actor,p_target_user,p_room_id,btrim(p_reason),
  (campfire_private.snapshot(p_room_id,actor)-'code')||jsonb_build_object('hostId',(SELECT host_id FROM public.campfire_rooms WHERE id=p_room_id))) RETURNING id INTO report;
 RETURN jsonb_build_object('id',report);
END $$;
CREATE FUNCTION public.campfire_block_v1(p_target_user uuid,p_blocked boolean DEFAULT true) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=campfire_private.actor(); r public.campfire_rooms%ROWTYPE; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,0));
 PERFORM campfire_private.actor();
 IF p_target_user IS NULL OR p_target_user=actor OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_target_user) OR p_blocked IS NULL THEN RAISE EXCEPTION 'Invalid block target'; END IF;
 IF NOT p_blocked THEN DELETE FROM public.campfire_blocks WHERE blocker_id=actor AND target_id=p_target_user; RETURN jsonb_build_object('blocked',false); END IF;
 INSERT INTO public.campfire_blocks VALUES(actor,p_target_user) ON CONFLICT DO NOTHING;
 FOR r IN SELECT x.* FROM public.campfire_rooms x JOIN public.campfire_members me ON me.room_id=x.id AND me.user_id=actor AND me.status<>'left'
 JOIN public.campfire_members target ON target.room_id=x.id AND target.user_id=p_target_user AND target.status<>'left' ORDER BY x.id FOR UPDATE OF x LOOP
  UPDATE public.campfire_members SET status='left' WHERE room_id=r.id AND user_id=actor;
  UPDATE public.campfire_rooms SET status=CASE WHEN status='active' AND mode='shared_destiny' OR host_id=actor THEN 'severed' ELSE status END,
   name=CASE WHEN host_id=actor THEN 'Campfire' ELSE name END,severed_by=NULL,revision=revision+1 WHERE id=r.id;
 END LOOP;
 RETURN jsonb_build_object('blocked',true);
END $$;
CREATE FUNCTION public.campfire_moderator_status_v1() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM campfire_private.actor(); RETURN campfire_private.is_moderator(); END $$;
CREATE FUNCTION public.campfire_moderator_queue_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM campfire_private.actor(); IF NOT campfire_private.is_moderator() THEN RAISE EXCEPTION 'Moderator required'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at) FROM (SELECT * FROM public.campfire_reports WHERE resolved_at IS NULL ORDER BY created_at LIMIT 100) q),'[]'::jsonb);
END $$;
CREATE FUNCTION public.campfire_moderate_v1(p_report_id uuid,p_action text,p_note text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=campfire_private.actor(); report public.campfire_reports%ROWTYPE; r public.campfire_rooms%ROWTYPE; BEGIN
 IF NOT campfire_private.is_moderator() THEN RAISE EXCEPTION 'Moderator required'; END IF;
 IF p_action IS NULL OR p_action NOT IN('dismiss','remove','suspend') OR p_note IS NULL OR length(btrim(p_note)) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Invalid moderation decision'; END IF;
 SELECT * INTO report FROM public.campfire_reports WHERE id=p_report_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
 IF report.resolved_at IS NOT NULL THEN RETURN jsonb_build_object('resolved',true); END IF;
 IF report.target_id IS NOT NULL AND p_action IN('remove','suspend') THEN PERFORM pg_advisory_xact_lock(hashtextextended(report.target_id::text,0)); END IF;
 IF p_action='suspend' AND report.target_id IS NOT NULL THEN INSERT INTO public.campfire_suspensions(user_id) VALUES(report.target_id) ON CONFLICT DO NOTHING; END IF;
 IF p_action IN('remove','suspend') THEN
  FOR r IN SELECT x.* FROM public.campfire_rooms x JOIN public.campfire_members m ON m.room_id=x.id WHERE m.user_id=report.target_id AND (p_action='suspend' OR x.id=report.room_id) ORDER BY x.id FOR UPDATE OF x LOOP
   UPDATE public.campfire_members SET status='left' WHERE room_id=r.id AND user_id=report.target_id;
   UPDATE public.campfire_rooms SET status=CASE WHEN status IN('lobby','active') THEN 'severed' ELSE status END,
    name=CASE WHEN host_id=report.target_id THEN 'Campfire' ELSE name END,severed_by=NULL,revision=revision+1 WHERE id=r.id;
  END LOOP;
 END IF;
 INSERT INTO public.campfire_moderation_actions(report_id,moderator_id,action,note) VALUES(report.id,actor,p_action,btrim(p_note));
 UPDATE public.campfire_reports SET resolved_at=now() WHERE id=report.id;
 RETURN jsonb_build_object('resolved',true);
END $$;

-- Evidence is immutable to clients; trusted deletion is a deliberate privacy exception.
-- Before FK cascades/set-null remove the references, redact any snapshot containing the subject.
CREATE FUNCTION campfire_private.redact_deleted_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE report uuid; BEGIN
 FOR report IN SELECT r.id FROM public.campfire_reports r WHERE r.reporter_id=OLD.id OR r.target_id=OLD.id
 OR EXISTS(SELECT 1 FROM public.campfire_rooms room WHERE room.id=r.room_id AND room.host_id=OLD.id)
 OR r.evidence->>'hostId'=OLD.id::text
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(r.evidence->'participants','[]'::jsonb)) p WHERE p->>'id'=OLD.id::text) LOOP
  UPDATE public.campfire_reports SET evidence='{}'::jsonb,reason='Content removed following account deletion' WHERE id=report;
  UPDATE public.campfire_moderation_actions SET note='Content removed following account deletion' WHERE report_id=report;
 END LOOP;
 UPDATE public.campfire_moderation_actions SET note='Content removed following account deletion' WHERE moderator_id=OLD.id;
 RETURN OLD;
END $$;
CREATE TRIGGER campfire_redact_deleted_user BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION campfire_private.redact_deleted_user();

CREATE FUNCTION public.campfire_maintenance_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE removed_reports integer; removed_rooms integer; BEGIN
 DELETE FROM public.campfire_moderation_actions WHERE report_id IN(SELECT id FROM public.campfire_reports WHERE created_at<now()-interval '90 days');
 DELETE FROM public.campfire_reports WHERE created_at<now()-interval '90 days';
 GET DIAGNOSTICS removed_reports=ROW_COUNT;
 DELETE FROM public.campfire_rooms WHERE expires_at<now()-interval '1 day';
 GET DIAGNOSTICS removed_rooms=ROW_COUNT;
 RETURN jsonb_build_object('reportsRemoved',removed_reports,'roomsRemoved',removed_rooms);
END $$;
REVOKE ALL ON FUNCTION public.campfire_maintenance_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.campfire_maintenance_v1() TO service_role;

-- Explicit function allowlist: internal helpers never become a callable Data API.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA campfire_private FROM PUBLIC,anon,authenticated;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN(
 'campfire_create_v1','campfire_join_v1','campfire_read_v1','campfire_command_v1','campfire_report_v1','campfire_block_v1','campfire_moderator_status_v1','campfire_moderator_queue_v1','campfire_moderate_v1') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
 END LOOP;
END $$;
