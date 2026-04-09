"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const LEAFLET_CSS_ID = "leaflet-css-cdn";
const LEAFLET_SCRIPT_ID = "leaflet-js-cdn";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const haversineDistanceKm = (fromLat, fromLng, toLat, toLng) => {
  const earthRadiusKm = 6371;
  const degToRad = (deg) => (deg * Math.PI) / 180;
  const dLat = degToRad(toLat - fromLat);
  const dLng = degToRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(fromLat)) *
      Math.cos(degToRad(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

function ensureLeafletCss() {
  if (document.getElementById(LEAFLET_CSS_ID)) return;

  const link = document.createElement("link");
  link.id = LEAFLET_CSS_ID;
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
  link.crossOrigin = "";
  document.head.appendChild(link);
}

function ensureLeafletScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.L) {
      resolve(window.L);
      return;
    }

    const existingScript = document.getElementById(LEAFLET_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = LEAFLET_SCRIPT_ID;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function DeliveryAddressModal({
  isOpen,
  restaurant,
  value,
  onChange,
  onClose,
  onConfirm,
}) {
  const overlayRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const restaurantLat = toNumber(restaurant?.latitude);
  const restaurantLng = toNumber(restaurant?.longitude);
  const radiusKm = toNumber(restaurant?.delivery_radius_km);
  const selectedLat = toNumber(value?.lat);
  const selectedLng = toNumber(value?.lng);

  const distanceKm = useMemo(() => {
    if (
      restaurantLat === null ||
      restaurantLng === null ||
      selectedLat === null ||
      selectedLng === null
    ) {
      return null;
    }

    return haversineDistanceKm(restaurantLat, restaurantLng, selectedLat, selectedLng);
  }, [restaurantLat, restaurantLng, selectedLat, selectedLng]);

  const canValidateRadius = restaurantLat !== null && restaurantLng !== null && radiusKm !== null && radiusKm > 0;
  const isWithinRadius = distanceKm !== null && radiusKm !== null ? distanceKm <= radiusKm : false;
  const hasAddressText = String(value?.address || "").trim().length > 0;
  const hasCoordinates = selectedLat !== null && selectedLng !== null;
  const canSubmit = hasAddressText && hasCoordinates && canValidateRadius && isWithinRadius;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        deliveryMarkerRef.current = null;
        restaurantMarkerRef.current = null;
        radiusCircleRef.current = null;
      }
      setMapReady(false);
      setMapError("");
      return undefined;
    }

    let cancelled = false;

    ensureLeafletCss();
    ensureLeafletScript()
      .then((L) => {
        if (cancelled || !mapRef.current || mapInstanceRef.current || !L) return;

        const fallbackLat = restaurantLat ?? 28.6139;
        const fallbackLng = restaurantLng ?? 77.209;
        const map = L.map(mapRef.current).setView(
          [selectedLat ?? fallbackLat, selectedLng ?? fallbackLng],
          13
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        if (restaurantLat !== null && restaurantLng !== null) {
          restaurantMarkerRef.current = L.marker([restaurantLat, restaurantLng]).addTo(map);
          restaurantMarkerRef.current.bindPopup(`${restaurant?.name || "Restaurant"} service center`);

          if (radiusKm !== null && radiusKm > 0) {
            radiusCircleRef.current = L.circle([restaurantLat, restaurantLng], {
              radius: radiusKm * 1000,
              color: "#dc2626",
              fillColor: "#f87171",
              fillOpacity: 0.18,
            }).addTo(map);
          }
        }

        if (selectedLat !== null && selectedLng !== null) {
          deliveryMarkerRef.current = L.marker([selectedLat, selectedLng], {
            draggable: true,
          }).addTo(map);

          deliveryMarkerRef.current.on("dragend", (event) => {
            const latLng = event.target.getLatLng();
            onChange((current) => ({
              ...current,
              lat: latLng.lat.toFixed(6),
              lng: latLng.lng.toFixed(6),
            }));
          });
        }

        map.on("click", (event) => {
          const latLng = event.latlng;

          if (!deliveryMarkerRef.current) {
            deliveryMarkerRef.current = L.marker([latLng.lat, latLng.lng], {
              draggable: true,
            }).addTo(map);

            deliveryMarkerRef.current.on("dragend", (dragEvent) => {
              const markerLatLng = dragEvent.target.getLatLng();
              onChange((current) => ({
                ...current,
                lat: markerLatLng.lat.toFixed(6),
                lng: markerLatLng.lng.toFixed(6),
              }));
            });
          } else {
            deliveryMarkerRef.current.setLatLng(latLng);
          }

          onChange((current) => ({
            ...current,
            lat: latLng.lat.toFixed(6),
            lng: latLng.lng.toFixed(6),
          }));
        });

        mapInstanceRef.current = map;
        setMapReady(true);
        setMapError("");

        setTimeout(() => {
          map.invalidateSize();
        }, 0);
      })
      .catch(() => {
        if (!cancelled) {
          setMapError("Map could not be loaded right now. You can still use current location and enter the address.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, onChange, radiusKm, restaurant?.name, restaurantLat, restaurantLng, selectedLat, selectedLng]);

  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || selectedLat === null || selectedLng === null) return;

    const map = mapInstanceRef.current;
    const latLng = [selectedLat, selectedLng];

    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.setLatLng(latLng);
    } else if (window.L) {
      deliveryMarkerRef.current = window.L.marker(latLng, { draggable: true }).addTo(map);
      deliveryMarkerRef.current.on("dragend", (event) => {
        const markerLatLng = event.target.getLatLng();
        onChange((current) => ({
          ...current,
          lat: markerLatLng.lat.toFixed(6),
          lng: markerLatLng.lng.toFixed(6),
        }));
      });
    }

    map.panTo(latLng);
  }, [isOpen, onChange, selectedLat, selectedLng]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        deliveryMarkerRef.current = null;
        restaurantMarkerRef.current = null;
        radiusCircleRef.current = null;
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError("This browser does not support location access.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange((current) => ({
          ...current,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
        setLocationLoading(false);
        setMapError("");
      },
      () => {
        setLocationLoading(false);
        setMapError("We couldn't access your current location. You can click on the map instead.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) {
          onClose?.();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef5ff_100%)] px-6 py-5">
            <div>
              <div className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Checkout Step
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">Confirm delivery address</h3>
              <p className="mt-1 text-sm text-slate-600">
                Add the address details and pin the exact delivery point inside the restaurant service radius.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="Close delivery address modal"
            >
              ×
            </button>
          </div>

          <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[360px_1fr]">
            <div className="border-b border-slate-200 bg-slate-50/70 p-5 lg:border-b-0 lg:border-r">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{restaurant?.name || "Restaurant"}</p>
                    <p className="mt-1 text-sm text-slate-500">Delivery service summary</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600">Radius</p>
                    <p className="text-sm font-semibold text-rose-700">
                      {radiusKm !== null && radiusKm > 0 ? `${radiusKm} km` : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-800">Store coordinates</p>
                  <p className="mt-1">
                    {restaurantLat !== null && restaurantLng !== null
                      ? `${restaurantLat}, ${restaurantLng}`
                      : "Not configured"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full delivery address
                </label>
                <textarea
                  rows={4}
                  value={value?.address || ""}
                  onChange={(event) => onChange((current) => ({ ...current, address: event.target.value }))}
                  placeholder="House no, street, landmark, area"
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Latitude</span>
                  <input
                    type="number"
                    step="any"
                    value={value?.lat || ""}
                    onChange={(event) => onChange((current) => ({ ...current, lat: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Longitude</span>
                  <input
                    type="number"
                    step="any"
                    value={value?.lng || ""}
                    onChange={(event) => onChange((current) => ({ ...current, lng: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className="mt-4 w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
              >
                {locationLoading ? "Detecting current location..." : "Use Current Location"}
              </button>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Distance check</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    canValidateRadius && isWithinRadius
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}>
                    {canValidateRadius && isWithinRadius ? "Allowed" : "Check required"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {distanceKm !== null
                    ? `Selected point is ${distanceKm.toFixed(2)} km away.`
                    : "Select a point on the map or use your location."}
                </p>
                <p className={`mt-2 text-sm font-medium ${isWithinRadius ? "text-emerald-600" : "text-rose-600"}`}>
                  {canValidateRadius
                    ? isWithinRadius
                      ? "This address is inside the delivery radius."
                      : "This address is outside the delivery radius."
                    : "Restaurant delivery radius is not configured yet."}
                </p>
              </div>

              {mapError ? (
                <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {mapError}
                </p>
              ) : null}
            </div>

            <div className="bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">Pin delivery location</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Click the map or drag the marker to fine-tune the exact drop point.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Map status</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {mapReady ? "Ready" : "Loading"}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100 shadow-inner">
                <div ref={mapRef} className="h-[460px] w-full bg-slate-100" />
              </div>

              <div className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Restaurant</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {restaurant?.name || "Store"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Selected point</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedLat !== null && selectedLng !== null
                      ? `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`
                      : "Not selected"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Service rule</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {radiusKm !== null && radiusKm > 0 ? `Within ${radiusKm} km` : "Radius missing"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Confirm the delivery address only after the map pin matches the exact drop point.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm?.()}
                disabled={!canSubmit}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Address
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
