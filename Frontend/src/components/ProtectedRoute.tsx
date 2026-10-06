"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { UserRole } from "@/types/auth";

interface JwtPayload {
  sub?: string;
  userId?: number;
  role?: string;
  exp?: number;
  iat?: number;
}

interface UserProfileResponse {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: string;
  emailVerified: boolean;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

type AuthStatus = "CHECKING" | "AUTHORIZED" | "UNAUTHENTICATED" | "UNAUTHORIZED_ROLE";

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function getDefaultDashboardForRole(role: string | null): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "SELLER":
      return "/seller/dashboard";
    case "SUPPORT_AGENT":
      return "/support-agent/dashboard";
    case "VERIFICATION_OFFICER":
      return "/verification-officer/dashboard";
    case "BUYER":
    default:
      return "/buyer/dashboard";
  }
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("CHECKING");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      const token = localStorage.getItem("token");
      const targetPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : pathname;

      // 1. First-pass client check: Does token exist?
      if (!token) {
        if (!isMounted) return;
        setAuthStatus("UNAUTHENTICATED");
        router.replace(`/login?redirect=${encodeURIComponent(targetPath)}`);
        return;
      }

      // 2. First-pass client check: Is JWT structurally valid & not expired?
      const payload = parseJwt(token);
      if (!payload || !payload.exp || Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        window.dispatchEvent(new Event("auth-change"));

        if (!isMounted) return;
        setAuthStatus("UNAUTHENTICATED");
        router.replace(`/login?redirect=${encodeURIComponent(targetPath)}`);
        return;
      }

      // 3. Second-pass backend verification: Check with /api/users/me
      try {
        const response = await apiRequest<{ data: UserProfileResponse }>("/users/me");
        if (!isMounted) return;

        const profile = response.data;
        setUserRole(profile.role);

        // Keep local cache fresh with server truth
        localStorage.setItem("role", profile.role);
        localStorage.setItem("userId", String(profile.id));

        // 4. Role-based authorization check
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
          setAuthStatus("UNAUTHORIZED_ROLE");
          return;
        }

        setAuthStatus("AUTHORIZED");
      } catch (err) {
        if (!isMounted) return;
        // apiRequest clears token/role on 401 automatically
        setAuthStatus("UNAUTHENTICATED");
        router.replace(`/login?redirect=${encodeURIComponent(targetPath)}`);
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router, allowedRoles]);

  // Loading State - Prevents content flash
  if (authStatus === "CHECKING" || authStatus === "UNAUTHENTICATED") {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00cfa8] to-[#00b28e] flex items-center justify-center font-black text-[#070b14] text-xl shadow-[0_0_24px_rgba(0,207,168,0.35)] animate-pulse">
            B
          </div>
        </div>
        <div className="text-[#8493a8] text-sm font-medium animate-pulse flex items-center gap-2">
          <svg
            className="w-4 h-4 animate-spin text-[#00cfa8]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Verifying security authorization...
        </div>
      </div>
    );
  }

  // 403 Forbidden - Role mismatch
  if (authStatus === "UNAUTHORIZED_ROLE") {
    const dashboardHref = getDefaultDashboardForRole(userRole);

    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0d1220] border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-white mb-2">Access Denied (403)</h1>
          <p className="text-sm text-[#8493a8] mb-6 leading-relaxed">
            Your current account role (
            <span className="text-[#d8e4f0] font-semibold">{userRole || "User"}</span>
            ) does not have authorization to view this protected area.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={dashboardHref}
              className="px-5 py-2.5 rounded-xl bg-[#00cfa8] hover:bg-[#00e6bc] text-[#080c15] text-sm font-semibold transition-colors"
            >
              Go to My Dashboard
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#27354a] text-[#d8e4f0] text-sm font-semibold transition-colors border border-white/5"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 200 OK - Authorized
  return <>{children}</>;
}
