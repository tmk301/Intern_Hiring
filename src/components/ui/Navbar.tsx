import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { isAdminRole, isCandidateRole, isModeratorRole, isRecruiterRole } from "@/lib/roles";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationButton } from "./NotificationButton";
import { SanityNavbarItem, useSanityManagedInterface } from "@/lib/sanityInterfaceText";

type NavbarDisplayItem = SanityNavbarItem & {
  label: string;
};

const Navbar = () => {
  const { user, token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { navbar } = useSanityManagedInterface("/");
  const showModeratorLink = isModeratorRole(user?.role) && location.pathname !== "/moderator";
  const showProfileLink = location.pathname !== "/profile";
  const showAdminLink = isAdminRole(user?.role) && location.pathname !== "/admin";
  const showRecruiterLink = isRecruiterRole(user?.role) && location.pathname !== "/recruiter";
  const showApplicationsLink = isCandidateRole(user?.role) && location.pathname !== "/applications";
  const showRecruitmentNavItem = !isAuthenticated || isCandidateRole(user?.role);

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    navigate("/");
  };

  const defaultNavItems: NavbarDisplayItem[] = [
    { label: t("nav.about"), targetId: "gioi-thieu" },
    { label: t("nav.featured"), targetId: "viec-lam-noi-bat" },
    { label: t("nav.partners"), targetId: "doi-tac" },
    ...(showRecruitmentNavItem ? [{ label: t("nav.recruitment"), targetId: "tuyen-dung" }] : []),
  ];

  const customNavItems: NavbarDisplayItem[] = (navbar.items || [])
    .filter((item) => item.isVisible !== false && Boolean(item.path || item.targetId))
    .map((item) => ({
      ...item,
      label: i18n.language.startsWith("en")
        ? item.labelEn || item.label || item.labelVi || ""
        : item.labelVi || item.label || item.labelEn || "",
    }))
    .filter((item) => Boolean(item.label));

  const navItems = navbar.isEnabled ? customNavItems : defaultNavItems;

  const scrollToSection = (targetId?: string) => {
    if (window.location.pathname !== "/") {
      navigate("/");
    }

    window.setTimeout(() => {
      if (!targetId) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handleNavItem = (item: NavbarDisplayItem) => {
    if (item.path) {
      navigate(item.path);
      return;
    }

    scrollToSection(item.targetId);
  };

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b shadow-sm"
      style={{backgroundColor: navbar.isEnabled ? navbar.backgroundColor || "#ffffff" : "#ffffff"}}
    >
      <div className="container mx-auto relative flex h-16 items-center px-4">
        <button type="button" className="flex shrink-0 items-center" onClick={() => scrollToSection()}>
          <span className="font-bold text-xl text-primary">InternHiring</span>
        </button>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 xl:flex 2xl:gap-10">
          {navItems.map((item) => (
            <button
              key={String("path" in item ? item.path : item.targetId)}
              type="button"
              onClick={() => handleNavItem(item)}
              className="whitespace-nowrap px-2 text-center text-sm font-semibold text-black transition hover:text-primary"
              style={{color: item.textColor || (navbar.isEnabled ? navbar.textColor : undefined)}}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-3 xl:flex">
            {isAuthenticated ? (
              <>
                <NotificationButton user={user} token={token} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full transition hover:opacity-80 cursor-pointer focus:outline-none focus-visible:outline-none">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatarUrl} />
                        <AvatarFallback>
                          {user?.firstName?.charAt(0) || <UserIcon className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user?.firstName}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {showAdminLink && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">{t("nav.admin")}</Link>
                      </DropdownMenuItem>
                    )}
                    {showRecruiterLink && (
                      <DropdownMenuItem asChild>
                        <Link to="/recruiter">{t("nav.recruiterDashboard")}</Link>
                      </DropdownMenuItem>
                    )}
                    {showModeratorLink && (
                      <DropdownMenuItem asChild>
                        <Link to="/moderator">Moderator</Link>
                      </DropdownMenuItem>
                    )}
                    {showApplicationsLink && (
                      <DropdownMenuItem asChild>
                        <Link to="/applications">{t("nav.applications")}</Link>
                      </DropdownMenuItem>
                    )}
                    {showProfileLink && (
                      <DropdownMenuItem asChild>
                        <Link to="/profile">{t("nav.profile")}</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="focus:bg-red-600 focus:text-white hover:bg-red-600 hover:text-white dark:focus:bg-red-700 dark:hover:bg-red-700 cursor-pointer text-slate-700 dark:text-slate-200"
                      onSelect={(e) => {
                        e.preventDefault();
                        handleLogoutClick();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t("nav.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="cta"
                  size="sm"
                  className="w-28 bg-primary text-primary-foreground hover:bg-primary-dark"
                  onClick={() => navigate("/login")}
                >
                  {t("nav.login")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-28 border-primary bg-white text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => navigate("/register")}
                >
                  {t("nav.register")}
                </Button>
              </>
            )}
            <LanguageSwitcher />
          </div>

          <div className="xl:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-64">
                <div className="mt-6 flex flex-col gap-4">
                  <LanguageSwitcher />

                  {navItems.map((item) => (
                    <SheetClose asChild key={String("path" in item ? item.path : item.targetId)}>
                      <button
                        type="button"
                        onClick={() => handleNavItem(item)}
                        className="w-full text-left text-base font-semibold"
                        style={{color: item.textColor || (navbar.isEnabled ? navbar.textColor : undefined)}}
                      >
                        {item.label}
                      </button>
                    </SheetClose>
                  ))}

                  <div className="border-t pt-4">
                    {isAuthenticated ? (
                      <>
                        <div className="mb-2">
                          <NotificationButton user={user} token={token} mobile />
                        </div>
                        {showAdminLink && (
                          <Link to="/admin" className="mb-2 flex items-center gap-2 rounded-md p-2 hover:bg-muted transition">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{t("nav.admin")}</span>
                          </Link>
                        )}
                        {showRecruiterLink && (
                          <Link to="/recruiter" className="mb-2 flex items-center gap-2 rounded-md p-2 hover:bg-muted transition">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{t("nav.recruiterDashboard")}</span>
                          </Link>
                        )}
                        {showModeratorLink && (
                          <Link to="/moderator" className="mb-2 flex items-center gap-2 rounded-md p-2 hover:bg-muted transition">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Moderator</span>
                          </Link>
                        )}
                        {showApplicationsLink && (
                          <Link to="/applications" className="mb-2 flex items-center gap-2 rounded-md p-2 hover:bg-muted transition">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{t("nav.applications")}</span>
                          </Link>
                        )}
                        {showProfileLink && (
                          <Link to="/profile" className="flex items-center gap-2 mb-2 rounded-md p-2 hover:bg-muted transition">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.avatarUrl} />
                              <AvatarFallback>
                                {user?.firstName?.charAt(0) || <UserIcon className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{user?.firstName}</span>
                          </Link>
                        )}
                        <SheetClose asChild>
                          <Button onClick={handleLogoutClick} className="w-full">
                            {t("nav.logout")}
                          </Button>
                        </SheetClose>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="cta"
                          className="w-full mb-2 bg-primary text-primary-foreground hover:bg-primary-dark"
                          onClick={() => navigate("/login")}
                        >
                          {t("nav.login")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-primary bg-white text-primary hover:bg-primary/10 hover:text-primary"
                          onClick={() => navigate("/register")}
                        >
                          {t("nav.register")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="max-w-[400px] rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t("nav.logoutConfirmTitle", { defaultValue: "Xác nhận đăng xuất" })}
            </DialogTitle>
            <DialogDescription className="text-sm mt-1 text-slate-500">
              {t("nav.logoutConfirmDescription", { defaultValue: "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)} className="w-auto px-4 border-slate-200 hover:bg-slate-50 hover:text-slate-900">
              {t("common.cancel", { defaultValue: "Hủy" })}
            </Button>
            <Button variant="destructive" onClick={confirmLogout} className="w-auto px-4 bg-red-600 hover:bg-red-700 text-white border-transparent">
              {t("nav.logout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;
