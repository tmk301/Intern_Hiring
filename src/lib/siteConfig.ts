import { defaultJobFilterOptions, type JobFilterOptions, type JobFilterOption } from "@/components/jobs/jobFilterConfig";
import { apiRequest } from "@/lib/api";
import { loadSanityLoginHero, loadSanityRegisterHero } from "@/lib/sanityLoginHero";

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
  formTitle: string;
  formDescription: string;
  formTitleTextColor: string;
  formDescriptionTextColor: string;
  footerTextColor: string;
  linkTextColor: string;
  pageBackgroundColor: string;
  formBackgroundColor: string;
  inputBackgroundColor: string;
  inputTextColor: string;
  inputBorderColor: string;
  labelTextColor: string;
};

export type RegisterHeroConfig = {
  badge: string;
  title: string;
  description: string;
  noteTitle: string;
  noteText: string;
  backgroundColor: string;
  textColor: string;
  imageUrl: string;
  formTitle: string;
  formDescription: string;
  lastNameLabel: string;
  lastNamePlaceholder: string;
  firstNameLabel: string;
  firstNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
};

export type EmailTemplateConfig = {
  brandName: string;
  headerImageUrl: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  accentColor: string;
  fontSize: number;
  footerText: string;
};

export type LoadingScreenConfig = {
  title: string;
  message: string;
  logoUrl: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  secondaryTextColor: string;
  animationStyle: "spinner" | "dots" | "bar";
  showOnNavigation: boolean;
  showOnMajorActions: boolean;
  overlayMinimumMs: number;
};

export type ManagedSiteConfig = {
  filters: JobFilterOptions;
  partners: ManagedPartner[];
  employerVerificationFields: EmployerVerificationField[];
  loginHero: LoginHeroConfig;
  registerHero: RegisterHeroConfig;
  emailTemplate: EmailTemplateConfig;
  loadingScreen: LoadingScreenConfig;
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
  formTitle: "\u0110\u0103ng nh\u1eadp",
  formDescription: "Nh\u1eadp email v\u00e0 m\u1eadt kh\u1ea9u \u0111\u1ec3 truy c\u1eadp t\u00e0i kho\u1ea3n c\u1ee7a b\u1ea1n.",
  formTitleTextColor: "#0f172a",
  formDescriptionTextColor: "#64748b",
  footerTextColor: "#64748b",
  linkTextColor: "#2563eb",
  pageBackgroundColor: "#f8fafc",
  formBackgroundColor: "#ffffff",
  inputBackgroundColor: "#ffffff",
  inputTextColor: "#0f172a",
  inputBorderColor: "#e2e8f0",
  labelTextColor: "#0f172a",
};

export const defaultRegisterHeroConfig: RegisterHeroConfig = {
  badge: "New candidate",
  title: "Create a profile to start your internship journey",
  description: "Register a candidate account to follow programs, update your profile, and connect with suitable companies.",
  noteTitle: "New accounts are candidate accounts by default.",
  noteText: "Are you a recruiter? After creating an account, request verification to receive permissions.",
  backgroundColor: "#f1f5f9",
  textColor: "#0f172a",
  imageUrl: "",
  formTitle: "Đăng ký tài khoản",
  formDescription: "Hoàn tất thông tin bên dưới để tạo tài khoản ứng viên.",
  lastNameLabel: "Họ",
  lastNamePlaceholder: "Nguyen",
  firstNameLabel: "Tên",
  firstNamePlaceholder: "An",
  emailLabel: "Email",
  emailPlaceholder: "ten@example.com",
  phoneLabel: "Số điện thoại",
  phonePlaceholder: "0901234567",
  passwordLabel: "Mật khẩu",
  passwordPlaceholder: "Tối thiểu 6 ký tự",
};

export const defaultEmailTemplateConfig: EmailTemplateConfig = {
  brandName: "",
  headerImageUrl: "",
  backgroundColor: "#f8fafc",
  cardColor: "#ffffff",
  textColor: "#334155",
  accentColor: "#2563eb",
  fontSize: 15,
  footerText: "",
};

