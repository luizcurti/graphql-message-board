import { gql } from '@apollo/client';

export interface ICreateOrLoginUserData {
  createOrLoginUser: {
    id: number;
  };
}

export interface ICreateOrLoginUserVars {
  email: string;
}

export const CREATE_OR_LOGIN_USER = gql`
  mutation CreateOrLoginUser($email: String!) {
    createOrLoginUser(data: { email: $email }) {
      id
    }
  }
`;
