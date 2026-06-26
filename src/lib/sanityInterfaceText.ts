import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type SanityInterfaceTextItem = {
  key?: string;
  label?: string;
  isVisible?: boolean;
  value?: string;
  valueVi?: string;
  valueEn?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  imageUrl?: string;
};

export type SanityInterfaceTheme = {
  pageBackgroundColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  bodyTextColor?: string;
  mutedTextColor?: string;
  cardBackgroundColor?: string;
  cardBorderColor?: string;
  accentColor?: string;
  headerImageUrl?: string;
  headerImagePosition?: string;
};

type SanityImageSettings = {
  url?: string;
  crop?: {top?: number; bottom?: number; left?: number; right?: number};
  hotspot?: {x?: number; y?: number; width?: number; height?: number};
  dimensions?: {width?: number; height?: number; aspectRatio?: number};
};

export type SanityNavbarItem = {
  _key?: string;
  isVisible?: boolean;
  label?: string;
  labelVi?: string;
  labelEn?: string;
  textColor?: string;
  targetId?: string;
  path?: string;
};

export type SanityNavbarConfig = {
  isEnabled?: boolean;
  brandName?: string;
  brandNameVi?: string;
  brandNameEn?: string;
  logoUrl?: string;
  showTopBar?: boolean;
  topBarText?: string;
  topBarTextVi?: string;
  topBarTextEn?: string;
  topBarBackgroundColor?: string;
  topBarTextColor?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  items?: SanityNavbarItem[];
};

type SanityHomeHeroConfig = {
  isVisible?: boolean;
  title?: string;
  titleVi?: string;
  titleEn?: string;
  subtitle?: string;
  subtitleVi?: string;
  subtitleEn?: string;
  description?: string;
  descriptionVi?: string;
  descriptionEn?: string;
  imageUrl?: string;
};

type SanityHomeContentConfig = Record<string, string | boolean | undefined>;

type SanityProfileDefaultsConfig = Record<string, string | boolean | undefined> & {
  isVisible?: boolean;
};

export type SanityManagedInterface = {
  texts: Record<string, string>;
  textItems: Record<string, SanityInterfaceTextItem>;
  theme: SanityInterfaceTheme;
  navbar: SanityNavbarConfig;
  homeHero: SanityHomeHeroConfig;
  homeContent?: SanityHomeContentConfig;
  profileDefaults: SanityProfileDefaultsConfig;
  pageContent?: SanityHomeContentConfig;
};

type SanityInterfaceResponse = {
  result?: {
    page?: SanityInterfaceDocument | null;
    legacy?: SanityInterfaceDocument | null;
    header?: SanityNavbarConfig | null;
  } | null;
};

type SanityInterfaceDocument = {
  texts?: SanityInterfaceTextItem[];
  theme?: Omit<SanityInterfaceTheme, "headerImageUrl">;
  headerImageUrl?: string;
  headerImage?: SanityImageSettings;
  navbar?: Omit<SanityNavbarConfig, "logoUrl">;
  navbarLogoUrl?: string;
  homeHero?: SanityHomeHeroConfig;
  homeContent?: SanityHomeContentConfig;
  homeAboutVisible?: boolean;
  profileDefaults?: SanityProfileDefaultsConfig;
  jobsContent?: SanityHomeContentConfig;
  applicationsContent?: SanityHomeContentConfig;
  verificationContent?: SanityHomeContentConfig;
  adminContent?: SanityHomeContentConfig;
  recruiterContent?: SanityHomeContentConfig;
  moderatorContent?: SanityHomeContentConfig;
};

const SANITY_PROJECT_ID = import.meta.env.VITE_SANITY_PROJECT_ID;
const SANITY_DATASET = import.meta.env.VITE_SANITY_DATASET || "production";
const SANITY_API_VERSION = import.meta.env.VITE_SANITY_API_VERSION || "2025-01-01";

