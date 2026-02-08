import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getMailFolders, getMailMessages, getMailMessage, getMailAttachments } from "../services/mail";

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
  refetchInterval = 60000
) =>
  useInfiniteQuery({
    queryKey: ["mail", "messages", folder, unreadOnly, top, search],
    queryFn: ({ pageParam }) => getMailMessages(folder, top, unreadOnly, pageParam, search),
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
