import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { GoogleMapsEmbedLocationFilter } from "./GoogleMapsEmbedLocationFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultJobFilterOptions,
  emptyJobFilterValue,
  type JobFilterOptions,
  type JobFilterOption,
  type JobFilterValue,
} from "./jobFilterConfig";
import { type PublicJobPost } from "@/lib/api";

type JobSearchFiltersProps = {
  options?: Partial<JobFilterOptions>;
  value?: JobFilterValue;
  jobs?: PublicJobPost[];
  mapCenterPosition?: { lat: number; lng: number } | null; // <--- THÊM PROP ĐỂ NHẬN TỌA ĐỘ ĐỘNG
  onChange?: (value: JobFilterValue) => void;
  onReset?: () => void;
};

type SelectFilterProps = {
  label: string;
  value: string;
  options: JobFilterOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const ALL_VALUE = "__all__";
const SALARY_RANGE_MIN = 0;
const SALARY_RANGE_MAX = 50_000_000;
const SALARY_STEP = 500_000;

const formatCurrencyAmount = (value: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);

const formatNumberText = (value: string) => {
  if (!value) return "";
  return formatCurrencyAmount(Number(value));
};

const clampSalaryValue = (value: string, fallback: number) => {
  const numericValue = Number(value || fallback);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(Math.max(numericValue, SALARY_RANGE_MIN), SALARY_RANGE_MAX);
};

const getOptionLabel = (
  options: JobFilterOption[],
  selectedValue: string,
  translate: (key: string) => string,
) => {
  const option = options.find((item) => item.value === selectedValue);
  if (!option) return "";
  return option.labelKey ? translate(option.labelKey) : option.label;
};

function SelectFilter({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: SelectFilterProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("jobs.filters.all");

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || ALL_VALUE}
        disabled={disabled}
        onValueChange={(nextValue) => onChange(nextValue === ALL_VALUE ? "" : nextValue)}
      >
        <SelectTrigger className="h-12 bg-white transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground">
          <SelectValue placeholder={resolvedPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            value={ALL_VALUE}
            className="focus:bg-primary focus:text-primary-foreground"
          >
            {resolvedPlaceholder}
          </SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="focus:bg-primary focus:text-primary-foreground"
            >
              {option.labelKey ? t(option.labelKey) : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function JobSearchFilters({
  options,
  value,
  jobs = [],
  mapCenterPosition, // <--- DETRUCTURE ĐỂ SỬ DỤNG
  onChange,
  onReset,
}: JobSearchFiltersProps) {
  const { t } = useTranslation();
  const [internalValue, setInternalValue] = useState<JobFilterValue>(emptyJobFilterValue);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const filterValue = value ?? internalValue;
  const filterOptions = { ...defaultJobFilterOptions, ...options };

  const selectedAreaQuery = [
    getOptionLabel(filterOptions.wards, filterValue.ward, t),
    getOptionLabel(filterOptions.districts, filterValue.district, t),
    getOptionLabel(filterOptions.cities, filterValue.city, t),
  ]
    .filter(Boolean)
    .join(", ");

  const updateValue = (field: keyof JobFilterValue, nextValue: string) => {
    const nextFilterValue = { ...filterValue, [field]: nextValue };

    if (field === "city") {
      nextFilterValue.district = "";
      nextFilterValue.ward = "";
    }

    if (field === "district") {
      nextFilterValue.ward = "";
    }

    setInternalValue(nextFilterValue);
    onChange?.(nextFilterValue);
  };

  const updateSalaryInputValue = (field: "salaryMin" | "salaryMax", nextValue: string) => {
    updateValue(field, nextValue.replace(/\D/g, ""));
  };

  const salaryMinValue = clampSalaryValue(filterValue.salaryMin, SALARY_RANGE_MIN);
  const salaryMaxValue = clampSalaryValue(filterValue.salaryMax, SALARY_RANGE_MAX);
  const salaryRangeValue =
    salaryMinValue <= salaryMaxValue
      ? [salaryMinValue, salaryMaxValue]
      : [salaryMaxValue, salaryMinValue];

  const updateSalaryRange = (nextValue: number[]) => {
    const [nextMin = SALARY_RANGE_MIN, nextMax = SALARY_RANGE_MAX] = nextValue;
    const nextFilterValue = {
      ...filterValue,
      salaryMin: String(nextMin),
      salaryMax: String(nextMax),
    };

    setInternalValue(nextFilterValue);
    onChange?.(nextFilterValue);
  };

  const resetFilters = () => {
    setInternalValue(emptyJobFilterValue);
    onChange?.(emptyJobFilterValue);
    onReset?.();
  };

  const districtDisabled = !filterValue.city || filterOptions.districts.length === 0;
  const districtPlaceholder = filterValue.city
    ? t("jobs.filters.districtSelectPlaceholder") || "Chọn quận/huyện"
    : t("jobs.filters.districtPlaceholder") || "Vui lòng chọn tỉnh thành trước";

  const wardDisabled = !filterValue.district || filterOptions.wards.length === 0;
  const wardPlaceholder = filterValue.district
    ? t("jobs.filters.wardSelectPlaceholder")
    : t("jobs.filters.wardPlaceholder");

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm md:p-6">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setIsFiltersOpen((current) => !current)}
        aria-expanded={isFiltersOpen}
      >
        <span className="flex items-center gap-3">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <span className="text-xl font-semibold text-foreground">{t("jobs.filters.title")}</span>
        </span>
        {isFiltersOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isFiltersOpen && (
        <>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="job-keyword-filter">{t("jobs.filters.keyword")}</Label>
              <Input
                id="job-keyword-filter"
                value={filterValue.keyword}
                onChange={(event) => updateValue("keyword", event.target.value)}
                placeholder={t("jobs.filters.keywordPlaceholder")}
                className="h-12 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-company-filter">{t("jobs.filters.company")}</Label>
              <Input
                id="job-company-filter"
                value={filterValue.company}
                onChange={(event) => updateValue("company", event.target.value)}
                placeholder={t("jobs.filters.companyPlaceholder")}
                className="h-12 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-work-mode-filter">{t("jobs.filters.workMode")}</Label>
              <Input
                id="job-work-mode-filter"
                value={filterValue.workMode}
                onChange={(event) => updateValue("workMode", event.target.value)}
                placeholder={t("jobs.filters.workModePlaceholder")}
                className="h-12 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-type-filter">{t("jobs.filters.jobType")}</Label>
              <Input
                id="job-type-filter"
                value={filterValue.jobType}
                onChange={(event) => updateValue("jobType", event.target.value)}
                placeholder={t("jobs.filters.jobTypePlaceholder")}
                className="h-12 bg-white"
              />
            </div>
          </div>

          <button
            type="button"
            className="mt-8 flex w-full items-center justify-between gap-3 text-sm font-semibold text-foreground"
            onClick={() => setIsAdvancedOpen((current) => !current)}
            aria-expanded={isAdvancedOpen}
          >
            <span className="flex items-center gap-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              {t("jobs.filters.advanced")}
            </span>
            {isAdvancedOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {isAdvancedOpen && (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <SelectFilter
                label={t("jobs.filters.city")}
                value={filterValue.city}
                options={filterOptions.cities}
                onChange={(nextValue) => updateValue("city", nextValue)}
              />

              <SelectFilter
                label={t("jobs.filters.district") || "Quận/Huyện"}
                value={filterValue.district}
                options={filterOptions.districts}
                placeholder={districtPlaceholder}
                disabled={districtDisabled}
                onChange={(nextValue) => updateValue("district", nextValue)}
              />

              <SelectFilter
                label={t("jobs.filters.ward")}
                value={filterValue.ward}
                options={filterOptions.wards}
                placeholder={wardPlaceholder}
                disabled={wardDisabled}
                onChange={(nextValue) => updateValue("ward", nextValue)}
              />

              <div className="md:col-span-1 xl:col-span-1"></div>

              <div className="md:col-span-2 xl:col-span-4">
                <GoogleMapsEmbedLocationFilter
                  value={filterValue.location}
                  jobs={jobs}
                  areaQuery={selectedAreaQuery}
                  centerPosition={mapCenterPosition} // <--- TRUYỀN TỌA ĐỘ TRUNG TÂM ĐỘNG XUỐNG ĐÂY
                  onChange={(nextValue) => updateValue("location", nextValue)}
                />
              </div>

              <div className="space-y-4 md:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="job-salary-range-filter">{t("jobs.filters.salary")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={formatNumberText(filterValue.salaryMin)}
                      onChange={(event) => updateSalaryInputValue("salaryMin", event.target.value)}
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      className="h-8 w-24 bg-white text-right text-sm"
                      aria-label={t("jobs.filters.salaryMin")}
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                      value={formatNumberText(filterValue.salaryMax)}
                      onChange={(event) => updateSalaryInputValue("salaryMax", event.target.value)}
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      className="h-8 w-24 bg-white text-right text-sm"
                      aria-label={t("jobs.filters.salaryMax")}
                    />
                  </div>
                </div>
                <Slider
                  id="job-salary-range-filter"
                  min={SALARY_RANGE_MIN}
                  max={SALARY_RANGE_MAX}
                  step={SALARY_STEP}
                  value={salaryRangeValue}
                  onValueChange={updateSalaryRange}
                  minStepsBetweenThumbs={1}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-currency-filter">{t("jobs.filters.currency")}</Label>
                <Input
                  id="job-currency-filter"
                  value={filterValue.currency}
                  onChange={(event) => updateValue("currency", event.target.value)}
                  placeholder={t("jobs.filters.currencyPlaceholder")}
                  className="h-12 bg-white"
                />
              </div>

              <SelectFilter
                label={t("jobs.filters.experience")}
                value={filterValue.experience}
                options={filterOptions.experience}
                onChange={(nextValue) => updateValue("experience", nextValue)}
              />
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button type="button" variant="outline" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" />
              {t("jobs.filters.reset")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}