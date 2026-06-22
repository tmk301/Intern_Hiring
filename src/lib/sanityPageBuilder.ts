export type SanityPagePlacement = "top" | "afterHero" | "bottom" | "custom";

type SanityDescriptionStyle = {
  descriptionFontSize?: number;
  descriptionTextColor?: string;
  descriptionFontWeight?: string;
};

export type SanityPageButton = {
  label?: string;
  labelVi?: string;
  labelEn?: string;
  href?: string;
  style?: "primary" | "secondary" | "outline";
};

export type SanityPageCard = SanityDescriptionStyle & {
  _key?: string;
  isVisible?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  titleTextColor?: string;
  title?: string;
  titleVi?: string;
  titleEn?: string;
  description?: string;
  descriptionVi?: string;
  descriptionEn?: string;
  imageUrl?: string;
  imageFit?: "contain" | "cover";
  imageHref?: string;
  linkLabel?: string;
  linkLabelVi?: string;
  linkLabelEn?: string;
  linkHref?: string;
  cardHref?: string;
};

type SanityPageSectionBase = {
  _key?: string;
  _type: string;
  isVisible?: boolean;
  placement?: SanityPagePlacement;
  targetSelector?: string;
  insertPosition?: "before" | "after" | "insideStart" | "insideEnd";
  anchorId?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  titleTextColor?: string;
  bodyTextColor?: string;
  animation?: "none" | "fadeUp" | "fadeIn" | "zoomIn" | "slideLeft" | "slideRight";
  animationDelay?: number;
};

export type SanityHeroSection = SanityPageSectionBase & SanityDescriptionStyle & {
  _type: "pageHeroSection";
  eyebrow?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  buttons?: SanityPageButton[];
  eyebrowVi?: string;
  eyebrowEn?: string;
  titleVi?: string;
  titleEn?: string;
  descriptionVi?: string;
  descriptionEn?: string;
};

export type SanityTextSection = SanityPageSectionBase & {
  _type: "pageTextSection";
  title?: string;
  titleVi?: string;
  titleEn?: string;
  body?: string;
  bodyVi?: string;
  bodyEn?: string;
  align?: "left" | "center";
};

export type SanityCardGridSection = SanityPageSectionBase & SanityDescriptionStyle & {
  _type: "pageCardGridSection";
  title?: string;
  titleVi?: string;
  titleEn?: string;
  description?: string;
  descriptionVi?: string;
  descriptionEn?: string;
  cards?: SanityPageCard[];
};

export type SanityImageTextSection = SanityPageSectionBase & {
  _type: "pageImageTextSection";
  title?: string;
  titleVi?: string;
  titleEn?: string;
  body?: string;
  bodyVi?: string;
  bodyEn?: string;
  imageUrl?: string;
  imageFit?: "contain" | "cover";
  imageHref?: string;
  imagePosition?: "left" | "right";
  button?: SanityPageButton;
};

export type SanityCtaSection = SanityPageSectionBase & SanityDescriptionStyle & {
  _type: "pageCtaSection";
  title?: string;
  titleVi?: string;
  titleEn?: string;
  description?: string;
  descriptionVi?: string;
  descriptionEn?: string;
  button?: SanityPageButton;
};

export type SanityImageGallerySection = SanityPageSectionBase & {
  _type: "pageImageGallerySection";
  title?: string;
  titleVi?: string;
  titleEn?: string;
  description?: string;
  descriptionVi?: string;
  descriptionEn?: string;
  images?: {
    _key?: string;
    imageUrl?: string;
    alt?: string;
    href?: string;
  }[];
};

export type SanitySpacerSection = SanityPageSectionBase & {
  _type: "pageSpacerSection";
  height?: number;
};

type SanityFlexibleItemBase = {
  _key?: string;
  _type: string;
  isVisible?: boolean;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  rounded?: boolean;
  padding?: number;
};

export type SanityFlexibleTextItem = SanityFlexibleItemBase & {
  _type: "pageFlexibleTextItem";
  content?: string;
  contentVi?: string;
  contentEn?: string;
  textStyle?: "eyebrow" | "heading" | "body";
  align?: "left" | "center" | "right";
};

export type SanityFlexibleImageItem = SanityFlexibleItemBase & {
  _type: "pageFlexibleImageItem";
  imageUrl?: string;
  imageFit?: "contain" | "cover";
  alt?: string;
  altVi?: string;
  altEn?: string;
  href?: string;
  rounded?: boolean;
};

export type SanityFlexibleButtonItem = SanityFlexibleItemBase & {
  _type: "pageFlexibleButtonItem";
  label?: string;
  labelVi?: string;
  labelEn?: string;
  href?: string;
  style?: "primary" | "secondary" | "outline";
  align?: "left" | "center" | "right";
};

export type SanityFlexibleCardItem = SanityFlexibleItemBase & SanityDescriptionStyle & {
  _type: "pageFlexibleCardItem";
  title?: string;
  titleVi?: string;
  titleEn?: string;
  description?: string;
  descriptionVi?: string;
  descriptionEn?: string;
  imageUrl?: string;
  imageFit?: "contain" | "cover";
  href?: string;
  linkLabel?: string;
  linkLabelVi?: string;
  linkLabelEn?: string;
};

