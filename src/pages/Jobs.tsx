import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, CalendarDays, Loader2, MapPin, FileText, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { JobSearchFilters } from "@/components/jobs/JobSearchFilters";
import { jobApi, PublicJobPost, candidateApi } from "@/lib/api";
import {
  defaultManagedSiteConfig,
  loadManagedSiteConfig,
  type ManagedSiteConfig,
} from "@/lib/siteConfig";
import {
  emptyJobFilterValue,
  type JobFilterOption,
  type JobFilterOptions,
  type JobFilterValue,
  CURRENCY_OPTIONS,
  defaultJobFilterOptions,
  getSalaryRangeOption,
  formatSalaryRangeLabel,
  JOB_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
  USD_TO_VND_RATE,
} from "@/components/jobs/jobFilterConfig";
import { getVietnamProvinceOptions, getVietnamWardOptions } from "@/lib/vietnamProvinces";
import { paginateItems } from "@/lib/pagination";
import { useAuth } from "@/context/AuthContext"; // MỚI THÊM
import { useToast } from "@/hooks/use-toast"; // MỚI THÊM
import { SanityPageSections } from "@/components/sanity/SanityPageSections";
import { useSanityManagedInterface } from "@/lib/sanityInterfaceText";
import { FavoriteJobButton } from "@/components/jobs/FavoriteJobButton";
import { PaginationControls } from "@/components/ui/pagination-controls";

const formatDateOnly = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
    }
  } catch {
    // ignore
  }
  return value;
};

