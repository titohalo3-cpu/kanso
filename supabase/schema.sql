-- Kansō · esquema de Supabase
-- Ejecútalo entero en el SQL Editor del proyecto. Es idempotente: se puede repetir.

-- 1. Dueños: solo los usuarios de esta tabla pueden añadir, editar o borrar.
create table if not exists public.anime_duenos (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.anime_duenos enable row level security;
-- Sin políticas: nadie la lee ni la escribe desde la API; solo la función de abajo.

create or replace function public.anime_es_dueno()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.anime_duenos where user_id = auth.uid());
$$;
revoke all on function public.anime_es_dueno() from public;
grant execute on function public.anime_es_dueno() to anon, authenticated;

-- 2. Series (cada anime)
create table if not exists public.anime_series (
  id              bigint generated always as identity primary key,
  nombre          text not null check (char_length(nombre) between 1 and 200),
  titulo_original text check (char_length(titulo_original) <= 200),
  poster_url      text check (poster_url ~* '^https://'),
  banner_url      text check (banner_url ~* '^https://'),
  color           text check (color ~* '^#[0-9a-f]{3,8}$'),
  anio            int check (anio between 1900 and 2100),
  generos         text[] not null default '{}',
  nota            numeric(3,1) check (nota between 0 and 10),
  anilist_id      int,
  tipo            text not null default 'serie' check (tipo in ('serie', 'pelicula')),
  creado_en       timestamptz not null default now()
);

-- 3. Temporadas de cada serie, con su nota
create table if not exists public.anime_temporadas (
  id          bigint generated always as identity primary key,
  serie_id    bigint not null references public.anime_series (id) on delete cascade,
  numero      int not null default 1 check (numero between 0 and 99),
  nombre      text not null check (char_length(nombre) between 1 and 200),
  poster_url  text check (poster_url ~* '^https://'),
  anio        int check (anio between 1900 and 2100),
  nota        numeric(3,1) check (nota between 0 and 10),
  anilist_id  int,
  creado_en   timestamptz not null default now()
);
create index if not exists anime_temporadas_serie_idx on public.anime_temporadas (serie_id);

-- 4. Seguridad: lectura pública, escritura solo para dueños
alter table public.anime_series enable row level security;
alter table public.anime_temporadas enable row level security;

grant select on public.anime_series, public.anime_temporadas to anon, authenticated;
grant insert, update, delete on public.anime_series, public.anime_temporadas to authenticated;

drop policy if exists "series_leer" on public.anime_series;
drop policy if exists "series_escribir" on public.anime_series;
drop policy if exists "temporadas_leer" on public.anime_temporadas;
drop policy if exists "temporadas_escribir" on public.anime_temporadas;

create policy "series_leer" on public.anime_series
  for select to anon, authenticated using (true);
create policy "series_escribir" on public.anime_series
  for all to authenticated using (public.anime_es_dueno()) with check (public.anime_es_dueno());

create policy "temporadas_leer" on public.anime_temporadas
  for select to anon, authenticated using (true);
create policy "temporadas_escribir" on public.anime_temporadas
  for all to authenticated using (public.anime_es_dueno()) with check (public.anime_es_dueno());

-- 5. Hazte dueño (cambia el correo por el de tu usuario de Supabase Auth):
-- insert into public.anime_duenos (user_id)
--   select id from auth.users where email = 'tu-correo@ejemplo.com'
--   on conflict do nothing;
