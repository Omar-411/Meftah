import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}

export function StatCard({ icon, label, value, hint, href }: StatCardProps) {
  const body = (
    <div className="h-full rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon name={icon} className="text-[20px] text-primary" />
        <span className="font-label-md text-label-md">{label}</span>
      </div>
      <p className="mt-space-sm font-currency-display text-[28px] font-bold leading-none text-on-surface">{value}</p>
      {hint && <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
