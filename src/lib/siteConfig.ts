import { defaultJobFilterOptions, type JobFilterOptions, type JobFilterOption } from "@/components/jobs/jobFilterConfig";
import { apiRequest } from "@/lib/api";
import { loadSanityLoginHero } from "@/lib/sanityLoginHero";

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

export type LoginHeroConfig = {
  title: string;
  description: string;
  securityText: string;
  backgroundColor: string;
  textColor: string;
  imageUrl: string;
};

export type ManagedSiteConfig = {
  filters: JobFilterOptions;
  partners: ManagedPartner[];
  employerVerificationFields: EmployerVerificationField[];
  loginHero: LoginHeroConfig;
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
  experience: "Experience",
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

export const defaultLoginHeroConfig: LoginHeroConfig = {
  title: "Welcome back to InternHiring",
  description: "Continue connecting with internship programs, partner companies, and career development opportunities.",
  securityText: "Accounts are verified through Supabase Auth and synced with candidate profiles.",
  backgroundColor: "#2563eb",
  textColor: "#ffffff",
  imageUrl: "",
};

export const defaultManagedSiteConfig: ManagedSiteConfig = {
  filters: defaultJobFilterOptions,
  partners: defaultCorporatePartners,
  employerVerificationFields: defaultEmployerVerificationFields,
  loginHero: defaultLoginHeroConfig,
};

const SITE_CONFIG_ENDPOINT = "/api/site-config";
const ADMIN_SITE_CONFIG_ENDPOINT = "/api/admin/site-config";
const LOCAL_STORAGE_KEY = "intern_hiring_managed_site_config_local";

const canUseLocalConfigFallback = () => {
  if (typeof window === "undefined") return false;

  return import.meta.env.DEV || ["localhost", "127.0.0.1"].includes(window.location.hostname);
};

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
  loginHero: {
    ...defaultLoginHeroConfig,
    ...(config?.loginHero || {}),
  },
});

const readLocalConfigFallback = () => {
  try {
    const rawConfig = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return rawConfig ? normalizeManagedSiteConfig(JSON.parse(rawConfig)) : defaultManagedSiteConfig;
  } catch {
    return defaultManagedSiteConfig;
  }
};

const saveLocalConfigFallback = (config: ManagedSiteConfig) => {
  const normalized = normalizeManagedSiteConfig(config);
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("managed-site-config-updated", { detail: normalized }));

  return normalized;
};

export const loadManagedSiteConfig = async (): Promise<ManagedSiteConfig> => {
  try {
    const config = await apiRequest<Partial<ManagedSiteConfig> | ManagedSiteConfig>(SITE_CONFIG_ENDPOINT);
    return normalizeManagedSiteConfig(config);
  } catch {
    return canUseLocalConfigFallback() ? readLocalConfigFallback() : defaultManagedSiteConfig;
  }
};

export const loadLoginHeroConfig = async (): Promise<LoginHeroConfig> => {
  const config = await loadManagedSiteConfig();
  const sanityLoginHero = await loadSanityLoginHero(config.loginHero);
  return sanityLoginHero || config.loginHero;
};

export const saveManagedSiteConfig = async (config: ManagedSiteConfig, token: string) => {
  const normalized = normalizeManagedSiteConfig(config);
  let savedConfig: Partial<ManagedSiteConfig> | ManagedSiteConfig;

  try {
    savedConfig = await apiRequest<Partial<ManagedSiteConfig> | ManagedSiteConfig>(ADMIN_SITE_CONFIG_ENDPOINT, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(normalized),
    });
  } catch (error) {
    if (canUseLocalConfigFallback()) {
      return saveLocalConfigFallback(normalized);
    }

    throw error;
  }

  const nextConfig = normalizeManagedSiteConfig(savedConfig);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("managed-site-config-updated", { detail: nextConfig }));
  }

  return nextConfig;
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
