import { NextResponse, type NextRequest } from "next/server";
import { resolveTripAccess } from "@/lib/trips/access";
import { buildTripView } from "@/lib/trips/view";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { tripId: string } },
) {
  const inviteToken = req.nextUrl.searchParams.get("invite") ?? undefined;
  const access = await resolveTripAccess(params.tripId, { inviteToken });
  if (!access) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (access.mode === "none") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(await buildTripView(access.trip, access.member));
}