export type SanityFlexibleItem =
  | SanityFlexibleTextItem
  | SanityFlexibleImageItem
  | SanityFlexibleButtonItem
  | SanityFlexibleCardItem;

export type SanityFlexibleSection = SanityPageSectionBase & {
  _type: "pageFlexibleSection";
  layout?: "stack" | "grid";
  columns?: number;
  gap?: number;
  paddingY?: number;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  items?: SanityFlexibleItem[];
};

export type SanityPageSection =
  | SanityHeroSection
  | SanityTextSection
  | SanityCardGridSection
  | SanityImageTextSection
  | SanityCtaSection
  | SanityFlexibleSection
  | SanityImageGallerySection
  | SanitySpacerSection;

type SanityManagedPageResponse = {
  result?: {
    sections?: SanityPageSection[];
  } | null;
};

const SANITY_PROJECT_ID = import.meta.env.VITE_SANITY_PROJECT_ID;
const SANITY_DATASET = import.meta.env.VITE_SANITY_DATASET || "production";
const SANITY_API_VERSION = import.meta.env.VITE_SANITY_API_VERSION || "2025-01-01";

const managedPageQuery = `*[_type == "managedPage" && routePath == $routePath][0]{
  sections[]{
    _key,
    _type,
    isVisible,
    placement,
    targetSelector,
    insertPosition,
    "anchorId": anchorId.current,
    backgroundColor,
    textColor,
    borderColor,
    titleTextColor,
    bodyTextColor,
    animation,
    animationDelay,
    eyebrow,
    eyebrowVi,
    eyebrowEn,
    title,
    titleVi,
    titleEn,
    description,
    descriptionVi,
    descriptionEn,
    descriptionFontSize,
    descriptionTextColor,
    descriptionFontWeight,
    body,
    bodyVi,
    bodyEn,
    align,
    height,
    layout,
    columns,
    gap,
    paddingY,
    maxWidth,
    imagePosition,
    imageFit,
    imageHref,
    image,
    "imageUrl": image.asset->url,
    images[]{
      _key,
      "imageUrl": asset->url,
      alt,
      href
    },
    buttons[]{
      label,
      labelVi,
      labelEn,
      href,
      style
    },
    button{
      label,
      labelVi,
      labelEn,
      href,
      style
    },
    cards[]{
      _key,
      isVisible,
      backgroundColor,
      borderColor,
      textColor,
      titleTextColor,
      title,
      titleVi,
      titleEn,
      description,
      descriptionVi,
      descriptionEn,
      descriptionFontSize,
      descriptionTextColor,
      descriptionFontWeight,
      image,
      "imageUrl": image.asset->url,
      imageFit,
      imageHref,
      linkLabel,
      linkLabelVi,
      linkLabelEn,
      linkHref,
      cardHref
    },
    items[]{
      _key,
      _type,
      isVisible,
      backgroundColor,
      textColor,
      borderColor,
      rounded,
      padding,
      content,
      contentVi,
      contentEn,
      textStyle,
      align,
      label,
      labelVi,
      labelEn,
      title,
      titleVi,
      titleEn,
      description,
      descriptionVi,
      descriptionEn,
      descriptionFontSize,
      descriptionTextColor,
      descriptionFontWeight,
      alt,
      altVi,
      altEn,
      href,
      style,
      rounded,
      imageFit,
      linkLabel,
      linkLabelVi,
      linkLabelEn,
      image,
      "imageUrl": image.asset->url
    }
  }
}`;

const hasSanityConfig = () => Boolean(SANITY_PROJECT_ID && SANITY_DATASET);

const retiredSectionKeysByRoute: Record<string, string[]> = {
  "/": ["home-about"],
  "/profile": ["profile-top-note"],
  "/jobs": ["jobs-top-note", "jobs-bottom-cta"],
};

export const loadSanityPageSections = async (
  routePath: string,
  placement: SanityPagePlacement,
): Promise<SanityPageSection[]> => {
  if (!hasSanityConfig()) {
    console.warn("Sanity not configured");
    return [];
  }

  const url = new URL(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`,
  );
  url.searchParams.set("query", managedPageQuery);
  url.searchParams.set("$routePath", JSON.stringify(routePath));

  try {
    console.log("Fetching Sanity sections...", { routePath, placement });
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error("Sanity API error:", response.status, response.statusText);
      return [];
    }

    const data = (await response.json()) as SanityManagedPageResponse;
    const sections = data.result?.sections;
    if (!Array.isArray(sections)) {
      console.warn("No sections found in response");
      return [];
    }

    const retiredKeys = retiredSectionKeysByRoute[routePath] || [];
    const filtered = sections.filter(
      (section) =>
        section.isVisible !== false &&
        (section.placement || "bottom") === placement &&
        (!section._key || !retiredKeys.includes(section._key)),
    );
    console.log("Filtered sections:", { total: sections.length, filtered: filtered.length });
    return filtered;
  } catch (error) {
    console.error("Error loading Sanity sections:", error);
    return [];
  }
};
