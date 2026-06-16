import type { LoginHeroConfig, RegisterHeroConfig } from "@/lib/siteConfig";

type SanityLoginHeroResponse = {
  result?: Partial<LoginHeroConfig> | null;
};

type SanityRegisterHeroResponse = {
  result?: Partial<RegisterHeroConfig> | null;
};

const SANITY_PROJECT_ID = import.meta.env.VITE_SANITY_PROJECT_ID;
const SANITY_DATASET = import.meta.env.VITE_SANITY_DATASET || "production";
const SANITY_API_VERSION = import.meta.env.VITE_SANITY_API_VERSION || "2025-01-01";

const loginHeroQuery = `*[_type == "loginHero"][0]{
  title,
  description,
  securityText,
  backgroundColor,
  textColor,
  formTitle,
  formDescription,
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
  title,
  description,
  noteTitle,
  noteText,
  backgroundColor,
  textColor,
  formTitle,
  formDescription,
  lastNameLabel,
  lastNamePlaceholder,
  firstNameLabel,
  firstNamePlaceholder,
  emailLabel,
  emailPlaceholder,
  phoneLabel,
  phonePlaceholder,
  passwordLabel,
  passwordPlaceholder,
  "imageUrl": image.asset->url
}`;

const hasSanityConfig = () => Boolean(SANITY_PROJECT_ID && SANITY_DATASET);

export const loadSanityLoginHero = async (fallback: LoginHeroConfig): Promise<LoginHeroConfig | null> => {
  if (!hasSanityConfig()) return null;

  const url = new URL(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`,
  );
  url.searchParams.set("query", loginHeroQuery);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = (await response.json()) as SanityLoginHeroResponse;
    if (!data.result) return null;

    return {
      ...fallback,
      ...data.result,
      imageUrl: data.result.imageUrl || "",
    };
  } catch {
    return null;
  }
};

export const loadSanityRegisterHero = async (fallback: RegisterHeroConfig): Promise<RegisterHeroConfig | null> => {
  if (!hasSanityConfig()) return null;

  const url = new URL(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`,
  );
  url.searchParams.set("query", registerHeroQuery);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = (await response.json()) as SanityRegisterHeroResponse;
    if (!data.result) return null;

    return {
      ...fallback,
      ...data.result,
      imageUrl: data.result.imageUrl || "",
    };
  } catch {
    return null;
  }
};
