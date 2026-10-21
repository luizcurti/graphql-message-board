import styled from 'styled-components';

export const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Header = styled.h1`
  color: #fff;
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 8px;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const Textarea = styled.textarea`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 12px 16px;
  color: #fff;
  font-size: 14px;
  resize: vertical;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:focus {
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

export const SendButton = styled.button`
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #7159c1;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const MessageItem = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: ${({ $isOwn }) =>
    $isOwn ? 'rgba(113, 89, 193, 0.25)' : 'rgba(0, 0, 0, 0.3)'};
  border: 1px solid ${({ $isOwn }) =>
    $isOwn ? 'rgba(113, 89, 193, 0.5)' : 'transparent'};
  padding: 16px 20px;
  border-radius: 6px;
  color: #fff;
`;

export const MessageContent = styled.p`
  font-size: 15px;
  line-height: 1.5;
  margin: 0;
`;

export const MessageActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const MessageAuthor = styled.span`
  font-size: 11px;
  font-weight: bold;
  opacity: 0.45;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const EmptyState = styled.p`
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
`;

export const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0 8px;
`;

export const PageButton = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

export const PageInfo = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
`;
