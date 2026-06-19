export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8080";

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

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
  { params, headers, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal, ...options }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("API request timed out. Please check the backend connection.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

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

//CVItem for CV
export type CvItem = {
    id: string;
    name: string;
    url: string;
    uploadedAt: number;
    isDefault?: boolean;
};

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
  cvList?: CvItem[],
  themeColor?: string;
  emailNotificationsEnabled?: boolean;
};

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gender?: string;
  dob?: string | null;
  themeColor?: string;
  cvList?: CvItem[];
  emailNotificationsEnabled?: boolean;
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

export type ApiNotification = {
  id: string | number;
  title?: string;
  message?: string;
  content?: string;
  description?: string;
  isRead?: boolean;
  read?: boolean;
  readAt?: string | null;
  type?: string;
  jobApplicationId?: string | number | null;
  jobId?: string | number | null;
  createdAt?: string;
  targetUrl?: string;
  link?: string;
  path?: string;
};

type NotificationListResponse = ApiNotification[] | {
  content?: ApiNotification[];
  notifications?: ApiNotification[];
};

export const notificationApi = {
  list: (token: string) =>
    apiRequest<NotificationListResponse>("/api/notifications", {
      headers: authHeaders(token),
    }),

  markAsRead: (token: string, notificationId: string | number) =>
    apiRequest<void>(`/api/notifications/${encodeURIComponent(String(notificationId))}/read`, {
      method: "POST",
      headers: authHeaders(token),
    }),

  markAllAsRead: (token: string) =>
    apiRequest<void>("/api/notifications/read-all", {
      method: "POST",
      headers: authHeaders(token),
    }),

  delete: (token: string, notificationId: string | number) =>
    apiRequest<void>(`/api/notifications/${encodeURIComponent(String(notificationId))}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  deleteMany: (token: string, notificationIds: Array<string | number>) =>
    apiRequest<void>("/api/notifications/bulk", {
      method: "DELETE",
      headers: authHeaders(token),
      body: JSON.stringify(notificationIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))),
    }),

  deleteAll: (token: string) =>
    apiRequest<void>("/api/notifications", {
      method: "DELETE",
      headers: authHeaders(token),
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
  currency?: string | null;
  mode?: string | null;
  experience?: string;
  applicationDeadline?: string | null;
  status?: string;
  hidden: boolean;
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
  currency: string | null;
  mode: string | null;
  experience: string | null;
  applicationDeadline: string | null;
  description: string | null;
  status: string | null;
  hidden: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type CandidateApplication = {
  id: string | number;
  jobId: string | number;
  jobTitle: string;
  company?: string | null;
  location?: string | null;
  salary?: string | null;
  jobType?: string | null;
  applicantId: string | number;
  applicantName: string;
  applicantEmail: string;
  appliedCvUrl: string;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  appliedAt: string;
};

export type RecruiterJobPayload = {
  title: string;
  company: string;
  employerName?: string;
  location: string;
  type: string;
  salary?: string;
  currency?: string | null;
  mode?: string | null;
  experience?: string;
  applicationDeadline?: string | null;
  description: string;
};

export type RecruiterJobSnapshot = {
  title?: string;
  location?: string;
  type?: string;
  salary?: string;
  currency?: string;
  mode?: string;
  experience?: string;
  applicationDeadline?: string;
  description?: string;
};

export type RecruiterJobChangeLog = {
  id: string | number;
  jobId: string | number;
  actorEmail: string;
  previousData: RecruiterJobSnapshot;
  newData: RecruiterJobSnapshot;
  changedFields: Array<keyof RecruiterJobSnapshot>;
  createdAt: string;
};

export type AuditAction =
  | "USER_ROLE_UPDATED"
  | "USER_RESTRICTION_UPDATED"
  | "ADMIN_JOB_CREATED"
  | "ADMIN_JOB_UPDATED"
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

  getUser: (token: string, userId: string | number) =>
    apiRequest<AdminUser>(`/api/admin/users/${encodeURIComponent(String(userId))}`, {
      headers: authHeaders(token),
    }),

  getUserCompanyProfile: (token: string, userId: string | number) =>
    apiRequest<CompanyProfile>(`/api/admin/users/${encodeURIComponent(String(userId))}/company`, {
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

  toggleJobHidden: (token: string, jobId: string | number, hidden: boolean) =>
    apiRequest<AdminJobPost>(`/api/admin/jobs/${encodeURIComponent(String(jobId))}/hidden`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ hidden }),
    }),
};

export type CategoryKey = "CITIES" | "WORK_MODES" | "JOB_TYPES" | "DISTRICTS" | "WARDS" | "COMPANIES" | "CURRENCIES";

export type CategoryOption = {
  id: string | number;
  categoryKey: CategoryKey;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

export type RecruiterFormField = {
  id: string | number;
  name: string;
  label: string;
  validationRegex?: string;
  placeholder?: string;
  required: boolean;
  sortOrder: number;
  active: boolean;
};

export type RecruiterApplication = {
  id: string | number;
  applicantId: string | number;
  applicantEmail: string;
  formData: Record<string, string>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  reviewNote?: string;
  reviewedById?: string | number;
  reviewedAt?: string;
  createdAt?: string;
};

export type CompanyProfile = {
  id: string | number;
  recruiterId: string | number;
  recruiterEmail?: string | null;
  recruiterApplicationId?: string | number | null;
  logoUrl: string;
  coverUrl: string;
  companyFullName: string;
  companyDisplayName: string;
  taxCode: string;
  billingAddress: string;
  companySize: string;
  companyPhone: string;
  companyWebsite?: string | null;
  companyIntro?: string | null;
  addresses: string;
  galleryUrls?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

  updateCategoryOption: (token: string, id: string | number, data: Omit<CategoryOption, "id">) =>
    apiRequest<CategoryOption>(`/api/categories/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteCategoryOption: (token: string, id: string | number) =>
    apiRequest<void>(`/api/categories/${encodeURIComponent(String(id))}`, {
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

  updateRecruiterFormField: (token: string, id: string | number, data: Omit<RecruiterFormField, "id">) =>
    apiRequest<RecruiterFormField>(`/api/recruiter/form-fields/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteRecruiterFormField: (token: string, id: string | number) =>
    apiRequest<void>(`/api/recruiter/form-fields/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),
};

export const recruiterApi = {
  getCompanyProfile: (token: string) =>
    apiRequest<CompanyProfile>("/api/recruiter/company", {
      headers: authHeaders(token),
    }),

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

  getApplication: (token: string, id: string | number) =>
    apiRequest<RecruiterApplication>(`/api/recruiter/applications/${encodeURIComponent(String(id))}`, {
      headers: authHeaders(token),
    }),

  reviewApplication: (token: string, id: string | number, approved: boolean, reviewNote?: string) =>
    apiRequest<RecruiterApplication>(`/api/recruiter/applications/${encodeURIComponent(String(id))}/review`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ approved, reviewNote }),
    }),

  revokeApplication: (token: string, id: string | number) =>
    apiRequest<RecruiterApplication>(`/api/recruiter/applications/${encodeURIComponent(String(id))}/revoke`, {
      method: "POST",
      headers: authHeaders(token),
    }),

  restoreApplication: (token: string, id: string | number) =>
    apiRequest<RecruiterApplication>(`/api/recruiter/applications/${encodeURIComponent(String(id))}/restore`, {
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

  updateJob: (token: string, id: string | number, data: RecruiterJobPayload) =>
    apiRequest<RecruiterJobPost>(`/api/recruiter/jobs/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  updateJobHidden: (token: string, id: string | number, hidden: boolean) =>
    apiRequest<RecruiterJobPost>(`/api/recruiter/jobs/${encodeURIComponent(String(id))}/hidden`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ hidden }),
    }),

  listJobChangeLogs: (token: string, id: string | number) =>
    apiRequest<RecruiterJobChangeLog[]>(`/api/recruiter/jobs/${encodeURIComponent(String(id))}/change-logs`, {
      headers: authHeaders(token),
    }),

  deleteJob: (token: string, id: string | number) =>
    apiRequest<void>(`/api/recruiter/jobs/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  // Duyet CV ứng tuyển cho một job cụ thể
  listJobApplications: (token: string, jobId: string | number) =>
    apiRequest<CandidateApplication[]>(`/api/recruiter/jobs/${encodeURIComponent(String(jobId))}/applications`, {
      headers: authHeaders(token),
      params: jobId ? { jobId } : undefined,
    }),

  updateApplicationStatus: (token: string, jobId: string | number, applicationId: string | number, status: CandidateApplication["status"]) =>
    apiRequest<CandidateApplication>(`/api/recruiter/jobs/${encodeURIComponent(String(jobId))}/applications/${encodeURIComponent(String(applicationId))}/status`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    }),
};

export const companyApi = {
  getCompanyProfile: (id: string | number) =>
    apiRequest<CompanyProfile>(`/api/companies/${encodeURIComponent(String(id))}`),

  getCompanyProfileByRecruiter: (recruiterId: string | number) =>
    apiRequest<CompanyProfile>(`/api/companies/recruiter/${encodeURIComponent(String(recruiterId))}`),
};

export type ModeratorJobPost = {
  id: string | number;
  title: string;
  description?: string;
  company?: string;
  location?: string;
  salary?: string;
  currency?: string | null;
  mode?: string | null;
  type?: string;
  experience?: string;
  status?: string;
  hidden: boolean;
  employerName?: string;
  employerEmail?: string;
  recruiterId?: string | number;
  recruiterName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const moderatorApi = {
  listPendingJobs: (token: string) =>
    apiRequest<ModeratorJobPost[]>("/api/moderator/jobs/pending", {
      headers: authHeaders(token),
    }),

  getJobDetail: (token: string, jobId: string | number) =>
    apiRequest<ModeratorJobPost>(`/api/moderator/jobs/${encodeURIComponent(String(jobId))}`, {
      headers: authHeaders(token),
    }),

  approveJob: (token: string, jobId: string | number) =>
    apiRequest<ModeratorJobPost>(`/api/moderator/jobs/${encodeURIComponent(String(jobId))}/approve`, {
      method: "PATCH",
      headers: authHeaders(token),
    }),

  rejectJob: (token: string, jobId: string | number) =>
    apiRequest<ModeratorJobPost>(`/api/moderator/jobs/${encodeURIComponent(String(jobId))}/reject`, {
      method: "PATCH",
      headers: authHeaders(token),
    }),
};

export type PublicJobPost = {
    id: string | number;
    title: string;
    company: string | null;
    employerName: string | null;
    employerEmail: string | null;
    location: string | null;
    type: string | null;
    salary: string | null;
    currency: string | null;
    mode: string | null;
    experience: string | null;
    applicationDeadline: string | null;
    description: string | null;
    status: string;
    hidden: boolean;
    latitude?: number | null;
    longitude?: number | null;
    recruiterId: string | number | null;
    createdAt: string;
    updatedAt: string | null;
    deletedAt: string | null;
};

export const jobApi = {
    listJobs: () =>
        apiRequest<PublicJobPost[]>("/api/jobs", {
            method: "GET",
        }),

    getJobDetail: (id: string | number) =>
        apiRequest<PublicJobPost>(`/api/jobs/${encodeURIComponent(String(id))}`, {
            method: "GET",
        }),
};

export const candidateApi = {
  applyJob: (token: string, jobId: string | number, cvId: string) =>
    apiRequest<void>(`/api/candidates/jobs/${encodeURIComponent(String(jobId))}/apply`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ cvId }), // Chỉ gửi cvId lên như đã thiết kế bảo mật
    }),

  listApplications: (token: string, status?: CandidateApplication["status"]) =>
    apiRequest<CandidateApplication[]>("/api/candidates/applications", {
      headers: authHeaders(token),
      params: { status },
    }),
};
