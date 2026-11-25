import type { LogStatus, RecurrenceType, TaskKind } from '@/domain/types';

export interface Profile {
  id: string;
  displayName: string;
  friendCode: string | null;
}

export interface Challenge {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  joinCode: string;
  status: 'active' | 'cancelled';
}

export interface ChallengeTask {
  id: string;
  challengeId: string;
  title: string;
  icon: string;
  color: string;
  category: string;
  kind: TaskKind;
  targetValue: number;
  unit: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  periodTargetN: number;
  weight: number;
}

export interface ChallengeMember {
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
}

export interface ChallengeLog {
  challengeTaskId: string;
  userId: string;
  date: string;
  value: number;
  status: LogStatus;
}

export interface ChallengeReaction {
  id: string;
  fromUser: string;
  toUser: string;
  date: string;
  emoji: string;
}

export interface ChallengeDetail {
  challenge: Challenge;
  tasks: ChallengeTask[];
  members: ChallengeMember[];
  logs: ChallengeLog[];
  reactions: ChallengeReaction[];
}

export const REACTION_EMOJIS = ['👏', '🔥', '💪', '❤️', '😂'] as const;
