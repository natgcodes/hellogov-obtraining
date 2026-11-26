-- Query 644 — HelloGov Lesson Content & Full Day Editor
-- Additive migration. Existing materials and progress remain untouched.
-- Run once in the HelloGov database (not iVisa), before installing the frontend.
BEGIN;

-- Fail fast if the currently installed progress and content RPCs are missing.
DO $preflight$
BEGIN
  IF to_regprocedure('public.is_trainer()') IS NULL OR
     to_regprocedure('public.set_material_complete(uuid,boolean)') IS NULL OR
     to_regprocedure('public.recalculate_module_progress(uuid)') IS NULL OR
     to_regprocedure('public.hg_calculate_module_status(uuid,uuid)') IS NULL OR
     to_regprocedure('public.create_day_module(uuid,text,text,text,integer,boolean)') IS NULL OR
     to_regprocedure('public.duplicate_training_wave(uuid,uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'Install the current HelloGov progress and Program Builder migrations first';
  END IF;
  -- The audited duplication function copies the complete row dynamically. Check that
  -- implementation is still present rather than overwriting the function.
  IF position('to_jsonb(t)' in pg_get_functiondef('public.duplicate_training_wave(uuid,uuid,text)'::regprocedure)) = 0
     OR position('jsonb_populate_record' in pg_get_functiondef('public.duplicate_training_wave(uuid,uuid,text)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'Wave duplication implementation changed; review before installing lesson content';
  END IF;
END;
$preflight$;

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS lesson_kind text,
  ADD COLUMN IF NOT EXISTS lesson_order integer,
  ADD COLUMN IF NOT EXISTS lesson_tracking boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lesson_reference boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lesson_asset_path text,
  ADD COLUMN IF NOT EXISTS lesson_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS lesson_alt text,
  ADD COLUMN IF NOT EXISTS lesson_callout_style text;

-- Legacy rows (lesson_kind IS NULL) are unchanged and keep existing behavior.
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS hg_lesson_metadata_check;
ALTER TABLE public.materials ADD CONSTRAINT hg_lesson_metadata_check CHECK (
  lesson_kind IS NULL OR (
    lesson_kind IN ('reading','presentation','video','image','pdf','interactive','callout','divider','reference','bookmarks')
    AND lesson_order IS NOT NULL AND lesson_order > 0
    AND (NOT is_required OR lesson_tracking)
    AND (lesson_kind NOT IN ('callout','divider','reference') OR (NOT lesson_tracking AND NOT is_required))
    AND (lesson_kind <> 'bookmarks' OR lesson_tracking)
    AND (lesson_duration_minutes IS NULL OR lesson_duration_minutes BETWEEN 0 AND 1440)
    AND (lesson_callout_style IS NULL OR lesson_callout_style IN ('information','tip','warning'))
    AND (lesson_asset_path IS NULL OR (lesson_kind IN ('image','pdf') AND url IS NULL))
    AND (url IS NULL OR (length(url) <= 4000 AND url ~ '^https://[^[:space:]]+$'))
    AND (NOT lesson_reference OR lesson_kind IN ('presentation','video','image','pdf','interactive','reference'))
    AND (lesson_kind NOT IN ('presentation','video','image','pdf','interactive','reference') OR url IS NOT NULL OR lesson_asset_path IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS hg_lesson_material_order_idx ON public.materials(module_id,lesson_order,id) WHERE lesson_kind IS NOT NULL;
CREATE INDEX IF NOT EXISTS hg_lesson_asset_idx ON public.materials(lesson_asset_path) WHERE lesson_asset_path IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS hg_one_bookmark_task_per_module ON public.materials(module_id) WHERE lesson_kind='bookmarks';

-- Protect already-earned completion. New required lesson items may only be
-- added to unpublished days (or draft programs) with no completed module.
-- This applies to direct trainer table writes as well as our editor RPC.
CREATE OR REPLACE FUNCTION public.hg_guard_lesson_requirement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_new_requirement boolean := false;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF OLD.lesson_kind IS NOT NULL AND NEW.lesson_kind IS DISTINCT FROM OLD.lesson_kind THEN
      RAISE EXCEPTION 'Lesson content type cannot be changed; create a new block instead';
    END IF;
    IF OLD.lesson_kind IS NOT NULL AND NEW.module_id IS DISTINCT FROM OLD.module_id THEN
      RAISE EXCEPTION 'A lesson block cannot be moved to another module';
    END IF;
    IF OLD.lesson_kind IS NULL AND NEW.lesson_kind IS NOT NULL THEN
      RAISE EXCEPTION 'Existing material cannot be converted automatically; create a new block';
    END IF;
    IF NEW.lesson_kind IS NOT NULL AND (OLD.lesson_tracking IS DISTINCT FROM NEW.lesson_tracking OR OLD.is_required IS DISTINCT FROM NEW.is_required)
       AND EXISTS(SELECT 1 FROM public.learner_material_progress l WHERE l.material_id=OLD.id) THEN
      RAISE EXCEPTION 'Completion settings cannot change after a learner has recorded progress';
    END IF;
    v_new_requirement := NEW.lesson_kind IS NOT NULL AND NEW.is_required AND NOT OLD.is_required;
  ELSE
    v_new_requirement := NEW.lesson_kind IS NOT NULL AND NEW.is_required;
  END IF;
  IF v_new_requirement THEN
    IF EXISTS(SELECT 1 FROM public.modules m JOIN public.days d ON d.id=m.day_id JOIN public.programs p ON p.id=d.program_id
        WHERE m.id=NEW.module_id AND d.is_published AND p.status='published')
       OR EXISTS(SELECT 1 FROM public.learner_module_progress l WHERE l.module_id=NEW.module_id AND l.status='completed') THEN
      RAISE EXCEPTION 'New required content is not allowed on a published day or a previously completed module. Make the new block optional.';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.hg_guard_lesson_requirement() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS hg_guard_lesson_requirement ON public.materials;
CREATE TRIGGER hg_guard_lesson_requirement BEFORE INSERT OR UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.hg_guard_lesson_requirement();
-- Deletion protection is enforced by the editor RPC only, so existing explicit
-- module deletion/reset/wave deletion workflows are not changed by this migration.

-- Informational content has no completion state, even if an older client calls
-- the existing set_material_complete RPC directly. Legacy rows are unaffected.
CREATE OR REPLACE FUNCTION public.hg_guard_informational_lesson_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
  IF EXISTS(SELECT 1 FROM public.materials ma WHERE ma.id=NEW.material_id AND ma.lesson_kind IS NOT NULL AND NOT ma.lesson_tracking) THEN
    RAISE EXCEPTION 'This content does not require completion';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.hg_guard_informational_lesson_progress() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS hg_guard_informational_lesson_progress ON public.learner_material_progress;
CREATE TRIGGER hg_guard_informational_lesson_progress BEFORE INSERT OR UPDATE ON public.learner_material_progress FOR EACH ROW EXECUTE FUNCTION public.hg_guard_informational_lesson_progress();

-- Private asset storage. No public buckets, no service-role key in the frontend.
-- Limit to common raster images and PDF; do not accept SVG, HTML, video or scripts.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('lesson-content','lesson-content',false,15728640,ARRAY['image/png','image/jpeg','image/webp','image/gif','application/pdf'])
ON CONFLICT(id) DO NOTHING;
DO $bucket$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='lesson-content' AND public=false AND file_size_limit=15728640 AND allowed_mime_types @> ARRAY['application/pdf','image/png','image/jpeg','image/webp','image/gif']::text[] AND allowed_mime_types <@ ARRAY['application/pdf','image/png','image/jpeg','image/webp','image/gif']::text[]) THEN
  RAISE EXCEPTION 'Existing lesson-content bucket has incompatible security settings';
 END IF;
END;
$bucket$;

-- Explicit active-wave check also protects Storage from trainer- or learner-side URL tampering.
-- Duplicated waves may reference the same immutable asset. Learners can read a file only
-- when a material referencing it is visible in their own active wave.
CREATE OR REPLACE FUNCTION public.hg_can_read_lesson_asset(asset_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_trainer() OR EXISTS (
      SELECT 1 FROM public.materials ma
      JOIN public.modules m ON m.id=ma.module_id
      JOIN public.days d ON d.id=m.day_id
      JOIN public.programs p ON p.id=d.program_id
      JOIN public.profiles pr ON pr.id=auth.uid() AND pr.active_program_id=p.id AND pr.account_status='active'
      JOIN public.program_enrollments pe ON pe.program_id=p.id AND pe.learner_id=pr.id
      WHERE ma.lesson_asset_path=asset_path AND ma.lesson_kind IN ('image','pdf')
        AND m.publication_status='published' AND d.is_published AND p.status='published'
    )
  );
$fn$;
REVOKE ALL ON FUNCTION public.hg_can_read_lesson_asset(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hg_can_read_lesson_asset(text) TO authenticated;
DROP POLICY IF EXISTS "HG lesson assets read" ON storage.objects;
CREATE POLICY "HG lesson assets read" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='lesson-content' AND public.hg_can_read_lesson_asset(name));
-- Restrictive guard prevents other broad existing policies from granting access to this bucket.
DROP POLICY IF EXISTS "HG lesson assets read isolation" ON storage.objects;
CREATE POLICY "HG lesson assets read isolation" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING(bucket_id<>'lesson-content' OR public.hg_can_read_lesson_asset(name));
DROP POLICY IF EXISTS "HG lesson assets upload" ON storage.objects;
CREATE POLICY "HG lesson assets upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='lesson-content' AND public.is_trainer() AND split_part(name,'/',1)=auth.uid()::text AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg|webp|gif)$');
DROP POLICY IF EXISTS "HG lesson assets upload isolation" ON storage.objects;
CREATE POLICY "HG lesson assets upload isolation" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK(bucket_id<>'lesson-content' OR (public.is_trainer() AND split_part(name,'/',1)=auth.uid()::text AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg|webp|gif)$'));
-- Assets are immutable because another wave may reference the same path.
DROP POLICY IF EXISTS "HG lesson assets immutable update" ON storage.objects;
CREATE POLICY "HG lesson assets immutable update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING(bucket_id<>'lesson-content') WITH CHECK(bucket_id<>'lesson-content');
DROP POLICY IF EXISTS "HG lesson assets immutable delete" ON storage.objects;
CREATE POLICY "HG lesson assets immutable delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING(bucket_id<>'lesson-content');
DROP POLICY IF EXISTS "HG lesson assets no anonymous access" ON storage.objects;
CREATE POLICY "HG lesson assets no anonymous access" ON storage.objects AS RESTRICTIVE FOR ALL TO anon
USING(bucket_id<>'lesson-content') WITH CHECK(bucket_id<>'lesson-content');

-- Create/update a block within one module. No existing material row is converted.
-- Lesson order is independent from the legacy material order.
CREATE OR REPLACE FUNCTION public.hg_save_lesson_block(
  target_module_id uuid, target_material_id uuid, after_material_id uuid, block jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_kind text:=block->>'lesson_kind';
  v_title text:=trim(coalesce(block->>'title',''));
  v_description text:=nullif(block->>'description','');
  v_url text:=nullif(trim(block->>'url'),'');
  v_path text:=nullif(block->>'lesson_asset_path','');
  v_tracking boolean:=coalesce((block->>'lesson_tracking')::boolean,true);
  v_required boolean:=coalesce((block->>'is_required')::boolean,false);
  v_reference boolean:=coalesce((block->>'lesson_reference')::boolean,false);
  v_duration integer:=(block->>'lesson_duration_minutes')::integer;
  v_alt text:=nullif(block->>'lesson_alt','');
  v_style text:=coalesce(nullif(block->>'lesson_callout_style',''),'information');
  v_old public.materials%ROWTYPE;
  v_id uuid; v_order integer; v_position integer; v_material_type text;
BEGIN
  IF NOT public.is_trainer() THEN RAISE EXCEPTION 'Trainer access required'; END IF;
  IF block IS NULL OR jsonb_typeof(block)<>'object' OR v_kind IS NULL OR v_kind NOT IN ('reading','presentation','video','image','pdf','interactive','callout','divider','reference','bookmarks') THEN RAISE EXCEPTION 'Invalid lesson content type'; END IF;
  PERFORM 1 FROM public.modules m WHERE m.id=target_module_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Module not found'; END IF;
  IF v_title='' OR length(v_title)>240 OR length(coalesce(v_description,''))>50000 OR length(coalesce(v_alt,''))>500 THEN RAISE EXCEPTION 'Invalid content title, description or alt text'; END IF;
  IF v_kind IN ('reading','callout') AND nullif(trim(v_description),'') IS NULL THEN RAISE EXCEPTION 'Learning content is required'; END IF;
  IF v_kind IN ('callout','divider','reference') THEN v_tracking:=false; v_required:=false; END IF;
  IF v_kind='bookmarks' THEN v_tracking:=true; END IF;
  IF NOT v_tracking THEN v_required:=false; END IF;
  IF v_kind='reference' THEN v_reference:=true;
  ELSIF v_kind NOT IN ('presentation','video','image','pdf','interactive') THEN v_reference:=false; END IF;
  IF v_kind NOT IN ('presentation','video','image','pdf','interactive','reference') THEN v_url:=NULL;v_path:=NULL; END IF;
  IF v_kind NOT IN ('image','pdf') THEN v_path:=NULL; END IF;
  IF v_duration IS NOT NULL AND v_duration NOT BETWEEN 0 AND 1440 THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  IF v_style NOT IN ('information','tip','warning') THEN RAISE EXCEPTION 'Invalid callout style'; END IF;
  IF target_material_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.materials WHERE id=target_material_id AND module_id=target_module_id AND lesson_kind IS NOT NULL FOR UPDATE;
    IF NOT FOUND OR v_old.lesson_kind<>v_kind THEN RAISE EXCEPTION 'Lesson block not found or content type changed'; END IF;
  END IF;
  IF v_path IS NOT NULL THEN
    IF v_path IS DISTINCT FROM v_old.lesson_asset_path AND split_part(v_path,'/',1)<>auth.uid()::text THEN RAISE EXCEPTION 'Upload ownership mismatch'; END IF;
    IF NOT EXISTS(SELECT 1 FROM storage.objects so WHERE so.bucket_id='lesson-content' AND so.name=v_path
      AND (CASE WHEN v_kind='pdf' THEN so.metadata->>'mimetype'='application/pdf' ELSE so.metadata->>'mimetype' IN ('image/png','image/jpeg','image/webp','image/gif') END)) THEN RAISE EXCEPTION 'Uploaded file not found or file type mismatch'; END IF;
    v_url:=NULL;
  END IF;
  IF v_url IS NOT NULL AND (length(v_url)>4000 OR v_url !~ '^https://[^[:space:]]+$') THEN RAISE EXCEPTION 'HTTPS resource link required'; END IF;
  IF v_kind IN ('presentation','video','image','pdf','interactive','reference') AND v_url IS NULL AND v_path IS NULL THEN RAISE EXCEPTION 'A resource URL or file is required'; END IF;
  -- Constrain embedded providers independently of the browser-side allowlist.
  IF v_kind='presentation' AND v_url !~ '^https://docs\.google\.com/presentation/d/' THEN RAISE EXCEPTION 'Google Slides sharing link required'; END IF;
  IF v_kind='video' AND v_url !~ '^https://(drive\.google\.com/|((www\.)?loom\.com)/(share|embed)/)' THEN RAISE EXCEPTION 'Google Drive or Loom link required'; END IF;
  IF v_kind='interactive' AND v_url !~ '^https://app\.supademo\.com/(demo|embed)/' THEN RAISE EXCEPTION 'Supademo sharing link required'; END IF;
  IF v_kind='bookmarks' AND NOT EXISTS(SELECT 1 FROM public.materials m WHERE m.module_id=target_module_id AND (m.lesson_reference OR m.lesson_kind='reference') AND (m.url IS NOT NULL OR m.lesson_asset_path IS NOT NULL)) THEN RAISE EXCEPTION 'Add reference links before creating a bookmark task'; END IF;
  -- Use established material types so existing reports and foreign keys continue working.
  v_material_type:=CASE v_kind WHEN 'reading' THEN 'reading' WHEN 'presentation' THEN 'presentation' WHEN 'video' THEN 'video' WHEN 'pdf' THEN 'document' WHEN 'reference' THEN 'link' ELSE 'other' END;
  IF target_material_id IS NOT NULL THEN
    UPDATE public.materials SET title=v_title,description=v_description,url=v_url,is_required=v_required,
      lesson_tracking=v_tracking,lesson_reference=v_reference,lesson_asset_path=v_path,lesson_duration_minutes=v_duration,
      lesson_alt=v_alt,lesson_callout_style=v_style,updated_at=now()
    WHERE id=target_material_id;
    RETURN target_material_id;
  END IF;
  SELECT coalesce(max(position),0)+1 INTO v_position FROM public.materials WHERE module_id=target_module_id;
  IF v_kind IN ('reference','bookmarks') THEN
    SELECT coalesce(max(lesson_order),0)+1 INTO v_order FROM public.materials WHERE module_id=target_module_id AND lesson_kind IS NOT NULL;
  ELSIF after_material_id IS NULL THEN
    v_order:=1;
  ELSE
    SELECT lesson_order+1 INTO v_order FROM public.materials WHERE id=after_material_id AND module_id=target_module_id AND lesson_kind NOT IN ('reference','bookmarks');
    IF v_order IS NULL THEN RAISE EXCEPTION 'Insertion point is not in this module'; END IF;
  END IF;
  UPDATE public.materials SET lesson_order=lesson_order+1 WHERE module_id=target_module_id AND lesson_kind IS NOT NULL AND lesson_order>=v_order;
  INSERT INTO public.materials(module_id,title,description,material_type,url,is_required,position,lesson_kind,lesson_order,lesson_tracking,lesson_reference,lesson_asset_path,lesson_duration_minutes,lesson_alt,lesson_callout_style)
  VALUES(target_module_id,v_title,v_description,v_material_type,v_url,v_required,v_position,v_kind,v_order,v_tracking,v_reference,v_path,v_duration,v_alt,v_style) RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.hg_save_lesson_block(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hg_save_lesson_block(uuid,uuid,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.hg_delete_lesson_block(target_module_id uuid,target_material_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
  IF NOT public.is_trainer() THEN RAISE EXCEPTION 'Trainer access required'; END IF;
  PERFORM 1 FROM public.modules WHERE id=target_module_id FOR UPDATE;
  PERFORM 1 FROM public.materials WHERE id=target_material_id AND module_id=target_module_id AND lesson_kind IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesson block not found'; END IF;
  IF EXISTS(SELECT 1 FROM public.learner_material_progress WHERE material_id=target_material_id) THEN RAISE EXCEPTION 'This content already has learner progress; it cannot be deleted'; END IF;
  DELETE FROM public.materials WHERE id=target_material_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.hg_delete_lesson_block(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hg_delete_lesson_block(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.hg_reorder_lesson_blocks(target_module_id uuid,ordered_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_expected integer;
BEGIN
  IF NOT public.is_trainer() THEN RAISE EXCEPTION 'Trainer access required'; END IF;
  PERFORM 1 FROM public.modules WHERE id=target_module_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Module not found'; END IF;
  SELECT count(*) INTO v_expected FROM public.materials WHERE module_id=target_module_id AND lesson_kind NOT IN ('reference','bookmarks');
  IF ordered_ids IS NULL OR cardinality(ordered_ids)<>v_expected OR (SELECT count(DISTINCT x) FROM unnest(ordered_ids) x)<>v_expected OR
     EXISTS(SELECT 1 FROM unnest(ordered_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.materials m WHERE m.id=x AND m.module_id=target_module_id AND m.lesson_kind NOT IN ('reference','bookmarks'))) THEN
    RAISE EXCEPTION 'Content order changed; reload the module and try again';
  END IF;
  UPDATE public.materials m SET lesson_order=t.n::integer FROM unnest(ordered_ids) WITH ORDINALITY t(id,n) WHERE m.id=t.id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.hg_reorder_lesson_blocks(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hg_reorder_lesson_blocks(uuid,uuid[]) TO authenticated;

-- Atomic learner completion and module recalculation using the already validated engine.
CREATE OR REPLACE FUNCTION public.hg_set_lesson_complete(target_material_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_module uuid;
BEGIN
  SELECT m.id INTO v_module FROM public.materials ma JOIN public.modules m ON m.id=ma.module_id
  JOIN public.days d ON d.id=m.day_id JOIN public.programs p ON p.id=d.program_id
  JOIN public.profiles pr ON pr.id=auth.uid() AND pr.active_program_id=p.id AND pr.account_status='active' AND pr.role<>'trainer'
  JOIN public.program_enrollments pe ON pe.program_id=p.id AND pe.learner_id=pr.id
  WHERE ma.id=target_material_id AND ma.lesson_kind IS NOT NULL AND ma.lesson_tracking
    AND p.status='published' AND d.is_published AND m.publication_status='published' FOR SHARE OF ma;
  IF v_module IS NULL THEN RAISE EXCEPTION 'Lesson content is not available in your active wave'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.learner_material_progress l WHERE l.material_id=target_material_id AND l.learner_id=auth.uid() AND l.completed) THEN
    PERFORM public.set_material_complete(target_material_id,true);
  END IF;
  RETURN public.recalculate_module_progress(v_module);
END;
$fn$;
REVOKE ALL ON FUNCTION public.hg_set_lesson_complete(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hg_set_lesson_complete(uuid) TO authenticated;

-- Reorder the entire shared day timeline in one transaction. Keep IDs unchanged.
-- Stage positions above the current max to avoid colliding with unique constraints.
CREATE OR REPLACE FUNCTION public.hg_reorder_day_items(target_day_id uuid,ordered_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_count integer;v_offset integer;
BEGIN
  IF NOT public.is_trainer() THEN RAISE EXCEPTION 'Trainer access required'; END IF;
  PERFORM 1 FROM public.days WHERE id=target_day_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Day not found'; END IF;
  PERFORM 1 FROM public.day_content WHERE day_id=target_day_id FOR UPDATE;
  SELECT count(*),greatest(coalesce(max(position),0),0)+count(*)+100 INTO v_count,v_offset FROM public.day_content WHERE day_id=target_day_id;
  IF ordered_ids IS NULL OR cardinality(ordered_ids)<>v_count OR (SELECT count(DISTINCT x) FROM unnest(ordered_ids) x)<>v_count OR
     EXISTS(SELECT 1 FROM unnest(ordered_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.day_content dc WHERE dc.id=x AND dc.day_id=target_day_id)) THEN
    RAISE EXCEPTION 'Day structure changed; reload and try again';
  END IF;
  UPDATE public.day_content dc SET position=v_offset+t.n::integer FROM unnest(ordered_ids) WITH ORDINALITY t(id,n) WHERE dc.id=t.id;
  UPDATE public.day_content dc SET position=t.n::integer FROM unnest(ordered_ids) WITH ORDINALITY t(id,n) WHERE dc.id=t.id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.hg_reorder_day_items(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hg_reorder_day_items(uuid,uuid[]) TO authenticated;

-- Reuse the existing atomic module creation routine, then optionally insert after
-- the chosen item in the shared timeline (not after a separate module index).
CREATE OR REPLACE FUNCTION public.hg_create_module_after(target_day_id uuid,after_day_content_id uuid,
  module_title text,module_description text,module_objective text,module_duration_minutes integer,module_is_required boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_module uuid;v_item uuid;v_ids uuid[];
BEGIN
  IF NOT public.is_trainer() THEN RAISE EXCEPTION 'Trainer access required'; END IF;
  PERFORM 1 FROM public.days WHERE id=target_day_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Day not found'; END IF;
  IF after_day_content_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.day_content WHERE id=after_day_content_id AND day_id=target_day_id) THEN RAISE EXCEPTION 'Insertion point is not in this day'; END IF;
  IF module_is_required AND (
    EXISTS(SELECT 1 FROM public.days d JOIN public.programs p ON p.id=d.program_id WHERE d.id=target_day_id AND d.is_published AND p.status='published')
    OR EXISTS(SELECT 1 FROM public.days d JOIN public.program_enrollments pe ON pe.program_id=d.program_id WHERE d.id=target_day_id AND pe.status='completed')
  ) THEN RAISE EXCEPTION 'New required modules cannot be added to a published day or a wave with completed enrollments. Create an optional module instead.'; END IF;
  v_module:=public.create_day_module(target_day_id,module_title,module_description,module_objective,module_duration_minutes,module_is_required);
  UPDATE public.modules SET publication_status='draft' WHERE id=v_module;
  IF after_day_content_id IS NOT NULL THEN
    SELECT id INTO v_item FROM public.day_content WHERE day_id=target_day_id AND content_type='module' AND content_id=v_module;
    SELECT array_agg(x.id ORDER BY x.position,x.tie,x.id) INTO v_ids FROM (
      SELECT dc.id,dc.position,0 AS tie FROM public.day_content dc WHERE dc.day_id=target_day_id AND dc.id<>v_item
      UNION ALL SELECT v_item,dc.position,1 FROM public.day_content dc WHERE dc.id=after_day_content_id
    ) x;
    PERFORM public.hg_reorder_day_items(target_day_id,v_ids);
  END IF;
  RETURN v_module;
END;
$fn$;
REVOKE ALL ON FUNCTION public.hg_create_module_after(uuid,uuid,text,text,text,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hg_create_module_after(uuid,uuid,text,text,text,integer,boolean) TO authenticated;

-- Migration checks, no changes to learner records or existing content.
DO $validation$
DECLARE signature text;
BEGIN
  IF EXISTS(SELECT 1 FROM public.materials WHERE lesson_kind IS NULL AND (lesson_order IS NOT NULL OR lesson_asset_path IS NOT NULL)) THEN RAISE EXCEPTION 'Legacy material metadata unexpectedly changed'; END IF;
  FOREACH signature IN ARRAY ARRAY['public.hg_save_lesson_block(uuid,uuid,uuid,jsonb)','public.hg_delete_lesson_block(uuid,uuid)','public.hg_reorder_lesson_blocks(uuid,uuid[])','public.hg_set_lesson_complete(uuid)','public.hg_reorder_day_items(uuid,uuid[])','public.hg_create_module_after(uuid,uuid,text,text,text,integer,boolean)','public.hg_can_read_lesson_asset(text)'] LOOP
    IF has_function_privilege('anon',signature,'EXECUTE') OR NOT has_function_privilege('authenticated',signature,'EXECUTE') THEN RAISE EXCEPTION 'Invalid function permission: %',signature; END IF;
  END LOOP;
END;
$validation$;
COMMIT;

SELECT 'Lesson metadata installed' AS validation, count(*)::text AS details FROM information_schema.columns WHERE table_schema='public' AND table_name='materials' AND column_name LIKE 'lesson_%'
UNION ALL SELECT 'Legacy materials retained',count(*)::text FROM public.materials WHERE lesson_kind IS NULL
UNION ALL SELECT 'Existing material completions',count(*)::text FROM public.learner_material_progress
UNION ALL SELECT 'Existing module progress records',count(*)::text FROM public.learner_module_progress
UNION ALL SELECT 'Lesson storage bucket private',coalesce((SELECT (NOT public)::text FROM storage.buckets WHERE id='lesson-content'),'missing');
