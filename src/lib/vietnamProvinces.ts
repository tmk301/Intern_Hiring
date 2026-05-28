import type { JobFilterOption } from "@/components/jobs/jobFilterConfig";

const VIETNAM_PROVINCES_API_BASE_URL = "https://provinces.open-api.vn/api/v1";

type VietnamProvince = {
  name: string;
  code: number;
  division_type?: string;
  codename?: string;
  phone_code?: number;
  districts?: VietnamDistrict[] | null;
};

type VietnamDistrict = {
  name: string;
  code: number;
  division_type?: string;
  codename?: string;
  province_code?: number;
  wards?: VietnamWard[] | null;
};

type VietnamWard = {
  name: string;
  code: number;
  division_type?: string;
  codename?: string;
  district_code?: number;
};

let provinceOptionsCache: Promise<JobFilterOption[]> | null = null;
const districtOptionsCache = new Map<string, Promise<JobFilterOption[]>>();
const wardOptionsCache = new Map<string, Promise<JobFilterOption[]>>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasRequiredAdministrativeFields = (value: unknown): value is { name: string; code: number } =>
  isRecord(value) && typeof value.name === "string" && typeof value.code === "number";

const normalizeForAlias = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d");

const stripAdministrativePrefix = (name: string) =>
  normalizeForAlias(name)
    .replace(/^(thanh pho|tinh|quan|huyen|thi xa|phuong|xa|thi tran)\s+/i, "")
    .trim();

const codenameToLabel = (codename?: string) =>
  codename
    ?.replace(/^(thanh_pho|tinh|quan|huyen|thi_xa|phuong|xa|thi_tran)_/, "")
    .replace(/_/g, " ")
    .trim();

const commonAliases: Record<number, string[]> = {
  46: ["Hue", "Thua Thien Hue"],
  79: ["Ho Chi Minh", "HCM", "TP HCM", "TP.HCM", "Sai Gon"],
};

const buildAliases = (item: { name: string; code: number; codename?: string }) => {
  const aliases = new Set<string>();
  const shortName = stripAdministrativePrefix(item.name);
  const codenameLabel = codenameToLabel(item.codename);

  if (shortName && shortName !== item.name) {
    aliases.add(shortName);
  }

  if (item.codename) {
    aliases.add(item.codename);
  }

  if (codenameLabel) {
    aliases.add(codenameLabel);
  }

  commonAliases[item.code]?.forEach((alias) => aliases.add(alias));

  return Array.from(aliases);
};

const toFilterOption = (item: { name: string; code: number; codename?: string }): JobFilterOption => ({
  value: String(item.code),
  label: item.name,
  aliases: buildAliases(item),
});

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${VIETNAM_PROVINCES_API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Vietnam Province API ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getVietnamProvinceOptions() {
  provinceOptionsCache ??= fetchJson<unknown[]>("/?depth=1")
    .then((data) => data.filter(hasRequiredAdministrativeFields).map(toFilterOption))
    .catch((error) => {
      provinceOptionsCache = null;
      throw error;
    });

  return provinceOptionsCache;
}

export async function getVietnamDistrictOptions(provinceCode: string) {
  if (!provinceCode) return [];

  const cacheKey = String(provinceCode);
  const cached = districtOptionsCache.get(cacheKey);

  if (cached) return cached;

  const request = fetchJson<VietnamProvince>(`/p/${encodeURIComponent(cacheKey)}?depth=2`)
    .then((province) =>
      (Array.isArray(province.districts) ? province.districts : [])
        .filter(hasRequiredAdministrativeFields)
        .map(toFilterOption),
    )
    .catch((error) => {
      districtOptionsCache.delete(cacheKey);
      throw error;
    });

  districtOptionsCache.set(cacheKey, request);
  return request;
}

export async function getVietnamWardOptions(districtCode: string) {
  if (!districtCode) return [];

  const cacheKey = String(districtCode);
  const cached = wardOptionsCache.get(cacheKey);

  if (cached) return cached;

  const request = fetchJson<VietnamDistrict>(`/d/${encodeURIComponent(cacheKey)}?depth=2`)
    .then((district) =>
      (Array.isArray(district.wards) ? district.wards : [])
        .filter(hasRequiredAdministrativeFields)
        .map(toFilterOption),
    )
    .catch((error) => {
      wardOptionsCache.delete(cacheKey);
      throw error;
    });

  wardOptionsCache.set(cacheKey, request);
  return request;
}
