-- ════════════════════════════════════════════════════════════════════════════
-- Alışkanlık — Supabase şeması (Faz 1: sosyal katman)
-- Rapor bölüm 6.2 veri modeli. HENÜZ HİÇBİR GERÇEK PROJEDE ÇALIŞTIRILMADI.
-- Kurulum: Supabase Dashboard → SQL Editor → bu dosyanın tamamını yapıştır → Run.
-- Yerel doğrulama: `npm run test:sql` (PGlite üzerinde şema + RLS senaryoları).
-- ════════════════════════════════════════════════════════════════════════════


-- Karıştırılması zor karakterler (0/O, 1/I/L yok) ile davet kodu üretir.
create or replace function public.gen_code(len int)
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- ───────────────────────── Tablolar ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text not null default '',
  avatar_url text,
  timezone text not null default 'Europe/Belgrade',
  friend_code text not null unique default public.gen_code(8),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint display_name_len check (char_length(display_name) <= 40)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint no_self_friend check (requester_id <> addressee_id)
);
-- Yön bağımsız teklik: (A,B) varsa (B,A) eklenemez.
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'challenge')),
  target_id uuid not null,
  reason text not null default '' check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

-- Kişisel görevlerin bulut yedeği (Faz 2 senkronu için hazır; istemci henüz yazmıyor).
create table public.tasks (
  id uuid primary key,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  icon text not null default '✅',
  color text not null default '#6C5CE7',
  category text not null default 'kisisel',
  kind text not null default 'boolean' check (kind in ('boolean', 'count', 'duration')),
  target_value numeric not null default 1,
  unit text not null default '',
  recurrence_type text not null default 'daily'
    check (recurrence_type in ('daily', 'weekdays', 'weekly_n', 'monthly_day', 'monthly_n')),
  recurrence_days int[] not null default '{}',
  period_target_n int not null default 1,
  start_date date not null,
  end_date date,
  weight int not null default 1 check (weight between 1 and 3),
  privacy text not null default 'private' check (privacy in ('private', 'friends', 'challenge')),
  reminder_time text,
  pauses jsonb not null default '[]',
  archived boolean not null default false,
  source_task_id uuid,
  challenge_id uuid,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_owner_idx on public.tasks (owner_id);

create table public.task_logs (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  value numeric not null default 0,
  status text not null check (status in ('done', 'partial', 'skipped', 'missed')),
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (task_id, date)
);
create index task_logs_user_idx on public.task_logs (user_id, date);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  start_date date not null,
  end_date date not null,
  visibility text not null default 'private' check (visibility in ('private', 'friends')),
  scoring_mode text not null default 'task_average',
  status text not null default 'active' check (status in ('active', 'cancelled')),
  join_code text not null unique default public.gen_code(6),
  created_at timestamptz not null default now(),
  constraint challenge_dates check (end_date >= start_date and end_date <= start_date + 366)
);

-- Challenge'ın ortak görev(ler)i. Her katılımcı kendi cihazında bunun kopyasını takip eder.
create table public.challenge_tasks (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  icon text not null default '✅',
  color text not null default '#6C5CE7',
  category text not null default 'kisisel',
  kind text not null default 'boolean' check (kind in ('boolean', 'count')),
  target_value numeric not null default 1 check (target_value > 0),
  unit text not null default '',
  recurrence_type text not null default 'daily'
    check (recurrence_type in ('daily', 'weekdays', 'weekly_n', 'monthly_day', 'monthly_n')),
  recurrence_days int[] not null default '{}',
  period_target_n int not null default 1 check (period_target_n between 1 and 31),
  weight int not null default 1 check (weight between 1 and 3),
  created_at timestamptz not null default now()
);
create index challenge_tasks_challenge_idx on public.challenge_tasks (challenge_id);

create table public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'joined' check (status in ('invited', 'joined', 'left')),
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index challenge_members_user_idx on public.challenge_members (user_id);

