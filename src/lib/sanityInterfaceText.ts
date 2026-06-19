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

type SanityProfileDefaultsConfig = Record<string, string | boolean | undefined> & {
  isVisible?: boolean;
};

export type SanityManagedInterface = {
  texts: Record<string, string>;
  textItems: Record<string, SanityInterfaceTextItem>;
  theme: SanityInterfaceTheme;
  navbar: SanityNavbarConfig;
  homeHero: SanityHomeHeroConfig;
  profileDefaults: SanityProfileDefaultsConfig;
};

type SanityInterfaceResponse = {
  result?: {
    page?: SanityInterfaceDocument | null;
    legacy?: SanityInterfaceDocument | null;
  } | null;
};

type SanityInterfaceDocument = {
  texts?: SanityInterfaceTextItem[];
  theme?: Omit<SanityInterfaceTheme, "headerImageUrl">;
  headerImageUrl?: string;
  navbar?: Omit<SanityNavbarConfig, "logoUrl">;
  navbarLogoUrl?: string;
  homeHero?: SanityHomeHeroConfig;
  profileDefaults?: SanityProfileDefaultsConfig;
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
	    homeHero{
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
	    profileDefaults,
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
  "legacy": *[_type == "managedInterface" && routePath == $routePath][0]${interfaceDocumentProjection}
}`;

const hasSanityConfig = () => Boolean(SANITY_PROJECT_ID && SANITY_DATASET);

const selectLocalizedValue = (item?: SanityInterfaceTextItem, language?: string) => {
  if (!item) return undefined;
  if (item.isVisible === false) return "";
  if (language?.startsWith("vi")) return item.valueVi || item.value || "";
  if (language?.startsWith("en")) return item.valueEn || item.value || "";
  return item.value ?? item.valueVi ?? item.valueEn ?? "";
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

export const loadSanityManagedInterface = async (routePath: string): Promise<SanityManagedInterface> => {
  if (!hasSanityConfig()) return { texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} };

  const url = new URL(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`,
  );
  url.searchParams.set("query", managedInterfaceQuery);
  url.searchParams.set("$routePath", JSON.stringify(routePath));

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return { texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} };

    const data = (await response.json()) as SanityInterfaceResponse;
    const page = data.result?.page;
    const legacy = data.result?.legacy;
    const source = page || legacy;
    const texts = source?.texts;
    if (!Array.isArray(texts)) {
      const profileDefaultTextItems = mapProfileDefaultsToTextItems(source?.profileDefaults);

      return {
        texts: {},
        textItems: profileDefaultTextItems,
        theme: {
          ...(source?.theme || {}),
          headerImageUrl: source?.headerImageUrl,
        },
        navbar: {
          ...(source?.navbar || {}),
          logoUrl: source?.navbarLogoUrl,
        },
        homeHero: source?.homeHero || {},
        profileDefaults: source?.profileDefaults || {},
      };
    }

	    const textItems = texts.reduce<Record<string, SanityInterfaceTextItem>>((result, item) => {
	      if (item.key) result[item.key] = item;
	      return result;
	    }, {});
    const profileDefaultTextItems = mapProfileDefaultsToTextItems(source?.profileDefaults);

	    return {
      texts: texts.reduce<Record<string, string>>((result, item) => {
        if (item.key && item.isVisible === false) result[item.key] = "";
        else if (item.key && item.value !== undefined) result[item.key] = item.value;
        return result;
      }, {}),
      textItems: mergeProfileDefaultTextItems(textItems, profileDefaultTextItems),
      theme: {
        ...(source?.theme || {}),
        headerImageUrl: source?.headerImageUrl,
      },
      navbar: {
        ...(source?.navbar || {}),
        logoUrl: source?.navbarLogoUrl,
      },
      homeHero: source?.homeHero || {},
      profileDefaults: source?.profileDefaults || {},
    };
  } catch {
    return { texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} };
  }
};

export const loadSanityInterfaceText = async (routePath: string): Promise<Record<string, string>> =>
  (await loadSanityManagedInterface(routePath)).texts;

export const useSanityInterfaceText = (routePath: string) => {
  const [managedInterface, setManagedInterface] = useState<SanityManagedInterface>({ texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} });
  const [isLoading, setIsLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;
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
  const [managedInterface, setManagedInterface] = useState<SanityManagedInterface>({ texts: {}, textItems: {}, theme: {}, navbar: {}, homeHero: {}, profileDefaults: {} });
  const [isLoading, setIsLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;
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
    homeHero: managedInterface.homeHero,
    profileDefaults: managedInterface.profileDefaults,
    isLoading,
  };
};
