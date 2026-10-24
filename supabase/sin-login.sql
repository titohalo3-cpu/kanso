-- Kansō · uso personal sin inicio de sesión
-- Ejecútalo en el SQL Editor DESPUÉS de schema.sql. Es idempotente.
-- Permite leer y escribir con la clave anon pública: cualquiera que tenga la URL de la web
-- podría editar la lista. Es lo acordado para un uso solo personal.

grant select, insert, update, delete on public.anime_series, public.anime_temporadas to anon, authenticated;

drop policy if exists "series_escribir" on public.anime_series;
drop policy if exists "temporadas_escribir" on public.anime_temporadas;

create policy "series_escribir" on public.anime_series
  for all to anon, authenticated using (true) with check (true);
create policy "temporadas_escribir" on public.anime_temporadas
  for all to anon, authenticated using (true) with check (true);
