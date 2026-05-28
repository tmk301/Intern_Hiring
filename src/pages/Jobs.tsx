import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, CalendarDays, Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobSearchFilters } from "@/components/jobs/JobSearchFilters";
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
import { supabase } from "@/lib/supabase";
import { getVietnamDistrictOptions, getVietnamProvinceOptions, getVietnamWardOptions } from "@/lib/vietnamProvinces";

type SupabaseJob = {
  id: string | number;
  title: string | null;
  company: string | null;
  employer_name: string | null;
  employer_email: string | null;
  location: string | null;
  type: string | null;
  salary: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
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

const getSearchText = (job: SupabaseJob) =>
  [
    job.title,
    job.company,
    job.employer_name,
    job.employer_email,
    job.location,
    job.type,
    job.salary,
    job.description,
  ].join(" ");

const getMaxNumber = (value?: string | null) => {
  const numbers = value?.match(/\d+(?:[.,]\d+)?/g)?.map((item) => Number(item.replace(",", "."))) ?? [];
  return numbers.length > 0 ? Math.max(...numbers) : null;
};

const isVisibleJob = (job: SupabaseJob) => {
  const status = job.status?.toUpperCase();
  return !job.deleted_at && !["TRASHED", "DELETED", "HIDDEN", "INACTIVE", "DRAFT"].includes(status ?? "");
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
  jobs: SupabaseJob[],
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
  const [districtOptions, setDistrictOptions] = useState<JobFilterOption[]>([]);
  const [wardOptions, setWardOptions] = useState<JobFilterOption[]>([]);
  const [jobs, setJobs] = useState<SupabaseJob[]>([]);
  const [filterValue, setFilterValue] = useState<JobFilterValue>({
    ...emptyJobFilterValue,
    keyword: initialKeyword,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFilterValue((current) => ({ ...current, keyword: initialKeyword }));
  }, [initialKeyword]);

  useEffect(() => {
    let mounted = true;

    getVietnamProvinceOptions()
      .then((options) => {
        if (mounted) {
          setProvinceOptions(options);
        }
      })
      .catch(() => {
        if (mounted) {
          setProvinceOptions([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const selectedProvince = provinceOptions.find((option) => option.value === filterValue.city);

    if (!selectedProvince) {
      setDistrictOptions([]);
      setWardOptions([]);
      return () => {
        mounted = false;
      };
    }

    setDistrictOptions([]);
    setWardOptions([]);
    getVietnamDistrictOptions(filterValue.city)
      .then((options) => {
        if (mounted) {
          setDistrictOptions(options);
        }
      })
      .catch(() => {
        if (mounted) {
          setDistrictOptions([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [filterValue.city, provinceOptions]);

  useEffect(() => {
    let mounted = true;
    const selectedDistrict = districtOptions.find((option) => option.value === filterValue.district);

    if (!selectedDistrict) {
      setWardOptions([]);
      return () => {
        mounted = false;
      };
    }

    setWardOptions([]);
    getVietnamWardOptions(filterValue.district)
      .then((options) => {
        if (mounted) {
          setWardOptions(options);
        }
      })
      .catch(() => {
        if (mounted) {
          setWardOptions([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [filterValue.district, districtOptions]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setErrorMessage(null);

      const [config, jobsResult] = await Promise.all([
        loadManagedSiteConfig(),
        supabase
          .from("jobs")
          .select("id,title,company,employer_name,employer_email,location,type,salary,description,status,created_at,updated_at,deleted_at")
          .order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;

      setManagedConfig(config);

      if (jobsResult.error) {
        setErrorMessage(jobsResult.error.message || t("jobs.page.loadError"));
        setJobs([]);
      } else {
        setJobs(((jobsResult.data ?? []) as SupabaseJob[]).filter(isVisibleJob));
      }

      setLoading(false);
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
      districts: districtOptions,
      wards: wardOptions,
    };
  }, [districtOptions, managedConfig.filters, provinceOptions, wardOptions]);

  const filteredJobs = useMemo(
    () => filterJobs(jobs, filterValue, filterOptions, t),
    [jobs, filterValue, filterOptions, t],
  );
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";

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
              <Card key={job.id} className="overflow-hidden">
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="text-xl">{job.title || t("jobs.page.untitled")}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {job.company || job.employer_name || t("jobs.page.notProvided")}
                      </p>
                    </div>
                    {job.status && <Badge variant="secondary">{job.status}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {job.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    )}
                    {job.created_at && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(job.created_at).toLocaleDateString(dateLocale)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {job.type && <Badge variant="outline">{job.type}</Badge>}
                    {job.salary && <Badge variant="outline">{job.salary}</Badge>}
                  </div>
                  {job.description && (
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {job.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Jobs;
