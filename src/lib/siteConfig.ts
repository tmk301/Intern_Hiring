import { defaultJobFilterOptions, type JobFilterOptions, type JobFilterOption } from "@/components/jobs/jobFilterConfig";

export type ManagedPartner = {
  id: string;
  name: string;
  logo: string;
};

export type EmployerVerificationField = {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "number";
  placeholder?: string;
  required?: boolean;
};

export type ManagedSiteConfig = {
  filters: JobFilterOptions;
  partners: ManagedPartner[];
  employerVerificationFields: EmployerVerificationField[];
};

export type FilterCategoryKey = keyof JobFilterOptions;

export const filterCategoryLabels: Record<FilterCategoryKey, string> = {
  cities: "Province/City",
  workModes: "Work mode",
  jobTypes: "Job type",
  districts: "District",
  wards: "Ward",
  companies: "Company",
  currencies: "Currency",
};

export const defaultCorporatePartners: ManagedPartner[] = [
  { id: "asl", name: "ASL", logo: "/carousel/ASL.webp" },
  { id: "binemo", name: "Binemo", logo: "/carousel/Binemo.webp" },
  { id: "cp", name: "CP Group", logo: "/carousel/CP.webp" },
  { id: "greenfeed", name: "Greenfeed", logo: "/carousel/Greenfeed.webp" },
  { id: "happyland", name: "Happy Land", logo: "/carousel/Happyland.webp" },
  { id: "hto-group", name: "HTO Group", logo: "/carousel/HTOGroup.webp" },
  { id: "nab", name: "NAB", logo: "/carousel/NAB.webp" },
  { id: "richs", name: "Richs Vietnam", logo: "/carousel/Richs.webp" },
  { id: "satra", name: "Satra", logo: "/carousel/Satra.webp" },
  { id: "schindler", name: "Schindler", logo: "/carousel/Schindler.webp" },
  { id: "sgc", name: "SGC", logo: "/carousel/SGC.webp" },
  { id: "sgf", name: "SGF", logo: "/carousel/SGF.webp" },
  { id: "sggg", name: "SGGG", logo: "/carousel/SGGG.webp" },
  { id: "sgl", name: "SGL", logo: "/carousel/SGL.webp" },
  { id: "shinhan", name: "Shinhan Bank", logo: "/carousel/Shinhan.webp" },
  { id: "smar", name: "Smar", logo: "/carousel/Smar.webp" },
  { id: "smentor", name: "Smentor", logo: "/carousel/Smentor.webp" },
  { id: "sp", name: "SP", logo: "/carousel/SP.webp" },
  { id: "tc", name: "Tam Chau", logo: "/carousel/TC.webp" },
  { id: "vnpt", name: "VNPT", logo: "/carousel/VNPT.webp" },
  { id: "wk", name: "WK", logo: "/carousel/WK.webp" },
  { id: "yesco", name: "YESCO", logo: "/carousel/YESCO.webp" },
];

export const defaultEmployerVerificationFields: EmployerVerificationField[] = [
  {
    id: "company-name",
    name: "companyName",
    label: "Company name",
    type: "text",
    placeholder: "ABC Company Ltd.",
    required: true,
  },
  {
    id: "company-email",
    name: "companyEmail",
    label: "Company email",
    type: "email",
    placeholder: "hr@company.com",
    required: true,
  },
  {
    id: "tax-code",
    name: "taxCode",
    label: "Tax code",
    type: "text",
    placeholder: "0312345678",
    required: true,
  },
];

export const defaultManagedSiteConfig: ManagedSiteConfig = {
  filters: defaultJobFilterOptions,
  partners: defaultCorporatePartners,
  employerVerificationFields: defaultEmployerVerificationFields,
};

const STORAGE_KEY = "intern_hiring_managed_site_config";

const mergeFilterOptions = (incoming?: Partial<JobFilterOptions>): JobFilterOptions => {
  const merged = { ...defaultJobFilterOptions };

  Object.keys(merged).forEach((key) => {
    const filterKey = key as FilterCategoryKey;
    merged[filterKey] = Array.isArray(incoming?.[filterKey])
      ? (incoming?.[filterKey] as JobFilterOption[])
      : merged[filterKey];
  });

  return merged;
};

export const normalizeManagedSiteConfig = (config?: Partial<ManagedSiteConfig> | null): ManagedSiteConfig => ({
  filters: mergeFilterOptions(config?.filters),
  partners: Array.isArray(config?.partners) ? config.partners : defaultManagedSiteConfig.partners,
  employerVerificationFields: Array.isArray(config?.employerVerificationFields)
    ? config.employerVerificationFields
    : defaultManagedSiteConfig.employerVerificationFields,
});

const readLocalConfig = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeManagedSiteConfig(JSON.parse(raw)) : defaultManagedSiteConfig;
  } catch {
    return defaultManagedSiteConfig;
  }
};

export const loadManagedSiteConfig = async (): Promise<ManagedSiteConfig> => {
  if (typeof window === "undefined") return defaultManagedSiteConfig;
  return readLocalConfig();
};

export const saveManagedSiteConfig = async (config: ManagedSiteConfig) => {
  const normalized = normalizeManagedSiteConfig(config);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("managed-site-config-updated", { detail: normalized }));

  return normalized;
};

export const createOptionValue = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
