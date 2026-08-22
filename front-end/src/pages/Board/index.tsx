import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaTrash, FaPaperPlane, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useMessages } from '../../hooks/useMessages';
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

export default function Board() {
  const [searchParams] = useSearchParams();
  const userId = Number(searchParams.get('id'));

  const [content, setContent] = useState<string>('');

  const {
    loading,
    creating,
    messages,
    total,
    totalPages,
    page,
    setPage,
    sendMessage,
    removeMessage,
  } = useMessages(userId);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();

    if (sendMessage(content)) {
      setContent('');
    }
  }

  if (loading) return <p style={{ color: '#fff', textAlign: 'center' }}>Loading messages...</p>;

  return (
    <Container>
      <Header>Message Board</Header>

      <Form onSubmit={handleSend}>
        <Textarea
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
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
                onClick={() => removeMessage(item.id)}
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
