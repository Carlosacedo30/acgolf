-- 17-nov-2026 · Soporte: la bandeja del super administrador enseña si quien escribe es administrador y de qué grupo.
create or replace function public.sa_soporte_hilos() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not es_super_admin() then raise exception 'Solo el super administrador'; end if;
  return coalesce((select jsonb_agg(h order by (h->>'sin_leer')::int desc, h->>'ultimo_en' desc) from (
    select jsonb_build_object(
      'user_id', m.user_id,
      'nombre', coalesce(nullif(btrim(p.player_name), ''), nullif(btrim(u.raw_user_meta_data->>'nombre'), ''), split_part(u.email, '@', 1)),
      'email', u.email,
      'es_admin', coalesce(p.es_admin, false) and p.grupo_id is not null,
      'grupo', g.nombre,
      'ultimo', (select left(x.texto, 120) from soporte_mensajes x where x.user_id = m.user_id order by x.id desc limit 1),
      'ultimo_de_soporte', (select x.de_soporte from soporte_mensajes x where x.user_id = m.user_id order by x.id desc limit 1),
      'ultimo_en', max(m.creado_en),
      'sin_leer', count(*) filter (where not m.de_soporte and not m.leido_soporte)
    ) h
    from soporte_mensajes m join auth.users u on u.id = m.user_id left join perfiles p on p.user_id = m.user_id left join grupos g on g.id = p.grupo_id
    group by m.user_id, p.player_name, p.es_admin, p.grupo_id, g.nombre, u.raw_user_meta_data, u.email
  ) q), '[]');
end; $$;
