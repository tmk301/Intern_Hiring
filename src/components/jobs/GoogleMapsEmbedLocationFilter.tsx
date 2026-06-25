import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type PublicJobPost } from "@/lib/api";

type GoogleMapsEmbedLocationFilterProps = {
  value: string;
  company?: string; 
  keyword?: string; // 🎯 Khai báo thêm thuộc tính nhận từ khóa
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

const hasJobInDistrict = (jobsList: PublicJobPost[], districtNum: string) => {
  // Nếu mảng jobs trống hoặc chưa tải xong, cứ cho qua để Map tự tìm theo chữ người dùng gõ
  if (!jobsList || jobsList.length === 0) return true; 
  
  return jobsList.some((job) => {
    const address = internalNormalize(job.location || "");
    const districtRegex = new RegExp(
      `(?<!\\b(phuong|p|xa)\\s*\\.?\\s*)\\b(quan|q|huyen|h|dist|district)\\s*\\.?\\s*${districtNum}\\b`,
      "i"
    );
    return districtRegex.test(address);
  });
};

export function GoogleMapsEmbedLocationFilter({
  value,
  company = "", 
  keyword = "", // 🎯 Tiếp nhận từ khóa từ prop bộ lọc truyền xuống
  jobs = [],
  areaQuery = "",
  centerPosition,
  onChange,
}: GoogleMapsEmbedLocationFilterProps) {
  const { t } = useTranslation();

  const [draftLocation, setDraftLocation] = useState(value);
  const [embedQuery, setEmbedQuery] = useState(value || areaQuery || "");

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
    const baseUrl = "https://maps.google.com/maps";
    const defaultZoom = 14;

    // 1. ƯU TIÊN 1: Click xem công việc cụ thể (Có tọa độ Lat/Lng cố định từ prop)
    if (centerPosition && centerPosition.lat && centerPosition.lng) {
      return `${baseUrl}?q=${centerPosition.lat},${centerPosition.lng}&z=16&ie=UTF8&iwloc=A&output=embed`;
    }

    // 2. ƯU TIÊN 2: Người dùng gõ trực tiếp địa chỉ vào ô tìm kiếm riêng của Bản đồ
   // 2. ƯU TIÊN 2: Người dùng gõ trực tiếp địa chỉ vào ô tìm kiếm riêng của Bản đồ
    if (value && value.trim() !== "") {
      const currentQuery = value.trim();
      const checkText = internalNormalize(currentQuery);
      const numbers = extractNumbers(checkText);

      let finalQuery = currentQuery;
      const currentZoom = 15; // Độ zoom vừa vặn cho một Quận

      // Kiểm tra xem người dùng có đang gõ dạng Quận + Số (Ví dụ: q7, q 8, quan 9, dist 7)
      const isDistrictNumberSearch = 
        numbers.length === 1 && 
        (checkText.includes("quan") || checkText.includes("district") || checkText.includes("dist") || /^q\s*\d+$/.test(checkText));

      if (isDistrictNumberSearch) {
        const districtNum = numbers[0];
        
        // Fix cứng định dạng tìm kiếm gửi lên Google Maps theo chuẩn tiếng Anh/Việt để Map luôn ra vị trí vùng Quận đó
        if (districtNum === "7") {
          finalQuery = "District 7, Ho Chi Minh City, Vietnam";
        } else if (districtNum === "8") {
          finalQuery = "District 8, Ho Chi Minh City, Vietnam";
        } else if (districtNum === "9" || districtNum === "2") {
          // Xử lý các quận sau sáp nhập sang thành phố Thủ Đức để bản đồ không bị lạc đường
          finalQuery = "Thu Duc, Ho Chi Minh City, Vietnam";
        } else {
          finalQuery = `Quan ${districtNum}, Ho Chi Minh City, Vietnam`;
        }
      } else {
        // Luồng cho các chữ tự do không chứa số (Hóc Môn, Củ Chi, tên Phường...)
        if (!checkText.includes("ho chi minh") && !checkText.includes("hcm")) {
          finalQuery = `${currentQuery}, Ho Chi Minh City, Vietnam`;
        }
      }

      return `${baseUrl}?q=${encodeURIComponent(finalQuery)}&z=${currentZoom}&ie=UTF8&iwloc=A&output=embed`;
    }

    // 3. ƯU TIÊN 3: HOẠT ĐỘNG CHO CẢ 2 Ô (TÌM THEO TÊN CÔNG TY HOẶC Ô TỪ KHÓA)
    // Lấy chuỗi tìm kiếm từ ô Tên công ty, nếu ô đó trống thì lấy từ ô Từ khóa
    const searchSearchTerm = company.trim() || keyword.trim();

    if (searchSearchTerm !== "") {
      const normalizedInput = internalNormalize(searchSearchTerm);

      // Quét toàn bộ mảng dữ liệu gốc từ API để tìm kiếm dữ liệu khớp vị trí
      const matchedJob = jobs.find((job) => {
        const jobCompany = job.company || "";
        const jobTitle = job.title || "";
        const jobDescription = job.description || "";
        
        // Khớp nếu tên công ty hoặc tiêu đề/mô tả công việc chứa từ khóa người dùng gõ
        return (
          internalNormalize(jobCompany).includes(normalizedInput) ||
          internalNormalize(jobTitle).includes(normalizedInput) ||
          internalNormalize(jobDescription).includes(normalizedInput)
        );
      });

      if (matchedJob) {
        const jobLat = matchedJob.latitude;
        const jobLng = matchedJob.longitude;

        // Trường hợp có tọa độ số -> Cắm ghim đỏ chính xác 100% bằng kinh độ vĩ độ
        if (jobLat && jobLng) {
          return `${baseUrl}?q=${Number(jobLat)},${Number(jobLng)}&z=16&ie=UTF8&iwloc=A&output=embed`;
        }

        // Trường hợp không có tọa độ số nhưng có chuỗi địa chỉ text
        if (matchedJob.location) {
          let finalQuery = matchedJob.location;
          const checkText = internalNormalize(finalQuery);
          if (!checkText.includes("ho chi minh") && !checkText.includes("hcm")) {
            finalQuery = `${finalQuery}, Ho Chi Minh City, Vietnam`;
          }
          return `${baseUrl}?q=${encodeURIComponent(finalQuery)}&z=16&ie=UTF8&iwloc=A&output=embed`;
        }
      }

      // Luồng dự phòng (Fallback): Nếu gõ từ khóa tự do chưa khớp bản ghi nào cụ thể, lấy chữ đó gửi thẳng lên Maps tự tìm kiếm
      let fallbackQuery = searchSearchTerm;
      if (!internalNormalize(fallbackQuery).includes("ho chi minh") && !internalNormalize(fallbackQuery).includes("hcm")) {
        fallbackQuery = `${fallbackQuery}, Ho Chi Minh City, Vietnam`;
      }
      return `${baseUrl}?q=${encodeURIComponent(fallbackQuery)}&z=16&ie=UTF8&iwloc=A&output=embed`;
    }

    // 4. ƯU TIÊN 4: Chọn vùng hành chính hành chính (Tỉnh/Quận/Phường) từ Select Box
    if (areaQuery && areaQuery.trim() !== "") {
      return `${baseUrl}?q=${encodeURIComponent(areaQuery)}&z=12&ie=UTF8&iwloc=&output=embed`;
    }

    // 5. MẶC ĐỊNH HOÀN TOÀN: Khi chưa gõ hoặc nhấn xóa bộ lọc
    return `${baseUrl}?q=${encodeURIComponent(DEFAULT_QUERY)}&z=${defaultZoom}&ie=UTF8&iwloc=&output=embed`;
  }, [value, company, keyword, areaQuery, centerPosition, jobs]); // 🎯 Đã cập nhật đầy đủ dependency array

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
            placeholder={t("jobs.filters.locationMap.placeholder")}
            className="h-12 bg-white"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={applyLocation}
          className="w-full md:w-44 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Search className="h-4 w-4 mr-2" />
          {t("jobs.filters.locationMap.search")}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={clearLocation}
          disabled={!draftLocation && !value}
          className="w-full md:w-44 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
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