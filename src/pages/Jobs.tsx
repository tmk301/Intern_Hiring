import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, CalendarDays, Loader2, MapPin, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/jobs/jobFilterConfig";
import { getVietnamProvinceOptions, getVietnamWardOptions } from "@/lib/vietnamProvinces";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
      matchesText(`${job.type ?? ""} ${job.description ?? ""}`, value.workMode) &&
      matchesText(job.type, value.jobType) &&
      matchesText(job.company, value.company) &&
      matchesText(job.salary, value.currency) &&
      matchesExperience(job.description, value.experience) &&
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

  const MOCK_JOBS: PublicJobPost[] = useMemo(() => [
    {
      id: "mock-1",
      title: "Frontend Developer Intern",
      company: "MSC Center",
      employerName: "MSC Admin",
      employerEmail: "contact@msc.vn",
      location: "268 Lý Thường Kiệt, Quận 10, TP. Hồ Chí Minh",
      type: "Internship",
      salary: "5000000",
      description: "Tham gia phát triển các dự án web sử dụng ReactJS và Tailwind CSS.",
      status: "APPROVED",
      hidden: false,
      latitude: 10.7728442,
      longitude: 106.6599026,
      recruiterId: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: "mock-2",
      title: "Java Backend Developer",
      company: "Techcom Tower Branch",
      employerName: "Nguyen Van A",
      employerEmail: "recruitment@techcom.vn",
      location: "23 Lê Duẩn, Bến Nghé, Quận 1, TP. Hồ Chí Minh",
      type: "Full-time",
      salary: "15000000",
      description: "Lập trình hệ thống Core Banking sử dụng Java Spring Boot và cơ sở dữ liệu PostgreSQL.",
      status: "APPROVED",
      hidden: false,
      latitude: 10.782252,
      longitude: 106.700514,
      recruiterId: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: "mock-3",
      title: "Mobile App Developer (React Native)",
      company: "Sài Gòn Software",
      employerName: "Tran Thi B",
      employerEmail: "hr@saigonsoft.com",
      location: "280 An Dương Vương, Phường 4, Quận 5, TP. Hồ Chí Minh",
      type: "Full-time",
      salary: "18000000",
      description: "Xây dựng và tối ưu hóa ứng dụng di động trên hai nền tảng iOS và Android.",
      status: "APPROVED",
      hidden: false,
      latitude: 10.759904,
      longitude: 106.668503,
      recruiterId: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: "mock-4",
      title: "UI/UX Designer",
      company: "InnoTech Studio",
      employerName: "Le Hoang C",
      employerEmail: "design@innotech.com",
      location: "Block A, Khu Công nghệ Phần mềm ĐHQG, Linh Trung, Thủ Đức, TP. Hồ Chí Minh",
      type: "Part-time",
      salary: "8000000",
      description: "Thiết kế Wireframe, Prototype cho các sản phẩm Web/Mobile của công ty bằng Figma.",
      status: "APPROVED",
      hidden: false,
      latitude: 10.865063,
      longitude: 106.801644,
      recruiterId: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: "mock-5",
      title: "DevOps Engineer",
      company: "VNG Campus",
      employerName: "Pham Minh D",
      employerEmail: "careers@vng.com.vn",
      location: "Đường số 13, Khu chế xuất Tân Thuận, Quận 7, TP. Hồ Chí Minh",
      type: "Full-time",
      salary: "25000000",
      description: "Triển khai hệ thống CI/CD, quản lý hạ tầng Cloud trên nền tảng AWS và Kubernetes.",
      status: "APPROVED",
      hidden: false,
      latitude: 10.744158,
      longitude: 106.725178,
      recruiterId: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
    id: "mock-4",
    title: "Fullstack Web Developer Intern",
    company: "Tiki Corporation",
    employerName: "Tiki Careers",
    employerEmail: "jobs@tiki.vn",
    location: "52 Út Tịch, Quận 10, TP. Hồ Chí Minh", // Khu vực cư xá Bắc Hải giáp Q10
    type: "Internship",
    salary: "5500000",
    description: "Phát triển các tính năng E-commerce sử dụng Next.js (React) và Node.js Express.",
    status: "APPROVED",
    hidden: false,
    latitude: 10.7925012,
    longitude: 106.6601445,
    recruiterId: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null,
  },
  {
    id: "mock-5",
    title: "Mobile App Developer Intern (React Native)",
    company: "ZaloPay Team",
    employerName: "Zalo HR",
    employerEmail: "contact@zalopay.vn",
    location: "M7 Tòa nhà IPC, 1489 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh",
    type: "Internship",
    salary: "6500000",
    description: "Xây dựng các module tính năng giao diện trên ứng dụng ví điện tử ZaloPay (iOS & Android).",
    status: "APPROVED",
    hidden: false,
    latitude: 10.7303023,
    longitude: 106.7094251,
    recruiterId: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null,
  },
  {
    id: "mock-6",
    title: "Embedded Systems Intern",
    company: "PTIT Lab",
    employerName: "Admin Lab",
    employerEmail: "lab@ptit.edu.vn",
    location: "Thành Thái, Phường 14, Quận 10, TP. Hồ Chí Minh",
    type: "Internship",
    salary: "4500000",
    description: "Nghiên cứu lập trình nhúng vi điều khiển, kết nối cảm biến và các giao thức truyền thông IoT.",
    status: "APPROVED",
    hidden: false,
    latitude: 10.7711413,
    longitude: 106.6631835,
    recruiterId: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null,
  },
  {
    id: "mock-7",
    title: "AI & Data Science Intern",
    company: "HCMUS Tech",
    employerName: "AI Center",
    employerEmail: "aiedu@hcmus.edu.vn",
    location: "227 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh",
    type: "Internship",
    salary: "7000000",
    description: "Tham gia tiền xử lý dữ liệu lớn, xây dựng và huấn luyện mô hình Machine Learning/Deep Learning.",
    status: "APPROVED",
    hidden: false,
    latitude: 10.7628876,
    longitude: 106.6823123,
    recruiterId: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null,
  }
  ], []);

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
        setJobs([...(jobsResult || []), ...MOCK_JOBS]);
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
  }, [t, MOCK_JOBS]);

  const filterOptions = useMemo<JobFilterOptions>(() => {
    if (provinceOptions.length === 0) return managedConfig.filters;
    return {
      ...managedConfig.filters,
      cities: provinceOptions,
      districts: managedConfig.filters.districts || [],
      wards: wardOptions,
    };
  }, [managedConfig.filters, provinceOptions, wardOptions]);

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

  // 🎯 ĐÃ THÊM: Tính toán tọa độ tâm bản đồ từ công việc đầu tiên trong danh sách kết quả sau lọc
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

  const submitApplication = async () => {
    if (!applyJobId || !selectedCvId || !token) return;
    setIsApplying(true);
    try {
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
          jobs={filteredJobs}
          mapCenterPosition={mapCenterPosition} // <--- ĐÃ TRUYỀN TỌA ĐỘ ĐỘNG XUỐNG BỘ LỌC
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