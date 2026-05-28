import React from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { isAdminRole, isRecruiterRole } from "@/lib/roles";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItems = [
    { label: t("nav.about"), targetId: "gioi-thieu" },
    { label: t("nav.featured"), targetId: "viec-lam-noi-bat" },
    { label: t("nav.partners"), targetId: "doi-tac" },
    { label: t("nav.recruitment"), targetId: "tuyen-dung" },
  ];

  type NavItem = (typeof navItems)[number];

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

  const handleNavItem = (item: NavItem) => {
    if ("path" in item) {
      navigate(item.path);
      return;
    }

    scrollToSection(item.targetId);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto relative flex h-16 items-center px-4">

        {/* LEFT - Logo */}
        <button type="button" className="flex shrink-0 items-center" onClick={() => scrollToSection()}>
          <span className="font-bold text-xl text-primary">
            InternHiring
          </span>
        </button>

        {/* CENTER - Menu (desktop) */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 xl:flex 2xl:gap-10">
          {navItems.map((item) => (
            <button
              key={"path" in item ? item.path : item.targetId}
              type="button"
              onClick={() => handleNavItem(item)}
              className="whitespace-nowrap px-2 text-center text-sm font-semibold text-black transition hover:text-primary"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* RIGHT */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {/* DESKTOP AUTH */}
          <div className="hidden items-center gap-3 xl:flex">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full transition hover:opacity-80 cursor-pointer focus:outline-none focus-visible:outline-none">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatarUrl} />
                      <AvatarFallback>
                        {user?.firstName?.charAt(0) || (
                          <UserIcon className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <span className="text-sm">
                      {user?.firstName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdminRole(user?.role) && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">{t("nav.admin")}</Link>
                    </DropdownMenuItem>
                  )}
                  {isRecruiterRole(user?.role) && (
                    <DropdownMenuItem asChild>
                      <Link to="/recruiter">{t("nav.recruiterDashboard")}</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/profile">{t("nav.profile")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          {/* MOBILE MENU */}
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

                  {/* MENU ITEMS */}
                  {navItems.map((item) => (
                    <SheetClose asChild key={"path" in item ? item.path : item.targetId}>
                      <button
                        type="button"
                        onClick={() => handleNavItem(item)}
                        className="w-full text-left text-base font-semibold"
                      >
                        {item.label}
                      </button>
                    </SheetClose>
                  ))}

                  {/* AUTH */}
                  <div className="border-t pt-4">
                    {isAuthenticated ? (
                      <>
                        {isAdminRole(user?.role) && (
                          <Link to="/admin" className="mb-2 flex items-center gap-2 rounded-md p-2 hover:bg-muted transition">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{t("nav.admin")}</span>
                          </Link>
                        )}
                        {isRecruiterRole(user?.role) && (
                          <Link to="/recruiter" className="mb-2 flex items-center gap-2 rounded-md p-2 hover:bg-muted transition">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{t("nav.recruiterDashboard")}</span>
                          </Link>
                        )}
                        <Link to="/profile" className="flex items-center gap-2 mb-2 rounded-md p-2 hover:bg-muted transition">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.avatarUrl} />
                            <AvatarFallback>
                              {user?.firstName?.charAt(0) || <UserIcon className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{user?.firstName}</span>
                        </Link>
                        <Button
                          onClick={handleLogout}
                          className="w-full"
                        >
                          {t("nav.logout")}
                        </Button>
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
    </nav>
  );
};

export default Navbar;
