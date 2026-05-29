export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, params?: RequestOptions["params"]) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly statusText: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

async function readErrorMessage(response: Response) {
  const errorText = await response.text();

  if (!errorText) return "Unknown error";

  try {
    const body = JSON.parse(errorText) as { message?: string; error?: string };
    return body.message || body.error || errorText;
  } catch {
    return errorText;
  }
}

export async function apiRequest<T>(
  path: string,
  { params, headers, ...options }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(`API ${response.status} ${response.statusText}: ${message}`, response.status, response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Auth headers helper
function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// User type shared across API consumers
export type ApiUser = {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status?: string;
  restricted?: boolean;
  isRestricted?: boolean;
  avatarUrl?: string;
  phoneNumber?: string;
  gender?: string;
  dob?: string;
  cvUrl?: string;
  themeColor?: string;
};

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gender?: string;
  dob?: string | null;
  cvUrl?: string;
  themeColor?: string;
};

// Auth API
export const authApi = {
  getMe: (token: string) =>
    apiRequest<ApiUser>("/api/auth/me", {
      headers: authHeaders(token),
    }),
};

// User API
export const userApi = {
  updateProfile: (token: string, data: UpdateProfilePayload) =>
    apiRequest<ApiUser>("/api/users/me", {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),
};

export type AdminUser = ApiUser & {
  createdAt?: string;
};

export type AdminJobPost = {
  id: string | number;
  title: string;
  company?: string;
  employerName?: string;
  employerEmail?: string;
  location?: string;
  type?: string;
  salary?: string;
  status?: string;
  description?: string;
  createdAt?: string;
  deletedAt?: string | null;
};

export type RecruiterJobPost = {
  id: string | number;
  title: string | null;
  company: string | null;
  employer_name: string | null;
  employer_email: string | null;
  location: string | null;
  type: string | null;
  salary: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type RecruiterJobPayload = {
  title: string;
  company: string;
  employerName?: string;
  location: string;
  type: string;
  salary?: string;
  description: string;
};

export type AuditAction =
  | "USER_ROLE_UPDATED"
  | "USER_RESTRICTION_UPDATED"
  | "ADMIN_JOB_CREATED"
  | "ADMIN_JOB_TRASHED"
  | "ADMIN_JOB_RESTORED"
  | "ADMIN_JOB_DELETED"
  | "JOB_APPROVED"
  | "JOB_REJECTED"
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  | "RECRUITER_APPLICATION_APPROVED"
  | "RECRUITER_APPLICATION_REJECTED"
  | "RECRUITER_FORM_FIELD_CREATED"
  | "RECRUITER_FORM_FIELD_UPDATED"
  | "RECRUITER_FORM_FIELD_DELETED";

export type AuditTargetType = "USER" | "JOB" | "CATEGORY_OPTION" | "RECRUITER_APPLICATION" | "RECRUITER_FORM_FIELD";

export type AuditLog = {
  id: number;
  actorId?: number | null;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: number | null;
  description: string;
  metadata: Record<string, string>;
  createdAt: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type AuditLogFilters = {
  page?: number;
  size?: number;
  action?: AuditAction | "";
  targetType?: AuditTargetType | "";
  actorEmail?: string;
};

export const adminApi = {
  listUsers: (token: string) =>
    apiRequest<AdminUser[]>("/api/admin/users", {
      headers: authHeaders(token),
    }),


  setUserRestriction: (token: string, userId: string | number, restricted: boolean) =>
    apiRequest<AdminUser>(`/api/admin/users/${encodeURIComponent(String(userId))}/restriction`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ restricted }),
    }),

  setUserRole: (token: string, userId: string | number, role: string) =>
    apiRequest<AdminUser>(`/api/admin/users/${encodeURIComponent(String(userId))}/role`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ role }),
    }),

  listAuditLogs: (token: string, filters: AuditLogFilters = {}) =>
    apiRequest<PageResponse<AuditLog>>("/api/admin/audit-logs", {
      headers: authHeaders(token),
      params: {
        ...filters,
        action: filters.action || undefined,
        targetType: filters.targetType || undefined,
        actorEmail: filters.actorEmail || undefined,
      },
    }),

  listJobs: (token: string, includeTrash = true) =>
    apiRequest<AdminJobPost[]>("/api/admin/jobs", {
      headers: authHeaders(token),
      params: { includeTrash },
    }),

  createJob: (token: string, data: Omit<AdminJobPost, "id" | "createdAt" | "deletedAt" | "status">) =>
    apiRequest<AdminJobPost>("/api/admin/jobs", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  moveJobToTrash: (token: string, jobId: string | number) =>
    apiRequest<AdminJobPost>(`/api/admin/jobs/${encodeURIComponent(String(jobId))}/trash`, {
      method: "PATCH",
      headers: authHeaders(token),
    }),

  restoreJob: (token: string, jobId: string | number) =>
    apiRequest<AdminJobPost>(`/api/admin/jobs/${encodeURIComponent(String(jobId))}/restore`, {
      method: "PATCH",
      headers: authHeaders(token),
    }),

  deleteJobPermanently: (token: string, jobId: string | number) =>
    apiRequest<void>(`/api/admin/jobs/${encodeURIComponent(String(jobId))}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),
};

export type CategoryKey = "CITIES" | "WORK_MODES" | "JOB_TYPES" | "DISTRICTS" | "WARDS" | "COMPANIES" | "CURRENCIES";

export type CategoryOption = {
  id: number;
  categoryKey: CategoryKey;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

export type RecruiterFormField = {
  id: number;
  name: string;
  label: string;
  validationRegex?: string;
  placeholder?: string;
  required: boolean;
  sortOrder: number;
  active: boolean;
};

export type RecruiterApplication = {
  id: number;
  applicantId: number;
  applicantEmail: string;
  formData: Record<string, string>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  reviewNote?: string;
  reviewedById?: number;
  reviewedAt?: string;
  createdAt?: string;
};

export const configApi = {
  listCategoryOptions: (key: CategoryKey, includeInactive = false) =>
    apiRequest<CategoryOption[]>(`/api/categories/${key}`, { params: { includeInactive } }),

  createCategoryOption: (token: string, data: Omit<CategoryOption, "id">) =>
    apiRequest<CategoryOption>("/api/categories", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  updateCategoryOption: (token: string, id: number, data: Omit<CategoryOption, "id">) =>
    apiRequest<CategoryOption>(`/api/categories/${id}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteCategoryOption: (token: string, id: number) =>
    apiRequest<void>(`/api/categories/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  listRecruiterFormFields: (includeInactive = false) =>
    apiRequest<RecruiterFormField[]>("/api/recruiter/form-fields", { params: { includeInactive } }),

  createRecruiterFormField: (token: string, data: Omit<RecruiterFormField, "id">) =>
    apiRequest<RecruiterFormField>("/api/recruiter/form-fields", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  updateRecruiterFormField: (token: string, id: number, data: Omit<RecruiterFormField, "id">) =>
    apiRequest<RecruiterFormField>(`/api/recruiter/form-fields/${id}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteRecruiterFormField: (token: string, id: number) =>
    apiRequest<void>(`/api/recruiter/form-fields/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),
};

export const recruiterApi = {
  submitApplication: (token: string, formData: Record<string, string>) =>
    apiRequest<RecruiterApplication>("/api/recruiter/applications", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ formData }),
    }),

  listApplications: (token: string, status?: RecruiterApplication["status"]) =>
    apiRequest<RecruiterApplication[]>("/api/recruiter/applications", {
      headers: authHeaders(token),
      params: { status },
    }),

  reviewApplication: (token: string, id: number, approved: boolean, reviewNote?: string) =>
    apiRequest<RecruiterApplication>(`/api/recruiter/applications/${id}/review`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ approved, reviewNote }),
    }),

  revokeApplication: (token: string, id: number) =>
    apiRequest<RecruiterApplication>(`/api/recruiter/applications/${id}/revoke`, {
      method: "POST",
      headers: authHeaders(token),
    }),

  restoreApplication: (token: string, id: number) =>
    apiRequest<RecruiterApplication>(`/api/recruiter/applications/${id}/restore`, {
      method: "POST",
      headers: authHeaders(token),
    }),

  listJobs: (token: string) =>
    apiRequest<RecruiterJobPost[]>("/api/recruiter/jobs", {
      headers: authHeaders(token),
    }),

  createJob: (token: string, data: RecruiterJobPayload) =>
    apiRequest<RecruiterJobPost>("/api/recruiter/jobs", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  updateJobStatus: (token: string, id: string | number, status: string) =>
    apiRequest<RecruiterJobPost>(`/api/recruiter/jobs/${encodeURIComponent(String(id))}/status`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    }),

  deleteJob: (token: string, id: string | number) =>
    apiRequest<void>(`/api/recruiter/jobs/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),
};
