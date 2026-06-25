import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleMapsEmbedLocationFilter } from "./GoogleMapsEmbedLocationFilter";
import { useSanityManagedInterface } from "@/lib/sanityInterfaceText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
        <SelectTrigger className="h-12 bg-white transition-colors hover:border-primary">
          <SelectValue placeholder={resolvedPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            value={ALL_VALUE}
          >
            {resolvedPlaceholder}
          </SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.labelKey ? t(option.labelKey) : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type SearchableSelectFilterProps = {
  label: string;
  value: string;
  options: JobFilterOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function SearchableSelectFilter({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: SearchableSelectFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const resolvedPlaceholder = placeholder ?? t("jobs.filters.all");

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption
    ? (selectedOption.labelKey ? t(selectedOption.labelKey) : selectedOption.label)
    : resolvedPlaceholder;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex h-12 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm text-left font-normal transition-colors hover:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              open && "border-primary"
            )}
          >
            <span className={cn("truncate", !value ? "text-muted-foreground" : "text-slate-900")}>
              {displayLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/70" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command className="w-full">
            <CommandInput placeholder={t("jobs.filters.keywordPlaceholder") || "Tìm kiếm..."} className="h-10" />
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty>{t("jobs.page.emptyTitle") || "Không tìm thấy"}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={resolvedPlaceholder}
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="cursor-pointer data-[selected='true']:bg-primary/10 data-[selected='true']:text-primary data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {resolvedPlaceholder}
                </CommandItem>
                {options.map((option) => {
                  const labelText = option.labelKey ? t(option.labelKey) : option.label;
                  return (
                    <CommandItem
                      key={option.value}
                      value={labelText}
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className="cursor-pointer data-[selected='true']:bg-primary/10 data-[selected='true']:text-primary data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {labelText}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
  const { text: uiText, pageContent } = useSanityManagedInterface("/jobs");
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
    const resetValue = { ...emptyJobFilterValue, city: "79" };
    setInternalValue(resetValue);
    onChange?.(resetValue);
    onReset?.();
  };

  const districtDisabled = !filterValue.city || filterOptions.districts.length === 0;
  const districtPlaceholder = filterValue.city
    ? t("jobs.filters.districtSelectPlaceholder") || "Chọn quận/huyện"
    : t("jobs.filters.districtPlaceholder") || "Vui lòng chọn tỉnh thành trước";

  const wardDisabled = !filterValue.city || filterOptions.wards.length === 0;
  const wardPlaceholder = filterValue.city
    ? t("jobs.filters.wardSelectPlaceholder") || "Chọn phường/xã"
    : t("jobs.filters.wardPlaceholder") || "Vui lòng chọn tỉnh thành trước";

  return (
    <div
      id="bo-loc-tim-kiem"
      className="rounded-lg border bg-white p-5 shadow-sm md:p-6"
      style={{
        backgroundColor: pageContent.filterBackgroundColor ? String(pageContent.filterBackgroundColor) : undefined,
        borderColor: pageContent.filterBorderColor ? String(pageContent.filterBorderColor) : undefined,
        color: pageContent.filterTextColor ? String(pageContent.filterTextColor) : undefined,
      }}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setIsFiltersOpen((current) => !current)}
        aria-expanded={isFiltersOpen}
      >
        <span className="flex items-center gap-3">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <span className="text-xl font-semibold" style={{color: pageContent.filterTextColor ? String(pageContent.filterTextColor) : undefined}}>{uiText("jobs.filters.title", t("jobs.filters.title"))}</span>
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
              <Label htmlFor="job-keyword-filter">{uiText("jobs.filters.keyword", t("jobs.filters.keyword"))}</Label>
              <Input
                id="job-keyword-filter"
                value={filterValue.keyword}
                onChange={(event) => updateValue("keyword", event.target.value)}
                placeholder={uiText("jobs.filters.keywordPlaceholder", t("jobs.filters.keywordPlaceholder"))}
                className="h-12 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-company-filter">{uiText("jobs.filters.company", t("jobs.filters.company"))}</Label>
              <Input
                id="job-company-filter"
                value={filterValue.company}
                onChange={(event) => updateValue("company", event.target.value)}
                placeholder={uiText("jobs.filters.companyPlaceholder", t("jobs.filters.companyPlaceholder"))}
                className="h-12 bg-white"
              />
            </div>

            <SelectFilter
              label={uiText("jobs.filters.workMode", t("jobs.filters.workMode"))}
              placeholder={uiText("jobs.filters.all", t("jobs.filters.all"))}
              value={filterValue.workMode}
              options={filterOptions.workModes}
              onChange={(nextValue) => updateValue("workMode", nextValue)}
            />

            <SelectFilter
              label={uiText("jobs.filters.jobType", t("jobs.filters.jobType"))}
              placeholder={uiText("jobs.filters.all", t("jobs.filters.all"))}
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
              {uiText("jobs.filters.advanced", t("jobs.filters.advanced"))}
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
                label={uiText("jobs.filters.city", t("jobs.filters.city"))}
                placeholder={uiText("jobs.filters.all", t("jobs.filters.all"))}
                value={filterValue.city}
                options={filterOptions.cities}
                disabled={true}
                onChange={(nextValue) => updateValue("city", nextValue)}
              />

              {filterOptions.districts && filterOptions.districts.length > 0 && (
                <SelectFilter
                  label={t("jobs.filters.district") || "Quận/Huyện"}
                  value={filterValue.district}
                  options={filterOptions.districts}
                  placeholder={districtPlaceholder}
                  disabled={districtDisabled}
                  onChange={(nextValue) => updateValue("district", nextValue)}
                />
              )}

              <SearchableSelectFilter
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
                label={uiText("jobs.filters.currency", t("jobs.filters.currency"))}
                placeholder={uiText("jobs.filters.all", t("jobs.filters.all"))}
                value={filterValue.currency}
                options={filterOptions.currencies}
                onChange={(nextValue) => updateValue("currency", nextValue)}
              />

              <div className="space-y-2">
                <Label>{uiText("jobs.filters.salary", t("jobs.filters.salary"))}</Label>
                <Select
                  value={filterValue.salaryRange || ALL_VALUE}
                  onValueChange={(nextValue) => updateSalaryRange(nextValue === ALL_VALUE ? "" : nextValue)}
                >
                  <SelectTrigger className="h-12 bg-white transition-colors hover:border-primary">
                    <SelectValue placeholder={uiText("jobs.filters.all", t("jobs.filters.all"))} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>
                      {uiText("jobs.filters.all", t("jobs.filters.all"))}
                    </SelectItem>
                    {SALARY_RANGE_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {getSalaryRangeLabel(option, filterValue.currency, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SelectFilter
                label={uiText("jobs.filters.experience", t("jobs.filters.experience"))}
                placeholder={uiText("jobs.filters.all", t("jobs.filters.all"))}
                value={filterValue.experience}
                options={filterOptions.experience}
                onChange={(nextValue) => updateValue("experience", nextValue)}
              />
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button type="button" variant="outline" onClick={resetFilters} className="transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground">
              <RotateCcw className="h-4 w-4 mr-2" />
              {uiText("jobs.filters.reset", t("jobs.filters.reset"))}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}