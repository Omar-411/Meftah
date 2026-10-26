import type { Profile } from "@/application/account/profile";
import { ROLE_LABELS } from "@/domain/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function ProfileHeader({ profile, avatarUrl }: { profile: Profile; avatarUrl?: string }) {
  return (
    <div className="flex items-center gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <Avatar name={profile.fullName} url={avatarUrl || undefined} size={72} />
      <div className="min-w-0">
        <p className="truncate font-display text-[22px] font-semibold text-on-surface">{profile.fullName}</p>
        <p className="truncate font-body-md text-body-md text-on-surface-variant">{profile.jobTitle ?? profile.email}</p>
        <div className="mt-1">
          <Badge tone="info">{ROLE_LABELS[profile.role]}</Badge>
        </div>
      </div>
    </div>
  );
}
