import { formatAmount } from "@/domain/shared/format";
import { cn } from "@/lib/cn";

interface AmountProps {
  value: number;
  unit?: string;
  className?: string;
  unitClassName?: string;
}

/** Bold figure + lighter currency marker, per DESIGN.md ("1 250 000 DT"). */
export function Amount({ value, unit = "TND", className, unitClassName }: AmountProps) {
  return (
    <span className={cn("font-currency-display text-currency-display", className)}>
      {formatAmount(value)}{" "}
      <span className={cn("font-label-sm text-label-sm font-normal text-on-surface-variant", unitClassName)}>
        {unit}
      </span>
    </span>
  );
}
