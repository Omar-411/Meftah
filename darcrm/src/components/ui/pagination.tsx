import Link from "next/link";
import { pageCount } from "@/domain/shared/result";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}

export function Pagination({ page, total, pageSize, hrefFor }: PaginationProps) {
  const pages = pageCount({ total, pageSize });
  if (pages <= 1) return null;

  const numbers = Array.from({ length: pages }, (_, index) => index + 1).filter(
    (value) => value === 1 || value === pages || Math.abs(value - page) <= 1,
  );

  const itemClass = "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 font-label-md text-label-md transition-colors";

  return (
    <nav aria-label="Pagination" className="mt-space-xl flex items-center justify-center gap-1">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} aria-label="Page précédente" className={cn(itemClass, "bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low")}>
          <Icon name="chevron_left" className="text-[20px]" />
        </Link>
      )}
      {numbers.map((value, index) => (
        <span key={value} className="flex items-center gap-1">
          {index > 0 && value - (numbers[index - 1] ?? 0) > 1 && <span className="px-1 text-outline">…</span>}
          <Link
            href={hrefFor(value)}
            aria-current={value === page ? "page" : undefined}
            className={cn(itemClass, value === page ? "bg-primary-container text-on-primary" : "bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low")}
          >
            {value}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={hrefFor(page + 1)} aria-label="Page suivante" className={cn(itemClass, "bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low")}>
          <Icon name="chevron_right" className="text-[20px]" />
        </Link>
      )}
    </nav>
  );
}
