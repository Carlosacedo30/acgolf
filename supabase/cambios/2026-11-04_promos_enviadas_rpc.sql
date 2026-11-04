create or replace function public.sa_promos_enviadas()
returns table(enviado_en timestamptz, asunto text, alcance text, correos int, grupo text)
language plpgsql security definer set search_path = public as $$
begin
  if not es_super_admin() then raise exception 'No autorizado'; end if;
  return query
    select p.enviado_en, p.asunto, p.alcance, p.correos, g.nombre::text
    from promos_enviadas p left join grupos g on g.id = p.grupo_id
    order by p.enviado_en desc limit 50;
end $$;
revoke all on function public.sa_promos_enviadas() from public, anon;
grant execute on function public.sa_promos_enviadas() to authenticated;
