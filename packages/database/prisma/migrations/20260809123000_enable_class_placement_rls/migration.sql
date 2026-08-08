-- Defense in depth for Supabase/PostgREST. The application connects as the
-- postgres table owner and continues to use server-side tenant checks; anon and
-- authenticated roles receive no direct table grants or policies.
ALTER TABLE "class_placement_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_placement_batch_versions" ENABLE ROW LEVEL SECURITY;
