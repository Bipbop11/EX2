import type { Explanation, Picture } from "@shared/schemas/apod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

/* Talking to /api/pictures and /api/explanations from the browser. */

export const nasaKeys = {
  pictures: ["pictures"] as const,
};

/**
 * A random batch of pictures. Every fetch is a new random batch, so it
 * never refetches on its own: `refetch()` is the "More pictures" button.
 */
export function usePictures() {
  return useQuery({
    queryKey: nasaKeys.pictures,
    queryFn: () => api<Picture[]>("/api/pictures"),
    staleTime: Infinity,
  });
}

/**
 * Asks for one picture's Hebrew explanation. Use one per card, so each card
 * knows whether its own request is running or failed.
 */
export function useExplainPicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<Explanation>(`/api/explanations/${encodeURIComponent(id)}`),
    onSuccess: (explanation) => {
      /*
       * Write the answer into the picture already on screen, instead of
       * fetching the list again (which would bring a new random batch).
       */
      queryClient.setQueryData<Picture[]>(nasaKeys.pictures, (pictures) =>
        pictures?.map((picture) =>
          picture.id === explanation.date
            ? { ...picture, hebrew: explanation }
            : picture,
        ),
      );
    },
  });
}

/** The tags in Hebrew, for showing on a card. */
export const TAG_LABELS: Record<Explanation["tags"][number], string> = {
  galaxy: "גלקסיה",
  planet: "כוכב לכת",
  nebula: "ערפילית",
  earth: "כדור הארץ",
  sun: "שמש",
  star: "כוכב",
  moon: "ירח",
  black_hole: "חור שחור",
  spacecraft: "חללית",
};
