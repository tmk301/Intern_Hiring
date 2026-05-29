import React, { useState } from "react";
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

    const resetState = () => {
        setStep("email");
        setEmail("");
        setToken("");
        setPassword("");
        setConfirmPassword("");
        setIsSubmitting(false);
        setIsResending(false);
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
                            <Label>{t("resetPasswordDialog.tokenLabel")}</Label>
                            <InputOTP
                                maxLength={RECOVERY_TOKEN_LENGTH}
                                value={token}
                                onChange={setToken}
                                disabled={isSubmitting}
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
                            <Button onClick={handleVerifyToken} disabled={isSubmitting}>
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
