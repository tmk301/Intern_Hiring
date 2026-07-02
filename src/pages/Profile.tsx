import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { userApi, CvItem, recruiterApi, CompanyProfile, RecruiterApplication, isApiError } from "@/lib/api";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Upload,
  Settings2,
  CheckCircle2,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { SanityPageSections } from "@/components/sanity/SanityPageSections";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useSanityInterfaceText } from "@/lib/sanityInterfaceText";

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
  const { user, token, refreshUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const uiText = useSanityInterfaceText("/profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isCvManagerOpen, setIsCvManagerOpen] = useState(false);
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
  const [isThemeColorDialogOpen, setIsThemeColorDialogOpen] = useState(false);
  const [draftThemeColor, setDraftThemeColor] = useState(user?.themeColor || "#2563eb");
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [pendingCompanyApplication, setPendingCompanyApplication] = useState<RecruiterApplication | undefined>();
  const [isLoadingCompanyProfile, setIsLoadingCompanyProfile] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(user?.emailNotificationsEnabled ?? false);
  const [isSavingEmailNotifications, setIsSavingEmailNotifications] = useState(false);
  const shouldShowCompanyProfile = isRecruiterRole(user?.role);

  const completionData = useMemo(() => {
    if (!user) return { percentage: 0, completedCount: 0, totalCount: 0, items: [] };

    const items = [
      { name: t("profile.last_name"), isComplete: Boolean(user.lastName?.trim()) },
      { name: t("profile.first_name"), isComplete: Boolean(user.firstName?.trim()) },
      { name: t("profile.phone"), isComplete: Boolean(user.phoneNumber?.trim()) },
      { name: t("profile.dob"), isComplete: Boolean(user.dob) },
      { name: t("profile.gender_label"), isComplete: Boolean(user.gender) },
      { name: t("profile.email"), isComplete: Boolean(user.email?.trim()) },
      { name: t("profile.avatar"), isComplete: Boolean(user.avatarUrl?.trim()) },
    ];

    if (isCandidateRole(user.role)) {
      items.push({
        name: t("profile.cv_title"),
        isComplete: Boolean(user.cvList && user.cvList.length > 0)
      });
    } else if (isRecruiterRole(user.role)) {
      items.push({
        name: t("profile.companyProfileTitle"),
        isComplete: Boolean(companyProfile)
      });
    }

    const completedCount = items.filter(item => item.isComplete).length;
    const totalCount = items.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return { percentage, completedCount, totalCount, items };
  }, [user, companyProfile, t]);

  useEffect(() => {
    if (!token || !shouldShowCompanyProfile) {
      setCompanyProfile(null);
      setPendingCompanyApplication(undefined);
      return;
    }

    let mounted = true;
    setIsLoadingCompanyProfile(true);

    Promise.allSettled([
      recruiterApi.getCompanyProfile(token),
      recruiterApi.getPendingApplication(token),
    ])
      .then(([companyResult, pendingResult]) => {
        if (!mounted) return;

        if (companyResult.status === "fulfilled") {
          setCompanyProfile(companyResult.value);
        } else {
          setCompanyProfile(null);
          const error = companyResult.reason as unknown;
          if (!isApiError(error) || (error.status !== 400 && error.status !== 404)) {
            toast({
              title: t("toast.error"),
              description: getErrorMessage(error, t("profile.companyProfileLoadError")),
              variant: "destructive",
            });
          }
        }

        setPendingCompanyApplication(pendingResult.status === "fulfilled" ? pendingResult.value : undefined);
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

  useEffect(() => {
    if (!isThemeColorDialogOpen) {
      setDraftThemeColor(user?.themeColor || "#2563eb");
    }
  }, [isThemeColorDialogOpen, user?.id, user?.themeColor]);

  if (isLoading) {
    return (
      <main className="flex h-[calc(100dvh-4rem)] items-center justify-center bg-gradient-subtle">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!user || !token) {
    navigate("/login");
    return null;
  }

  const profileThemeColor = user.themeColor || "#2563eb";
  const previewThemeColor = isThemeColorDialogOpen ? draftThemeColor : profileThemeColor;

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
  const defaultCv = cvList.find((cv: CvItem) => cv.isDefault) || cvList[0];
  const showCvSection = isCandidateRole(user.role);
  const showCompanyProfileSection = shouldShowCompanyProfile;
  const companyDefaultAddress = getCompanyDefaultAddress(companyProfile?.addresses);

  const uploadResumeFiles = async (files: File[]) => {
    if (files.length === 0) return;

    if (cvList.length + files.length > MAX_CVS) {
      toast({
        title: t("toast.error"),
        description: t("profile.resumeMaxCountError", { count: MAX_CVS }),
        variant: "destructive",
      });
      return;
    }

    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (files.some((file) => !allowed.includes(file.type))) {
      toast({ title: t("toast.error"), description: t("profile.resumeTypeError"), variant: "destructive" });
      return;
    }

    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      toast({ title: t("toast.error"), description: t("profile.resumeSizeError"), variant: "destructive" });
      return;
    }

    setIsUploadingResume(true);
    try {
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      if (!supaUser) throw new Error("Not authenticated");

      const uploadedCvList: CvItem[] = [];
      for (const [index, file] of files.entries()) {
        const ext = file.name.split(".").pop();
        const uniqueFileName = `resume_${Date.now()}_${index}_${crypto.randomUUID()}.${ext}`;
        const filePath = `${supaUser.id}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage.from("cv").upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("cv").getPublicUrl(filePath);
        uploadedCvList.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: publicUrl,
          uploadedAt: Date.now(),
          isDefault: cvList.length === 0 && uploadedCvList.length === 0,
        });
      }

      const updatedCvList = [...cvList, ...uploadedCvList];
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

      toast({ title: t("toast.success"), description: t("profile.resumeDeleteSuccess") });
    } catch (err: unknown) {
      toast({ title: t("toast.error"), description: t("profile.resumeDeleteError"), variant: "destructive" });
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

      toast({ title: t("toast.success"), description: t("profile.defaultCvSuccess") });
    } catch (err: unknown) {
      toast({ title: t("toast.error"), description: t("profile.defaultCvError"), variant: "destructive" });
    }
  };

  const handleResumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    uploadResumeFiles(files);
  };

  const handleResumeDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    uploadResumeFiles(Array.from(e.dataTransfer.files || []));
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
      return true;
    } catch (err: unknown) {
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("profile.themeColorSaveError")),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleThemeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftThemeColor(e.target.value);
  };

  const handleThemeColorDialogOpenChange = (open: boolean) => {
    setIsThemeColorDialogOpen(open);
    if (open) {
      setDraftThemeColor(profileThemeColor);
    }
  };

  const handleSaveThemeColor = async () => {
    if (draftThemeColor === profileThemeColor) {
      setIsThemeColorDialogOpen(false);
      return;
    }

    const saved = await saveThemeColor(draftThemeColor);
    if (saved) {
      setIsThemeColorDialogOpen(false);
    }
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
        description: t("profile.emailNotificationsSaved"),
      });
    } catch (err: unknown) {
      setEmailNotificationsEnabled(previousValue);
      toast({
        title: t("toast.error"),
        description: getErrorMessage(err, t("profile.emailNotificationsSaveError")),
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
      <SanityPageSections routePath="/profile" placement="top" />
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
              <div className="flex flex-col gap-4">
                <Card className="overflow-hidden">
                  <div
                    className="relative h-28 transition-colors duration-300"
                    style={{ background: `linear-gradient(135deg, ${previewThemeColor}cc, ${previewThemeColor})` }}
                  >
                    <div className="absolute right-3 top-3 group flex flex-row-reverse items-center gap-0 overflow-hidden rounded-full bg-white/95 p-1 shadow transition-all duration-300 max-w-[36px] hover:max-w-[160px] hover:gap-2">
                      <button
                        type="button"
                        onClick={() => handleThemeColorDialogOpenChange(true)}
                        disabled={isSavingTheme}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-slate-100 disabled:opacity-50"
                        style={{ color: previewThemeColor }}
                        aria-label={t("profile.changeThemeColor")}
                        title={previewThemeColor}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleMatchAvatarColor}
                        disabled={isSavingTheme}
                        className="flex h-8 items-center gap-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:bg-slate-100 disabled:opacity-50 w-0 opacity-0 scale-90 px-0 overflow-hidden pointer-events-none group-hover:w-[105px] group-hover:opacity-100 group-hover:scale-100 group-hover:px-3 group-hover:pointer-events-auto"
                        style={{ color: previewThemeColor }}
                        aria-label={t("profile.matchAvatarColor")}
                        title={t("profile.matchAvatarColor")}
                      >
                        {isSavingTheme ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        <span className="whitespace-nowrap">{t("profile.matchAvatarColorShort")}</span>
                      </button>
                    </div>
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
                        style={{ backgroundColor: previewThemeColor }}
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

                {/* Profile Completeness Card */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="overflow-hidden cursor-help hover:border-slate-300 hover:shadow-sm transition-all duration-300">
                        <CardContent className="p-4 flex items-center gap-4">
                          {/* Circular progress chart */}
                          <div className="relative flex items-center justify-center shrink-0 w-[90px] h-[90px]">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="45"
                                cy="45"
                                r="38"
                                className="stroke-slate-100 fill-transparent"
                                strokeWidth="6"
                              />
                              <circle
                                cx="45"
                                cy="45"
                                r="38"
                                className={cn(
                                  "fill-transparent transition-all duration-500 ease-out",
                                  completionData.percentage < 50
                                    ? "stroke-red-500"
                                    : completionData.percentage < 80
                                    ? "stroke-amber-500"
                                    : "stroke-emerald-500"
                                )}
                                strokeWidth="6"
                                strokeDasharray={2 * Math.PI * 38}
                                strokeDashoffset={
                                  2 * Math.PI * 38 - (completionData.percentage / 100) * 2 * Math.PI * 38
                                }
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-base font-extrabold text-slate-900">{completionData.percentage}%</span>
                            </div>
                          </div>

                          {/* Info section */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {t("profile.completenessTitle")}
                            </h4>
                            <span
                              className={cn(
                                "inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-full mt-1.5",
                                completionData.percentage < 50
                                  ? "bg-red-500/10 text-red-700"
                                  : completionData.percentage < 80
                                  ? "bg-amber-500/10 text-amber-700"
                                  : "bg-emerald-500/10 text-emerald-700"
                              )}
                            >
                              {completionData.percentage === 100
                                ? t("profile.statusComplete")
                                : t("profile.statusIncomplete")}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="p-3 w-64 bg-white border border-slate-200 shadow-lg rounded-xl text-slate-900 z-50">
                      <p className="font-bold text-xs mb-2 text-slate-950">
                        {t("profile.completenessChecklist")}
                      </p>
                      <div className="space-y-1.5">
                        {completionData.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">{item.name}</span>
                            {item.isComplete ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* CV card moved to bottom row to avoid enlarging top row */}
              </div>

              {/* RIGHT - personal info card */}
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">{uiText("profile.personal_info", t("profile.personal_info"))}</CardTitle>
                    {!isEditing ? (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        {uiText("profile.edit", t("profile.edit"))}
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
                        {uiText("profile.cancel", t("profile.cancel"))}
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                          {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                        {uiText("profile.save", t("profile.save"))}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <Separator />
                  <CardContent className="space-y-4 p-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <UserIcon className="h-4 w-4" /> {uiText("profile.last_name", t("profile.last_name"))}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder={uiText("profile.lastNamePlaceholder", t("profile.lastNamePlaceholder"))}
                          />
                        ) : (
                          <Input value={user.lastName || t("common.emptyValue")} disabled className="bg-muted/50" />
                        )}
                      </div>

                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <UserIcon className="h-4 w-4" /> {uiText("profile.first_name", t("profile.first_name"))}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder={uiText("profile.firstNamePlaceholder", t("profile.firstNamePlaceholder"))}
                          />
                        ) : (
                          <Input value={user.firstName || t("common.emptyValue")} disabled className="bg-muted/50" />
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" /> {uiText("profile.phone", t("profile.phone"))}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder={uiText("profile.phonePlaceholder", t("profile.phonePlaceholder"))}
                          />
                        ) : (
                          <Input value={user.phoneNumber || t("common.emptyValue")} disabled className="bg-muted/50" />
                        )}
                      </div>

                      <div>
                        <Label className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" /> {uiText("profile.dob", t("profile.dob"))}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: formatDobInput(e.target.value) })}
                            inputMode="numeric"
                            maxLength={10}
                        placeholder={uiText("profile.dobPlaceholder", t("profile.dobPlaceholder"))}
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
                    <Label className="mb-2 flex items-center gap-2 text-muted-foreground">{uiText("profile.gender_label", t("profile.gender_label"))}</Label>
                        {isEditing ? (
                          <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                          >
                          <option value="">{uiText("profile.select", t("profile.select"))}</option>
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
                      <Mail className="h-4 w-4" /> {uiText("profile.email", t("profile.email"))}
                        </Label>
                        <Input value={user.email} disabled className="bg-muted/50" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3">
                      <div className="min-w-0">
                        <Label htmlFor="email-notifications" className="flex items-center gap-2 font-medium">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {uiText("profile.emailNotifications", t("profile.emailNotifications"))}
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {uiText("profile.emailNotificationsDescription", t("profile.emailNotificationsDescription"))}
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
            <SanityPageSections routePath="/profile" placement="afterHero" />

            {/* BOTTOM ROW: CV (when allowed) + password change */}
            <div className="grid items-stretch gap-6 md:grid-cols-[48px_320px_1fr]">
              <div />
              {showCvSection ? (
                <Card className="min-w-0 h-full">
                  <CardContent className="flex h-full min-h-[170px] flex-col gap-4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                    {uiText("profile.cv_title", t("profile.cv_title"))} ({cvList.length}/{MAX_CVS})
                        </p>
                      </div>
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-lg"
                                onClick={handleResumeClick}
                                disabled={isUploadingResume || cvList.length >= MAX_CVS}
                                aria-label={t("profile.uploadCv")}
                              >
                                {isUploadingResume ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("profile.uploadCv")}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 rounded-lg"
                                onClick={() => setIsCvManagerOpen(true)}
                                disabled={cvList.length === 0}
                                aria-label={t("profile.manageCv")}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("profile.manageCv")}</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      <input
                        ref={resumeInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        multiple
                        onChange={handleResumeInput}
                        className="hidden"
                      />
                    </div>

                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleResumeDrop}
                      className="flex min-w-0 flex-1 items-center rounded-lg border bg-slate-50/70 p-3"
                    >
                      {defaultCv ? (
                        <div className="flex w-full min-w-0 items-center gap-3 overflow-hidden">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <a
                              href={defaultCv.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block max-w-full truncate text-sm font-semibold text-slate-950 hover:underline"
                              title={defaultCv.name}
                            >
                              {defaultCv.name}
                            </a>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {t("profile.defaultCv")} - {new Date(defaultCv.uploadedAt).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResumeClick}
                          className="flex min-h-[88px] w-full flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/30 text-center text-sm text-muted-foreground transition-colors hover:bg-white"
                        >
                          <Upload className="mb-2 h-5 w-5" />
                          {uiText("profile.drag_drop_cv", t("profile.drag_drop_cv"))}
                        </button>
                      )}
                    </div>
                    </CardContent>
                  </Card>
              ) : showCompanyProfileSection ? (
                <div>
                  <Card
                    className="h-full cursor-pointer overflow-hidden transition hover:border-primary/40 hover:shadow-md"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      navigate(companyProfile?.id ? `/companies/${companyProfile.id}` : "/recruiter-verification");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(companyProfile?.id ? `/companies/${companyProfile.id}` : "/recruiter-verification");
                      }
                    }}
                  >
                    <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-semibold">
                        {uiText("profile.companyProfileTitle", t("profile.companyProfileTitle"))}
                      </CardTitle>
                      {pendingCompanyApplication ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="flex h-8 w-8 items-center justify-center text-amber-500 hover:text-amber-600 transition-colors cursor-help shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-amber-50 border border-amber-200 text-amber-900 p-2.5 text-xs rounded-lg shadow-md">
                              <p className="font-semibold text-amber-950 mb-1">{t("recruiter.companyProfileUpdatePending")}</p>
                              <p className="text-amber-900/90">{t("recruiter.companyProfileUpdatePendingDescription")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/recruiter-verification");
                          }}
                          disabled={isLoadingCompanyProfile}
                          title={t(companyProfile ? "profile.companyProfileEdit" : "profile.companyProfileTitle")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
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
                              <span className="font-semibold text-slate-600">{uiText("profile.companyTaxCode", t("profile.companyTaxCode"))}: </span>
                              <span className="text-slate-700">{companyProfile.taxCode}</span>
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-slate-600">{uiText("profile.companyPhone", t("profile.companyPhone"))}: </span>
                              <span className="text-slate-700">{companyProfile.companyPhone}</span>
                            </div>
                            {companyDefaultAddress && (
                              <div className="truncate">
                              <span className="font-semibold text-slate-600">{uiText("profile.companyAddress", t("profile.companyAddress"))}: </span>
                                <span className="text-slate-700">{companyDefaultAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-[110px] flex-col items-center justify-center rounded-md border-2 border-dashed border-muted/50 bg-muted/10 p-3 text-center text-muted-foreground transition-colors hover:bg-muted/20">
                          <Building2 className="mb-2 h-7 w-7 opacity-50" />
                          <p className="text-sm">{uiText("profile.companyProfileEmpty", t("profile.companyProfileEmpty"))}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div />
              )}
              <div className="min-w-0">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{uiText("profile.change_password", t("profile.change_password"))}</CardTitle>
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
                        placeholder={uiText("profile.current_password", t("profile.current_password"))}
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
                        placeholder={uiText("profile.new_password", t("profile.new_password"))}
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
                        placeholder={uiText("profile.confirm_password", t("profile.confirm_password"))}
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
                      {uiText("profile.change_password", t("profile.change_password"))}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isThemeColorDialogOpen} onOpenChange={handleThemeColorDialogOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader className="min-w-0 pr-6">
            <DialogTitle>{t("profile.changeThemeColor")}</DialogTitle>
            <DialogDescription>{t("profile.themeColorDialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-4">
            <label
              className="relative block h-36 w-full cursor-pointer overflow-hidden rounded-lg border shadow-inner transition-colors duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              style={{ background: `linear-gradient(135deg, ${draftThemeColor}cc, ${draftThemeColor})` }}
            >
              <span className="sr-only">{t("profile.themeColor")}</span>
              <Input
                type="color"
                value={draftThemeColor}
                onChange={handleThemeColorChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label={t("profile.themeColor")}
              />
            </label>
            <div className="min-w-0">
              <Input
                value={draftThemeColor.toUpperCase()}
                readOnly
                className="min-w-0 font-mono"
                aria-label={t("profile.themeColor")}
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleThemeColorDialogOpenChange(false)}
              disabled={isSavingTheme}
              className="sm:flex-1"
            >
              {t("profile.cancel")}
            </Button>
            <Button type="button" onClick={handleSaveThemeColor} disabled={isSavingTheme} className="sm:flex-1">
              {isSavingTheme ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t("profile.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCvManagerOpen} onOpenChange={setIsCvManagerOpen}>
        <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("profile.manageCv")}</DialogTitle>
            <DialogDescription>{t("profile.manageCvDescription", { count: MAX_CVS })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {cvList.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {t("profile.noCv")}
              </div>
            ) : (
              cvList.map((cv: CvItem) => (
                <div
                  key={cv.id}
                  className="grid min-w-0 gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <a
                        href={cv.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block max-w-full truncate text-sm font-semibold text-slate-950 hover:underline"
                        title={cv.name}
                      >
                        {cv.name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cv.uploadedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant={cv.isDefault ? "secondary" : "outline"}
                            className="h-9 w-9"
                            onClick={() => {
                              if (!cv.isDefault) handleSetDefaultCv(cv.id);
                            }}
                            disabled={Boolean(cv.isDefault)}
                            aria-label={cv.isDefault ? t("profile.defaultCv") : t("profile.setDefaultCv")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{cv.isDefault ? t("profile.defaultCv") : t("profile.setDefaultCv")}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteCv(cv.id)}
                            aria-label={t("profile.deleteCv")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("profile.deleteCv")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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
      <SanityPageSections routePath="/profile" placement="bottom" />
    </main>
  );
};

export default Profile;
