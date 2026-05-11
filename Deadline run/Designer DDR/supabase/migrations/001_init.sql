create table if not exists dash_rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  host_name  text not null,
  guest_name text,
  song_id    text not null,
  status     text default 'waiting',
  start_at   bigint,
  created_at timestamptz default now()
);

create table if not exists dash_scores (
  id            uuid primary key default gen_random_uuid(),
  song_id       text not null,
  player_name   text not null,
  score         integer not null,
  perfect_count integer default 0,
  good_count    integer default 0,
  miss_count    integer default 0,
  max_combo     integer default 0,
  created_at    timestamptz default now()
);

alter table dash_rooms enable row level security;
alter table dash_scores enable row level security;

create policy "dash_rooms_select" on dash_rooms for select using (true);
create policy "dash_rooms_insert" on dash_rooms for insert with check (true);
create policy "dash_rooms_update" on dash_rooms for update using (true);

create policy "dash_scores_select" on dash_scores for select using (true);
create policy "dash_scores_insert" on dash_scores for insert with check (true);

-- Enable realtime on dash_rooms
alter publication supabase_realtime add table dash_rooms;