-- Katılımcıların challenge görevindeki günlük check-in'leri.
-- Yüzde skor istemcide, uygulamadaki AYNI skor motoruyla bu satırlardan hesaplanır
-- (kimse kendi skorunu "beyan" etmez; herkes herkesin skorunu ham kayıttan hesaplar).
create table public.challenge_logs (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  challenge_task_id uuid not null references public.challenge_tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  value numeric not null default 0 check (value >= 0),
  status text not null check (status in ('done', 'partial', 'skipped', 'missed')),
  updated_at timestamptz not null default now(),
  primary key (challenge_task_id, user_id, date)
);
create index challenge_logs_challenge_idx on public.challenge_logs (challenge_id, date);

create table public.challenge_reactions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  emoji text not null check (emoji in ('👏', '🔥', '💪', '❤️', '😂')),
  created_at timestamptz not null default now(),
  unique (challenge_id, from_user, to_user, date, emoji)
);
create index challenge_reactions_challenge_idx on public.challenge_reactions (challenge_id, date);

-- Uygulama içi bildirim kutusu (Faz 3; push yok).
create table public.notifications_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_inbox_user_idx on public.notifications_inbox (user_id, created_at desc);

-- ───────────────────────── Yardımcı fonksiyonlar (RLS için) ─────────────────────────
-- SECURITY DEFINER: politikaların kendi tablolarını sorgularken sonsuz döngüye girmesini önler.

create or replace function public.is_friend(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.blocks k
    where (k.blocker_id = a and k.blocked_id = b) or (k.blocker_id = b and k.blocked_id = a)
  );
$$;

create or replace function public.is_challenge_member(cid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.challenge_members m
    where m.challenge_id = cid and m.user_id = uid and m.status = 'joined'
  );
$$;

create or replace function public.shares_challenge(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.challenge_members m1
    join public.challenge_members m2 on m2.challenge_id = m1.challenge_id
    where m1.user_id = a and m2.user_id = b and m1.status = 'joined' and m2.status = 'joined'
  );
$$;

create or replace function public.is_challenge_owner(cid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.challenges c where c.id = cid and c.owner_id = uid);
$$;

-- Check-in yazılabilir mi: kullanıcı katılmış üye, görev bu challenge'a ait,
-- challenge aktif ve tarih başlangıç–bitiş aralığında (geleceğe en çok 1 gün: saat dilimi payı).
create or replace function public.challenge_log_allowed(cid uuid, ctid uuid, d date, uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_challenge_member(cid, uid)
    and exists (
      select 1
      from public.challenge_tasks ct
      join public.challenges c on c.id = ct.challenge_id
      where ct.id = ctid
        and c.id = cid
        and c.status = 'active'
        and d between c.start_date and c.end_date
        and d <= current_date + 1
    );
$$;

-- ───────────────────────── Tetikleyiciler ─────────────────────────

-- Yeni kullanıcı → profil satırı (çakışan davet kodunda yeniden dener).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  attempts int := 0;
begin
  loop
    begin
      insert into public.profiles (id, display_name)
      values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 40), ''));
      exit;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 5 then raise; end if;
    end;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Challenge oluşturan otomatik olarak "owner" üye olur.
create or replace function public.handle_new_challenge()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.challenge_members (challenge_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'joined')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_challenge_created
  after insert on public.challenges
  for each row execute function public.handle_new_challenge();

-- ───────────────────────── RPC'ler (istemci bunları çağırır) ─────────────────────────

-- Davet KODU ile arkadaş ekle (kodu paylaşmak = onay; anında arkadaş olunur).
create or replace function public.add_friend_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  other uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select id into other from public.profiles
   where friend_code = upper(trim(p_code)) and deleted_at is null;
  if other is null then raise exception 'code_not_found'; end if;
  if other = me then raise exception 'cannot_add_self'; end if;
  if public.is_blocked(me, other) then raise exception 'code_not_found'; end if;
  if public.is_friend(me, other) then return other; end if;
  insert into public.friendships (requester_id, addressee_id, status)
  values (me, other, 'accepted')
  on conflict do nothing;
  insert into public.notifications_inbox (user_id, type, payload)
  values (other, 'friend_added', jsonb_build_object('user_id', me));
  return other;
