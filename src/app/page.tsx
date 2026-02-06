"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in by checking for session cookies
    const checkAuth = async () => {
      try {
        // Check admin session
        const adminResponse = await fetch("/api/admin/session");
        const adminData = await adminResponse.json();

        if (adminData.success) {
          // Super Admin is logged in, redirect to admin dashboard
          router.replace("/admin");
          return;
        }

        // Check if user has a current project (indicating regular user session)
        const currentProjectUuid = localStorage.getItem("currentProjectUuid");
        if (currentProjectUuid) {
          // User has selected a project, redirect to projects page
          router.replace("/projects");
          return;
        }

        // Not logged in, redirect to login
        router.replace("/login");
      } catch {
        // On error, redirect to login
        router.replace("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4]">
      <div className="text-[#737373]">Loading...</div>
    </div>
  );
}
