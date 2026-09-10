import "server-only";

export type TripNotifyEvent =
  | {
      kind: "expense_added" | "expense_updated";
      actorName: string;
      title: string;
      amount: number;
      currency: string;
    }
  | {
      kind: "settlement_added";
      actorName: string;
      fromName: string;
      toName: string;
      amount: number;
      currency: string;
    }
  | { kind: "trip_closed"; actorName: string };

/**
 * Push a notification to every trip member except the actor.
 * Phase B fills this in (Web Push + `push_subscriptions`). No-op for now.
 */
export async function notifyTrip(
  _tripId: string,
  _actorMemberId: string | null,
  _event: TripNotifyEvent,
): Promise<void> {
  // TODO(phase-b): web-push to all trip subscriptions, per recipient locale
}
