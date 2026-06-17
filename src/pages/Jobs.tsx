import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom"; // MỚI THÊM: useNavigate
import { useTranslation } from "react-i18next";
import { Briefcase, CalendarDays, Loader2, MapPin, FileText } from "lucide-react"; // MỚI THÊM: FileText
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"; // MỚI THÊM: CardFooter
import { Button } from "@/components/ui/button"; // MỚI THÊM
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // MỚI THÊM
import { JobSearchFilters } from "@/components/jobs/JobSearchFilters";
import { jobApi, PublicJobPost, candidateApi } from "@/lib/api"; // MỚI THÊM: candidateApi
import {
  defaultManagedSiteConfig,
  loadManagedSiteConfig,
  type ManagedSiteConfig,
} from "@/lib/siteConfig";
import {
  emptyJobFilterValue,
  defaultJobFilterOptions,
  USD_TO_VND_RATE,
  WORK_MODE_OPTIONS,
  JOB_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  getSalaryRangeOption,
  type JobFilterOption,
  type JobFilterOptions,
  type JobFilterValue,
} from "@/components/jobs/jobFilterConfig";
import { getVietnamProvinceOptions, getVietnamWardOptions } from "@/lib/vietnamProvinces";
import { useAuth } from "@/context/AuthContext"; // MỚI THÊM
import { useToast } from "@/hooks/use-toast"; // MỚI THÊM

const normalizeText = (value?: string | number | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getLocalDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isApplicationDeadlineExpired = (value?: string | null) =>
  Boolean(value && value.slice(0, 10) < getLocalDateInputValue());

const formatDateOnly = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(locale);
};

