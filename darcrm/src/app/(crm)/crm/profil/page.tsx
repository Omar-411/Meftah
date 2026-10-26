import type { Metadata } from "next";
import { getMyProfile } from "@/application/account/profile";
import { getDeps } from "@/infrastructure/container";
import { PageHeader } from "@/components/crm/page-header";
import { ProfileHeader } from "@/components/account/profile-header";
import { PasswordForm, ProfileInfoForm } from "@/components/account/profile-forms";
import { loadOrRedirect, requireStaffPage } from "../_lib/guard";

export const metadata: Metadata = { title: "Mon profil" };

export default async function StaffProfilePage() {
  const session = await requireStaffPage("/crm/profil");
  const deps = getDeps();
  const [profile, agent] = await loadOrRedirect(() => Promise.all([getMyProfile(deps, session), deps.agents.findById(session.userId)]));

  return (
    <>
      <PageHeader title="Mon profil" subtitle="Vos coordonnées affichées sur vos annonces, et votre mot de passe." />
      <div className="max-w-2xl space-y-space-md">
        <ProfileHeader profile={profile} avatarUrl={agent?.avatarUrl} />
        <ProfileInfoForm profile={profile} />
        <PasswordForm />
      </div>
    </>
  );
}
