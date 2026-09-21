import { getPasswordStrength } from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";

type PasswordStrengthMeterProps = {
  password: string;
  className?: string;
};

/**
 * Visual password strength indicator (presentation only).
 */
export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);
  const segments = [0, 1, 2, 3] as const;

  return (
    <div
      className={cn("space-y-1.5", className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={strength.score}
      aria-valuetext={`Password strength: ${strength.label}`}
      aria-live="polite"
    >
      <div className="flex gap-1" aria-hidden="true">
        {segments.map((segment) => (
          <span
            key={segment}
            className={cn(
              "bg-muted h-1.5 flex-1 rounded-full transition-[background-color,transform] duration-200",
              strength.score > segment &&
                (strength.score <= 1
                  ? "bg-destructive"
                  : strength.score === 2
                    ? "bg-amber-500"
                    : "bg-emerald-500"),
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Strength: <span className="text-foreground">{strength.label}</span>
      </p>
    </div>
  );
}
