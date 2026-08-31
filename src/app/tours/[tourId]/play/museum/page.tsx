import { redirect } from "next/navigation";

// The unified /play route branches on tour type. Keep this path working.
export default function MuseumPlayerAlias({
  params,
}: {
  params: { tourId: string };
}) {
  redirect(`/tours/${params.tourId}/play`);
}
