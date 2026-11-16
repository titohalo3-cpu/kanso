-- Kansō · marcar lo que estoy viendo ahora
-- Añade la columna viendo (true = lo estoy viendo, false = terminado). Es idempotente.

alter table public.anime_series
  add column if not exists viendo boolean not null default false;

-- Que la API vea la columna nueva al momento
notify pgrst, 'reload schema';