export const defaultLoadingScreenConfig: LoadingScreenConfig = {
  title: "InternHiring",
  message: "",
  logoUrl: "",
  backgroundColor: "#f8fafc",
  textColor: "#0f172a",
  accentColor: "#2563eb",
  secondaryTextColor: "#64748b",
  animationStyle: "spinner",
  showOnNavigation: true,
  showOnMajorActions: true,
  overlayMinimumMs: 450,
};

export const defaultManagedSiteConfig: ManagedSiteConfig = {
  filters: defaultJobFilterOptions,
  partners: [],
  employerVerificationFields: defaultEmployerVerificationFields,
  loginHero: defaultLoginHeroConfig,
  registerHero: defaultRegisterHeroConfig,
  emailTemplate: defaultEmailTemplateConfig,
  loadingScreen: defaultLoadingScreenConfig,
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
  registerHero: {
    ...defaultRegisterHeroConfig,
    ...(config?.registerHero || {}),
  },
  emailTemplate: {
    ...defaultEmailTemplateConfig,
    ...(config?.emailTemplate || {}),
    fontSize:
      typeof config?.emailTemplate?.fontSize === "number"
        ? config.emailTemplate.fontSize
        : defaultEmailTemplateConfig.fontSize,
  },
  loadingScreen: {
    ...defaultLoadingScreenConfig,
    ...(config?.loadingScreen || {}),
    animationStyle: ["spinner", "dots", "bar"].includes(config?.loadingScreen?.animationStyle || "")
      ? config?.loadingScreen?.animationStyle || defaultLoadingScreenConfig.animationStyle
      : defaultLoadingScreenConfig.animationStyle,
    showOnNavigation:
      typeof config?.loadingScreen?.showOnNavigation === "boolean"
        ? config.loadingScreen.showOnNavigation
        : defaultLoadingScreenConfig.showOnNavigation,
    showOnMajorActions:
      typeof config?.loadingScreen?.showOnMajorActions === "boolean"
        ? config.loadingScreen.showOnMajorActions
        : defaultLoadingScreenConfig.showOnMajorActions,
    overlayMinimumMs:
      typeof config?.loadingScreen?.overlayMinimumMs === "number"
        ? Math.max(150, Math.min(2000, config.loadingScreen.overlayMinimumMs))
        : defaultLoadingScreenConfig.overlayMinimumMs,
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

export const getLocalizedDefaultLoginHero = (lang?: string): LoginHeroConfig => {
  const isEn = lang?.startsWith("en");
  return {
    title: isEn ? "Welcome back to InternHiring" : "Chào mừng quay lại với InternHiring",
    description: isEn
      ? "Continue connecting with internship programs, partner companies, and career development opportunities."
      : "Tiếp tục kết nối với các chương trình thực tập, công ty đối tác và cơ hội phát triển nghề nghiệp.",
    securityText: isEn
      ? "Accounts are verified through Supabase Auth and synced with candidate profiles."
      : "Tài khoản được xác thực qua Supabase Auth và đồng bộ với hồ sơ ứng viên.",
    backgroundColor: "#2563eb",
    textColor: "#ffffff",
    imageUrl: "",
    formTitle: isEn ? "Log in" : "Đăng nhập",
    formDescription: isEn
      ? "Enter email and password to access your account."
      : "Nhập email và mật khẩu để truy cập tài khoản của bạn.",
    formTitleTextColor: "#0f172a",
    formDescriptionTextColor: "#64748b",
    footerTextColor: "#64748b",
    linkTextColor: "#2563eb",
    pageBackgroundColor: "#f8fafc",
    formBackgroundColor: "#ffffff",
    inputBackgroundColor: "#ffffff",
    inputTextColor: "#0f172a",
    inputBorderColor: "#e2e8f0",
    labelTextColor: "#0f172a",
  };
};

export const getLocalizedDefaultRegisterHero = (lang?: string): RegisterHeroConfig => {
  const isEn = lang?.startsWith("en");
  return {
    badge: isEn ? "New candidate" : "Ứng viên mới",
    title: isEn
      ? "Create a profile to start your internship journey"
      : "Tạo hồ sơ để bắt đầu hành trình thực tập",
    description: isEn
      ? "Register a candidate account to follow programs, update your profile, and connect with suitable companies."
      : "Đăng ký tài khoản ứng viên để theo dõi chương trình, cập nhật hồ sơ và kết nối với các doanh nghiệp phù hợp.",
    noteTitle: isEn
      ? "New accounts are candidate accounts by default."
      : "Tài khoản mới mặc định là tài khoản ứng viên.",
    noteText: isEn
      ? "Are you a recruiter? After creating an account, request verification to receive permissions."
      : "Bạn là nhà tuyển dụng? Sau khi tạo tài khoản, hãy gửi yêu cầu xác thực để nhận quyền.",
    backgroundColor: "#f1f5f9",
    textColor: "#0f172a",
    imageUrl: "",
    formTitle: isEn ? "Register account" : "Đăng ký tài khoản",
    formDescription: isEn
      ? "Complete the information below to create a candidate account."
      : "Hoàn tất thông tin bên dưới để tạo tài khoản ứng viên.",
    lastNameLabel: isEn ? "Last Name" : "Họ",
    lastNamePlaceholder: "Nguyen",
    firstNameLabel: isEn ? "First Name" : "Tên",
    firstNamePlaceholder: "An",
    emailLabel: "Email",
    emailPlaceholder: "ten@example.com",
    phoneLabel: isEn ? "Phone number" : "Số điện thoại",
    phonePlaceholder: "0901234567",
    passwordLabel: isEn ? "Password" : "Mật khẩu",
    passwordPlaceholder: isEn ? "Minimum 6 characters" : "Tối thiểu 6 ký tự",
  };
};

export const loadLoginHeroConfig = async (lang?: string): Promise<LoginHeroConfig> => {
  const config = await loadManagedSiteConfig();
  const defaultHero = getLocalizedDefaultLoginHero(lang);
  
  const mergedHero = {
    ...defaultHero,
    ...config.loginHero,
  };
  
  if (config.loginHero.title === defaultLoginHeroConfig.title) {
    mergedHero.title = defaultHero.title;
  }
  if (config.loginHero.description === defaultLoginHeroConfig.description) {
    mergedHero.description = defaultHero.description;
  }
  if (config.loginHero.securityText === defaultLoginHeroConfig.securityText) {
    mergedHero.securityText = defaultHero.securityText;
  }
  if (config.loginHero.formTitle === defaultLoginHeroConfig.formTitle) {
    mergedHero.formTitle = defaultHero.formTitle;
  }
  if (config.loginHero.formDescription === defaultLoginHeroConfig.formDescription) {
    mergedHero.formDescription = defaultHero.formDescription;
  }

  const sanityLoginHero = await loadSanityLoginHero(mergedHero, lang);
  return sanityLoginHero || mergedHero;
};

export const loadRegisterHeroConfig = async (lang?: string): Promise<RegisterHeroConfig> => {
  const config = await loadManagedSiteConfig();
  const defaultHero = getLocalizedDefaultRegisterHero(lang);
  
  const mergedHero = {
    ...defaultHero,
    ...config.registerHero,
  };

  const fieldsToCheck = [
    "badge", "title", "description", "noteTitle", "noteText",
    "formTitle", "formDescription", "lastNameLabel", "firstNameLabel",
    "phoneLabel", "passwordLabel", "passwordPlaceholder"
  ] as const;

  for (const field of fieldsToCheck) {
    if (config.registerHero[field] === defaultRegisterHeroConfig[field]) {
      mergedHero[field] = defaultHero[field] as any;
    }
  }

  const sanityRegisterHero = await loadSanityRegisterHero(mergedHero, lang);
  return sanityRegisterHero || mergedHero;
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
