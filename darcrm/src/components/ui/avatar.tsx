import Image from "next/image";
import { initialsOf } from "@/domain/agent/agent";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  url?: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, url, size = 32, className }: AvatarProps) {
  if (url) {
    return <Image src={url} alt={name} width={size} height={size} style={{ width: size, height: size }} className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span
      aria-label={name}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-primary-container font-semibold text-on-primary", className)}
    >
      {initialsOf(name)}
    </span>
  );
}
