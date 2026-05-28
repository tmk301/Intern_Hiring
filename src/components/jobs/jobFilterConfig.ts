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
  minOpenings: string;
  minSalary: string;
  currency: string;
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
  minOpenings: "",
  minSalary: "",
  currency: "",
};

export const defaultJobFilterOptions: JobFilterOptions = {
  cities: [],
  workModes: [
    { value: "onsite", label: "On-site", labelKey: "jobs.filters.options.workModes.onsite" },
    { value: "hybrid", label: "Hybrid", labelKey: "jobs.filters.options.workModes.hybrid" },
    { value: "remote", label: "Remote", labelKey: "jobs.filters.options.workModes.remote" },
  ],
  jobTypes: [
    { value: "internship", label: "Internship", labelKey: "jobs.filters.options.jobTypes.internship" },
    { value: "part-time", label: "Part-time", labelKey: "jobs.filters.options.jobTypes.partTime" },
    { value: "full-time", label: "Full-time", labelKey: "jobs.filters.options.jobTypes.fullTime" },
  ],
  districts: [],
  wards: [],
  companies: [
    { value: "asl", label: "ASL" },
    { value: "binemo", label: "Binemo" },
    { value: "cp-group", label: "CP Group" },
  ],
  currencies: [
    { value: "vnd", label: "VND" },
    { value: "usd", label: "USD" },
  ],
};
