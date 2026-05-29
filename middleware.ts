import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
const AUTH_ROUTES = ["/login"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  let user;
  let supabase: Awaited<ReturnType<typeof updateSession>>["supabase"];
  let supabaseResponse: Awaited<ReturnType<typeof updateSession>>["supabaseResponse"];

  try {
    ({ user, supabase, supabaseResponse } = await updateSession(request));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error de configuración Supabase";
    return new NextResponse(message, {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/join")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("invite_redeemed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.invite_redeemed_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (path.startsWith("/admin")) {
    if (!user) {
      return new NextResponse(null, { status: 404 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (user && path.startsWith("/dashboard")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("invite_redeemed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.invite_redeemed_at && !path.startsWith("/join")) {
      const url = request.nextUrl.clone();
      url.pathname = "/join";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
