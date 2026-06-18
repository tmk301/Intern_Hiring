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
  onChange: (value: string) => void;
};

const DEFAULT_QUERY = "Ho Chi Minh City, Vietnam";

// Hàm hỗ trợ chuẩn hóa chuỗi tiếng Việt phục vụ so khớp nội bộ
const internalNormalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

// Hàm trích xuất số từ chuỗi
const extractNumbers = (text: string) => text.match(/\d+/g) ?? [];

// Kiểm tra xem một chuỗi địa chỉ công việc có chứa chính xác số quận/huyện mục tiêu hay không
const hasJobInDistrict = (jobsList: PublicJobPost[], districtNum: string) => {
  return jobsList.some((job) => {
    const address = internalNormalize(job.location || "");
    const districtRegex = new RegExp(`(?<!\\b(phuong|p|xa)\\s*\\.?\\s*)\\b(quan|q|huyen|h|dist|district)\\s*\\.?\\s*${districtNum}\\b`, "i");
    return districtRegex.test(address);
  });
};

const buildGoogleMapsEmbedUrl = (query: string, jobsList: PublicJobPost[]) => {
  const currentQuery = query.trim();
  
  // Khi không nhập gì, quay về bản đồ TP.HCM mặc định (Sử dụng đúng cấu trúc URL gốc của bạn)
  if (!currentQuery) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(DEFAULT_QUERY)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }

  const checkText = internalNormalize(currentQuery);
  const numbers = extractNumbers(checkText);

  if (numbers.length === 1 && (checkText.includes("quan") || checkText.includes("q ") || /^q\d+$/.test(checkText) || checkText.includes("district"))) {
    const targetDistrictNum = numbers[0];
    const exist = hasJobInDistrict(jobsList, targetDistrictNum);
    if (!exist) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(DEFAULT_QUERY)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    }
  }

  let finalQuery = currentQuery;
  if (/^q(uan)?\s*8$/.test(checkText) || checkText.includes("quan 8") || checkText.includes("q 8")) {
    finalQuery = "District 8, Ho Chi Minh City, Vietnam";
  } else if (/^q(uan)?\s*3$/.test(checkText) || checkText.includes("quan 3") || checkText.includes("q 3")) {
    finalQuery = "District 3, Ho Chi Minh City, Vietnam";
  } else {
    if (!checkText.includes("ho chi minh") && !checkText.includes("hcm")) {
      finalQuery = `${currentQuery}, Ho Chi Minh City, Vietnam`;
    }
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(finalQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
};

export function GoogleMapsEmbedLocationFilter({
  value,
  jobs = [],
  areaQuery = "",
  onChange,
}: GoogleMapsEmbedLocationFilterProps) {
  const { t } = useTranslation();
  const selectedAreaQuery = areaQuery.trim();
  const [draftLocation, setDraftLocation] = useState(value);
  const [embedQuery, setEmbedQuery] = useState(value || selectedAreaQuery || "");

  useEffect(() => {
    setDraftLocation(value);
    if (!selectedAreaQuery) setEmbedQuery(value);
  }, [selectedAreaQuery, value]);

  useEffect(() => {
    if (selectedAreaQuery) setEmbedQuery(selectedAreaQuery);
  }, [selectedAreaQuery]);

  const applyLocation = () => {
    const nextLocation = draftLocation.trim();
    onChange(nextLocation);
    setEmbedQuery(nextLocation);
  };

  const clearLocation = () => {
    setDraftLocation("");
    onChange("");
    setEmbedQuery(selectedAreaQuery || "");
  };

  const embedUrl = useMemo(() => {
    // 🎯 ĐÚNG Ý BẠN: Nếu ô tìm kiếm trống rỗng, trả thẳng về bản đồ TP.HCM gốc rộng (z=11)
    if (!embedQuery.trim()) {
      return buildGoogleMapsEmbedUrl("", jobs);
    }

    // Nếu có nhập từ khóa (như "quận 7") và danh sách trả về có jobs hợp lệ
    if (jobs && jobs.length > 0) {
      const firstValidJob = jobs.find(
        (j) => j.latitude !== null && j.longitude !== null && j.latitude !== undefined && j.longitude !== undefined
      );

      // Lấy thằng đầu tiên trong danh sách để ghim marker đỏ và mở khung InfoWindow
      if (firstValidJob) {
        const lat = firstValidJob.latitude;
        const lng = firstValidJob.longitude;
        return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
      }
    }

    // Trường hợp có chữ nhưng danh sách jobs rỗng
    return buildGoogleMapsEmbedUrl(embedQuery, jobs);
  }, [embedQuery, jobs]);

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

      <div className="h-[500px] overflow-hidden rounded-md border bg-white">
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