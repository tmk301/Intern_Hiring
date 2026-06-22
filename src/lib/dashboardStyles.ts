import { USER_ROLES } from "@/lib/roles";

export const normalizeRoleName = (role?: string | null) => role?.trim().toUpperCase() || "";

export const normalizeReviewStatus = (status?: string | null) => status?.trim().toUpperCase() || "PENDING";

export const getRoleBadgeClassName = (role?: string | null) => {
  switch (normalizeRoleName(role)) {
    case USER_ROLES.ADMIN:
      return "border-red-200 bg-red-50 text-red-700";
    case USER_ROLES.MODERATOR:
      return "border-violet-200 bg-violet-50 text-violet-700";
    case USER_ROLES.RECRUITER:
      return "border-blue-200 bg-blue-50 text-blue-700";
    case USER_ROLES.CANDIDATE:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

export const getRoleBadgeDarkClassName = (role?: string | null) => {
  switch (normalizeRoleName(role)) {
    case USER_ROLES.ADMIN:
      return "border-red-200 bg-white text-red-700 shadow-sm";
    case USER_ROLES.MODERATOR:
      return "border-violet-200 bg-white text-violet-700 shadow-sm";
    case USER_ROLES.RECRUITER:
      return "border-blue-200 bg-white text-blue-700 shadow-sm";
    case USER_ROLES.CANDIDATE:
      return "border-emerald-200 bg-white text-emerald-700 shadow-sm";
    default:
      return "border-slate-200 bg-white text-slate-700 shadow-sm";
  }
};

export const getReviewStatusBadgeClassName = (status?: string | null) => {
  switch (normalizeReviewStatus(status)) {
    case "ACCEPTED":
    case "APPROVED":
      return "whitespace-nowrap border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "whitespace-nowrap border-red-200 bg-red-50 text-red-700";
    case "REVOKED":
      return "whitespace-nowrap border-amber-200 bg-amber-50 text-amber-700";
    case "REVIEWED":
    case "PENDING":
      return "whitespace-nowrap border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "whitespace-nowrap border-slate-200 bg-slate-50 text-slate-700";
  }
};

export const getReviewStatusTranslationKey = (status?: string | null) => {
  switch (normalizeReviewStatus(status)) {
    case "ACCEPTED":
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "REVOKED":
      return "REVOKED";
    case "REVIEWED":
    case "PENDING":
    default:
      return "PENDING";
  }
};
