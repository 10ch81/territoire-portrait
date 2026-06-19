import type { MobilitySnapshot } from "../types";

/** Helpers purs sur snapshot déjà enrichi — sûrs côté client (sans accès cache/fs). */
export function isMobilityAvailable(snapshot: MobilitySnapshot): boolean {
  return snapshot.irve.available || snapshot.commute.available;
}

export function isConnectivityAvailable(snapshot: MobilitySnapshot): boolean {
  return snapshot.connectivity.available;
}
