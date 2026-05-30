import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/pronosticos", "/transparencia"];
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
    const { data: profileRows } = await supabase.rpc("get_my_profile");
    const profile = profileRows?.[0] as { invite_redeemed_at?: string | null } | undefined;

    const url = request.nextUrl.clone();
    url.pathname = profile?.invite_redeemed_at ? "/dashboard" : "/join";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/join")) {
    const { data: profileRows } = await supabase.rpc("get_my_profile");
    const profile = profileRows?.[0] as { invite_redeemed_at?: string | null } | undefined;

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
    const { data: profileRows } = await supabase.rpc("get_my_profile");
    const profile = profileRows?.[0] as
      | { is_admin?: boolean; role?: string }
      | undefined;
    const isAdmin =
      profile?.is_admin === true || profile?.role === "admin";

    if (!isAdmin) {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (path.startsWith("/leaderboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && (path.startsWith("/dashboard") || path.startsWith("/pronosticos") || path.startsWith("/transparencia"))) {
    const { data: profileRows } = await supabase.rpc("get_my_profile");
    const profile = profileRows?.[0] as { invite_redeemed_at?: string | null } | undefined;

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
