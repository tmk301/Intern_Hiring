import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { authApi, isApiError } from "@/lib/api";
import { isAdminRole, isModeratorRole, isRecruiterRole, isRestrictedAccount } from "@/lib/roles";
import { defaultManagedSiteConfig, loadLoginHeroConfig, type LoginHeroConfig } from "@/lib/siteConfig";
import { useAuth } from "@/context/AuthContext";
import ResetPasswordDialog from "@/components/ResetPasswordDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

type LoginFormValues = {
  email: string;
  password: string;
};

const Login = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [loginHero, setLoginHero] = useState<LoginHeroConfig>(defaultManagedSiteConfig.loginHero);
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const navigate = useNavigate();
  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/, t("validation.emailInvalid")),
        password: z.string().min(6, t("validation.passwordMin")),
      }),
    [t],
  );

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    if (isAdminRole(user?.role)) {
      navigate("/admin", { replace: true });
      return;
    }

    if (isRecruiterRole(user?.role)) {
      navigate("/recruiter", { replace: true });
      return;
    }

    if (isModeratorRole(user?.role)) {
      navigate("/moderator", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  }, [isAuthLoading, isAuthenticated, navigate, user?.role]);

  useEffect(() => {
    let mounted = true;

    setIsHeroLoading(true);
    loadLoginHeroConfig(i18n.language)
      .then((hero) => {
        if (mounted) setLoginHero(hero);
      })
      .finally(() => {
        if (mounted) setIsHeroLoading(false);
      });

    const handleConfigUpdate = (event: Event) => {
      const config = (event as CustomEvent).detail;
      if (config?.loginHero) setLoginHero(config.loginHero);
    };

    window.addEventListener("managed-site-config-updated", handleConfigUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("managed-site-config-updated", handleConfigUpdate);
    };
  }, [i18n.language]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      let redirectTo = "/";
      const accessToken = data.session?.access_token;

      if (accessToken) {
        const profile = await authApi.getMe(accessToken);

        if (isRestrictedAccount(profile)) {
          await supabase.auth.signOut();
          toast.error(t("auth.restrictedLoginError"));
          return;
        }

        if (isAdminRole(profile.role)) {
          redirectTo = "/admin";
        } else if (isRecruiterRole(profile.role)) {
          redirectTo = "/recruiter";
        }
                else if (isModeratorRole(profile.role)) {
          redirectTo = "/moderator";
        }
      }

      toast.success(t("login.success"));
      navigate(redirectTo);
    } catch (error: unknown) {
      if (isApiError(error) && error.status === 403) {
        await supabase.auth.signOut();
        toast.error(t("auth.restrictedLoginError"));
        return;
      }

      toast.error(error instanceof Error ? error.message : t("auth.systemConnectionError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || isHeroLoading) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-gradient-subtle">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  const loginInputStyle = {
    backgroundColor: loginHero.inputBackgroundColor,
    borderColor: loginHero.inputBorderColor,
    color: loginHero.inputTextColor,
  };
  const loginLabelStyle = { color: loginHero.labelTextColor };

  return (
    <main
      className="min-h-[calc(100dvh-4rem)] bg-gradient-subtle"
      style={{ backgroundColor: loginHero.pageBackgroundColor }}
    >
      <div className="container mx-auto flex min-h-[calc(100dvh-4rem)] items-center justify-center px-3 py-4 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid w-full max-w-5xl overflow-hidden rounded-xl border shadow-strong md:grid-cols-[1fr_0.85fr]"
          style={{ backgroundColor: loginHero.formBackgroundColor }}
        >
          <section
            className="hidden bg-cover bg-center p-8 md:flex md:flex-col md:justify-between"
            style={{
              backgroundColor: loginHero.backgroundColor,
              backgroundImage: loginHero.imageUrl
                ? `linear-gradient(180deg, ${loginHero.backgroundColor}dd, ${loginHero.backgroundColor}f2), url(${loginHero.imageUrl})`
                : undefined,
              color: loginHero.textColor,
            }}
          >
            <div>
              <h1 className="text-3xl font-bold leading-tight">
                {loginHero.title || t("login.heroTitle")}
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 opacity-90">
                {loginHero.description || t("login.heroDescription")}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white/10 p-4">
              <ShieldCheck className="h-6 w-6 text-yellow-300" />
              <p className="text-sm opacity-90">
                {loginHero.securityText || t("login.heroSecurity")}
              </p>
            </div>
          </section>

          <Card className="border-0 shadow-none" style={{ backgroundColor: loginHero.formBackgroundColor }}>
            <CardHeader className="space-y-2 px-6 pb-4 pt-6 sm:px-8">
              <CardTitle
                className="text-2xl font-bold text-foreground"
                style={{ color: loginHero.formTitleTextColor }}
              >
                {loginHero.formTitle || t("login.title")}
              </CardTitle>
              <CardDescription style={{ color: loginHero.formDescriptionTextColor }}>
                {loginHero.formDescription || t("login.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-4 sm:px-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={loginLabelStyle}>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="ten@example.com"
                              className="h-10 pl-10"
                              style={loginInputStyle}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={loginLabelStyle}>{t("login.passwordLabel")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder={t("login.passwordPlaceholder")}
                              className="h-10 pl-10 pr-10"
                              style={loginInputStyle}
                              {...field}
                            />
                            <button
                              type="button"
                              aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                              onClick={() => setShowPassword((current) => !current)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end -mt-1 -mb-2">
                    <button
                      type="button"
                      onClick={() => setIsResetOpen(true)}
                      className="text-sm text-primary hover:underline"
                      style={{ color: loginHero.linkTextColor }}
                    >
                      {t("login.forgotPassword")}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="cta"
                    className="h-10 w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {t("login.submit")}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center border-t bg-secondary/40 px-6 py-4 sm:px-8">
              <p className="text-sm text-muted-foreground" style={{ color: loginHero.footerTextColor }}>
                {t("login.noAccount")}{" "}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:underline"
                  style={{ color: loginHero.linkTextColor }}
                >
                  {t("login.registerNow")}
                </Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
      <ResetPasswordDialog open={isResetOpen} onOpenChange={setIsResetOpen} />

    </main>
  );
};

export default Login;
