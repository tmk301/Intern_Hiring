import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type PublicJobPost } from "@/lib/api";

type GoogleMapsEmbedLocationFilterProps = {
  value: string;
  areaQuery?: string;
  jobs?: PublicJobPost[];
  centerPosition?: {
    lat: number;
    lng: number;
    mapKey?: string;
  } | null;
  onChange: (value: string) => void;
};

const DEFAULT_QUERY = "Ho Chi Minh City, Vietnam";

const internalNormalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

const extractNumbers = (text: string) => text.match(/\d+/g) ?? [];

const hasJobInDistrict = (
  jobsList: PublicJobPost[],
  districtNum: string
) => {
  return jobsList.some((job) => {
    const address = internalNormalize(job.location || "");

    const districtRegex = new RegExp(
      `(?<!\\b(phuong|p|xa)\\s*\\.?\\s*)\\b(quan|q|huyen|h|dist|district)\\s*\\.?\\s*${districtNum}\\b`,
      "i"
    );

    return districtRegex.test(address);
  });
};

const buildGoogleMapsEmbedUrl = (
  query: string,
  jobsList: PublicJobPost[]
) => {
  const currentQuery = query.trim();

  if (!currentQuery) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(
      DEFAULT_QUERY
    )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  const checkText = internalNormalize(currentQuery);
  const numbers = extractNumbers(checkText);

  if (
    numbers.length === 1 &&
    (checkText.includes("quan") ||
      checkText.includes("district") ||
      /^q\s*\d+$/.test(checkText))
  ) {
    const districtNum = numbers[0];

    if (!hasJobInDistrict(jobsList, districtNum)) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(
        DEFAULT_QUERY
      )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    }
  }

  let finalQuery = currentQuery;

  if (
    /^q(uan)?\s*8$/.test(checkText) ||
    checkText.includes("quan 8") ||
    checkText.includes("q 8")
  ) {
    finalQuery = "District 8, Ho Chi Minh City, Vietnam";
  } else if (
    /^q(uan)?\s*3$/.test(checkText) ||
    checkText.includes("quan 3") ||
    checkText.includes("q 3")
  ) {
    finalQuery = "District 3, Ho Chi Minh City, Vietnam";
  } else if (
    !checkText.includes("ho chi minh") &&
    !checkText.includes("hcm")
  ) {
    finalQuery = `${currentQuery}, Ho Chi Minh City, Vietnam`;
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(
    finalQuery
  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
};

export function GoogleMapsEmbedLocationFilter({
  value,
  jobs = [],
  areaQuery = "",
  centerPosition,
  onChange,
}: GoogleMapsEmbedLocationFilterProps) {
  const { t } = useTranslation();

  const [draftLocation, setDraftLocation] = useState(value);

  const [embedQuery, setEmbedQuery] = useState(
    value || areaQuery || ""
  );

  useEffect(() => {
    setDraftLocation(value);

    if (value.trim()) {
      setEmbedQuery(value);
    } else {
      setEmbedQuery("");
    }
  }, [value]);

  const applyLocation = () => {
    const nextLocation = draftLocation.trim();

    onChange(nextLocation);
    setEmbedQuery(nextLocation);
  };

  const clearLocation = () => {
    setDraftLocation("");
    onChange("");
    setEmbedQuery("");
  };

  const embedUrl = useMemo(() => {
    const query = embedQuery.trim();

    // Không nhập gì => HCM
    if (!query) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(
        DEFAULT_QUERY
      )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    }

    // Có vị trí trung tâm từ danh sách job đã lọc
    if (centerPosition) {
      return `https://maps.google.com/maps?q=${centerPosition.lat},${centerPosition.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    }

    // Fallback: tìm theo text nhập
    return buildGoogleMapsEmbedUrl(query, jobs);
  }, [embedQuery, centerPosition, jobs]);

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="google-maps-embed-location-filter">
            {t("jobs.filters.locationMap.label")}
          </Label>

          <Input
            id="google-maps-embed-location-filter"
            value={draftLocation}
            onChange={(e) => setDraftLocation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLocation();
              }
            }}
            placeholder={t(
              "jobs.filters.locationMap.placeholder"
            )}
            className="h-12 bg-white"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={applyLocation}
          className="w-full md:w-44"
        >
          <Search className="h-4 w-4 mr-2" />
          {t("jobs.filters.locationMap.search")}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={clearLocation}
          disabled={!draftLocation && !value}
          className="w-full md:w-44"
        >
          <X className="h-4 w-4 mr-2" />
          {t("jobs.filters.locationMap.clear")}
        </Button>
      </div>

      <div className="h-[500px] overflow-hidden rounded-md border bg-white">
        <iframe
          key={`${embedUrl}-${centerPosition?.mapKey ?? "default"}`}
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