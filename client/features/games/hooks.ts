import type { Game, SaveGameInput } from "@shared/schemas/games";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

/* Talking to /api/games from the browser. Same shape as features/events. */

export const gameKeys = {
  all: ["games"] as const,
};

/** Every game saved on this account, newest first. */
export function useGames() {
  return useQuery({
    queryKey: gameKeys.all,
    queryFn: () => api<Game[]>("/api/games"),
  });
}

/** Saves a finished game. Send the moves; the server works out the result. */
export function useSaveGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveGameInput) =>
      api<Game>("/api/games", { method: "POST", body: input }),
    onSuccess: () => {
      // The list below the board is now missing this game - fetch it again.
      void queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}
