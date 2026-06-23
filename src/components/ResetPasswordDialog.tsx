import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { KeyRound, Loader2, RotateCcw } from "lucide-react";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type ResetStep = "email" | "token" | "password";

const RECOVERY_TOKEN_LENGTH = 8;
const OTP_TIMEOUT_SECONDS = 60; // Thiết lập giới hạn 60 giây ở đây

export default function ResetPasswordDialog({ open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState<ResetStep>("email");
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    
    // State để quản lý bộ đếm ngược 60 giây
    const [timeLeft, setTimeLeft] = useState<number>(OTP_TIMEOUT_SECONDS);

    // Xử lý đếm ngược thời gian thực khi đang ở bước nhập Token
    useEffect(() => {
        if (step !== "token" || !open) return;

        const sentTimeStr = localStorage.getItem("otp_sent_timestamp");
        if (!sentTimeStr) return;

        const sentTimestamp = parseInt(sentTimeStr, 10);

        const interval = setInterval(() => {
            const currentTime = Date.now();
            const elapsedSeconds = Math.floor((currentTime - sentTimestamp) / 1000);
            const remaining = OTP_TIMEOUT_SECONDS - elapsedSeconds;

            if (remaining <= 0) {
                setTimeLeft(0);
                clearInterval(interval);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [step, open]);

    const resetState = () => {
        setStep("email");
        setEmail("");
        setToken("");
        setPassword("");
        setConfirmPassword("");
        setIsSubmitting(false);
        setIsResending(false);
        setTimeLeft(OTP_TIMEOUT_SECONDS);
        localStorage.removeItem("otp_sent_timestamp");
    };

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetState();
    };

    const sendRecoveryToken = async (isResend = false) => {
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            toast.error(t("resetPasswordDialog.invalidEmail"));
            return;
        }

        if (isResend) {
            setIsResending(true);
        } else {
            setIsSubmitting(true);
        }

        try {
            const redirectTo = `${window.location.origin}/reset-password`;
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;

            // LƯU THỜI ĐIỂM GỬI MÃ VÀO LOCALSTORAGE
            localStorage.setItem("otp_sent_timestamp", Date.now().toString());
            setTimeLeft(OTP_TIMEOUT_SECONDS); // Reset bộ đếm trên UI về 60

            setToken("");
            setStep("token");
            toast.success(isResend ? t("resetPasswordDialog.tokenResent") : t("resetPasswordDialog.success"));
        } catch (err: unknown) {
            console.error("Reset password error:", err);
            toast.error(err instanceof Error ? err.message : t("resetPasswordDialog.sendError"));
        } finally {
            setIsSubmitting(false);
            setIsResending(false);
        }
    };

    const handleVerifyToken = async () => {
        // KIỂM TRA THỜI GIAN TRƯỚC KHI GỬI XÁC THỰC
        const sentTimeStr = localStorage.getItem("otp_sent_timestamp");
        if (sentTimeStr) {
            const sentTimestamp = parseInt(sentTimeStr, 10);
            const elapsedSeconds = (Date.now() - sentTimestamp) / 1000;

            if (elapsedSeconds > OTP_TIMEOUT_SECONDS) {
                toast.error("Mã OTP đã hết hiệu lực (Quá 60 giây). Vui lòng bấm gửi lại mã!");
                return;
            }
        }

        const normalizedToken = token.trim();
        if (!new RegExp(`^\\d{${RECOVERY_TOKEN_LENGTH}}$`).test(normalizedToken)) {
            toast.error(t("resetPasswordDialog.tokenInvalid"));
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: normalizedToken,
                type: "recovery",
            });

            if (error) throw error;
            if (!data.session) throw new Error(t("resetPasswordDialog.missingSession"));

            // Xác thực thành công thì xóa dấu thời gian đi
            localStorage.removeItem("otp_sent_timestamp");
            setStep("password");
            toast.success(t("resetPasswordDialog.tokenVerified"));
        } catch (err: unknown) {
            console.error("Verify recovery token error:", err);
            toast.error(err instanceof Error ? err.message : t("resetPasswordDialog.verifyError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (password.length < 6) {
            toast.error(t("validation.passwordMin"));
            return;
        }

        if (password !== confirmPassword) {
            toast.error(t("validation.passwordMismatch"));
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            await supabase.auth.signOut();
            toast.success(t("resetPasswordDialog.updateSuccess"));
            handleOpenChange(false);
            navigate("/login");
        } catch (err: unknown) {
            console.error("Update password error:", err);
            toast.error(err instanceof Error ? err.message : t("resetPasswordDialog.updateError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {step === "email" && t("resetPasswordDialog.title")}
                        {step === "token" && t("resetPasswordDialog.verifyTitle")}
                        {step === "password" && t("resetPasswordDialog.newPasswordTitle")}
                    </DialogTitle>
                </DialogHeader>

                {step === "email" && (
                    <div className="py-2">
                        <Label>{t("resetPasswordDialog.emailLabel")}</Label>
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ten@example.com"
                            className="mt-2"
                            disabled={isSubmitting}
                        />
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t("resetPasswordDialog.description")}
                        </p>
                    </div>
                )}

                {step === "token" && (
                    <div className="space-y-4 py-2">
                        <div>
                            <div className="flex justify-between items-center">
                                <Label>{t("resetPasswordDialog.tokenLabel")}</Label>
                                {/* HIỂN THỊ SỐ GIÂY ĐẾM NGƯỢC */}
                                <span className={`text-xs font-bold ${timeLeft === 0 ? "text-red-500" : "text-amber-500"}`}>
                                    {timeLeft > 0 ? `Mã hết hạn sau: ${timeLeft}s` : "Mã đã hết hạn!"}
                                </span>
                            </div>
                            <InputOTP
                                maxLength={RECOVERY_TOKEN_LENGTH}
                                value={token}
                                onChange={setToken}
                                disabled={isSubmitting || timeLeft === 0}
                                containerClassName="mt-3 justify-center"
                            >
                                <InputOTPGroup>
                                    {Array.from({ length: RECOVERY_TOKEN_LENGTH }).map((_, index) => (
                                        <InputOTPSlot key={index} index={index} />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                            <p className="mt-3 text-sm text-muted-foreground">
                                {t("resetPasswordDialog.verifyDescription", { email })}
                            </p>
                        </div>
                    </div>
                )}

                {step === "password" && (
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>{t("resetPasswordDialog.newPassword")}</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t("resetPasswordDialog.newPassword")}
                                className="mt-2"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div>
                            <Label>{t("resetPasswordDialog.confirmPassword")}</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t("resetPasswordDialog.confirmPassword")}
                                className="mt-2"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {step === "email" && (
                        <>
                            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                                {t("common.cancel")}
                            </Button>
                            <Button onClick={() => sendRecoveryToken()} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {t("common.send")}
                            </Button>
                        </>
                    )}

                    {step === "token" && (
                        <>
                            <Button variant="outline" onClick={() => sendRecoveryToken(true)} disabled={isSubmitting || isResending}>
                                {isResending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                )}
                                {t("resetPasswordDialog.resendToken")}
                            </Button>
                            <Button 
                                onClick={handleVerifyToken} 
                                // KHÓA NÚT XÁC NHẬN NẾU THỜI GIAN ĐÃ VỀ 0
                                disabled={isSubmitting || timeLeft === 0}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <KeyRound className="mr-2 h-4 w-4" />
                                )}
                                {t("resetPasswordDialog.verifySubmit")}
                            </Button>
                        </>
                    )}

                    {step === "password" && (
                        <Button onClick={handleUpdatePassword} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("resetPasswordDialog.updateSubmit")}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}