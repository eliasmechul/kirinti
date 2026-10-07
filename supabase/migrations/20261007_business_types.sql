-- Daha fazla işletme türü: fırın, manav, market (Too Good To Go'daki market/fırın paketleri gibi).
do $$ declare c record; begin
  for c in select conrelid::regclass as t, conname from pg_constraint
    where contype = 'c' and conrelid in ('public.businesses'::regclass, 'public.business_applications'::regclass)
      and pg_get_constraintdef(oid) like '%type%' loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
end $$;
alter table public.businesses add constraint businesses_type_check check (type in ('restoran','kafe','firin','manav','market'));
alter table public.business_applications add constraint business_applications_type_check check (type in ('restoran','kafe','firin','manav','market'));
