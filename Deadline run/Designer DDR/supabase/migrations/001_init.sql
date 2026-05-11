create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  host_name  text not null,
  guest_name text,
  song_id    text not null,
  status     text default 'waiting',
  start_at   bigint,
  created_at timestamptz default now()
);

create table if not exists scores (
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

-- Enable realtime on rooms table
alter publication supabase_realtime add table rooms;
