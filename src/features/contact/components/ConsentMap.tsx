"use client";

import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";

interface ConsentMapProps {
  consentLabel: string;
  consentNotice: string;
  mapLabel: string;
  declineLabel?: string;
  errorLabel?: string;
  preferenceErrorLabel?: string;
  revokeLabel?: string;
}

const DEMO_LOCATION: [number, number] = [51.3127, 9.4797];
const MAP_CONSENT_STORAGE_KEY = "kalyna-map-consent-v1";
const MAP_CONSENT_CHANGE_EVENT = "kalyna-map-consent-change";
const MAP_CONSENT_VERSION = 1;
const MAP_ZOOM_LEVEL = 14;
const MAP_MARKER_RADIUS = 9;
const STORED_MAP_CONSENT_SCHEMA = z
  .object({
    category: z.literal("map"),
    choice: z.enum(["granted", "denied"]),
    version: z.literal(MAP_CONSENT_VERSION),
  })
  .strict();

type ConsentChoice = "pending" | "granted" | "denied" | "invalid";

function readConsentChoice(): ConsentChoice {
  const storedConsent = localStorage.getItem(MAP_CONSENT_STORAGE_KEY);
  if (!storedConsent) return "pending";

  try {
    const parsedConsent = STORED_MAP_CONSENT_SCHEMA.safeParse(JSON.parse(storedConsent));
    return parsedConsent.success ? parsedConsent.data.choice : "invalid";
  } catch {
    return "invalid";
  }
}

function subscribeToConsent(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(MAP_CONSENT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(MAP_CONSENT_CHANGE_EVENT, onStoreChange);
  };
}

function getPendingConsent(): ConsentChoice {
  return "pending";
}

export default function ConsentMap({
  consentLabel,
  consentNotice,
  mapLabel,
  declineLabel = "Ablehnen",
  errorLabel = "Die Karte konnte nicht geladen werden.",
  preferenceErrorLabel = "Die Auswahl gilt nur für diesen Besuch.",
  revokeLabel = "Kartenzustimmung widerrufen",
}: ConsentMapProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const consentChoice = useSyncExternalStore(
    subscribeToConsent,
    readConsentChoice,
    getPendingConsent,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);

  function chooseConsent(choice: "granted" | "denied"): void {
    try {
      localStorage.setItem(
        MAP_CONSENT_STORAGE_KEY,
        JSON.stringify({ category: "map", choice, version: MAP_CONSENT_VERSION }),
      );
      setStorageFailed(false);
      window.dispatchEvent(new Event(MAP_CONSENT_CHANGE_EVENT));
    } catch (error: unknown) {
      setStorageFailed(true);
      console.error("Map consent could not be stored", error);
    }
  }

  useEffect(() => {
    if (consentChoice !== "granted" || !containerRef.current) return;
    let active = true;

    void import("leaflet")
      .then((leaflet) => {
        if (!active || !containerRef.current || mapRef.current) return;
        const map = leaflet.map(containerRef.current).setView(DEMO_LOCATION, MAP_ZOOM_LEVEL);
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
          })
          .addTo(map);
        leaflet
          .circleMarker(DEMO_LOCATION, { radius: MAP_MARKER_RADIUS })
          .addTo(map)
          .bindPopup(mapLabel);
        mapRef.current = map;
      })
      .catch((error: unknown) => {
        if (active) setLoadFailed(true);
        console.error("Map failed to load", error);
      });

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [consentChoice, mapLabel]);

  if (consentChoice !== "granted") {
    return (
      <div className="space-y-3 rounded-2xl border border-ink/10 bg-paper p-5">
        <p className="text-sm text-ink/75">{consentNotice}</p>
        {storageFailed || consentChoice === "invalid" ? (
          <p role="alert">{preferenceErrorLabel}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-11 rounded-lg bg-kalyna px-4 py-2 font-medium text-white"
            onClick={() => chooseConsent("granted")}
          >
            {consentLabel}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-ink/20 px-4 py-2 font-medium"
            onClick={() => chooseConsent("denied")}
          >
            {declineLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} aria-label={mapLabel} className="h-80 rounded-2xl" />
      {loadFailed ? <p role="alert">{errorLabel}</p> : null}
      {storageFailed ? <p role="alert">{preferenceErrorLabel}</p> : null}
      <button
        type="button"
        className="min-h-11 rounded-lg border border-ink/20 px-4 py-2 font-medium"
        onClick={() => chooseConsent("denied")}
      >
        {revokeLabel}
      </button>
    </div>
  );
}
