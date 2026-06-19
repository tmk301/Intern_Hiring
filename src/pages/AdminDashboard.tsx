import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  ClipboardList,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Image,
  Loader2,
  Mail,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
  UserCog,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { adminApi, isApiError, moderatorApi, recruiterApi, type AdminJobPost, type AdminUser, type AuditAction, type AuditLog, type AuditTargetType, type RecruiterApplication } from "@/lib/api";
import { isAdminRole, USER_ROLES, type UserRole } from "@/lib/roles";
import { CategoryManagementPanel } from "@/components/admin/CategoryManagementPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getReviewStatusBadgeClassName, getRoleBadgeClassName, getRoleBadgeDarkClassName, normalizeRoleName } from "@/lib/dashboardStyles";
import { getSafePage, paginateItems } from "@/lib/pagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  defaultEmailTemplateConfig,
  defaultManagedSiteConfig,
  loadManagedSiteConfig,
  saveManagedSiteConfig,
  type EmailTemplateConfig,
  type ManagedSiteConfig,
} from "@/lib/siteConfig";
import {
  WORK_MODE_OPTIONS,
  JOB_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  getSalaryRangeOption,
  defaultJobFilterOptions
} from "@/components/jobs/jobFilterConfig";
import { supabase } from "@/lib/supabase";

type AdminSection = "users" | "jobs" | "employer-requests" | "categories" | "audit-logs" | "email-format";
type JobStatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type JobHiddenFilter = "ALL" | "HIDDEN" | "VISIBLE" | "TRASH";
type JobDeleteMode = "trash" | "permanent";
type UserSortKey = "email" | "fullName" | "role" | "status";
type JobSortKey = "title" | "company" | "recruiter" | "createdAt" | "deletedAt" | "status" | "hidden";
type SortDirection = "asc" | "desc";
type UserRoleFilter = "ALL" | UserRole;
type UserStatusFilter = "ALL" | "ACTIVE" | "RESTRICTED";

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);


const isTrashedJob = (job: AdminJobPost) => Boolean(job.deletedAt);

const normalizeJobStatus = (status?: string | null) => status?.trim().toUpperCase() || "PENDING";

const formatDate = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
};

