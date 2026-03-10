import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type User = z.infer<typeof api.auth.me.responses[200]>;

export function getUserRoles(user: (User & { role?: string }) | null | undefined): string[] {
  if (!user) return [];
  return Array.isArray(user.roles) ? user.roles : ((user as any).role ? [(user as any).role] : []);
}

export function hasRole(user: User | null | undefined, role: string): boolean {
  return getUserRoles(user).includes(role);
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof api.auth.login.input>) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to login");
      }
      return res.json();
    },
    onSuccess: (user) => {
      // Uzreiz iestatām lietotāju cache, lai navigācija strādātu no pirmās reizes
      // (negaidām refetch, kas varētu radīt race condition)
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to logout");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      window.location.href = "/login";
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutateAsync,
  };
}
