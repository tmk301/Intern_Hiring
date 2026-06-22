import React, { CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  loadSanityPageSections,
  type SanityCardGridSection,
  type SanityCtaSection,
  type SanityFlexibleButtonItem,
  type SanityFlexibleCardItem,
  type SanityFlexibleImageItem,
  type SanityFlexibleItem,
  type SanityFlexibleSection,
  type SanityFlexibleTextItem,
  type SanityHeroSection,
  type SanityImageGallerySection,
  type SanityImageTextSection,
  type SanityPageButton,
  type SanityPagePlacement,
  type SanityPageSection,
  type SanitySpacerSection,
  type SanityTextSection,
} from "@/lib/sanityPageBuilder";

type SanityPageSectionsProps = {
  routePath: string;
  placement: SanityPagePlacement;
};

const sectionStyle = (section: SanityPageSection): CSSProperties => ({
  backgroundColor: section.backgroundColor || undefined,
  color: section.textColor || undefined,
  borderColor: section.borderColor || undefined,
  borderWidth: section.borderColor ? "1px" : undefined,
  borderStyle: section.borderColor ? "solid" : undefined,
});

const titleStyle = (source: { titleTextColor?: string }): CSSProperties => ({
  color: source.titleTextColor || undefined,
});

const bodyStyle = (source: { bodyTextColor?: string }): CSSProperties => ({
  color: source.bodyTextColor || undefined,
});

const descriptionStyle = (source: {
  descriptionFontSize?: number;
  descriptionTextColor?: string;
  descriptionFontWeight?: string;
}): CSSProperties => ({
  color: source.descriptionTextColor || undefined,
  fontSize: source.descriptionFontSize ? `${source.descriptionFontSize}px` : undefined,
  fontWeight: source.descriptionFontWeight || undefined,
});

const buttonVariant = (style?: SanityPageButton["style"]) => {
  if (style === "secondary") return "secondary";
  if (style === "outline") return "outline";
  return "cta";
};

const pickLocalizedText = (base?: string, vi?: string, en?: string, language?: string) => {
  if (language?.startsWith("vi")) return vi || base || "";
  if (language?.startsWith("en")) return en || base || "";
  return base || vi || en || "";
};

