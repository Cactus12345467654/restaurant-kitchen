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
  });
}

export function useCreateModifierGroup(menuItemId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string, locationId: number, menuItemId: number }) => {
      const res = await fetch("/api/modifier-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create modifier group");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
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
      queryClient.invalidateQueries({ queryKey: ['menu-item-modifiers', menuItemId] });
    },
  });
}
