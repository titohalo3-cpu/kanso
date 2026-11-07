-- Kansō · solo el dueño puede añadir, editar o borrar
-- Deshace supabase/sin-login.sql: cualquiera puede leer la lista, pero solo escriben
-- los usuarios de Supabase Auth que estén en anime_duenos. Es idempotente.

-- 1. La clave pública (anon) vuelve a ser solo de lectura
revoke insert, update, delete on public.anime_series, public.anime_temporadas from anon;
grant select on public.anime_series, public.anime_temporadas to anon, authenticated;
grant insert, update, delete on public.anime_series, public.anime_temporadas to authenticated;

drop policy if exists "series_escribir" on public.anime_series;
drop policy if exists "temporadas_escribir" on public.anime_temporadas;

create policy "series_escribir" on public.anime_series
  for all to authenticated using (public.anime_es_dueno()) with check (public.anime_es_dueno());
create policy "temporadas_escribir" on public.anime_temporadas
  for all to authenticated using (public.anime_es_dueno()) with check (public.anime_es_dueno());

-- 2. Hazte dueño: primero crea tu usuario en Authentication → Users (correo y contraseña)
--    y después cambia el correo de abajo por el tuyo y ejecuta esta parte.
insert into public.anime_duenos (user_id)
  select id from auth.users where email = 'tu-correo@ejemplo.com'
  on conflict do nothing;

-- 3. Comprueba que has quedado dentro (debe salir 1 fila con tu correo)
select u.email from public.anime_duenos d join auth.users u on u.id = d.user_id;
