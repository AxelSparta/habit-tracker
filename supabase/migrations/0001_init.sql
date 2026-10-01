-- Esquema del habit tracker. Los usuarios vienen de Clerk (third-party auth):
-- el `sub` del JWT es el id de usuario de Clerk (texto, ej. "user_2abc...").

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  name text not null check (char_length(name) between 1 and 60),
  emoji text not null,
  -- {"type":"daily"} | {"type":"weekdays","days":[0,2,4]} | {"type":"timesPerWeek","count":3}
  frequency jsonb not null,
  -- Fecha local (del usuario) en que se creó el hábito; las rachas arrancan acá.
  created_on date not null default current_date,
  archived boolean not null default false,
  inserted_at timestamptz not null default now()
);

create index habits_user_id_idx on public.habits (user_id);

create table public.completions (
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id text not null default (auth.jwt() ->> 'sub'),
  day date not null,
  primary key (habit_id, day)
);

create index completions_user_id_idx on public.completions (user_id);

alter table public.habits enable row level security;
alter table public.completions enable row level security;

create policy "Cada usuario gestiona sus hábitos"
on public.habits
for all
to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Cada usuario gestiona sus completados"
on public.completions
for all
to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check (
  (select auth.jwt() ->> 'sub') = user_id
  -- Sólo se puede marcar un hábito propio.
  and exists (
    select 1 from public.habits h
    where h.id = habit_id and h.user_id = (select auth.jwt() ->> 'sub')
  )
);
