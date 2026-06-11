import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  FileCheck2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldAlert,
  Trash2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getReviewStatusBadgeClassName, getRoleBadgeClassName, normalizeRoleName } from "@/lib/dashboardStyles";

type AdminSection = "users" | "jobs" | "categories" | "audit-logs";
type JobStatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type JobHiddenFilter = "ALL" | "HIDDEN" | "VISIBLE";
type UserSortKey = "email" | "fullName" | "role" | "status";
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

const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJobPost[]>([]);
  const [requests, setRequests] = useState<RecruiterApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditAction, setAuditAction] = useState<AuditAction | "">("");
  const [auditTargetType, setAuditTargetType] = useState<AuditTargetType | "">("");
  const [auditActorEmail, setAuditActorEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedJob, setSelectedJob] = useState<AdminJobPost | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<RecruiterApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>("ALL");
  const [jobHiddenFilter, setJobHiddenFilter] = useState<JobHiddenFilter>("ALL");
  const [jobDateFilter, setJobDateFilter] = useState("");
  const [userSort, setUserSort] = useState<{ key: UserSortKey; direction: SortDirection }>({
    key: "email",
    direction: "asc",
  });
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>("ALL");

  const activeJobs = useMemo(() => jobs.filter((job) => !isTrashedJob(job)), [jobs]);
  const trashedJobs = useMemo(() => jobs.filter(isTrashedJob), [jobs]);
  const pendingJobs = useMemo(
    () => activeJobs.filter((job) => normalizeJobStatus(job.status) === "PENDING"),
    [activeJobs],
  );
  const approvedJobs = useMemo(
    () => activeJobs.filter((job) => normalizeJobStatus(job.status) === "APPROVED"),
    [activeJobs],
  );
  const applyJobFilters = useCallback(
    (items: AdminJobPost[]) => items.filter((job) => {
      const statusMatches = jobStatusFilter === "ALL" || normalizeJobStatus(job.status) === jobStatusFilter;
      const hiddenMatches =
        jobHiddenFilter === "ALL" ||
        (jobHiddenFilter === "HIDDEN" ? Boolean(job.hidden) : !job.hidden);
      const dateMatches = !jobDateFilter || job.createdAt?.slice(0, 10) === jobDateFilter;

      return statusMatches && hiddenMatches && dateMatches;
    }),
    [jobDateFilter, jobHiddenFilter, jobStatusFilter],
  );
  const filteredPendingJobs = useMemo(() => applyJobFilters(pendingJobs), [applyJobFilters, pendingJobs]);
  const filteredApprovedJobs = useMemo(() => applyJobFilters(approvedJobs), [applyJobFilters, approvedJobs]);
  const filteredTrashedJobs = useMemo(() => applyJobFilters(trashedJobs), [applyJobFilters, trashedJobs]);
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
    if (searchParams.get("section") === "audit-logs") {
      setActiveSection("audit-logs");
    }
  }, [searchParams]);

  const openSection = (section: AdminSection) => {
    setActiveSection(section);
    setSearchParams(section === "audit-logs" ? { section } : {});
  };

  const loadAuditLogs = useCallback(async () => {
    if (!token) return;
    try {
      const page = await adminApi.listAuditLogs(token, {
        page: auditPage,
        size: 20,
        action: auditAction,
        targetType: auditTargetType,
        actorEmail: auditActorEmail.trim(),
      });
      setAuditLogs(page.content);
      setAuditTotal(page.totalElements);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t("admin.auditLogs.loadError")));
    }
  }, [auditAction, auditActorEmail, auditPage, auditTargetType, token, t]);

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
        toast.error(getErrorMessage(jobResult.reason, "Không thể tải danh sách JD."));
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
    if (activeSection === "audit-logs") {
      loadAuditLogs();
    }
  }, [activeSection, loadAuditLogs]);

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
    if (!requireConfirm(t("admin.deleteJobConfirm"))) return;

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

  const updateUserSort = (key: UserSortKey) => {
    setUserSort((current) => ({
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
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className={`mb-3 px-5 py-2 text-sm ${getRoleBadgeClassName(USER_ROLES.ADMIN)}`}>
                {t("role.ADMIN")}
              </Badge>
              <h1 className="text-3xl font-bold text-slate-950">{t("admin.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("admin.description")}
              </p>
            </div>
            <Button variant="outline" onClick={loadData} disabled={loadingData}>
              {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("common.refresh")}
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <div className="text-3xl font-bold">{pendingJobs.length}</div>
              <p className="text-xs text-muted-foreground">{t("admin.stats.trashCount", { count: trashedJobs.length })}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeSection === "categories" ? "border-primary" : ""}`}
            onClick={() => openSection("categories")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.stats.categoriesTitle")}</CardTitle>
              <Settings2 className="h-5 w-5 text-primary" />
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
              <ClipboardList className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{auditTotal}</div>
              <p className="text-xs text-muted-foreground">{t("admin.stats.auditLogsDescription")}</p>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{renderUserSortableHeader("email", "Email")}</TableHead>
                        <TableHead>{renderUserSortableHeader("fullName", t("admin.users.fullName"))}</TableHead>
                        <TableHead>
                          <div className="flex flex-col gap-2">
                            {renderUserSortableHeader("role", t("common.role"))}
                            <Select value={userRoleFilter} onValueChange={(value) => setUserRoleFilter(value as UserRoleFilter)}>
                              <SelectTrigger className="h-8 w-36 bg-white text-xs">
                                <SelectValue />
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
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex flex-col gap-2">
                            {renderUserSortableHeader("status", t("common.status"))}
                            <Select value={userStatusFilter} onValueChange={(value) => setUserStatusFilter(value as UserStatusFilter)}>
                              <SelectTrigger className="h-8 w-40 bg-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">{t("admin.users.allStatuses")}</SelectItem>
                                <SelectItem value="ACTIVE">{t("admin.users.active")}</SelectItem>
                                <SelectItem value="RESTRICTED">{t("admin.users.restricted")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                        <TableHead className="text-center">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUsers.map((account) => {
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
                </CardContent>
              </Card>
            )}

            {activeSection === "jobs" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.jobs.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pending">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <TabsList>
                        <TabsTrigger value="pending">{t("admin.jobs.pendingTab")}</TabsTrigger>
                        <TabsTrigger value="approved">{t("admin.jobs.approvedTab")}</TabsTrigger>
                        <TabsTrigger value="trash">{t("admin.jobs.trashTab")}</TabsTrigger>
                      </TabsList>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Select value={jobStatusFilter} onValueChange={(value) => setJobStatusFilter(value as JobStatusFilter)}>
                          <SelectTrigger className="w-full sm:w-40">
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
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder={t("admin.jobs.filters.hidden")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">{t("admin.jobs.filters.allVisibility")}</SelectItem>
                            <SelectItem value="VISIBLE">{t("admin.jobs.filters.visibleOnly")}</SelectItem>
                            <SelectItem value="HIDDEN">{t("admin.jobs.filters.hiddenOnly")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={jobDateFilter}
                          onChange={(event) => setJobDateFilter(event.target.value)}
                          aria-label={t("admin.jobs.filters.date")}
                        />
                      </div>
                    </div>
                    <TabsContent value="pending">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.jobs.titleColumn")}</TableHead>
                            <TableHead>{t("common.company")}</TableHead>
                            <TableHead>{t("common.recruiter")}</TableHead>
                            <TableHead>{t("admin.jobs.postedDate")}</TableHead>
                            <TableHead>{t("common.status")}</TableHead>
                            <TableHead>{t("admin.jobs.hiddenColumn")}</TableHead>
                            <TableHead className="text-center">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPendingJobs.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-medium">{job.title}</TableCell>
                              <TableCell>{job.company || "-"}</TableCell>
                              <TableCell>{job.employerEmail || job.employerName || "-"}</TableCell>
                              <TableCell>{formatAdminDate(job.createdAt)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getReviewStatusBadgeClassName(job.status)}>
                                  {t(`admin.jobs.statuses.${normalizeJobStatus(job.status)}`)}
                                </Badge>
                              </TableCell>
                              <TableCell>{job.hidden ? t("common.yes") : t("common.no")}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap justify-center gap-2">
                                  <ActionIconButton icon={Eye} label={t("common.details")} variantStyle="view" onClick={() => setSelectedJob(job)} />
                                  <ActionIconButton icon={CheckCircle2} label={t("admin.jobs.approve")} variantStyle="approve" disabled={actionId === job.id} onClick={() => handleReviewJob(job, true)} />
                                  <ActionIconButton icon={XCircle} label={t("admin.jobs.reject")} variantStyle="reject" disabled={actionId === job.id} onClick={() => handleReviewJob(job, false)} />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                    <TabsContent value="approved">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.jobs.titleColumn")}</TableHead>
                            <TableHead>{t("common.company")}</TableHead>
                            <TableHead>{t("common.recruiter")}</TableHead>
                            <TableHead>{t("admin.jobs.postedDate")}</TableHead>
                            <TableHead>{t("common.status")}</TableHead>
                            <TableHead>{t("admin.jobs.hiddenColumn")}</TableHead>
                            <TableHead className="text-center">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredApprovedJobs.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-medium">{job.title}</TableCell>
                              <TableCell>{job.company || "-"}</TableCell>
                              <TableCell>{job.employerEmail || job.employerName || "-"}</TableCell>
                              <TableCell>{formatAdminDate(job.createdAt)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getReviewStatusBadgeClassName(job.status)}>
                                  {t(`admin.jobs.statuses.${normalizeJobStatus(job.status)}`)}
                                </Badge>
                              </TableCell>
                              <TableCell>{job.hidden ? t("common.yes") : t("common.no")}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap justify-center gap-2">
                                  <ActionIconButton icon={Eye} label={t("common.details")} variantStyle="view" onClick={() => setSelectedJob(job)} />
                                  <ActionIconButton icon={Trash2} label={t("admin.jobs.moveToTrash")} variantStyle="delete" disabled={actionId === job.id} onClick={() => handleTrashJob(job)} />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                    <TabsContent value="trash">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.jobs.titleColumn")}</TableHead>
                            <TableHead>{t("common.company")}</TableHead>
                            <TableHead>{t("admin.jobs.deletedDate")}</TableHead>
                            <TableHead className="text-center">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTrashedJobs.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-medium">{job.title}</TableCell>
                              <TableCell>{job.company || "-"}</TableCell>
                              <TableCell>{formatAdminDate(job.deletedAt)}</TableCell>
                              <TableCell>
                                <div className="flex justify-center gap-2">
                                  <ActionIconButton icon={RotateCcw} label={t("admin.jobs.restore")} variantStyle="restore" disabled={actionId === job.id} onClick={() => handleRestoreJob(job)} />
                                  <ActionIconButton icon={Trash2} label={t("admin.jobs.deletePermanent")} variantStyle="delete" disabled={actionId === job.id} onClick={() => handleDeleteJobPermanently(job)} />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {activeSection === "categories" && token && (
              <CategoryManagementPanel token={token} />
            )}

            {activeSection === "audit-logs" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.auditLogs.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Select value={auditAction || "all"} onValueChange={(value) => { setAuditPage(0); setAuditAction(value === "all" ? "" : value as AuditAction); }}>
                      <SelectTrigger><SelectValue placeholder={t("admin.auditLogs.action")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("admin.auditLogs.allActions")}</SelectItem>
                        {auditActions.map((action) => <SelectItem key={action} value={action}>{t(`admin.auditLogs.actions.${action}`, { defaultValue: action })}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={auditTargetType || "all"} onValueChange={(value) => { setAuditPage(0); setAuditTargetType(value === "all" ? "" : value as AuditTargetType); }}>
                      <SelectTrigger><SelectValue placeholder={t("admin.auditLogs.targetType")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("admin.auditLogs.allTargets")}</SelectItem>
                        {auditTargetTypes.map((target) => <SelectItem key={target} value={target}>{t(`admin.auditLogs.targets.${target}`, { defaultValue: target })}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <input
                      className="rounded-md border px-3 py-2 text-sm"
                      value={auditActorEmail}
                      onChange={(event) => { setAuditPage(0); setAuditActorEmail(event.target.value); }}
                      placeholder={t("admin.auditLogs.actorPlaceholder")}
                    />
                    <Button variant="outline" onClick={loadAuditLogs}>
                      <RefreshCw className="h-4 w-4" />
                      {t("common.refresh")}
                    </Button>
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
                            <div>{log.description}</div>
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
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{t("admin.auditLogs.total", { count: auditTotal })}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={auditPage === 0} onClick={() => setAuditPage((page) => Math.max(0, page - 1))}>{t("admin.auditLogs.previous")}</Button>
                      <Button variant="outline" size="sm" disabled={(auditPage + 1) * 20 >= auditTotal} onClick={() => setAuditPage((page) => page + 1)}>{t("admin.auditLogs.next")}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>

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
                <div><strong>{t("common.type")}:</strong> {selectedJob.type || "-"}</div>
                <div><strong>{t("common.salary")}:</strong> {selectedJob.salary || "-"}</div>
                <div><strong>{t("recruiter.form.experience")}:</strong> {selectedJob.experience || "-"}</div>
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
