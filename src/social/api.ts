/**
 * Supabase API katmanı. Tüm fonksiyonlar `socialEnabled` açıkken çağrılmalıdır.
 * Şema: supabase/migrations/0001_init.sql (RLS orada; istemci yalnız izinli satırları görür).
 */
import type { LogStatus, Task, TaskLog } from '@/domain/types';

import { requireSupabase } from './client';
import type {
  Challenge,
  ChallengeDetail,
  ChallengeLog,
  ChallengeMember,
  ChallengeReaction,
  ChallengeTask,
  Profile,
} from './types';

/** Sunucu hata kodlarını (RPC `raise exception`) i18n anahtarına çevirmek için sade hata. */
export class SocialError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

const KNOWN = ['code_not_found', 'cannot_add_self', 'challenge_ended', 'challenge_full', 'not_authenticated'];

function fail(error: { message?: string; code?: string } | null): never {
  const msg = error?.message ?? 'unknown';
  const known = KNOWN.find((k) => msg.includes(k));
  if (known) throw new SocialError(known);
  if (/network|fetch/i.test(msg)) throw new SocialError('network');
  if (/rate limit|too many/i.test(msg)) throw new SocialError('rate_limit');
  if (/expired|invalid/i.test(msg) && /token|otp/i.test(msg)) throw new SocialError('bad_code');
  throw new SocialError(msg);
}

// ───────────── Auth (e-posta + 6 haneli kod) ─────────────

export async function sendLoginCode(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) fail(error);
}

export async function verifyLoginCode(email: string, code: string): Promise<void> {
  const { error } = await requireSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  });
  if (error) fail(error);
}

export async function signOut(): Promise<void> {
  await requireSupabase().auth.signOut();
}

export async function deleteAccount(): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('delete_my_account');
  if (error) fail(error);
  await sb.auth.signOut();
}

// ───────────── Profil & arkadaşlar ─────────────

interface ProfileRow {
  id: string;
  display_name: string;
  friend_code?: string | null;
}

const toProfile = (r: ProfileRow): Profile => ({ id: r.id, displayName: r.display_name || '—', friendCode: r.friend_code ?? null });

export async function getMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, display_name, friend_code')
    .eq('id', userId)
    .single();
  if (error) fail(error);
  return toProfile(data as ProfileRow);
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('profiles')
    .update({ display_name: displayName.trim().slice(0, 40) })
    .eq('id', userId);
  if (error) fail(error);
}

export async function listFriends(userId: string): Promise<Profile[]> {
  const sb = requireSupabase();
  const { data: fr, error } = await sb.from('friendships').select('requester_id, addressee_id').eq('status', 'accepted');
  if (error) fail(error);
  const ids = (fr ?? []).map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id) as string);
  if (ids.length === 0) return [];
  const { data, error: e2 } = await sb.from('profiles').select('id, display_name').in('id', ids);
  if (e2) fail(e2);
  return ((data ?? []) as ProfileRow[]).map(toProfile).sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
}

