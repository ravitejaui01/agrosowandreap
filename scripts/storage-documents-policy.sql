-- Allow listing and reading files in the "documents" bucket (for validator Section 2).
-- Run this in Supabase Dashboard → SQL Editor if Section 2 shows "No documents found"
-- but the folder exists in Storage. Safe to run multiple times (drops then recreates).

drop policy if exists "Allow read documents bucket" on storage.objects;

create policy "Allow read documents bucket"
on storage.objects for select
using ( bucket_id = 'documents' );
