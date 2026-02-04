import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotes, createNote, updateNote, deleteNote, archiveNote, unarchiveNote } from "../services/notes";
import { mapNoteToDomain } from "../utils/mappers/note";
import { UpdateNoteDto } from "../types/dto/note.dto";
import { queryKeys } from "../lib/queryKeys";

export const useNotes = (
    skip: number = 0,
    limit: number = 100,
    archived: boolean = false,
    options?: { enabled?: boolean; staleTime?: number }
) => {
    return useQuery({
        queryKey: queryKeys.notes.list({ skip, limit, archived }),
        queryFn: () => getNotes(skip, limit, archived),
        staleTime: options?.staleTime || 30000,
        enabled: options?.enabled,
        select: (data) => ({
            ...data,
            result: data.result ? data.result.map(mapNoteToDomain) : []
        })
    });
};

export const useCreateNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createNote, // params type inferred from service
        onSuccess: () => {
            // Invalidate all notes queries
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
        }
    });
};

export const useUpdateNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateNoteDto }) => updateNote(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
        }
    });
};

export const useDeleteNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
        }
    });
};

export const useArchiveNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: archiveNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
        }
    });
};

export const useUnarchiveNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: unarchiveNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
        }
    });
};
