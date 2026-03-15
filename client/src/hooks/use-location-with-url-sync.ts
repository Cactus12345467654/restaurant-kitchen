import { useEffect, useState } from "react";
import { useAuth, canSelectLocation, hasRole } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";

function getLocationIdFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("locationId")) || null;
  return Number.isFinite(id) ? id : null;
}

function updateLocationInUrl(locationId: number | null) {
  const url = new URL(window.location.href);
  if (locationId != null) {
    url.searchParams.set("locationId", String(locationId));
  } else {
    url.searchParams.delete("locationId");
  }
  window.history.replaceState({}, "", url.toString());
}

/**
 * Shared hook for location selection with URL sync.
 * Keeps selectedLocationId in sync with ?locationId= query param.
 * Works for existing and future locations.
 */
export function useLocationWithUrlSync() {
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const isSuperAdmin = hasRole(user, "super_admin");
  const showLocationSelector = canSelectLocation(user);
  const userLocationId = user?.locationId ?? (user as { location_id?: number })?.location_id ?? null;

  const [locationId, setLocationIdState] = useState<number | null>(() => {
    const fromUrl = getLocationIdFromUrl();
    return fromUrl ?? (isSuperAdmin ? null : showLocationSelector ? null : userLocationId);
  });

  useEffect(() => {
    const fromUrl = getLocationIdFromUrl();
    if (fromUrl != null) {
      setLocationIdState(fromUrl);
    } else if (userLocationId != null && !showLocationSelector) {
      setLocationIdState(userLocationId);
    } else if (showLocationSelector && locations?.length && !locationId) {
      const first = locations[0].id;
      setLocationIdState(first);
      updateLocationInUrl(first);
    } else if (isSuperAdmin && locations?.length && !locationId) {
      const first = locations[0].id;
      setLocationIdState(first);
      updateLocationInUrl(first);
    }
  }, [isSuperAdmin, showLocationSelector, userLocationId, locations, locationId]);

  useEffect(() => {
    if (locations?.length && locationId != null) {
      const exists = locations.some((l) => l.id === locationId);
      if (!exists) {
        const fallback = locations[0].id;
        setLocationIdState(fallback);
        updateLocationInUrl(fallback);
      }
    }
  }, [locations, locationId]);

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = getLocationIdFromUrl();
      if (fromUrl != null) setLocationIdState(fromUrl);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setLocationId = (id: number | null) => {
    setLocationIdState(id);
    if (id != null) updateLocationInUrl(id);
  };

  return {
    locationId,
    setLocationId,
    locations,
    showLocationSelector,
    isSuperAdmin,
  };
}