const normalizeText = (value?: string | number | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

const extractNumbers = (text: string) => {
  return text.match(/\d+/g) ?? [];
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getSearchText = (job: PublicJobPost) =>
  [
    job.title,
    job.company,
    job.employerName,
    job.employerEmail,
    job.location,
    job.type,
    job.salary,
    job.description,
  ].join(" ");

const parseNumberToken = (token: string) => {
  if (/^\d{1,3}([.,]\d{3})+$/.test(token)) {
    return Number(token.replace(/[.,]/g, ""));
  }
  return Number(token.replace(",", "."));
};

const getSalaryNumbers = (value?: string | null) => {
  const normalizedValue = normalizeText(value);
  const hasMillionUnit = /\b(trieu|million|m)\b/.test(normalizedValue);
  const hasThousandUnit = /\b(k|nghin|thousand)\b/.test(normalizedValue);
  return (
    value
      ?.match(/\d+(?:[.,]\d+)*/g)
      ?.map((item) => {
        const parsedValue = parseNumberToken(item);
        if (!Number.isFinite(parsedValue)) return null;
        if (hasMillionUnit && parsedValue < 1_000) return parsedValue * 1_000_000;
        if (hasThousandUnit && parsedValue < 100_000) return parsedValue * 1_000;
        return parsedValue;
      })
      .filter((item): item is number => item !== null) ?? []
  );
};

const matchesText = (source: string | null, selectedValue: string) => {
  if (!selectedValue) return true;
  const normalizedSource = normalizeText(source);
  const normalizedSelected = normalizeText(selectedValue);
  return Boolean(normalizedSelected && normalizedSource.includes(normalizedSelected));
};

const matchesFilterWithAliases = (source: string | null, selectedValue: string, options: JobFilterOption[]) => {
  if (!selectedValue) return true;
  if (!source) return false;
  const normalizedSource = normalizeText(source);
  const normalizedSelected = normalizeText(selectedValue);
  if (normalizedSource.includes(normalizedSelected)) return true;
  const option = options.find((item) => item.value === selectedValue);
  if (option?.aliases) {
    return option.aliases.some((alias) => normalizedSource.includes(normalizeText(alias)));
  }
  return false;
};

const matchesWorkMode = (job: PublicJobPost, selectedValue: string, options: JobFilterOption[]) => {
  if (!selectedValue) return true;
  if (matchesFilterWithAliases(job.mode, selectedValue, options)) return true;
  return matchesFilterWithAliases(job.description, selectedValue, options);
};

const isJobInUsd = (job: PublicJobPost) => {
  if (job.currency?.trim().toUpperCase() === "USD") return true;
  if (job.salary) {
    const norm = normalizeText(job.salary);
    return norm.includes("usd") || norm.includes("dollar") || job.salary.includes("$");
  }
  return false;
};

const getJobSalaryInVnd = (job: PublicJobPost) => {
  const salaryNumbers = getSalaryNumbers(job.salary);
  if (salaryNumbers.length === 0) return [];
  const isUsd = isJobInUsd(job);
  if (isUsd) {
    return salaryNumbers.map((val) => (val < 100_000 ? val * USD_TO_VND_RATE : val));
  }
  return salaryNumbers;
};

const matchesSalaryRange = (job: PublicJobPost, minSalary: number, maxSalary: number, isActive: boolean) => {
  if (!isActive) return true;
  const salaryNumbers = getJobSalaryInVnd(job);
  if (salaryNumbers.length === 0) return false;
  const jobMinSalary = Math.min(...salaryNumbers);
  const jobMaxSalary = Math.max(...salaryNumbers);
  return jobMaxSalary >= minSalary && jobMinSalary <= maxSalary;
};

const matchesCurrency = (job: PublicJobPost, selectedValue: string) => {
  if (!selectedValue) return true;
  if (job.currency) {
    if (job.currency.trim().toUpperCase() === selectedValue.toUpperCase()) {
      return true;
    }
  }
  if (job.salary) {
    const normalizedSalary = normalizeText(job.salary);
    if (selectedValue.toUpperCase() === "USD") {
      return normalizedSalary.includes("usd") || normalizedSalary.includes("dollar") || job.salary.includes("$");
    } else if (selectedValue.toUpperCase() === "VND") {
      return normalizedSalary.includes("vnd") || normalizedSalary.includes("dong") || normalizedSalary.includes("d");
    }
  }
  return false;
};

const hasAnyPhrase = (source: string, phrases: string[]) =>
  phrases.some((phrase) => source.includes(normalizeText(phrase)));

const matchesExperience = (job: PublicJobPost, selectedValue: string) => {
  if (!selectedValue) return true;
  if (job.experience) {
    const normalizedJobExp = normalizeText(job.experience);
    const normalizedSelected = normalizeText(selectedValue);
    if (normalizedJobExp === normalizedSelected) return true;
  }
  const normalizedSource = normalizeText(job.description);
  if (!normalizedSource) return false;
  switch (selectedValue) {
    case "no-experience":
      return hasAnyPhrase(normalizedSource, [
        "Chưa có kinh nghiệm",
        "Không yêu cầu kinh nghiệm",
        "Không cần kinh nghiệm",
        "No experience",
        "Fresher",
        "Entry level",
      ]);
    case "under-1-year":
      return hasAnyPhrase(normalizedSource, [
        "Dưới 1 năm",
        "Ít hơn 1 năm",
        "Less than 1 year",
        "Under 1 year",
      ]);
    case "1-year":
      return (
        !hasAnyPhrase(normalizedSource, ["Dưới 1 năm", "Ít hơn 1 năm", "Less than 1 year", "Under 1 year"]) &&
        hasAnyPhrase(normalizedSource, ["1 năm kinh nghiệm", "Kinh nghiệm 1 năm", "1 year experience", "Experience 1 year"])
      );
    case "2-years":
      return hasAnyPhrase(normalizedSource, ["2 năm kinh nghiệm", "Kinh nghiệm 2 năm", "2 years experience", "Experience 2 years"]);
    case "3-years":
      return (
        !hasAnyPhrase(normalizedSource, ["Trên 3 năm", "Hơn 3 năm", "More than 3 years", "Over 3 years"]) &&
        hasAnyPhrase(normalizedSource, ["3 năm kinh nghiệm", "Kinh nghiệm 3 năm", "3 years experience", "Experience 3 years"])
      );
    case "over-3-years":
      return hasAnyPhrase(normalizedSource, [
        "Trên 3 năm",
        "Hơn 3 năm",
        "More than 3 years",
        "Over 3 years",
      ]);
    default:
      return false;
  }
};

const getCandidateTexts = (selectedValue: string, options: JobFilterOption[], translate: (key: string) => string) => {
  const option = options.find((item) => item.value === selectedValue || item.label === selectedValue);
  return option
    ? [option.label, option.value, option.labelKey ? translate(option.labelKey) : undefined, ...(option.aliases ?? [])].filter(Boolean) as string[]
    : [selectedValue];
};

const matchesCity = (source: string | null, selectedValue: string, options: JobFilterOption[], translate: (key: string) => string) => {
  if (!selectedValue) return true;
  if (!source) return false;
  const normalizedSource = normalizeText(source);
  const candidates = getCandidateTexts(selectedValue, options, translate);
  return candidates.some((candidate) => normalizedSource.includes(normalizeText(candidate)));
};

const matchesDistrict = (source: string | null, selectedValue: string, options: JobFilterOption[], translate: (key: string) => string) => {
  if (!selectedValue) return true;
  if (!source) return false;
  const normalizedSource = normalizeText(source);
  const candidates = getCandidateTexts(selectedValue, options, translate);
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeText(candidate);
    const numbers = extractNumbers(normalizedCandidate);
    if (numbers.length === 1) {
      const targetNum = numbers[0];
      const districtRegex = new RegExp(`(?<!\\b(phuong|p|xa)\\s*\\.?\\s*)\\b(quan|q|huyen|h|tx|dist|district)\\s*\\.?\\s*${targetNum}\\b`, "i");
      return districtRegex.test(normalizedSource);
    }
    return normalizedSource.includes(normalizedCandidate);
  });
};