end;
$$;

-- Kod ile challenge'a katıl.
create or replace function public.join_challenge_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  ch public.challenges%rowtype;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into ch from public.challenges
   where join_code = upper(trim(p_code)) and status = 'active';
  if not found then raise exception 'code_not_found'; end if;
  if public.is_blocked(me, ch.owner_id) then raise exception 'code_not_found'; end if;
  if ch.end_date < current_date - 1 then raise exception 'challenge_ended'; end if;
  if public.is_challenge_member(ch.id, me) then return ch.id; end if;
  if (select count(*) from public.challenge_members m
       where m.challenge_id = ch.id and m.status = 'joined') >= 50 then
    raise exception 'challenge_full';
  end if;
  insert into public.challenge_members (challenge_id, user_id, role, status)
  values (ch.id, me, 'member', 'joined')
  on conflict (challenge_id, user_id) do update set status = 'joined';
  insert into public.notifications_inbox (user_id, type, payload)
  values (ch.owner_id, 'challenge_joined', jsonb_build_object('user_id', me, 'challenge_id', ch.id));
  return ch.id;
end;
$$;

-- Challenge'dan ayrıl (sahibi ayrılamaz; iptal eder).
create or replace function public.leave_challenge(p_challenge uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.challenge_members
     set status = 'left'
   where challenge_id = p_challenge and user_id = auth.uid() and role <> 'owner';
end;
$$;

-- App Store 5.1.1(v): hesabı ve tüm verisini uygulama içinden sil (cascade).
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.add_friend_by_code(text) from public, anon;
revoke all on function public.join_challenge_by_code(text) from public, anon;
revoke all on function public.leave_challenge(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.add_friend_by_code(text) to authenticated;
grant execute on function public.join_challenge_by_code(text) to authenticated;
grant execute on function public.leave_challenge(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ───────────────────────── Yetkiler + Row Level Security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.tasks enable row level security;
alter table public.task_logs enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_tasks enable row level security;
alter table public.challenge_members enable row level security;
alter table public.challenge_logs enable row level security;
alter table public.challenge_reactions enable row level security;
alter table public.notifications_inbox enable row level security;

-- Anonim (giriş yapmamış) kullanıcı hiçbir tabloya erişemez.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.profiles to authenticated;
grant update (username, display_name, avatar_url, timezone) on public.profiles to authenticated;
grant select, delete on public.friendships to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert on public.reports to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_logs to authenticated;
grant select, insert, delete on public.challenges to authenticated;
grant update (title, description, status) on public.challenges to authenticated;
grant select, insert, delete on public.challenge_tasks to authenticated;
grant select on public.challenge_members to authenticated;
grant select, insert, update, delete on public.challenge_logs to authenticated;
grant select, insert, delete on public.challenge_reactions to authenticated;
grant select on public.notifications_inbox to authenticated;
grant update (read_at) on public.notifications_inbox to authenticated;

-- profiles: kendim + arkadaşlarım + aynı challenge'daki kişiler (engel yoksa).
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (
      not public.is_blocked(auth.uid(), id)
      and (public.is_friend(auth.uid(), id) or public.shares_challenge(auth.uid(), id))
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- friendships: yalnız taraflar görür/siler. Ekleme sadece add_friend_by_code RPC'siyle.
create policy friendships_select on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friendships_delete on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy blocks_select on public.blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy blocks_insert on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid());
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- tasks: sahibi her şeyi yapar; arkadaşlar yalnız privacy='friends' görevleri görür.
create policy tasks_owner_all on public.tasks for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy tasks_friends_select on public.tasks for select to authenticated
  using (
    privacy = 'friends'
    and public.is_friend(auth.uid(), owner_id)
    and not public.is_blocked(auth.uid(), owner_id)
  );

create policy task_logs_owner_all on public.task_logs for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_logs.task_id and t.owner_id = auth.uid())
  );
create policy task_logs_friends_select on public.task_logs for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_logs.task_id
        and t.privacy = 'friends'
        and public.is_friend(auth.uid(), t.owner_id)
        and not public.is_blocked(auth.uid(), t.owner_id)
    )
  );

