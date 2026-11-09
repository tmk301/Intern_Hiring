import React from "react";
import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface MemberBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const MemberBadge: React.FC<MemberBadgeProps> = ({
  className,
  size = "md",
  showText = true,
}) => {
  const { t } = useTranslation();
  const sizeClasses = {
    sm: "h-5 gap-1 px-1.5 text-[10px]",
    md: "h-6 gap-1.5 px-2 text-[11px]",
    lg: "h-7 gap-1.5 px-2.5 text-xs",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center whitespace-nowrap rounded-md border border-primary/20 bg-primary/5 align-middle font-semibold leading-none text-primary-dark",
        "dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
        sizeClasses[size],
        className,
      )}
      title={t("nav.memberBadgeLabel")}
      role={showText ? undefined : "img"}
      aria-label={showText ? undefined : t("nav.memberBadgeLabel")}
    >
      <Crown
        className={cn(
          "shrink-0 text-amber-700 dark:text-amber-300",
          iconSizes[size],
        )}
        strokeWidth={1.8}
        aria-hidden="true"
      />
      {showText && <span>Member</span>}
    </span>
  );
};

export default MemberBadge;