const SectionButton = ({ button, language }: { button?: SanityPageButton; language?: string }) => {
  const label = pickLocalizedText(button?.label, button?.labelVi, button?.labelEn, language);
  if (!label || !button?.href) return null;

  const isExternal = /^https?:\/\//i.test(button.href);

  return (
    <Button asChild variant={buttonVariant(button.style)} size="lg" className="w-auto">
      <a href={button.href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </a>
    </Button>
  );
};

const renderLines = (value?: string) =>
  value
    ?.split("\n")
    .filter(Boolean)
    .map((line, index) => (
      <React.Fragment key={`${line}-${index}`}>
        {index > 0 && <br />}
        {line}
      </React.Fragment>
    ));

const imageFitClassName = (fit?: "contain" | "cover") => (fit === "cover" ? "object-cover" : "object-contain");

const alignClassName = (align?: "left" | "center" | "right") => {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
};

const justifyClassName = (align?: "left" | "center" | "right") => {
  if (align === "center") return "justify-center";
  if (align === "right") return "justify-end";
  return "justify-start";
};

const blockAlignClassName = (align?: "left" | "center" | "right") => {
  if (align === "center") return "mx-auto";
  if (align === "right") return "ml-auto";
  return "mr-auto";
};

const maxWidthClassName = (maxWidth?: SanityFlexibleSection["maxWidth"]) => {
  if (maxWidth === "sm") return "max-w-3xl";
  if (maxWidth === "md") return "max-w-5xl";
  if (maxWidth === "lg") return "max-w-6xl";
  if (maxWidth === "full") return "max-w-none";
  return "max-w-7xl";
};

const gridColumnsClassName = (columns?: number) => {
  if (columns === 1) return "md:grid-cols-1";
  if (columns === 3) return "md:grid-cols-3";
  if (columns === 4) return "md:grid-cols-4";
  return "md:grid-cols-2";
};

const itemStyle = (item: SanityFlexibleItem): CSSProperties => ({
  backgroundColor: item.backgroundColor || undefined,
  color: item.textColor || undefined,
  borderColor: item.borderColor || undefined,
  borderWidth: item.borderColor ? "1px" : undefined,
  borderStyle: item.borderColor ? "solid" : undefined,
  padding: item.padding ? `${item.padding}px` : undefined,
});

const roundedBlockClassName = (rounded?: boolean) => (rounded === false ? "" : "rounded-lg overflow-hidden");

const animationClassName = (animation?: SanityPageSection["animation"]) => {
  if (animation === "fadeIn") return "sanity-animate-fade-in";
  if (animation === "zoomIn") return "sanity-animate-zoom-in";
  if (animation === "slideLeft") return "sanity-animate-slide-left";
  if (animation === "slideRight") return "sanity-animate-slide-right";
  return "sanity-animate-fade-up";
};

const AnimatedSectionFrame = ({ section, children }: { section: SanityPageSection; children: React.ReactNode }) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(section.animation === "none");

  useEffect(() => {
    if (section.animation === "none") {
      setIsVisible(true);
      return;
    }

    const element = frameRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [section.animation]);

  if (section.animation === "none") return <>{children}</>;

  return (
    <div
      ref={frameRef}
      className={cn("sanity-animate", animationClassName(section.animation), isVisible && "sanity-animate-visible")}
      style={{ transitionDelay: isVisible && section.animationDelay ? `${section.animationDelay}ms` : undefined }}
    >
      {children}
    </div>
  );
};

const imageLinkProps = (href?: string) => {
  if (!href) return {};
  const isExternal = /^https?:\/\//i.test(href);
  return {
    href,
    target: isExternal ? "_blank" : undefined,
    rel: isExternal ? "noreferrer" : undefined,
  };
};

const FlexibleTextItem = ({ item, language }: { item: SanityFlexibleTextItem; language?: string }) => {
  const content = pickLocalizedText(item.content, item.contentVi, item.contentEn, language);
  if (!content) return null;

  if (item.textStyle === "heading") {
    return (
      <h2
        className={cn("text-3xl font-bold leading-tight md:text-4xl", alignClassName(item.align), roundedBlockClassName(item.rounded))}
        style={itemStyle(item)}
      >
        {renderLines(content)}
      </h2>
    );
  }

  if (item.textStyle === "eyebrow") {
    return (
      <p
        className={cn("text-sm font-semibold uppercase tracking-wide text-primary", alignClassName(item.align), roundedBlockClassName(item.rounded))}
        style={itemStyle(item)}
      >
        {renderLines(content)}
      </p>
    );
  }

  return (
    <p className={cn("text-base leading-8 opacity-80", alignClassName(item.align), roundedBlockClassName(item.rounded))} style={itemStyle(item)}>
      {renderLines(content)}
    </p>
  );
};

const FlexibleImageItem = ({ item, language }: { item: SanityFlexibleImageItem; language?: string }) => {
  const imageUrl = item.imageUrl;
  if (!imageUrl) {
    console.warn("FlexibleImageItem missing imageUrl", { item });
    return null;
  }
  const alt = pickLocalizedText(item.alt, item.altVi, item.altEn, language);
  console.log("Rendering FlexibleImageItem with URL:", imageUrl);

  return (
    <a
      {...imageLinkProps(item.href || imageUrl)}
      className={cn("flex min-h-52 items-center justify-center bg-slate-50 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", roundedBlockClassName(item.rounded))}
      style={itemStyle(item)}
      aria-label={alt || "Open image"}
    >
      <img
        src={imageUrl}
        alt={alt || ""}
        className={cn("max-h-[520px] w-full", imageFitClassName(item.imageFit))}
        loading="lazy"
        onError={(e) => console.error("Failed to load image:", imageUrl, e)}
      />
    </a>
  );
};

const FlexibleButtonItem = ({ item, language }: { item: SanityFlexibleButtonItem; language?: string }) => {
  const label = pickLocalizedText(item.label, item.labelVi, item.labelEn, language);
  if (!label || !item.href) return null;

  return (
    <div className={cn("inline-flex w-fit", blockAlignClassName(item.align), roundedBlockClassName(item.rounded))} style={itemStyle(item)}>
      <SectionButton button={{ label, href: item.href, style: item.style }} />
    </div>
  );
};

const FlexibleCardItem = ({ item, language }: { item: SanityFlexibleCardItem; language?: string }) => {
  const title = pickLocalizedText(item.title, item.titleVi, item.titleEn, language);
  const description = pickLocalizedText(item.description, item.descriptionVi, item.descriptionEn, language);
  const linkLabel = pickLocalizedText(item.linkLabel, item.linkLabelVi, item.linkLabelEn, language);
  const imageUrl = item.imageUrl;

  const content = (
    <Card className={cn("h-full transition", roundedBlockClassName(item.rounded), item.href && "cursor-pointer hover:shadow-md")} style={itemStyle(item)}>
      {imageUrl && (
        <div className="flex h-48 w-full items-center justify-center bg-slate-50">
          <img
            src={imageUrl}
            alt={title || ""}
            className={cn("h-full w-full", imageFitClassName(item.imageFit))}
            loading="lazy"
            onError={(e) => console.error("Failed to load card image:", imageUrl, e)}
          />
        </div>
      )}
      <CardContent className="p-6">
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
        {description && (
          <p className={cn("mt-2 leading-6", !item.descriptionTextColor && "opacity-80")} style={descriptionStyle(item)}>
            {renderLines(description)}
          </p>
        )}
        {linkLabel && item.href && (
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            {linkLabel}
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (!item.href) return content;

  return (
    <a {...imageLinkProps(item.href)} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {content}
    </a>
  );
};

const renderFlexibleItem = (item: SanityFlexibleItem, language?: string) => {
  if (item.isVisible === false) return null;

  switch (item._type) {
    case "pageFlexibleTextItem":
      return <FlexibleTextItem item={item} language={language} />;
    case "pageFlexibleImageItem":
      return <FlexibleImageItem item={item} language={language} />;
    case "pageFlexibleButtonItem":
      return <FlexibleButtonItem item={item} language={language} />;
    case "pageFlexibleCardItem":
      return <FlexibleCardItem item={item} language={language} />;
    default:
      return null;
  }
};

const HeroSection = ({ section, language }: { section: SanityHeroSection; language?: string }) => {
  const eyebrow = pickLocalizedText(section.eyebrow, section.eyebrowVi, section.eyebrowEn, language);
  const title = pickLocalizedText(section.title, section.titleVi, section.titleEn, language);
  const description = pickLocalizedText(section.description, section.descriptionVi, section.descriptionEn, language);

  return (
    <section id={section.anchorId} className="relative overflow-hidden py-20" style={sectionStyle(section)}>
      {section.imageUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${section.imageUrl})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        </>
      )}
      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-3xl">
          {eyebrow && <Badge className="mb-4">{eyebrow}</Badge>}
          {title && <h2 className="text-4xl font-bold leading-tight md:text-6xl" style={titleStyle(section)}>{title}</h2>}
          {description && (
            <p className={cn("mt-5 leading-8", !section.descriptionTextColor && "text-lg opacity-90")} style={descriptionStyle(section)}>
              {renderLines(description)}
            </p>
          )}
          {section.buttons && section.buttons.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {section.buttons.map((button, index) => (
                <SectionButton key={`${button.href}-${index}`} button={button} language={language} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const TextSection = ({ section, language }: { section: SanityTextSection; language?: string }) => {
  const title = pickLocalizedText(section.title, section.titleVi, section.titleEn, language);
  const body = pickLocalizedText(section.body, section.bodyVi, section.bodyEn, language);

  return (
    <section id={section.anchorId} className="py-14" style={sectionStyle(section)}>
      <div className="container mx-auto px-4">
        <div className={cn("max-w-4xl", section.align === "left" ? "" : "mx-auto text-center")}>
          {title && <h2 className="text-3xl font-bold md:text-4xl" style={titleStyle(section)}>{title}</h2>}
          {body && <p className="mt-4 text-base leading-8 opacity-80" style={bodyStyle(section)}>{renderLines(body)}</p>}
        </div>
      </div>
    </section>
  );
};

const CardGridSection = ({ section, language }: { section: SanityCardGridSection; language?: string }) => {
  const title = pickLocalizedText(section.title, section.titleVi, section.titleEn, language);
  const description = pickLocalizedText(section.description, section.descriptionVi, section.descriptionEn, language);

  return (
    <section id={section.anchorId} className="py-14" style={sectionStyle(section)}>
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          {title && <h2 className="text-3xl font-bold md:text-4xl" style={titleStyle(section)}>{title}</h2>}
          {description && (
            <p className={cn("mt-3 leading-7", !section.descriptionTextColor && "text-base opacity-80")} style={descriptionStyle(section)}>
              {renderLines(description)}
            </p>
          )}
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {section.cards?.filter((card) => card.isVisible !== false).map((card) => {
            const cardTitle = pickLocalizedText(card.title, card.titleVi, card.titleEn, language);
            const cardDescription = pickLocalizedText(card.description, card.descriptionVi, card.descriptionEn, language);
            const linkLabel = pickLocalizedText(card.linkLabel, card.linkLabelVi, card.linkLabelEn, language);
            const cardContent = (
              <Card
                className={cn("h-full overflow-hidden transition", card.cardHref && "cursor-pointer hover:shadow-md")}
                style={{backgroundColor: card.backgroundColor, borderColor: card.borderColor, color: card.textColor}}
              >
                {card.imageUrl && (
                  card.cardHref ? (
                    <div className="flex h-44 w-full items-center justify-center bg-slate-50">
                      <img
                        src={card.imageUrl}
                        alt={cardTitle || ""}
                        className={cn("h-full w-full", imageFitClassName(card.imageFit))}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <a
                      {...imageLinkProps(card.imageHref || card.imageUrl)}
                      className="flex h-44 w-full items-center justify-center bg-slate-50 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={cardTitle || "Open image"}
                    >
                      <img
                        src={card.imageUrl}
                        alt={cardTitle || ""}
                        className={cn("h-full w-full", imageFitClassName(card.imageFit))}
                        loading="lazy"
                      />
                    </a>
                  )
                )}
                <CardContent className="p-6">
                  {cardTitle && <h3 className="text-lg font-semibold" style={titleStyle(card)}>{cardTitle}</h3>}
                  {cardDescription && (
                    <p
                      className={cn("mt-2 leading-6", !card.descriptionTextColor && "text-sm text-muted-foreground")}
                      style={descriptionStyle(card)}
                    >
                      {renderLines(cardDescription)}
                    </p>
                  )}
                  {linkLabel && card.linkHref && !card.cardHref && (
                    <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary" href={card.linkHref}>
                      {linkLabel}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                </CardContent>
              </Card>
            );

            return card.cardHref ? (
              <a key={card._key || cardTitle} {...imageLinkProps(card.cardHref)} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {cardContent}
              </a>
            ) : (
              <React.Fragment key={card._key || cardTitle}>{cardContent}</React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const ImageTextSection = ({ section, language }: { section: SanityImageTextSection; language?: string }) => {
  const title = pickLocalizedText(section.title, section.titleVi, section.titleEn, language);
  const body = pickLocalizedText(section.body, section.bodyVi, section.bodyEn, language);

  return (
    <section id={section.anchorId} className="py-14" style={sectionStyle(section)}>
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-8 md:grid-cols-2">
          {section.imageUrl && (
            <a
              {...imageLinkProps(section.imageHref || section.imageUrl)}
              className={cn("flex min-h-72 items-center justify-center rounded-lg bg-slate-50 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", section.imagePosition === "right" && "md:order-2")}
              aria-label={title || "Open image"}
            >
              <img
                src={section.imageUrl}
                alt={title || ""}
                className={cn("max-h-[420px] w-full rounded-lg", imageFitClassName(section.imageFit))}
                loading="lazy"
              />
            </a>
          )}
          <div>
            {title && <h2 className="text-3xl font-bold md:text-4xl" style={titleStyle(section)}>{title}</h2>}
            {body && <p className="mt-4 text-base leading-8 opacity-80" style={bodyStyle(section)}>{renderLines(body)}</p>}
            {section.button && (
              <div className="mt-6">
                <SectionButton button={section.button} language={language} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const ImageGallerySection = ({ section, language }: { section: SanityImageGallerySection; language?: string }) => {
  const title = pickLocalizedText(section.title, section.titleVi, section.titleEn, language);
  const description = pickLocalizedText(section.description, section.descriptionVi, section.descriptionEn, language);
  const images = section.images?.filter((image) => image.imageUrl) || [];
  const marqueeImages = images.length > 1 ? Array.from({ length: 4 }, () => images).flat() : images;

  if (images.length === 0) return null;

  return (
    <section id={section.anchorId} className="py-10" style={sectionStyle(section)}>
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className="mx-auto mb-6 max-w-3xl text-center">
            {title && <h2 className="text-2xl font-bold md:text-3xl" style={titleStyle(section)}>{title}</h2>}
            {description && <p className="mt-3 text-base leading-7 opacity-80">{renderLines(description)}</p>}
          </div>
        )}
        <div className="sanity-gallery-marquee-mask overflow-hidden">
          <div
            className={cn("flex w-max gap-8", images.length > 1 && "sanity-gallery-marquee")}
            style={images.length > 1 ? { animation: "sanity-gallery-marquee 14s linear infinite" } : undefined}
          >
            {marqueeImages.map((image, index) => {
              const isDuplicate = index >= images.length;

              return (
                <a
                  key={`${image._key || image.imageUrl || index}-${index}`}
                  {...imageLinkProps(image.href || image.imageUrl)}
                  className="group flex h-24 w-44 flex-none items-center justify-center rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-28 md:w-52 md:p-4"
                  aria-hidden={isDuplicate ? true : undefined}
                  tabIndex={isDuplicate ? -1 : undefined}
                  aria-label={image.alt || title || "Open image"}
                >
                  <img
                    src={image.imageUrl}
                    alt={isDuplicate ? "" : image.alt || title || ""}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const CtaSection = ({ section, language }: { section: SanityCtaSection; language?: string }) => {
  const title = pickLocalizedText(section.title, section.titleVi, section.titleEn, language);
  const description = pickLocalizedText(section.description, section.descriptionVi, section.descriptionEn, language);

  return (
    <section id={section.anchorId} className="py-14" style={sectionStyle(section)}>
      <div className="container mx-auto px-4 text-center">
        {title && <h2 className="text-3xl font-bold md:text-4xl" style={titleStyle(section)}>{title}</h2>}
        {description && (
          <p className={cn("mx-auto mt-3 max-w-2xl leading-7", !section.descriptionTextColor && "text-base opacity-80")} style={descriptionStyle(section)}>
            {renderLines(description)}
          </p>
        )}
        {section.button && (
          <div className="mt-7 flex justify-center">
            <SectionButton button={section.button} language={language} />
          </div>
        )}
      </div>
    </section>
  );
};

const FlexibleSection = ({ section, language }: { section: SanityFlexibleSection; language?: string }) => {
  const visibleItems = section.items?.filter((item) => item.isVisible !== false) || [];
  console.log("FlexibleSection rendering with items:", { total: section.items?.length, visible: visibleItems.length, items: visibleItems });
  if (visibleItems.length === 0) return null;

  return (
    <section
      id={section.anchorId}
      style={{
        ...sectionStyle(section),
        paddingTop: section.paddingY ?? 56,
        paddingBottom: section.paddingY ?? 56,
      }}
    >
      <div className={cn("container mx-auto px-4", maxWidthClassName(section.maxWidth))}>
        <div
          className={cn(
            section.layout === "stack" ? "flex flex-col" : "grid grid-cols-1",
            section.layout !== "stack" && gridColumnsClassName(section.columns),
          )}
          style={{ gap: section.gap ?? 24 }}
        >
          {visibleItems.map((item, index) => (
            <React.Fragment key={item._key || `${item._type}-${index}`}>{renderFlexibleItem(item, language)}</React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

const SpacerSection = ({ section }: { section: SanitySpacerSection }) => (
  <div
    id={section.anchorId}
    style={{
      ...sectionStyle(section),
      height: section.height || 48,
    }}
    aria-hidden="true"
  />
);

const renderSection = (section: SanityPageSection, language?: string) => {
  let content: React.ReactNode = null;

  switch (section._type) {
    case "pageHeroSection":
      content = <HeroSection section={section} language={language} />;
      break;
    case "pageTextSection":
      content = <TextSection section={section} language={language} />;
      break;
    case "pageCardGridSection":
      content = <CardGridSection section={section} language={language} />;
      break;
    case "pageImageTextSection":
      content = <ImageTextSection section={section} language={language} />;
      break;
    case "pageCtaSection":
      content = <CtaSection section={section} language={language} />;
      break;
    case "pageFlexibleSection":
      content = <FlexibleSection section={section} language={language} />;
      break;
    case "pageImageGallerySection":
      content = <ImageGallerySection section={section} language={language} />;
      break;
    case "pageSpacerSection":
      return <SpacerSection section={section} />;
    default:
      console.warn("Unknown section type:", (section as { _type?: string })._type);
      return null;
  }

  if (!content) return null;
  return <AnimatedSectionFrame section={section}>{content}</AnimatedSectionFrame>;
};

export const SanityPageSections = ({ routePath, placement }: SanityPageSectionsProps) => {
  const [sections, setSections] = useState<SanityPageSection[]>([]);
  const { i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;

    loadSanityPageSections(routePath, placement).then((nextSections) => {
      console.log("Loaded sections for", { routePath, placement }, nextSections);
      if (mounted) setSections(nextSections);
    });

    return () => {
      mounted = false;
    };
  }, [routePath, placement]);

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section, index) => {
        const content = renderSection(section, i18n.language);
        if (!content) return null;

        return (
          <div
            key={section._key || `${section._type}-${index}`}
            className={cn("sanity-section-shell", section._type === "pageSpacerSection" && "sanity-section-shell-spacer")}
          >
            {content}
          </div>
        );
      })}
    </>
  );
};

type CustomSectionPortal = {
  section: SanityPageSection;
  host: HTMLDivElement;
};

export const SanityCustomSections = () => {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const [portals, setPortals] = useState<CustomSectionPortal[]>([]);

  useEffect(() => {
    let cancelled = false;
    let hosts: HTMLDivElement[] = [];
    let timer: number | undefined;

    loadSanityPageSections(pathname, "custom").then((sections) => {
      if (cancelled) return;

      timer = window.setTimeout(() => {
        if (cancelled) return;

        const afterCursor = new Map<Element, Node>();
        const insideStartBoundary = new Map<Element, ChildNode | null>();
        const nextPortals = sections.flatMap<CustomSectionPortal>((section) => {
          if (!section.targetSelector) return [];

          let target: Element | null = null;
          try {
            target = document.querySelector(section.targetSelector);
          } catch {
            console.warn("CSS selector không hợp lệ cho Sanity section:", section.targetSelector);
            return [];
          }
          if (!target) {
            console.warn("Không tìm thấy phần tử đích cho Sanity section:", section.targetSelector);
            return [];
          }

          const host = document.createElement("div");
          host.dataset.sanityCustomSection = section._key || section._type;
          const position = section.insertPosition || "after";

          if (position === "insideStart") {
            if (!insideStartBoundary.has(target)) insideStartBoundary.set(target, target.firstChild);
            target.insertBefore(host, insideStartBoundary.get(target) || null);
          }
          else if (position === "insideEnd") target.append(host);
          else if (position === "before") target.parentNode?.insertBefore(host, target);
          else {
            const cursor = afterCursor.get(target) || target;
            cursor.parentNode?.insertBefore(host, cursor.nextSibling);
            afterCursor.set(target, host);
          }

          if (!host.isConnected) return [];
          hosts.push(host);
          return [{section, host}];
        });

        setPortals(nextPortals);
      }, 0);
    });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      hosts.forEach((host) => host.remove());
      hosts = [];
    };
  }, [pathname]);

  return (
    <>
      {portals.map(({section, host}, index) =>
        createPortal(
          <div className={cn("sanity-section-shell", section._type === "pageSpacerSection" && "sanity-section-shell-spacer")}>
            {renderSection(section, i18n.language)}
          </div>,
          host,
          section._key || `${section._type}-${index}`,
        ),
      )}
    </>
  );
};
