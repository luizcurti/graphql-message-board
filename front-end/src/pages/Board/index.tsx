import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import { FaTrash, FaPaperPlane, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import {
  Container,
  MessageItem,
  MessageContent,
  MessageAuthor,
  MessageActions,
  Form,
  Textarea,
  SendButton,
  EmptyState,
  Header,
  Pagination,
  PageButton,
  PageInfo,
} from './styles';

interface IMessage {
  id: number;
  content: string;
  userId: number;
  user: {
    email: string;
  };
}

interface IPaginatedMessages {
  items: IMessage[];
  total: number;
  page: number;
  pages: number;
}

const GET_ALL_MESSAGES = gql`
  query GetMessages($page: Int, $limit: Int) {
    getMessages(page: $page, limit: $limit) {
      items {
        id
        content
        userId
        user {
          email
        }
      }
      total
      page
      pages
    }
  }
`;

const CREATE_MESSAGE = gql`
  mutation($content: String!, $userId: Float!) {
    createMessage(data: { content: $content, userId: $userId }) {
      id
      content
      userId
      user {
        email
      }
    }
  }
`;

const DELETE_MESSAGE = gql`
  mutation($id: Float!, $userId: Float!) {
    deleteMessage(data: { id: $id, userId: $userId }) {
      id
    }
  }
`;

const PAGE_LIMIT = 10;

export default function Board() {
  const [searchParams] = useSearchParams();
  const userId = Number(searchParams.get('id'));

  const [content, setContent] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const { loading, data, refetch } = useQuery<{ getMessages: IPaginatedMessages }>(
    GET_ALL_MESSAGES,
    { variables: { page, limit: PAGE_LIMIT } }
  );

  const [createMessage, { loading: creating }] = useMutation(CREATE_MESSAGE, {
    onCompleted: () => {
      setContent('');
      setPage(1);
      refetch({ page: 1, limit: PAGE_LIMIT });
    },
    onError: (err) => alert(err.message),
  });

  const [deleteMessage] = useMutation(DELETE_MESSAGE, {
    onCompleted: () => refetch({ page, limit: PAGE_LIMIT }),
    onError: (err) => alert(err.message),
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) {
      alert('User not identified. Please log in again.');
      return;
    }

    if (content.trim().length < 1) {
      alert('Message cannot be empty.');
      return;
    }

    createMessage({ variables: { content: content.trim(), userId } });
  }

  function handleDelete(messageId: number) {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    deleteMessage({ variables: { id: messageId, userId } });
  }

  const paginatedData = data?.getMessages;
  const messages = paginatedData?.items ?? [];
  const totalPages = paginatedData?.pages ?? 1;
  const total = paginatedData?.total ?? 0;

  if (loading) return <p style={{ color: '#fff', textAlign: 'center' }}>Loading messages...</p>;

  return (
    <Container>
      <Header>Message Board</Header>

      <Form onSubmit={handleSend}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a message..."
          rows={3}
        />
        <SendButton type="submit" disabled={creating}>
          <FaPaperPlane size={16} />
          <span>{creating ? 'Sending...' : 'Send'}</span>
        </SendButton>
      </Form>

      {messages.length === 0 && (
        <EmptyState>No messages yet. Be the first to write one!</EmptyState>
      )}

      {messages.map((item) => (
        <MessageItem key={item.id} $isOwn={item.userId === userId}>
          <MessageContent>{item.content}</MessageContent>
          <MessageActions>
            <MessageAuthor>{item.user.email}</MessageAuthor>
            {item.userId === userId && (
              <FaTrash
                size={13}
                title="Delete message"
                style={{ cursor: 'pointer', opacity: 0.6 }}
                onClick={() => handleDelete(item.id)}
              />
            )}
          </MessageActions>
        </MessageItem>
      ))}

      {totalPages > 1 && (
        <Pagination>
          <PageButton
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <FaChevronLeft size={12} />
          </PageButton>

          <PageInfo>
            {page} / {totalPages} &nbsp;·&nbsp; {total} messages
          </PageInfo>

          <PageButton
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <FaChevronRight size={12} />
          </PageButton>
        </Pagination>
      )}
    </Container>
  );
}
