import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export const queryKeys = {
  me: (year: number) => ["me", year] as const,
  absences: (year: number) => ["absences", year] as const,
  overview: (year: number) => ["overview", year] as const,
  users: ["users"] as const,
};
