import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleX,
  Clock3,
  Copy,
  CreditCard,
  Crown,
  History,
  Info,
  Loader2,
  LockKeyhole,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerOff,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  purchaseApi,
  isUserMember,
  type SubscriptionPlan,
  type OrderResponse,
  type UserSubscriptionResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { MemberBadge } from "@/components/MemberBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ORDER_HOLD_SECONDS = 15 * 60;

const getOrderExpiryTime = (order: OrderResponse | null) => {
  if (!order) return 0;
  return order.expiresAt
    ? Date.parse(order.expiresAt)
    : Date.parse(order.createdAt) + ORDER_HOLD_SECONDS * 1000;
};

const getOrderRemainingSeconds = (
  order: OrderResponse | null,
  now = Date.now(),
) => {
  const expiresAt = getOrderExpiryTime(order);
  if (!order || order.status !== "PENDING" || !Number.isFinite(expiresAt))
    return 0;
  return Math.max(
    0,
    Math.min(ORDER_HOLD_SECONDS, Math.ceil((expiresAt - now) / 1000)),
  );
};

const buttonClassName =
  "h-auto min-h-12 w-full whitespace-normal rounded-lg border border-transparent bg-primary px-4 py-3 text-sm font-semibold leading-[1.45] text-primary-foreground shadow-none transition-colors duration-200 hover:bg-primary-dark";
const outlineButtonClassName =
  "border-primary/30 bg-background text-primary hover:border-primary hover:bg-primary/5";
const iconTileClassName =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/5 text-primary";
const statusBadgeClassName =
  "inline-flex items-center gap-[5px] whitespace-nowrap rounded-[5px] px-2 py-1 text-[11px] font-semibold [&>svg]:size-3";
const orderStatuses: Record<
  OrderResponse["status"],
  { className: string; icon: LucideIcon }
> = {
  COMPLETED: {
    className: "border border-emerald-200 bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  PENDING: {
    className: "border border-amber-200 bg-amber-100 text-amber-800",
    icon: Clock3,
  },
  EXPIRED: {
    className: "border border-orange-200 bg-orange-100 text-orange-800",
    icon: TimerOff,
  },
  CANCELLED: {
    className: "border border-red-200 bg-red-100 text-red-800",
    icon: Ban,
  },
  FAILED: {
    className: "border border-red-200 bg-red-100 text-red-800",
    icon: CircleX,
  },
};

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    code: "MEMBER_MONTHLY",
    name: "Gói Thành Viên Tháng",
    description: "",
    price: 99000,
    billingCycle: "MONTHLY",
    durationDays: 30,
  },
  {
    id: 2,
    code: "MEMBER_YEARLY",
    name: "Gói Thành Viên Năm",
    description: "",
    price: 990000,
    billingCycle: "YEARLY",
    durationDays: 365,
  },
];

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const PAYMENT_CARD_BRANDS = [
  { name: "Visa", logo: "visa" },
  { name: "Mastercard", logo: "mastercard" },
  { name: "JCB", logo: "jcb" },
  { name: "AMEX", logo: "amex" },
];

const PLAN_BENEFIT_KEYS = [
  "profilePriorityBenefit",
  "jobRecommendationsBenefit",
  "careerResourcesBenefit",
  "prioritySupportBenefit",
  "durationBenefit",
  "renewalBenefit",
  "managementBenefit",
] as const;

const PaymentCardBrands = ({ label }: { label: string }) => (
  <ul
    className="m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0"
    aria-label={label}
  >
    {PAYMENT_CARD_BRANDS.map(({ name, logo }) => (
      <li
        className="flex min-h-11 items-center justify-center gap-[7px] whitespace-nowrap rounded-[7px] border border-border bg-background px-2.5 py-[7px] text-[11px] font-semibold text-slate-600 [&>img]:block [&>img]:h-[26px] [&>img]:w-10 [&>img]:shrink-0 [&>img]:object-contain"
        key={logo}
      >
        <img src={`/payment-cards/${logo}.svg`} alt="" width={40} height={26} />
        <span>{name}</span>
      </li>
    ))}
  </ul>
);

