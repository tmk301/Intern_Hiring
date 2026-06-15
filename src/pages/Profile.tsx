import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { userApi, CvItem, recruiterApi, CompanyProfile, isApiError } from "@/lib/api";
import { isCandidateRole, isRecruiterRole } from "@/lib/roles";
import { getRoleBadgeClassName, normalizeRoleName } from "@/lib/dashboardStyles";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import {
  ArrowLeft,
  Camera,
  Save,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Lock,
  Loader2,
  CalendarDays,
  Eye,
  EyeOff,
  Pencil,
  FileText,
  Trash2,
  Plus,
  UploadCloud,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

const formatProfileDate = (value?: string | null) => {
  const dateValue = toDateInputValue(value);
  if (!dateValue) return "";

  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;

  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

const formatDobInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const parseProfileDate = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const match = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return `${yearValue}-${monthValue}-${dayValue}`;
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

const rgbToHex = (red: number, green: number, blue: number) =>
  `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;

const getDominantImageColor = (imageUrl: string) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 48;
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("Canvas is not available"));
        return;
      }

      context.drawImage(image, 0, 0, size, size);
      const { data } = context.getImageData(0, 0, size, size);
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;

      for (let index = 0; index < data.length; index += 16) {
        const alpha = data[index + 3];
        if (alpha < 128) continue;
        red += data[index];
        green += data[index + 1];
        blue += data[index + 2];
        count += 1;
      }

      if (!count) {
        reject(new Error("No visible pixels found"));
        return;
      }

      resolve(rgbToHex(Math.round(red / count), Math.round(green / count), Math.round(blue / count)));
    };
    image.onerror = () => reject(new Error("Avatar image could not be loaded"));
    image.src = imageUrl;
  });

const Profile = () => {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const themeColorInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phoneNumber: user?.phoneNumber || "",
    gender: user?.gender || "",
    dob: formatProfileDate(user?.dob),
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoadingCompanyProfile, setIsLoadingCompanyProfile] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(user?.emailNotificationsEnabled ?? false);
  const [isSavingEmailNotifications, setIsSavingEmailNotifications] = useState(false);
  const shouldShowCompanyProfile = isRecruiterRole(user?.role);

  useEffect(() => {
    if (!token || !shouldShowCompanyProfile) {
      setCompanyProfile(null);
      return;
    }

    let mounted = true;
    setIsLoadingCompanyProfile(true);

    recruiterApi.getCompanyProfile(token)
      .then((company) => {
        if (mounted) setCompanyProfile(company);
      })
      .catch((error: unknown) => {
        if (isApiError(error) && (error.status === 400 || error.status === 404)) {
          if (mounted) setCompanyProfile(null);
          return;
        }

        toast({
          title: t("toast.error"),
          description: getErrorMessage(error, t("profile.companyProfileLoadError")),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (mounted) setIsLoadingCompanyProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [shouldShowCompanyProfile, t, toast, token]);

  useEffect(() => {
    setEmailNotificationsEnabled(user?.emailNotificationsEnabled ?? false);
  }, [user?.emailNotificationsEnabled, user?.id]);

  if (!user || !token) {
    navigate("/login");
    return null;
  }

  const profileThemeColor = user.themeColor || "#2563eb";

  const togglePasswordVisibility = (field: keyof typeof visiblePasswords) => {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleResumeClick = () => {
    resumeInputRef.current?.click();
  };

  const MAX_CVS = 3;
  const cvList = user.cvList || [];
  const showCvSection = isCandidateRole(user.role);
  const showCompanyProfileSection = shouldShowCompanyProfile;
  const companyDefaultAddress = getCompanyDefaultAddress(companyProfile?.addresses);

  const uploadResumeFile = async (file: File) => {
    if (!file) return;

    // Kiểm tra giới hạn số lượng CV
    if (cvList.length >= MAX_CVS) {
      toast({ title: t("toast.error"), description: `Bạn chỉ được lưu tối đa ${MAX_CVS} CV`, variant: "destructive" });
      return;
    }

    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      toast({ title: t("toast.error"), description: t("profile.resumeTypeError"), variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t("toast.error"), description: t("profile.resumeSizeError"), variant: "destructive" });
      return;
    }

    setIsUploadingResume(true);
    try {
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      if (!supaUser) throw new Error("Not authenticated");

      // Tạo tên file bằng timestamp để không bị ghi đè trên Bucket
      const ext = file.name.split('.').pop();
      const uniqueFileName = `resume_${Date.now()}.${ext}`;
      const filePath = `${supaUser.id}/${uniqueFileName}`;

      // Bỏ { upsert: true } vì tên file đã unique
      const { error: uploadError } = await supabase.storage.from('cv').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('cv').getPublicUrl(filePath);

      // Tạo object CV mới
      const newCv = {
        id: crypto.randomUUID(),
        name: file.name,
        url: publicUrl,
        uploadedAt: Date.now(),
        isDefault: cvList.length === 0,
      };

      // Cập nhật mảng vào Database
      const updatedCvList = [...cvList, newCv];
      await userApi.updateProfile(token, { cvList: updatedCvList });

      await refreshUser();
      toast({ title: t("toast.success"), description: t("profile.resumeUploadSuccess") });
    } catch (err: unknown) {
      console.error('Resume upload failed:', err);
      toast({ title: t("toast.error"), description: getErrorMessage(err, t("profile.resumeUploadError")), variant: "destructive" });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleDeleteCv = async (cvIdToDelete: string) => {
    try {
      const remainingCvList = cvList.filter((cv: CvItem) => cv.id !== cvIdToDelete);
      const hadDefault = cvList.some((cv: CvItem) => cv.id === cvIdToDelete && cv.isDefault);
      const updatedCvList = hadDefault && remainingCvList.length > 0
        ? remainingCvList.map((cv: CvItem, index) => ({ ...cv, isDefault: index === 0 }))
        : remainingCvList;

      // Update DB (Không gọi xóa file trên Supabase để giữ Snapshot cho NTD)
      await userApi.updateProfile(token, { cvList: updatedCvList });
      await refreshUser();

      toast({ title: t("toast.success"), description: "Đã xóa CV khỏi hồ sơ" });
    } catch (err: unknown) {
      toast({ title: t("toast.error"), description: "Lỗi khi xóa CV", variant: "destructive" });
    }
  };

  const handleSetDefaultCv = async (cvId: string) => {
    try {
      const updatedCvList = cvList.map((cv: CvItem) => ({
        ...cv,
        isDefault: cv.id === cvId,
      }));

      await userApi.updateProfile(token, { cvList: updatedCvList });
      await refreshUser();

      toast({ title: t("toast.success"), description: "Đã đặt CV mặc định" });
    } catch (err: unknown) {
      toast({ title: t("toast.error"), description: "Lỗi khi đặt CV mặc định", variant: "destructive" });
    }
  };

  const handleResumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadResumeFile(file);
  };

  const handleResumeDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    uploadResumeFile(file);
  };

  const uploadAvatarBlob = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      if (!supaUser) throw new Error("Not authenticated");

      const filePath = `${supaUser.id}/avatar.jpg`;

      // Upload blob to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache buster
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update backend
      await userApi.updateProfile(token, { avatarUrl });

      await refreshUser();
      setIsCropDialogOpen(false);
      setCropImageSrc("");
      toast({ title: t("toast.success"), description: t("profile.avatarUploadSuccess") });
    } catch (err: unknown) {
      console.error("Avatar upload failed:", err);
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("profile.avatarUploadError")),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({ title: t("toast.error"), description: t("profile.avatarTypeError"), variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("toast.error"), description: t("profile.avatarSizeError"), variant: "destructive" });
      return;
    }

    // Create blob URL and open crop dialog
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageSrc = event.target?.result as string;
      setCropImageSrc(imageSrc);
      setIsCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const normalizedDob = parseProfileDate(formData.dob);
    if (normalizedDob === undefined) {
      toast({
        title: t("toast.error"),
        description: t("profile.dobFormatError"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await userApi.updateProfile(token, {
        ...formData,
        dob: normalizedDob,
      });

      await refreshUser();
      setIsEditing(false);
      toast({ title: t("toast.success"), description: t("profile.profileUpdateSuccess") });
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("profile.profileUpdateError")),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      toast({ title: t("toast.error"), description: t("profile.currentPasswordRequired"), variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: t("toast.error"), description: t("validation.passwordMin"), variant: "destructive" });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: t("toast.error"), description: t("validation.passwordMismatch"), variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      });

      if (verifyError) {
        toast({ title: t("toast.error"), description: t("profile.currentPasswordInvalid"), variant: "destructive" });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: t("toast.success"), description: t("profile.passwordChanged") });
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("profile.passwordChangeError")),
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const saveThemeColor = async (themeColor: string, successMessage = t("profile.themeColorSaved")) => {
    setIsSavingTheme(true);
    try {
      await userApi.updateProfile(token, { themeColor });
      await refreshUser();
      toast({ title: t("toast.success"), description: successMessage });
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("profile.themeColorSaveError")),
        variant: "destructive",
      });
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleThemeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    saveThemeColor(e.target.value);
  };

  const handleEmailNotificationsChange = async (checked: boolean) => {
    const previousValue = emailNotificationsEnabled;
    setEmailNotificationsEnabled(checked);
    setIsSavingEmailNotifications(true);

    try {
      await userApi.updateProfile(token, { emailNotificationsEnabled: checked });
      await refreshUser();
      toast({
        title: t("toast.success"),
        description: t("profile.emailNotificationsSaved", { defaultValue: "Da luu tuy chon thong bao qua email." }),
      });
    } catch (err: unknown) {
      setEmailNotificationsEnabled(previousValue);
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("profile.emailNotificationsSaveError", { defaultValue: "Khong the luu tuy chon thong bao qua email." })),
        variant: "destructive",
      });
    } finally {
      setIsSavingEmailNotifications(false);
    }
  };

  const handleMatchAvatarColor = async () => {
    if (!user.avatarUrl) {
      toast({ title: t("toast.error"), description: t("profile.avatarColorMissing"), variant: "destructive" });
      return;
    }

    setIsSavingTheme(true);
    try {
      const themeColor = await getDominantImageColor(user.avatarUrl);
      await userApi.updateProfile(token, { themeColor });
      await refreshUser();
      toast({ title: t("toast.success"), description: t("profile.avatarColorMatched") });
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("profile.avatarColorMatchError")),
        variant: "destructive",
      });
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <main className="h-[calc(100dvh-4rem)] overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto flex h-full items-start justify-center px-4 py-4">
        <div className="w-full max-w-5xl overflow-hidden">
          <div className="grid grid-rows-[auto_auto] gap-6">
            {/* TOP ROW: back button, avatar, personal info */}
            <div className="grid md:grid-cols-[48px_320px_1fr] gap-6 items-stretch">
              {/* LEFT - small column for back button */}
              <div className="flex items-start">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="text-muted-foreground"
                  aria-label={t("profile.back")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* MIDDLE - avatar card */}
              <div className="flex flex-col gap-4 h-full">
                <Card className="overflow-hidden h-full">
                  <div
                    className="relative h-28 transition-colors duration-300"
                    style={{ background: `linear-gradient(135deg, ${profileThemeColor}cc, ${profileThemeColor})` }}
                  >
                    <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white/95 p-1 shadow">
                      <button
                        type="button"
                        onClick={handleMatchAvatarColor}
                        disabled={isSavingTheme}
                        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors hover:bg-slate-100 disabled:opacity-50"
                        style={{ color: profileThemeColor }}
                        aria-label={t("profile.matchAvatarColor")}
                        title={t("profile.matchAvatarColor")}
                      >
                        {isSavingTheme ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        {t("profile.matchAvatarColorShort")}
                      </button>
                      <button
                        type="button"
                        onClick={() => themeColorInputRef.current?.click()}
                        disabled={isSavingTheme}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100 disabled:opacity-50"
                        style={{ color: profileThemeColor }}
                        aria-label={t("profile.changeThemeColor")}
                        title={profileThemeColor}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      ref={themeColorInputRef}
                      type="color"
                      value={profileThemeColor}
                      onChange={handleThemeColorChange}
                      className="sr-only"
                      aria-label={t("profile.themeColor")}
                    />
                  </div>
                  <div className="relative px-4 pb-4 flex flex-col items-center h-full justify-start">
                    <div className="relative -mt-12 mb-3">
                      <Avatar className="h-24 w-24 border-4 border-white shadow bg-white">
                        <AvatarImage src={user.avatarUrl} alt={user.firstName} />
                        <AvatarFallback className="text-primary text-3xl">
                          {user.firstName?.charAt(0) || <UserIcon className="h-8 w-8" />}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={handleAvatarClick}
                        disabled={isUploading}
                        className="absolute -right-1 bottom-0 flex h-8 w-8 items-center justify-center rounded-full text-white shadow transition-transform hover:scale-110 disabled:opacity-50"
                        style={{ backgroundColor: profileThemeColor }}
                        aria-label={t("profile.changeAvatar")}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </button>

                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </div>

                    <h3 className="text-lg font-bold text-center">
                      {user.lastName} {user.firstName}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">{user.email}</p>
                    <div
                      className={cn(
                        "mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
                        getRoleBadgeClassName(user.role),
                      )}
                    >
                      <Shield className="h-3 w-3" />
                      {t(`role.${normalizeRoleName(user.role)}`, { defaultValue: user.role })}
                    </div>
                  </div>
                </Card>
                {/* CV card moved to bottom row to avoid enlarging top row */}
              </div>

              {/* RIGHT - personal info card */}
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">{t("profile.personal_info")}</CardTitle>
                    {!isEditing ? (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        {t("profile.edit")}
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditing(false);
                            setFormData({
                              firstName: user.firstName || "",
                              lastName: user.lastName || "",
                              phoneNumber: user.phoneNumber || "",
                              gender: user.gender || "",
                              dob: formatProfileDate(user.dob),
                            });
                          }}
                        >
                          {t("profile.cancel")}
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                          {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          {t("profile.save")}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <Separator />
                  <CardContent className="space-y-4 p-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                          <UserIcon className="h-4 w-4" /> {t("profile.last_name")}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            placeholder={t("profile.lastNamePlaceholder")}
                          />
                        ) : (
                          <Input value={user.lastName || t("common.emptyValue")} disabled className="bg-muted/50" />
                        )}
                      </div>

                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                          <UserIcon className="h-4 w-4" /> {t("profile.first_name")}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            placeholder={t("profile.firstNamePlaceholder")}
                          />
                        ) : (
                          <Input value={user.firstName || t("common.emptyValue")} disabled className="bg-muted/50" />
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" /> {t("profile.phone")}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            placeholder={t("profile.phonePlaceholder")}
                          />
                        ) : (
                          <Input value={user.phoneNumber || t("common.emptyValue")} disabled className="bg-muted/50" />
                        )}
                      </div>

                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="h-4 w-4" /> {t("profile.dob")}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: formatDobInput(e.target.value) })}
                            inputMode="numeric"
                            maxLength={10}
                            placeholder={t("profile.dobPlaceholder")}
                          />
                        ) : (
                          <Input
                            value={formatProfileDate(user.dob) || t("common.emptyValue")}
                            disabled
                            className="bg-muted/50"
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">{t("profile.gender_label")}</Label>
                        {isEditing ? (
                          <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                          >
                            <option value="">{t("profile.select")}</option>
                            <option value="MALE">{t("gender.MALE")}</option>
                            <option value="FEMALE">{t("gender.FEMALE")}</option>
                            <option value="OTHER">{t("gender.OTHER")}</option>
                          </select>
                        ) : (
                          <Input 
                            value={user.gender ? t(`gender.${user.gender}`) : t("common.emptyValue")} 
                            disabled 
                            className="bg-muted/50" 
                          />
                        )}
                      </div>

                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" /> {t("profile.email")}
                        </Label>
                        <Input value={user.email} disabled className="bg-muted/50" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3">
                      <div className="min-w-0">
                        <Label htmlFor="email-notifications" className="flex items-center gap-2 font-medium">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {t("profile.emailNotifications", { defaultValue: "Thong bao qua email" })}
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("profile.emailNotificationsDescription", { defaultValue: "Nhan cap nhat quan trong ve tai khoan va ho so qua email." })}
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={emailNotificationsEnabled}
                        disabled={isSavingEmailNotifications}
                        onCheckedChange={handleEmailNotificationsChange}
                        className="h-7 w-12 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-300 [&>span]:h-6 [&>span]:w-6 [&>span]:data-[state=checked]:translate-x-5"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* BOTTOM ROW: CV (when allowed) + password change */}
            <div className="grid md:grid-cols-[48px_320px_1fr] gap-6">
              <div />
              {showCvSection ? (
                <div>
                  <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {t("profile.cv_title")} ({cvList.length}/{MAX_CVS})
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResumeClick}
                        disabled={isUploadingResume || cvList.length >= MAX_CVS}
                      >
                        {isUploadingResume ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Tải lên mới
                      </Button>
                      <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResumeInput} className="hidden" />
                    </CardHeader>
                    <Separator />
                    <CardContent className="p-4 flex-1">
                      {cvList.length === 0 ? (
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleResumeDrop}
                          onClick={handleResumeClick}
                          className="min-h-[120px] h-full flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted/50 bg-muted/10 text-muted-foreground cursor-pointer hover:bg-muted/20 transition-colors text-center p-4"
                        >
                          <UploadCloud className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-sm">{t("profile.drag_drop_cv")}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-[1fr_64px_40px] items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>CV</span>
                            <span className="text-center">Default</span>
                            <span className="sr-only">Xóa</span>
                          </div>
                          {cvList.map((cv: CvItem) => (
                            <div key={cv.id} className="grid grid-cols-[1fr_64px_40px] items-center gap-2 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <a href={cv.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline truncate">
                                    {cv.name}
                                  </a>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(cv.uploadedAt).toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-center">
                                <input
                                  type="radio"
                                  name="defaultCv"
                                  checked={Boolean(cv.isDefault)}
                                  onChange={() => {
                                    if (!cv.isDefault) handleSetDefaultCv(cv.id);
                                  }}
                                  className="h-4 w-4 accent-primary cursor-pointer"
                                  aria-label={`Đặt ${cv.name} làm CV mặc định`}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteCv(cv.id)}
                                title="Xóa CV"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : showCompanyProfileSection ? (
                <div>
                  <Card
                    className="h-full cursor-pointer overflow-hidden transition hover:border-primary/40 hover:shadow-md"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/recruiter-verification")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate("/recruiter-verification");
                      }
                    }}
                  >
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-semibold">
                        {t("profile.companyProfileTitle")}
                      </CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="p-3">
                      {isLoadingCompanyProfile ? (
                        <div className="flex min-h-[110px] items-center justify-center text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : companyProfile ? (
                        <div className="space-y-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
                              {companyProfile.logoUrl ? (
                                <img
                                  src={companyProfile.logoUrl}
                                  alt=""
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {companyProfile.companyDisplayName || companyProfile.companyFullName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {companyProfile.companyFullName}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5 rounded-md bg-slate-50 p-2.5 text-xs">
                            <div className="truncate">
                              <span className="font-semibold text-slate-600">{t("profile.companyTaxCode")}: </span>
                              <span className="text-slate-700">{companyProfile.taxCode}</span>
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-slate-600">{t("profile.companyPhone")}: </span>
                              <span className="text-slate-700">{companyProfile.companyPhone}</span>
                            </div>
                            {companyDefaultAddress && (
                              <div className="truncate">
                                <span className="font-semibold text-slate-600">{t("profile.companyAddress")}: </span>
                                <span className="text-slate-700">{companyDefaultAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-[110px] flex-col items-center justify-center rounded-md border-2 border-dashed border-muted/50 bg-muted/10 p-3 text-center text-muted-foreground transition-colors hover:bg-muted/20">
                          <Building2 className="mb-2 h-7 w-7 opacity-50" />
                          <p className="text-sm">{t("profile.companyProfileEmpty")}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div />
              )}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("profile.change_password")}</CardTitle>
                  </CardHeader>
                  <Separator />
                  <CardContent className="space-y-4 p-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label className="sr-only">{t("profile.current_password")}</Label>
                        <div className="relative">
                          <Input
                            type={visiblePasswords.currentPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            placeholder={t("profile.current_password")}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            aria-label={visiblePasswords.currentPassword ? t("login.hidePassword") : t("login.showPassword")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                            onClick={() => togglePasswordVisibility("currentPassword")}
                          >
                            {visiblePasswords.currentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label className="sr-only">{t("profile.new_password")}</Label>
                        <div className="relative">
                          <Input
                            type={visiblePasswords.newPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder={t("profile.new_password")}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            aria-label={visiblePasswords.newPassword ? t("login.hidePassword") : t("login.showPassword")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                            onClick={() => togglePasswordVisibility("newPassword")}
                          >
                            {visiblePasswords.newPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label className="sr-only">{t("profile.confirm_password")}</Label>
                        <div className="relative">
                          <Input
                            type={visiblePasswords.confirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder={t("profile.confirm_password")}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            aria-label={visiblePasswords.confirmPassword ? t("login.hidePassword") : t("login.showPassword")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                            onClick={() => togglePasswordVisibility("confirmPassword")}
                          >
                            {visiblePasswords.confirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                        {isChangingPassword ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Lock className="mr-2 h-4 w-4" />
                        )}
                        {t("profile.change_password")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Crop Dialog */}
      <AvatarCropDialog
        open={isCropDialogOpen}
        imageSrc={cropImageSrc}
        onCropConfirm={uploadAvatarBlob}
        onCancel={() => {
          setIsCropDialogOpen(false);
          setCropImageSrc("");
        }}
        isLoading={isUploading}
      />
    </main>
  );
};

export default Profile;
