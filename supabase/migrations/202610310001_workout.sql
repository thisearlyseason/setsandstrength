create table public.training_profiles (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 60), age_band text not null check (age_band in ('adult','13-15','16-17')),
 created_at timestamptz not null default now()
);
create index on public.training_profiles(owner_id);
create table public.profile_states (
 profile_id uuid primary key references public.training_profiles(id) on delete cascade,
 state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'), rev bigint not null default 0,
 wid uuid not null default gen_random_uuid(), updated_at timestamptz not null default now()
);
create table public.exercise_catalog (id text primary key, metadata jsonb not null);
create table public.program_templates (id text primary key, version integer not null, review_status text not null default 'draft' check(review_status in ('draft','approved')), content jsonb not null);
create table public.exercise_media (exercise_id text primary key references public.exercise_catalog(id), manifest jsonb not null, review_status text not null default 'pending' check(review_status in ('pending','draft','approved')));
alter table public.training_profiles enable row level security;
alter table public.profile_states enable row level security;
alter table public.exercise_catalog enable row level security;
alter table public.program_templates enable row level security;
alter table public.exercise_media enable row level security;
create policy profile_owner on public.training_profiles for all to authenticated using(owner_id = auth.uid()) with check(owner_id = auth.uid());
create policy state_read on public.profile_states for select to authenticated using(exists(select 1 from public.training_profiles p where p.id = profile_id and p.owner_id = auth.uid()));
create policy catalog_read on public.exercise_catalog for select to anon, authenticated using(true);
create policy program_read on public.program_templates for select to anon, authenticated using(true);
create policy media_read on public.exercise_media for select to anon, authenticated using(true);
-- Only the transactional RPC writes state. Never grant direct write access to clients.
revoke insert, update, delete on public.profile_states from anon, authenticated;
create function public.init_profile_state() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profile_states(profile_id) values(new.id); return new; end $$;
create trigger profile_state after insert on public.training_profiles for each row execute function public.init_profile_state();
create function public.save_profile_state(p_profile_id uuid, p_expected_rev bigint, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_row public.profile_states; new_wid uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.training_profiles where id = p_profile_id and owner_id = auth.uid()) then raise exception 'Profile access denied' using errcode = '42501'; end if;
 if jsonb_typeof(p_state) <> 'object' or octet_length(p_state::text) > 10000000 then raise exception 'Invalid or oversized state'; end if;
 select * into current_row from public.profile_states where profile_id = p_profile_id for update;
 if p_expected_rev is null or current_row.rev <> p_expected_rev then
  return jsonb_build_object('conflict',true,'state',current_row.state,'rev',current_row.rev,'wid',current_row.wid);
 end if;
 new_wid := gen_random_uuid();
 update public.profile_states set state = p_state || jsonb_build_object('_wid',new_wid), rev = rev + 1, wid = new_wid, updated_at = now() where profile_id = p_profile_id;
 return jsonb_build_object('conflict',false,'rev',current_row.rev + 1,'wid',new_wid);
end $$;
revoke all on function public.save_profile_state(uuid,bigint,jsonb) from public, anon;
grant execute on function public.save_profile_state(uuid,bigint,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('exercise-assets','exercise-assets',true,52428800,array['model/gltf+json','model/gltf-binary','application/octet-stream','image/webp','image/png']),
 ('private-uploads','private-uploads',false,20971520,array['image/jpeg','image/png','image/webp','video/mp4']);
create policy asset_read on storage.objects for select to anon, authenticated using(bucket_id = 'exercise-assets');
create policy upload_owner on storage.objects for all to authenticated
 using(bucket_id = 'private-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
 with check(bucket_id = 'private-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
