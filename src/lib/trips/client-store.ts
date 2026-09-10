"use client";

/** Guest trip memberships remembered on this device. */
export interface DeviceTrip {
  tripId: string;
  secret: string;
  memberId: string;
  name: string;
  emoji: string;
}

const KEY = "duxiter.trips";

export function getDeviceTrips(): DeviceTrip[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as DeviceTrip[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function rememberDeviceTrip(t: DeviceTrip) {
  try {
    const all = getDeviceTrips().filter((x) => x.tripId !== t.tripId);
    all.push(t);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function forgetDeviceTrip(tripId: string) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(getDeviceTrips().filter((x) => x.tripId !== tripId)),
    );
  } catch {
    /* ignore */
  }
}
