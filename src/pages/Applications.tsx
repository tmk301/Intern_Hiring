import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Heart,
  Loader2,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { candidateApi, type CandidateApplication, type PublicJobPost } from "@/lib/api";
import {
  getReviewStatusBadgeClassName,
  getReviewStatusTranslationKey,
  getRoleBadgeClassName,
} from "@/lib/dashboardStyles";
import { isCandidateRole, USER_ROLES } from "@/lib/roles";
import { CURRENCY_OPTIONS, defaultJobFilterOptions, getSalaryRangeOption, JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS } from "@/components/jobs/jobFilterConfig";
import { FavoriteJobButton } from "@/components/jobs/FavoriteJobButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { paginateItems } from "@/lib/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));

const ApplicationCard = ({ application }: { application: CandidateApplication }) => {
  const { t } = useTranslation();
  return (
    <article className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-medium">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-light to-accent" />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 transition-smooth group-hover:scale-125" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={getReviewStatusBadgeClassName(application.status)}>
              {t(`recruiter.applications.statuses.${getReviewStatusTranslationKey(application.status)}`)}
            </Badge>
            {application.jobType && <Badge variant="secondary" className="rounded-full px-3 py-1">{JOB_TYPE_OPTIONS.find(o => o.value === application.jobType)?.labelKey ? t(JOB_TYPE_OPTIONS.find(o => o.value === application.jobType)!.labelKey!) : application.jobType}</Badge>}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{application.jobTitle || t("candidateDashboard.jobPosition")}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><BriefcaseBusiness className="h-4 w-4 text-primary" />{application.company || t("candidateDashboard.recruitingCompany")}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {application.location && <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1"><MapPin className="h-4 w-4 text-primary" />{application.location}</span>}
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1"><CalendarDays className="h-4 w-4 text-primary" />{t("candidateDashboard.appliedDate", { date: formatDate(application.appliedAt) })}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary"><a href={application.appliedCvUrl} target="_blank" rel="noreferrer"><FileText className="mr-2 h-4 w-4" />{t("candidateDashboard.sentCv")}</a></Button>
          <Button asChild variant="cta" className="bg-primary text-primary-foreground hover:bg-primary-dark"><Link to={`/jobs?jobId=${application.jobId}`}><ExternalLink className="mr-2 h-4 w-4" />{t("candidateDashboard.viewJob")}</Link></Button>
        </div>
      </div>
    </article>
  );
};

const getOptionLabel = (
  options: Array<{ value: string; labelKey?: string }>,
  value: string | null | undefined,
  translate: (key: string) => string,
) => {
  if (!value) return "";
  const option = options.find((item) => item.value === value);
  return option?.labelKey ? translate(option.labelKey) : value;
};

const FavoriteJobCard = ({
  job,
  onFavoriteChange,
}: {
  job: PublicJobPost;
  onFavoriteChange: (job: PublicJobPost, isFavorited: boolean) => void;
}) => {
  const { t } = useTranslation();
  const jobTypeLabel = getOptionLabel(JOB_TYPE_OPTIONS, job.type, t);
  const workModeLabel = getOptionLabel(WORK_MODE_OPTIONS, job.mode, t);
  const salaryRange = job.salary ? getSalaryRangeOption(job.salary) : undefined;
  const salaryLabel = job.salary
    ? `${salaryRange?.labelKey ? t(salaryRange.labelKey) : job.salary}${
        job.currency ? ` ${getOptionLabel(CURRENCY_OPTIONS, job.currency, t)}` : ""
      }`
    : "";
  const experienceLabel = getOptionLabel(defaultJobFilterOptions.experience, job.experience, t);

  return (
    <article className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-medium">
      <FavoriteJobButton
        jobId={job.id}
        isFavorited
        onFavoriteChange={onFavoriteChange}
        className="absolute right-4 top-4"
      />
      <div className="space-y-4 pr-12">
        <div className="flex flex-wrap gap-2">
          {jobTypeLabel && <Badge variant="outline">{jobTypeLabel}</Badge>}
          {salaryLabel && <Badge variant="outline">{salaryLabel}</Badge>}
          {workModeLabel && <Badge variant="outline">{workModeLabel}</Badge>}
          {experienceLabel && <Badge variant="outline">{experienceLabel}</Badge>}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{job.title || t("jobs.page.untitled")}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <BriefcaseBusiness className="h-4 w-4 text-primary" />
            {job.company || job.employerName || t("jobs.page.notProvided")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
              <MapPin className="h-4 w-4 text-primary" />
              {job.location}
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
            <Heart className="h-4 w-4 text-rose-600" />
            {t("candidateDashboard.favoriteCount", { count: job.favoriteCount ?? 0 })}
          </span>
        </div>
        <Button asChild variant="cta" className="bg-primary text-primary-foreground hover:bg-primary-dark">
          <Link to={`/jobs/${job.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("candidateDashboard.viewJob")}
          </Link>
        </Button>
      </div>
    </article>
  );
};

const EmptyState = ({ type }: { type: "submitted" | "accepted" | "rejected" | "favorites" }) => {
  const { t } = useTranslation();

  const getIcon = () => {
    switch (type) {
      case "accepted":
        return <CheckCircle2 className="h-7 w-7" />;
      case "rejected":
        return <XCircle className="h-7 w-7 text-red-500" />;
      case "favorites":
        return <Heart className="h-7 w-7 text-rose-500" />;
      case "submitted":
      default:
        return <Clock3 className="h-7 w-7" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case "accepted":
        return t("candidateDashboard.emptyAcceptedTitle");
      case "rejected":
        return t("candidateDashboard.emptyRejectedTitle");
      case "favorites":
        return t("candidateDashboard.emptyFavoritesTitle");
      case "submitted":
      default:
        return t("candidateDashboard.emptySubmittedTitle");
    }
  };

  const getDesc = () => {
    switch (type) {
      case "accepted":
        return t("candidateDashboard.emptyAcceptedDesc");
      case "rejected":
        return t("candidateDashboard.emptyRejectedDesc");
      case "favorites":
        return t("candidateDashboard.emptyFavoritesDesc");
      case "submitted":
      default:
        return t("candidateDashboard.emptySubmittedDesc");
    }
  };

  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {getIcon()}
      </div>
      <h2 className="text-xl font-bold text-foreground">
        {getTitle()}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {getDesc()}
      </p>
      {(type === "submitted" || type === "favorites") && (
        <Button asChild variant="cta" className="mt-5 bg-primary text-primary-foreground hover:bg-primary-dark">
          <Link to="/jobs">{t("candidateDashboard.findJobNow")}</Link>
        </Button>
      )}
    </div>
  );
};

const LoadingState = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((item) => (
      <div key={item} className="rounded-xl border bg-card p-5 shadow-soft">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="mb-2 h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

const Applications = () => {
  const { t } = useTranslation();
  const { token, user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"submitted" | "accepted" | "rejected" | "favorites">("submitted");
  
  const [submittedPage, setSubmittedPage] = useState(1);
  const [submittedPageSize, setSubmittedPageSize] = useState(10);
  
  const [acceptedPage, setAcceptedPage] = useState(1);
  const [acceptedPageSize, setAcceptedPageSize] = useState(10);

  const [rejectedPage, setRejectedPage] = useState(1);
  const [rejectedPageSize, setRejectedPageSize] = useState(10);

  const [favoritePage, setFavoritePage] = useState(1);
  const [favoritePageSize, setFavoritePageSize] = useState(10);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["candidate-applications", token],
    queryFn: () => candidateApi.listApplications(token!),
    enabled: Boolean(token),
  });

  const {
    data: favoriteJobs = [],
    isLoading: isFavoritesLoading,
    isError: isFavoritesError,
    refetch: refetchFavorites,
  } = useQuery({
    queryKey: ["candidate-favorite-jobs", token],
    queryFn: () => candidateApi.listFavoriteJobs(token!),
    enabled: Boolean(token),
  });

  const { submittedApplications, acceptedApplications, rejectedApplications } = useMemo(() => {
    const accepted = data.filter((application) => application.status === "ACCEPTED");
    const rejected = data.filter((application) => application.status === "REJECTED");
    const submitted = data.filter((application) => application.status !== "ACCEPTED" && application.status !== "REJECTED");
    return { submittedApplications: submitted, acceptedApplications: accepted, rejectedApplications: rejected };
  }, [data]);

  const paginatedSubmittedApplications = useMemo(
    () => paginateItems(submittedApplications, submittedPage, submittedPageSize),
    [submittedApplications, submittedPage, submittedPageSize],
  );

  const paginatedAcceptedApplications = useMemo(
    () => paginateItems(acceptedApplications, acceptedPage, acceptedPageSize),
    [acceptedApplications, acceptedPage, acceptedPageSize],
  );

  const paginatedRejectedApplications = useMemo(
    () => paginateItems(rejectedApplications, rejectedPage, rejectedPageSize),
    [rejectedApplications, rejectedPage, rejectedPageSize],
  );

  const paginatedFavoriteJobs = useMemo(
    () => paginateItems(favoriteJobs, favoritePage, favoritePageSize),
    [favoriteJobs, favoritePage, favoritePageSize],
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isCandidateRole(user?.role)) return <Navigate to="/" replace />;

  const getListTitle = () => {
    switch (activeTab) {
      case "accepted":
        return t("candidateDashboard.acceptedListTitle");
      case "rejected":
        return t("candidateDashboard.rejectedListTitle");
      case "favorites":
        return t("candidateDashboard.favoritesListTitle");
      case "submitted":
      default:
        return t("candidateDashboard.submittedListTitle");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className={`mb-3 px-5 py-2 text-sm ${getRoleBadgeClassName(USER_ROLES.CANDIDATE)}`}>
                {t("role.CANDIDATE")}
              </Badge>
              <h1 className="text-3xl font-bold text-slate-950">{t("candidateDashboard.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("candidateDashboard.description")}
              </p>
            </div>
            <Button variant="outline" onClick={() => { refetch(); refetchFavorites(); }} disabled={isLoading || isFavoritesLoading}>
              {isLoading || isFavoritesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("common.refresh")}
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8 max-w-6xl">
        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeTab === "submitted" ? "border-primary" : ""}`}
            onClick={() => setActiveTab("submitted")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("candidateDashboard.submitted")}</CardTitle>
              <Clock3 className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{submittedApplications.length}</div>
              <p className="text-xs text-muted-foreground">{t("candidateDashboard.submittedDesc")}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeTab === "accepted" ? "border-primary" : ""}`}
            onClick={() => setActiveTab("accepted")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("candidateDashboard.accepted")}</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{acceptedApplications.length}</div>
              <p className="text-xs text-muted-foreground">{t("candidateDashboard.acceptedDesc")}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeTab === "rejected" ? "border-primary" : ""}`}
            onClick={() => setActiveTab("rejected")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("candidateDashboard.rejected")}</CardTitle>
              <XCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rejectedApplications.length}</div>
              <p className="text-xs text-muted-foreground">{t("candidateDashboard.rejectedDesc")}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${activeTab === "favorites" ? "border-primary" : ""}`}
            onClick={() => setActiveTab("favorites")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("candidateDashboard.favorites")}</CardTitle>
              <Heart className="h-5 w-5 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{favoriteJobs.length}</div>
              <p className="text-xs text-muted-foreground">{t("candidateDashboard.favoritesDesc")}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading || (activeTab === "favorites" && isFavoritesLoading) ? (
          <Card>
            <CardContent className="py-6">
              <LoadingState />
            </CardContent>
          </Card>
        ) : isError || (activeTab === "favorites" && isFavoritesError) ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
            <p className="font-semibold">{t("candidateDashboard.loadError")}</p>
            <Button variant="outline" className="mt-4 border-destructive text-destructive hover:bg-destructive/10" onClick={() => { refetch(); refetchFavorites(); }}>
              {t("candidateDashboard.tryAgain")}
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {getListTitle()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTab === "submitted" && (
                submittedApplications.length ? (
                  <>
                    {paginatedSubmittedApplications.items.map((application) => (
                      <ApplicationCard key={application.id} application={application} />
                    ))}
                    <PaginationControls
                      page={paginatedSubmittedApplications.page}
                      totalPages={paginatedSubmittedApplications.totalPages}
                      onPageChange={setSubmittedPage}
                      pageSize={submittedPageSize}
                      onPageSizeChange={setSubmittedPageSize}
                    />
                  </>
                ) : (
                  <EmptyState type="submitted" />
                )
              )}

              {activeTab === "accepted" && (
                acceptedApplications.length ? (
                  <>
                    {paginatedAcceptedApplications.items.map((application) => (
                      <ApplicationCard key={application.id} application={application} />
                    ))}
                    <PaginationControls
                      page={paginatedAcceptedApplications.page}
                      totalPages={paginatedAcceptedApplications.totalPages}
                      onPageChange={setAcceptedPage}
                      pageSize={acceptedPageSize}
                      onPageSizeChange={setAcceptedPageSize}
                    />
                  </>
                ) : (
                  <EmptyState type="accepted" />
                )
              )}

              {activeTab === "rejected" && (
                rejectedApplications.length ? (
                  <>
                    {paginatedRejectedApplications.items.map((application) => (
                      <ApplicationCard key={application.id} application={application} />
                    ))}
                    <PaginationControls
                      page={paginatedRejectedApplications.page}
                      totalPages={paginatedRejectedApplications.totalPages}
                      onPageChange={setRejectedPage}
                      pageSize={rejectedPageSize}
                      onPageSizeChange={setRejectedPageSize}
                    />
                  </>
                ) : (
                  <EmptyState type="rejected" />
                )
              )}

              {activeTab === "favorites" && (
                favoriteJobs.length ? (
                  <>
                    {paginatedFavoriteJobs.items.map((job) => (
                      <FavoriteJobCard
                        key={job.id}
                        job={job}
                        onFavoriteChange={() => {
                          refetchFavorites();
                        }}
                      />
                    ))}
                    <PaginationControls
                      page={paginatedFavoriteJobs.page}
                      totalPages={paginatedFavoriteJobs.totalPages}
                      onPageChange={setFavoritePage}
                      pageSize={favoritePageSize}
                      onPageSizeChange={setFavoritePageSize}
                    />
                  </>
                ) : (
                  <EmptyState type="favorites" />
                )
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
};

export default Applications;
