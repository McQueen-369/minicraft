-- Report each saved world's kind (terrain or robot) alongside its metadata, so
-- the menu can label every world without downloading its save blob.
--
-- Saves made before robot worlds have no `worldKind` field; they are terrain
-- worlds, which is what the coalesce below reports.

create or replace function minicraft_list_worlds(p_token uuid)
returns json language sql security definer set search_path = public as $$
  select coalesce(
    json_agg(
      json_build_object(
        'id', id,
        'name', name,
        'updatedAt', updated_at,
        'kind', coalesce(data->>'worldKind', 'terrain')
      ) order by updated_at desc),
    '[]'::json)
  from minicraft_worlds where profile_id = minicraft_auth(p_token);
$$;
