-- Ritmo del campo (17-nov-2026): cada vez que un grupo anota un hoyo por primera vez, el servidor guarda la hora
-- (en el grupo, «horas»: { "hoyo": segundos desde 1970 }). La hora la pone el servidor, no el móvil, así no depende del reloj de cada jugador.
create or replace function public.save_round_group(p_id uuid, p_group integer, p_players jsonb default null, p_handicaps jsonb default null, p_scores jsonb default null, p_touch boolean default true)
 returns boolean language plpgsql set search_path to 'public' as $function$
declare
  mg jsonb; g jsonb; sc jsonb; hz jsonb; k text; hk text;
begin
  if p_group < 0 or p_group > 9 then return false; end if;
  select coalesce(match_groups, '[]'::jsonb) into mg from rounds where id = p_id for update;
  if not found then return false; end if;
  if jsonb_typeof(mg) <> 'array' then mg := '[]'::jsonb; end if;
  while jsonb_array_length(mg) <= p_group loop
    mg := mg || jsonb_build_array(jsonb_build_object('players','[]'::jsonb,'handicaps','[]'::jsonb,'scores','{}'::jsonb));
  end loop;
  g := coalesce(mg -> p_group, '{}'::jsonb);
  if p_players   is not null then g := jsonb_set(g, '{players}',   p_players,   true); end if;
  if p_handicaps is not null then g := jsonb_set(g, '{handicaps}', p_handicaps, true); end if;
  if p_scores is not null and jsonb_typeof(p_scores) = 'object' then
    sc := case when jsonb_typeof(g -> 'scores') = 'object' then g -> 'scores' else '{}'::jsonb end;
    hz := case when jsonb_typeof(g -> 'horas') = 'object' then g -> 'horas' else '{}'::jsonb end;
    for k in select jsonb_object_keys(p_scores) loop
      sc := jsonb_set(sc, array[k],
        (case when jsonb_typeof(sc -> k) = 'object' then sc -> k else '{}'::jsonb end) || (p_scores -> k), true);
      if jsonb_typeof(p_scores -> k) = 'object' then
        for hk in select jsonb_object_keys(p_scores -> k) loop
          if coalesce(p_scores -> k ->> hk, '') <> '' and not (hz ? hk) then
            hz := jsonb_set(hz, array[hk], to_jsonb(floor(extract(epoch from now()))::bigint), true);
          end if;
        end loop;
      end if;
    end loop;
    g := jsonb_set(g, '{scores}', sc, true);
    g := jsonb_set(g, '{horas}', hz, true);
  end if;
  mg := jsonb_set(mg, array[p_group::text], g, false);
  if p_touch then
    update rounds set match_groups = mg, updated_at = now() where id = p_id;
  else
    update rounds set match_groups = mg where id = p_id;
  end if;
  return found;
end $function$;