export const Purchase = () => {
  const { user, token, refreshUser, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation(undefined, { keyPrefix: "purchase" });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const returnStatus = searchParams.get("status");
  const verifiedSession = useRef<string | null>(null);
  const initialRequestId = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cancellingOrderCode, setCancellingOrderCode] = useState<string | null>(
    null,
  );
  const [clockTime, setClockTime] = useState(() => Date.now());
  const [activeSubscription, setActiveSubscription] =
    useState<UserSubscriptionResponse | null>(null);
  const [myOrders, setMyOrders] = useState<OrderResponse[]>([]);
  const [step, setStep] = useState<"PLANS" | "CHECKOUT" | "SUCCESS">("PLANS");
  const [paymentTab, setPaymentTab] = useState<"STRIPE" | "QR" | "CARD">(
    "STRIPE",
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    holderName: user
      ? `${user.lastName || ""} ${user.firstName || ""}`.trim().toUpperCase()
      : "",
    expiry: "",
    cvv: "",
  });

  const orderExpiresAt = getOrderExpiryTime(order);
  const orderStatus = order?.status;
  const remainingSeconds = getOrderRemainingSeconds(order, clockTime);
  const isOrderExpired =
    orderStatus === "EXPIRED" ||
    (orderStatus === "PENDING" && remainingSeconds === 0);
  const countdown = `${Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(remainingSeconds % 60).toString().padStart(2, "0")}`;

  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-US" : "vi-VN";
  const hasMember = isUserMember(user);
  const expiry = user?.memberExpireAt || activeSubscription?.endDate;
  const daysRemaining = expiry
    ? Math.max(
        0,
        Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000),
      )
    : null;
  const monthlyPlan = plans.find((plan) => plan.billingCycle === "MONTHLY");
  const selectedPlan = plans.find(
    (plan) => plan.id === (order?.planId ?? selectedPlanId),
  );
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale);
  const planName = (plan: SubscriptionPlan) =>
    t(plan.billingCycle === "YEARLY" ? "yearlyName" : "monthlyName");
  const orderPlanName = (item: OrderResponse) => {
    const plan = plans.find((candidate) => candidate.id === item.planId);
    return plan ? planName(plan) : item.planName;
  };

  const fetchInitialData = useCallback(async () => {
    const requestId = ++initialRequestId.current;
    setLoading(true);
    const [planResult, subscriptionResult, ordersResult] =
      await Promise.allSettled([
        purchaseApi.getPlans(),
        token ? purchaseApi.getMySubscription(token) : Promise.resolve(null),
        token ? purchaseApi.getMyOrders(token) : Promise.resolve([]),
      ]);
    if (requestId !== initialRequestId.current) return;
    const livePlans =
      planResult.status === "fulfilled" && planResult.value?.length
        ? planResult.value
        : null;
    const nextPlans = livePlans ?? FALLBACK_PLANS;
    setPlans(nextPlans);
    setUsingFallback(!livePlans);
    setSelectedPlanId((current) =>
      nextPlans.some((plan) => plan.id === current) ? current : nextPlans[0].id,
    );
    if (subscriptionResult.status === "fulfilled")
      setActiveSubscription(subscriptionResult.value);
    if (ordersResult.status === "fulfilled") setMyOrders(ordersResult.value);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void fetchInitialData();
    return () => {
      initialRequestId.current += 1;
    };
  }, [fetchInitialData]);
  useEffect(() => () => clearTimeout(copyTimeout.current), []);
  useEffect(() => {
    if (step !== "CHECKOUT" || orderStatus !== "PENDING") return;
    let intervalId: number | undefined;
    const updateClock = () => {
      const now = Date.now();
      setClockTime(now);
      if (now >= orderExpiresAt) window.clearInterval(intervalId);
    };
    updateClock();
    if (Date.now() < orderExpiresAt)
      intervalId = window.setInterval(updateClock, 1000);
    window.addEventListener("focus", updateClock);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", updateClock);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, [step, orderStatus, orderExpiresAt]);
  useEffect(() => {
    if (step !== "PLANS") headingRef.current?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => {
    if (sessionId && token && verifiedSession.current !== sessionId) {
      verifiedSession.current = sessionId;
      const verify = async () => {
        setProcessing(true);
        toast.loading(t("verifyingPayment"), { id: "stripe-verify" });
        try {
          const completedOrder = await purchaseApi.verifyStripeSession(
            token,
            sessionId,
          );
          if (completedOrder.status !== "COMPLETED")
            throw new Error(t("verificationError"));
          setOrder(completedOrder);
          setStep("SUCCESS");
          await refreshUser();
          await fetchInitialData();
          toast.success(t("paymentActivated"));
        } catch (error) {
          toast.error(errorMessage(error, t("verificationError")));
        } finally {
          toast.dismiss("stripe-verify");
          setProcessing(false);
          navigate("/purchase", { replace: true });
        }
      };
      void verify();
    } else if (returnStatus === "cancelled") {
      toast.info(t("paymentCancelled"));
      navigate("/purchase", { replace: true });
    }
  }, [
    sessionId,
    returnStatus,
    token,
    refreshUser,
    fetchInitialData,
    navigate,
    t,
  ]);

  const handleStartCheckout = async (planId: number) => {
    if (!isAuthenticated || !token) {
      toast.info(t("loginRequired"));
      navigate("/login");
      return;
    }
    setSelectedPlanId(planId);
    setLoading(true);
    try {
      const newOrder = await purchaseApi.checkout(token, {
        planId,
        paymentMethod:
          paymentTab === "QR" ? "VIETQR_BANK_TRANSFER" : "CREDIT_CARD",
      });
      setOrder(newOrder);
      setStep("CHECKOUT");
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      toast.error(errorMessage(error, t("checkoutError")));
    } finally {
      setLoading(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!token || !order) return;
    if (getOrderRemainingSeconds(order) === 0) {
      setClockTime(Date.now());
      toast.info(t("orderExpiredDescription"));
      return;
    }
    setProcessing(true);
    toast.loading(t("connectingStripe"), { id: "stripe-init" });
    try {
      const response = await purchaseApi.createStripeCheckoutSession(token, {
        planId: order.planId ?? selectedPlanId,
        successUrl: `${window.location.origin}/purchase`,
        cancelUrl: `${window.location.origin}/purchase`,
      });
      if (!response?.checkoutUrl) throw new Error(t("checkoutError"));
      window.location.href = response.checkoutUrl;
    } catch (error) {
      toast.error(errorMessage(error, t("checkoutError")));
      setProcessing(false);
    } finally {
      toast.dismiss("stripe-init");
    }
  };

  const handleResumeOrder = (item: OrderResponse) => {
    setOrder(item);
    setSelectedPlanId(item.planId);
    setPaymentTab(
      item.paymentMethod === "STRIPE"
        ? "STRIPE"
        : item.paymentMethod === "CREDIT_CARD"
          ? "CARD"
          : "QR",
    );
    setStep("CHECKOUT");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleCancelOrder = async (orderCode: string) => {
    if (!token) return;
    setProcessing(true);
    setCancellingOrderCode(orderCode);
    try {
      const cancelledOrder = await purchaseApi.cancelOrder(token, orderCode);
      if (cancelledOrder.status !== "CANCELLED") throw new Error(t("cancelError"));
      if (order?.orderCode === orderCode) {
        setOrder(null);
        setStep("PLANS");
      }
      toast.success(t("orderCancelled"));
      await fetchInitialData();
    } catch (error) {
      toast.error(errorMessage(error, t("cancelError")));
    } finally {
      setProcessing(false);
      setCancellingOrderCode(null);
    }
  };

  const handleBackToPlans = () => {
    setStep("PLANS");
    void fetchInitialData();
  };

  const handleConfirmPayment = async () => {
    if (!token || !order) return;
    if (getOrderRemainingSeconds(order) === 0) {
      setClockTime(Date.now());
      toast.info(t("orderExpiredDescription"));
      return;
    }
    setProcessing(true);
    try {
      const updatedOrder = await purchaseApi.simulatePayment(token, {
        orderCode: order.orderCode,
        success: true,
      });
      if (updatedOrder.status !== "COMPLETED")
        throw new Error(t("paymentError"));
      setOrder(updatedOrder);
      setStep("SUCCESS");
      await refreshUser();
      await fetchInitialData();
      toast.success(t("paymentActivated"));
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      toast.error(errorMessage(error, t("paymentError")));
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(t("copied"));
      clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  };

  const membershipBadge = <MemberBadge size="sm" />;
  const busy = loading || processing;
  const paymentUnavailable = busy || isOrderExpired;
  const steps = ["PLANS", "CHECKOUT", "SUCCESS"] as const;
  const stepIndex = steps.indexOf(step);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background font-sans text-[15px] leading-[1.6] text-foreground [&_:focus-visible]:outline [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-primary [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-50 motion-reduce:[&_*]:!animate-none motion-reduce:[&_*]:!transition-none">
      <div className="mx-auto w-[calc(100%-36px)] max-w-[1120px] max-[374px]:w-[calc(100%-28px)] md:w-[calc(100%-64px)]">
        <header
          className={cn(
            "relative isolate overflow-hidden px-1.5 pb-[30px] pt-[38px] text-center md:px-6 md:pb-[42px] md:pt-[57px] [&>h1]:my-5 [&>h1]:text-[clamp(40px,5vw,62px)] [&>h1]:font-extrabold [&>h1]:leading-[1.16] [&>h1]:tracking-[-0.05em] max-md:[&>h1]:text-[clamp(33px,7.6vw,48px)] [&>h1>span]:relative [&>h1>span]:text-primary [&>h1>span]:after:absolute [&>h1>span]:after:-bottom-2.5 [&>h1>span]:after:left-[calc(50%-32px)] [&>h1>span]:after:h-1 [&>h1>span]:after:w-16 [&>h1>span]:after:rounded-sm [&>h1>span]:after:bg-accent [&>h1>span]:after:content-[''] [&>p]:mx-auto [&>p]:mt-[25px] [&>p]:max-w-[560px] [&>p]:text-pretty [&>p]:text-base [&>p]:leading-[1.7] [&>p]:text-muted-foreground max-md:[&>p]:max-w-[440px] max-md:[&>p]:text-sm",
            step !== "PLANS" &&
              "md:pb-8 md:pt-9 [&>h1]:text-[clamp(34px,4vw,46px)]",
          )}
        >
          <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-primary-dark md:text-xs [&>svg]:size-[19px] [&>svg]:text-yellow-700">
            <Crown
              className="size-5 shrink-0 stroke-[1.8]"
              aria-hidden="true"
            />{" "}
            INTERNHIRING MEMBER
          </span>
          <h1
            className="text-balance font-bold leading-tight tracking-tight"
            ref={headingRef}
            tabIndex={-1}
          >
            {t(
              step === "PLANS"
                ? "heroTitle"
                : step === "CHECKOUT"
                  ? "checkoutTitle"
                  : "successTitle",
            )}
            <br />
            <span>
              {t(
                step === "PLANS"
                  ? "heroHighlight"
                  : step === "CHECKOUT"
                    ? "checkoutHighlight"
                    : "successHighlight",
              )}
            </span>
          </h1>
          <p>
            {t(
              step === "PLANS"
                ? "heroDescription"
                : step === "CHECKOUT"
                  ? "checkoutDescription"
                  : "successDescription",
            )}
          </p>
          {step === "PLANS" && (
            <a
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2.5 text-sm font-semibold text-primary [&>svg]:size-4 [&>svg]:transition-transform [&>svg]:duration-200 hover:[&>svg]:translate-x-1 motion-reduce:hover:[&>svg]:translate-x-0"
              href="#member-plans"
            >
              {t("explorePlans")}
              <ArrowRight
                className="size-5 shrink-0 stroke-[1.8]"
                aria-hidden="true"
              />
            </a>
          )}
          <span
            className="pointer-events-none absolute -z-10 size-[170px] -rotate-[22deg] rounded-[40px] border border-primary/10 after:absolute after:inset-[22px] after:rounded-[28px] after:border after:border-primary/10 after:content-[''] max-md:size-[110px] max-md:opacity-65 -left-[66px] top-[110px] max-md:-left-[90px]"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -z-10 size-[170px] -rotate-[22deg] rounded-[40px] border border-primary/10 after:absolute after:inset-[22px] after:rounded-[28px] after:border after:border-primary/10 after:content-[''] max-md:size-[110px] max-md:opacity-65 -right-[60px] top-[45px] rotate-[24deg] bg-primary/[0.03] max-md:-right-[90px]"
            aria-hidden="true"
          />
        </header>
        <ol
          className="mx-auto mb-8 flex w-full max-w-[660px] list-none items-center justify-between border-y border-border py-4 md:mb-12 md:justify-center md:py-5 [&>li+li]:before:hidden md:[&>li+li]:before:mx-3 md:[&>li+li]:before:block md:[&>li+li]:before:h-px md:[&>li+li]:before:w-[38px] md:[&>li+li]:before:bg-border md:[&>li+li]:before:content-['']"
          aria-label={t("purchaseProgress")}
        >
          {steps.map((item, index) => (
            <li
              key={item}
              data-active={index <= stepIndex}
              className={cn(
                "group/step flex items-center gap-1.5 text-[10px] md:gap-[9px] md:text-[13px] max-[374px]:flex-col max-[374px]:text-[9px]",
                index <= stepIndex
                  ? "font-semibold text-primary"
                  : "text-muted-foreground",
              )}
              aria-current={step === item ? "step" : undefined}
            >
              <span className="inline-flex size-[23px] items-center justify-center rounded-full border border-border text-[9px] font-bold tabular-nums md:size-[27px] md:text-[11px] [&>svg]:size-3.5 group-data-[active=true]/step:border-primary group-data-[active=true]/step:bg-primary group-data-[active=true]/step:text-primary-foreground">
                {index < stepIndex ? (
                  <Check
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                ) : (
                  `0${index + 1}`
                )}
              </span>
              <span>{t(`step${index + 1}`)}</span>
            </li>
          ))}
        </ol>
        {hasMember && step === "PLANS" && (
          <section
            className="mb-9 flex flex-wrap items-center justify-between gap-5 rounded-xl border border-primary/20 border-l-[3px] border-l-primary bg-primary/[0.03] p-5 md:gap-6 md:p-6 [&_h2]:text-base [&_h2]:tracking-[-0.02em] md:[&_h2]:text-lg [&_p]:mt-[5px] [&_p]:text-xs [&_p]:text-slate-600 [&_p]:[overflow-wrap:anywhere]"
            aria-labelledby="current-membership-title"
          >
            <div className="flex min-w-0 items-start gap-3 md:items-center md:gap-[15px]">
              <span className={iconTileClassName}>
                <BadgeCheck
                  className="size-5 shrink-0 stroke-[1.8]"
                  aria-hidden="true"
                />
              </span>
              <div>
                <span className="mb-2 block text-[10px] font-bold leading-normal tracking-[0.13em] text-primary">
                  {t("yourMembership")}
                </span>
                <h2
                  className="text-balance text-[clamp(24px,2.5vw,30px)] font-bold leading-tight tracking-[-0.035em]"
                  id="current-membership-title"
                >
                  {t("membershipActive")}
                </h2>
                <p>{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:gap-6 [&>div]:grid [&>div]:gap-[3px] [&>div]:text-xs [&>div>span]:text-slate-600 [&_strong]:text-[13px]">
              <div>
                <span>{t("currentPlan")}</span>
                <strong>
                  {activeSubscription
                    ? t(
                        activeSubscription.billingCycle === "YEARLY"
                          ? "yearlyName"
                          : "monthlyName",
                      )
                    : "InternHiring Member"}
                </strong>
              </div>
              <div>
                <span>{t("expiresOn")}</span>
                <strong>{expiry ? formatDate(expiry) : t("unlimited")}</strong>
              </div>
              {daysRemaining !== null && (
                <span
                  className={cn(
                    statusBadgeClassName,
                    "bg-emerald-50 text-emerald-700",
                  )}
                >
                  <Clock3
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                  {t("daysRemaining", { count: daysRemaining })}
                </span>
              )}
            </div>
          </section>
        )}
        {step === "PLANS" && (
          <>
            <section
              id="member-plans"
              className="scroll-mt-[90px]"
              aria-labelledby="plans-title"
              aria-busy={loading}
            >
              <div className="mb-5 flex flex-col items-start justify-between gap-2.5 md:mb-[26px] md:flex-row md:items-end md:gap-5 [&>p]:text-[13px] [&>p]:text-muted-foreground md:[&>p]:max-w-[310px] md:[&>p]:text-right md:[&>p]:text-sm">
                <div>
                  <span className="mb-2 block text-[10px] font-bold leading-normal tracking-[0.13em] text-primary">
                    {t("plansEyebrow")}
                  </span>
                  <h2
                    className="text-balance text-[clamp(24px,2.5vw,30px)] font-bold leading-tight tracking-[-0.035em]"
                    id="plans-title"
                  >
                    {t("plansTitle")}
                  </h2>
                </div>
                <p>{t("plansDescription")}</p>
              </div>
              {usingFallback && (
                <div
                  className="mb-5 flex flex-wrap items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-xs leading-[1.65] text-amber-900 md:flex-nowrap [&>svg]:mt-0.5 [&>svg]:size-4 [&>p]:flex-1 [&>button]:inline-flex [&>button]:min-h-11 [&>button]:items-center [&>button]:gap-[5px] [&>button]:whitespace-nowrap [&>button]:font-semibold [&>button]:underline md:[&>button]:min-h-7 [&>button>svg]:size-[13px]"
                  role="status"
                >
                  <Info
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                  <p>{t("fallbackNotice")}</p>
                  <button
                    type="button"
                    onClick={() => void fetchInitialData()}
                    disabled={busy}
                  >
                    <RefreshCw
                      className="size-5 shrink-0 stroke-[1.8]"
                      aria-hidden="true"
                    />
                    {t("retry")}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                {loading && plans.length === 0
                  ? [0, 1].map((index) => (
                      <div
                        key={index}
                        className="flex min-h-[460px] items-center justify-center gap-3 rounded-xl border border-border bg-secondary text-muted-foreground"
                      >
                        <Loader2
                          className="size-5 shrink-0 stroke-[1.8] animate-spin"
                          aria-hidden="true"
                        />
                        <span>{t("loadingPlans")}</span>
                      </div>
                    ))
                  : plans.map((plan) => {
                      const yearly = plan.billingCycle === "YEARLY";
                      const savings =
                        yearly && monthlyPlan
                          ? monthlyPlan.price * 12 - plan.price
                          : 0;
                      const savingsPercent =
                        savings > 0
                          ? Math.round(
                              (savings / (monthlyPlan.price * 12)) * 100,
                            )
                          : 0;
                      const current =
                        hasMember &&
                        activeSubscription?.active &&
                        activeSubscription.planCode === plan.code;
                      return (
                        <article
                          data-yearly={yearly}
                          className={cn(
                            "group/plan flex flex-col rounded-xl border border-border bg-card px-6 pb-[18px] pt-[26px] shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-[3px] hover:shadow-md motion-reduce:hover:translate-y-0 md:px-8 md:pt-[30px] max-[374px]:px-5 [&_h3]:text-[25px] [&_h3]:tracking-[-0.03em]",
                            yearly &&
                              "relative border-primary-dark bg-primary-dark text-primary-foreground before:absolute before:-top-px before:inset-x-7 before:h-[3px] before:rounded-b-[3px] before:bg-accent before:content-['']",
                          )}
                          key={plan.id}
                        >
                          <div className="mb-[21px] flex items-center justify-between gap-4">
                            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/5 text-primary [&>svg]:size-[23px] group-data-[yearly=true]/plan:bg-white/10 group-data-[yearly=true]/plan:text-accent-light">
                              {yearly ? (
                                <Crown
                                  className="size-5 shrink-0 stroke-[1.8]"
                                  aria-hidden="true"
                                />
                              ) : (
                                <CalendarDays
                                  className="size-5 shrink-0 stroke-[1.8]"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground [&>svg]:size-[13px] group-data-[yearly=true]/plan:rounded-[5px] group-data-[yearly=true]/plan:bg-accent-light group-data-[yearly=true]/plan:px-[9px] group-data-[yearly=true]/plan:py-[5px] group-data-[yearly=true]/plan:text-foreground">
                              {yearly ? (
                                <>
                                  <Sparkles
                                    className="size-5 shrink-0 stroke-[1.8]"
                                    aria-hidden="true"
                                  />
                                  {t("recommended")}
                                </>
                              ) : (
                                t("flexibleChoice")
                              )}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-balance font-bold leading-tight tracking-tight">
                              {planName(plan)}
                            </h3>
                            {current && (
                              <span className="inline-flex items-center gap-1 rounded px-[7px] py-[3px] text-[11px] bg-emerald-50 text-emerald-700 [&>svg]:size-3">
                                <Check
                                  className="size-5 shrink-0 stroke-[1.8]"
                                  aria-hidden="true"
                                />
                                {t("current")}
                              </span>
                            )}
                          </div>
                          <p className="mt-[9px] text-sm text-muted-foreground group-data-[yearly=true]/plan:text-blue-100">
                            {t(
                              yearly
                                ? "yearlyDescription"
                                : "monthlyDescription",
                            )}
                          </p>
                          <div className="mt-[25px] flex flex-wrap items-baseline gap-2 tabular-nums [&>strong]:text-[clamp(32px,3.8vw,44px)] [&>strong]:font-extrabold [&>strong]:leading-[1.2] [&>strong]:tracking-[-0.055em] max-md:[&>strong]:text-[40px] max-[374px]:[&>strong]:text-[35px] [&>span]:text-sm [&>span]:text-muted-foreground group-data-[yearly=true]/plan:[&>span]:text-blue-100">
                            <strong>{formatPrice(plan.price)}</strong>
                            <span>/ {t(yearly ? "year" : "month")}</span>
                          </div>
                          <div className="mt-2.5 flex min-h-[30px] flex-wrap items-center gap-2 text-xs text-muted-foreground group-data-[yearly=true]/plan:text-blue-100">
                            {yearly && savings > 0 ? (
                              <>
                                <span className="rounded border border-white/15 bg-white/10 px-[7px] py-[3px] text-[11px] font-semibold text-accent-light">
                                  {t("savePercent", {
                                    percent: savingsPercent,
                                  })}
                                </span>
                                <span>
                                  {t("monthlyEquivalent", {
                                    price: formatPrice(
                                      Math.round(plan.price / 12),
                                    ),
                                  })}
                                </span>
                              </>
                            ) : (
                              <span>
                                {t("onePayment", { count: plan.durationDays })}
                              </span>
                            )}
                          </div>
                          <div className="mb-5 mt-6 h-px bg-border group-data-[yearly=true]/plan:bg-white/20" />
                          <p className="mb-[15px] text-[13px] font-semibold">
                            {t("included")}
                          </p>
                          <ul className="mb-7 grid list-none gap-[13px] p-0 text-sm [&>li]:flex [&>li]:items-start [&>li]:gap-2.5 [&>li>svg]:mt-0.5 [&>li>svg]:size-[17px] [&>li>svg]:text-primary group-data-[yearly=true]/plan:[&>li>svg]:text-accent-light">
                            <li>
                              <CheckCircle2
                                className="size-5 shrink-0 stroke-[1.8]"
                                aria-hidden="true"
                              />
                              <span>
                                {t("badgeBenefit")}{" "}
                                <MemberBadge
                                  size="sm"
                                  className="group-data-[yearly=true]/plan:border-white/25 group-data-[yearly=true]/plan:bg-white/10 group-data-[yearly=true]/plan:text-white group-data-[yearly=true]/plan:[&_svg]:text-accent-light"
                                />
                              </span>
                            </li>
                            {PLAN_BENEFIT_KEYS.map((key) => (
                              <li key={key}>
                                <CheckCircle2
                                  className="size-5 shrink-0 stroke-[1.8]"
                                  aria-hidden="true"
                                />
                                <span>
                                  {t(key, { count: plan.durationDays })}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <Button
                            className={cn(
                              buttonClassName,
                              "mt-auto",
                              yearly
                                ? "bg-accent text-accent-foreground hover:bg-accent-light"
                                : outlineButtonClassName,
                            )}
                            onClick={() => void handleStartCheckout(plan.id)}
                            disabled={busy || usingFallback}
                          >
                            {loading && selectedPlanId === plan.id && (
                              <Loader2
                                className="size-5 shrink-0 stroke-[1.8] animate-spin"
                                aria-hidden="true"
                              />
                            )}
                            {t(
                              hasMember
                                ? "renewPlan"
                                : yearly
                                  ? "chooseYearly"
                                  : "chooseMonthly",
                            )}
                            <ArrowRight
                              className="size-5 shrink-0 stroke-[1.8]"
                              aria-hidden="true"
                            />
                          </Button>
                          <p className="mt-3 min-h-5 text-center text-[11px] text-muted-foreground group-data-[yearly=true]/plan:text-blue-100">
                            {yearly && savings > 0
                              ? t("yearlySaving", {
                                  price: formatPrice(savings),
                                })
                              : t("monthlyFootnote")}
                          </p>
                        </article>
                      );
                    })}
              </div>
              <div className="mt-[25px] flex flex-col items-start justify-center gap-2.5 px-1 text-xs text-muted-foreground md:flex-row md:flex-wrap md:items-center md:gap-x-8 md:gap-y-4 md:px-0 [&>span]:flex [&>span]:items-center [&>span]:gap-[7px] [&_svg]:size-[15px] [&_svg]:text-primary">
                <span>
                  <ShieldCheck
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                  {t("transparentPricing")}
                </span>
                <span>
                  <BadgeCheck
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                  {t("activateAfterPayment")}
                </span>
                <span>
                  <RefreshCw
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                  {t("flexibleRenewal")}
                </span>
              </div>
            </section>
            <section
              className="mt-10 grid grid-cols-1 gap-[26px] rounded-xl border border-border bg-primary/[0.03] p-6 md:mt-16 md:grid-cols-3 md:gap-6 md:p-8 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:gap-8 [&_h2]:text-[25px] lg:[&_h2]:whitespace-pre-line"
              aria-labelledby="benefits-title"
            >
              <div className="md:col-span-3 lg:col-span-1 [&>p]:mt-3 [&>p]:text-[13px] [&>p]:text-slate-600">
                <span className="mb-2 block text-[10px] font-bold leading-normal tracking-[0.13em] text-primary">
                  {t("benefitsEyebrow")}
                </span>
                <h2
                  className="text-balance text-[clamp(24px,2.5vw,30px)] font-bold leading-tight tracking-[-0.035em]"
                  id="benefits-title"
                >
                  {t("benefitsTitle")}
                </h2>
                <p>{t("benefitsDescription")}</p>
              </div>
              <div className="relative pl-[52px] md:pl-0 [&>span]:absolute [&>span]:left-0 [&>span]:top-0 [&>span]:mb-3.5 [&>span]:size-9 [&>span]:rounded-lg [&>span]:border [&>span]:border-border [&>span]:bg-background md:[&>span]:static [&_svg]:size-[18px] [&>h3]:mb-[9px] [&>h3]:text-[15px] [&>h3]:tracking-[-0.02em] [&>p]:text-[13px] [&>p]:leading-7 [&>p]:text-slate-600">
                <span className={iconTileClassName}>
                  <Crown
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="text-balance font-bold leading-tight tracking-tight">
                  {t("benefitBadgeTitle")}
                </h3>
                <p>{t("benefitBadgeDescription")}</p>
              </div>
              <div className="relative pl-[52px] md:pl-0 [&>span]:absolute [&>span]:left-0 [&>span]:top-0 [&>span]:mb-3.5 [&>span]:size-9 [&>span]:rounded-lg [&>span]:border [&>span]:border-border [&>span]:bg-background md:[&>span]:static [&_svg]:size-[18px] [&>h3]:mb-[9px] [&>h3]:text-[15px] [&>h3]:tracking-[-0.02em] [&>p]:text-[13px] [&>p]:leading-7 [&>p]:text-slate-600">
                <span className={iconTileClassName}>
                  <RefreshCw
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="text-balance font-bold leading-tight tracking-tight">
                  {t("benefitRenewalTitle")}
                </h3>
                <p>{t("benefitRenewalDescription")}</p>
              </div>
              <div className="relative pl-[52px] md:pl-0 [&>span]:absolute [&>span]:left-0 [&>span]:top-0 [&>span]:mb-3.5 [&>span]:size-9 [&>span]:rounded-lg [&>span]:border [&>span]:border-border [&>span]:bg-background md:[&>span]:static [&_svg]:size-[18px] [&>h3]:mb-[9px] [&>h3]:text-[15px] [&>h3]:tracking-[-0.02em] [&>p]:text-[13px] [&>p]:leading-7 [&>p]:text-slate-600">
                <span className={iconTileClassName}>
                  <ReceiptText
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="text-balance font-bold leading-tight tracking-tight">
                  {t("benefitManageTitle")}
                </h3>
                <p>{t("benefitManageDescription")}</p>
              </div>
            </section>
            {myOrders.length > 0 && (
              <section
                className="mt-12 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-2.5 [&_h2>svg]:size-[23px] [&_h2>svg]:text-primary"
                aria-labelledby="history-title"
              >
                <div className="mb-5 flex flex-col items-start justify-between gap-2.5 md:mb-[26px] md:flex-row md:items-end md:gap-5 [&>p]:text-[13px] [&>p]:text-muted-foreground md:[&>p]:max-w-[310px] md:[&>p]:text-right md:[&>p]:text-sm">
                  <div>
                    <span className="mb-2 block text-[10px] font-bold leading-normal tracking-[0.13em] text-primary">
                      {t("yourAccount")}
                    </span>
                    <h2
                      className="text-balance text-[clamp(24px,2.5vw,30px)] font-bold leading-tight tracking-[-0.035em]"
                      id="history-title"
                    >
                      <History
                        className="size-5 shrink-0 stroke-[1.8]"
                        aria-hidden="true"
                      />
                      {t("historyTitle")}
                    </h2>
                  </div>
                  <span className="whitespace-nowrap rounded-[5px] bg-secondary px-2.5 py-1 text-xs text-slate-600">
                    {t("orderCount", { count: myOrders.length })}
                  </span>
                </div>
                <div
                  className="overflow-x-auto rounded-xl border border-border"
                  tabIndex={0}
                  role="region"
                  aria-label={t("historyTitle")}
                >
                  <table className="w-full border-collapse text-left text-xs [&_th]:whitespace-nowrap [&_th]:bg-secondary [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:text-slate-600 [&_td]:border-t [&_td]:border-border [&_td]:p-4 [&_tr:hover_td]:bg-primary/[0.03]">
                    <caption className="sr-only">{t("historyTitle")}</caption>
                    <thead>
                      <tr>
                        {[
                          "orderCode",
                          "plan",
                          "amount",
                          "paymentMethod",
                          "createdAt",
                          "status",
                          "actions",
                        ].map((key) => (
                          <th
                            scope="col"
                            key={key}
                            className={
                              key === "actions" ? "text-center" : undefined
                            }
                          >
                            {t(key)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {myOrders.map((item) => {
                        const { className: statusClassName, icon: StatusIcon } =
                          orderStatuses[item.status];
                        return (
                          <tr key={item.id}>
                            <td>
                              <span className="font-mono tabular-nums [overflow-wrap:anywhere]">
                                {item.orderCode}
                              </span>
                            </td>
                            <td>{orderPlanName(item)}</td>
                            <td className="whitespace-nowrap font-semibold tabular-nums">
                              {formatPrice(item.amount)}
                            </td>
                            <td>
                              {t(
                                item.paymentMethod === "STRIPE"
                                  ? "stripeMethod"
                                  : item.paymentMethod === "CREDIT_CARD"
                                    ? "cardMethod"
                                    : "qrMethod",
                              )}
                            </td>
                            <td>{formatDate(item.createdAt)}</td>
                            <td>
                              <span
                                className={cn(
                                  statusBadgeClassName,
                                  statusClassName,
                                )}
                              >
                                <StatusIcon
                                  className="size-3 shrink-0 stroke-[1.8]"
                                  aria-hidden="true"
                                />
                                {t(`status${item.status}`)}
                              </span>
                            </td>
                            <td className="text-center align-middle">
                              {item.status === "PENDING" ? (
                                <div className="flex items-center justify-center gap-2">
                                  <ActionIconButton
                                    icon={CreditCard}
                                    label={t("pay")}
                                    variantStyle="restore"
                                    className="h-11 w-11"
                                    onClick={() => handleResumeOrder(item)}
                                    disabled={busy}
                                  />
                                  <ActionIconButton
                                    icon={Ban}
                                    label={t("cancel")}
                                    variantStyle="reject"
                                    className="h-11 w-11"
                                    onClick={() =>
                                      void handleCancelOrder(item.orderCode)
                                    }
                                    disabled={busy}
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            <section
              className="grid grid-cols-1 gap-6 py-10 md:grid-cols-[1fr_1.65fr] md:gap-14 md:py-16 [&>div>p]:mt-3 [&>div>p]:text-sm [&>div>p]:text-muted-foreground"
              aria-labelledby="faq-title"
            >
              <div>
                <span className="mb-2 block text-[10px] font-bold leading-normal tracking-[0.13em] text-primary">
                  {t("faqEyebrow")}
                </span>
                <h2
                  className="text-balance text-[clamp(24px,2.5vw,30px)] font-bold leading-tight tracking-[-0.035em]"
                  id="faq-title"
                >
                  {t("faqTitle")}
                </h2>
                <p>{t("faqDescription")}</p>
              </div>
              <div className="[&>details]:border-b [&>details]:border-border [&>details:first-child]:border-t [&_summary]:flex [&_summary]:min-h-16 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-5 [&_summary]:py-[18px] [&_summary]:text-[13px] [&_summary]:font-semibold md:[&_summary]:text-sm [&_summary::-webkit-details-marker]:hidden [&_summary>svg]:size-4 [&_summary>svg]:text-muted-foreground [&_summary>svg]:transition-transform [&_summary>svg]:duration-200 [&_details[open]_summary>svg]:rotate-180 [&_details>p]:mb-[22px] [&_details>p]:mr-6 [&_details>p]:text-sm [&_details>p]:leading-[1.8] [&_details>p]:text-muted-foreground">
                {[1, 2, 3].map((index) => (
                  <details key={index}>
                    <summary>
                      {t(`faq${index}Question`)}
                      <ChevronDown
                        className="size-5 shrink-0 stroke-[1.8]"
                        aria-hidden="true"
                      />
                    </summary>
                    <p>{t(`faq${index}Answer`)}</p>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}
        {step === "CHECKOUT" && order && (
          <section className="mb-16" aria-labelledby="payment-title">
            <div className="mb-[22px] flex flex-col items-start justify-between gap-3 md:flex-row md:items-center md:gap-4">
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-primary [&>svg]:size-4"
                onClick={handleBackToPlans}
                disabled={busy}
              >
                <ArrowLeft
                  className="size-5 shrink-0 stroke-[1.8]"
                  aria-hidden="true"
                />
                {t("backToPlans")}
              </button>
              <div
                role="timer"
                aria-label={t("orderHoldRemaining")}
                aria-live="off"
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs",
                  remainingSeconds <= 60
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-primary/20 bg-primary/5 text-primary-dark",
                )}
              >
                <Clock3
                  className="size-4 shrink-0 stroke-[1.8]"
                  aria-hidden="true"
                />
                <span>{t("orderHoldRemaining")}</span>
                <span className="min-w-[5ch] font-mono text-lg font-bold leading-none tabular-nums">
                  {countdown}
                </span>
              </div>
            </div>
            {isOrderExpired && (
              <div
                role="status"
                className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800"
              >
                <TimerOff className="size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{t("orderExpiredTitle")}</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    {t("orderExpiredDescription")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-11 w-auto border-orange-200 text-orange-800 hover:bg-orange-100"
                  onClick={handleBackToPlans}
                  disabled={busy}
                >
                  {t("backToPlans")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 items-start gap-[18px] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-6">
              <div className="min-w-0 rounded-xl border border-border p-[22px] shadow-sm lg:p-7 [&>h2]:text-[23px]">
                <span className="mb-2 block text-[10px] font-bold leading-normal tracking-[0.13em] text-primary">
                  {t("paymentEyebrow")}
                </span>
                <h2
                  className="text-balance text-[clamp(24px,2.5vw,30px)] font-bold leading-tight tracking-[-0.035em]"
                  id="payment-title"
                >
                  {t("paymentTitle")}
                </h2>
                <div
                  className="my-6 grid grid-cols-3 gap-1.5 rounded-lg border border-border bg-secondary p-[5px]"
                  role="group"
                  aria-label={t("paymentMethod")}
                >
                  {(
                    [
                      {
                        key: "STRIPE",
                        icon: LockKeyhole,
                        label: "stripeMethod",
                      },
                      { key: "QR", icon: QrCode, label: "qrMethod" },
                      { key: "CARD", icon: CreditCard, label: "cardMethod" },
                    ] as const
                  ).map(({ key, icon: Icon, label }) => (
                    <button
                      type="button"
                      key={key}
                      aria-pressed={paymentTab === key}
                      aria-controls="payment-content"
                      className={cn(
                        "flex min-h-11 flex-wrap items-center justify-center gap-1.5 rounded-[5px] border border-transparent px-1.5 py-2 text-[11px] font-semibold md:flex-col lg:flex-row [&>svg]:size-[15px]",
                        paymentTab === key
                          ? "border-primary/20 bg-background text-primary shadow-sm"
                          : "text-slate-600",
                      )}
                      disabled={processing}
                      onClick={() => setPaymentTab(key)}
                    >
                      <Icon
                        className="size-5 shrink-0 stroke-[1.8]"
                        aria-hidden="true"
                      />
                      {t(label)}
                    </button>
                  ))}
                </div>
                <div id="payment-content">
                  {paymentTab === "STRIPE" ? (
                    <div className="grid gap-5">
                      <div className="px-2 pb-2 pt-3.5 text-center [&>span]:mb-[18px] [&>span]:size-14 [&>h3]:text-xl [&>p]:mx-auto [&>p]:mb-5 [&>p]:mt-3 [&>p]:max-w-[390px] [&>p]:text-sm [&>p]:text-muted-foreground">
                        <span className={iconTileClassName}>
                          <LockKeyhole
                            className="size-5 shrink-0 stroke-[1.8]"
                            aria-hidden="true"
                          />
                        </span>
                        <h3 className="text-balance font-bold leading-tight tracking-tight">
                          {t("stripeTitle")}
                        </h3>
                        <p>{t("stripeDescription")}</p>
                        <PaymentCardBrands label={t("acceptedCards")} />
                      </div>
                      <Button
                        className={buttonClassName}
                        onClick={() => void handleStripeCheckout()}
                        disabled={paymentUnavailable}
                      >
                        {processing ? (
                          <Loader2
                            className="size-5 shrink-0 stroke-[1.8] animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <LockKeyhole
                            className="size-5 shrink-0 stroke-[1.8]"
                            aria-hidden="true"
                          />
                        )}
                        {t(processing ? "connectingStripe" : "continueStripe")}
                        <ArrowRight
                          className="size-5 shrink-0 stroke-[1.8]"
                          aria-hidden="true"
                        />
                      </Button>
                    </div>
                  ) : paymentTab === "QR" ? (
                    <div className="grid gap-5">
                      <p className="text-muted-foreground">
                        {t("qrDescription")}
                      </p>
                      <div className="grid grid-cols-2 items-center gap-3 max-[374px]:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 lg:gap-5 [&>figure]:rounded-lg [&>figure]:border [&>figure]:border-border [&>figure]:p-2 md:[&>figure]:mx-auto md:[&>figure]:max-w-[230px] [&_img]:block [&_img]:aspect-square [&_img]:h-auto [&_img]:w-full [&_img]:object-contain [&_figcaption]:my-[5px] [&_figcaption]:flex [&_figcaption]:items-center [&_figcaption]:justify-center [&_figcaption]:gap-[5px] [&_figcaption]:text-[10px] [&_figcaption]:text-muted-foreground [&_figcaption>svg]:size-3">
                        <figure>
                          <img
                            src={`https://img.vietqr.io/image/MB-0348748301-compact2.png?amount=${order.amount}&addInfo=${encodeURIComponent(order.orderCode)}&accountName=INTERNHIRING`}
                            alt={t("qrAlt")}
                            width={216}
                            height={216}
                          />
                          <figcaption>
                            <QrCode
                              className="size-5 shrink-0 stroke-[1.8]"
                              aria-hidden="true"
                            />
                            VietQR · MB Bank
                          </figcaption>
                        </figure>
                        <dl className="grid min-w-0 gap-2.5 [&_dt]:text-[11px] [&_dt]:text-muted-foreground [&_dd]:flex [&_dd]:items-center [&_dd]:justify-between [&_dd]:gap-2 [&_dd]:text-[13px] [&_dd]:font-semibold">
                          <div>
                            <dt>{t("bank")}</dt>
                            <dd>MB Bank</dd>
                          </div>
                          {[
                            { key: "accountNumber", value: "0348748301" },
                            { key: "amount", value: String(order.amount) },
                            { key: "transferContent", value: order.orderCode },
                          ].map(({ key, value }) => (
                            <div key={key}>
                              <dt>{t(key)}</dt>
                              <dd>
                                <span className="font-mono tabular-nums [overflow-wrap:anywhere]">
                                  {key === "amount"
                                    ? formatPrice(order.amount)
                                    : value}
                                </span>
                                <button
                                  type="button"
                                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-primary hover:bg-primary/5 [&>svg]:size-[15px]"
                                  aria-label={t("copyField", { field: t(key) })}
                                  onClick={() =>
                                    void copyToClipboard(value, key)
                                  }
                                >
                                  {copiedField === key ? (
                                    <Check
                                      className="size-5 shrink-0 stroke-[1.8]"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <Copy
                                      className="size-5 shrink-0 stroke-[1.8]"
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                      <Button
                        className={buttonClassName}
                        disabled={paymentUnavailable}
                        onClick={() => void handleConfirmPayment()}
                      >
                        {processing ? (
                          <Loader2
                            className="size-5 shrink-0 stroke-[1.8] animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <CheckCircle2
                            className="size-5 shrink-0 stroke-[1.8]"
                            aria-hidden="true"
                          />
                        )}
                        {t(
                          processing ? "processingPayment" : "confirmTransfer",
                        )}
                      </Button>
                    </div>
                  ) : (
                    <form
                      className="grid gap-5"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleConfirmPayment();
                      }}
                    >
                      <div className="[&>p]:mb-3 [&>p]:text-xs [&>p]:text-muted-foreground">
                        <p>{t("acceptedCards")}</p>
                        <PaymentCardBrands label={t("acceptedCards")} />
                      </div>
                      <div className="grid gap-2 [&>label]:text-xs [&>input]:h-11 [&>input]:rounded-lg [&>input]:border-border [&>input]:bg-background [&>input]:text-base [&>input]:text-foreground">
                        <Label htmlFor="member-card-number">
                          {t("cardNumber")}
                        </Label>
                        <Input
                          id="member-card-number"
                          name="cardNumber"
                          inputMode="numeric"
                          autoComplete="off"
                          required
                          value={cardForm.cardNumber}
                          onChange={(event) =>
                            setCardForm({
                              ...cardForm,
                              cardNumber: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-2 [&>label]:text-xs [&>input]:h-11 [&>input]:rounded-lg [&>input]:border-border [&>input]:bg-background [&>input]:text-base [&>input]:text-foreground">
                        <Label htmlFor="member-card-name">
                          {t("cardHolder")}
                        </Label>
                        <Input
                          id="member-card-name"
                          name="cardHolder"
                          autoComplete="off"
                          required
                          value={cardForm.holderName}
                          onChange={(event) =>
                            setCardForm({
                              ...cardForm,
                              holderName: event.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2 [&>label]:text-xs [&>input]:h-11 [&>input]:rounded-lg [&>input]:border-border [&>input]:bg-background [&>input]:text-base [&>input]:text-foreground">
                          <Label htmlFor="member-card-expiry">
                            {t("expiryDate")}
                          </Label>
                          <Input
                            id="member-card-expiry"
                            name="cardExpiry"
                            autoComplete="off"
                            placeholder="MM/YY"
                            maxLength={5}
                            required
                            value={cardForm.expiry}
                            onChange={(event) =>
                              setCardForm({
                                ...cardForm,
                                expiry: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2 [&>label]:text-xs [&>input]:h-11 [&>input]:rounded-lg [&>input]:border-border [&>input]:bg-background [&>input]:text-base [&>input]:text-foreground">
                          <Label htmlFor="member-card-cvv">CVC / CVV</Label>
                          <Input
                            id="member-card-cvv"
                            name="cardCvv"
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={4}
                            minLength={3}
                            required
                            value={cardForm.cvv}
                            onChange={(event) =>
                              setCardForm({
                                ...cardForm,
                                cvv: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className={buttonClassName}
                        disabled={paymentUnavailable}
                      >
                        {processing ? (
                          <Loader2
                            className="size-5 shrink-0 stroke-[1.8] animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <ShieldCheck
                            className="size-5 shrink-0 stroke-[1.8]"
                            aria-hidden="true"
                          />
                        )}
                        {t(processing ? "processingPayment" : "payNow")}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
              <aside
                className="row-start-1 min-w-0 rounded-xl border border-border bg-primary/[0.03] p-[22px] shadow-sm md:sticky md:top-[88px] md:row-start-auto lg:p-7"
                aria-labelledby="order-summary-title"
              >
                <div className="flex items-center gap-[9px] border-b border-border pb-[22px] [&>svg]:text-primary [&>h2]:text-lg [&>h2]:tracking-[-0.02em]">
                  <ReceiptText
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                  <h2
                    className="text-balance text-[clamp(24px,2.5vw,30px)] font-bold leading-tight tracking-[-0.035em]"
                    id="order-summary-title"
                  >
                    {t("orderSummary")}
                  </h2>
                </div>
                <div className="flex items-center gap-3 py-6 [&_strong]:block [&_strong]:text-base [&_div>span]:mt-1 [&_div>span]:block [&_div>span]:text-xs [&_div>span]:text-slate-600">
                  <span className={iconTileClassName}>
                    <Crown
                      className="size-5 shrink-0 stroke-[1.8]"
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <strong>{orderPlanName(order)}</strong>
                    <span>
                      {selectedPlan
                        ? t("durationBenefit", {
                            count: selectedPlan.durationDays,
                          })
                        : "InternHiring Member"}
                    </span>
                  </div>
                </div>
                <dl className="grid gap-4 text-[13px] [&>div]:flex [&>div]:justify-between [&>div]:gap-5 [&>div:not(:last-child)]:items-baseline [&>div:not(:last-child)>dt]:text-slate-600 [&>div:not(:last-child)>dd]:font-semibold [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:[overflow-wrap:anywhere]">
                  <div>
                    <dt>{t("orderCode")}</dt>
                    <dd className="font-mono tabular-nums [overflow-wrap:anywhere]">
                      {order.orderCode}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("subtotal")}</dt>
                    <dd>{formatPrice(order.amount)}</dd>
                  </div>
                  <div>
                    <dt>{t("serviceFee")}</dt>
                    <dd>{formatPrice(0)}</dd>
                  </div>
                  <div className="mt-1 items-center border-t border-border pt-5 [&>dt]:font-semibold [&>dt]:text-foreground [&>dd]:text-[26px] [&>dd]:font-extrabold [&>dd]:tracking-[-0.04em] [&>dd]:text-primary">
                    <dt>{t("total")}</dt>
                    <dd>{formatPrice(order.amount)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2.5 border-t border-border py-4 text-xs md:mt-6 [&>svg]:size-[17px] [&>svg]:text-primary [&_p]:mt-1.5 [&_p]:leading-[1.7] [&_p]:text-slate-600">
                  <ShieldCheck
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{t("activationTitle")}</strong>
                    <p>{t("activationDescription")}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-11 w-full gap-2 border-red-200 bg-red-50 font-semibold text-red-700 shadow-none hover:border-red-300 hover:bg-red-100 hover:text-red-800"
                  onClick={() => void handleCancelOrder(order.orderCode)}
                  disabled={busy || isOrderExpired}
                >
                  {cancellingOrderCode === order.orderCode ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Ban className="size-4" aria-hidden="true" />
                  )}
                  {t(
                    cancellingOrderCode === order.orderCode
                      ? "cancellingOrder"
                      : "cancelOrder",
                  )}
                </Button>
              </aside>
            </div>
          </section>
        )}
        {step === "SUCCESS" && order && (
          <section
            className="mx-auto mb-10 max-w-[600px] rounded-xl border border-border border-t-[3px] border-t-primary px-5 py-7 text-center shadow-soft md:mb-16 md:p-9 [&>h2]:mt-4 [&>h2]:text-[26px] [&>p]:mt-3 [&>p]:text-sm [&>p]:text-muted-foreground"
            aria-labelledby="success-receipt-title"
          >
            <span className="mx-auto mb-[18px] flex size-[72px] items-center justify-center rounded-full bg-emerald-50 text-emerald-700 [&>svg]:size-9">
              <CheckCircle2
                className="size-5 shrink-0 stroke-[1.8]"
                aria-hidden="true"
              />
            </span>
            {membershipBadge}
            <h2
              className="text-balance text-[clamp(24px,2.5vw,30px)] font-bold leading-tight tracking-[-0.035em]"
              id="success-receipt-title"
            >
              {t("welcomeMember")}
            </h2>
            <p>{t("successMessage")}</p>
            <dl className="mt-7 grid gap-4 rounded-lg border border-border bg-primary/[0.03] p-4 text-left text-xs md:p-5 [&>div]:flex [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-5 [&_dt]:text-slate-600 [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:font-semibold [&_dd]:[overflow-wrap:anywhere]">
              <div>
                <dt>{t("orderCode")}</dt>
                <dd className="font-mono tabular-nums [overflow-wrap:anywhere]">
                  {order.orderCode}
                </dd>
              </div>
              {order.transactionId && (
                <div>
                  <dt>{t("transactionId")}</dt>
                  <dd className="font-mono tabular-nums [overflow-wrap:anywhere]">
                    {order.transactionId}
                  </dd>
                </div>
              )}
              <div>
                <dt>{t("plan")}</dt>
                <dd>{orderPlanName(order)}</dd>
              </div>
              <div>
                <dt>{t("amountPaid")}</dt>
                <dd>{formatPrice(order.amount)}</dd>
              </div>
              <div>
                <dt>{t("status")}</dt>
                <dd>
                  <span
                    className={cn(
                      statusBadgeClassName,
                      "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    <Check
                      className="size-5 shrink-0 stroke-[1.8]"
                      aria-hidden="true"
                    />
                    {t("activated")}
                  </span>
                </dd>
              </div>
            </dl>
            <div className="mt-6 grid gap-3">
              <Button className={buttonClassName} asChild>
                <Link to="/profile">
                  {t("viewProfile")}
                  <ArrowRight
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
              <Button
                className={cn(buttonClassName, outlineButtonClassName)}
                onClick={() => setStep("PLANS")}
              >
                {t("manageMembership")}
              </Button>
            </div>
          </section>
        )}
        <footer className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border py-6 text-xs text-muted-foreground md:gap-5 md:pb-[30px] md:pt-[25px]">
          <Link
            to="/"
            className="text-[21px] font-extrabold leading-none tracking-[-0.05em] text-primary"
          >
            InternHiring
          </Link>
          <span>{t("brandTagline")}</span>
          <span className="flex w-full items-center gap-1.5 md:ml-auto md:w-auto [&>svg]:size-3.5 [&>svg]:text-yellow-700">
            <Crown
              className="size-5 shrink-0 stroke-[1.8]"
              aria-hidden="true"
            />
            {t("footerNote")}
          </span>
        </footer>
      </div>
    </main>
  );
};

export default Purchase;