const interfaceDocumentProjection = `{
    texts[]{
      key,
      label,
      isVisible,
      value,
      valueVi,
      valueEn,
      textColor,
      backgroundColor,
      borderColor,
      "imageUrl": image.asset->url
    },
    theme,
    "headerImageUrl": images.headerImage.asset->url,
    "headerImage": images.headerImage{
      crop,
      hotspot,
      "url": asset->url,
      "dimensions": asset->metadata.dimensions
    },
	    homeHero{
      isVisible,
      title,
      titleVi,
      titleEn,
      subtitle,
      subtitleVi,
      subtitleEn,
      description,
      descriptionVi,
      descriptionEn,
	      "imageUrl": image.asset->url
	    },
	    homeContent,
    "homeAboutVisible": sections[_key == "home-about"][0].isVisible,
	    profileDefaults,
	    jobsContent,
	    applicationsContent,
	    verificationContent,
	    adminContent{
      ...,
      "usersCardImageUrl": usersCardImage.asset->url,
      "jobsCardImageUrl": jobsCardImage.asset->url,
      "categoriesCardImageUrl": categoriesCardImage.asset->url,
      "auditLogsCardImageUrl": auditLogsCardImage.asset->url,
      "emailFormatCardImageUrl": emailFormatCardImage.asset->url,
      "loginBrandingCardImageUrl": loginBrandingCardImage.asset->url
    },
	    recruiterContent,
	    moderatorContent,
	    navbar{
      isEnabled,
      brandName,
      brandNameVi,
      brandNameEn,
      showTopBar,
      topBarText,
      topBarTextVi,
      topBarTextEn,
      topBarBackgroundColor,
      topBarTextColor,
      backgroundColor,
      textColor,
      accentColor,
      buttonBackgroundColor,
      buttonTextColor,
      items[]{
        _key,
        isVisible,
        label,
        labelVi,
        labelEn,
        textColor,
        targetId,
        path
      }
    },
    "navbarLogoUrl": navbar.logo.asset->url
  }`;

const managedInterfaceQuery = `{
  "page": *[_type == "managedPage" && routePath == $routePath][0]${interfaceDocumentProjection},
  "legacy": *[_type == "managedInterface" && routePath == $routePath][0]${interfaceDocumentProjection},
  "header": *[_type == "siteHeader"][0]{
    isEnabled,
    backgroundColor,
    textColor,
    items[]{
      _key,
      isVisible,
      label,
      labelVi,
      labelEn,
      textColor,
      targetId,
      path
    }
  }
}`;

const hasSanityConfig = () => Boolean(SANITY_PROJECT_ID && SANITY_DATASET);

