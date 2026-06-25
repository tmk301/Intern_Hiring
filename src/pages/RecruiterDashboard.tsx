import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  History,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  CURRENCY_OPTIONS,
  JOB_TYPE_OPTIONS,
  SALARY_RANGE_OPTIONS,
  WORK_MODE_OPTIONS,
  convertVndToCurrency,
  defaultJobFilterOptions,
  getCurrencyCode,
  getSalaryRangeOption,
  type SalaryRangeOption,
} from "@/components/jobs/jobFilterConfig";
import { isRecruiterRole } from "@/lib/roles";
import { recruiterApi, CandidateApplication, CompanyProfile, isApiError, type RecruiterJobChangeLog, type RecruiterJobSnapshot, type RecruiterApplication } from "@/lib/api";
import { getReviewStatusBadgeClassName, getReviewStatusTranslationKey, getRoleBadgeClassName, getRoleBadgeDarkClassName, normalizeRoleName } from "@/lib/dashboardStyles";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { paginateItems } from "@/lib/pagination";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useSanityInterfaceText } from "@/lib/sanityInterfaceText";

type JobSortKey = "title" | "company" | "type" | "applicationDeadline" | "status" | "createdAt";
type ApplicationSortKey = "applicant" | "jobTitle" | "status" | "appliedAt";
type SortDirection = "asc" | "desc";

type RecruiterJob = {
  id: string | number;
  company: string | null;
  created_at: string | null;
  deleted_at: string | null;
  description: string | null;
  employer_email: string | null;
  employer_name: string | null;
  location: string | null;
  salary: string | null;
  currency: string | null;
  mode: string | null;
  experience: string | null;
  status: string | null;
  hidden: boolean;
  title: string | null;
  type: string | null;
  updated_at: string | null;
  applicationDeadline: string | null;
};

type JobHistoryVersion = {
  id: string;
  label: string;
  data: RecruiterJobSnapshot;
  changedFields: Array<keyof RecruiterJobSnapshot>;
  createdAt?: string;
};

type JobSnapshotField = keyof RecruiterJobSnapshot;

const JOB_SNAPSHOT_FIELDS: JobSnapshotField[] = [
  "title",
  "location",
  "type",
  "salary",
  "experience",
  "applicationDeadline",
  "description",
];

type JobFormValue = {
  title: string;
  company: string;
  employerName: string;
  employerEmail: string;
  location: string;
  streetNumber: string;
  streetName: string;
  city: string;
  ward: string;
  salaryRange: string;
  currency: string;
  applicationDeadline: string;
  workMode: string;
  jobType: string;
  experience: string;
  description: string;
};

type CompanyAddressRecord = {
  headOffice?: string;
  province?: string;
  district?: string;
  detail?: string;
  isDefault?: boolean;
};

type CompanyAddressOption = {
  value: string;
  label: string;
  isDefault: boolean;
};

const emptyJobFormValue: JobFormValue = {
  title: "",
  company: "",
  employerName: "",
  employerEmail: "",
  location: "",
  streetNumber: "",
  streetName: "",
  city: "",
  ward: "",
  salaryRange: "",
  currency: "",
  applicationDeadline: "",
  workMode: "",
  jobType: "",
  experience: "",
  description: "",
};

const formatCurrencyAmount = (value: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);

const normalizeStatus = (status?: string | null) => status?.trim().toUpperCase() || "PENDING";

const isHiddenJob = (job: RecruiterJob) => job.hidden;

const isDeletedJob = (job: RecruiterJob) => Boolean(job.deleted_at);

const formatDate = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
};

const formatDateOnly = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(locale);
};

const getLocalDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTimeValue = (value?: string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const parseCompanyAddresses = (value?: string | null): CompanyAddressRecord[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatCompanyAddressOption = (address: CompanyAddressRecord): string => {
  return [address.headOffice, address.detail, address.district, address.province]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(", ");
};

const getJobStatusSortValue = (job: RecruiterJob) =>
  job.hidden ? "HIDDEN" : normalizeStatus(job.status);

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

const compareJobs = (first: RecruiterJob, second: RecruiterJob, key: JobSortKey, direction: SortDirection) => {
  switch (key) {
    case "title":
      return compareNullable(first.title, second.title, direction);
    case "company":
      return compareNullable(first.company, second.company, direction);
    case "type":
      return compareNullable(first.type, second.type, direction);
    case "applicationDeadline":
      return compareNullable(getTimeValue(first.applicationDeadline), getTimeValue(second.applicationDeadline), direction);
    case "status":
      return compareNullable(getJobStatusSortValue(first), getJobStatusSortValue(second), direction);
    case "createdAt":
      return compareNullable(getTimeValue(first.created_at), getTimeValue(second.created_at), direction);
    default:
      return 0;
  }
};

const compareApplications = (
  first: CandidateApplication,
  second: CandidateApplication,
  key: ApplicationSortKey,
  direction: SortDirection,
) => {
  switch (key) {
    case "applicant":
      return compareNullable(
        `${first.applicantName ?? ""} ${first.applicantEmail ?? ""}`.trim(),
        `${second.applicantName ?? ""} ${second.applicantEmail ?? ""}`.trim(),
        direction,
      );
    case "jobTitle":
      return compareNullable(first.jobTitle, second.jobTitle, direction);
    case "status":
      return compareNullable(first.status, second.status, direction);
    case "appliedAt":
      return compareNullable(getTimeValue(first.appliedAt), getTimeValue(second.appliedAt), direction);
    default:
      return 0;
  }
};

const RecruiterDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const uiText = useSanityInterfaceText("/recruiter");
  const navigate = useNavigate();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [formValue, setFormValue] = useState<JobFormValue>(emptyJobFormValue);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [pendingCompanyApplication, setPendingCompanyApplication] = useState<RecruiterApplication | undefined>();
  const [loadingCompanyProfile, setLoadingCompanyProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [jobPendingDelete, setJobPendingDelete] = useState<RecruiterJob | null>(null);
  const [isJobFormOpen, setIsJobFormOpen] = useState(true);
  const [isJobListOpen, setIsJobListOpen] = useState(true);
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(true);
  const [editingJob, setEditingJob] = useState<RecruiterJob | null>(null);
  const [historyJob, setHistoryJob] = useState<RecruiterJob | null>(null);
  const [jobHistory, setJobHistory] = useState<RecruiterJobChangeLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
      const setUrlPage = (key: string, page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, String(page));
    setSearchParams(next);
  };
  const [jobSort, setJobSort] = useState<{ key: JobSortKey; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });
  const [applicationSort, setApplicationSort] = useState<{ key: ApplicationSortKey; direction: SortDirection }>({
    key: "appliedAt",
    direction: "desc",
  });
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);
  const [applicationPage, setApplicationPage] = useState(1);
  const [applicationPageSize, setApplicationPageSize] = useState(10);

  // State quản lý ứng viên
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const [jobSearch, setJobSearch] = useState("");
  const [appSearch, setAppSearch] = useState("");

  // State bộ lọc bài đăng của tôi
  const [jobFilterStatus, setJobFilterStatus] = useState<string>("ALL");
  const [jobFilterCreatedAt, setJobFilterCreatedAt] = useState<string>("");
  const [jobFilterDeadline, setJobFilterDeadline] = useState<string>("");

  // State bộ lọc hồ sơ ứng tuyển
  const [appFilterStatus, setAppFilterStatus] = useState<string>("ALL");
  const [appFilterAppliedAt, setAppFilterAppliedAt] = useState<string>("");

  // Refs to cards for scrolling
  const jobListRef = useRef<HTMLDivElement>(null);
  const applicationsRef = useRef<HTMLDivElement>(null);

  const scrollToElement = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      const offset = 80; // offset of sticky navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = ref.current.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const recruiterEmail = user?.email ?? "";
  const recruiterName = useMemo(
    () => [user?.lastName, user?.firstName].filter(Boolean).join(" ").trim() || recruiterEmail,
    [recruiterEmail, user?.firstName, user?.lastName],
  );
  const companyAddressOptions = useMemo<CompanyAddressOption[]>(() => {
    if (!companyProfile) return [];

    const parsedOptions = parseCompanyAddresses(companyProfile.addresses)
      .map((address) => {
        const label = formatCompanyAddressOption(address);
        return label ? { value: label, label, isDefault: Boolean(address.isDefault) } : null;
      })
      .filter((option): option is CompanyAddressOption => Boolean(option));

    if (parsedOptions.length > 0) return parsedOptions;

    const billingAddress = companyProfile.billingAddress?.trim();
    return billingAddress ? [{ value: billingAddress, label: billingAddress, isDefault: true }] : [];
  }, [companyProfile]);
  const registeredCompanyName = companyProfile?.companyDisplayName || companyProfile?.companyFullName || "";
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const visibleJobs = useMemo(() => jobs.filter((job) => !isHiddenJob(job)), [jobs]);
  const hiddenJobs = useMemo(() => jobs.filter(isHiddenJob), [jobs]);
  const acceptedApplications = useMemo(
    () => applications.filter((application) => application.status === "ACCEPTED"),
    [applications],
  );
  const rejectedApplications = useMemo(
    () => applications.filter((application) => application.status === "REJECTED"),
    [applications],
  );
  const sortedJobs = useMemo(
    () => [...jobs].sort((first, second) => compareJobs(first, second, jobSort.key, jobSort.direction)),
    [jobSort.direction, jobSort.key, jobs],
  );

  useEffect(() => {
    setJobPage(1);
  }, [jobSort.direction, jobSort.key, jobSearch]);

  useEffect(() => {
    setApplicationPage(1);
  }, [applicationSort.direction, applicationSort.key, appSearch]);

  const filteredJobs = useMemo(() => {
    return sortedJobs.filter((job) => {
      if (jobFilterStatus !== "ALL") {
        const hidden = isHiddenJob(job);
        if (jobFilterStatus === "VISIBLE") {
          if (hidden) return false;
        } else if (jobFilterStatus === "HIDDEN") {
          if (!hidden) return false;
        } else {
          const normalized = normalizeStatus(job.status);
          if (normalized !== jobFilterStatus) return false;
        }
      }

      if (jobFilterCreatedAt) {
        if (!job.created_at || !job.created_at.startsWith(jobFilterCreatedAt)) {
          return false;
        }
      }

      if (jobFilterDeadline) {
        if (!job.applicationDeadline || job.applicationDeadline !== jobFilterDeadline) {
          return false;
        }
      }

      if (jobSearch) {
        const titleMatches = job.title?.toLowerCase().includes(jobSearch.toLowerCase());
        const typeMatches = job.type?.toLowerCase().includes(jobSearch.toLowerCase());
        if (!titleMatches && !typeMatches) return false;
      }

      return true;
    });
  }, [sortedJobs, jobFilterStatus, jobFilterCreatedAt, jobFilterDeadline, jobSearch]);

  const sortedApplications = useMemo(
    () =>
      [...applications].sort((first, second) =>
        compareApplications(first, second, applicationSort.key, applicationSort.direction),
      ),
    [applicationSort.direction, applicationSort.key, applications],
  );

  const filteredApplications = useMemo(() => {
    return sortedApplications.filter((app) => {
      if (appFilterStatus !== "ALL") {
        if (appFilterStatus === "ACCEPTED") {
          if (app.status !== "ACCEPTED") return false;
        } else if (appFilterStatus === "PENDING") {
          if (app.status !== "PENDING" && app.status !== "REVIEWED") return false;
        } else {
          if (app.status !== appFilterStatus) return false;
        }
      }

      if (appFilterAppliedAt) {
        if (!app.appliedAt || !app.appliedAt.startsWith(appFilterAppliedAt)) {
          return false;
        }
      }

      if (appSearch) {
        const nameMatches = app.applicantName?.toLowerCase().includes(appSearch.toLowerCase());
        const emailMatches = app.applicantEmail?.toLowerCase().includes(appSearch.toLowerCase());
        const titleMatches = app.jobTitle?.toLowerCase().includes(appSearch.toLowerCase());
        if (!nameMatches && !emailMatches && !titleMatches) return false;
      }

      return true;
    });
  }, [sortedApplications, appFilterStatus, appFilterAppliedAt, appSearch]);

  const paginatedJobs = useMemo(
    () => paginateItems(filteredJobs, jobPage, jobPageSize),
    [jobPage, jobPageSize, filteredJobs],
  );
  const paginatedApplications = useMemo(
    () => paginateItems(filteredApplications, applicationPage, applicationPageSize),
    [applicationPage, applicationPageSize, filteredApplications],
  );

  const resetForm = useCallback(() => {
    const defaultAddress = companyAddressOptions.find((option) => option.isDefault) || companyAddressOptions[0];

    setFormValue({
      ...emptyJobFormValue,
      company: registeredCompanyName,
      employerName: recruiterName,
      employerEmail: recruiterEmail,
      location: defaultAddress?.value || "",
    });
  }, [companyAddressOptions, recruiterEmail, recruiterName, registeredCompanyName]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    setJobPage(1);
  }, [jobSort.direction, jobSort.key, jobFilterStatus, jobFilterCreatedAt, jobFilterDeadline]);

  useEffect(() => {
    setApplicationPage(1);
  }, [applicationSort.direction, applicationSort.key, appFilterStatus, appFilterAppliedAt]);

  useEffect(() => {
    if (!token) {
      setCompanyProfile(null);
      setPendingCompanyApplication(undefined);
      setLoadingCompanyProfile(false);
      return;
    }

    let mounted = true;
    setLoadingCompanyProfile(true);

    Promise.allSettled([
      recruiterApi.getCompanyProfile(token),
      recruiterApi.getPendingApplication(token),
    ])
      .then(([companyResult, pendingResult]) => {
        if (!mounted) return;

        if (companyResult.status === "fulfilled") {
          setCompanyProfile(companyResult.value);
        } else {
          setCompanyProfile(null);
          const error = companyResult.reason as unknown;
          if (!isApiError(error) || (error.status !== 400 && error.status !== 404)) {
            toast.error(error instanceof Error ? error.message : t("recruiter.toast.companyProfileLoadError"));
          }
        }

        setPendingCompanyApplication(pendingResult.status === "fulfilled" ? pendingResult.value : undefined);
      })
      .finally(() => {
        if (mounted) setLoadingCompanyProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [t, token]);

  // Load danh sách công việc
  const loadJobs = useCallback(async () => {
    if (!recruiterEmail || !token) {
      setJobs([]);
      setLoadingJobs(false);
      return;
    }

    setLoadingJobs(true);
    try {
      const data = await recruiterApi.listJobs(token);
      setJobs((data ?? []).filter((job) => !isDeletedJob(job)));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.loadError"));
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, [recruiterEmail, t, token]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Load danh sách ứng viên (Dựa trên mảng jobs đã có)
  const loadApplications = useCallback(async () => {
    if (!token) return;

    if (jobs.length === 0) {
      setApplications([]);
      setLoadingApps(false);
      return;
    }

    setLoadingApps(true);
    try {
      // Gọi API lấy danh sách ứng viên cho từng công việc
      const promises = jobs.map(job =>
        recruiterApi.listJobApplications(token, job.id).catch(() => [])
      );

      const results = await Promise.all(promises);
      const allApplications = results.flat();

      // Sắp xếp mới nhất lên đầu
      allApplications.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

      setApplications(allApplications);
    } catch (error: unknown) {
      toast.error(t("recruiter.toast.loadApplicationsError"));
    } finally {
      setLoadingApps(false);
    }
  }, [token, jobs]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Xử lý Duyệt/Từ chối hồ sơ
  const handleUpdateAppStatus = async (jobId: string | number, appId: string | number, newStatus: CandidateApplication["status"]) => {
    if (!token) return;
    setActionId(appId);
    try {
      await recruiterApi.updateApplicationStatus(token, jobId, appId, newStatus);
      toast.success(t("recruiter.toast.updateApplicationStatusSuccess"));
      await loadApplications();
    } catch (error: unknown) {
      toast.error(t("recruiter.toast.updateApplicationStatusError"));
    } finally {
      setActionId(null);
    }
  };

  const updateFormValue = (field: keyof JobFormValue, value: string) => {
    setFormValue((current) => ({ ...current, [field]: value }));
  };

  const getExperienceLabel = (value: string) => {
    const option = defaultJobFilterOptions.experience.find((item) => item.value === value);
    if (!option) return value;
    return option.labelKey ? t(option.labelKey, { defaultValue: option.label }) : option.label;
  };

  const getSalaryRangeLabel = (option: SalaryRangeOption) => {
    const currency = getCurrencyCode(formValue.currency);
    if (currency === "VND") return t(option.labelKey);

    const min = convertVndToCurrency(option.minVnd, currency);
    const max = option.maxVnd === null ? null : convertVndToCurrency(option.maxVnd, currency);

    if (max === null) return t("jobs.filters.options.salaryRanges.usdFrom", { amount: formatCurrencyAmount(min) });
    if (option.minVnd === 0) return t("jobs.filters.options.salaryRanges.usdUnder", { amount: formatCurrencyAmount(max) });
    return t("jobs.filters.options.salaryRanges.usdBetween", {
      min: formatCurrencyAmount(min),
      max: formatCurrencyAmount(max),
    });
  };

  const validateForm = () => {
    const requiredFields: Array<keyof JobFormValue> = [
      "title",
      "company",
      "employerName",
      "employerEmail",
      "location",
      "applicationDeadline",
      "workMode",
      "jobType",
      "experience",
      "description",
    ];

    if (!editingJob) requiredFields.push("salaryRange", "currency");

    return Boolean(companyProfile) && requiredFields.every((field) => formValue[field].trim().length > 0);
  };

  const buildJobPayload = () => ({
    title: formValue.title.trim(),
    company: formValue.company.trim(),
    employerName: formValue.employerName.trim(),
    location: formValue.location.trim(),
    type: formValue.jobType,
    salary: formValue.salaryRange,
    currency: formValue.currency,
    mode: formValue.workMode,
    experience: formValue.experience,
    applicationDeadline: formValue.applicationDeadline,
    description: formValue.description.trim(),
  });

  const startEditJob = (job: RecruiterJob) => {
    setEditingJob(job);
    setIsJobFormOpen(true);
    setFormValue({
      ...emptyJobFormValue,
      title: job.title || "",
      company: job.company || registeredCompanyName,
      employerName: job.employer_name || recruiterName,
      employerEmail: job.employer_email || recruiterEmail,
      location: job.location || "",
      salaryRange: job.salary || "",
      currency: job.currency || "",
      applicationDeadline: job.applicationDeadline || "",
      workMode: job.mode || "",
      jobType: job.type || "",
      experience: job.experience || "",
      description: job.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditJob = () => {
    setEditingJob(null);
    resetForm();
  };

  const openJobHistory = async (job: RecruiterJob) => {
    if (!token) return;

    setHistoryJob(job);
    setLoadingHistory(true);
    try {
      setJobHistory(await recruiterApi.listJobChangeLogs(token, job.id));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.loadHistoryError"));
      setJobHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getHistoryVersions = (): JobHistoryVersion[] => {
    if (!historyJob) return [];

    const currentData: RecruiterJobSnapshot = {
      title: historyJob.title || "",
      location: historyJob.location || "",
      type: historyJob.type || "",
      salary: historyJob.salary || "",
      currency: historyJob.currency || "",
      mode: historyJob.mode || "",
      experience: historyJob.experience || "",
      applicationDeadline: historyJob.applicationDeadline || "",
      description: historyJob.description || "",
    };

    return [
      {
        id: "current",
        label: t("recruiter.history.currentVersion"),
        data: currentData,
        changedFields: jobHistory[0]?.changedFields || [],
        createdAt: historyJob.updated_at || undefined,
      },
      ...jobHistory.map((log, index) => ({
        id: String(log.id),
        label: t("recruiter.history.versionLabel", { number: index + 1 }),
        data: log.previousData,
        changedFields: jobHistory[index + 1]?.changedFields || log.changedFields,
        createdAt: log.createdAt,
      })),
    ];
  };

  const handleSubmitJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error(t("recruiter.toast.required"));
      return;
    }

    if (!token) return;

    setSubmitting(true);
    try {
      if (editingJob) {
        await recruiterApi.updateJob(token, editingJob.id, buildJobPayload());
        toast.success(t("recruiter.toast.updateSuccess"));
        setEditingJob(null);
      } else {
        await recruiterApi.createJob(token, buildJobPayload());
        toast.success(t("recruiter.toast.createSuccess"));
      }
      resetForm();
      await loadJobs();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateJobHidden = async (job: RecruiterJob, hidden: boolean) => {
    if (!token) return;

    setActionId(job.id);
    try {
      const updatedJob = await recruiterApi.updateJobHidden(token, job.id, hidden);
      toast.success(updatedJob.hidden ? t("recruiter.toast.hideSuccess") : t("recruiter.toast.showSuccess"));
      await loadJobs();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.statusError"));
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobPendingDelete || !token) return;

    setActionId(jobPendingDelete.id);
    try {
      await recruiterApi.deleteJob(token, jobPendingDelete.id);
      toast.success(t("recruiter.toast.deleteSuccess"));
      setJobPendingDelete(null);
      await loadJobs();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.deleteError"));
    } finally {
      setActionId(null);
    }
  };

  const updateSort = <T extends string>(
    key: T,
    setSort: React.Dispatch<React.SetStateAction<{ key: T; direction: SortDirection }>>,
  ) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const renderSortableHeader = <T extends string>(
    key: T,
    label: string,
    sort: { key: T; direction: SortDirection },
    setSort: React.Dispatch<React.SetStateAction<{ key: T; direction: SortDirection }>>,
    className = "",
  ) => {
    const active = sort.key === key;
    const SortIcon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

    return (
      <TableHead className={className}>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-sm text-left font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => updateSort(key, setSort)}
        >
          <span>{label}</span>
          <SortIcon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
        </button>
      </TableHead>
    );
  };

  const renderJobSortableHeader = (key: JobSortKey, label: string, className = "") =>
    renderSortableHeader(key, label, jobSort, setJobSort, className);

  const renderApplicationSortableHeader = (key: ApplicationSortKey, label: string, className = "") =>
    renderSortableHeader(key, label, applicationSort, setApplicationSort, className);

  const renderApplicationAction = (application: CandidateApplication, status: "ACCEPTED" | "REJECTED") => {
    const isApprove = status === "ACCEPTED";
    const label = t(isApprove ? "recruiter.applications.approve" : "recruiter.applications.reject");
    const Icon = isApprove ? CheckCircle2 : XCircle;

    return (
      <ActionIconButton
        icon={Icon}
        label={label}
        variantStyle={isApprove ? "approve" : "reject"}
        disabled={actionId === application.id}
        onClick={() => handleUpdateAppStatus(application.jobId, application.id, status)}
      />
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

  if (!isRecruiterRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="hero-gradient text-white py-8 shadow-sm">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className={`mb-3 px-5 py-2 text-sm ${getRoleBadgeDarkClassName(user?.role)}`}>
                {t(`role.${normalizeRoleName(user?.role)}`, { defaultValue: t("recruiter.badge") })}
              </Badge>
              <h1 className="text-3xl font-bold text-white">{uiText("recruiter.title", t("recruiter.title"))}</h1>
              <p className="mt-2 max-w-3xl text-sm text-blue-100/90">{t("recruiter.description")}</p>
            </div>
            <Button type="button" variant="outline" className="bg-white text-slate-900 hover:bg-slate-50 border-transparent shadow-sm w-auto" onClick={loadJobs} disabled={loadingJobs}>
              {loadingJobs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("common.refresh")}
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8 max-w-6xl">
        {/* Thống kê */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{uiText("recruiter.stats.jobStatsTitle", t("recruiter.stats.jobStatsTitle"))}</h2>
          <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => { setJobFilterStatus("ALL"); scrollToElement(jobListRef); }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{uiText("recruiter.stats.total", t("recruiter.stats.total"))}</CardTitle>
              <Briefcase className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => { setJobFilterStatus("VISIBLE"); scrollToElement(jobListRef); }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{uiText("recruiter.stats.visible", t("recruiter.stats.visible"))}</CardTitle>
              <Eye className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{visibleJobs.length}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => { setJobFilterStatus("HIDDEN"); scrollToElement(jobListRef); }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{uiText("recruiter.stats.hidden", t("recruiter.stats.hidden"))}</CardTitle>
              <EyeOff className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{hiddenJobs.length}</div>
            </CardContent>
          </Card>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{uiText("recruiter.stats.applicantStatsTitle", t("recruiter.stats.applicantStatsTitle"))}</h2>
          <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => { setAppFilterStatus("ALL"); scrollToElement(applicationsRef); }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{uiText("recruiter.stats.totalApplicants", t("recruiter.stats.totalApplicants"))}</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => { setAppFilterStatus("ACCEPTED"); scrollToElement(applicationsRef); }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{uiText("recruiter.stats.acceptedApplicants", t("recruiter.stats.acceptedApplicants"))}</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{acceptedApplications.length}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => { setAppFilterStatus("REJECTED"); scrollToElement(applicationsRef); }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{uiText("recruiter.stats.rejectedApplicants", t("recruiter.stats.rejectedApplicants"))}</CardTitle>
              <XCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rejectedApplications.length}</div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Form tạo việc làm mới */}
        <Card>
          <CardHeader className="p-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 rounded-t-lg p-6 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setIsJobFormOpen((current) => !current)}
              aria-expanded={isJobFormOpen}
            >
              <CardTitle className="flex items-center gap-2 text-xl">
                <PlusCircle className="h-5 w-5 text-primary" />
                {editingJob ? t("recruiter.form.editTitle") : t("recruiter.form.title")}
              </CardTitle>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isJobFormOpen ? "rotate-180" : ""}`} />
            </button>
          </CardHeader>
          {isJobFormOpen && (
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmitJob}>
              {!loadingCompanyProfile && !companyProfile && (
                <div className="md:col-span-2 xl:col-span-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {t("recruiter.form.companyProfileRequired")}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-title">{t("recruiter.form.jobTitle")}</Label>
                <Input
                  id="recruiter-job-title"
                  value={formValue.title}
                  onChange={(event) => updateFormValue("title", event.target.value)}
                  placeholder={t("recruiter.form.jobTitlePlaceholder")}
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-type">{t("recruiter.form.type")}</Label>
                <Select value={formValue.jobType} onValueChange={(value) => updateFormValue("jobType", value)}>
                  <SelectTrigger id="recruiter-job-type" className="h-11 bg-white">
                    <SelectValue placeholder={t("recruiter.form.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.labelKey ? t(option.labelKey, { defaultValue: option.label }) : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-experience">{t("recruiter.form.experience")}</Label>
                <Select value={formValue.experience} onValueChange={(value) => updateFormValue("experience", value)}>
                  <SelectTrigger id="recruiter-job-experience" className="h-11 bg-white">
                    <SelectValue placeholder={t("recruiter.form.experiencePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultJobFilterOptions.experience.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.labelKey ? t(option.labelKey, { defaultValue: option.label }) : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-work-mode">{t("recruiter.form.workMode")}</Label>
                <Select value={formValue.workMode} onValueChange={(value) => updateFormValue("workMode", value)}>
                  <SelectTrigger id="recruiter-job-work-mode" className="h-11 bg-white">
                    <SelectValue placeholder={t("recruiter.form.workModePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.labelKey ? t(option.labelKey, { defaultValue: option.label }) : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-employer-name">{t("recruiter.form.employerName")}</Label>
                <Input
                  id="recruiter-employer-name"
                  value={formValue.employerName}
                  readOnly
                  className="h-11 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-employer-email">{t("recruiter.form.employerEmail")}</Label>
                <Input
                  id="recruiter-employer-email"
                  value={formValue.employerEmail}
                  readOnly
                  className="h-11 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-company">{t("recruiter.form.company")}</Label>
                <Input
                  id="recruiter-job-company"
                  value={formValue.company}
                  placeholder={t("recruiter.form.companyPlaceholder")}
                  readOnly
                  className="h-11 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-application-deadline">{t("recruiter.form.applicationDeadline")}</Label>
                <Input
                  id="recruiter-job-application-deadline"
                  type="date"
                  value={formValue.applicationDeadline}
                  min={getLocalDateInputValue()}
                  onChange={(event) => updateFormValue("applicationDeadline", event.target.value)}
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="recruiter-job-location">{t("recruiter.form.location")}</Label>
                <Select
                  value={formValue.location}
                  onValueChange={(value) => updateFormValue("location", value)}
                  disabled={loadingCompanyProfile || companyAddressOptions.length === 0}
                >
                  <SelectTrigger id="recruiter-job-location" className="h-11 bg-white">
                    <SelectValue
                      placeholder={
                        loadingCompanyProfile
                          ? t("common.loading")
                          : t("recruiter.form.branchPlaceholder")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {companyAddressOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("recruiter.form.companyLockedHint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-currency">{t("recruiter.form.currency")}</Label>
                <Select value={formValue.currency} onValueChange={(value) => updateFormValue("currency", value)}>
                  <SelectTrigger id="recruiter-job-currency" className="h-11 bg-white">
                    <SelectValue placeholder={t("recruiter.form.currencyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.labelKey ? t(option.labelKey, { defaultValue: option.label }) : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-salary-range">{t("recruiter.form.salary")}</Label>
                <Select value={formValue.salaryRange} onValueChange={(value) => updateFormValue("salaryRange", value)}>
                  <SelectTrigger id="recruiter-job-salary-range" className="h-11 bg-white">
                    <SelectValue placeholder={t("recruiter.form.salaryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {getSalaryRangeLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-4">
                <Label htmlFor="recruiter-job-description">{t("recruiter.form.jobDescription")}</Label>
                <Textarea
                  id="recruiter-job-description"
                  value={formValue.description}
                  onChange={(event) => updateFormValue("description", event.target.value)}
                  placeholder={t("recruiter.form.jobDescriptionPlaceholder")}
                  className="min-h-32 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 md:col-span-2 xl:col-span-4">
                {editingJob && (
                  <Button type="button" variant="outline" className="w-auto" onClick={cancelEditJob} disabled={submitting}>
                    {t("common.cancel")}
                  </Button>
                )}
                <Button type="submit" variant="cta" className="w-auto" disabled={submitting || loadingCompanyProfile || !companyProfile}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingJob ? <Pencil className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                  {editingJob ? t("recruiter.form.saveChanges") : t("recruiter.form.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
          )}
        </Card>

        <div ref={jobListRef}>
          <Card>
            <CardHeader className="p-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 rounded-t-lg p-6 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setIsJobListOpen((current) => !current)}
              aria-expanded={isJobListOpen}
            >
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-primary" />
                {t("recruiter.jobs.title")}
              </CardTitle>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isJobListOpen ? "rotate-180" : ""}`} />
            </button>
          </CardHeader>
          {isJobListOpen && (
          <CardContent>
            {loadingJobs ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {jobs.length > 0 && (
                  <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end border-b pb-4">
                    <div className="flex flex-1 items-center gap-2 max-w-md">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder={t("recruiter.jobs.searchPlaceholder", { defaultValue: "Tìm kiếm tiêu đề, công ty..." })}
                          value={jobSearch}
                          onChange={(e) => setJobSearch(e.target.value)}
                          className="pl-9 h-10 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={jobFilterStatus} onValueChange={setJobFilterStatus}>
                        <SelectTrigger id="job-filter-status" className="w-full sm:w-40 h-10 bg-white">
                          <SelectValue placeholder={t("recruiter.jobs.status")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t("recruiter.jobs.allStatuses")}</SelectItem>
                          <SelectItem value="VISIBLE">{t("recruiter.stats.visible")}</SelectItem>
                          <SelectItem value="HIDDEN">{t("recruiter.status.HIDDEN")}</SelectItem>
                          <SelectItem value="PENDING">{t("recruiter.status.PENDING")}</SelectItem>
                          <SelectItem value="APPROVED">{t("recruiter.status.APPROVED")}</SelectItem>
                          <SelectItem value="REJECTED">{t("recruiter.status.REJECTED")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="job-filter-created-at"
                        type="date"
                        value={jobFilterCreatedAt}
                        onChange={(e) => setJobFilterCreatedAt(e.target.value)}
                        className="w-full sm:w-40 h-10 bg-white"
                        aria-label={t("recruiter.jobs.createdAt")}
                      />
                      <Input
                        id="job-filter-deadline"
                        type="date"
                        value={jobFilterDeadline}
                        onChange={(e) => setJobFilterDeadline(e.target.value)}
                        className="w-full sm:w-40 h-10 bg-white"
                        aria-label={t("recruiter.jobs.applicationDeadline")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setJobSearch("");
                          setJobFilterStatus("ALL");
                          setJobFilterCreatedAt("");
                          setJobFilterDeadline("");
                        }}
                        className="h-10 border-slate-200 hover:bg-slate-50"
                        disabled={!jobSearch && jobFilterStatus === "ALL" && !jobFilterCreatedAt && !jobFilterDeadline}
                      >
                        {t("jobs.filters.reset")}
                      </Button>
                    </div>
                  </div>
                )}

                {jobs.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">{t("recruiter.jobs.empty")}</p>
                ) : filteredJobs.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">{t("jobs.page.emptyDescription")}</p>
                ) : (
                  <>
                  <Table>
                <TableHeader>
                  <TableRow>
                    {renderJobSortableHeader("title", t("recruiter.form.jobTitle"))}
                    {renderJobSortableHeader("type", t("recruiter.form.type"))}
                    {renderJobSortableHeader("applicationDeadline", t("recruiter.jobs.applicationDeadline"), "text-center")}
                    {renderJobSortableHeader("status", t("recruiter.jobs.status"))}
                    {renderJobSortableHeader("createdAt", t("recruiter.jobs.createdAt"))}
                    <TableHead className="text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJobs.items.map((job) => {
                    const status = normalizeStatus(job.status);
                    const hidden = isHiddenJob(job);

                    return (
                      <TableRow key={job.id} className="cursor-pointer hover:bg-slate-50/50" onClick={() => navigate(`/jobs/${job.id}`)}>
                        <TableCell className="font-semibold text-slate-900 max-w-[200px] truncate" title={job.title || ""}>{job.title || "-"}</TableCell>
                        <TableCell className="text-slate-700 max-w-[150px] truncate" title={job.type || ""}>{job.type || "-"}</TableCell>
                        <TableCell className="text-center">{formatDateOnly(job.applicationDeadline, dateLocale)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getReviewStatusBadgeClassName(job.status)}>
                            {t(`recruiter.status.${status}`, { defaultValue: status })}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">{formatDate(job.created_at, dateLocale)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-center gap-2">
                            {hidden ? (
                              <ActionIconButton
                                icon={Eye}
                                label={t("recruiter.jobs.show")}
                                variantStyle="show"
                                disabled={actionId === job.id}
                                onClick={(e) => { e.stopPropagation(); updateJobHidden(job, false); }}
                              />
                            ) : (
                              <ActionIconButton
                                icon={EyeOff}
                                label={t("recruiter.jobs.hide")}
                                variantStyle="hide"
                                disabled={actionId === job.id}
                                onClick={(e) => { e.stopPropagation(); updateJobHidden(job, true); }}
                              />
                            )}
                            <ActionIconButton
                              icon={Pencil}
                              label={t("recruiter.jobs.edit")}
                              variantStyle="show"
                              disabled={actionId === job.id}
                              onClick={(e) => { e.stopPropagation(); startEditJob(job); }}
                            />
                            <ActionIconButton
                              icon={History}
                              label={t("recruiter.jobs.history")}
                              variantStyle="hide"
                              disabled={actionId === job.id}
                              onClick={(e) => { e.stopPropagation(); openJobHistory(job); }}
                            />
                            <ActionIconButton
                              icon={Trash2}
                              label={t("recruiter.jobs.delete")}
                              variantStyle="delete"
                              disabled={actionId === job.id}
                              onClick={(e) => { e.stopPropagation(); setJobPendingDelete(job); }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginationControls
                page={paginatedJobs.page}
                totalPages={paginatedJobs.totalPages}
                onPageChange={setJobPage}
                pageSize={jobPageSize}
                onPageSizeChange={setJobPageSize}
              />
                  </>
                )}
              </>
            )}
          </CardContent>
          )}
        </Card>
      </div>

      <div ref={applicationsRef}>
        <Card>
          <CardHeader className="p-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 rounded-t-lg p-6 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setIsApplicationsOpen((current) => !current)}
              aria-expanded={isApplicationsOpen}
            >
              <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              {t("recruiter.applications.title")}
              </CardTitle>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isApplicationsOpen ? "rotate-180" : ""}`} />
            </button>
          </CardHeader>
          {isApplicationsOpen && (
          <CardContent>
            {loadingApps ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {applications.length > 0 && (
                  <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end border-b pb-4">
                    <div className="flex flex-1 items-center gap-2 max-w-md">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder={t("recruiter.applications.searchPlaceholder", { defaultValue: "Tìm kiếm ứng viên, tiêu đề..." })}
                          value={appSearch}
                          onChange={(e) => setAppSearch(e.target.value)}
                          className="pl-9 h-10 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={appFilterStatus} onValueChange={setAppFilterStatus}>
                        <SelectTrigger id="app-filter-status" className="w-full sm:w-40 h-10 bg-white">
                          <SelectValue placeholder={t("common.status")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">{t("recruiter.applications.allStatuses")}</SelectItem>
                          <SelectItem value="PENDING">{t("recruiter.applications.statuses.PENDING")}</SelectItem>
                          <SelectItem value="ACCEPTED">{t("recruiter.applications.statuses.APPROVED")}</SelectItem>
                          <SelectItem value="REJECTED">{t("recruiter.applications.statuses.REJECTED")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="app-filter-applied-at"
                        type="date"
                        value={appFilterAppliedAt}
                        onChange={(e) => setAppFilterAppliedAt(e.target.value)}
                        className="w-full sm:w-40 h-10 bg-white"
                        aria-label={t("recruiter.applications.appliedAt")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAppSearch("");
                          setAppFilterStatus("ALL");
                          setAppFilterAppliedAt("");
                        }}
                        className="h-10 border-slate-200 hover:bg-slate-50"
                        disabled={!appSearch && appFilterStatus === "ALL" && !appFilterAppliedAt}
                      >
                        {t("jobs.filters.reset")}
                      </Button>
                    </div>
                  </div>
                )}

                {applications.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">{t("recruiter.applications.empty")}</p>
                ) : filteredApplications.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">{t("jobs.page.emptyDescription")}</p>
                ) : (
                  <>
                  <Table>
                <TableHeader>
                  <TableRow>
                    {renderApplicationSortableHeader("applicant", t("recruiter.applications.applicant"))}
                    {renderApplicationSortableHeader("jobTitle", t("recruiter.applications.jobTitle"))}
                    <TableHead>{t("profile.cv_title")}</TableHead>
                    {renderApplicationSortableHeader("status", t("common.status"))}
                    {renderApplicationSortableHeader("appliedAt", t("recruiter.applications.appliedAt"))}
                    <TableHead className="text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedApplications.items.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="max-w-[200px] truncate">
                        <div className="font-medium truncate" title={app.applicantName || undefined}>{app.applicantName || t("recruiter.applications.applicant")}</div>
                        <div className="text-xs text-muted-foreground truncate" title={app.applicantEmail}>{app.applicantEmail}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={app.jobTitle}>
                        {app.jobTitle}
                      </TableCell>
                      <TableCell>
                        <a
                          href={app.appliedCvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {t("recruiter.applications.viewCv")}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getReviewStatusBadgeClassName(app.status)}>
                          {t(`recruiter.applications.statuses.${getReviewStatusTranslationKey(app.status)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">{formatDate(app.appliedAt, dateLocale)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-center gap-2">
                          {app.status !== "ACCEPTED" && renderApplicationAction(app, "ACCEPTED")}
                          {app.status !== "REJECTED" && renderApplicationAction(app, "REJECTED")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                page={paginatedApplications.page}
                totalPages={paginatedApplications.totalPages}
                onPageChange={setApplicationPage}
                pageSize={applicationPageSize}
                onPageSizeChange={setApplicationPageSize}
              />
                  </>
                )}
              </>
            )}
          </CardContent>
          )}
        </Card>
      </div>
      </section>

      <AlertDialog open={Boolean(historyJob)} onOpenChange={(open) => !open && setHistoryJob(null)}>
        <AlertDialogContent className="max-w-5xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recruiter.history.dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {historyJob?.title || "-"} {t("recruiter.history.dialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : jobHistory.length === 0 ? (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              {t("recruiter.history.empty")}
            </p>
          ) : (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
              {getHistoryVersions().map((version) => (
                <div key={version.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-950">{version.label}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(version.createdAt, dateLocale)}</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {JOB_SNAPSHOT_FIELDS.map((field) => {
                      const changed = version.changedFields.includes(field);
                      return (
                        <div
                          key={field}
                          className={`rounded-md border p-3 text-sm transition-colors ${
                            changed ? "border-orange-300 bg-orange-50 text-orange-950" : "border-slate-200 bg-slate-50 text-slate-700"
                          } ${field === "description" ? "md:col-span-2" : ""}`}
                        >
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field}</div>
                          <div className="whitespace-pre-wrap break-words">{String(version.data[field] || "-")}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.close")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(jobPendingDelete)} onOpenChange={(open) => !open && setJobPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recruiter.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("recruiter.deleteDialog.description", { title: jobPendingDelete?.title || "-" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === jobPendingDelete?.id}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionId === jobPendingDelete?.id}
              onClick={handleDeleteJob}
            >
              {actionId === jobPendingDelete?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("recruiter.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default RecruiterDashboard;
