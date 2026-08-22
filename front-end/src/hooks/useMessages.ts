import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_ALL_MESSAGES,
  CREATE_MESSAGE,
  DELETE_MESSAGE,
  IGetMessagesData,
  IGetMessagesVars,
  ICreateMessageVars,
  IDeleteMessageVars,
} from '../graphql/message';

const PAGE_LIMIT = 10;

export function useMessages(userId: number) {
  const [page, setPage] = useState<number>(1);

  const { loading, data, refetch } = useQuery<IGetMessagesData, IGetMessagesVars>(
    GET_ALL_MESSAGES,
    { variables: { page, limit: PAGE_LIMIT } },
  );

  const [createMessage, { loading: creating }] = useMutation<unknown, ICreateMessageVars>(
    CREATE_MESSAGE,
    {
      onCompleted: () => {
        setPage(1);
        refetch({ page: 1, limit: PAGE_LIMIT });
      },
      onError: (err) => alert(err.message),
    },
  );

  const [deleteMessage] = useMutation<unknown, IDeleteMessageVars>(DELETE_MESSAGE, {
    onCompleted: () => refetch({ page, limit: PAGE_LIMIT }),
    onError: (err) => alert(err.message),
  });

  function sendMessage(content: string) {
    if (!userId) {
      alert('User not identified. Please log in again.');
      return false;
    }

    if (content.trim().length < 1) {
      alert('Message cannot be empty.');
      return false;
    }

    createMessage({ variables: { content: content.trim(), userId } });
    return true;
  }

  function removeMessage(messageId: number) {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    deleteMessage({ variables: { id: messageId, userId } });
  }

  const paginatedData = data?.getMessages;

  return {
    loading,
    creating,
    messages: paginatedData?.items ?? [],
    total: paginatedData?.total ?? 0,
    totalPages: paginatedData?.pages ?? 1,
    page,
    setPage,
    sendMessage,
    removeMessage,
  };
}
