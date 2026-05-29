import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import {
  Briefcase,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  PlusCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { isRecruiterRole } from "@/lib/roles";
import { recruiterApi } from "@/lib/api";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type RecruiterJob = {
  id: string | number;
  company: string | null;
  created_at: string | null;
  deleted_at: string | null;
  description: string | null;
  employer_email: string | null;
  employer_name: string | null;
  location: string | null;
  salary: string | null;
  status: string | null;
  title: string | null;
  type: string | null;
  updated_at: string | null;
};

type JobFormValue = {
  title: string;
  company: string;
  employerName: string;
  employerEmail: string;
  location: string;
  salary: string;
  type: string;
  description: string;
};

const emptyJobFormValue: JobFormValue = {
  title: "",
  company: "",
  employerName: "",
  employerEmail: "",
  location: "",
  salary: "",
  type: "",
  description: "",
};

const visibleStatus = "ACTIVE";
const hiddenStatus = "HIDDEN";

const jobTypes = ["Internship", "Part-time", "Full-time"];

const normalizeStatus = (status?: string | null) => status?.trim().toUpperCase() || visibleStatus;

const isHiddenJob = (job: RecruiterJob) => normalizeStatus(job.status) === hiddenStatus;

const isDeletedJob = (job: RecruiterJob) => {
  const status = normalizeStatus(job.status);
  return Boolean(job.deleted_at || status === "TRASHED" || status === "DELETED");
};

const formatDate = (value?: string | null, locale = "en-US") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
};

