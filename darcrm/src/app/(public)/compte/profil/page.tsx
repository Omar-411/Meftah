import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/application/account/profile";
import { isStaff } from "@/domain/auth/session";
import { getDeps } from "@/infrastructure/container";
import { readSession } from "@/infrastructure/session";
import { ProfileHeader } from "@/components/account/profile-header";
import { PasswordForm, ProfileInfoForm } from "@/components/account/profile-forms";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Mon profil · DarCRM" };

export default async function VisitorProfilePage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/compte/profil");
  if (isStaff(session)) redirect("/crm/profil");
  const profile = await getMyProfile(getDeps(), session);

  return (
    <div className="mx-auto max-w-2xl px-space-md py-space-lg">
      <Link href="/compte" className="mb-space-md inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary">
        <Icon name="arrow_back" className="text-[18px]" />
        Mon compte
      </Link>
      <h1 className="mb-space-md font-display text-[28px] font-semibold text-on-surface">Mon profil</h1>
      <div className="space-y-space-md">
        <ProfileHeader profile={profile} />
        <ProfileInfoForm profile={profile} />
        <PasswordForm />
      </div>
    </div>
  );
}