const matchesWard = (source: string | null, selectedValue: string, options: JobFilterOption[], translate: (key: string) => string) => {
  if (!selectedValue) return true;
  if (!source) return false;
  const normalizedSource = normalizeText(source);
  const candidates = getCandidateTexts(selectedValue, options, translate);
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeText(candidate);
    const numbers = extractNumbers(normalizedCandidate);
    if (numbers.length === 1) {
      const targetNum = numbers[0];
      const wardRegex = new RegExp(`(?<!\\b(quan|q|huyen|h|tx|dist|district)\\s*\\.?\\s*)\\b(phuong|p|xa|ward)\\s*\\.?\\s*${targetNum}\\b`, "i");
      return wardRegex.test(normalizedSource);
    }
    return normalizedSource.includes(normalizedCandidate);
  });
};

const matchesLocationText = (source: string | null, selectedLocation: string) => {
  if (!selectedLocation) return true;
  if (!source) return false;
  const normalizedSource = normalizeText(source);
  const normalizedSelected = normalizeText(selectedLocation);
  const numbers = extractNumbers(normalizedSelected);
  if (numbers.length === 1) {
    const targetNum = numbers[0];
    if (normalizedSelected.includes("quan") || normalizedSelected.includes("q ") || /^q\d+$/.test(normalizedSelected) || normalizedSelected.includes("district")) {
      const strictDistrictRegex = new RegExp(`(?<!\\b(phuong|p|xa)\\s*\\.?\\s*)\\b(quan|q|huyen|h|dist|district)\\s*\\.?\\s*${targetNum}\\b`, "i");
      return strictDistrictRegex.test(normalizedSource);
    }
    if (normalizedSelected.includes("phuong") || normalizedSelected.includes("p ") || /^p\d+$/.test(normalizedSelected) || normalizedSelected.includes("ward")) {
      const strictWardRegex = new RegExp(`(?<!\\b(quan|q|huyen|h|dist|district)\\s*\\.?\\s*)\\b(phuong|p|xa|ward)\\s*\\.?\\s*${targetNum}\\b`, "i");
      return strictWardRegex.test(normalizedSource);
    }
  }
  return normalizedSource.includes(normalizedSelected);
};

