import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Building2, CalendarDays, FileText, Loader2, Mail, Phone, Shield, User as UserIcon } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { adminApi, AdminUser, CompanyProfile, isApiError } from "@/lib/api";
import { isAdminRole, isCandidateRole, isRecruiterRole } from "@/lib/roles";
import { getRoleBadgeClassName, normalizeRoleName } from "@/lib/dashboardStyles";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SanityPageSections } from "@/components/sanity/SanityPageSections";

const getInitials = (user?: AdminUser | null) =>
  `${user?.lastName?.[0] ?? ""}${user?.firstName?.[0] ?? ""}`.trim().toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

const formatProfileDate = (value?: string | null) => {
  if (!value) return "";
  const dateValue = value.slice(0, 10);
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

type StoredCompanyAddress = {
  headOffice?: string;
  province?: string;
  district?: string;
  detail?: string;
  isDefault?: boolean;
};

const parseCompanyAddresses = (value?: string | null): StoredCompanyAddress[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getCompanyDefaultAddress = (value?: string | null) => {
  const addresses = parseCompanyAddresses(value);
  const address = addresses.find((item) => item.isDefault) || addresses[0];
  if (!address) return "";

  return [address.detail, address.district, address.province]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(", ");
};

const AdminUserProfile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loadingCompanyProfile, setLoadingCompanyProfile] = useState(false);

  useEffect(() => {
    if (!token || !userId) return;

    let mounted = true;
    setLoadingProfile(true);
    adminApi.getUser(token, userId)
      .then((data) => {
        if (mounted) setProfile(data);
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, userId]);

  useEffect(() => {
    if (!token || !profile?.id || !isRecruiterRole(profile.role)) {
      setCompanyProfile(null);
      setLoadingCompanyProfile(false);
      return;
    }

    let mounted = true;
    setLoadingCompanyProfile(true);
    adminApi.getUserCompanyProfile(token, profile.id)
      .then((data) => {
        if (mounted) setCompanyProfile(data);
      })
      .catch((error) => {
        if (!mounted) return;
        if (!isApiError(error) || ![400, 404].includes(error.status)) {
          console.error(error);
        }
        setCompanyProfile(null);
      })
      .finally(() => {
        if (mounted) setLoadingCompanyProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [profile?.id, profile?.role, token]);

  const primaryCv = useMemo(() => {
    const cvList = profile?.cvList || [];
    return cvList.find((cv) => cv.isDefault) || cvList[0];
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdminRole(user?.role)) return <Navigate to="/" replace />;

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/admin" replace />;

  const themeColor = profile.themeColor || "#2563eb";
  const companyDefaultAddress = getCompanyDefaultAddress(companyProfile?.addresses) || companyProfile?.billingAddress || "";
  const showCvCard = isCandidateRole(profile.role);
  const showCompanyProfileCard = isRecruiterRole(profile.role);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SanityPageSections routePath="/admin/users/:userId" placement="top" />
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
        <SanityPageSections routePath="/admin/users/:userId" placement="afterHero" />

        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <Card className="overflow-hidden">
            <div className="h-28" style={{ background: `linear-gradient(135deg, ${themeColor}cc, ${themeColor})` }} />
            <CardContent className="relative flex flex-col items-center px-4 pb-6">
              <Avatar className="-mt-12 mb-3 h-24 w-24 border-4 border-white shadow">
                <AvatarImage src={profile.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">{getInitials(profile)}</AvatarFallback>
              </Avatar>
              <h2 className="text-center text-xl font-bold">
                {profile.lastName} {profile.firstName}
              </h2>
              <p className="text-center text-sm text-muted-foreground">{profile.email}</p>
              <Badge
                variant="outline"
                className={cn("mt-3 gap-1 rounded-full px-3 py-1 text-xs font-semibold", getRoleBadgeClassName(profile.role))}
              >
                <Shield className="h-3 w-3" />
                {t(`role.${normalizeRoleName(profile.role)}`, { defaultValue: profile.role })}
              </Badge>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.personal_info")}</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-4 w-4" /> {t("profile.last_name")}
                  </Label>
                  <Input value={profile.lastName || t("common.emptyValue")} disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-4 w-4" /> {t("profile.first_name")}
                  </Label>
                  <Input value={profile.firstName || t("common.emptyValue")} disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {t("profile.phone")}
                  </Label>
                  <Input value={profile.phoneNumber || t("common.emptyValue")} disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" /> {t("profile.dob")}
                  </Label>
                  <Input value={formatProfileDate(profile.dob) || t("common.emptyValue")} disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-muted-foreground">{t("profile.gender_label")}</Label>
                  <Input value={profile.gender ? t(`gender.${profile.gender}`) : t("common.emptyValue")} disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> {t("profile.email")}
                  </Label>
                  <Input value={profile.email} disabled className="bg-muted/50" />
                </div>
              </CardContent>
            </Card>

            {showCvCard ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("admin.userDialog.cv")}
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="p-4">
                  {primaryCv ? (
                    <a href={primaryCv.url} target="_blank" rel="noreferrer" className="text-primary underline">
                      {primaryCv.name}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">{t("common.emptyValue")}</span>
                  )}
                </CardContent>
              </Card>
            ) : showCompanyProfileCard ? (
              <Card
                className={cn(companyProfile && "cursor-pointer transition hover:border-primary/40 hover:shadow-md")}
                role={companyProfile ? "button" : undefined}
                tabIndex={companyProfile ? 0 : undefined}
                onClick={() => {
                  if (companyProfile?.id) navigate(`/companies/${companyProfile.id}`);
                }}
                onKeyDown={(event) => {
                  if (companyProfile?.id && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    navigate(`/companies/${companyProfile.id}`);
                  }
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {t("profile.companyProfileTitle")}
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="p-4">
                  {loadingCompanyProfile ? (
                    <div className="flex min-h-[120px] items-center justify-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : companyProfile ? (
                    <div className="space-y-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
                          {companyProfile.logoUrl ? (
                            <img src={companyProfile.logoUrl} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-950">
                            {companyProfile.companyDisplayName || companyProfile.companyFullName}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">{companyProfile.companyFullName}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 rounded-md bg-slate-50 p-3 text-sm">
                        <div>
                          <span className="font-semibold text-slate-600">{t("profile.companyTaxCode")}: </span>
                          <span className="text-slate-700">{companyProfile.taxCode}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600">{t("profile.companyPhone")}: </span>
                          <span className="text-slate-700">{companyProfile.companyPhone}</span>
                        </div>
                        {companyDefaultAddress && (
                          <div>
                            <span className="font-semibold text-slate-600">{t("profile.companyAddress")}: </span>
                            <span className="text-slate-700">{companyDefaultAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t("profile.companyProfileEmpty")}</span>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
      <SanityPageSections routePath="/admin/users/:userId" placement="bottom" />
    </main>
  );
};

export default AdminUserProfile;
