-- Kansō · películas de anime
-- Añade el tipo de obra a cada fila: 'serie' (anime con temporadas) o 'pelicula'.
-- Ejecútalo una vez en el SQL Editor. Es idempotente.

alter table public.anime_series
  add column if not exists tipo text not null default 'serie';

alter table public.anime_series drop constraint if exists anime_series_tipo_check;
alter table public.anime_series
  add constraint anime_series_tipo_check check (tipo in ('serie', 'pelicula'));

-- Que la API vea la columna nueva al momento
notify pgrst, 'reload schema';
