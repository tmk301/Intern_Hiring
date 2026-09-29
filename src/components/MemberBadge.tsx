import React from "react";
import { Crown, Sparkles } from "lucide-react";
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
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold tracking-wide uppercase rounded-full shadow-sm select-none transition-all duration-300",
        "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-105",
        "border border-amber-300/60 ring-1 ring-amber-400/30",
        sizeClasses[size],
        className
      )}
      title="Thành viên chính thức (Official Member)"
    >
      <Crown className={cn("fill-current", iconSizes[size])} />
      {showText && <span>Member</span>}
      <Sparkles className={cn("opacity-80", iconSizes[size])} />
    </span>
  );
};

export default MemberBadge;

export const isUserMember = (user?: any): boolean => {
  if (!user) return false;
  return Boolean(user.isMember || user.member);
};
