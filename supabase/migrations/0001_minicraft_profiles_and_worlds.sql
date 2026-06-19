-- Minicraft player profiles + cloud world saves.
-- (Already applied to the shared Supabase project as migrations
-- `minicraft_profiles_and_worlds` + `minicraft_fix_pgcrypto_search_path`;
-- kept here as the reference copy.)
--
-- Tables are locked down (RLS enabled, no policies, no grants); all access
-- goes through SECURITY DEFINER functions that check a session token, so the
-- browser's anon key can only act on data it holds a valid token for.

create extension if not exists pgcrypto;

create table minicraft_profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint minicraft_username_format check (username ~ '^[A-Za-z0-9_]{3,16}$')
);

create table minicraft_sessions (
  token uuid primary key default gen_random_uuid(),
  profile_id uuid not null references minicraft_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table minicraft_worlds (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references minicraft_profiles(id) on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, name),
  constraint minicraft_world_name check (char_length(name) between 1 and 32)
);

create index minicraft_worlds_profile on minicraft_worlds (profile_id, updated_at desc);
create index minicraft_sessions_profile on minicraft_sessions (profile_id);

alter table minicraft_profiles enable row level security;
alter table minicraft_sessions enable row level security;
alter table minicraft_worlds enable row level security;
revoke all on minicraft_profiles, minicraft_sessions, minicraft_worlds from anon, authenticated;

-- Resolve a session token to a profile id (internal helper, not callable via RPC).
create function minicraft_auth(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_profile_id uuid;
begin
  select profile_id into v_profile_id
  from minicraft_sessions where token = p_token and expires_at > now();
  if v_profile_id is null then
    raise exception 'Session expired — please sign in again';
  end if;
  return v_profile_id;
end $$;
revoke execute on function minicraft_auth(uuid) from public, anon, authenticated;

-- pgcrypto lives in the `extensions` schema on Supabase, hence the search_path.
create function minicraft_signup(p_username text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_profile minicraft_profiles; v_token uuid;
begin
  if p_password is null or char_length(p_password) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;
  insert into minicraft_profiles (username, password_hash)
  values (p_username, crypt(p_password, gen_salt('bf')))
  returning * into v_profile;
  insert into minicraft_sessions (profile_id) values (v_profile.id) returning token into v_token;
  return json_build_object('token', v_token, 'username', v_profile.username);
exception
  when unique_violation then
    raise exception 'That username is taken';
  when check_violation then
    raise exception 'Usernames are 3-16 letters, numbers, or underscores';
end $$;

create function minicraft_login(p_username text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_profile minicraft_profiles; v_token uuid;
begin
  select * into v_profile from minicraft_profiles where username = p_username;
  if not found or v_profile.password_hash <> crypt(p_password, v_profile.password_hash) then
    raise exception 'Wrong username or password';
  end if;
  insert into minicraft_sessions (profile_id) values (v_profile.id) returning token into v_token;
  return json_build_object('token', v_token, 'username', v_profile.username);
end $$;

create function minicraft_logout(p_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from minicraft_sessions where token = p_token;
$$;

-- Account settings: rename the profile (password-confirmed). Worlds reference
-- profile_id, so a username change leaves every saved world intact.
create or replace function minicraft_change_username(p_token uuid, p_password text, p_new_username text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_profile_id uuid := minicraft_auth(p_token); v_profile minicraft_profiles;
begin
  select * into v_profile from minicraft_profiles where id = v_profile_id;
  if v_profile.password_hash <> crypt(p_password, v_profile.password_hash) then
    raise exception 'Wrong password';
  end if;
  update minicraft_profiles set username = p_new_username
  where id = v_profile_id returning * into v_profile;
  return json_build_object('token', p_token, 'username', v_profile.username);
exception
  when unique_violation then
    raise exception 'That username is taken';
  when check_violation then
    raise exception 'Usernames are 3-16 letters, numbers, or underscores';
end $$;

-- Account settings: reset the profile password (current password required).
-- The session token stays valid and saved worlds are untouched.
create or replace function minicraft_change_password(p_token uuid, p_current_password text, p_new_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_profile_id uuid := minicraft_auth(p_token); v_profile minicraft_profiles;
begin
  select * into v_profile from minicraft_profiles where id = v_profile_id;
  if v_profile.password_hash <> crypt(p_current_password, v_profile.password_hash) then
    raise exception 'Wrong current password';
  end if;
  if p_new_password is null or char_length(p_new_password) < 4 then
    raise exception 'Password must be at least 4 characters';
  end if;
  update minicraft_profiles set password_hash = crypt(p_new_password, gen_salt('bf'))
  where id = v_profile_id;
end $$;

create function minicraft_list_worlds(p_token uuid)
returns json language sql security definer set search_path = public as $$
  select coalesce(
    json_agg(json_build_object('id', id, 'name', name, 'updatedAt', updated_at) order by updated_at desc),
    '[]'::json)
  from minicraft_worlds where profile_id = minicraft_auth(p_token);
$$;

create function minicraft_save_world(p_token uuid, p_world_id uuid, p_name text, p_data jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_profile_id uuid := minicraft_auth(p_token); v_id uuid;
begin
  if octet_length(p_data::text) > 4 * 1024 * 1024 then
    raise exception 'World save is too large';
  end if;
  if p_world_id is null then
    insert into minicraft_worlds (profile_id, name, data)
    values (v_profile_id, p_name, p_data) returning id into v_id;
  else
    update minicraft_worlds
    set data = p_data, name = coalesce(p_name, name), updated_at = now()
    where id = p_world_id and profile_id = v_profile_id
    returning id into v_id;
    if v_id is null then
      raise exception 'World not found';
    end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'You already have a world with that name';
end $$;

create function minicraft_load_world(p_token uuid, p_world_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_data jsonb;
begin
  select data into v_data from minicraft_worlds
  where id = p_world_id and profile_id = minicraft_auth(p_token);
  if v_data is null then
    raise exception 'World not found';
  end if;
  return v_data;
end $$;

create function minicraft_delete_world(p_token uuid, p_world_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from minicraft_worlds
  where id = p_world_id and profile_id = minicraft_auth(p_token);
end $$;
