/*
# Expand employee roles + create employee_files table

1. Modified Table: employees
- Role constraint expanded to allow: admin, sales, support, marketing, operator, manager
(No column changes — role is text, we add a CHECK constraint to enforce valid values.)

2. New Table: employee_files
- id (uuid, pk)
- uploaded_by_email (text) — email of the employee who uploaded
- uploaded_by_name (text) — display name
- filename (text) — original file name
- mime_type (text) — file content type
- size_bytes (bigint) — file size
- folder (text, default 'General') — folder/category for organization
- description (text, default '') — optional note
- file_data (text) — base64-encoded file content
- created_at (timestamptz)

3. Security
- RLS enabled on employee_files. Full CRUD for anon, authenticated (admin app manages files).

4. Important Notes
- Files are stored as base64 text in the database. Suitable for documents, images, and small-to-medium files used in an admin/employee portal.
- All employees (admin, sales, support, marketing, operator, manager) can upload, list, download, and delete files.
*/

-- Expand employees role check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_role_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_role_check
    CHECK (role IN ('admin', 'sales', 'support', 'marketing', 'operator', 'manager'));
  END IF;
END $$;

-- If the constraint already exists, drop and recreate with the expanded set
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_role_check') THEN
    ALTER TABLE employees DROP CONSTRAINT employees_role_check;
  END IF;
  ALTER TABLE employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('admin', 'sales', 'support', 'marketing', 'operator', 'manager'));
END $$;

-- Create employee_files table
CREATE TABLE IF NOT EXISTS employee_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_email text NOT NULL DEFAULT '',
  uploaded_by_name text NOT NULL DEFAULT '',
  filename text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL DEFAULT 0,
  folder text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  file_data text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_employee_files" ON employee_files;
CREATE POLICY "anon_select_employee_files" ON employee_files FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employee_files" ON employee_files;
CREATE POLICY "anon_insert_employee_files" ON employee_files FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_employee_files" ON employee_files;
CREATE POLICY "anon_update_employee_files" ON employee_files FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_employee_files" ON employee_files;
CREATE POLICY "anon_delete_employee_files" ON employee_files FOR DELETE
  TO anon, authenticated USING (true);