export async function addFriendByCode(code: string): Promise<void> {
  const { error } = await requireSupabase().rpc('add_friend_by_code', { p_code: code });
  if (error) fail(error);
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('friendships')
    .delete()
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`);
  if (error) fail(error);
}

/** Engelle: arkadaşlığı da siler; engellenen kişi profilini/görevlerini göremez. */
export async function blockUser(userId: string, otherId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('blocks').upsert({ blocker_id: userId, blocked_id: otherId }, { ignoreDuplicates: true });
  if (error) fail(error);
  await removeFriend(userId, otherId);
}

export async function reportTarget(userId: string, targetType: 'user' | 'challenge', targetId: string, reason: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('reports')
    .insert({ reporter_id: userId, target_type: targetType, target_id: targetId, reason: reason.slice(0, 500) });
  if (error) fail(error);
}

// ───────────── Challenge ─────────────

interface ChallengeRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  join_code: string;
  status: 'active' | 'cancelled';
}
interface ChallengeTaskRow {
  id: string;
  challenge_id: string;
  title: string;
  icon: string;
  color: string;
  category: string;
  kind: 'boolean' | 'count';
  target_value: number | string;
  unit: string;
  recurrence_type: ChallengeTask['recurrenceType'];
  recurrence_days: number[];
  period_target_n: number;
  weight: number;
}

const CH_COLS = 'id, owner_id, title, description, start_date, end_date, join_code, status';
const CT_COLS = 'id, challenge_id, title, icon, color, category, kind, target_value, unit, recurrence_type, recurrence_days, period_target_n, weight';

const toChallenge = (r: ChallengeRow): Challenge => ({
  id: r.id,
  ownerId: r.owner_id,
  title: r.title,
  description: r.description,
  startDate: r.start_date,
  endDate: r.end_date,
  joinCode: r.join_code,
  status: r.status,
});

const toChallengeTask = (r: ChallengeTaskRow): ChallengeTask => ({
  id: r.id,
  challengeId: r.challenge_id,
  title: r.title,
  icon: r.icon,
  color: r.color,
  category: r.category,
  kind: r.kind,
  targetValue: Number(r.target_value),
  unit: r.unit,
  recurrenceType: r.recurrence_type,
  recurrenceDays: r.recurrence_days ?? [],
  periodTargetN: r.period_target_n,
  weight: r.weight,
});

export interface NewChallengeInput {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

/** Bir görevi paylaşarak challenge başlat: görev şablon olarak challenge'a kopyalanır. */
export async function createChallengeFromTask(userId: string, task: Task, input: NewChallengeInput): Promise<{ challenge: Challenge; task: ChallengeTask }> {
  const sb = requireSupabase();
  const { data: ch, error } = await sb
    .from('challenges')
    .insert({
      owner_id: userId,
      title: input.title.trim().slice(0, 60),
      description: input.description.trim().slice(0, 300),
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select(CH_COLS)
    .single();
  if (error) fail(error);
  const challenge = toChallenge(ch as ChallengeRow);
  const { data: ct, error: e2 } = await sb
    .from('challenge_tasks')
    .insert({
      challenge_id: challenge.id,
      title: task.title,
      icon: task.icon,
      color: task.color,
      category: task.category,
      kind: task.kind,
      target_value: task.targetValue,
      unit: task.unit,
      recurrence_type: task.recurrenceType,
      recurrence_days: task.recurrenceDays,
      period_target_n: task.periodTargetN,
      weight: task.weight,
    })
    .select(CT_COLS)
    .single();
  if (e2) {
    // Yarım kalmasın: görev eklenemediyse challenge'ı geri al.
    await sb.from('challenges').delete().eq('id', challenge.id);
    fail(e2);
  }
  return { challenge, task: toChallengeTask(ct as ChallengeTaskRow) };
}

export async function joinChallengeByCode(code: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('join_challenge_by_code', { p_code: code });
  if (error) fail(error);
  return data as string;
}

export async function leaveChallenge(challengeId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('leave_challenge', { p_challenge: challengeId });
  if (error) fail(error);
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await requireSupabase().from('challenges').delete().eq('id', challengeId);
  if (error) fail(error);
}

export async function listMyChallenges(): Promise<Challenge[]> {
  // RLS zaten yalnız üyesi/sahibi olduklarımı döndürür.
  const { data, error } = await requireSupabase().from('challenges').select(CH_COLS).eq('status', 'active').order('end_date', { ascending: false });
  if (error) fail(error);
  return ((data ?? []) as ChallengeRow[]).map(toChallenge);
}

export async function getChallengeDetail(challengeId: string): Promise<ChallengeDetail> {
  const sb = requireSupabase();
  const [ch, tasks, members, logs, reactions] = await Promise.all([
    sb.from('challenges').select(CH_COLS).eq('id', challengeId).single(),
    sb.from('challenge_tasks').select(CT_COLS).eq('challenge_id', challengeId).order('created_at'),
    sb.from('challenge_member_stats').select('user_id, display_name, role').eq('challenge_id', challengeId),
    sb.from('challenge_logs').select('challenge_task_id, user_id, date, value, status').eq('challenge_id', challengeId),
    sb.from('challenge_reactions').select('id, from_user, to_user, date, emoji').eq('challenge_id', challengeId),
  ]);
  for (const r of [ch, tasks, members, logs, reactions]) if (r.error) fail(r.error);
  return {
    challenge: toChallenge(ch.data as ChallengeRow),
    tasks: ((tasks.data ?? []) as ChallengeTaskRow[]).map(toChallengeTask),
    members: (members.data ?? []).map(
      (m): ChallengeMember => ({ userId: m.user_id as string, displayName: (m.display_name as string) || '—', role: m.role as ChallengeMember['role'] })
    ),
    logs: (logs.data ?? []).map(
      (l): ChallengeLog => ({
        challengeTaskId: l.challenge_task_id as string,
        userId: l.user_id as string,
        date: l.date as string,
        value: Number(l.value),
        status: l.status as LogStatus,
      })
    ),
    reactions: (reactions.data ?? []).map(
      (r): ChallengeReaction => ({ id: r.id as string, fromUser: r.from_user as string, toUser: r.to_user as string, date: r.date as string, emoji: r.emoji as string })
    ),
  };
}

/** Yerel check-in'leri challenge'a yaz (upsert). Tarih aralığı dışındakileri sunucu reddeder → önce süz. */
export async function pushChallengeLogs(
  userId: string,
  challenge: Pick<Challenge, 'id' | 'startDate' | 'endDate'>,
  challengeTaskId: string,
  logs: TaskLog[]
): Promise<void> {
  const rows = logs
    .filter((l) => l.date >= challenge.startDate && l.date <= challenge.endDate)
    .map((l) => ({
      challenge_id: challenge.id,
      challenge_task_id: challengeTaskId,
      user_id: userId,
      date: l.date,
      value: l.value,
      status: l.status,
      updated_at: l.updatedAt || new Date().toISOString(),
    }));
  if (rows.length === 0) return;
  const { error } = await requireSupabase().from('challenge_logs').upsert(rows, { onConflict: 'challenge_task_id,user_id,date' });
  if (error) fail(error);
}

export async function deleteChallengeLog(userId: string, challengeTaskId: string, date: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('challenge_logs')
    .delete()
    .eq('challenge_task_id', challengeTaskId)
    .eq('user_id', userId)
    .eq('date', date);
  if (error) fail(error);
}

export async function sendReaction(userId: string, challengeId: string, toUser: string, date: string, emoji: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('challenge_reactions')
    .upsert(
      { challenge_id: challengeId, from_user: userId, to_user: toUser, date, emoji },
      { onConflict: 'challenge_id,from_user,to_user,date,emoji', ignoreDuplicates: true }
    );
  if (error) fail(error);
}

/** Challenge detayını canlı dinle (check-in / tepki / üye değişince `onChange`). Dönen fonksiyon aboneliği kapatır. */
export function subscribeChallenge(challengeId: string, onChange: () => void): () => void {
  const sb = requireSupabase();
  const channel = sb.channel(`challenge-${challengeId}`);
  for (const table of ['challenge_logs', 'challenge_reactions', 'challenge_members']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `challenge_id=eq.${challengeId}` }, onChange);
  }
  channel.subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}
