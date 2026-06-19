import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ActionIconVariant =
  | "view"
  | "show"
  | "hide"
  | "approve"
  | "reject"
  | "delete"
  | "restore"
  | "warning";

const actionIconClassNames: Record<ActionIconVariant, string> = {
  view: "border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800",
  show: "border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-800",
  hide: "border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-800",
  approve: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
  reject: "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800",
  delete: "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800",
  restore: "border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800",
  warning: "border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800",
};

type ActionIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon;
  label: string;
  variantStyle: ActionIconVariant;
};

export function ActionIconButton({
  icon: Icon,
  label,
  variantStyle,
  className,
  type = "button",
  ...buttonProps
}: ActionIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type={type}
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-lg bg-white shadow-none",
            actionIconClassNames[variantStyle],
            className,
          )}
          aria-label={label}
          {...buttonProps}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