const getStatusBadgeClassName = (status?: string | null) => {
  switch (normalizeStatus(status)) {
    case hiddenStatus:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "TRASHED":
    case "DELETED":
      return "border-red-200 bg-red-50 text-red-700";
    case visibleStatus:
    case "APPROVED":
    case "PENDING":
    case "VISIBLE":
    case "PUBLISHED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const RecruiterDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [formValue, setFormValue] = useState<JobFormValue>(emptyJobFormValue);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [jobPendingDelete, setJobPendingDelete] = useState<RecruiterJob | null>(null);

  const recruiterEmail = user?.email ?? "";
  const recruiterName = useMemo(
    () => [user?.lastName, user?.firstName].filter(Boolean).join(" ").trim() || recruiterEmail,
    [recruiterEmail, user?.firstName, user?.lastName],
  );
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const visibleJobs = useMemo(() => jobs.filter((job) => !isHiddenJob(job)), [jobs]);
  const hiddenJobs = useMemo(() => jobs.filter(isHiddenJob), [jobs]);

  const resetForm = useCallback(() => {
    setFormValue({
      ...emptyJobFormValue,
      employerName: recruiterName,
      employerEmail: recruiterEmail,
    });
  }, [recruiterEmail, recruiterName]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const loadJobs = useCallback(async () => {
    if (!recruiterEmail || !token) {
      setJobs([]);
      setLoadingJobs(false);
      return;
    }

    setLoadingJobs(true);
    try {
      const data = await recruiterApi.listJobs(token);
      setJobs((data ?? []).filter((job) => !isDeletedJob(job)));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.loadError"));
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, [recruiterEmail, t, token]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const updateFormValue = (field: keyof JobFormValue, value: string) => {
    setFormValue((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    const requiredFields: Array<keyof JobFormValue> = [
      "title",
      "company",
      "employerName",
      "employerEmail",
      "location",
      "type",
      "description",
    ];

    return requiredFields.every((field) => formValue[field].trim().length > 0);
  };

  const handleCreateJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error(t("recruiter.toast.required"));
      return;
    }

    if (!token) return;

    setSubmitting(true);
    try {
      await recruiterApi.createJob(token, {
        title: formValue.title.trim(),
        company: formValue.company.trim(),
        employerName: formValue.employerName.trim(),
        location: formValue.location.trim(),
        type: formValue.type.trim(),
        salary: formValue.salary.trim() || undefined,
        description: formValue.description.trim(),
      });
      toast.success(t("recruiter.toast.createSuccess"));
      resetForm();
      await loadJobs();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateJobStatus = async (job: RecruiterJob, status: string) => {
    if (!token) return;

    setActionId(job.id);
    try {
      await recruiterApi.updateJobStatus(token, job.id, status);
      toast.success(status === hiddenStatus ? t("recruiter.toast.hideSuccess") : t("recruiter.toast.showSuccess"));
      await loadJobs();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.statusError"));
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobPendingDelete) return;
    if (!token) return;

    setActionId(jobPendingDelete.id);
    try {
      await recruiterApi.deleteJob(token, jobPendingDelete.id);
      toast.success(t("recruiter.toast.deleteSuccess"));
      setJobPendingDelete(null);
      await loadJobs();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("recruiter.toast.deleteError"));
    } finally {
      setActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isRecruiterRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge className="mb-3 bg-primary text-primary-foreground">{t("recruiter.badge")}</Badge>
              <h1 className="text-3xl font-bold text-slate-950">{t("recruiter.title")}</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("recruiter.description")}</p>
            </div>
            <Button type="button" variant="outline" className="w-auto" onClick={loadJobs} disabled={loadingJobs}>
              {loadingJobs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("common.refresh")}
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("recruiter.stats.total")}</CardTitle>
              <Briefcase className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("recruiter.stats.visible")}</CardTitle>
              <Eye className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{visibleJobs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("recruiter.stats.hidden")}</CardTitle>
              <EyeOff className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{hiddenJobs.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PlusCircle className="h-5 w-5 text-primary" />
              {t("recruiter.form.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleCreateJob}>
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="recruiter-job-title">{t("recruiter.form.jobTitle")}</Label>
                <Input
                  id="recruiter-job-title"
                  value={formValue.title}
                  onChange={(event) => updateFormValue("title", event.target.value)}
                  placeholder={t("recruiter.form.jobTitlePlaceholder")}
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-company">{t("recruiter.form.company")}</Label>
                <Input
                  id="recruiter-job-company"
                  value={formValue.company}
                  onChange={(event) => updateFormValue("company", event.target.value)}
                  placeholder={t("recruiter.form.companyPlaceholder")}
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-type">{t("recruiter.form.type")}</Label>
                <Select value={formValue.type} onValueChange={(value) => updateFormValue("type", value)}>
                  <SelectTrigger id="recruiter-job-type" className="h-11 bg-white">
                    <SelectValue placeholder={t("recruiter.form.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`recruiter.types.${type}`, { defaultValue: type })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-employer-name">{t("recruiter.form.employerName")}</Label>
                <Input
                  id="recruiter-employer-name"
                  value={formValue.employerName}
                  onChange={(event) => updateFormValue("employerName", event.target.value)}
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-employer-email">{t("recruiter.form.employerEmail")}</Label>
                <Input
                  id="recruiter-employer-email"
                  value={formValue.employerEmail}
                  readOnly
                  className="h-11 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-location">{t("recruiter.form.location")}</Label>
                <Input
                  id="recruiter-job-location"
                  value={formValue.location}
                  onChange={(event) => updateFormValue("location", event.target.value)}
                  placeholder={t("recruiter.form.locationPlaceholder")}
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recruiter-job-salary">{t("recruiter.form.salary")}</Label>
                <Input
                  id="recruiter-job-salary"
                  value={formValue.salary}
                  onChange={(event) => updateFormValue("salary", event.target.value)}
                  placeholder={t("recruiter.form.salaryPlaceholder")}
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-4">
                <Label htmlFor="recruiter-job-description">{t("recruiter.form.jobDescription")}</Label>
                <Textarea
                  id="recruiter-job-description"
                  value={formValue.description}
                  onChange={(event) => updateFormValue("description", event.target.value)}
                  placeholder={t("recruiter.form.jobDescriptionPlaceholder")}
                  className="min-h-32 bg-white"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-4">
                <Button type="submit" variant="cta" className="w-auto" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  {t("recruiter.form.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5 text-primary" />
              {t("recruiter.jobs.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingJobs ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobs.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("recruiter.jobs.empty")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("recruiter.form.jobTitle")}</TableHead>
                    <TableHead>{t("recruiter.form.company")}</TableHead>
                    <TableHead>{t("recruiter.form.type")}</TableHead>
                    <TableHead>{t("recruiter.jobs.status")}</TableHead>
                    <TableHead>{t("recruiter.jobs.createdAt")}</TableHead>
                    <TableHead className="text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const status = normalizeStatus(job.status);
                    const hidden = isHiddenJob(job);

                    return (
                      <TableRow key={job.id}>
                        <TableCell className="min-w-56 font-medium">{job.title || "-"}</TableCell>
                        <TableCell>{job.company || "-"}</TableCell>
                        <TableCell>{job.type || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeClassName(job.status)}>
                            {t(`recruiter.status.${status}`, { defaultValue: status })}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(job.created_at, dateLocale)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-center gap-2">
                            {hidden ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-auto"
                                disabled={actionId === job.id}
                                onClick={() => updateJobStatus(job, visibleStatus)}
                              >
                                <Eye className="h-4 w-4" />
                                {t("recruiter.jobs.show")}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-auto"
                                disabled={actionId === job.id}
                                onClick={() => updateJobStatus(job, hiddenStatus)}
                              >
                                <EyeOff className="h-4 w-4" />
                                {t("recruiter.jobs.hide")}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="w-auto"
                              disabled={actionId === job.id}
                              onClick={() => setJobPendingDelete(job)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("recruiter.jobs.delete")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <AlertDialog open={Boolean(jobPendingDelete)} onOpenChange={(open) => !open && setJobPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("recruiter.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("recruiter.deleteDialog.description", { title: jobPendingDelete?.title || "-" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === jobPendingDelete?.id}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionId === jobPendingDelete?.id}
              onClick={handleDeleteJob}
            >
              {actionId === jobPendingDelete?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("recruiter.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default RecruiterDashboard;
