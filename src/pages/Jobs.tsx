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

const getMaxNumber = (value?: string | null) => {
  const numbers = value?.match(/\d+(?:[.,]\d+)?/g)?.map((item) => Number(item.replace(",", "."))) ?? [];
  return numbers.length > 0 ? Math.max(...numbers) : null;
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
    const minSalary = Number(value.minSalary || 0);
    const jobSalary = getMaxNumber(job.salary);

    return (
      (!value.keyword || searchText.includes(normalizeText(value.keyword))) &&
      matchesOption(job.location, value.city, options.cities, translate) &&
      matchesOption(job.location, value.district, options.districts, translate) &&
      matchesOption(job.location, value.ward, options.wards, translate) &&
      matchesLocationText(job.location, value.location) &&
      matchesOption(`${job.type ?? ""} ${job.description ?? ""}`, value.workMode, options.workModes, translate) &&
      matchesOption(job.type, value.jobType, options.jobTypes, translate) &&
      matchesOption(job.company, value.company, options.companies, translate) &&
      matchesOption(job.salary, value.currency, options.currencies, translate) &&
      (!minSalary || (jobSalary !== null && jobSalary >= minSalary))
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

  const filterOptions = useMemo<JobFilterOptions>(() => {
    if (provinceOptions.length === 0) return managedConfig.filters;
    return {
      ...managedConfig.filters,
      cities: provinceOptions,
      districts: [],
      wards: wardOptions,
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
      toast({ description: "Vui lòng đăng nhập để nộp đơn", variant: "default" });
      navigate("/login");
      return;
    }
    if (user.role !== "CANDIDATE") {
      toast({ description: "Chỉ tài khoản Ứng viên mới có thể nộp đơn", variant: "destructive" });
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
      
      toast({ title: "Thành công!", description: "Đã nộp CV thành công cho công việc này." });
      setApplyJobId(null);
      setSelectedCvId("");
    } catch (error: unknown) {
      toast({ 
        title: "Không thể nộp đơn", 
        description: getErrorMessage(error, "Bạn đã nộp đơn cho công việc này rồi hoặc có lỗi xảy ra."),
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
          <h2 className="text-xl font-semibold text-slate-950">{t("jobs.page.resultsTitle")}</h2>
          <Badge variant="outline">{t("jobs.page.count", { count: filteredJobs.length })}</Badge>
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
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="text-xl">{job.title || t("jobs.page.untitled")}</CardTitle>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {job.company || job.employerName || t("jobs.page.notProvided")}
                      </p>
                    </div>
                    {job.status && <Badge variant="secondary">{job.status}</Badge>}
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
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="flex flex-wrap gap-2">
                    {job.type && <Badge variant="outline">{job.type}</Badge>}
                    {job.salary && <Badge variant="outline">{job.salary}</Badge>}
                  </div>
                  {job.description && (
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {job.description}
                    </p>
                  )}
                </CardContent>
                
                {/* MỚI THÊM: Nút nộp đơn */}
                <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-end">
                  <Button onClick={() => handleOpenApplyModal(job.id)}>
                    Nộp đơn ứng tuyển
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
            <DialogTitle>Chọn CV ứng tuyển</DialogTitle>
            <DialogDescription>
              Vui lòng chọn 1 CV từ hồ sơ của bạn để nộp cho vị trí này.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
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
                        Ngày tải lên: {new Date(cv.uploadedAt).toLocaleDateString('vi-VN')}
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
    </main>
  );
};

export default Jobs;