const filterJobs = (
  jobs: PublicJobPost[],
  value: JobFilterValue,
  options: JobFilterOptions,
  translate: (key: string) => string,
) =>
  jobs.filter((job) => {
    const searchText = normalizeText(getSearchText(job));
    const rawMinSalary = Number(value.salaryMin || 0);
    const rawMaxSalary = Number(value.salaryMax || 50_000_000);
    const minSalary = Math.min(rawMinSalary, rawMaxSalary);
    const maxSalary = Math.max(rawMinSalary, rawMaxSalary);
    const salaryFilterActive =
      Boolean(value.salaryMin || value.salaryMax) && !(minSalary === 0 && maxSalary === 50_000_000);
    return (
      (!value.keyword || searchText.includes(normalizeText(value.keyword))) &&
      matchesCity(job.location, value.city, options.cities, translate) &&
      matchesDistrict(job.location, value.district, options.districts, translate) &&
      matchesWard(job.location, value.ward, options.wards, translate) &&
      matchesLocationText(job.location, value.location) &&
      matchesWorkMode(job, value.workMode, options.workModes) &&
      matchesFilterWithAliases(job.type, value.jobType, options.jobTypes) &&
      matchesText(job.company, value.company) &&
      matchesCurrency(job, value.currency) &&
      matchesExperience(job, value.experience) &&
      matchesSalaryRange(job, minSalary, maxSalary, salaryFilterActive)
    );
  });

