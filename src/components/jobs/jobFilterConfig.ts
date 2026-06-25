export type JobFilterOption = {
  value: string;
  label: string;
  labelKey?: string;
  aliases?: string[];
  disabled?: boolean;
};

export type JobFilterOptions = {
  cities: JobFilterOption[];
  workModes: JobFilterOption[];
  jobTypes: JobFilterOption[];
  districts: JobFilterOption[];
  wards: JobFilterOption[];
  companies: JobFilterOption[];
  currencies: JobFilterOption[];
  experience: JobFilterOption[];
};

export type JobFilterValue = {
  keyword: string;
  city: string;
  workMode: string;
  jobType: string;
  district: string;
  ward: string;
  location: string;
  company: string;
  salaryRange: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  experience: string;
};

export type CurrencyCode = "VND" | "USD";

export type SalaryRangeOption = {
  value: string;
  labelKey: string;
  minVnd: number;
  maxVnd: number | null;
};

export const emptyJobFilterValue: JobFilterValue = {
  keyword: "",
  city: "",
  workMode: "",
  jobType: "",
  district: "",
  ward: "",
  location: "",
  company: "",
  salaryRange: "",
  salaryMin: "",
  salaryMax: "",
  currency: "",
  experience: "",
};

export const USD_TO_VND_RATE = 25_000;

export const WORK_MODE_OPTIONS: JobFilterOption[] = [
  {
    value: "On-site",
    label: "On-site",
    labelKey: "jobs.filters.options.workModes.onsite",
    aliases: ["Onsite", "Tai van phong", "Tai cong ty", "Lam viec tai van phong"],
  },
  {
    value: "Remote",
    label: "Remote",
    labelKey: "jobs.filters.options.workModes.remote",
    aliases: ["Lam viec tu xa", "Tu xa"],
  },
  {
    value: "Hybrid",
    label: "Hybrid",
    labelKey: "jobs.filters.options.workModes.hybrid",
    aliases: ["Ket hop", "Linh hoat"],
  },
];

export const JOB_TYPE_OPTIONS: JobFilterOption[] = [
  {
    value: "Full-time",
    label: "Full-time",
    labelKey: "jobs.filters.options.jobTypes.fullTime",
    aliases: ["Full time", "Toan thoi gian"],
  },
  {
    value: "Part-time",
    label: "Part-time",
    labelKey: "jobs.filters.options.jobTypes.partTime",
    aliases: ["Part time", "Ban thoi gian"],
  },
  {
    value: "Freelance",
    label: "Freelance",
    labelKey: "jobs.filters.options.jobTypes.freelance",
    aliases: ["Tu do"],
  },
  {
    value: "Internship",
    label: "Internship",
    labelKey: "jobs.filters.options.jobTypes.internship",
    aliases: ["Intern", "Thuc tap", "Thuc tap sinh"],
  },
];

export const CURRENCY_OPTIONS: JobFilterOption[] = [
  { value: "VND", label: "VND", labelKey: "jobs.filters.options.currencies.vnd" },
  { value: "USD", label: "USD", labelKey: "jobs.filters.options.currencies.usd" },
];

export const SALARY_RANGE_OPTIONS: SalaryRangeOption[] = [
  {
    value: "under-5m",
    labelKey: "jobs.filters.options.salaryRanges.under5",
    minVnd: 0,
    maxVnd: 5_000_000,
  },
  {
    value: "5m-10m",
    labelKey: "jobs.filters.options.salaryRanges.from5To10",
    minVnd: 5_000_000,
    maxVnd: 10_000_000,
  },
  {
    value: "10m-15m",
    labelKey: "jobs.filters.options.salaryRanges.from10To15",
    minVnd: 10_000_000,
    maxVnd: 15_000_000,
  },
  {
    value: "15m-20m",
    labelKey: "jobs.filters.options.salaryRanges.from15To20",
    minVnd: 15_000_000,
    maxVnd: 20_000_000,
  },
  {
    value: "20m-30m",
    labelKey: "jobs.filters.options.salaryRanges.from20To30",
    minVnd: 20_000_000,
    maxVnd: 30_000_000,
  },
  {
    value: "from-30m",
    labelKey: "jobs.filters.options.salaryRanges.from30",
    minVnd: 30_000_000,
    maxVnd: null,
  },
];

export const getSalaryRangeOption = (value: string) =>
  SALARY_RANGE_OPTIONS.find((option) => option.value === value);

export const getCurrencyCode = (value?: string | null): CurrencyCode =>
  value?.trim().toUpperCase() === "USD" ? "USD" : "VND";

export const convertVndToCurrency = (amount: number, currency: CurrencyCode) =>
  currency === "USD" ? Math.round(amount / USD_TO_VND_RATE) : amount;

export const formatSalaryRangeLabel = (
  salary: string | null | undefined,
  currencyValue: string | null | undefined,
  t: (key: string, options?: any) => string,
) => {
  if (!salary) return "-";
  const option = getSalaryRangeOption(salary);
  if (!option) return salary;

  const currency = getCurrencyCode(currencyValue);

  if (currency === "VND") {
    return `${t(option.labelKey)} VND`;
  }

  const min = convertVndToCurrency(option.minVnd, currency);
  const max = option.maxVnd === null ? null : convertVndToCurrency(option.maxVnd, currency);

  const formatAmount = (val: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(val);

  if (max === null) {
    return `${t("jobs.filters.options.salaryRanges.usdFrom", { amount: formatAmount(min) })} USD`;
  }
  if (option.minVnd === 0) {
    return `${t("jobs.filters.options.salaryRanges.usdUnder", { amount: formatAmount(max) })} USD`;
  }
  return `${t("jobs.filters.options.salaryRanges.usdBetween", {
    min: formatAmount(min),
    max: formatAmount(max),
  })} USD`;
};

export const defaultJobFilterOptions: JobFilterOptions = {
  cities: [],
  workModes: WORK_MODE_OPTIONS,
  jobTypes: JOB_TYPE_OPTIONS,
  districts: [],
  wards: [],
  companies: [],
  currencies: CURRENCY_OPTIONS,
  experience: [
    {
      value: "no-experience",
      label: "Chưa có kinh nghiệm",
      labelKey: "jobs.filters.options.experience.noExperience",
    },
    {
      value: "under-1-year",
      label: "Dưới 1 năm",
      labelKey: "jobs.filters.options.experience.underOneYear",
    },
    { value: "1-year", label: "1 năm", labelKey: "jobs.filters.options.experience.oneYear" },
    { value: "2-years", label: "2 năm", labelKey: "jobs.filters.options.experience.twoYears" },
    { value: "3-years", label: "3 năm", labelKey: "jobs.filters.options.experience.threeYears" },
    {
      value: "over-3-years",
      label: "Trên 3 năm",
      labelKey: "jobs.filters.options.experience.overThreeYears",
    },
  ],
};
