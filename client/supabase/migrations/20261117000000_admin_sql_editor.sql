-- Run this migration in Supabase before using /admin/sql.
-- The function runs with the caller's database role (SECURITY INVOKER), so
-- existing grants and row-level security policies continue to apply.
create or replace function public.admin_execute_sql(query text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
  statement text;
  returned_rows jsonb;
  affected_rows bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
  ) then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if query is null or btrim(query) = '' then
    raise exception 'Enter a SQL statement.' using errcode = '22023';
  end if;

  -- Remove a single trailing semicolon so a SELECT can be safely wrapped.
  statement := regexp_replace(btrim(query), ';[[:space:]]*$', '');

  if statement ~* '^select([[:space:]]|$)' then
    execute
      'select coalesce(jsonb_agg(to_jsonb(sql_rows)), ''[]''::jsonb) '
      || 'from (select * from (' || statement || ') as sql_query limit 100) as sql_rows'
      into returned_rows;

    return jsonb_build_object(
      'rows', returned_rows,
      'rowsAffected', jsonb_array_length(returned_rows)
    );
  end if;

  execute statement;
  get diagnostics affected_rows = row_count;
  return jsonb_build_object('rowsAffected', affected_rows);
end;
$function$;

revoke all on function public.admin_execute_sql(text) from public, anon;
grant execute on function public.admin_execute_sql(text) to authenticated;
