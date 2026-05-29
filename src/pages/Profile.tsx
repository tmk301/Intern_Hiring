import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { userApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  const profileThemeColor = user.themeColor || "#2563eb";

  if (!user || !token) {
    navigate("/login");
    return null;
  }

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

  const uploadResumeFile = async (file: File) => {
    if (!file) return;
    // accept pdf/doc/docx
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

      const ext = file.name.split('.').pop();
      const filePath = `${supaUser.id}/resume.${ext}`;

      const { error: uploadError } = await supabase.storage.from('cv').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('cv').getPublicUrl(filePath);
      const cvUrl = `${publicUrl}?t=${Date.now()}`;

      await userApi.updateProfile(token, { cvUrl });
      await refreshUser();
      toast({ title: t("toast.success"), description: t("profile.resumeUploadSuccess") });
    } catch (err: unknown) {
      console.error('Resume upload failed:', err);
      toast({ title: t("toast.error"), description: getErrorMessage(err, t("profile.resumeUploadError")), variant: "destructive" });
    } finally {
      setIsUploadingResume(false);
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

  const handleThemeColorChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const themeColor = e.target.value;

    setIsSavingTheme(true);
    try {
      await userApi.updateProfile(token, { themeColor });
      await refreshUser();
      toast({ title: t("toast.success"), description: t("profile.themeColorSaved") });
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
                    <button
                      type="button"
                      onClick={() => themeColorInputRef.current?.click()}
                      disabled={isSavingTheme}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/80 bg-white/95 shadow transition-transform hover:scale-110 disabled:opacity-50"
                      style={{ color: profileThemeColor }}
                      aria-label={t("profile.changeThemeColor")}
                      title={profileThemeColor}
                    >
                      {isSavingTheme ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    </button>
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
                      className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: profileThemeColor }}
                    >
                      <Shield className="h-3 w-3" />
                      {user.role}
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
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* BOTTOM ROW: password change (aligned to right column) */}
            <div className="grid md:grid-cols-[48px_320px_1fr] gap-6">
              <div />
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("profile.cv_title")}</CardTitle>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-4">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleResumeDrop}
                      onClick={handleResumeClick}
                      className="min-h-[80px] flex items-center justify-center rounded-md border border-dashed border-muted/50 bg-muted/5 px-3 py-6 text-sm text-muted-foreground cursor-pointer text-center"
                    >
                      {isUploadingResume ? (
                        <div>{t("profile.uploading")}</div>
                      ) : user?.cvUrl ? (
                        <a href={user.cvUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                          {t("profile.view_cv")}
                        </a>
                      ) : (
                        <div>{t("profile.drag_drop_cv")}</div>
                      )}
                    </div>
                    <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResumeInput} className="hidden" />
                  </CardContent>
                </Card>
              </div>
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