const Jobs: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialKeyword = searchParams.get("keyword") ?? "";
  const [managedConfig, setManagedConfig] = useState<ManagedSiteConfig>(defaultManagedSiteConfig);
  const [provinceOptions, setProvinceOptions] = useState<JobFilterOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<JobFilterOption[]>([]);
  const [wardOptions, setWardOptions] = useState<JobFilterOption[]>([]);
  const [jobs, setJobs] = useState<PublicJobPost[]>([]);
  const [filterValue, setFilterValue] = useState<JobFilterValue>({
    ...emptyJobFilterValue,
    city: "79",
    keyword: initialKeyword,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { text: uiText, pageContent } = useSanityManagedInterface("/jobs");
  const [applyJobId, setApplyJobId] = useState<string | number | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  //làm tọa độ
  const [updateCoordJob, setUpdateCoordJob] = useState<PublicJobPost | null>(null);
  const [coords, setCoords] = useState({ lat: "", lng: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);
  const [favoriteJobIds, setFavoriteJobIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    setFilterValue((current) => ({ ...current, keyword: initialKeyword }));
    setJobPage(1);
  }, [initialKeyword]);

  useEffect(() => {
    let mounted = true;
    getVietnamProvinceOptions()
      .then((options) => {
        if (mounted) setProvinceOptions(options);
      })
      .catch(() => {
        if (mounted) setProvinceOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!filterValue.city) {
      setDistrictOptions([]);
      setWardOptions([]);
      return () => {
        mounted = false;
      };
    }
    setDistrictOptions([]);
    setWardOptions([]);
    getVietnamWardOptions(filterValue.city)
      .then((options) => {
        if (mounted) setWardOptions(options);
      })
      .catch(() => {
        if (mounted) setWardOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, [filterValue.city]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [config, jobsResult] = await Promise.all([
          loadManagedSiteConfig(),
          jobApi.listJobs(),
        ]);
        if (!mounted) return;
        setManagedConfig(config);
        
        // 🎯 ĐÃ ĐẢM BẢO SẠCH: Chỉ nhận dữ liệu trực tiếp trả về từ API Backend thật
        setJobs(jobsResult || []);
      } catch (error: unknown) {
        if (!mounted) return;
        setErrorMessage(getErrorMessage(error, t("jobs.page.loadError")));
        setJobs([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!token || user?.role !== "CANDIDATE") {
      setFavoriteJobIds(new Set());
      return;
    }

    let mounted = true;
    candidateApi.listFavoriteJobs(token)
      .then((favoriteJobs) => {
        if (mounted) setFavoriteJobIds(new Set(favoriteJobs.map((job) => job.id)));
      })
      .catch(() => {
        if (mounted) setFavoriteJobIds(new Set());
      });

    return () => {
      mounted = false;
    };
  }, [token, user?.role]);

  const handleFilterChange = (nextValue: JobFilterValue) => {
    setFilterValue(nextValue);
    setJobPage(1);
  };

  const handleFavoriteChange = (updatedJob: PublicJobPost, isFavorited: boolean) => {
    setFavoriteJobIds((current) => {
      const next = new Set(current);
      if (isFavorited) next.add(updatedJob.id);
      else next.delete(updatedJob.id);
      return next;
    });
    setJobs((current) => current.map((job) => (String(job.id) === String(updatedJob.id) ? updatedJob : job)));
  };

  const filterOptions = useMemo<JobFilterOptions>(() => {
    if (provinceOptions.length === 0) return { ...managedConfig.filters, cities: [] };
    return {
      ...managedConfig.filters,
      cities: provinceOptions,
      districts: districtOptions,
      wards: wardOptions,
    };
  }, [managedConfig.filters, provinceOptions, districtOptions, wardOptions]);

  const filteredJobs = useMemo(() => {
    const baseFiltered = filterJobs(jobs, filterValue, filterOptions, t);
    const activeWard = filterValue.ward;
    const activeDistrict = filterValue.district;
    if (activeWard) {
      return [...baseFiltered].sort((a, b) => {
        const aMatch = matchesWard(a.location, activeWard, filterOptions.wards, t);
        const bMatch = matchesWard(b.location, activeWard, filterOptions.wards, t);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }
    if (activeDistrict) {
      return [...baseFiltered].sort((a, b) => {
        const aMatch = matchesDistrict(a.location, activeDistrict, filterOptions.districts, t);
        const bMatch = matchesDistrict(b.location, activeDistrict, filterOptions.districts, t);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }
    return baseFiltered;
  }, [jobs, filterValue, filterOptions, t]);

  const paginatedJobs = useMemo(
    () => paginateItems(filteredJobs, jobPage, jobPageSize),
    [filteredJobs, jobPage, jobPageSize],
  );

  const mapCenterPosition = useMemo(() => {
    if (filteredJobs.length > 0) {
      const firstJob = filteredJobs[0];
      if (firstJob.latitude && firstJob.longitude) {
        return {
          lat: Number(firstJob.latitude),
          lng: Number(firstJob.longitude),
        };
      }
    }
    return null;
  }, [filteredJobs]);

  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";

  const handleUpdateCoords = async () => {
    if (!updateCoordJob || !token) return;
    setIsUpdating(true);
    try {
      await jobApi.updateJobCoordinates(token, updateCoordJob.id, Number(coords.lat), Number(coords.lng));
      toast({ title: t("toast.success"), description: t("jobs.toast.coordUpdateSuccess") });
      setUpdateCoordJob(null);
      setCoords({ lat: "", lng: "" });
    } catch (error) {
      toast({ title: t("toast.error"), description: t("jobs.toast.coordUpdateError"), variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenApplyModal = (jobId: string | number) => {
    if (!user || !token) {
      toast({ description: t("jobs.toast.loginRequired"), variant: "default" });
      navigate("/login");
      return;
    }
    if (user.role !== "CANDIDATE") {
      toast({ description: t("jobs.toast.candidateOnly"), variant: "destructive" });
      return;
    }
    const defaultCv = user.cvList?.find((cv) => cv.isDefault) ?? user.cvList?.[0];
    setSelectedCvId(defaultCv?.id ?? "");
    setApplyJobId(jobId);
  };

  const submitApplication = async () => {
    if (!applyJobId || !selectedCvId || !token) return;
    setIsApplying(true);
    try {
      await candidateApi.applyJob(token, applyJobId, selectedCvId);
      toast({ title: t("toast.success"), description: t("jobs.toast.applySuccess") });
      setApplyJobId(null);
      setSelectedCvId("");
    } catch (error: unknown) {


      toast({ 
        title: t("toast.error"), 
        description: getErrorMessage(error, t("jobs.apply.error", { defaultValue: "Bạn đã nộp đơn cho công việc này rồi hoặc có lỗi xảy ra." })),
        variant: "destructive" 
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <SanityPageSections routePath="/jobs" placement="top" />
      {pageContent.heroVisible !== false && <section
        className="hero-gradient text-white py-8 shadow-sm"
        style={pageContent.heroBackgroundColor ? {background: String(pageContent.heroBackgroundColor)} : undefined}
      >
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white" style={{color: String(pageContent.heroTextColor || "#ffffff")}}>{uiText("jobs.page.title", t("jobs.page.title"))}</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100/90" style={{color: String(pageContent.heroTextColor || "#ffffff")}}>{uiText("jobs.page.description", t("jobs.page.description"))}</p>
        </div>
      </section>}

      <SanityPageSections routePath="/jobs" placement="afterHero" />

      {(pageContent.filtersVisible !== false || pageContent.resultsVisible !== false) && <section className="container mx-auto space-y-6 px-4 py-8" style={{backgroundColor: pageContent.contentBackgroundColor ? String(pageContent.contentBackgroundColor) : undefined}}>
        {pageContent.filtersVisible !== false && <JobSearchFilters
          options={filterOptions}
          value={filterValue}
          onChange={handleFilterChange}
          onReset={() => handleFilterChange({ ...emptyJobFilterValue, city: "79" })}
        />}

        {pageContent.resultsVisible !== false && <div id="ket-qua-tim-kiem" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-950">
            {uiText("jobs.page.resultsTitle", t("jobs.page.resultsTitle"))} ({filteredJobs.length})
          </h2>
        </div>
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="font-semibold text-slate-950">{uiText("jobs.page.emptyTitle", t("jobs.page.emptyTitle"))}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{uiText("jobs.page.emptyDescription", t("jobs.page.emptyDescription"))}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 min-h-[400px]">
              {paginatedJobs.items.map((job) => (
                <Card
                  key={job.id}
                  className="group relative overflow-hidden flex flex-col h-full hover:shadow-medium shadow-soft border bg-card transition-smooth hover:-translate-y-1"
                  style={{
                    backgroundColor: pageContent.jobCardBackgroundColor ? String(pageContent.jobCardBackgroundColor) : undefined,
                    borderColor: pageContent.jobCardBorderColor ? String(pageContent.jobCardBorderColor) : undefined,
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-light" />
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 transition-smooth group-hover:scale-125" />
                  <div
                    className="relative cursor-pointer flex flex-col flex-1"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <CardTitle className="text-xl" style={{color: pageContent.jobCardTitleColor ? String(pageContent.jobCardTitleColor) : undefined}}>{job.title || t("jobs.page.untitled")}</CardTitle>
                          <p className="mt-1 text-sm font-medium text-slate-700" style={{color: pageContent.jobCardTextColor ? String(pageContent.jobCardTextColor) : undefined}}>
                            {job.company || job.employerName || t("jobs.page.notProvided")}
                          </p>
                        </div>
                        <FavoriteJobButton
                          jobId={job.id}
                          isFavorited={favoriteJobIds.has(job.id)}
                          onFavoriteChange={handleFavoriteChange}
                          className="self-start relative z-10"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2.5 text-sm text-muted-foreground">
                        {job.location && (
                          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                            <MapPin className="h-4 w-4 text-primary" />
                            {job.location}
                          </span>
                        )}
                        {job.createdAt && (
                          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            {new Date(job.createdAt).toLocaleDateString(dateLocale)}
                          </span>
                        )}
                        {job.applicationDeadline && (
                          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            {uiText("jobs.page.applicationDeadline", t("jobs.page.applicationDeadline"))}: {formatDateOnly(job.applicationDeadline, dateLocale)}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <div className="flex flex-wrap gap-2">
                        {job.type && <Badge variant="secondary" className="rounded-full px-3 py-1">{JOB_TYPE_OPTIONS.find(o => o.value === job.type)?.labelKey ? t(JOB_TYPE_OPTIONS.find(o => o.value === job.type)!.labelKey!) : job.type}</Badge>}
                        {job.salary && (
                           <Badge variant="secondary" className="rounded-full px-3 py-1">
                             {formatSalaryRangeLabel(job.salary, job.currency, t)}
                           </Badge>
                         )}
                        {job.mode && <Badge variant="secondary" className="rounded-full px-3 py-1">{WORK_MODE_OPTIONS.find(o => o.value === job.mode)?.labelKey ? t(WORK_MODE_OPTIONS.find(o => o.value === job.mode)!.labelKey!) : job.mode}</Badge>}
                        {job.experience && <Badge variant="secondary" className="rounded-full px-3 py-1">{defaultJobFilterOptions.experience.find(o => o.value === job.experience)?.labelKey ? t(defaultJobFilterOptions.experience.find(o => o.value === job.experience)!.labelKey!) : job.experience}</Badge>}
                      </div>
                      {job.description && (
                        <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600" style={{color: pageContent.jobCardTextColor ? String(pageContent.jobCardTextColor) : undefined}}>
                          {job.description}
                        </p>
                      )}
                    </CardContent>
                  </div>
                  
                  {/* MỚI THÊM: Nút nộp đơn */}
                  {(!user || user.role === "CANDIDATE") && (
                    <CardFooter className="relative bg-slate-50/50 border-t p-4 flex justify-end z-10">
                      <Button
                        variant="cta"
                        className="bg-primary text-primary-foreground hover:bg-primary-dark w-auto px-5"
                        style={{
                          backgroundColor: pageContent.applyButtonBackgroundColor ? String(pageContent.applyButtonBackgroundColor) : undefined,
                          color: pageContent.applyButtonTextColor ? String(pageContent.applyButtonTextColor) : undefined,
                        }}
                        onClick={() => handleOpenApplyModal(job.id)}
                      >
                        {uiText("jobs.apply.button", t("jobs.apply.button"))}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
            <PaginationControls
              page={jobPage}
              totalPages={paginatedJobs.totalPages}
              onPageChange={setJobPage}
              pageSize={jobPageSize}
              onPageSizeChange={setJobPageSize}
            />
          </div>
        )}
        </div>}
      </section>}

      {/* MỚI THÊM: Giao diện Modal Chọn CV nộp đơn */}
      <Dialog 
        open={!!applyJobId} 
        onOpenChange={(open) => {
          if (!open) {
            setApplyJobId(null);
            setSelectedCvId("");
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[500px] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Chọn CV ứng tuyển</DialogTitle>
            <DialogDescription>
              Vui lòng chọn 1 CV từ hồ sơ của bạn để nộp cho vị trí này.
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 py-4">
            {!user?.cvList || user.cvList.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg bg-slate-50">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-slate-900">Bạn chưa có CV nào</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Vui lòng tải lên CV trước khi nộp đơn.</p>
                <Button variant="outline" onClick={() => navigate("/profile")}>
                  Đến trang cá nhân để tải lên CV
                </Button>
              </div>
            ) : (
              <div className="max-h-[300px] w-full min-w-0 space-y-3 overflow-x-hidden overflow-y-auto pr-2">
                {user.cvList.map((cv) => (
                  <div
                    key={cv.id}
                    onClick={() => setSelectedCvId(cv.id)}
                    className={`flex w-full min-w-0 max-w-full items-center gap-4 overflow-hidden p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedCvId === cv.id 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`shrink-0 p-2 rounded-lg ${selectedCvId === cv.id ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 basis-0 overflow-hidden">
                      <p title={cv.name} className={`block max-w-full truncate text-sm font-semibold ${selectedCvId === cv.id ? "text-primary" : "text-slate-900"}`}>
                        {cv.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Ngày tải lên: {new Date(cv.uploadedAt).toLocaleDateString('vi-VN')}
                        {cv.isDefault && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Default</span>}
                      </p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedCvId === cv.id ? "border-primary" : "border-slate-300"
                      }`}>
                      {selectedCvId === cv.id && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyJobId(null)}>Hủy bỏ</Button>
            <Button
              onClick={submitApplication}
              disabled={!selectedCvId || isApplying || !user?.cvList?.length}
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gửi hồ sơ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
         
         <Dialog open={!!updateCoordJob} onOpenChange={(open) => !open && setUpdateCoordJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật tọa độ (x, y)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Latitude (x)" 
              value={coords.lat} 
              onChange={e => setCoords(prev => ({...prev, lat: e.target.value}))} 
            />
            <Input 
              placeholder="Longitude (y)" 
              value={coords.lng} 
              onChange={e => setCoords(prev => ({...prev, lng: e.target.value}))} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateCoordJob(null)}>Hủy</Button>
            <Button onClick={handleUpdateCoords} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SanityPageSections routePath="/jobs" placement="bottom" />
    </main>
  );
};
export default Jobs;