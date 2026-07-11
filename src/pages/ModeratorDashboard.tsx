import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  XCircle,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext.tsx";
import { isAdminRole, isModeratorRole } from "@/lib/roles.ts";
import {
  getReviewStatusBadgeClassName,
  getRoleBadgeDarkClassName,
  normalizeReviewStatus,
  normalizeRoleName,
} from "@/lib/dashboardStyles.ts";
import { moderatorApi, recruiterApi, type ModeratorJobPost, type RecruiterApplication } from "@/lib/api.ts";
import { ActionIconButton } from "@/components/ui/action-icon-button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { PaginationControls } from "@/components/ui/pagination-controls.tsx";
import { paginateItems } from "@/lib/pagination.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { SanityPageSections } from "@/components/sanity/SanityPageSections";
import { useSanityInterfaceText } from "@/lib/sanityInterfaceText";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDate = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
};

const parseJsonArray = <T,>(value?: string | null): T[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const compareNullable = (first: string | number | null, second: string | number | null, direction: "asc" | "desc") => {
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;

  const compare =
    typeof first === "number" && typeof second === "number"
      ? first - second
      : String(first).localeCompare(String(second), undefined, { sensitivity: "base", numeric: true });

  return direction === "asc" ? compare : -compare;
};

const getTimeValue = (value?: string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const isTrashedJob = (job: ModeratorJobPost) => Boolean(job.deletedAt);

type CompanyAddress = {
  headOffice?: string;
  province?: string;
  district?: string;
  detail?: string;
  isDefault?: boolean;
};

const ModeratorDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const uiText = useSanityInterfaceText("/moderator");
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Scroll Refs
  const jobListRef = useRef<HTMLDivElement>(null);
  const companyListRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [selectedJob, setSelectedJob] = useState<ModeratorJobPost | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<RecruiterApplication | null>(null);
  const [jobPendingTrash, setJobPendingTrash] = useState<ModeratorJobPost | null>(null);
  const [jobPendingPermanentDelete, setJobPendingPermanentDelete] = useState<ModeratorJobPost | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [showJobManagement, setShowJobManagement] = useState(true);
  const [showCompanyRequests, setShowCompanyRequests] = useState(true);

  // Pagination states
  const [jobPage, setJobPage] = useState(1);
  const [trashedJobPage, setTrashedJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);
  const [appPage, setAppPage] = useState(1);
  const [appPageSize, setAppPageSize] = useState(10);

  // Job Filters
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("ALL");
  const [jobVisibilityFilter, setJobVisibilityFilter] = useState("ALL");
  const [jobDateFilter, setJobDateFilter] = useState("");

  // Job Sorting
  type JobSortKey = "title" | "company" | "recruiter" | "createdAt" | "deletedAt" | "status" | "hidden";
  type SortDirection = "asc" | "desc";
  const [jobSort, setJobSort] = useState<{ key: JobSortKey; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });

  const updateJobSort = (key: JobSortKey) => {
    setJobSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
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

  useEffect(() => {
    setJobPage(1);
    setTrashedJobPage(1);
  }, [jobSort]);

  useEffect(() => {
    setJobPage(1);
    setTrashedJobPage(1);
  }, [jobDateFilter, jobSearch, jobStatusFilter, jobVisibilityFilter]);

  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("ALL");

  // Company Application Sorting
  type AppSortKey = "applicant" | "companyName" | "taxCode" | "createdAt" | "status";
  const [appSort, setAppSort] = useState<{ key: AppSortKey; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });

  const updateAppSort = (key: AppSortKey) => {
    setAppSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const renderAppSortableHeader = (key: AppSortKey, label: string) => {
    const active = appSort.key === key;
    const SortIcon = !active ? ArrowUpDown : appSort.direction === "asc" ? ArrowUp : ArrowDown;

    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-sm text-left font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => updateAppSort(key)}
      >
        <span>{label}</span>
        <SortIcon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      </button>
    );
  };

  useEffect(() => {
    setAppPage(1);
  }, [appSort]);

  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const formatModeratorDate = useCallback(
    (value?: string | null) => formatDate(value, dateLocale),
    [dateLocale],
  );

  // Fetch all jobs
  const {
    data: jobs = [],
    isLoading: loadingJobs,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ["moderator", "allJobs", token],
    queryFn: () => moderatorApi.listAllJobs(token!),
    enabled: !!token && isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch recruiter verification applications
  const {
    data: applications = [],
    isLoading: loadingApps,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["moderator", "recruiterApplications", token],
    queryFn: () => recruiterApi.listApplications(token!),
    enabled: !!token && isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const loadingData = loadingJobs || loadingApps;

  const handleRefresh = async () => {
    await Promise.all([refetchJobs(), refetchApps()]);
    toast.success(t("toast.success"));
  };

  // Stats calculation
  const jobStats = useMemo(() => {
    const activeJobs = jobs.filter((job) => !isTrashedJob(job));
    const total = activeJobs.length;
    const visible = activeJobs.filter((j) => normalizeReviewStatus(j.status) === "APPROVED" && !j.hidden).length;
    const hidden = activeJobs.filter((j) => j.hidden).length;
    const trash = jobs.length - activeJobs.length;
    return { total, visible, hidden, trash };
  }, [jobs]);

  const companyStats = useMemo(() => {
    const total = applications.length;
    const approved = applications.filter((a) => normalizeReviewStatus(a.status) === "APPROVED").length;
    const rejected = applications.filter((a) => normalizeReviewStatus(a.status) === "REJECTED").length;
    return { total, approved, rejected };
  }, [applications]);

  // Mutations
  const approveJobMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.approveJob(token!, jobId),
    onSuccess: () => {
      toast.success(t("admin.jobs.approveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["moderator", "allJobs"] });
      if (selectedJob) {
        setSelectedJob(null);
      }
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("admin.jobs.approveError")));
    },
    onSettled: () => setActionId(null),
  });

  const rejectJobMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.rejectJob(token!, jobId),
    onSuccess: () => {
      toast.success(t("admin.jobs.rejectSuccess"));
      queryClient.invalidateQueries({ queryKey: ["moderator", "allJobs"] });
      if (selectedJob) {
        setSelectedJob(null);
      }
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("admin.jobs.rejectError")));
    },
    onSettled: () => setActionId(null),
  });

  const toggleJobHiddenMutation = useMutation({
    mutationFn: ({ jobId, hidden }: { jobId: string | number; hidden: boolean }) =>
      moderatorApi.toggleJobHidden(token!, jobId, hidden),
    onSuccess: (updatedJob) => {
      toast.success(updatedJob.hidden ? t("recruiter.toast.hideSuccess") : t("recruiter.toast.showSuccess"));
      queryClient.setQueriesData<ModeratorJobPost[]>({ queryKey: ["moderator", "allJobs"] }, (currentJobs) =>
        currentJobs?.map((job) => (String(job.id) === String(updatedJob.id) ? updatedJob : job)),
      );
      queryClient.invalidateQueries({ queryKey: ["moderator", "allJobs"] });
      setSelectedJob((prev) => (prev && String(prev.id) === String(updatedJob.id) ? updatedJob : prev));
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("recruiter.toast.statusError")));
    },
    onSettled: () => setActionId(null),
  });

  const trashJobMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.trashJob(token!, jobId),
    onSuccess: (updatedJob) => {
      toast.success(t("admin.trashJobSuccess"));
      setJobPendingTrash(null);
      queryClient.setQueriesData<ModeratorJobPost[]>({ queryKey: ["moderator", "allJobs"] }, (currentJobs) =>
        currentJobs?.map((job) => (String(job.id) === String(updatedJob.id) ? updatedJob : job)),
      );
      queryClient.invalidateQueries({ queryKey: ["moderator", "allJobs"] });
      if (selectedJob) {
        setSelectedJob(null);
      }
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("admin.trashJobError")));
    },
    onSettled: () => setActionId(null),
  });

  const restoreJobMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.restoreJob(token!, jobId),
    onSuccess: (updatedJob) => {
      toast.success(t("admin.restoreJobSuccess"));
      queryClient.setQueriesData<ModeratorJobPost[]>({ queryKey: ["moderator", "allJobs"] }, (currentJobs) =>
        currentJobs?.map((job) => (String(job.id) === String(updatedJob.id) ? updatedJob : job)),
      );
      queryClient.invalidateQueries({ queryKey: ["moderator", "allJobs"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("admin.restoreJobError")));
    },
    onSettled: () => setActionId(null),
  });

  const deleteJobPermanentlyMutation = useMutation({
    mutationFn: (jobId: string | number) => moderatorApi.deleteJobPermanently(token!, jobId),
    onSuccess: (_, jobId) => {
      toast.success(t("admin.deleteJobSuccess"));
      setJobPendingPermanentDelete(null);
      queryClient.setQueriesData<ModeratorJobPost[]>({ queryKey: ["moderator", "allJobs"] }, (currentJobs) =>
        currentJobs?.filter((job) => String(job.id) !== String(jobId)),
      );
      queryClient.invalidateQueries({ queryKey: ["moderator", "allJobs"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("admin.deleteJobError")));
    },
    onSettled: () => setActionId(null),
  });

  const reviewAppMutation = useMutation({
    mutationFn: ({ appId, approved, reviewNote }: { appId: string | number; approved: boolean; reviewNote?: string }) =>
      recruiterApi.reviewApplication(token!, appId, approved, reviewNote),
    onSuccess: (_, variables) => {
      toast.success(variables.approved ? t("admin.approveRecruiterSuccess") : t("admin.rejectRequestSuccess"));
      queryClient.invalidateQueries({ queryKey: ["moderator", "recruiterApplications"] });
      setSelectedApplication(null);
      setReviewNote("");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("admin.reviewRequestError")));
    },
    onSettled: () => setActionId(null),
  });

  const handleApproveJob = (job: ModeratorJobPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;
    setActionId(job.id);
    approveJobMutation.mutate(job.id);
  };

  const handleRejectJob = (job: ModeratorJobPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token || !window.confirm(t("admin.jobs.rejectConfirm"))) return;
    setActionId(job.id);
    rejectJobMutation.mutate(job.id);
  };

  const handleToggleJobHidden = (job: ModeratorJobPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;
    setActionId(job.id);
    toggleJobHiddenMutation.mutate({ jobId: job.id, hidden: !job.hidden });
  };

  const handleTrashJob = (job: ModeratorJobPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;
    setJobPendingTrash(job);
  };

  const handleRestoreJob = (job: ModeratorJobPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;
    setActionId(job.id);
    restoreJobMutation.mutate(job.id);
  };

  const handleDeleteJobPermanently = (job: ModeratorJobPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;
    setJobPendingPermanentDelete(job);
  };

  const confirmDeleteJobPermanently = () => {
    if (!token || !jobPendingPermanentDelete) return;
    setActionId(jobPendingPermanentDelete.id);
    deleteJobPermanentlyMutation.mutate(jobPendingPermanentDelete.id);
  };

  const confirmTrashJob = () => {
    if (!token || !jobPendingTrash) return;
    setActionId(jobPendingTrash.id);
    trashJobMutation.mutate(jobPendingTrash.id);
  };

  const handleReviewApplication = (approved: boolean) => {
    if (!token || !selectedApplication) return;
    setActionId(selectedApplication.id);
    reviewAppMutation.mutate({
      appId: selectedApplication.id,
      approved,
      reviewNote: reviewNote.trim() || undefined,
    });
  };

  const activeJobs = useMemo(() => jobs.filter((job) => !isTrashedJob(job)), [jobs]);
  const trashedJobs = useMemo(() => jobs.filter(isTrashedJob), [jobs]);

  const applyJobFilters = useCallback(
    (items: ModeratorJobPost[]) =>
      items.filter((job) => {
        const matchesSearch =
          !jobSearch ||
          job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
          (job.company || "").toLowerCase().includes(jobSearch.toLowerCase());

        const statusVal = normalizeReviewStatus(job.status);
        const matchesStatus = jobStatusFilter === "ALL" || statusVal === jobStatusFilter;
        const matchesVisibility =
          jobVisibilityFilter === "ALL" ||
          jobVisibilityFilter === "TRASH" ||
          (jobVisibilityFilter === "VISIBLE" ? statusVal === "APPROVED" && !job.hidden : job.hidden);
        const matchesDate = !jobDateFilter || job.createdAt?.slice(0, 10) === jobDateFilter;

        return matchesSearch && matchesStatus && matchesVisibility && matchesDate;
      }),
    [jobDateFilter, jobSearch, jobStatusFilter, jobVisibilityFilter],
  );

  const filteredActiveJobs = useMemo(() => applyJobFilters(activeJobs), [activeJobs, applyJobFilters]);
  const filteredTrashedJobs = useMemo(() => applyJobFilters(trashedJobs), [applyJobFilters, trashedJobs]);

  const sortJobs = useCallback((items: ModeratorJobPost[]) => {
    return [...items].sort((first, second) => {
      switch (jobSort.key) {
        case "title":
          return compareNullable(first.title, second.title, jobSort.direction);
        case "company":
          return compareNullable(first.company ?? null, second.company ?? null, jobSort.direction);
        case "recruiter":
          return compareNullable(
            first.employerEmail || first.employerName || first.recruiterName || null,
            second.employerEmail || second.employerName || second.recruiterName || null,
            jobSort.direction,
          );
        case "createdAt":
          return compareNullable(getTimeValue(first.createdAt), getTimeValue(second.createdAt), jobSort.direction);
        case "deletedAt":
          return compareNullable(getTimeValue(first.deletedAt), getTimeValue(second.deletedAt), jobSort.direction);
        case "status":
          return compareNullable(normalizeReviewStatus(first.status), normalizeReviewStatus(second.status), jobSort.direction);
        case "hidden":
          return compareNullable(first.hidden ? 1 : 0, second.hidden ? 1 : 0, jobSort.direction);
        default:
          return 0;
      }
    });
  }, [jobSort.direction, jobSort.key]);

  const sortedActiveJobs = useMemo(() => sortJobs(filteredActiveJobs), [filteredActiveJobs, sortJobs]);
  const sortedTrashedJobs = useMemo(() => sortJobs(filteredTrashedJobs), [filteredTrashedJobs, sortJobs]);

  const paginatedJobs = useMemo(
    () => paginateItems(sortedActiveJobs, jobPage, jobPageSize),
    [jobPage, jobPageSize, sortedActiveJobs],
  );

  const paginatedTrashedJobs = useMemo(
    () => paginateItems(sortedTrashedJobs, trashedJobPage, jobPageSize),
    [jobPageSize, sortedTrashedJobs, trashedJobPage],
  );
  const showingTrashJobs = jobVisibilityFilter === "TRASH";
  const currentFilteredJobCount = showingTrashJobs ? filteredTrashedJobs.length : filteredActiveJobs.length;

  // Filtering Company verification requests
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const companyName = (app.formData?.companyDisplayName || app.formData?.companyFullName || "");
      const matchesSearch =
        !appSearch ||
        app.applicantEmail.toLowerCase().includes(appSearch.toLowerCase()) ||
        companyName.toLowerCase().includes(appSearch.toLowerCase());

      const matchesStatus = appStatusFilter === "ALL" || normalizeReviewStatus(app.status) === appStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, appSearch, appStatusFilter]);

  const sortedApplications = useMemo(() => {
    return [...filteredApplications].sort((first, second) => {
      switch (appSort.key) {
        case "applicant":
          return compareNullable(first.applicantEmail, second.applicantEmail, appSort.direction);
        case "companyName": {
          const firstCompany = first.formData?.companyDisplayName || first.formData?.companyFullName || "";
          const secondCompany = second.formData?.companyDisplayName || second.formData?.companyFullName || "";
          return compareNullable(firstCompany, secondCompany, appSort.direction);
        }
        case "taxCode": {
          const firstTax = first.formData?.taxCode || "";
          const secondTax = second.formData?.taxCode || "";
          return compareNullable(firstTax, secondTax, appSort.direction);
        }
        case "createdAt":
          return compareNullable(getTimeValue(first.createdAt), getTimeValue(second.createdAt), appSort.direction);
        case "status":
          return compareNullable(normalizeReviewStatus(first.status), normalizeReviewStatus(second.status), appSort.direction);
        default:
          return 0;
      }
    });
  }, [filteredApplications, appSort]);

  const paginatedApps = useMemo(
    () => paginateItems(sortedApplications, appPage, appPageSize),
    [appPage, appPageSize, sortedApplications],
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isModeratorRole(user?.role) && !isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <SanityPageSections routePath="/moderator" placement="top" />
      {/* Hero Header */}
      <section className="hero-gradient py-6 text-white shadow-sm sm:py-8">
        <div className="container mx-auto max-w-6xl px-3 sm:px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className={`mb-3 px-4 py-1.5 text-xs sm:px-5 sm:py-2 sm:text-sm ${getRoleBadgeDarkClassName(user?.role)}`}>
                {t(`role.${normalizeRoleName(user?.role)}`, { defaultValue: t("moderator.badge") })}
              </Badge>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{uiText("moderator.title", t("moderator.title"))}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/90">{uiText("moderator.description", t("moderator.description"))}</p>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2 border-transparent bg-white text-slate-900 shadow-sm hover:bg-slate-50 sm:w-auto"
              onClick={handleRefresh}
              disabled={loadingData}
            >
              {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("common.refresh")}
            </Button>
          </div>
        </div>
      </section>

      <SanityPageSections routePath="/moderator" placement="afterHero" />

      <section className="container mx-auto max-w-6xl space-y-6 px-3 py-5 sm:space-y-8 sm:px-4 sm:py-8">
        {/* Statistics Grid */}
        <div className="space-y-6">
          {/* Job posts stats */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {uiText("moderator.stats.jobsTitle", t("moderator.stats.jobsTitle"))}
            </h2>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 md:gap-4">
              <Card
                className="cursor-pointer transition hover:shadow-md bg-white border border-slate-100 shadow-sm"
                onClick={() => {
                  setJobStatusFilter("ALL");
                  setJobVisibilityFilter("ALL");
                  jobListRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("moderator.stats.totalJobs")}
                  </CardTitle>
                  <Briefcase className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{jobStats.total}</div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition hover:shadow-md bg-white border border-slate-100 shadow-sm"
                onClick={() => {
                  setJobStatusFilter("APPROVED");
                  setJobVisibilityFilter("VISIBLE");
                  jobListRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("moderator.stats.visibleJobs")}
                  </CardTitle>
                  <Eye className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{jobStats.visible}</div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition hover:shadow-md bg-white border border-slate-100 shadow-sm"
                onClick={() => {
                  setJobStatusFilter("ALL");
                  setJobVisibilityFilter("HIDDEN");
                  jobListRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("moderator.stats.hiddenJobs")}
                  </CardTitle>
                  <EyeOff className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{jobStats.hidden}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Company stats */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {uiText("moderator.stats.companiesTitle", t("moderator.stats.companiesTitle"))}
            </h2>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 md:gap-4">
              <Card
                className="cursor-pointer transition hover:shadow-md bg-white border border-slate-100 shadow-sm"
                onClick={() => {
                  setAppStatusFilter("ALL");
                  companyListRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("moderator.stats.totalCompanies")}
                  </CardTitle>
                  <Building2 className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{companyStats.total}</div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition hover:shadow-md bg-white border border-slate-100 shadow-sm"
                onClick={() => {
                  setAppStatusFilter("APPROVED");
                  companyListRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("moderator.stats.approvedCompanies")}
                  </CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{companyStats.approved}</div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition hover:shadow-md bg-white border border-slate-100 shadow-sm"
                onClick={() => {
                  setAppStatusFilter("REJECTED");
                  companyListRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("moderator.stats.rejectedCompanies")}
                  </CardTitle>
                  <XCircle className="h-5 w-5 text-rose-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{companyStats.rejected}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Job posts Card */}
        <div ref={jobListRef} className="scroll-mt-6">
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader
              role="button"
              tabIndex={0}
              aria-expanded={showJobManagement}
              aria-label={t(showJobManagement ? "common.collapse" : "common.expand", {
                defaultValue: showJobManagement ? t("moderator.collapse") : t("moderator.expand"),
              })}
              className="flex cursor-pointer flex-row items-center justify-between space-y-0 pb-4 transition hover:bg-slate-50"
              onClick={() => setShowJobManagement((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setShowJobManagement((current) => !current);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">
                  {t("moderator.jobs.title")}
                </CardTitle>
              </div>
              <Button
                type="button"
                tabIndex={-1}
                variant="ghost"
                size="icon"
                className="pointer-events-none h-9 w-9 text-slate-600 hover:bg-slate-100"
                aria-label={t(showJobManagement ? "common.collapse" : "common.expand", {
                  defaultValue: showJobManagement ? t("moderator.collapse") : t("moderator.expand"),
                })}
                aria-expanded={showJobManagement}
                onClick={() => setShowJobManagement((current) => !current)}
              >
                {showJobManagement ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardHeader>
            {showJobManagement && (
            <CardContent>
              {/* Search & Filters */}
              <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                <div className="flex flex-1 items-center gap-2 max-w-md">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder={t("moderator.jobs.searchPlaceholder")}
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="pl-9 h-10 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status filter */}
                  <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-10 bg-white">
                      <SelectValue placeholder={t("admin.jobs.filters.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t("moderator.jobs.allStatuses")}</SelectItem>
                      <SelectItem value="PENDING">{t("admin.jobs.statuses.PENDING")}</SelectItem>
                      <SelectItem value="APPROVED">{t("admin.jobs.statuses.APPROVED")}</SelectItem>
                      <SelectItem value="REJECTED">{t("admin.jobs.statuses.REJECTED")}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Visibility filter */}
                  <Select value={jobVisibilityFilter} onValueChange={setJobVisibilityFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-10 bg-white">
                      <SelectValue placeholder={t("admin.jobs.filters.hidden")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t("moderator.jobs.allVisibility")}</SelectItem>
                      <SelectItem value="VISIBLE">{t("moderator.jobs.visibleOnly")}</SelectItem>
                      <SelectItem value="HIDDEN">{t("moderator.jobs.hiddenOnly")}</SelectItem>
                      <SelectItem value="TRASH">{t("admin.jobs.trashTab")}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Date filter */}
                  <Input
                    type="date"
                    value={jobDateFilter}
                    onChange={(e) => setJobDateFilter(e.target.value)}
                    className="w-full sm:w-40 h-10 bg-white"
                    aria-label={t("admin.jobs.filters.date")}
                  />

                  {/* Reset Button */}
                  <Button
                    type="button"
                    variant="cta"
                    onClick={() => {
                      setJobSearch("");
                      setJobStatusFilter("ALL");
                      setJobVisibilityFilter("ALL");
                      setJobDateFilter("");
                    }}
                    className="w-auto"
                    disabled={!jobSearch && jobStatusFilter === "ALL" && jobVisibilityFilter === "ALL" && !jobDateFilter}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t("jobs.filters.reset")}
                  </Button>
                </div>
              </div>

              {loadingJobs ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : currentFilteredJobCount === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center text-sm text-slate-500 bg-slate-50/50">
                  {t("moderator.jobs.empty")}
                </div>
              ) : (
                <div className="space-y-4">
                  {showingTrashJobs ? (
                    <>
                      <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/85">
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
                                <TableCell className="font-semibold text-slate-900 max-w-[200px] truncate" title={job.title}>{job.title}</TableCell>
                                <TableCell className="text-slate-700 max-w-[150px] truncate" title={job.company || ""}>{job.company || "-"}</TableCell>
                                <TableCell className="text-slate-500 text-xs">{formatModeratorDate(job.deletedAt)}</TableCell>
                                <TableCell>
                                  <div className="flex justify-center gap-2">
                                    <ActionIconButton
                                      icon={RotateCcw}
                                      label={t("admin.jobs.restore")}
                                      variantStyle="restore"
                                      disabled={actionId === job.id}
                                      onClick={(e) => handleRestoreJob(job, e)}
                                    />
                                    <ActionIconButton
                                      icon={Trash2}
                                      label={t("admin.jobs.deletePermanent")}
                                      variantStyle="delete"
                                      disabled={actionId === job.id}
                                      onClick={(e) => handleDeleteJobPermanently(job, e)}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
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
                      <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/85">
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
                            {paginatedJobs.items.map((job) => {
                              const statusVal = normalizeReviewStatus(job.status);
                              return (
                                <TableRow
                                  key={job.id}
                                  className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                  onClick={() => navigate(`/jobs/${job.id}`)}
                                >
                                  <TableCell className="font-semibold text-slate-900 max-w-[200px] truncate">{job.title}</TableCell>
                                  <TableCell className="text-slate-700">{job.company || "-"}</TableCell>
                                  <TableCell className="text-slate-600 max-w-[150px] truncate">
                                    {job.employerEmail || job.employerName || job.recruiterName || "-"}
                                  </TableCell>
                                  <TableCell className="text-slate-500 text-xs">
                                    {formatModeratorDate(job.createdAt)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={`${getReviewStatusBadgeClassName(job.status)} font-medium`}>
                                      {t(`admin.jobs.statuses.${statusVal}`, { defaultValue: statusVal })}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="w-28 text-center">
                                    <div className="flex justify-center">
                                      <span
                                        className={`inline-flex items-center justify-center ${
                                          job.hidden ? "text-red-700" : "text-emerald-700"
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
                                        onClick={(e) => handleToggleJobHidden(job, e)}
                                      />
                                      {statusVal === "PENDING" ? (
                                        <>
                                          <ActionIconButton
                                            icon={CheckCircle2}
                                            label={t("admin.jobs.approve")}
                                            variantStyle="approve"
                                            disabled={actionId === job.id}
                                            onClick={(e) => handleApproveJob(job, e)}
                                          />
                                          <ActionIconButton
                                            icon={XCircle}
                                            label={t("admin.jobs.reject")}
                                            variantStyle="reject"
                                            disabled={actionId === job.id}
                                            onClick={(e) => handleRejectJob(job, e)}
                                          />
                                        </>
                                      ) : (
                                        <ActionIconButton
                                          icon={Trash2}
                                          label={t("admin.jobs.moveToTrash")}
                                          variantStyle="delete"
                                          disabled={actionId === job.id}
                                          onClick={(e) => handleTrashJob(job, e)}
                                        />
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <PaginationControls
                        page={paginatedJobs.page}
                        totalPages={paginatedJobs.totalPages}
                        onPageChange={setJobPage}
                        pageSize={jobPageSize}
                        onPageSizeChange={setJobPageSize}
                      />
                    </>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
        </div>
        {/* Companies Card */}
        <div ref={companyListRef} className="scroll-mt-6 mt-8">
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader
              role="button"
              tabIndex={0}
              aria-expanded={showCompanyRequests}
              aria-label={t(showCompanyRequests ? "common.collapse" : "common.expand", {
                defaultValue: showCompanyRequests ? t("moderator.collapse") : t("moderator.expand"),
              })}
              className="flex cursor-pointer flex-row items-center justify-between space-y-0 pb-4 transition hover:bg-slate-50"
              onClick={() => setShowCompanyRequests((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setShowCompanyRequests((current) => !current);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">
                  {t("moderator.companies.title")}
                </CardTitle>
              </div>
              <Button
                type="button"
                tabIndex={-1}
                variant="ghost"
                size="icon"
                className="pointer-events-none h-9 w-9 text-slate-600 hover:bg-slate-100"
                aria-label={t(showCompanyRequests ? "common.collapse" : "common.expand", {
                  defaultValue: showCompanyRequests ? t("moderator.collapse") : t("moderator.expand"),
                })}
                aria-expanded={showCompanyRequests}
                onClick={() => setShowCompanyRequests((current) => !current)}
              >
                {showCompanyRequests ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardHeader>
            {showCompanyRequests && (
            <CardContent>
              {/* Search & Filters */}
              <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                <div className="flex flex-1 items-center gap-2 max-w-md">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder={t("moderator.companies.searchPlaceholder")}
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="pl-9 h-10 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-10 bg-white">
                      <SelectValue placeholder={t("admin.jobs.filters.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t("moderator.companies.allStatuses")}</SelectItem>
                      <SelectItem value="PENDING">{t("admin.jobs.statuses.PENDING")}</SelectItem>
                      <SelectItem value="APPROVED">{t("admin.jobs.statuses.APPROVED")}</SelectItem>
                      <SelectItem value="REJECTED">{t("admin.jobs.statuses.REJECTED")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="cta"
                    onClick={() => {
                      setAppSearch("");
                      setAppStatusFilter("ALL");
                    }}
                    className="w-auto"
                    disabled={!appSearch && appStatusFilter === "ALL"}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t("jobs.filters.reset")}
                  </Button>
                </div>
              </div>

              {loadingApps ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center text-sm text-slate-500 bg-slate-50/50">
                  {t("moderator.companies.empty")}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50/85">
                        <TableRow>
                          <TableHead>{renderAppSortableHeader("applicant", t("moderator.companies.applicant"))}</TableHead>
                          <TableHead>{renderAppSortableHeader("companyName", t("moderator.companies.companyName"))}</TableHead>
                          <TableHead>{renderAppSortableHeader("taxCode", t("moderator.companies.taxCode"))}</TableHead>
                          <TableHead>{renderAppSortableHeader("createdAt", t("moderator.companies.submittedDate"))}</TableHead>
                          <TableHead>{renderAppSortableHeader("status", t("common.status"))}</TableHead>
                          <TableHead className="text-center">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedApps.items.map((app) => {
                          const statusVal = normalizeReviewStatus(app.status);
                          const companyName = app.formData?.companyDisplayName || app.formData?.companyFullName || "-";
                          const taxCode = app.formData?.taxCode || "-";
                          return (
                            <TableRow
                              key={app.id}
                              className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                              onClick={() => navigate(`/admin/company-reviews/${encodeURIComponent(String(app.id))}`)}
                            >
                              <TableCell className="font-medium text-slate-800 truncate max-w-[180px]">{app.applicantEmail}</TableCell>
                              <TableCell className="font-semibold text-slate-900 truncate max-w-[200px]">{companyName}</TableCell>
                              <TableCell className="text-slate-600 text-xs font-mono">{taxCode}</TableCell>
                              <TableCell className="text-slate-500 text-xs">
                                {formatModeratorDate(app.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`${getReviewStatusBadgeClassName(app.status)} font-medium`}>
                                  {t(`admin.jobs.statuses.${statusVal}`, { defaultValue: statusVal })}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center">
                                  <ActionIconButton
                                    icon={Eye}
                                    label={t("common.details")}
                                    variantStyle="view"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/admin/company-reviews/${encodeURIComponent(String(app.id))}`);
                                    }}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <PaginationControls
                    page={paginatedApps.page}
                    totalPages={paginatedApps.totalPages}
                    onPageChange={setAppPage}
                    pageSize={appPageSize}
                    onPageSizeChange={setAppPageSize}
                  />
                </div>
              )}
            </CardContent>
            )}
          </Card>
        </div>
      </section>

      <AlertDialog
        open={Boolean(jobPendingTrash)}
        onOpenChange={(open) => {
          if (!open && actionId !== jobPendingTrash?.id) {
            setJobPendingTrash(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recruiter.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("recruiter.deleteDialog.description", { title: jobPendingTrash?.title || "-" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === jobPendingTrash?.id}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionId === jobPendingTrash?.id}
              onClick={confirmTrashJob}
            >
              {t("recruiter.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(jobPendingPermanentDelete)}
        onOpenChange={(open) => {
          if (!open && actionId !== jobPendingPermanentDelete?.id) {
            setJobPendingPermanentDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.jobs.deletePermanent")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{t("admin.deleteJobConfirm")}</span>
              {jobPendingPermanentDelete && (
                <span className="block font-medium text-foreground">
                  {jobPendingPermanentDelete.title}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === jobPendingPermanentDelete?.id}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionId === jobPendingPermanentDelete?.id}
              onClick={confirmDeleteJobPermanently}
            >
              {t("admin.jobs.deletePermanent")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Selected Job Detail Modal */}
      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("admin.jobDialog.title")}</DialogTitle>
            <DialogDescription>{t("admin.jobDialog.description")}</DialogDescription>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4 text-sm mt-2">
              <div className="grid gap-4 md:grid-cols-2 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div>
                  <strong className="text-slate-500 block text-xs font-medium uppercase mb-0.5">
                    {t("admin.jobs.titleColumn")}
                  </strong>
                  <span className="text-slate-900 font-semibold text-sm">{selectedJob.title}</span>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs font-medium uppercase mb-0.5">
                    {t("common.company")}
                  </strong>
                  <span className="text-slate-900 font-semibold text-sm">{selectedJob.company || "-"}</span>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs font-medium uppercase mb-0.5">
                    {t("common.recruiter")}
                  </strong>
                  <span className="text-slate-900 text-sm">
                    {selectedJob.employerEmail || selectedJob.employerName || selectedJob.recruiterName || "-"}
                  </span>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs font-medium uppercase mb-0.5">
                    {t("admin.jobDialog.location")}
                  </strong>
                  <span className="text-slate-900 text-sm">{selectedJob.location || "-"}</span>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs font-medium uppercase mb-0.5">
                    {t("common.type")}
                  </strong>
                  <span className="text-slate-900 text-sm">{selectedJob.type || "-"}</span>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs font-medium uppercase mb-0.5">
                    {t("common.salary")}
                  </strong>
                  <span className="text-slate-900 text-sm">{selectedJob.salary || "-"}</span>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs font-medium uppercase mb-0.5">
                    {t("recruiter.form.experience")}
                  </strong>
                  <span className="text-slate-900 text-sm">{selectedJob.experience || "-"}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <strong className="text-slate-600 text-xs font-semibold uppercase">{t("common.description")}</strong>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 border border-slate-100 text-slate-700 leading-relaxed text-sm max-h-60 overflow-y-auto">
                  {selectedJob.description || "-"}
                </p>
              </div>

              {/* Company Gallery */}
              <div className="space-y-1.5 text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-455" />
                  {t("recruiterVerification.sections.gallery")}
                </span>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {parseJsonArray<string>(selectedApplication.formData?.galleryUrls).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block group">
                      <div className="aspect-video w-full rounded-lg border border-slate-100 overflow-hidden bg-slate-50 relative">
                        <img
                          src={url}
                          alt={`Gallery ${i}`}
                          className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                        />
                      </div>
                    </a>
                  ))}
                  {parseJsonArray<string>(selectedApplication.formData?.galleryUrls).length === 0 && (
                    <span className="text-slate-400 text-xs italic">
                      {t("moderator.companies.emptyGallery")}
                    </span>
                  )}
                </div>
              </div>

              {/* Moderation Actions / Reason input */}
              {normalizeReviewStatus(selectedApplication.status) === "PENDING" ? (
                <div className="space-y-2 border-t border-slate-150 pt-4">
                  <Label htmlFor="review-reason" className="font-bold text-slate-700">
                    {t("moderator.companies.reviewNote")}
                  </Label>
                  <Textarea
                    id="review-reason"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder={t("moderator.companies.reviewNotePlaceholder", {
                      defaultValue: t("moderator.rejectReasonPlaceholder"),
                    })}
                    rows={3}
                    className="rounded-xl border-slate-200"
                  />
                </div>
              ) : (
                selectedApplication.reviewNote && (
                  <div className="space-y-1.5 border-t border-slate-150 pt-4 text-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase block">
                      {t("moderator.companies.reviewNote")}
                    </span>
                    <p className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-slate-700 text-xs whitespace-pre-wrap italic">
                      {selectedApplication.reviewNote}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-4">
            {selectedJob && (
              <div className="flex gap-2 w-full sm:w-auto mr-auto">
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => handleToggleJobHidden(selectedJob)}
                  disabled={actionId === selectedJob.id}
                >
                  {selectedJob.hidden ? <Eye className="h-4 w-4 mr-1.5" /> : <EyeOff className="h-4 w-4 mr-1.5" />}
                  {t(selectedJob.hidden ? "recruiter.jobs.show" : "recruiter.jobs.hide")}
                </Button>
              </div>
            )}
            {selectedJob && normalizeReviewStatus(selectedJob.status) === "PENDING" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => handleRejectJob(selectedJob)}
                  disabled={actionId === selectedJob.id}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  {t("admin.jobs.reject")}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleApproveJob(selectedJob)}
                  disabled={actionId === selectedJob.id}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {t("admin.jobs.approve")}
                </Button>
              </div>
            )}
            {selectedJob && normalizeReviewStatus(selectedJob.status) !== "PENDING" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => handleTrashJob(selectedJob)}
                  disabled={actionId === selectedJob.id}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {t("admin.jobs.moveToTrash")}
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={() => setSelectedJob(null)} className="border-slate-200">
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Selected Company Verification Application Detail Modal */}
      <Dialog open={Boolean(selectedApplication)} onOpenChange={(open) => !open && setSelectedApplication(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t("moderator.companies.dialogTitle")}
            </DialogTitle>
            <DialogDescription>{selectedApplication?.applicantEmail}</DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6 mt-4">
              {/* Branding Section */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    {t("recruiterVerification.fields.logo")}
                  </span>
                  {selectedApplication.formData?.logoUrl ? (
                    <div className="rounded-xl border border-slate-100 p-2 bg-slate-50/50 flex justify-center items-center h-40">
                      <img
                        src={selectedApplication.formData.logoUrl}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="h-40 rounded-xl border border-dashed flex items-center justify-center text-slate-400 bg-slate-50 text-xs">
                      {t("common.emptyValue")}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    {t("recruiterVerification.fields.cover")}
                  </span>
                  {selectedApplication.formData?.coverUrl ? (
                    <div className="rounded-xl border border-slate-100 p-2 bg-slate-50/50 flex justify-center items-center h-40">
                      <img
                        src={selectedApplication.formData.coverUrl}
                        alt="Cover"
                        className="max-h-full w-full object-cover rounded-lg shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="h-40 rounded-xl border border-dashed flex items-center justify-center text-slate-400 bg-slate-50 text-xs">
                      {t("common.emptyValue")}
                    </div>
                  )}
                </div>
              </div>

              {/* Legal Info */}
              <Card className="border border-slate-100 bg-slate-50/30">
                <CardHeader className="py-3 bg-slate-50/80 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    {t("recruiterVerification.sections.legal")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 p-4 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block mb-0.5">
                      {t("recruiterVerification.fields.companyFullName")}
                    </span>
                    <span className="text-slate-900 font-semibold">
                      {selectedApplication.formData?.companyFullName || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block mb-0.5">
                      {t("recruiterVerification.fields.companyDisplayName")}
                    </span>
                    <span className="text-slate-900 font-semibold">
                      {selectedApplication.formData?.companyDisplayName || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block mb-0.5">
                      {t("recruiterVerification.fields.taxCode")}
                    </span>
                    <span className="text-slate-800 font-mono font-medium">
                      {selectedApplication.formData?.taxCode || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block mb-0.5">
                      {t("recruiterVerification.fields.companyPhone")}
                    </span>
                    <span className="text-slate-850 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-450" />
                      {selectedApplication.formData?.companyPhone || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block mb-0.5">
                      {t("recruiterVerification.fields.companySize")}
                    </span>
                    <span className="text-slate-800">
                      {selectedApplication.formData?.companySize
                        ? t(`recruiterVerification.companySizes.${selectedApplication.formData.companySize}`, {
                            defaultValue: selectedApplication.formData.companySize,
                          })
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block mb-0.5">
                      {t("recruiterVerification.fields.companyWebsite")}
                    </span>
                    {selectedApplication.formData?.companyWebsite ? (
                      <a
                        href={selectedApplication.formData.companyWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {selectedApplication.formData.companyWebsite}
                      </a>
                    ) : (
                      "-"
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-400 text-xs block mb-0.5">
                      {t("recruiterVerification.fields.billingAddress")}
                    </span>
                    <span className="text-slate-800">{selectedApplication.formData?.billingAddress || "-"}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-400 text-xs block mb-0.5">
                      {t("recruiterVerification.fields.companyIntro")}
                    </span>
                    <p className="text-slate-700 bg-white border border-slate-100 p-3 rounded-lg text-sm whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                      {selectedApplication.formData?.companyIntro || "-"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Addresses */}
              <div className="space-y-1.5 text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-455" />
                  {t("recruiterVerification.sections.addresses")}
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {parseJsonArray<CompanyAddress>(selectedApplication.formData?.addresses).map((address, index) => (
                    <div key={index} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm relative">
                      <div className="font-semibold text-slate-800">
                        {address.headOffice || t("recruiterVerification.addressTitle", { number: index + 1 })}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 leading-normal">
                        {[address.detail, address.district, address.province].filter(Boolean).join(", ")}
                      </div>
                      {address.isDefault && (
                        <span className="absolute top-3 right-3 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold px-2 py-0.5 rounded-full">
                          {t("recruiterVerification.fields.defaultAddressTag")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Google Map */}
              <div className="space-y-1.5 text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-455" />
                  {t("profile.mapTitle")}
                </span>
                {selectedApplication.formData?.mapUrl ? (
                  <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
                    <iframe
                      src={selectedApplication.formData.mapUrl}
                      width="100%"
                      height="320"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Google Maps"
                      className="rounded-lg"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-muted-foreground">
                    <MapPin className="mb-2 h-7 w-7 opacity-40 text-muted-foreground" />
                    <p className="text-sm">{t("companyProfile.noMap")}</p>
                    {parseJsonArray<CompanyAddress>(selectedApplication.formData?.addresses).length > 0 && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          [
                            parseJsonArray<CompanyAddress>(selectedApplication.formData?.addresses)[0].detail, 
                            parseJsonArray<CompanyAddress>(selectedApplication.formData?.addresses)[0].district, 
                            parseJsonArray<CompanyAddress>(selectedApplication.formData?.addresses)[0].province
                          ].filter(Boolean).join(", ")
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                      >
                        {t("companyProfile.viewOnGoogleMaps")}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Company Gallery */}
              <div className="space-y-1.5 text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-455" />
                  {t("recruiterVerification.sections.gallery")}
                </span>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {parseJsonArray<string>(selectedApplication.formData?.galleryUrls).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block group">
                      <div className="aspect-video w-full rounded-lg border border-slate-100 overflow-hidden bg-slate-50 relative">
                        <img
                          src={url}
                          alt={`Gallery ${i}`}
                          className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                        />
                      </div>
                    </a>
                  ))}
                  {parseJsonArray<string>(selectedApplication.formData?.galleryUrls).length === 0 && (
                    <span className="text-slate-400 text-xs italic">
                      {t("moderator.companies.emptyGallery")}
                    </span>
                  )}
                </div>
              </div>

              {/* Moderation Actions / Reason input */}
              {normalizeReviewStatus(selectedApplication.status) === "PENDING" ? (
                <div className="space-y-2 border-t border-slate-150 pt-4">
                  <Label htmlFor="review-reason" className="font-bold text-slate-700">
                    {t("moderator.companies.reviewNote")}
                  </Label>
                  <Textarea
                    id="review-reason"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder={t("moderator.companies.reviewNotePlaceholder", {
                      defaultValue: t("moderator.rejectReasonPlaceholder"),
                    })}
                    rows={3}
                    className="rounded-xl border-slate-200"
                  />
                </div>
              ) : (
                selectedApplication.reviewNote && (
                  <div className="space-y-1.5 border-t border-slate-150 pt-4 text-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase block">
                      {t("moderator.companies.reviewNote")}
                    </span>
                    <p className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-slate-700 text-xs whitespace-pre-wrap italic">
                      {selectedApplication.reviewNote}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-4 mt-6">
            {selectedApplication && normalizeReviewStatus(selectedApplication.status) === "PENDING" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => handleReviewApplication(false)}
                  disabled={actionId === selectedApplication.id}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  {t("admin.requests.reject")}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleReviewApplication(true)}
                  disabled={actionId === selectedApplication.id}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {t("admin.requests.approve")}
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={() => setSelectedApplication(null)} className="border-slate-200">
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SanityPageSections routePath="/moderator" placement="bottom" />
    </main>
  );
};

export default ModeratorDashboard;