const getSearchText = (job: PublicJobPost) =>
  [
    job.title,
    job.company,
    job.employerName,
    job.employerEmail,
    job.location,
    job.type,
    job.salary,
    job.experience,
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
  const hasUsdCurrency = /\busd\b/.test(normalizedValue);

  return (
    value
      ?.match(/\d+(?:[.,]\d+)*/g)
      ?.map((item) => {
        let parsedValue = parseNumberToken(item);

        if (!Number.isFinite(parsedValue)) return null;
        if (hasMillionUnit && parsedValue < 1_000) parsedValue *= 1_000_000;
        if (hasThousandUnit && parsedValue < 100_000) parsedValue *= 1_000;
        if (hasUsdCurrency) parsedValue *= USD_TO_VND_RATE;
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

const matchesSalaryRange = (source: string | null, minSalary: number, maxSalary: number, isActive: boolean) => {
  if (!isActive) return true;

  const salaryNumbers = getSalaryNumbers(source);
  if (salaryNumbers.length === 0) return false;

  const jobMinSalary = Math.min(...salaryNumbers);
  const jobMaxSalary = Math.max(...salaryNumbers);

  return jobMaxSalary >= minSalary && jobMinSalary <= maxSalary;
};

const hasAnyPhrase = (source: string, phrases: string[]) =>
  phrases.some((phrase) => source.includes(normalizeText(phrase)));

const matchesExperience = (source: string | null, selectedValue: string) => {
  if (!selectedValue) return true;

  const normalizedSource = normalizeText(source);
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

const matchesOption = (
  source: string | null,
  selectedValue: string,
  options: JobFilterOption[],
  translate: (key: string) => string,
) => {
  if (!selectedValue) return true;

  const normalizedSource = normalizeText(source);
  const option = options.find((item) => item.value === selectedValue);
  const candidates = option
    ? [
        option.label,
        option.labelKey ? translate(option.labelKey) : undefined,
        ...(option.aliases ?? []),
      ]
    : [selectedValue];

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeText(candidate);
    return Boolean(normalizedCandidate && normalizedSource.includes(normalizedCandidate));
  });
};

const matchesLocationText = (source: string | null, selectedLocation: string) => {
  if (!selectedLocation) return true;

  const normalizedSource = normalizeText(source);
  const normalizedSelected = normalizeText(selectedLocation);
  const selectedTokens = normalizedSelected.split(" ").filter((token) => token.length >= 3);

  return (
    normalizedSource.includes(normalizedSelected) ||
    normalizedSelected.includes(normalizedSource) ||
    selectedTokens.some((token) => normalizedSource.includes(token))
  );
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
    const rawMaxSalary = value.salaryMax ? Number(value.salaryMax) : Number.POSITIVE_INFINITY;
    const minSalary = Math.min(rawMinSalary, rawMaxSalary);
    const maxSalary = Math.max(rawMinSalary, rawMaxSalary);
    const salaryFilterActive = Boolean(value.salaryRange || value.salaryMin || value.salaryMax);

    return (
      (!value.keyword || searchText.includes(normalizeText(value.keyword))) &&
      matchesOption(job.location, value.city, options.cities, translate) &&
      matchesOption(job.location, value.district, options.districts, translate) &&
      matchesOption(job.location, value.ward, options.wards, translate) &&
      matchesLocationText(job.location, value.location) &&
      matchesOption(`${job.type ?? ""} ${job.description ?? ""}`, value.workMode, options.workModes, translate) &&
      matchesOption(job.type, value.jobType, options.jobTypes, translate) &&
      matchesText(job.company, value.company) &&
      matchesOption(job.salary, value.currency, options.currencies, translate) &&
      matchesExperience(job.experience || job.description, value.experience) &&
      matchesSalaryRange(job.salary, minSalary, maxSalary, salaryFilterActive)
    );
  });

const Jobs: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialKeyword = searchParams.get("keyword") ?? "";
  const [managedConfig, setManagedConfig] = useState<ManagedSiteConfig>(defaultManagedSiteConfig);
  const [provinceOptions, setProvinceOptions] = useState<JobFilterOption[]>([]);
  const [wardOptions, setWardOptions] = useState<JobFilterOption[]>([]);
  const [jobs, setJobs] = useState<PublicJobPost[]>([]);
  const [filterValue, setFilterValue] = useState<JobFilterValue>({
    ...emptyJobFilterValue,
    keyword: initialKeyword,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // MỚI THÊM: Các state và hook cho phần nộp đơn
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applyJobId, setApplyJobId] = useState<string | number | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setFilterValue((current) => ({ ...current, keyword: initialKeyword }));
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
    const selectedProvince = provinceOptions.find((option) => option.value === filterValue.city);

    if (!selectedProvince) {
      setWardOptions([]);
      return () => {
        mounted = false;
      };
    }

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
  }, [filterValue.city, provinceOptions]);

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
        setJobs((jobsResult || []).filter((job) => !isApplicationDeadlineExpired(job.applicationDeadline)));
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

  const filterOptions = useMemo<JobFilterOptions>(() => {
    const fixedOptions = {
      workModes: managedConfig.filters.workModes.length ? managedConfig.filters.workModes : defaultJobFilterOptions.workModes,
      jobTypes: managedConfig.filters.jobTypes.length ? managedConfig.filters.jobTypes : defaultJobFilterOptions.jobTypes,
      currencies: managedConfig.filters.currencies.length ? managedConfig.filters.currencies : defaultJobFilterOptions.currencies,
    };

    if (provinceOptions.length === 0) {
      return {
        ...managedConfig.filters,
        ...fixedOptions,
      };
    }

    return {
      ...managedConfig.filters,
      cities: provinceOptions,
      districts: [],
      wards: wardOptions,
      ...fixedOptions,
    };
  }, [managedConfig.filters, provinceOptions, wardOptions]);

  const filteredJobs = useMemo(
    () => filterJobs(jobs, filterValue, filterOptions, t),
    [jobs, filterValue, filterOptions, t],
  );
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";

  // MỚI THÊM: Hàm xử lý mở popup nộp đơn
  const handleOpenApplyModal = (jobId: string | number) => {
    if (!user || !token) {
      toast({ description: t("jobs.apply.loginRequired", { defaultValue: "Vui lòng đăng nhập để nộp đơn" }), variant: "default" });
      navigate("/login");
      return;
    }
    if (user.role !== "CANDIDATE") {
      toast({ description: t("jobs.apply.candidateOnly", { defaultValue: "Chỉ tài khoản Ứng viên mới có thể nộp đơn" }), variant: "destructive" });
      return;
    }
    const defaultCv = user.cvList?.find((cv) => cv.isDefault) ?? user.cvList?.[0];
    setSelectedCvId(defaultCv?.id ?? "");
    setApplyJobId(jobId);
  };

  // MỚI THÊM: Hàm gọi API nộp đơn
  const submitApplication = async () => {
    if (!applyJobId || !selectedCvId || !token) return;
    
    setIsApplying(true);
    try {
      // Gọi xuống Backend với cvId (Theo đúng chuẩn bảo mật đã thiết kế)
      await candidateApi.applyJob(token, applyJobId, selectedCvId);
      
      toast({ title: t("toast.success"), description: t("jobs.apply.success", { defaultValue: "Đã nộp CV thành công cho công việc này." }) });
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
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-slate-950">{t("jobs.page.title")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("jobs.page.description")}</p>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8">
        <JobSearchFilters
          options={filterOptions}
          value={filterValue}
          onChange={setFilterValue}
          onReset={() => setFilterValue(emptyJobFilterValue)}
        />

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-950">
            {t("jobs.page.resultsTitle")} ({filteredJobs.length})
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
              <h3 className="font-semibold text-slate-950">{t("jobs.page.emptyTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("jobs.page.emptyDescription")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                <div
                  className="cursor-pointer flex flex-col flex-1"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle className="text-xl">{job.title || t("jobs.page.untitled")}</CardTitle>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {job.company || job.employerName || t("jobs.page.notProvided")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                      )}
                      {job.createdAt && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {new Date(job.createdAt).toLocaleDateString(dateLocale)}
                        </span>
                      )}
                      {job.applicationDeadline && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {t("jobs.page.applicationDeadline")}: {formatDateOnly(job.applicationDeadline, dateLocale)}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {job.type && <Badge variant="outline">{JOB_TYPE_OPTIONS.find(o => o.value === job.type)?.labelKey ? t(JOB_TYPE_OPTIONS.find(o => o.value === job.type)!.labelKey!) : job.type}</Badge>}
                      {job.salary && (
                        <Badge variant="outline">
                          {getSalaryRangeOption(job.salary)?.labelKey ? t(getSalaryRangeOption(job.salary)!.labelKey!) : job.salary} {job.currency ? (CURRENCY_OPTIONS.find(o => o.value === job.currency)?.labelKey ? t(CURRENCY_OPTIONS.find(o => o.value === job.currency)!.labelKey!) : job.currency) : ""}
                        </Badge>
                      )}
                      {job.mode && <Badge variant="outline">{WORK_MODE_OPTIONS.find(o => o.value === job.mode)?.labelKey ? t(WORK_MODE_OPTIONS.find(o => o.value === job.mode)!.labelKey!) : job.mode}</Badge>}
                      {job.experience && <Badge variant="outline">{defaultJobFilterOptions.experience.find(o => o.value === job.experience)?.labelKey ? t(defaultJobFilterOptions.experience.find(o => o.value === job.experience)!.labelKey!) : job.experience}</Badge>}
                    </div>
                    {job.description && (
                      <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {job.description}
                      </p>
                    )}
                  </CardContent>
                </div>
                
                {/* MỚI THÊM: Nút nộp đơn */}
                <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-end">
                  <Button onClick={() => handleOpenApplyModal(job.id)}>
                    {t("jobs.apply.button")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("jobs.apply.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("jobs.apply.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {!user?.cvList || user.cvList.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg bg-slate-50">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-slate-900">{t("jobs.apply.noCv")}</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{t("jobs.apply.noCvDesc")}</p>
                <Button variant="outline" onClick={() => navigate("/profile")}>
                  {t("jobs.apply.goToProfile", { defaultValue: "Tải lên CV" })}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {user.cvList.map((cv) => (
                  <div
                    key={cv.id}
                    onClick={() => setSelectedCvId(cv.id)}
                    className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedCvId === cv.id 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selectedCvId === cv.id ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-sm font-semibold truncate ${selectedCvId === cv.id ? "text-primary" : "text-slate-900"}`}>
                        {cv.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {t("profile.cv_upload_time")}: {new Date(cv.uploadedAt).toLocaleDateString(dateLocale)}
                        {cv.isDefault && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Default</span>}
                      </p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedCvId === cv.id ? "border-primary" : "border-slate-300"
                    }`}>
                      {selectedCvId === cv.id && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyJobId(null)}>{t("common.cancel")}</Button>
            <Button 
              onClick={submitApplication} 
              disabled={!selectedCvId || isApplying || !user?.cvList?.length}
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("jobs.apply.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Jobs;
