import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/pronosticos", "/transparencia", "/jugador"];
const AUTH_ROUTES = ["/login"];

type MiddlewareProfile = {
  invite_redeemed_at?: string | null;
  withdrawn_at?: string | null;
  is_admin?: boolean;
  role?: string;
  predictions_submitted?: boolean;
};

function authenticatedLandingPath(profile: MiddlewareProfile | undefined): string {
  if (!profile?.invite_redeemed_at) return "/join";
  return profile.predictions_submitted ? "/" : "/pronosticos";
}

function routeNeedsProfile(path: string): boolean {
  return (
    path === "/" ||
    AUTH_ROUTES.some((p) => path.startsWith(p)) ||
    path.startsWith("/join") ||
    path.startsWith("/admin") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/pronosticos") ||
    path.startsWith("/transparencia") ||
    path.startsWith("/jugador")
  );
}

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

  let profile: MiddlewareProfile | undefined;
  if (user && routeNeedsProfile(path)) {
    const { data: profileRows } = await supabase.rpc("get_my_profile");
    profile = profileRows?.[0] as MiddlewareProfile | undefined;
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
    url.pathname = authenticatedLandingPath(profile);
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/join")) {
    if (profile?.invite_redeemed_at) {
      const url = request.nextUrl.clone();
      url.pathname = authenticatedLandingPath(profile);
      return NextResponse.redirect(url);
    }
  }

  if (
    user &&
    path === "/" &&
    profile?.invite_redeemed_at &&
    !profile.withdrawn_at &&
    !profile.predictions_submitted
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/pronosticos";
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin")) {
    if (!user) {
      return new NextResponse(null, { status: 404 });
    }
    const isAdmin = profile?.is_admin === true || profile?.role === "admin";

    if (!isAdmin) {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (path.startsWith("/leaderboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    (path.startsWith("/dashboard") ||
      path.startsWith("/pronosticos") ||
      path.startsWith("/transparencia") ||
      path.startsWith("/jugador"))
  ) {
    if (profile?.withdrawn_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("withdrawn", "1");
      return NextResponse.redirect(url);
    }

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
