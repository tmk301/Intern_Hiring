import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  convertVndToCurrency,
  getCurrencyCode,
  getSalaryRangeOption,
  SALARY_RANGE_OPTIONS,
  type JobFilterOptions,
  type JobFilterOption,
  type JobFilterValue,
  type SalaryRangeOption,
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

const formatCurrencyAmount = (value: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);

const getOptionLabel = (
  options: JobFilterOption[],
  selectedValue: string,
  translate: (key: string) => string,
) => {
  const option = options.find((item) => item.value === selectedValue);
  if (!option) return "";
  return option.labelKey ? translate(option.labelKey) : option.label;
};

const getSalaryRangeLabel = (
  option: SalaryRangeOption,
  currencyValue: string,
  translate: (key: string, options?: Record<string, string>) => string,
) => {
  const currency = getCurrencyCode(currencyValue);
  if (currency === "VND") return translate(option.labelKey);

  const min = convertVndToCurrency(option.minVnd, currency);
  const max = option.maxVnd === null ? null : convertVndToCurrency(option.maxVnd, currency);

  if (max === null) return translate("jobs.filters.options.salaryRanges.usdFrom", { amount: formatCurrencyAmount(min) });
  if (option.minVnd === 0) return translate("jobs.filters.options.salaryRanges.usdUnder", { amount: formatCurrencyAmount(max) });
  return translate("jobs.filters.options.salaryRanges.usdBetween", {
    min: formatCurrencyAmount(min),
    max: formatCurrencyAmount(max),
  });
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

  const updateSalaryRange = (nextValue: string) => {
    const selectedRange = getSalaryRangeOption(nextValue);
    const nextFilterValue = {
      ...filterValue,
      salaryRange: nextValue,
      salaryMin: selectedRange ? String(selectedRange.minVnd) : "",
      salaryMax: selectedRange?.maxVnd === null || !selectedRange ? "" : String(selectedRange.maxVnd),
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

            <SelectFilter
              label={t("jobs.filters.workMode")}
              value={filterValue.workMode}
              options={filterOptions.workModes}
              onChange={(nextValue) => updateValue("workMode", nextValue)}
            />

            <SelectFilter
              label={t("jobs.filters.jobType")}
              value={filterValue.jobType}
              options={filterOptions.jobTypes}
              onChange={(nextValue) => updateValue("jobType", nextValue)}
            />
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
                  company={filterValue.company}
                  keyword={filterValue.keyword}
                  jobs={jobs}
                  areaQuery={selectedAreaQuery}
                  centerPosition={mapCenterPosition} // <--- TRUYỀN TỌA ĐỘ TRUNG TÂM ĐỘNG XUỐNG ĐÂY
                  onChange={(nextValue) => updateValue("location", nextValue)}
                />
              </div>

              <SelectFilter
                label={t("jobs.filters.currency")}
                value={filterValue.currency}
                options={filterOptions.currencies}
                onChange={(nextValue) => updateValue("currency", nextValue)}
              />

              <div className="space-y-2">
                <Label>{t("jobs.filters.salary")}</Label>
                <Select
                  value={filterValue.salaryRange || ALL_VALUE}
                  onValueChange={(nextValue) => updateSalaryRange(nextValue === ALL_VALUE ? "" : nextValue)}
                >
                  <SelectTrigger className="h-12 bg-white transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground">
                    <SelectValue placeholder={t("jobs.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE} className="focus:bg-primary focus:text-primary-foreground">
                      {t("jobs.filters.all")}
                    </SelectItem>
                    {SALARY_RANGE_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="focus:bg-primary focus:text-primary-foreground"
                      >
                        {getSalaryRangeLabel(option, filterValue.currency, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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