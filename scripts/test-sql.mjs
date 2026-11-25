/**
 * Supabase şemasını + RLS politikalarını GERÇEK bir Postgres motorunda (PGlite, bellek içi) dener.
 * Supabase'e özgü kısımlar (auth şeması, roller, auth.uid()) aşağıda taklit edilir.
 * Çalıştır: npm run test:sql
 */
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'supabase', 'migrations');
const db = new PGlite();
let failed = 0;
let passed = 0;

const U = {
  ali: '00000000-0000-0000-0000-00000000000a',
  berk: '00000000-0000-0000-0000-00000000000b',
  cem: '00000000-0000-0000-0000-00000000000c',
  deniz: '00000000-0000-0000-0000-00000000000d',
};

async function asUser(uid, fn) {
  await db.exec('begin');
  try {
    await db.exec(`set local role authenticated; select set_config('request.jwt.claim.sub', '${uid ?? ''}', true);`);
    const r = await fn();
    await db.exec('commit');
    return r;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}
const q = (uid, sql, params) => asUser(uid, () => db.query(sql, params)).then((r) => r.rows);

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function eq(actual, expected, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`);
  }
}
async function rejects(promise, pattern, msg = '') {
  try {
    await promise;
  } catch (e) {
    if (pattern && !pattern.test(e.message)) throw new Error(`${msg} yanlış hata: ${e.message}`);
    return;
  }
  throw new Error(`${msg} reddedilmeliydi ama geçti`);
}

// ── Supabase ortam taklidi ──
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Supabase varsayılanı: public'te yeni tablolar anon/authenticated'a açık gelir (RLS korur).
  alter default privileges in schema public grant all on tables to anon, authenticated;
  create publication supabase_realtime;
`);

console.log('Migration dosyaları:');
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  try {
    await db.exec(readFileSync(join(dir, f), 'utf8'));
    console.log(`  ✓ ${f} uygulandı`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${f}: ${e.message}`);
    process.exit(1);
  }
}

console.log('Senaryolar:');
for (const [name, id] of Object.entries(U)) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    `${name}@example.com`,
    JSON.stringify({ display_name: name }),
  ]);
}
const codes = Object.fromEntries(
  (await db.query('select id, friend_code from public.profiles')).rows.map((r) => [r.id, r.friend_code])
);
let challengeId;
let taskId;
let joinCode;
const today = (await db.query(`select current_date::text as d`)).rows[0].d;

await test('kayıt tetikleyicisi her kullanıcıya profil + 8 haneli kod üretir', async () => {
  const rows = (await db.query('select display_name, friend_code from public.profiles order by display_name')).rows;
  eq(rows.map((r) => r.display_name), ['ali', 'berk', 'cem', 'deniz']);
  if (!rows.every((r) => /^[A-HJ-NP-Z2-9]{8}$/.test(r.friend_code))) throw new Error('kod biçimi hatalı');
});

await test('RLS: kullanıcı başlangıçta yalnız kendi profilini görür', async () => {
  eq((await q(U.ali, 'select display_name from public.profiles')).map((r) => r.display_name), ['ali']);
});

await test('giriş yapmamış istek (auth.uid() boş) hiçbir profil göremez; anon rolü tabloya erişemez', async () => {
  eq(await q(null, 'select * from public.profiles'), []);
  await db.exec('begin; set local role anon;');
  await rejects(db.query('select * from public.profiles'), /permission denied/);
  await db.exec('rollback');
});

await test('doğrudan friendships INSERT yasak (yalnız RPC)', async () => {
  await rejects(
    q(U.ali, `insert into public.friendships (requester_id, addressee_id) values ($1, $2)`, [U.ali, U.berk]),
    /permission denied/
  );
});

await test('davet koduyla arkadaş ekleme (küçük harf/boşluk toleranslı), iki taraf birbirini görür', async () => {
  const r = await q(U.ali, 'select public.add_friend_by_code($1) as id', [`  ${codes[U.berk].toLowerCase()} `]);
  eq(r[0].id, U.berk);
  eq((await q(U.ali, 'select display_name from public.profiles order by 1')).map((x) => x.display_name), ['ali', 'berk']);
  eq((await q(U.berk, 'select display_name from public.profiles order by 1')).map((x) => x.display_name), ['ali', 'berk']);
  eq((await q(U.cem, 'select display_name from public.profiles')).map((x) => x.display_name), ['cem']);
});

await test('aynı kod iki kez / ters yönde eklenince tek arkadaşlık kalır', async () => {
  await q(U.ali, 'select public.add_friend_by_code($1)', [codes[U.berk]]);
  await q(U.berk, 'select public.add_friend_by_code($1)', [codes[U.ali]]);
  eq((await db.query('select count(*)::int as n from public.friendships')).rows[0].n, 1);
});

await test('kendi kodu ve geçersiz kod reddedilir', async () => {
  await rejects(q(U.ali, 'select public.add_friend_by_code($1)', [codes[U.ali]]), /cannot_add_self/);
  await rejects(q(U.ali, 'select public.add_friend_by_code($1)', ['YOKYOK99']), /code_not_found/);
});

await test('kullanıcı kendi friend_code / başkasının profilini değiştiremez', async () => {
  await rejects(q(U.ali, `update public.profiles set friend_code = 'HACKHACK' where id = $1`, [U.ali]), /permission denied/);
  await q(U.ali, `update public.profiles set display_name = 'x' where id = $1`, [U.berk]);
  eq((await db.query('select display_name from public.profiles where id = $1', [U.berk])).rows[0].display_name, 'berk');
  await q(U.ali, `update public.profiles set display_name = 'Ali D.' where id = $1`, [U.ali]);
  eq((await db.query('select display_name from public.profiles where id = $1', [U.ali])).rows[0].display_name, 'Ali D.');
});

await test('challenge oluşturma: sahibi otomatik üye olur, 6 haneli katılım kodu üretilir', async () => {
  const rows = await q(
    U.ali,
    `insert into public.challenges (owner_id, title, start_date, end_date)
     values ($1, '30 gün su', current_date - 2, current_date + 27) returning id, join_code`,
    [U.ali]
  );
  challengeId = rows[0].id;
  joinCode = rows[0].join_code;
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(joinCode)) throw new Error('kod biçimi');
  const t = await q(
    U.ali,
    `insert into public.challenge_tasks (challenge_id, title, kind, target_value, unit)
     values ($1, 'Su iç', 'count', 8, 'bardak') returning id`,
    [challengeId]
  );
  taskId = t[0].id;
  eq(await q(U.ali, 'select role, status from public.challenge_members where challenge_id = $1', [challengeId]), [
    { role: 'owner', status: 'joined' },
  ]);
});

await test('başkası adına challenge açılamaz', async () => {
  await rejects(
    q(U.berk, `insert into public.challenges (owner_id, title, start_date, end_date) values ($1, 'x', current_date, current_date)`, [U.ali]),
    /row-level security/
  );
});

await test('üye olmayan challenge’ı, görevini, üyelerini göremez', async () => {
  eq(await q(U.berk, 'select id from public.challenges'), []);
  eq(await q(U.berk, 'select id from public.challenge_tasks'), []);
  eq(await q(U.berk, 'select user_id from public.challenge_members'), []);
});

await test('üye olmayan challenge’a görev ekleyemez / check-in yazamaz', async () => {
  await rejects(
    q(U.berk, `insert into public.challenge_tasks (challenge_id, title) values ($1, 'sızma')`, [challengeId]),
    /row-level security/
  );
  await rejects(
    q(U.berk, `insert into public.challenge_logs (challenge_id, challenge_task_id, user_id, date, value, status) values ($1,$2,$3,current_date,8,'done')`, [challengeId, taskId, U.berk]),
    /row-level security/
  );
});

await test('kod ile katılma: berk ve cem katılır, herkes herkesi görür', async () => {
  eq((await q(U.berk, 'select public.join_challenge_by_code($1) as id', [joinCode.toLowerCase()]))[0].id, challengeId);
  await q(U.cem, 'select public.join_challenge_by_code($1)', [joinCode]);
  await q(U.cem, 'select public.join_challenge_by_code($1)', [joinCode]); // tekrar = sorun değil
  eq((await q(U.cem, 'select count(*)::int as n from public.challenge_members where challenge_id = $1', [challengeId]))[0].n, 3);
  eq((await q(U.cem, 'select title from public.challenge_tasks'))[0].title, 'Su iç');
  // cem, ali ile arkadaş değil ama aynı challenge'da → profilini görür
  eq((await q(U.cem, 'select count(*)::int as n from public.profiles'))[0].n, 3);
  await rejects(q(U.deniz, 'select public.join_challenge_by_code($1)', ['ZZZZZZ']), /code_not_found/);
});

await test('üye rolünü yükseltemez / başkasını üye yapamaz (doğrudan yazma kapalı)', async () => {
  await rejects(q(U.berk, `update public.challenge_members set role = 'owner' where user_id = $1`, [U.berk]), /permission denied/);
  await rejects(
    q(U.berk, `insert into public.challenge_members (challenge_id, user_id) values ($1, $2)`, [challengeId, U.deniz]),
    /permission denied/
  );
});

await test('check-in: üye yalnız KENDİ adına ve challenge tarihleri içinde yazar', async () => {
  const ins = `insert into public.challenge_logs (challenge_id, challenge_task_id, user_id, date, value, status) values ($1,$2,$3,$4::date,$5,$6)`;
  await q(U.berk, ins, [challengeId, taskId, U.berk, today, 8, 'done']);
  await q(U.ali, ins, [challengeId, taskId, U.ali, today, 4, 'partial']);
  await rejects(q(U.berk, ins, [challengeId, taskId, U.ali, today, 8, 'done']), /row-level security|duplicate/, 'başkası adına:');
  await rejects(
    q(U.berk, `insert into public.challenge_logs (challenge_id, challenge_task_id, user_id, date, value, status) values ($1,$2,$3,current_date - 10,8,'done')`, [challengeId, taskId, U.berk]),
    /row-level security/,
    'başlangıçtan önce:'
  );
  await rejects(
    q(U.berk, `insert into public.challenge_logs (challenge_id, challenge_task_id, user_id, date, value, status) values ($1,$2,$3,current_date + 5,8,'done')`, [challengeId, taskId, U.berk]),
    /row-level security/,
    'gelecek tarih:'
  );
  eq((await q(U.cem, 'select count(*)::int as n from public.challenge_logs'))[0].n, 2);
  eq(await q(U.deniz, 'select * from public.challenge_logs'), []);
});

await test('upsert (aynı gün güncelleme) çalışır; başkasının kaydı değiştirilemez', async () => {
  await q(
    U.ali,
    `insert into public.challenge_logs (challenge_id, challenge_task_id, user_id, date, value, status) values ($1,$2,$3,$4::date,8,'done')
     on conflict (challenge_task_id, user_id, date) do update set value = excluded.value, status = excluded.status`,
    [challengeId, taskId, U.ali, today]
  );
  await q(U.berk, `update public.challenge_logs set value = 0 where user_id = $1`, [U.ali]);
  eq((await db.query(`select value::int as v from public.challenge_logs where user_id = $1`, [U.ali])).rows[0].v, 8);
});

await test('üye özeti görünümü (challenge_member_stats) RLS ile çalışır', async () => {
  const rows = await q(U.cem, 'select display_name, completions::int as c from public.challenge_member_stats order by display_name');
  eq(rows, [
    { display_name: 'Ali D.', c: 1 },
    { display_name: 'berk', c: 1 },
    { display_name: 'cem', c: 0 },
  ]);
  eq(await q(U.deniz, 'select * from public.challenge_member_stats'), []);
});

await test('tepki: üye → üye; izin verilen emoji; üye olmayan gönderemez', async () => {
  const ins = `insert into public.challenge_reactions (challenge_id, from_user, to_user, date, emoji) values ($1,$2,$3,current_date,$4)`;
  await q(U.cem, ins, [challengeId, U.cem, U.berk, '🔥']);
  await rejects(q(U.cem, ins, [challengeId, U.cem, U.berk, '🔥']), /duplicate/);
  await rejects(q(U.cem, ins, [challengeId, U.cem, U.berk, '💩']), /check constraint/);
  await rejects(q(U.deniz, ins, [challengeId, U.deniz, U.berk, '👏']), /row-level security/);
  await rejects(q(U.cem, ins, [challengeId, U.berk, U.ali, '👏']), /row-level security/, 'başkası adına:');
  eq((await q(U.ali, 'select count(*)::int as n from public.challenge_reactions'))[0].n, 1);
});

await test('engelleme: engellenen profil görünmez, kodla eklenemez', async () => {
  await q(U.deniz, `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [U.deniz, U.ali]);
  await rejects(q(U.ali, 'select public.add_friend_by_code($1)', [codes[U.deniz]]), /code_not_found/);
  await q(U.berk, `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [U.berk, U.ali]);
  eq((await q(U.ali, 'select display_name from public.profiles order by 1')).map((r) => r.display_name), ['Ali D.', 'cem']);
  eq(await q(U.ali, 'select * from public.blocks'), []); // kimin engellediği görünmez
  await q(U.berk, `delete from public.blocks where blocked_id = $1`, [U.ali]);
});

await test('şikayet: yalnız kendi adına eklenir ve yalnız kendi şikayeti görünür', async () => {
  await q(U.cem, `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1,'user',$2,'spam')`, [U.cem, U.ali]);
  await rejects(
    q(U.cem, `insert into public.reports (reporter_id, target_type, target_id) values ($1,'user',$2)`, [U.berk, U.ali]),
    /row-level security/
  );
  eq(await q(U.ali, 'select * from public.reports'), []);
});

await test('kişisel görev yedeği: sahibi yazar; arkadaş yalnız privacy=friends olanı görür', async () => {
  const ins = `insert into public.tasks (id, owner_id, title, start_date, privacy) values ($1,$2,$3,current_date,$4)`;
  await q(U.ali, ins, ['10000000-0000-0000-0000-000000000001', U.ali, 'Gizli', 'private']);
  await q(U.ali, ins, ['10000000-0000-0000-0000-000000000002', U.ali, 'Açık', 'friends']);
  await rejects(q(U.berk, ins, ['10000000-0000-0000-0000-000000000003', U.ali, 'sahte', 'private']), /row-level security/);
  await q(U.ali, `insert into public.task_logs (task_id, user_id, date, value, status) values ('10000000-0000-0000-0000-000000000002',$1,current_date,1,'done')`, [U.ali]);
  eq((await q(U.berk, 'select title from public.tasks')).map((r) => r.title), ['Açık']);
  eq((await q(U.berk, 'select count(*)::int as n from public.task_logs'))[0].n, 1);
  eq(await q(U.cem, 'select title from public.tasks'), []); // cem arkadaş değil
  await rejects(
    q(U.berk, `insert into public.task_logs (task_id, user_id, date, value, status) values ('10000000-0000-0000-0000-000000000002',$1,current_date - 1,1,'done')`, [U.berk]),
    /row-level security/
  );
});

await test('challenge’dan ayrılma: ayrılan artık kayıtları göremez; sahibi ayrılamaz', async () => {
  await q(U.cem, 'select public.leave_challenge($1)', [challengeId]);
  eq(await q(U.cem, 'select * from public.challenge_logs'), []);
  eq((await q(U.cem, 'select status from public.challenge_members'))[0].status, 'left');
  await q(U.ali, 'select public.leave_challenge($1)', [challengeId]);
  eq((await q(U.ali, 'select count(*)::int as n from public.challenge_members where status = $1', ['joined']))[0].n, 2);
});

await test('bildirim kutusu: arkadaş ekleme/katılma kaydı düşer, yalnız sahibi görür', async () => {
  const mine = await q(U.ali, 'select type from public.notifications_inbox order by created_at');
  eq(mine.map((r) => r.type), ['challenge_joined', 'challenge_joined']); // berk + cem (cem'in tekrarı sayılmaz)
  eq((await q(U.berk, 'select type from public.notifications_inbox')).map((r) => r.type), ['friend_added']);
  eq((await q(U.cem, 'select count(*)::int as n from public.notifications_inbox'))[0].n, 0);
});

await test('arkadaşlıktan çıkarma: iki taraf da silebilir', async () => {
  await q(U.berk, `delete from public.friendships where requester_id = $1 or addressee_id = $1`, [U.berk]);
  eq((await db.query('select count(*)::int as n from public.friendships')).rows[0].n, 0);
});

await test('hesap silme: kullanıcı + tüm verisi (cascade) silinir, başkaları etkilenmez', async () => {
  await q(U.berk, 'select public.delete_my_account()');
  eq((await db.query('select count(*)::int as n from auth.users')).rows[0].n, 3);
  eq((await db.query('select count(*)::int as n from public.profiles where id = $1', [U.berk])).rows[0].n, 0);
  eq((await db.query('select count(*)::int as n from public.challenge_logs where user_id = $1', [U.berk])).rows[0].n, 0);
  eq((await db.query('select count(*)::int as n from public.challenge_logs where user_id = $1', [U.ali])).rows[0].n, 1);
  await rejects(q(null, 'select public.delete_my_account()'), /not_authenticated/);
});

await test('sahibi challenge’ı silince görev/üye/kayıt/tepkiler de silinir', async () => {
  await q(U.cem, 'delete from public.challenges where id = $1', [challengeId]); // sahibi değil → etkisiz
  eq((await db.query('select count(*)::int as n from public.challenges')).rows[0].n, 1);
  await q(U.ali, 'delete from public.challenges where id = $1', [challengeId]);
  for (const t of ['challenges', 'challenge_tasks', 'challenge_members', 'challenge_logs', 'challenge_reactions']) {
    eq((await db.query(`select count(*)::int as n from public.${t}`)).rows[0].n, 0, t);
  }
});

console.log(`\nSQL: ${passed} geçti, ${failed} kaldı`);
process.exit(failed ? 1 : 0);
