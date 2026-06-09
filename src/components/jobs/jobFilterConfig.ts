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
  salaryMin: string;
  salaryMax: string;
  currency: string;
  experience: string;
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
  salaryMin: "",
  salaryMax: "",
  currency: "",
  experience: "",
};

export const defaultJobFilterOptions: JobFilterOptions = {
  cities: [],
  workModes: [],
  jobTypes: [],
  districts: [],
  wards: [],
  companies: [],
  currencies: [],
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
