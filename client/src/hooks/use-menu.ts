import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type MenuItem = z.infer<typeof api.menuItems.list.responses[200]>[0];
type CreateMenuItem = z.infer<typeof api.menuItems.create.input>;
type UpdateMenuItem = z.infer<typeof api.menuItems.update.input>;

export function useMenuItems(locationId: number | null) {
  return useQuery<MenuItem[]>({
    queryKey: ['menu-items', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const url = buildUrl(api.menuItems.list.path, { locationId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch menu items");
      return res.json();
    },
    enabled: !!locationId,
  });
}

export function useCreateMenuItem(locationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMenuItem) => {
      if (!locationId) throw new Error("Location ID required");
      const url = buildUrl(api.menuItems.create.path, { locationId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create menu item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', locationId] });
    },
  });
}

export function useUpdateMenuItem(locationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateMenuItem) => {
      if (!locationId) throw new Error("Location ID required");
      const url = buildUrl(api.menuItems.update.path, { locationId, id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update menu item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', locationId] });
    },
  });
}

export function useDeleteMenuItem(locationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!locationId) throw new Error("Location ID required");
      const url = buildUrl(api.menuItems.delete.path, { locationId, id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete menu item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', locationId] });
    },
  });
}

export function useMenuItemModifiers(menuItemId: number | null) {
  return useQuery<any[]>({
    queryKey: ['menu-item-modifiers', menuItemId],
    queryFn: async () => {
      if (!menuItemId) return [];
      const res = await fetch(`/api/menu-items/${menuItemId}/modifiers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch modifiers");
      return res.json();
    },
    enabled: !!menuItemId,
    gcTime: 1000 * 60 * 5,
  });
}

export function useLocationModifierGroups(locationId: number | null) {
  return useQuery<any[]>({
    queryKey: ['location-modifier-groups', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const res = await fetch(`/api/locations/${locationId}/modifier-groups`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch modifier groups");
      return res.json();
    },
    enabled: !!locationId,
  });
}

export function useCreateModifierGroup(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string, locationId: number, menuItemId?: number | null }) => {
      const res = await fetch("/api/modifier-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to create modifier group");
      }
      return res.json();
    },
    onSuccess: (_newGroup, variables) => {
      if (menuItemId != null) {
        queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
      }
      if (variables.locationId != null) {
        queryClient.invalidateQueries({ queryKey: ['location-modifier-groups', variables.locationId] });
      }
    },
  });
}

export function useAttachModifierGroupToItem(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ modifierGroupId }: { modifierGroupId: number }) => {
      if (!menuItemId) throw new Error("menuItemId required");
      const res = await fetch(`/api/menu-items/${menuItemId}/modifier-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modifierGroupId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to attach");
      }
      return res.json();
    },
    onSuccess: () => {
      if (menuItemId != null) {
        queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
      }
    },
  });
}

export function useDetachModifierGroupFromItem(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: number) => {
      if (!menuItemId) throw new Error("menuItemId required");
      const res = await fetch(`/api/menu-items/${menuItemId}/modifier-groups/${groupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to remove");
      }
    },
    onSuccess: () => {
      if (menuItemId != null) {
        queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
      }
    },
  });
}

export function useCreateModifierOption(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string, priceDelta: number, modifierGroupId: number }) => {
      const res = await fetch("/api/modifier-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create modifier option");
      }
      return res.json();
    },
    onSuccess: () => {
      if (menuItemId != null) {
        queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
      }
    },
  });
}

export function useUpdateModifierGroup(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      sortOrder?: number;
      isActive?: boolean;
      isRequired?: boolean;
      dependsOnGroupId?: number | null;
      dependsOnOptionId?: number | null;
    }) => {
      const { id, ...rest } = payload;
      const res = await fetch(`/api/modifier-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update modifier group");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (menuItemId == null) return;
      const onlyIsRequired =
        variables.isRequired !== undefined &&
        variables.sortOrder === undefined &&
        variables.isActive === undefined &&
        variables.dependsOnGroupId === undefined &&
        variables.dependsOnOptionId === undefined;
      if (onlyIsRequired) {
        const confirmed = data?.isRequired ?? (data as any)?.is_required ?? variables.isRequired;
        queryClient.setQueryData(
          ['menu-item-modifiers', menuItemId],
          (old: any[] | undefined) => {
            if (!old) return old;
            return old.map((g: any) =>
              g.id === variables.id
                ? { ...g, isRequired: confirmed, is_required: confirmed }
                : g
            );
          }
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
    },
  });
}

export function useDeleteModifierGroup(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/modifier-groups/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete modifier group");
    },
    onSuccess: () => {
      if (menuItemId != null) {
        queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
      }
    },
  });
}

export function useUpdateModifierOption(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      name?: string;
      priceDelta?: number;
      sortOrder?: number;
      isActive?: boolean;
    }) => {
      const { id, ...rest } = payload;
      const body: Record<string, unknown> = {};
      if (rest.name !== undefined) body.name = rest.name;
      if (rest.priceDelta !== undefined) body.priceDelta = rest.priceDelta;
      if (rest.sortOrder !== undefined) body.sortOrder = rest.sortOrder;
      if (rest.isActive !== undefined) body.isActive = rest.isActive;
      if (Object.keys(body).length === 0) {
        return Promise.reject(new Error("No updates provided"));
      }
      const res = await fetch(`/api/modifier-options/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const contentType = res.headers.get("Content-Type") || "";
      const isJson = contentType.includes("application/json");
      if (!res.ok) {
        let message = "Failed to update modifier option";
        try {
          if (isJson) {
            const err = (await res.json()) as { error?: string; message?: string };
            message = err?.error || err?.message || message;
          } else {
            const text = await res.text();
            message = text?.slice(0, 200) || message;
          }
        } catch (_) {
          // body already consumed or parse failed
        }
        throw new Error(message);
      }
      if (!isJson) {
        throw new Error("Server returned non-JSON response");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      if (menuItemId == null) return;
      const onlyIsActive =
        variables.isActive !== undefined &&
        variables.name === undefined &&
        variables.priceDelta === undefined &&
        variables.sortOrder === undefined;
      if (onlyIsActive) return;
      queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
    },
  });
}

export function useDeleteModifierOption(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/modifier-options/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const ct = res.headers.get("Content-Type") || "";
        let msg = "Failed to delete modifier option";
        if (ct.includes("application/json")) {
          try {
            const err = (await res.json()) as { error?: string };
            msg = err?.error || msg;
          } catch (_) {}
        }
        throw new Error(msg);
      }
      if (res.status === 204) return undefined;
      return res.json();
    },
    onSuccess: () => {
      if (menuItemId != null) {
        queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
      }
    },
  });
}