const resolveSanityImage = (image?: SanityImageSettings) => {
  if (!image?.url) return {url: undefined, position: undefined};
  const crop = image.crop;
  const width = image.dimensions?.width;
  const height = image.dimensions?.height;
  let url = image.url;

  if (crop && width && height) {
    const left = crop.left || 0;
    const right = crop.right || 0;
    const top = crop.top || 0;
    const bottom = crop.bottom || 0;
    const rectX = Math.round(left * width);
    const rectY = Math.round(top * height);
    const rectWidth = Math.max(1, Math.round((1 - left - right) * width));
    const rectHeight = Math.max(1, Math.round((1 - top - bottom) * height));
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}rect=${rectX},${rectY},${rectWidth},${rectHeight}&auto=format`;
  }

  const hotspot = image.hotspot;
  if (!hotspot) return {url, position: "center"};
  const usableWidth = 1 - (crop?.left || 0) - (crop?.right || 0);
  const usableHeight = 1 - (crop?.top || 0) - (crop?.bottom || 0);
  const x = usableWidth > 0 ? ((hotspot.x ?? 0.5) - (crop?.left || 0)) / usableWidth : 0.5;
  const y = usableHeight > 0 ? ((hotspot.y ?? 0.5) - (crop?.top || 0)) / usableHeight : 0.5;
  const clampPercent = (value: number) => `${Math.max(0, Math.min(100, value * 100))}%`;
  return {url, position: `${clampPercent(x)} ${clampPercent(y)}`};
};

const selectLocalizedValue = (item?: SanityInterfaceTextItem, language?: string) => {
  if (!item) return undefined;
  if (item.isVisible === false) return "";
  if (language?.startsWith("vi")) {
    const val = item.valueVi || item.value;
    return val && val.trim() !== "" ? val : undefined;
  }
  if (language?.startsWith("en")) {
    const val = item.valueEn;
    return val && val.trim() !== "" ? val : undefined;
  }
  const val = item.value ?? item.valueVi ?? item.valueEn;
  return val && val.trim() !== "" ? val : undefined;
};

const profileDefaultKeyMap: Record<string, string> = {
  editButton: "profile.edit",
  cancelButton: "profile.cancel",
  saveButton: "profile.save",
  lastNameLabel: "profile.last_name",
  firstNameLabel: "profile.first_name",
  phoneLabel: "profile.phone",
  dobLabel: "profile.dob",
  genderLabel: "profile.gender_label",
  emailLabel: "profile.email",
  selectPlaceholder: "profile.select",
  lastNamePlaceholder: "profile.lastNamePlaceholder",
  firstNamePlaceholder: "profile.firstNamePlaceholder",
  phonePlaceholder: "profile.phonePlaceholder",
  dobPlaceholder: "profile.dobPlaceholder",
  emailNotificationsTitle: "profile.emailNotifications",
  emailNotificationsDescription: "profile.emailNotificationsDescription",
  cvTitle: "profile.cv_title",
  uploadNewCvButton: "profile.uploadNewCv",
  dragDropCvText: "profile.drag_drop_cv",
  cvColumnName: "profile.cvColumnName",
  cvDefaultColumn: "profile.cvDefault",
  setDefaultCvLabel: "profile.setDefaultCv",
  deleteCvLabel: "profile.deleteCv",
  companyProfileTitle: "profile.companyProfileTitle",
  companyProfileEmpty: "profile.companyProfileEmpty",
  companyTaxCodeLabel: "profile.companyTaxCode",
  companyPhoneLabel: "profile.companyPhone",
  companyAddressLabel: "profile.companyAddress",
  changePasswordTitle: "profile.change_password",
  currentPasswordPlaceholder: "profile.current_password",
  newPasswordPlaceholder: "profile.new_password",
  confirmPasswordPlaceholder: "profile.confirm_password",
};

const selectLocalizedField = (
  source: Record<string, unknown>,
  field: string,
  language?: string,
) => {
  if (language?.startsWith("en")) {
    const val = source[`${field}En`];
    return typeof val === "string" && val.trim() !== "" ? val : undefined;
  }
  if (language?.startsWith("vi")) {
    const val = source[`${field}Vi`] || source[field];
    return typeof val === "string" && val.trim() !== "" ? val : undefined;
  }
  const val = source[field] ?? source[`${field}Vi`] ?? source[`${field}En`];
  return typeof val === "string" && val.trim() !== "" ? val : undefined;
};

const homeContentKeyMap: Record<string, string> = {
  aboutTitle: "home.aboutTitle",
  aboutLead: "home.aboutLead",
  aboutIntro: "home.aboutIntro",
  aboutIntroLong: "home.aboutIntroLong",
  projectCardTitle: "home.aboutCardProjectTitle",
  projectCardBody: "home.aboutCardProjectBody",
  missionCardTitle: "home.aboutMissionTitle",
  missionCardBody: "home.aboutMission",
  valuesCardTitle: "home.aboutValuesTitle",
  valuesCardBody: "home.aboutValues",
  featuredJobsTitle: "home.featuredJobsTitle",
  viewAllLabel: "home.viewAll",
  featuredJobsEmpty: "home.featuredJobsEmpty",
  partnersTitle: "home.partnersTitle",
  partnersSubtitle: "home.partnersSubtitle",
  partnersEmpty: "home.partnersEmpty",
  recruiterCtaTitle: "home.recruiterCtaTitle",
  recruiterCtaButton: "home.recruiterCtaButton",
  footerText: "home.footer",
};

const fixedPageContentKeyMaps: Record<string, Record<string, string>> = {
  "/jobs": {
    title: "jobs.page.title", description: "jobs.page.description", resultsTitle: "jobs.page.resultsTitle",
    emptyTitle: "jobs.page.emptyTitle", emptyDescription: "jobs.page.emptyDescription",
    filterTitle: "jobs.filters.title", keywordLabel: "jobs.filters.keyword",
    keywordPlaceholder: "jobs.filters.keywordPlaceholder", companyLabel: "jobs.filters.company",
    companyPlaceholder: "jobs.filters.companyPlaceholder", workModeLabel: "jobs.filters.workMode",
    jobTypeLabel: "jobs.filters.jobType", advancedLabel: "jobs.filters.advanced", cityLabel: "jobs.filters.city",
    wardLabel: "jobs.filters.ward", currencyLabel: "jobs.filters.currency", salaryLabel: "jobs.filters.salary",
    experienceLabel: "jobs.filters.experience", allLabel: "jobs.filters.all", resetLabel: "jobs.filters.reset",
    applicationDeadlineLabel: "jobs.page.applicationDeadline", applyButtonLabel: "jobs.apply.button",
  },
  "/applications": {
    heroBadge: "applications.hero.badge", heroTitle: "applications.hero.title",
    heroDescription: "applications.hero.description", submittedLabel: "applications.tabs.submitted",
    acceptedLabel: "applications.tabs.accepted", rejectedLabel: "applications.tabs.rejected",
    favoritesLabel: "applications.tabs.favorites", emptySubmittedTitle: "applications.empty.submittedTitle",
    findJobsButton: "applications.empty.findJobsButton",
  },
  "/recruiter-verification": {
    title: "recruiterVerification.title", description: "recruiterVerification.description",
    updateTitle: "recruiterVerification.updateTitle", updateDescription: "recruiterVerification.updateDescription",
    brandingTitle: "recruiterVerification.sections.branding", legalTitle: "recruiterVerification.sections.legal",
    addressesTitle: "recruiterVerification.sections.addresses", galleryTitle: "recruiterVerification.sections.gallery",
  },
  "/admin": {
    roleLabel: "role.ADMIN", title: "admin.title", description: "admin.description",
    usersTitle: "admin.stats.usersTitle", usersDescription: "admin.stats.usersDescription",
    jobsTitle: "admin.stats.jobsTitle", categoriesTitle: "admin.stats.categoriesTitle",
    categoriesDescription: "admin.stats.categoriesDescription", auditLogsTitle: "admin.stats.auditLogsTitle",
    auditLogsDescription: "admin.stats.auditLogsDescription", emailFormatTitle: "admin.stats.emailFormatTitle",
    emailFormatDescription: "admin.stats.emailFormatDescription", loginBrandingTitle: "admin.stats.loginBrandingTitle",
    loginBrandingDescription: "admin.stats.loginBrandingDescription", usersPanelTitle: "admin.users.title",
    jobsPanelTitle: "admin.jobs.title", emailPanelTitle: "admin.emailFormat.title", auditPanelTitle: "admin.auditLogs.title",
  },
  "/recruiter": {
    title: "recruiter.title", jobStatsTitle: "recruiter.stats.jobStatsTitle", totalJobs: "recruiter.stats.total",
    visibleJobs: "recruiter.stats.visible", hiddenJobs: "recruiter.stats.hidden",
    applicantStatsTitle: "recruiter.stats.applicantStatsTitle", totalApplicants: "recruiter.stats.totalApplicants",
    acceptedApplicants: "recruiter.stats.acceptedApplicants", rejectedApplicants: "recruiter.stats.rejectedApplicants",
  },
  "/moderator": {
    title: "moderator.title", description: "moderator.description", jobStatsTitle: "moderator.stats.jobsTitle",
    companyStatsTitle: "moderator.stats.companiesTitle",
  },
};

const getFixedPageContent = (source: SanityInterfaceDocument | null | undefined, routePath: string) => {
  if (!source) return undefined;
  if (routePath === "/jobs") return source.jobsContent;
  if (routePath === "/applications") return source.applicationsContent;
  if (routePath === "/recruiter-verification") return source.verificationContent;
  if (routePath === "/admin") return source.adminContent;
  if (routePath === "/recruiter") return source.recruiterContent;
  if (routePath === "/moderator") return source.moderatorContent;
  return undefined;
};

const mapFixedPageContentToTextItems = (content: SanityHomeContentConfig | undefined, routePath: string) => {
  if (!content) return {};
  const keyMap = fixedPageContentKeyMaps[routePath] || {};
  return Object.entries(keyMap).reduce<Record<string, SanityInterfaceTextItem>>((result, [fieldName, key]) => {
    const value = content[fieldName];
    const valueVi = content[`${fieldName}Vi`];
    const valueEn = content[`${fieldName}En`];
    if (typeof value === "string" || typeof valueVi === "string" || typeof valueEn === "string") {
      result[key] = {
        key,
        value: typeof value === "string" ? value : undefined,
        valueVi: typeof valueVi === "string" ? valueVi : undefined,
        valueEn: typeof valueEn === "string" ? valueEn : undefined,
        isVisible: true,
      };
    }
    return result;
  }, {});
};

const mapHomeContentToTextItems = (homeContent?: SanityHomeContentConfig) => {
  if (!homeContent) return {};

  return Object.entries(homeContentKeyMap).reduce<Record<string, SanityInterfaceTextItem>>((result, [fieldName, key]) => {
    const rawValue = homeContent[fieldName];
    const rawValueVi = homeContent[`${fieldName}Vi`];
    const rawValueEn = homeContent[`${fieldName}En`];
    const value = typeof rawValue === "string" ? rawValue : undefined;
    const valueVi = typeof rawValueVi === "string" ? rawValueVi : undefined;
    const valueEn = typeof rawValueEn === "string" ? rawValueEn : undefined;
    if (value || valueVi || valueEn) result[key] = { key, value, valueVi, valueEn, isVisible: true };
    return result;
  }, {});
};

const mapProfileDefaultsToTextItems = (profileDefaults?: SanityProfileDefaultsConfig) => {
  if (!profileDefaults) return {};
  if (profileDefaults.isVisible === false) return {};

  return Object.entries(profileDefaultKeyMap).reduce<Record<string, SanityInterfaceTextItem>>((result, [fieldName, key]) => {
    const value = profileDefaults[fieldName];
    if (typeof value === "string" && value) result[key] = { key, value, isVisible: true };
    return result;
  }, {});
};

const mergeProfileDefaultTextItems = (
  textItems: Record<string, SanityInterfaceTextItem>,
  profileDefaultTextItems: Record<string, SanityInterfaceTextItem>,
) =>
  Object.entries(profileDefaultTextItems).reduce<Record<string, SanityInterfaceTextItem>>(
    (result, [key, profileDefaultItem]) => {
      const currentItem = result[key];
      if (currentItem?.isVisible === false) return result;

      result[key] = {
        ...currentItem,
        ...profileDefaultItem,
        valueVi: profileDefaultItem.value,
        valueEn: profileDefaultItem.value,
        textColor: currentItem?.textColor,
        backgroundColor: currentItem?.backgroundColor,
        borderColor: currentItem?.borderColor,
      };
      return result;
    },
    { ...textItems },
  );

const normalizeRoutePath = (pathname: string): string => {
  if (pathname === "/" || pathname === "") return "/";
  if (pathname.startsWith("/jobs/")) return "/jobs/:jobId";
  if (pathname.startsWith("/companies/")) return "/companies/:companyId";
  if (pathname.startsWith("/admin/users/")) return "/admin/users/:userId";
  if (pathname.startsWith("/admin/company-reviews/")) return "/admin/company-reviews/:applicationId";
  return pathname;
};

const fetchSanityManagedInterface = async (routePath: string): Promise<SanityManagedInterface> => {
  if (!hasSanityConfig()) return { texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} };

  const normalizedPath = normalizeRoutePath(routePath);
  const url = new URL(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`,
  );
  url.searchParams.set("query", managedInterfaceQuery);
  url.searchParams.set("$routePath", JSON.stringify(normalizedPath));

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return { texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} };

    const data = (await response.json()) as SanityInterfaceResponse;
    const page = data.result?.page;
    const legacy = data.result?.legacy;
    const source = page || legacy;
    const header = data.result?.header;
    const resolvedHeaderImage = resolveSanityImage(source?.headerImage);
    const fixedPageTextItems = mapFixedPageContentToTextItems(getFixedPageContent(source, routePath), routePath);
    const homeContent: SanityHomeContentConfig = { ...(source?.homeContent || {}) };
    if (source?.homeAboutVisible === false) homeContent.aboutVisible = false;
    const texts = source?.texts;
    if (!Array.isArray(texts)) {
      const profileDefaultTextItems = mapProfileDefaultsToTextItems(source?.profileDefaults);
      const homeContentTextItems = mapHomeContentToTextItems(source?.homeContent);

      return {
        texts: {},
        textItems: {...profileDefaultTextItems, ...homeContentTextItems, ...fixedPageTextItems},
        theme: {
          ...(source?.theme || {}),
          headerImageUrl: resolvedHeaderImage.url || source?.headerImageUrl,
          headerImagePosition: resolvedHeaderImage.position,
        },
        navbar: {
          ...(header || source?.navbar || {}),
          logoUrl: header ? undefined : source?.navbarLogoUrl,
        },
        homeHero: source?.homeHero || {},
        homeContent,
        profileDefaults: source?.profileDefaults || {},
        pageContent: getFixedPageContent(source, routePath),
      };
    }

	    const textItems = texts.reduce<Record<string, SanityInterfaceTextItem>>((result, item) => {
	      if (item.key) result[item.key] = item;
	      return result;
	    }, {});
    const profileDefaultTextItems = mapProfileDefaultsToTextItems(source?.profileDefaults);
    const homeContentTextItems = mapHomeContentToTextItems(source?.homeContent);

	    return {
      texts: texts.reduce<Record<string, string>>((result, item) => {
        if (item.key && item.isVisible === false) result[item.key] = "";
        else if (item.key && item.value !== undefined) result[item.key] = item.value;
        return result;
      }, {}),
      textItems: {
        ...mergeProfileDefaultTextItems(textItems, profileDefaultTextItems),
        ...homeContentTextItems,
        ...fixedPageTextItems,
      },
      theme: {
        ...(source?.theme || {}),
        headerImageUrl: resolvedHeaderImage.url || source?.headerImageUrl,
        headerImagePosition: resolvedHeaderImage.position,
      },
      navbar: {
        ...(header || source?.navbar || {}),
        logoUrl: header ? undefined : source?.navbarLogoUrl,
      },
      homeHero: source?.homeHero || {},
      homeContent,
      profileDefaults: source?.profileDefaults || {},
      pageContent: getFixedPageContent(source, routePath),
    };
  } catch {
    return { texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} };
  }
};

