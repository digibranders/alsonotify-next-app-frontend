import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMailFolders, getMailMessages, getMailMessage, getMailAttachments, createMailFolder, deleteMailFolder, moveMailToFolder } from "../services/mail";

export const useMailFolders = (refetchInterval = 60000) =>
  useQuery({
    queryKey: ["mail", "folders"],
    queryFn: getMailFolders,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    refetchInterval,
  });

export const useMailMessages = (
  folder: string,
  unreadOnly: boolean,
  top = 25,
  search?: string,
  refetchInterval = 60000,
  receivedAfter?: string,
  receivedBefore?: string
) =>
  useInfiniteQuery({
    queryKey: ["mail", "messages", folder, unreadOnly, top, search, receivedAfter, receivedBefore],
    queryFn: ({ pageParam }) =>
      getMailMessages(folder, top, unreadOnly, pageParam, search, receivedAfter, receivedBefore),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.result?.nextLink,
    refetchInterval,
  });

export const useMailMessage = (id?: string, bodyType: "text" | "html" = "html") =>
  useQuery({
    queryKey: ["mail", "message", id, bodyType],
    queryFn: () => getMailMessage(id!, bodyType),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

export const useMailAttachments = (id?: string) =>
  useQuery({
    queryKey: ["mail", "attachments", id],
    queryFn: () => getMailAttachments(id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

export const useCreateFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string) => createMailFolder(displayName),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mail", "folders"] }); },
  });
};

export const useDeleteFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => deleteMailFolder(folderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mail", "folders"] }); },
  });
};

export const useMoveMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, folderId }: { messageId: string; folderId: string }) =>
      moveMailToFolder(messageId, folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mail", "messages"] });
      qc.invalidateQueries({ queryKey: ["mail", "folders"] });
    },
  });
};
