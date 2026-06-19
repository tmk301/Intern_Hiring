import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  MapPin,
  Building2,
  Globe,
  Mail,
  Phone,
  FileText,
  Loader2,
  DollarSign,
  ClipboardList,
  GraduationCap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  jobApi,
  companyApi,
  candidateApi,
  type PublicJobPost,
  type CompanyProfile
} from "@/lib/api";
import {
  JOB_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
  CURRENCY_OPTIONS,
  defaultJobFilterOptions,
  getSalaryRangeOption
} from "@/components/jobs/jobFilterConfig";
import { FavoriteJobButton } from "@/components/jobs/FavoriteJobButton";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDateOnly = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(locale);
};

const JobDetail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [job, setJob] = useState<PublicJobPost | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for CV selection dialog
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";

  useEffect(() => {
    if (!jobId) return;

    let mounted = true;
    const fetchJobAndCompany = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const jobData = await jobApi.getJobDetail(jobId);
        if (!mounted) return;
        setJob(jobData);

        // Fetch company profile by recruiterId if available
        if (jobData.recruiterId) {
          try {
            const companyData = await companyApi.getCompanyProfileByRecruiter(jobData.recruiterId);
            if (mounted) {
              setCompany(companyData);
            }
          } catch {
            // Recruiter might not have created a company profile yet, catch silently
            console.log("No company profile found for this recruiter");
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          setErrorMsg(getErrorMessage(err, t("jobs.page.loadError")));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchJobAndCompany();
    return () => {
      mounted = false;
    };
  }, [jobId, t]);

  useEffect(() => {
    if (!jobId || !token || user?.role !== "CANDIDATE") {
      setIsFavorited(false);
      return;
    }

    let mounted = true;
    candidateApi.listFavoriteJobs(token)
      .then((favoriteJobs) => {
        if (mounted) {
          setIsFavorited(favoriteJobs.some((favoriteJob) => String(favoriteJob.id) === String(jobId)));
        }
      })
      .catch(() => {
        if (mounted) setIsFavorited(false);
      });

    return () => {
      mounted = false;
    };
  }, [jobId, token, user?.role]);

  const handleFavoriteChange = (updatedJob: PublicJobPost, nextIsFavorited: boolean) => {
    setJob(updatedJob);
    setIsFavorited(nextIsFavorited);
  };

  const handleOpenApplyModal = () => {
    if (!user || !token) {
      toast({ description: t("jobs.apply.loginRequired", { defaultValue: "Vui lòng đăng nhập để nộp đơn" }), variant: "default" });
      navigate("/login");
      return;
    }
    if (user.role !== "CANDIDATE") {
      toast({ description: t("jobs.apply.candidateOnly", { defaultValue: "Chỉ tài khoản Ứng viên mới có thể nộp đơn" }), variant: "destructive" });
      return;
    }
    const defaultCv = user.cvList?.find((cv) => cv.isDefault) ?? user.cvList?.[0];
    setSelectedCvId(defaultCv?.id ?? "");
    setIsApplyOpen(true);
  };

  const submitApplication = async () => {
    if (!job || !selectedCvId || !token) return;

    setIsApplying(true);
    try {
      await candidateApi.applyJob(token, job.id, selectedCvId);
      toast({ title: t("toast.success"), description: t("jobs.apply.success", { defaultValue: "Đã nộp CV thành công cho công việc này." }) });
      setIsApplyOpen(false);
      setSelectedCvId("");
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("jobs.apply.error", { defaultValue: "Bạn đã nộp đơn cho công việc này rồi hoặc có lỗi xảy ra." })),
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMsg || !job) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Card className="mx-auto max-w-md p-6">
          <h2 className="text-xl font-bold text-destructive mb-4">{t("toast.error")}</h2>
          <p className="text-slate-600 mb-6">{errorMsg || t("jobs.page.emptyTitle")}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
        </Card>
      </div>
    );
  }

  const jobTypeLabel = job.type
    ? JOB_TYPE_OPTIONS.find((o) => o.value === job.type)?.labelKey
      ? t(JOB_TYPE_OPTIONS.find((o) => o.value === job.type)!.labelKey!)
      : job.type
    : "-";

  const salaryLabel = job.salary
    ? `${getSalaryRangeOption(job.salary)?.labelKey ? t(getSalaryRangeOption(job.salary)!.labelKey!) : job.salary} ${
        job.currency
          ? CURRENCY_OPTIONS.find((o) => o.value === job.currency)?.labelKey
            ? t(CURRENCY_OPTIONS.find((o) => o.value === job.currency)!.labelKey!)
            : job.currency
          : ""
      }`
    : "-";

  const workModeLabel = job.mode
    ? WORK_MODE_OPTIONS.find((o) => o.value === job.mode)?.labelKey
      ? t(WORK_MODE_OPTIONS.find((o) => o.value === job.mode)!.labelKey!)
      : job.mode
    : "-";

  const expLabel = job.experience
    ? defaultJobFilterOptions.experience.find((o) => o.value === job.experience)?.labelKey
      ? t(defaultJobFilterOptions.experience.find((o) => o.value === job.experience)!.labelKey!)
      : job.experience
    : "-";

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      {/* Top Banner and Header */}
      <section className="hero-gradient text-white py-8 shadow-sm">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80 hover:bg-white/10 mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
                {job.title}
              </h1>
              <p className="text-lg font-medium text-blue-100/90">
                {company?.companyDisplayName || job.company || job.employerName || "-"}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {job.type && <Badge className="bg-white/20 text-white hover:bg-white/35 border-none shadow-sm">{jobTypeLabel}</Badge>}
                {job.mode && <Badge className="bg-white/20 text-white hover:bg-white/35 border-none shadow-sm">{workModeLabel}</Badge>}
                {job.experience && (
                  <Badge className="bg-white/20 text-white hover:bg-white/35 border-none shadow-sm">
                    <GraduationCap className="mr-1 h-3.5 w-3.5 inline" />
                    {expLabel}
                  </Badge>
                )}
              </div>
            </div>

            {/* Apply Action block for candidates */}
            {(!user || user.role === "CANDIDATE") && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {job && (
                  <FavoriteJobButton
                    jobId={job.id}
                    isFavorited={isFavorited}
                    onFavoriteChange={handleFavoriteChange}
                    className="h-11 w-11 border-white/30 bg-white/95"
                  />
                )}
                <Button
                  size="lg"
                  className="w-full md:w-auto bg-white hover:bg-white/95 text-primary font-bold px-8 shadow-md hover:shadow-lg transition-all"
                  onClick={handleOpenApplyModal}
                >
                  {t("jobs.apply.button", { defaultValue: "Nộp đơn ứng tuyển" })}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid Details */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left Side: Job Detail Content */}
          <div className="space-y-6">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  {t("common.description")}
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="prose max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {job.description || t("jobs.page.emptyDescription")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Sidebar Info & Company Summary */}
          <div className="space-y-6">
            {/* Quick Job Details */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  {t("common.details")}
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="p-5 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-700 block">{t("admin.jobDialog.location")}</span>
                    <span className="text-slate-600">{job.location || "-"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-700 block">{t("common.salary")}</span>
                    <span className="text-slate-600 font-medium">{salaryLabel}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-700 block">{t("jobs.page.applicationDeadline")}</span>
                    <span className="text-slate-600">{formatDateOnly(job.applicationDeadline, dateLocale)}</span>
                  </div>
                </div>

                {job.createdAt && (
                  <div className="flex items-start gap-3">
                    <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-700 block">{t("recruiter.jobs.createdAt")}</span>
                      <span className="text-slate-600">
                        {new Date(job.createdAt).toLocaleDateString(dateLocale)}
                      </span>
                    </div>
                  </div>
                )}

                {(job.employerEmail || job.employerName) && (
                  <>
                    <Separator />
                    <div className="space-y-2 pt-2">
                      <span className="font-semibold text-slate-700 block text-xs uppercase tracking-wider text-slate-500">
                        {t("common.recruiter")}
                      </span>
                      {job.employerName && <div className="text-slate-700 font-medium">{job.employerName}</div>}
                      {job.employerEmail && (
                        <a href={`mailto:${job.employerEmail}`} className="text-primary underline flex items-center gap-1.5 break-all">
                          <Mail className="h-3.5 w-3.5" />
                          {job.employerEmail}
                        </a>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Company Profile Quick Summary */}
            {company && (
              <Card className="border-slate-100 shadow-sm overflow-hidden">
                {company.coverUrl && (
                  <div className="h-24 w-full bg-slate-200">
                    <img src={company.coverUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <CardContent className="p-5 space-y-4 text-sm relative">
                  <div className="flex gap-4 items-start">
                    {company.logoUrl && (
                      <div className="h-16 w-16 -mt-10 bg-white border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center p-1 shadow-sm shrink-0">
                        <img src={company.logoUrl} alt="" className="h-full w-full object-contain" />
                      </div>
                    )}
                    <div className="pt-1">
                      <span className="font-bold text-slate-800 block text-base leading-tight">
                        {company.companyDisplayName || company.companyFullName}
                      </span>
                      <span className="text-slate-500 text-xs">{company.companyFullName}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600">
                        {t("recruiterVerification.fields.companySize")}: {company.companySize || "-"}
                      </span>
                    </div>

                    {company.companyPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600">{company.companyPhone}</span>
                      </div>
                    )}

                    {company.companyWebsite && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                        <a
                          href={company.companyWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline truncate"
                        >
                          {company.companyWebsite}
                        </a>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    {t("profile.companyProfileTitle")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Apply Modal Selection */}
      <Dialog
        open={isApplyOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsApplyOpen(false);
            setSelectedCvId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("jobs.apply.dialogTitle", { defaultValue: "Chọn CV ứng tuyển" })}</DialogTitle>
            <DialogDescription>
              {t("jobs.apply.dialogDescription", { defaultValue: "Vui lòng chọn 1 CV từ hồ sơ của bạn để nộp cho vị trí này." })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {!user?.cvList || user.cvList.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg bg-slate-50">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-slate-900">{t("jobs.apply.noCv", { defaultValue: "Bạn chưa có CV nào" })}</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {t("jobs.apply.noCvDesc", { defaultValue: "Vui lòng tải lên CV trước khi nộp đơn." })}
                </p>
                <Button variant="outline" onClick={() => navigate("/profile")}>
                  {t("jobs.apply.goToProfile", { defaultValue: "Tải lên CV" })}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {user.cvList.map((cv) => (
                  <div
                    key={cv.id}
                    onClick={() => setSelectedCvId(cv.id)}
                    className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedCvId === cv.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        selectedCvId === cv.id ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-sm font-semibold truncate ${selectedCvId === cv.id ? "text-primary" : "text-slate-900"}`}>
                        {cv.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {t("profile.cv_upload_time", { defaultValue: "Ngày tải lên" })}:{" "}
                        {new Date(cv.uploadedAt).toLocaleDateString(dateLocale)}
                        {cv.isDefault && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                            Default
                          </span>
                        )}
                      </p>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedCvId === cv.id ? "border-primary" : "border-slate-300"
                      }`}
                    >
                      {selectedCvId === cv.id && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submitApplication}
              disabled={!selectedCvId || isApplying || !user?.cvList?.length}
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("jobs.apply.submit", { defaultValue: "Gửi hồ sơ" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default JobDetail;