-- challenges: sahibi + katılmış üyeler görür. (Kod ile katılım RPC'den.)
create policy challenges_select on public.challenges for select to authenticated
  using (owner_id = auth.uid() or public.is_challenge_member(id, auth.uid()));
create policy challenges_insert on public.challenges for insert to authenticated
  with check (owner_id = auth.uid());
create policy challenges_update on public.challenges for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy challenges_delete on public.challenges for delete to authenticated
  using (owner_id = auth.uid());

create policy challenge_tasks_select on public.challenge_tasks for select to authenticated
  using (public.is_challenge_member(challenge_id, auth.uid()));
create policy challenge_tasks_insert on public.challenge_tasks for insert to authenticated
  with check (public.is_challenge_owner(challenge_id, auth.uid()));
create policy challenge_tasks_delete on public.challenge_tasks for delete to authenticated
  using (public.is_challenge_owner(challenge_id, auth.uid()));

-- challenge_members: üyeler birbirini görür (ayrılan kendi satırını görmeye devam eder).
create policy challenge_members_select on public.challenge_members for select to authenticated
  using (user_id = auth.uid() or public.is_challenge_member(challenge_id, auth.uid()));

-- challenge_logs: üyeler okur; herkes YALNIZ kendi satırını, challenge tarihleri içinde yazar.
create policy challenge_logs_select on public.challenge_logs for select to authenticated
  using (public.is_challenge_member(challenge_id, auth.uid()));
create policy challenge_logs_insert on public.challenge_logs for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.challenge_log_allowed(challenge_id, challenge_task_id, date, auth.uid())
  );
create policy challenge_logs_update on public.challenge_logs for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.challenge_log_allowed(challenge_id, challenge_task_id, date, auth.uid())
  );
create policy challenge_logs_delete on public.challenge_logs for delete to authenticated
  using (user_id = auth.uid());

create policy challenge_reactions_select on public.challenge_reactions for select to authenticated
  using (public.is_challenge_member(challenge_id, auth.uid()));
create policy challenge_reactions_insert on public.challenge_reactions for insert to authenticated
  with check (
    from_user = auth.uid()
    and public.is_challenge_member(challenge_id, auth.uid())
    and public.is_challenge_member(challenge_id, to_user)
    and not public.is_blocked(auth.uid(), to_user)
  );
create policy challenge_reactions_delete on public.challenge_reactions for delete to authenticated
  using (from_user = auth.uid());

create policy inbox_select on public.notifications_inbox for select to authenticated
  using (user_id = auth.uid());
create policy inbox_update on public.notifications_inbox for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────── Görünüm: challenge üye özeti ─────────────────────────
-- security_invoker → görünüm, sorgulayan kullanıcının RLS'iyle çalışır.
create view public.challenge_member_stats
with (security_invoker = true) as
select
  m.challenge_id,
  m.user_id,
  p.display_name,
  m.role,
  m.joined_at,
  count(l.*) filter (where l.status = 'done') as completions,
  max(l.date) filter (where l.status in ('done', 'partial')) as last_checkin
from public.challenge_members m
join public.profiles p on p.id = m.user_id
left join public.challenge_logs l on l.challenge_id = m.challenge_id and l.user_id = m.user_id
where m.status = 'joined'
group by m.challenge_id, m.user_id, p.display_name, m.role, m.joined_at;

grant select on public.challenge_member_stats to authenticated;

-- ───────────────────────── Realtime ─────────────────────────
-- Challenge ekranı canlı güncellensin (Supabase'de `supabase_realtime` yayını hazır gelir).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.challenge_logs;
    alter publication supabase_realtime add table public.challenge_reactions;
    alter publication supabase_realtime add table public.challenge_members;
  end if;
end;
$$;
