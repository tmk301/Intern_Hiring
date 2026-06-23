import type { MouseEvent } from "react";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { candidateApi, type PublicJobPost } from "@/lib/api";
import { isCandidateRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type FavoriteJobButtonProps = {
  jobId: string | number;
  isFavorited: boolean;
  onFavoriteChange: (job: PublicJobPost, isFavorited: boolean) => void;
  className?: string;
};

export const FavoriteJobButton = ({
  jobId,
  isFavorited,
  onFavoriteChange,
  className,
}: FavoriteJobButtonProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  if (isAuthenticated && !isCandidateRole(user?.role)) {
    return null;
  }

  const toggleFavorite = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!token || !isCandidateRole(user?.role)) {
      toast.error(t("jobs.favorite.loginRequired"));
      navigate("/login");
      return;
    }

    try {
      const updatedJob = isFavorited
        ? await candidateApi.removeFavoriteJob(token, jobId)
        : await candidateApi.addFavoriteJob(token, jobId);
      onFavoriteChange(updatedJob, !isFavorited);
      toast.success(t(isFavorited ? "jobs.favorite.removed" : "jobs.favorite.added"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("jobs.favorite.error"));
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "h-9 w-9 rounded-full bg-white/95 text-slate-600 shadow-sm hover:text-rose-600",
        isFavorited && "border-rose-200 bg-rose-50 text-rose-600",
        className,
      )}
      aria-label={t(isFavorited ? "jobs.favorite.removeAria" : "jobs.favorite.addAria")}
      aria-pressed={isFavorited}
      onClick={toggleFavorite}
    >
      <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
    </Button>
  );
};