const getTimeValue = (value?: string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const getPrimaryCvUrl = (user: AdminUser) => {
  const primaryCv = user.cvList?.find((cv) => cv.isDefault) ?? user.cvList?.[0];
  return primaryCv?.url;
};

const parseJsonValue = (value?: string) => {
  if (!value) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const roleOptions = Object.values(USER_ROLES);
const assignableRoleOptions = roleOptions.filter((role) => role !== USER_ROLES.ADMIN);

const getUserRolePriority = (role?: string | null) => {
  switch (normalizeRoleName(role)) {
    case USER_ROLES.ADMIN:
      return 0;
    case USER_ROLES.MODERATOR:
      return 1;
    case USER_ROLES.RECRUITER:
      return 2;
    case USER_ROLES.CANDIDATE:
      return 3;
    default:
      return 4;
  }
};
const normalizeRequestStatus = (status?: string | null) => status?.trim().toUpperCase();

const isRestrictedUser = (user: AdminUser) =>
  Boolean(
    user.restricted ||
    user.isRestricted ||
    user.status?.toUpperCase() === "RESTRICTED" ||
    user.status?.toUpperCase() === "BLOCKED",
  );

const compareNullable = (first: string | number | null, second: string | number | null, direction: SortDirection) => {
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;

  const compare =
    typeof first === "number" && typeof second === "number"
      ? first - second
      : String(first).localeCompare(String(second), undefined, { sensitivity: "base", numeric: true });

  return direction === "asc" ? compare : -compare;
};

const getAccountStatusBadgeClassName = (restricted: boolean) =>
  restricted
    ? "whitespace-nowrap border-red-200 bg-red-50 text-red-700"
    : "whitespace-nowrap border-emerald-200 bg-emerald-50 text-emerald-700";

const auditActions: AuditAction[] = [
  "USER_ROLE_UPDATED",
  "USER_RESTRICTION_UPDATED",
  "ADMIN_JOB_CREATED",
  "ADMIN_JOB_UPDATED",
  "ADMIN_JOB_TRASHED",
  "ADMIN_JOB_RESTORED",
  "ADMIN_JOB_DELETED",
  "JOB_APPROVED",
  "JOB_REJECTED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_DELETED",
  "RECRUITER_APPLICATION_APPROVED",
  "RECRUITER_APPLICATION_REJECTED",
  "RECRUITER_FORM_FIELD_CREATED",
  "RECRUITER_FORM_FIELD_UPDATED",
  "RECRUITER_FORM_FIELD_DELETED",
];

const auditTargetTypes: AuditTargetType[] = ["USER", "JOB", "CATEGORY_OPTION", "RECRUITER_APPLICATION", "RECRUITER_FORM_FIELD"];

const adminSections: AdminSection[] = ["users", "jobs", "employer-requests", "categories", "audit-logs", "email-format"];
const SANITY_STUDIO_URL = import.meta.env.VITE_SANITY_STUDIO_URL || "http://localhost:3333";
const EMAIL_TEMPLATE_IMAGE_BUCKET = "company";
const EMAIL_TEMPLATE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const isDefaultBrandName = (name?: string) => {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return normalized === "" || normalized === "internhiring" || normalized === "intern hiring";
};

const isDefaultFontSize = (size?: number) => {
  return !size || size === 15;
};

const isDefaultFooterText = (text?: string) => {
  if (!text) return true;
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d");
  
  const textNormalized = normalized.replace(/[^a-z0-9]/g, "");
  return (
    textNormalized === "" ||
    textNormalized.includes("emailnayduocguituhethong") ||
    textNormalized.includes("thisemailwassentfrominternhiring")
  );
};

const safeUploadFileName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "email-header-image";

const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const getAuditLogDescription = useCallback((log: AuditLog) => {
    const metadata = log.metadata || {};
    const title = metadata.title || "";
    const jobId = metadata.jobId || String(log.targetId || "");
    const hidden = metadata.hidden;

    switch (log.action) {
      case "USER_ROLE_UPDATED":
        return t("admin.auditLogs.descriptions.USER_ROLE_UPDATED", {
          email: metadata.email || "",
          role: t("role." + metadata.newRole, { defaultValue: metadata.newRole }),
          defaultValue: log.description
        });
      case "USER_RESTRICTION_UPDATED":
        return t("admin.auditLogs.descriptions.USER_RESTRICTION_UPDATED", {
          email: metadata.email || "",
          restricted: metadata.restricted === "true" ? t("admin.users.restricted") : t("admin.users.active"),
          defaultValue: log.description
        });
      case "ADMIN_JOB_CREATED":
        return t("admin.auditLogs.descriptions.ADMIN_JOB_CREATED", {
          title,
          defaultValue: log.description
        });
      case "ADMIN_JOB_UPDATED":
        return t("admin.auditLogs.descriptions.ADMIN_JOB_UPDATED", {
          title,
          status: hidden === "true" ? t("admin.jobs.filters.hiddenOnly") : t("admin.jobs.filters.visibleOnly"),
          defaultValue: log.description
        });
      case "ADMIN_JOB_TRASHED":
        return t("admin.auditLogs.descriptions.ADMIN_JOB_TRASHED", {
          title,
          defaultValue: log.description
        });
      case "ADMIN_JOB_RESTORED":
        return t("admin.auditLogs.descriptions.ADMIN_JOB_RESTORED", {
          title,
          defaultValue: log.description
        });
      case "ADMIN_JOB_DELETED":
        return t("admin.auditLogs.descriptions.ADMIN_JOB_DELETED", {
          jobId,
          defaultValue: log.description
        });
      case "JOB_APPROVED":
        return t("admin.auditLogs.descriptions.JOB_APPROVED", {
          title,
          defaultValue: log.description
        });
      case "JOB_REJECTED":
        return t("admin.auditLogs.descriptions.JOB_REJECTED", {
          title,
          defaultValue: log.description
        });
      case "CATEGORY_CREATED":
        return t("admin.auditLogs.descriptions.CATEGORY_CREATED", {
          label: metadata.label || "",
          categoryKey: metadata.categoryKey || "",
          defaultValue: log.description
        });
      case "CATEGORY_UPDATED":
        return t("admin.auditLogs.descriptions.CATEGORY_UPDATED", {
          label: metadata.label || "",
          categoryKey: metadata.categoryKey || "",
          defaultValue: log.description
        });
      case "CATEGORY_DELETED":
        return t("admin.auditLogs.descriptions.CATEGORY_DELETED", {
          categoryOptionId: metadata.categoryOptionId || String(log.targetId || ""),
          defaultValue: log.description
        });
      case "RECRUITER_APPLICATION_APPROVED":
        return t("admin.auditLogs.descriptions.RECRUITER_APPLICATION_APPROVED", {
          email: metadata.applicantEmail || "",
          defaultValue: log.description
        });
      case "RECRUITER_APPLICATION_REJECTED":
        return t("admin.auditLogs.descriptions.RECRUITER_APPLICATION_REJECTED", {
          email: metadata.applicantEmail || "",
          defaultValue: log.description
        });
      case "RECRUITER_FORM_FIELD_CREATED":
        return t("admin.auditLogs.descriptions.RECRUITER_FORM_FIELD_CREATED", {
          label: metadata.label || "",
          name: metadata.name || "",
          defaultValue: log.description
        });
      case "RECRUITER_FORM_FIELD_UPDATED":
        return t("admin.auditLogs.descriptions.RECRUITER_FORM_FIELD_UPDATED", {
          label: metadata.label || "",
          name: metadata.name || "",
          defaultValue: log.description
        });
      case "RECRUITER_FORM_FIELD_DELETED":
        return t("admin.auditLogs.descriptions.RECRUITER_FORM_FIELD_DELETED", {
          fieldId: metadata.fieldId || String(log.targetId || ""),
          defaultValue: log.description
        });
      default:
        return log.description;
    }
  }, [t]);
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const emailImageInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJobPost[]>([]);
  const [requests, setRequests] = useState<RecruiterApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditAction, setAuditAction] = useState<AuditAction | "">("");
  const [auditTargetType, setAuditTargetType] = useState<AuditTargetType | "">("");
  const [auditActorEmail, setAuditActorEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedJob, setSelectedJob] = useState<AdminJobPost | null>(null);
  const [jobPendingDelete, setJobPendingDelete] = useState<{ job: AdminJobPost; mode: JobDeleteMode } | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<RecruiterApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>("ALL");
  const [jobHiddenFilter, setJobHiddenFilter] = useState<JobHiddenFilter>("ALL");
  const [jobDateFilter, setJobDateFilter] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [activeJobPage, setActiveJobPage] = useState(1);
  const [trashedJobPage, setTrashedJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);
  const [userSort, setUserSort] = useState<{ key: UserSortKey; direction: SortDirection }>({
    key: "email",
    direction: "asc",
  });
  const [jobSort, setJobSort] = useState<{ key: JobSortKey; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>("ALL");

          
  const setUrlPage = (key: string, page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, String(page));
    setSearchParams(next);
  };

  const setAuditUrlPage = (page: number) => setUrlPage("auditPage", page);

  const resetAuditPage = () => {
    setAuditPage(0);
    setAuditUrlPage(1);
  };
  const [managedConfig, setManagedConfig] = useState<ManagedSiteConfig>(defaultManagedSiteConfig);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateConfig>(defaultEmailTemplateConfig);
  const [savingEmailTemplate, setSavingEmailTemplate] = useState(false);
  const [uploadingEmailImage, setUploadingEmailImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const activeJobs = useMemo(() => jobs.filter((job) => !isTrashedJob(job)), [jobs]);
  const trashedJobs = useMemo(() => jobs.filter(isTrashedJob), [jobs]);
  const applyJobFilters = useCallback(
    (items: AdminJobPost[]) => items.filter((job) => {
      const statusMatches = jobStatusFilter === "ALL" || normalizeJobStatus(job.status) === jobStatusFilter;
      const hiddenMatches =
        jobHiddenFilter === "ALL" ||
        jobHiddenFilter === "TRASH" ||
        (jobHiddenFilter === "HIDDEN" ? Boolean(job.hidden) : !job.hidden);
      const dateMatches = !jobDateFilter || job.createdAt?.slice(0, 10) === jobDateFilter;

      return statusMatches && hiddenMatches && dateMatches;
    }),
    [jobDateFilter, jobHiddenFilter, jobStatusFilter],
  );
  const filteredActiveJobs = useMemo(() => applyJobFilters(activeJobs), [activeJobs, applyJobFilters]);
  const filteredTrashedJobs = useMemo(() => applyJobFilters(trashedJobs), [applyJobFilters, trashedJobs]);
  const sortJobs = useCallback(
    (items: AdminJobPost[]) =>
      [...items].sort((first, second) => {
        switch (jobSort.key) {
          case "title":
            return compareNullable(first.title, second.title, jobSort.direction);
          case "company":
            return compareNullable(first.company ?? null, second.company ?? null, jobSort.direction);
          case "recruiter":
            return compareNullable(
              first.employerEmail || first.employerName || null,
              second.employerEmail || second.employerName || null,
              jobSort.direction,
            );
          case "createdAt":
            return compareNullable(getTimeValue(first.createdAt), getTimeValue(second.createdAt), jobSort.direction);
          case "deletedAt":
            return compareNullable(getTimeValue(first.deletedAt), getTimeValue(second.deletedAt), jobSort.direction);
          case "status":
            return compareNullable(normalizeJobStatus(first.status), normalizeJobStatus(second.status), jobSort.direction);
          case "hidden":
            return compareNullable(first.hidden ? 1 : 0, second.hidden ? 1 : 0, jobSort.direction);
          default:
            return 0;
        }
      }),
    [jobSort.direction, jobSort.key],
  );
  const sortedActiveJobs = useMemo(() => sortJobs(filteredActiveJobs), [filteredActiveJobs, sortJobs]);
  const sortedTrashedJobs = useMemo(() => sortJobs(filteredTrashedJobs), [filteredTrashedJobs, sortJobs]);
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "PENDING"),
    [requests],
  );
  const pendingRequestByApplicantId = useMemo(
    () => new Map(pendingRequests.map((request) => [String(request.applicantId), request])),
    [pendingRequests],
  );
  const sortedUsers = useMemo(
    () =>
      users
        .filter((account) => userRoleFilter === "ALL" || normalizeRoleName(account.role) === userRoleFilter)
        .filter((account) => {
          if (userStatusFilter === "ALL") return true;
          const restricted = isRestrictedUser(account);
          return userStatusFilter === "RESTRICTED" ? restricted : !restricted;
        })
        .sort((first, second) => {
          switch (userSort.key) {
            case "email":
              return compareNullable(first.email, second.email, userSort.direction);
            case "fullName":
              return compareNullable(
                `${first.lastName ?? ""} ${first.firstName ?? ""}`.trim(),
                `${second.lastName ?? ""} ${second.firstName ?? ""}`.trim(),
                userSort.direction,
              );
            case "role":
              return compareNullable(getUserRolePriority(first.role), getUserRolePriority(second.role), userSort.direction);
            case "status":
              return compareNullable(isRestrictedUser(first) ? 1 : 0, isRestrictedUser(second) ? 1 : 0, userSort.direction);
            default:
              return 0;
          }
        }),
    [userRoleFilter, userSort.direction, userSort.key, userStatusFilter, users],
  );
          const paginatedUsers = useMemo(
    () => paginateItems(sortedUsers, userPage, userPageSize),
    [sortedUsers, userPage, userPageSize],
  );
  const paginatedActiveJobs = useMemo(
    () => paginateItems(sortedActiveJobs, activeJobPage, jobPageSize),
    [activeJobPage, jobPageSize, sortedActiveJobs],
  );
  const paginatedTrashedJobs = useMemo(
    () => paginateItems(sortedTrashedJobs, trashedJobPage, jobPageSize),
    [jobPageSize, sortedTrashedJobs, trashedJobPage],
  );
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const formatAdminDate = useCallback((value?: string | null) => formatDate(value, dateLocale), [dateLocale]);
  const selectedUserCvUrl = useMemo(
    () => (selectedUser ? getPrimaryCvUrl(selectedUser) : undefined),
    [selectedUser],
  );

  const renderRecruiterApplicationValue = (key: string, value?: string) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    if (key === "addresses") {
      const parsed = parseJsonValue(value);
      if (Array.isArray(parsed)) {
        return (
          <div className="space-y-1">
            {parsed.map((address, index) => {
              if (typeof address !== "object" || address === null) return null;
              const record = address as Record<string, unknown>;
              return (
                <div key={index} className="rounded-md bg-muted/60 p-2">
                  <div>{String(record.headOffice ?? "-")}</div>
                  <div className="text-muted-foreground">
                    {[record.detail, record.district, record.province].filter(Boolean).join(", ")}
                  </div>
                  {record.isDefault ? <div className="text-emerald-700">{t("recruiterVerification.fields.defaultAddress")}</div> : null}
                </div>
              );
            })}
          </div>
        );
      }
    }

    if (key === "galleryUrls") {
      const parsed = parseJsonValue(value);
      if (Array.isArray(parsed)) {
        return (
          <div className="flex flex-wrap gap-2">
            {parsed.map((url, index) =>
              typeof url === "string" && url.startsWith("http") ? (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="text-primary underline">
                  {t("common.view")} {index + 1}
                </a>
              ) : null,
            )}
          </div>
        );
      }
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <a href={value} target="_blank" rel="noreferrer" className="text-primary underline">
          {t("common.view")}
        </a>
      );
    }

    return <span className="whitespace-pre-wrap">{value}</span>;
  };

  useEffect(() => {
    const requestedSection = searchParams.get("section") as AdminSection | null;
    if (requestedSection && adminSections.includes(requestedSection)) {
      setActiveSection(requestedSection);
    }

    setAuditPage(getSafePage(searchParams.get("auditPage")) - 1);
  }, [searchParams]);

  const openSection = (section: AdminSection) => {
    setActiveSection(section);
    setSearchParams(section === "users" ? {} : { section });
  };

  const openLoginBrandingStudio = () => {
    window.open(SANITY_STUDIO_URL, "_blank", "noopener,noreferrer");
  };

  const loadAuditLogs = useCallback(async () => {
    if (!token) return;
    try {
      const page = await adminApi.listAuditLogs(token, {
        page: auditPage,
        size: auditPageSize,
        action: auditAction,
        targetType: auditTargetType,
        actorEmail: auditActorEmail.trim(),
      });
      setAuditLogs(page.content);
      setAuditTotal(page.totalElements);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.auditLogs.loadError")));
    }
  }, [auditAction, auditActorEmail, auditPage, auditPageSize, auditTargetType, token, t]);

  const loadEmailTemplateConfig = useCallback(async () => {
    try {
      const config = await loadManagedSiteConfig();
      setManagedConfig(config);
      setEmailTemplate(config.emailTemplate);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.emailFormat.loadError", { defaultValue: "Could not load email format." })));
    }
  }, [t]);

  useEffect(() => {
    if (activeSection === "email-format") {
      loadEmailTemplateConfig();
    }
  }, [activeSection, loadEmailTemplateConfig]);

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoadingData(true);
    try {
      const [userResult, jobResult, requestResult] = await Promise.allSettled([
        adminApi.listUsers(token),
        adminApi.listJobs(token),
        recruiterApi.listApplications(token),
      ]);

      if (userResult.status === "fulfilled") {
        setUsers(userResult.value);
      } else {
        toast.error(getErrorMessage(userResult.reason, t("admin.loadError")));
      }

      if (jobResult.status === "fulfilled") {
        setJobs(jobResult.value);
      } else {
        setJobs([]);
        toast.error(getErrorMessage(jobResult.reason, t("admin.jobs.loadError")));
      }

      if (requestResult.status === "fulfilled") {
        setRequests(requestResult.value);
      } else {
        setRequests([]);
      }
    } finally {
      setLoadingData(false);
    }
  }, [token, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    loadManagedSiteConfig()
      .then((config) => {
        if (cancelled) return;
        setManagedConfig(config);
        setEmailTemplate(config.emailTemplate);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(t("admin.emailFormat.loadError", { defaultValue: "Could not load email format." }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (activeSection === "audit-logs") {
      loadAuditLogs();
    }
  }, [activeSection, loadAuditLogs]);

  useEffect(() => {
    setUserPage(1);
  }, [userRoleFilter, userSort.direction, userSort.key, userStatusFilter]);

  useEffect(() => {
    setActiveJobPage(1);
    setTrashedJobPage(1);
  }, [jobDateFilter, jobHiddenFilter, jobSort.direction, jobSort.key, jobStatusFilter]);

  const requireConfirm = (message: string) => window.confirm(message);

  const handleRoleChange = async (targetUser: AdminUser, role: UserRole) => {
    if (!token) return;
    if (normalizeRoleName(targetUser.role) === role) return;
    if (role === USER_ROLES.ADMIN && !isAdminRole(targetUser.role)) {
      toast.error(t("admin.roleAdminLocked"));
      return;
    }

    setActionId(targetUser.id);
    try {
      await adminApi.setUserRole(token, targetUser.id, role);

      toast.success(t("admin.roleUpdateSuccess"));
      await loadData();
    } catch (error: unknown) {
      if (isApiError(error) && error.status === 403) {
        toast.error(t("admin.roleUpdateForbidden"));
      } else {
        toast.error(error instanceof Error ? error.message : t("admin.roleUpdateError"));
      }
    } finally {
      setActionId(null);
    }
  };

  const handleRevokeRecruiterApplication = async (application: RecruiterApplication) => {
    if (!token) return;
    if (
      !requireConfirm(
        t("admin.revokeRecruiterConfirm"),
      )
    ) {
      return;
    }

    setActionId(application.id);
    try {
      await recruiterApi.revokeApplication(token, application.id);

      toast.success(t("admin.revokeRecruiterSuccess"));
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.revokeRecruiterError")));
    } finally {
      setActionId(null);
    }
  };

  const handleRestoreRecruiterApplication = async (application: RecruiterApplication) => {
    if (!token) return;

    setActionId(application.id);
    try {
      await recruiterApi.restoreApplication(token, application.id);

      toast.success(t("admin.restoreRecruiterSuccess"));
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.restoreRecruiterError")));
    } finally {
      setActionId(null);
    }
  };

  const handleRestriction = async (targetUser: AdminUser, restricted: boolean) => {
    if (!token) return;

    setActionId(targetUser.id);
    try {
      await adminApi.setUserRestriction(token, targetUser.id, restricted);

      toast.success(restricted ? t("admin.restrictionSetSuccess") : t("admin.restrictionRemovedSuccess"));
      await loadData();
    } catch (error: unknown) {
      if (isApiError(error) && error.status === 403) {
        toast.error(t("admin.restrictionForbidden"));
      } else {
        toast.error(error instanceof Error ? error.message : t("admin.restrictionUpdateError"));
      }
    } finally {
      setActionId(null);
    }
  };

  const handleTrashJob = async (job: AdminJobPost) => {
    if (!token) return;

    setActionId(job.id);
    try {
      await adminApi.moveJobToTrash(token, job.id);

      toast.success(t("admin.trashJobSuccess"));
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.trashJobError")));
    } finally {
      setActionId(null);
    }
  };

  const handleRestoreJob = async (job: AdminJobPost) => {
    if (!token) return;

    setActionId(job.id);
    try {
      await adminApi.restoreJob(token, job.id);

      toast.success(t("admin.restoreJobSuccess"));
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.restoreJobError")));
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteJobPermanently = async (job: AdminJobPost) => {
    if (!token) return;

    setActionId(job.id);
    try {
      await adminApi.deleteJobPermanently(token, job.id);
      toast.success(t("admin.deleteJobSuccess"));
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.deleteJobError")));
    } finally {
      setActionId(null);
    }
  };

  const confirmJobDelete = async () => {
    if (!jobPendingDelete) return;

    const { job, mode } = jobPendingDelete;
    if (mode === "trash") {
      await handleTrashJob(job);
    } else {
      await handleDeleteJobPermanently(job);
    }
    setJobPendingDelete(null);
  };

  const handleReviewRequest = async (
    application: RecruiterApplication,
    approved: boolean,
    reason?: string,
  ) => {
    if (!token) return;

    setActionId(application.id);
    try {
      await recruiterApi.reviewApplication(token, application.id, approved, reason);

      toast.success(approved ? t("admin.approveRecruiterSuccess") : t("admin.rejectRequestSuccess"));
      setRejectingRequest(null);
      setRejectionReason("");
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.reviewRequestError")));
    } finally {
      setActionId(null);
    }
  };

  const handleReviewJob = async (job: AdminJobPost, approved: boolean) => {
    if (!token) return;
    if (!approved && !requireConfirm(t("admin.jobs.rejectConfirm"))) return;

    setActionId(job.id);
    try {
      if (approved) {
        await moderatorApi.approveJob(token, job.id);
        toast.success(t("admin.jobs.approveSuccess"));
      } else {
        await moderatorApi.rejectJob(token, job.id);
        toast.success(t("admin.jobs.rejectSuccess"));
      }
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, approved ? t("admin.jobs.approveError") : t("admin.jobs.rejectError")));
    } finally {
      setActionId(null);
    }
  };

  const handleToggleJobHidden = async (job: AdminJobPost) => {
    if (!token) return;

    setActionId(job.id);
    try {
      await adminApi.toggleJobHidden(token, job.id, !job.hidden);
      toast.success(job.hidden ? t("recruiter.toast.showSuccess") : t("recruiter.toast.hideSuccess"));
      await loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.statusError"));
    } finally {
      setActionId(null);
    }
  };

  const updateUserSort = (key: UserSortKey) => {
    setUserSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const updateJobSort = (key: JobSortKey) => {
    setJobSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const renderUserSortableHeader = (key: UserSortKey, label: string) => {
    const active = userSort.key === key;
    const SortIcon = !active ? ArrowUpDown : userSort.direction === "asc" ? ArrowUp : ArrowDown;

    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-sm text-left font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => updateUserSort(key)}
      >
        <span>{label}</span>
        <SortIcon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      </button>
    );
  };

  const renderJobSortableHeader = (key: JobSortKey, label: string) => {
    const active = jobSort.key === key;
    const SortIcon = !active ? ArrowUpDown : jobSort.direction === "asc" ? ArrowUp : ArrowDown;

    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-sm text-left font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => updateJobSort(key)}
      >
        <span>{label}</span>
        <SortIcon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      </button>
    );
  };

  const updateEmailTemplate = <K extends keyof EmailTemplateConfig>(key: K, value: EmailTemplateConfig[K]) => {
    setEmailTemplate((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSaveEmailTemplate = async () => {
    if (!token) return;

    setSavingEmailTemplate(true);
    try {
      const nextConfig = {
        ...managedConfig,
        emailTemplate: {
          ...emailTemplate,
          fontSize: Math.max(12, Math.min(25, Number(emailTemplate.fontSize) || defaultEmailTemplateConfig.fontSize)),
        },
      };
      const savedConfig = await saveManagedSiteConfig(nextConfig, token);
      setManagedConfig(savedConfig);
      setEmailTemplate(savedConfig.emailTemplate);
      toast.success(t("admin.emailFormat.saveSuccess", { defaultValue: "Email format updated." }));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.emailFormat.saveError", { defaultValue: "Could not update email format." })));
    } finally {
      setSavingEmailTemplate(false);
    }
  };

  const handleResetEmailTemplate = () => {
    setEmailTemplate(defaultEmailTemplateConfig);
  };

  const uploadEmailHeaderImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("admin.emailFormat.imageInvalid", { defaultValue: "Please choose a valid image file." }));
      return;
    }

    if (file.size > EMAIL_TEMPLATE_IMAGE_MAX_BYTES) {
      toast.error(t("admin.emailFormat.imageTooLarge", { defaultValue: "Image must be 2MB or smaller." }));
      return;
    }

    setUploadingEmailImage(true);
    try {
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      if (!supabaseUser) {
        throw new Error("Not authenticated");
      }

      const filePath = `${supabaseUser.id}/email-template/${Date.now()}-${crypto.randomUUID()}-${safeUploadFileName(file.name)}`;
      const { error } = await supabase.storage.from(EMAIL_TEMPLATE_IMAGE_BUCKET).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) throw error;

      const publicUrl = supabase.storage.from(EMAIL_TEMPLATE_IMAGE_BUCKET).getPublicUrl(filePath).data.publicUrl;
      updateEmailTemplate("headerImageUrl", publicUrl);
      toast.success(t("admin.emailFormat.imageUploadSuccess", { defaultValue: "Header image uploaded." }));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.emailFormat.imageUploadError", { defaultValue: "Could not upload image." })));
    } finally {
      setUploadingEmailImage(false);
    }
  };

  const handleEmailHeaderImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    await uploadEmailHeaderImage(file);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="hero-gradient text-white py-8 shadow-sm">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className={`mb-3 px-5 py-2 text-sm ${getRoleBadgeDarkClassName(USER_ROLES.ADMIN)}`}>
                {t("role.ADMIN")}
              </Badge>
              <h1 className="text-3xl font-bold text-white">{t("admin.title")}</h1>
              <p className="mt-2 text-sm text-blue-100/90">
                {t("admin.description")}
              </p>
            </div>
            <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-50 border-transparent shadow-sm w-auto" onClick={loadData} disabled={loadingData}>
              {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("common.refresh")}
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8 max-w-6xl">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "users" ? "border-primary" : ""}`}
            onClick={() => openSection("users")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.stats.usersTitle")}</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">{t("admin.stats.usersDescription")}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "jobs" ? "border-primary" : ""}`}
            onClick={() => openSection("jobs")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.stats.jobsTitle")}</CardTitle>
              <Briefcase className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.length}</div>
              <p className="text-xs text-muted-foreground">{t("admin.stats.trashCount", { count: trashedJobs.length })}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "categories" ? "border-primary" : ""}`}
            onClick={() => openSection("categories")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.stats.categoriesTitle")}</CardTitle>
              <Settings2 className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("admin.stats.categoriesDescription")}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "audit-logs" ? "border-primary" : ""}`}
            onClick={() => openSection("audit-logs")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.stats.auditLogsTitle")}</CardTitle>
              <ClipboardList className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{auditTotal}</div>
              <p className="text-xs text-muted-foreground">{t("admin.stats.auditLogsDescription")}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "email-format" ? "border-primary" : ""}`}
            onClick={() => openSection("email-format")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.stats.emailFormatTitle", { defaultValue: "Email format" })}
              </CardTitle>
              <Mail className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("admin.stats.emailFormatDescription", { defaultValue: "Colors, font size, header image" })}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition hover:border-primary hover:shadow-md"
            onClick={openLoginBrandingStudio}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.stats.loginBrandingTitle")}</CardTitle>
              <Palette className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("admin.stats.loginBrandingDescription")}</p>
            </CardContent>
          </Card>
        </div>

        {loadingData ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <>
            {activeSection === "users" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.users.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select value={userRoleFilter} onValueChange={(value) => setUserRoleFilter(value as UserRoleFilter)}>
                        <SelectTrigger className="w-full sm:w-40 h-10 bg-white">
                          <SelectValue placeholder={t("common.role")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t("admin.users.allRoles")}</SelectItem>
                          {roleOptions.map((role) => (
                            <SelectItem key={role} value={role}>
                              {t(`role.${role}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={userStatusFilter} onValueChange={(value) => setUserStatusFilter(value as UserStatusFilter)}>
                        <SelectTrigger className="w-full sm:w-40 h-10 bg-white">
                          <SelectValue placeholder={t("common.status")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t("admin.users.allStatuses")}</SelectItem>
                          <SelectItem value="ACTIVE">{t("admin.users.active")}</SelectItem>
                          <SelectItem value="RESTRICTED">{t("admin.users.restricted")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setUserRoleFilter("ALL");
                          setUserStatusFilter("ALL");
                        }}
                        className="h-10"
                        disabled={userRoleFilter === "ALL" && userStatusFilter === "ALL"}
                      >
                        {t("jobs.filters.reset")}
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{renderUserSortableHeader("email", "Email")}</TableHead>
                        <TableHead>{renderUserSortableHeader("fullName", t("admin.users.fullName"))}</TableHead>
                        <TableHead>{renderUserSortableHeader("role", t("common.role"))}</TableHead>
                        <TableHead>{renderUserSortableHeader("status", t("common.status"))}</TableHead>
                        <TableHead className="text-center">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.items.map((account) => {
                        const restricted = isRestrictedUser(account);
                        const pendingRequest = pendingRequestByApplicantId.get(String(account.id));

                        return (
                          <TableRow key={account.id}>
                            <TableCell>{account.email}</TableCell>
                            <TableCell>
                              {account.lastName} {account.firstName}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={normalizeRoleName(account.role)}
                                disabled={actionId === account.id || isAdminRole(account.role)}
                                onValueChange={(role) => handleRoleChange(account, role as UserRole)}
                              >
                                <SelectTrigger
                                  className={`h-auto w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-none ${getRoleBadgeClassName(account.role)}`}
                                >
                                  <SelectValue placeholder={t("admin.users.setRole")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(isAdminRole(account.role) ? [USER_ROLES.ADMIN] : assignableRoleOptions).map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {t(`role.${role}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getAccountStatusBadgeClassName(Boolean(restricted))}>
                                {restricted ? t("admin.users.restricted") : t("admin.users.active")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap justify-center gap-2">
                                <div className="relative">
                                  <ActionIconButton
                                    icon={Eye}
                                    label={pendingRequest ? t("admin.users.reviewCompanyRequest") : t("common.view")}
                                    variantStyle="view"
                                    onClick={() =>
                                      navigate(
                                        pendingRequest
                                          ? `/admin/company-reviews/${encodeURIComponent(String(pendingRequest.id))}`
                                          : `/admin/users/${encodeURIComponent(String(account.id))}`,
                                      )
                                    }
                                  />
                                  {pendingRequest && (
                                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                                  )}
                                </div>
                                <ActionIconButton
                                  icon={ShieldAlert}
                                  label={restricted ? t("admin.users.unrestrict") : t("admin.users.restrict")}
                                  variantStyle={restricted ? "restore" : "warning"}
                                  disabled={actionId === account.id || isAdminRole(account.role)}
                                  onClick={() => handleRestriction(account, !restricted)}
                                />

                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    page={paginatedUsers.page}
                    totalPages={paginatedUsers.totalPages}
                    onPageChange={setUserPage}
                    pageSize={userPageSize}
                    onPageSizeChange={setUserPageSize}
                  />
                </CardContent>
              </Card>
            )}

            {activeSection === "jobs" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.jobs.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={jobStatusFilter} onValueChange={(value) => setJobStatusFilter(value as JobStatusFilter)}>
                        <SelectTrigger className="w-full sm:w-40 h-10 bg-white">
                          <SelectValue placeholder={t("admin.jobs.filters.status")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t("admin.jobs.filters.allStatuses")}</SelectItem>
                          <SelectItem value="PENDING">{t("admin.jobs.statuses.PENDING")}</SelectItem>
                          <SelectItem value="APPROVED">{t("admin.jobs.statuses.APPROVED")}</SelectItem>
                          <SelectItem value="REJECTED">{t("admin.jobs.statuses.REJECTED")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={jobHiddenFilter} onValueChange={(value) => setJobHiddenFilter(value as JobHiddenFilter)}>
                        <SelectTrigger className="w-full sm:w-40 h-10 bg-white">
                          <SelectValue placeholder={t("admin.jobs.filters.hidden")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t("admin.jobs.filters.allVisibility")}</SelectItem>
                          <SelectItem value="VISIBLE">{t("admin.jobs.filters.visibleOnly")}</SelectItem>
                          <SelectItem value="HIDDEN">{t("admin.jobs.filters.hiddenOnly")}</SelectItem>
                          <SelectItem value="TRASH">{t("admin.jobs.trashTab")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={jobDateFilter}
                        onChange={(event) => setJobDateFilter(event.target.value)}
                        className="w-full sm:w-40 h-10 bg-white"
                        aria-label={t("admin.jobs.filters.date")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setJobStatusFilter("ALL");
                          setJobHiddenFilter("ALL");
                          setJobDateFilter("");
                        }}
                        className="h-10"
                        disabled={jobStatusFilter === "ALL" && jobHiddenFilter === "ALL" && !jobDateFilter}
                      >
                        {t("jobs.filters.reset")}
                      </Button>
                    </div>
                  </div>
                  {jobHiddenFilter === "TRASH" ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{renderJobSortableHeader("title", t("admin.jobs.titleColumn"))}</TableHead>
                            <TableHead>{renderJobSortableHeader("company", t("common.company"))}</TableHead>
                            <TableHead>{renderJobSortableHeader("deletedAt", t("admin.jobs.deletedDate"))}</TableHead>
                            <TableHead className="text-center">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTrashedJobs.items.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-medium">{job.title}</TableCell>
                              <TableCell>{job.company || "-"}</TableCell>
                              <TableCell>{formatAdminDate(job.deletedAt)}</TableCell>
                              <TableCell>
                                <div className="flex justify-center gap-2">
                                  <ActionIconButton
                                    icon={RotateCcw}
                                    label={t("admin.jobs.restore")}
                                    variantStyle="restore"
                                    disabled={actionId === job.id}
                                    onClick={(e) => { e.stopPropagation(); handleRestoreJob(job); }}
                                  />
                                  <ActionIconButton
                                    icon={Trash2}
                                    label={t("admin.jobs.deletePermanent")}
                                    variantStyle="delete"
                                    disabled={actionId === job.id}
                                    onClick={(e) => { e.stopPropagation(); setJobPendingDelete({ job, mode: "permanent" }); }}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <PaginationControls
                        page={paginatedTrashedJobs.page}
                        totalPages={paginatedTrashedJobs.totalPages}
                        onPageChange={setTrashedJobPage}
                        pageSize={jobPageSize}
                        onPageSizeChange={setJobPageSize}
                      />
                    </>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{renderJobSortableHeader("title", t("admin.jobs.titleColumn"))}</TableHead>
                            <TableHead>{renderJobSortableHeader("company", t("common.company"))}</TableHead>
                            <TableHead>{renderJobSortableHeader("recruiter", t("common.recruiter"))}</TableHead>
                            <TableHead>{renderJobSortableHeader("createdAt", t("admin.jobs.postedDate"))}</TableHead>
                            <TableHead>{renderJobSortableHeader("status", t("common.status"))}</TableHead>
                            <TableHead className="w-28 text-center">
                              <div className="flex justify-center">
                                {renderJobSortableHeader("hidden", t("admin.jobs.hiddenColumn"))}
                              </div>
                            </TableHead>
                            <TableHead className="text-center">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedActiveJobs.items.map((job) => {
                            const jobStatus = normalizeJobStatus(job.status);

                            return (
                              <TableRow key={job.id} className="cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                                <TableCell className="font-medium">{job.title}</TableCell>
                                <TableCell>{job.company || "-"}</TableCell>
                                <TableCell>{job.employerEmail || job.employerName || "-"}</TableCell>
                                <TableCell>{formatAdminDate(job.createdAt)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={getReviewStatusBadgeClassName(job.status)}>
                                    {t(`admin.jobs.statuses.${jobStatus}`)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="w-28 text-center">
                                  <div className="flex justify-center">
                                    <span
                                      className={`inline-flex items-center justify-center ${job.hidden ? "text-red-700" : "text-emerald-700"
                                        }`}
                                      title={job.hidden ? t("admin.jobs.filters.hiddenOnly") : t("admin.jobs.filters.visibleOnly")}
                                      aria-label={job.hidden ? t("admin.jobs.filters.hiddenOnly") : t("admin.jobs.filters.visibleOnly")}
                                    >
                                      {job.hidden ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap justify-center gap-2">
                                    <ActionIconButton
                                      icon={job.hidden ? Eye : EyeOff}
                                      label={t(job.hidden ? "recruiter.jobs.show" : "recruiter.jobs.hide")}
                                      variantStyle={job.hidden ? "show" : "hide"}
                                      disabled={actionId === job.id}
                                      onClick={(e) => { e.stopPropagation(); handleToggleJobHidden(job); }}
                                    />
                                    {jobStatus === "PENDING" ? (
                                      <>
                                        <ActionIconButton icon={CheckCircle2} label={t("admin.jobs.approve")} variantStyle="approve" disabled={actionId === job.id} onClick={(e) => { e.stopPropagation(); handleReviewJob(job, true); }} />
                                        <ActionIconButton icon={XCircle} label={t("admin.jobs.reject")} variantStyle="reject" disabled={actionId === job.id} onClick={(e) => { e.stopPropagation(); handleReviewJob(job, false); }} />
                                      </>
                                    ) : (
                                      <ActionIconButton
                                        icon={Trash2}
                                        label={t("admin.jobs.moveToTrash")}
                                        variantStyle="delete"
                                        disabled={actionId === job.id}
                                        onClick={(e) => { e.stopPropagation(); setJobPendingDelete({ job, mode: "trash" }); }}
                                      />
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <PaginationControls
                        page={paginatedActiveJobs.page}
                        totalPages={paginatedActiveJobs.totalPages}
                        onPageChange={setActiveJobPage}
                        pageSize={jobPageSize}
                        onPageSizeChange={setJobPageSize}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === "categories" && token && (
              <CategoryManagementPanel token={token} />
            )}

            {activeSection === "email-format" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.emailFormat.title", { defaultValue: "Email format" })}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                   <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email-brand">
                        {t("admin.emailFormat.brandName", { defaultValue: "Brand name" })}
                      </Label>
                      <Input
                        id="email-brand"
                        value={isDefaultBrandName(emailTemplate.brandName) ? "" : emailTemplate.brandName}
                        onChange={(event) => updateEmailTemplate("brandName", event.target.value)}
                        placeholder="InternHiring"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-font-size">
                        {t("admin.emailFormat.fontSize", { defaultValue: "Font size" })}
                      </Label>
                      <Input
                        id="email-font-size"
                        type="number"
                        min={12}
                        max={25}
                        value={isDefaultFontSize(emailTemplate.fontSize) ? "" : (emailTemplate.fontSize || "")}
                        onChange={(event) => {
                          const val = event.target.value;
                          updateEmailTemplate("fontSize", val ? Number(val) : 15);
                        }}
                        placeholder="15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-background">
                        {t("admin.emailFormat.backgroundColor", { defaultValue: "Background color" })}
                      </Label>
                      <Input
                        id="email-background"
                        type="color"
                        value={emailTemplate.backgroundColor}
                        onChange={(event) => updateEmailTemplate("backgroundColor", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-card-color">
                        {t("admin.emailFormat.cardColor", { defaultValue: "Card color" })}
                      </Label>
                      <Input
                        id="email-card-color"
                        type="color"
                        value={emailTemplate.cardColor}
                        onChange={(event) => updateEmailTemplate("cardColor", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-text-color">
                        {t("admin.emailFormat.textColor", { defaultValue: "Text color" })}
                      </Label>
                      <Input
                        id="email-text-color"
                        type="color"
                        value={emailTemplate.textColor}
                        onChange={(event) => updateEmailTemplate("textColor", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-accent-color">
                        {t("admin.emailFormat.accentColor", { defaultValue: "Accent color" })}
                      </Label>
                      <Input
                        id="email-accent-color"
                        type="color"
                        value={emailTemplate.accentColor}
                        onChange={(event) => updateEmailTemplate("accentColor", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>
                        {t("admin.emailFormat.headerImage", { defaultValue: "Header image" })}
                      </Label>
                      <input
                        ref={emailImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEmailHeaderImageUpload}
                      />
                      
                      {emailTemplate.headerImageUrl ? (
                        <div 
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingImage(true);
                          }}
                          onDragLeave={() => setIsDraggingImage(false)}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setIsDraggingImage(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              await uploadEmailHeaderImage(file);
                            }
                          }}
                          className={`relative rounded-lg border-2 border-dashed p-4 flex flex-col items-center justify-center group min-h-[140px] transition-all duration-200 ${
                            isDraggingImage 
                              ? "border-primary bg-primary/5 scale-[1.02]" 
                              : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-50/80"
                          }`}
                        >
                          <img
                            src={emailTemplate.headerImageUrl}
                            alt="Header template"
                            className="max-h-28 object-contain rounded transition group-hover:blur-[1px]"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 rounded-lg">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => emailImageInputRef.current?.click()}
                              disabled={uploadingEmailImage}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              {t("admin.emailFormat.uploadImage", { defaultValue: "Change image" })}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => updateEmailTemplate("headerImageUrl", "")}
                              disabled={uploadingEmailImage}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t("admin.emailFormat.clearImage", { defaultValue: "Delete" })}
                            </Button>
                          </div>
                          {uploadingEmailImage && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingImage(true);
                          }}
                          onDragLeave={() => setIsDraggingImage(false)}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setIsDraggingImage(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              await uploadEmailHeaderImage(file);
                            }
                          }}
                          onClick={() => emailImageInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[140px] ${
                            isDraggingImage
                              ? "border-primary bg-primary/5 scale-[1.02]"
                              : "border-slate-300 hover:border-primary/50 bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm"
                          }`}
                        >
                          {uploadingEmailImage ? (
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          ) : (
                            <>
                              <Upload className="mb-2 h-6 w-6 text-slate-400 group-hover:text-primary transition-colors duration-200" />
                              <span className="text-sm font-medium text-slate-700 text-center">
                                {t("admin.emailFormat.dragDropText", { defaultValue: "Kéo thả ảnh vào đây hoặc click để tải lên" })}
                              </span>
                              <span className="text-xs text-muted-foreground mt-1 text-center">
                                {t("admin.emailFormat.imageHint", { defaultValue: "PNG, JPG, JPEG (tối đa 2MB)" })}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="email-footer">
                        {t("admin.emailFormat.footerText", { defaultValue: "Footer text" })}
                      </Label>
                      <Textarea
                        id="email-footer"
                        value={isDefaultFooterText(emailTemplate.footerText) ? "" : emailTemplate.footerText}
                        onChange={(event) => updateEmailTemplate("footerText", event.target.value)}
                        placeholder="Email này được gửi từ hệ thống thông báo InternHiring. / This email was sent from InternHiring notification system."
                        rows={3}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button onClick={handleSaveEmailTemplate} disabled={savingEmailTemplate}>
                        {savingEmailTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {t("common.save", { defaultValue: "Save" })}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleResetEmailTemplate}>
                        <RotateCcw className="h-4 w-4" />
                        {t("admin.emailFormat.reset", { defaultValue: "Reset defaults" })}
                      </Button>
                    </div>
                  </div>
                  <div
                    className="rounded-md border p-4"
                    style={{ backgroundColor: emailTemplate.backgroundColor }}
                  >
                    <div
                      className="mx-auto rounded-md border border-slate-200 p-5"
                      style={{ backgroundColor: emailTemplate.cardColor }}
                    >
                      {emailTemplate.headerImageUrl && (
                        <img
                          src={emailTemplate.headerImageUrl}
                          alt=""
                          className="mb-5 max-h-64 w-full rounded-md object-contain"
                        />
                      )}
                      <div className="mb-4 text-sm font-bold" style={{ color: emailTemplate.accentColor }}>
                        {emailTemplate.brandName || "InternHiring"}
                      </div>
                      <h3 className="mb-3 text-xl font-semibold text-slate-950">
                        {t("admin.emailFormat.previewTitle", { defaultValue: "Application update" })}
                      </h3>
                      <div
                        className="space-y-3 leading-7"
                        style={{ color: emailTemplate.textColor, fontSize: `${emailTemplate.fontSize}px` }}
                      >
                        <p>{t("admin.emailFormat.previewGreeting", { defaultValue: "Xin chao Nguyen Van A," })}</p>
                        <p>
                          {t("admin.emailFormat.previewBody", {
                            defaultValue: "Nha tuyen dung da xem xet ho so cua ban cho vi tri Frontend Developer Intern.",
                          })}
                        </p>
                      </div>
                      <div className="my-5 h-px bg-slate-200" />
                      <p className="text-center text-xs text-slate-500">
                        {emailTemplate.footerText || "Email này được gửi từ hệ thống thông báo InternHiring. / This email was sent from InternHiring notification system."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "audit-logs" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.auditLogs.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select value={auditAction || "all"} onValueChange={(value) => { resetAuditPage(); setAuditAction(value === "all" ? "" : value as AuditAction); }}>
                        <SelectTrigger className="w-full sm:w-44 h-10 bg-white">
                          <SelectValue placeholder={t("admin.auditLogs.action")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("admin.auditLogs.allActions")}</SelectItem>
                          {auditActions.map((action) => <SelectItem key={action} value={action}>{t(`admin.auditLogs.actions.${action}`, { defaultValue: action })}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={auditTargetType || "all"} onValueChange={(value) => { resetAuditPage(); setAuditTargetType(value === "all" ? "" : value as AuditTargetType); }}>
                        <SelectTrigger className="w-full sm:w-44 h-10 bg-white">
                          <SelectValue placeholder={t("admin.auditLogs.targetType")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("admin.auditLogs.allTargets")}</SelectItem>
                          {auditTargetTypes.map((target) => <SelectItem key={target} value={target}>{t(`admin.auditLogs.targets.${target}`, { defaultValue: target })}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={auditActorEmail}
                        onChange={(event) => { resetAuditPage(); setAuditActorEmail(event.target.value); }}
                        placeholder={t("admin.auditLogs.actorPlaceholder")}
                        className="w-full sm:w-48 h-10 bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetAuditPage();
                          setAuditAction("");
                          setAuditTargetType("");
                          setAuditActorEmail("");
                        }}
                        className="h-10 w-full sm:w-auto"
                        disabled={!auditAction && !auditTargetType && !auditActorEmail}
                      >
                        {t("jobs.filters.reset")}
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.auditLogs.time")}</TableHead>
                        <TableHead>{t("admin.auditLogs.actor")}</TableHead>
                        <TableHead>{t("admin.auditLogs.action")}</TableHead>
                        <TableHead>{t("admin.auditLogs.target")}</TableHead>
                        <TableHead>{t("common.description")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-xs">{formatAdminDate(log.createdAt)}</TableCell>
                          <TableCell>{log.actorEmail}</TableCell>
                          <TableCell><Badge variant="outline">{t(`admin.auditLogs.actions.${log.action}`, { defaultValue: log.action })}</Badge></TableCell>
                          <TableCell>{t(`admin.auditLogs.targets.${log.targetType}`, { defaultValue: log.targetType })} #{log.targetId ?? "-"}</TableCell>
                          <TableCell>
                            <div>{getAuditLogDescription(log)}</div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {Object.entries(log.metadata).map(([key, value]) => `${key}: ${value}`).join(" · ")}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {auditLogs.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("admin.auditLogs.empty")}</p>}
                  <div className="text-sm text-muted-foreground">
                    <span>{t("admin.auditLogs.total", { count: auditTotal })}</span>
                  </div>
                  <PaginationControls
                    page={auditPage + 1}
                    totalPages={Math.max(1, Math.ceil(auditTotal / auditPageSize))}
                    onPageChange={(page) => {
                      setAuditPage(page - 1);
                      setAuditUrlPage(page);
                    }}
                    pageSize={auditPageSize}
                    onPageSizeChange={(pageSize) => {
                      setAuditPageSize(pageSize);
                      setAuditPage(0);
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>

      <AlertDialog
        open={Boolean(jobPendingDelete)}
        onOpenChange={(open) => {
          if (!open && actionId !== jobPendingDelete?.job.id) {
            setJobPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {jobPendingDelete?.mode === "permanent"
                ? t("admin.jobs.deletePermanent")
                : t("admin.jobs.moveToTrash")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {jobPendingDelete?.mode === "permanent"
                ? t("admin.deleteJobConfirm")
                : t("admin.trashJobConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === jobPendingDelete?.job.id}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionId === jobPendingDelete?.job.id}
              onClick={confirmJobDelete}
            >
              {jobPendingDelete?.mode === "permanent"
                ? t("admin.jobs.deletePermanent")
                : t("admin.jobs.moveToTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.userDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.userDialog.description")}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div><strong>Email:</strong> {selectedUser.email}</div>
              <div><strong>{t("common.role")}:</strong> {t(`role.${normalizeRoleName(selectedUser.role)}`, { defaultValue: selectedUser.role })}</div>
              <div><strong>{t("admin.users.fullName")}:</strong> {selectedUser.lastName} {selectedUser.firstName}</div>
              <div><strong>{t("admin.userDialog.phone")}:</strong> {selectedUser.phoneNumber || "-"}</div>
              <div><strong>{t("admin.userDialog.gender")}:</strong> {selectedUser.gender || "-"}</div>
              <div><strong>{t("admin.userDialog.dob")}:</strong> {selectedUser.dob || "-"}</div>
              <div><strong>{t("admin.userDialog.createdAt")}:</strong> {formatAdminDate(selectedUser.createdAt)}</div>
              <div><strong>{t("admin.userDialog.cv")}:</strong> {selectedUserCvUrl ? <a className="text-primary underline" href={selectedUserCvUrl} target="_blank" rel="noreferrer">{t("admin.userDialog.viewCv")}</a> : "-"}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("admin.jobDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.jobDialog.description")}</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div><strong>{t("admin.jobs.titleColumn")}:</strong> {selectedJob.title}</div>
                <div><strong>{t("common.company")}:</strong> {selectedJob.company || "-"}</div>
                <div><strong>{t("common.recruiter")}:</strong> {selectedJob.employerEmail || selectedJob.employerName || "-"}</div>
                <div><strong>{t("admin.jobDialog.location")}:</strong> {selectedJob.location || "-"}</div>
                <div><strong>{t("common.type")}:</strong> {selectedJob.type ? (JOB_TYPE_OPTIONS.find(o => o.value === selectedJob.type)?.labelKey ? t(JOB_TYPE_OPTIONS.find(o => o.value === selectedJob.type)!.labelKey!) : selectedJob.type) : "-"}</div>
                <div><strong>{t("common.salary")}:</strong> {selectedJob.salary ? `${getSalaryRangeOption(selectedJob.salary)?.labelKey ? t(getSalaryRangeOption(selectedJob.salary)!.labelKey!) : selectedJob.salary} ${selectedJob.currency ? (CURRENCY_OPTIONS.find(o => o.value === selectedJob.currency)?.labelKey ? t(CURRENCY_OPTIONS.find(o => o.value === selectedJob.currency)!.labelKey!) : selectedJob.currency) : ""}` : "-"}</div>
                <div><strong>{t("recruiter.form.workMode")}:</strong> {selectedJob.mode ? (WORK_MODE_OPTIONS.find(o => o.value === selectedJob.mode)?.labelKey ? t(WORK_MODE_OPTIONS.find(o => o.value === selectedJob.mode)!.labelKey!) : selectedJob.mode) : "-"}</div>
                <div><strong>{t("recruiter.form.experience")}:</strong> {selectedJob.experience ? (defaultJobFilterOptions.experience.find(o => o.value === selectedJob.experience)?.labelKey ? t(defaultJobFilterOptions.experience.find(o => o.value === selectedJob.experience)!.labelKey!) : selectedJob.experience) : "-"}</div>
              </div>
              <div>
                <strong>{t("common.description")}:</strong>
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3">{selectedJob.description || "-"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectingRequest)} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.rejectDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.rejectDialog.description")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder={t("admin.rejectDialog.placeholder")}
          />
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            {t("admin.rejectDialog.warning")}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingRequest(null)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => rejectingRequest && handleReviewRequest(rejectingRequest, false, rejectionReason)}
            >
              {t("admin.requests.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default AdminDashboard;
