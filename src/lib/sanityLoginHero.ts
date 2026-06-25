import type { LoginHeroConfig, RegisterHeroConfig } from "@/lib/siteConfig";

type SanityLoginHeroResponse = {
  result?: Record<string, any> | null;
};

type SanityRegisterHeroResponse = {
  result?: Record<string, any> | null;
};

const SANITY_PROJECT_ID = import.meta.env.VITE_SANITY_PROJECT_ID;
const SANITY_DATASET = import.meta.env.VITE_SANITY_DATASET || "production";
const SANITY_API_VERSION = import.meta.env.VITE_SANITY_API_VERSION || "2025-01-01";

const loginHeroQuery = `*[_type == "loginHero"][0]{
  title,
  titleVi,
  titleEn,
  description,
  descriptionVi,
  descriptionEn,
  securityText,
  securityTextVi,
  securityTextEn,
  backgroundColor,
  textColor,
  formTitle,
  formTitleVi,
  formTitleEn,
  formDescription,
  formDescriptionVi,
  formDescriptionEn,
  formTitleTextColor,
  formDescriptionTextColor,
  footerTextColor,
  linkTextColor,
  pageBackgroundColor,
  formBackgroundColor,
  inputBackgroundColor,
  inputTextColor,
  inputBorderColor,
  labelTextColor,
  "imageUrl": image.asset->url
}`;

const registerHeroQuery = `*[_type == "registerHero"][0]{
  badge,
  badgeVi,
  badgeEn,
  title,
  titleVi,
  titleEn,
  description,
  descriptionVi,
  descriptionEn,
  noteTitle,
  noteTitleVi,
  noteTitleEn,
  noteText,
  noteTextVi,
  noteTextEn,
  backgroundColor,
  textColor,
  formTitle,
  formTitleVi,
  formTitleEn,
  formDescription,
  formDescriptionVi,
  formDescriptionEn,
  lastNameLabel,
  lastNameLabelVi,
  lastNameLabelEn,
  lastNamePlaceholder,
  lastNamePlaceholderVi,
  lastNamePlaceholderEn,
  firstNameLabel,
  firstNameLabelVi,
  firstNameLabelEn,
  firstNamePlaceholder,
  firstNamePlaceholderVi,
  firstNamePlaceholderEn,
  emailLabel,
  emailLabelVi,
  emailLabelEn,
  emailPlaceholder,
  emailPlaceholderVi,
  emailPlaceholderEn,
  phoneLabel,
  phoneLabelVi,
  phoneLabelEn,
  phonePlaceholder,
  phonePlaceholderVi,
  phonePlaceholderEn,
  passwordLabel,
  passwordLabelVi,
  passwordLabelEn,
  passwordPlaceholder,
  passwordPlaceholderVi,
  passwordPlaceholderEn,
  "imageUrl": image.asset->url
}`;

const hasSanityConfig = () => Boolean(SANITY_PROJECT_ID && SANITY_DATASET);

const selectLocalizedField = (
  source: Record<string, any>,
  field: string,
  language?: string,
) => {
  const fallback = source[field];
  const vietnamese = source[`${field}Vi`];
  const english = source[`${field}En`];

  if (language?.startsWith("en")) {
    return typeof english === "string" && english.trim() !== "" ? english : undefined;
  }
  if (language?.startsWith("vi")) {
    const val = vietnamese || fallback;
    return typeof val === "string" && val.trim() !== "" ? val : undefined;
  }
  const val = fallback ?? vietnamese ?? english;
  return typeof val === "string" && val.trim() !== "" ? val : undefined;
};

export const loadSanityLoginHero = async (
  fallback: LoginHeroConfig,
  language?: string,
): Promise<LoginHeroConfig | null> => {
  if (!hasSanityConfig()) return null;

  const url = new URL(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`,
  );
  url.searchParams.set("query", loginHeroQuery);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = (await response.json()) as SanityLoginHeroResponse;
    const result = data.result;
    if (!result) return null;

    const select = (field: string) => selectLocalizedField(result, field, language);

    return {
      ...fallback,
      ...result,
      title: select("title") ?? fallback.title,
      description: select("description") ?? fallback.description,
      securityText: select("securityText") ?? fallback.securityText,
      formTitle: select("formTitle") ?? fallback.formTitle,
      formDescription: select("formDescription") ?? fallback.formDescription,
      imageUrl: result.imageUrl || "",
    } as LoginHeroConfig;
  } catch {
    return null;
  }
};

export const loadSanityRegisterHero = async (
  fallback: RegisterHeroConfig,
  language?: string,
): Promise<RegisterHeroConfig | null> => {
  if (!hasSanityConfig()) return null;

  const url = new URL(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`,
  );
  url.searchParams.set("query", registerHeroQuery);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = (await response.json()) as SanityRegisterHeroResponse;
    const result = data.result;
    if (!result) return null;

    const select = (field: string) => selectLocalizedField(result, field, language);

    return {
      ...fallback,
      ...result,
      badge: select("badge") ?? fallback.badge,
      title: select("title") ?? fallback.title,
      description: select("description") ?? fallback.description,
      noteTitle: select("noteTitle") ?? fallback.noteTitle,
      noteText: select("noteText") ?? fallback.noteText,
      formTitle: select("formTitle") ?? fallback.formTitle,
      formDescription: select("formDescription") ?? fallback.formDescription,
      lastNameLabel: select("lastNameLabel") ?? fallback.lastNameLabel,
      lastNamePlaceholder: select("lastNamePlaceholder") ?? fallback.lastNamePlaceholder,
      firstNameLabel: select("firstNameLabel") ?? fallback.firstNameLabel,
      firstNamePlaceholder: select("firstNamePlaceholder") ?? fallback.firstNamePlaceholder,
      emailLabel: select("emailLabel") ?? fallback.emailLabel,
      emailPlaceholder: select("emailPlaceholder") ?? fallback.emailPlaceholder,
      phoneLabel: select("phoneLabel") ?? fallback.phoneLabel,
      phonePlaceholder: select("phonePlaceholder") ?? fallback.phonePlaceholder,
      passwordLabel: select("passwordLabel") ?? fallback.passwordLabel,
      passwordPlaceholder: select("passwordPlaceholder") ?? fallback.passwordPlaceholder,
      imageUrl: result.imageUrl || "",
    } as RegisterHeroConfig;
  } catch {
    return null;
  }
};
