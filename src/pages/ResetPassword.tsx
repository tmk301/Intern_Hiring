import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResetPasswordPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [sessionActive, setSessionActive] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useTranslation();

    useEffect(() => {
        let recoveredSession = false;

        // Check for Supabase error query params (e.g. otp_expired, access_denied)
        const searchParams = new URLSearchParams(window.location.search);
        const errorCode = searchParams.get("error_code");
        const errorDescription = searchParams.get("error_description");

        if (errorCode || searchParams.get("error")) {
            const messages: Record<string, string> = {
                otp_expired: t("resetPasswordPage.expired"),
                access_denied: t("resetPasswordPage.accessDenied"),
            };
            setSessionActive(false);
            setErrorMsg(messages[errorCode ?? ""] ?? errorDescription?.replace(/\+/g, " ") ?? t("resetPasswordPage.invalidLink"));
            setLoading(false);
            return;
        }

        // Supabase JS v2 auto-consumes hash tokens on init.
        // Listen for PASSWORD_RECOVERY event which fires after token exchange.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" && session) {
                recoveredSession = true;
                setSessionActive(true);
                setLoading(false);
            }
        });

        // Also check if session already exists (user may have landed with tokens already processed)
        const checkExisting = async () => {
            // Small delay to let Supabase process the hash tokens
            await new Promise((r) => setTimeout(r, 1500));
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                recoveredSession = true;
                setSessionActive(true);
            } else if (!recoveredSession) {
                setErrorMsg(t("resetPasswordPage.missingSession"));
            }
            setLoading(false);
        };
        checkExisting();

        return () => subscription.unsubscribe();
    }, [t]);

    const handleSubmit = async () => {
        if (password.length < 6) {
            toast({ title: t("toast.error"), description: t("validation.passwordMin"), variant: "destructive" });
            return;
        }
        if (password !== confirmPassword) {
            toast({ title: t("toast.error"), description: t("validation.passwordMismatch"), variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast({ title: t("toast.success"), description: t("resetPasswordPage.updateSuccess") });
            // After resetting password, redirect to login
            navigate("/login");
        } catch (err: unknown) {
            console.error("Update password error:", err);
            toast({
                title: t("toast.error"),
                description: err instanceof Error ? err.message : t("resetPasswordPage.updateError"),
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="h-[calc(100dvh-4rem)] overflow-hidden bg-gradient-subtle">
            <div className="container mx-auto flex h-full items-center justify-center px-4 py-4">
                <Card className="w-full max-w-lg">
                    <CardHeader className="px-6 pt-6 pb-2">
                        <CardTitle>{t("resetPasswordPage.title")}</CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : errorMsg ? (
                            <div className="space-y-4">
                                <p className="text-sm text-destructive">{errorMsg}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => navigate("/login")}>
                                        {t("resetPasswordPage.backToLogin")}
                                    </Button>
                                    <Button onClick={() => navigate("/login")}>{t("resetPasswordPage.resendRequest")}</Button>
                                </div>
                            </div>
                        ) : sessionActive ? (
                            <div className="space-y-4">
                                <div>
                                    <Label>{t("resetPasswordPage.newPassword")}</Label>
                                    <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("resetPasswordPage.newPassword")} className="mt-2" />
                                </div>
                                <div>
                                    <Label>{t("resetPasswordPage.confirmPassword")}</Label>
                                    <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("resetPasswordPage.confirmPassword")} className="mt-2" />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleSubmit} disabled={submitting}>
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("resetPasswordPage.submit")}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p>{t("resetPasswordPage.noValidSession")}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
};

export default ResetPasswordPage;
