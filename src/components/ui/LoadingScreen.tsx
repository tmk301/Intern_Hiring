import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { defaultLoadingScreenConfig, type LoadingScreenConfig } from "@/lib/siteConfig";

type LoadingScreenProps = {
  config?: Partial<LoadingScreenConfig> | null;
  label?: string;
};

const LoadingAnimation = ({ config }: { config: LoadingScreenConfig }) => {
  if (config.animationStyle === "dots") {
    return (
      <div className="flex h-10 items-center justify-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2.5 w-2.5 animate-bounce rounded-full"
            style={{ animationDelay: `${index * 120}ms`, backgroundColor: config.accentColor }}
          />
        ))}
      </div>
    );
  }

  if (config.animationStyle === "bar") {
    return (
      <div className="h-2 w-48 overflow-hidden rounded-full bg-black/10" aria-hidden="true">
        <div
          className="h-full w-1/2 animate-[loading-bar_1.2s_ease-in-out_infinite] rounded-full"
          style={{ backgroundColor: config.accentColor }}
        />
      </div>
    );
  }

  return <Loader2 className="h-9 w-9 animate-spin" style={{ color: config.accentColor }} aria-hidden="true" />;
};

export const LoadingScreen = ({ config, label }: LoadingScreenProps) => {
  const { t } = useTranslation();
  const normalizedConfig = {
    ...defaultLoadingScreenConfig,
    ...(config || {}),
  };
  const title =
    normalizedConfig.title === defaultLoadingScreenConfig.title
      ? t("app.loadingTitle")
      : normalizedConfig.title;
  const message = normalizedConfig.message || t("app.loadingMessage");

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: normalizedConfig.backgroundColor, color: normalizedConfig.textColor }}
      aria-label={label || message}
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        {normalizedConfig.logoUrl ? (
          <img src={normalizedConfig.logoUrl} alt="" className="mb-6 max-h-20 max-w-48 object-contain" />
        ) : (
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-md text-2xl font-bold text-white"
            style={{ backgroundColor: normalizedConfig.accentColor }}
            aria-hidden="true"
          >
            IH
          </div>
        )}
        <LoadingAnimation config={normalizedConfig} />
        <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6" style={{ color: normalizedConfig.secondaryTextColor }}>
          {message}
        </p>
      </div>
    </div>
  );
};
