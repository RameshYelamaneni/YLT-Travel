/*
# Open CMS write policies to anon for demo admin panel

## Purpose
The app's Admin panel uses a mock auth system (not Supabase auth sessions).
The admin is gated client-side by `user.type === 'admin'`. Since the frontend
only has the anon key, the `TO authenticated` write policies on routes,
offers, and directors block all CMS operations.

For this demo CMS to function, write policies are opened to `anon, authenticated`.
In a production deployment with real Supabase auth, these would be scoped to an
`admin` role via `auth.jwt() ->> 'role' = 'admin'`.

## Security changes
- routes:   INSERT/UPDATE/DELETE now `TO anon, authenticated`
- offers:   INSERT/UPDATE/DELETE now `TO anon, authenticated`
- directors: INSERT/UPDATE/DELETE now `TO anon, authenticated`

SELECT policies remain unchanged (public read for all).
*/

-- routes
DROP POLICY IF EXISTS "auth_insert_routes" ON routes;
CREATE POLICY "auth_insert_routes" ON routes FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_routes" ON routes;
CREATE POLICY "auth_update_routes" ON routes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_routes" ON routes;
CREATE POLICY "auth_delete_routes" ON routes FOR DELETE
  TO anon, authenticated USING (true);

-- offers
DROP POLICY IF EXISTS "auth_insert_offers" ON offers;
CREATE POLICY "auth_insert_offers" ON offers FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_offers" ON offers;
CREATE POLICY "auth_update_offers" ON offers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_offers" ON offers;
CREATE POLICY "auth_delete_offers" ON offers FOR DELETE
  TO anon, authenticated USING (true);

-- directors
DROP POLICY IF EXISTS "auth_insert_directors" ON directors;
CREATE POLICY "auth_insert_directors" ON directors FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_directors" ON directors;
CREATE POLICY "auth_update_directors" ON directors FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_directors" ON directors;
CREATE POLICY "auth_delete_directors" ON directors FOR DELETE
  TO anon, authenticated USING (true);
