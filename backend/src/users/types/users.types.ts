import { AvatarType } from '@prisma/client';

/** Avatar view shared by profile and avatar responses. */
export interface AvatarView {
  type: AvatarType;
  imageUrl: string;
}

/**
 * The authenticated user's own profile (docs/04-api/users.md §9, decision
 * D16): identity plus the private email, its avatar, and the registration
 * date. No settings, role, or internal ids.
 */
export interface MyProfile {
  username: string;
  displayName: string;
  email: string;
  bio: string | null;
  avatar: AvatarView;
  registrationDate: string;
}

/**
 * A user's public profile (docs/04-api/users.md §12, decision D15): public
 * identity plus the public progress subset. Nothing private.
 */
export interface PublicProfile {
  username: string;
  displayName: string;
  bio: string | null;
  avatar: AvatarView;
  registrationDate: string;
  currentLevel: number;
  totalXP: number;
  completedQuizzes: number;
  averageAccuracy: string;
}
