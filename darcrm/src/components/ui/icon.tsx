import { cn } from "@/lib/cn";

interface IconProps {
  name: string;
  className?: string;
}

/** Material Symbols glyph. Size it with a `text-[Npx]` class. */
export function Icon({ name, className }: IconProps) {
  return (
    <span aria-hidden="true" className={cn("material-symbols-outlined", className)}>
      {name}
    </span>
  );
}