const managedInterfaceCache = new Map<string, SanityManagedInterface>();
const managedInterfaceRequests = new Map<string, Promise<SanityManagedInterface>>();

export const loadSanityManagedInterface = (routePath: string): Promise<SanityManagedInterface> => {
  const cached = managedInterfaceCache.get(routePath);
  if (cached) return Promise.resolve(cached);

  const pending = managedInterfaceRequests.get(routePath);
  if (pending) return pending;

  const request = fetchSanityManagedInterface(routePath)
    .then((result) => {
      managedInterfaceCache.set(routePath, result);
      return result;
    })
    .finally(() => managedInterfaceRequests.delete(routePath));
  managedInterfaceRequests.set(routePath, request);
  return request;
};

export const loadSanityInterfaceText = async (routePath: string): Promise<Record<string, string>> =>
  (await loadSanityManagedInterface(routePath)).texts;

export const useSanityInterfaceText = (routePath: string) => {
  const [managedInterface, setManagedInterface] = useState<SanityManagedInterface>(() => managedInterfaceCache.get(routePath) || { texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} });
  const [isLoading, setIsLoading] = useState(() => !managedInterfaceCache.has(routePath));
  const { i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;
    const cached = managedInterfaceCache.get(routePath);
    if (cached) {
      setManagedInterface(cached);
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }
    setIsLoading(true);

    loadSanityManagedInterface(routePath).then((nextInterface) => {
      if (mounted) {
        setManagedInterface(nextInterface);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [routePath]);

  return useCallback(
    (key: string, fallback: string) => {
      if (isLoading) return "";
      const item = managedInterface.textItems[key];
      const value = item ? selectLocalizedValue(item, i18n.language) : managedInterface.texts[key];
      return value === undefined ? fallback : value;
    },
    [i18n.language, isLoading, managedInterface.textItems, managedInterface.texts],
  );
};

export const useSanityManagedInterface = (routePath: string) => {
  const [managedInterface, setManagedInterface] = useState<SanityManagedInterface>(() => managedInterfaceCache.get(routePath) || { texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} });
  const [isLoading, setIsLoading] = useState(() => !managedInterfaceCache.has(routePath));
  const { i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;
    const cached = managedInterfaceCache.get(routePath);
    if (cached) {
      setManagedInterface(cached);
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }
    setIsLoading(true);

    loadSanityManagedInterface(routePath).then((nextInterface) => {
      if (mounted) {
        setManagedInterface(nextInterface);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [routePath]);

  const text = useCallback(
    (key: string, fallback: string) => {
      if (isLoading) return "";
      const item = managedInterface.textItems[key];
      const value = item ? selectLocalizedValue(item, i18n.language) : managedInterface.texts[key];
      return value === undefined ? fallback : value;
    },
    [i18n.language, isLoading, managedInterface.textItems, managedInterface.texts],
  );

  const textColor = useCallback(
    (key: string) => managedInterface.textItems[key]?.textColor,
    [managedInterface.textItems],
  );

  const textImage = useCallback(
    (key: string) => managedInterface.textItems[key]?.imageUrl,
    [managedInterface.textItems],
  );

  const textStyle = useCallback(
    (key: string) => {
      const color = managedInterface.textItems[key]?.textColor;
      return color ? { color } : undefined;
    },
    [managedInterface.textItems],
  );

  const textBoxStyle = useCallback(
    (key: string) => {
      const item = managedInterface.textItems[key];
      return {
        ...(item?.backgroundColor ? { backgroundColor: item.backgroundColor } : {}),
        ...(item?.borderColor ? { borderColor: item.borderColor } : {}),
        ...(item?.textColor ? { color: item.textColor } : {}),
      };
    },
    [managedInterface.textItems],
  );

  return {
    text,
    textColor,
    textImage,
    textStyle,
    textBoxStyle,
    theme: managedInterface.theme,
    navbar: managedInterface.navbar,
    homeHero: {
      ...managedInterface.homeHero,
      title: selectLocalizedField(managedInterface.homeHero as Record<string, unknown>, "title", i18n.language),
      subtitle: selectLocalizedField(managedInterface.homeHero as Record<string, unknown>, "subtitle", i18n.language),
      description: selectLocalizedField(managedInterface.homeHero as Record<string, unknown>, "description", i18n.language),
    },
    homeContent: managedInterface.homeContent || {},
    profileDefaults: managedInterface.profileDefaults,
    pageContent: managedInterface.pageContent || {},
    isLoading,
  };
};
