import { gql } from '@apollo/client';

export interface IMessage {
  id: number;
  content: string;
  userId: number;
  user: {
    email: string;
  };
}

export interface IPaginatedMessages {
  items: IMessage[];
  total: number;
  page: number;
  pages: number;
}

export interface IGetMessagesData {
  getMessages: IPaginatedMessages;
}

export interface IGetMessagesVars {
  page: number;
  limit: number;
}

export interface ICreateMessageVars {
  content: string;
  userId: number;
}

export interface IDeleteMessageVars {
  id: number;
  userId: number;
}

export interface IMessageAddedData {
  messageAdded: IMessage;
}

export const GET_ALL_MESSAGES = gql`
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

export const CREATE_MESSAGE = gql`
  mutation CreateMessage($content: String!, $userId: Float!) {
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

export const DELETE_MESSAGE = gql`
  mutation DeleteMessage($id: Float!, $userId: Float!) {
    deleteMessage(data: { id: $id, userId: $userId }) {
      id
    }
  }
`;

export const MESSAGE_ADDED = gql`
  subscription MessageAdded {
    messageAdded {
      id
      content
      userId
      user {
        email
      }
    }
  }
`;
