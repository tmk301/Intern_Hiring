import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GoogleMapsEmbedLocationFilterProps = {
  value: string;
  areaQuery?: string;
  onChange: (value: string) => void;
};

const DEFAULT_QUERY = "Vietnam";

const buildGoogleMapsEmbedUrl = (query: string) => {
  const normalizedQuery = query.trim() || DEFAULT_QUERY;
  return `https://www.google.com/maps?q=${encodeURIComponent(normalizedQuery)}&output=embed`;
};

export function GoogleMapsEmbedLocationFilter({
  value,
  areaQuery = "",
  onChange,
}: GoogleMapsEmbedLocationFilterProps) {
  const { t } = useTranslation();
  const selectedAreaQuery = areaQuery.trim();
  const [draftLocation, setDraftLocation] = useState(value);
  const [embedQuery, setEmbedQuery] = useState(value || selectedAreaQuery || DEFAULT_QUERY);
  const embedUrl = useMemo(() => buildGoogleMapsEmbedUrl(embedQuery), [embedQuery]);

  useEffect(() => {
    setDraftLocation(value);
    if (!selectedAreaQuery) setEmbedQuery(value || DEFAULT_QUERY);
  }, [selectedAreaQuery, value]);

  useEffect(() => {
    if (selectedAreaQuery) setEmbedQuery(selectedAreaQuery);
  }, [selectedAreaQuery]);

  const applyLocation = () => {
    const nextLocation = draftLocation.trim();
    onChange(nextLocation);
    setEmbedQuery(nextLocation || DEFAULT_QUERY);
  };

  const clearLocation = () => {
    setDraftLocation("");
    onChange("");
    setEmbedQuery(selectedAreaQuery || DEFAULT_QUERY);
  };

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="google-maps-embed-location-filter">{t("jobs.filters.locationMap.label")}</Label>
          <Input
            id="google-maps-embed-location-filter"
            value={draftLocation}
            onChange={(event) => setDraftLocation(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLocation();
              }
            }}
            placeholder={t("jobs.filters.locationMap.placeholder")}
            className="h-12 bg-white"
          />
        </div>
        <Button type="button" variant="outline" onClick={applyLocation} className="w-full md:w-44">
          <Search className="h-4 w-4" />
          {t("jobs.filters.locationMap.search")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={clearLocation}
          disabled={!draftLocation && !value}
          className="w-full md:w-44"
        >
          <X className="h-4 w-4" />
          {t("jobs.filters.locationMap.clear")}
        </Button>
      </div>

      <div className="h-72 overflow-hidden rounded-md border bg-white">
        <iframe
          title={t("jobs.filters.locationMap.iframeTitle")}
          src={embedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("jobs.filters.locationMap.hint")}</span>
      </div>
    </div>
  );
}
