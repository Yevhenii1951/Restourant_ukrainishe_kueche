"use server";

import {
  cancelPublicReservation,
  createReservationRequest,
} from "./requestService";
import { createReservationRequestRuntime } from "./requestRuntime";
import type {
  ReservationCancelResult,
  ReservationRequestResult,
} from "./request";

export async function createReservationRequestAction(
  raw: unknown,
): Promise<ReservationRequestResult> {
  const runtime = createReservationRequestRuntime();
  if (!runtime) return { status: "error", reason: "service-unavailable" };
  return createReservationRequest(raw, runtime);
}

export async function cancelPublicReservationAction(
  token: string,
): Promise<ReservationCancelResult> {
  const runtime = createReservationRequestRuntime();
  if (!runtime) return { status: "neutral" };
  return cancelPublicReservation(token, runtime);
}