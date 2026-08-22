import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  CREATE_OR_LOGIN_USER,
  ICreateOrLoginUserData,
  ICreateOrLoginUserVars,
} from '../graphql/user';

export function useAuth() {
  const navigate = useNavigate();

  const [createOrLoginUser, { data, loading }] = useMutation<
    ICreateOrLoginUserData,
    ICreateOrLoginUserVars
  >(CREATE_OR_LOGIN_USER, {
    onError: (err) => alert(err.message),
  });

  useEffect(() => {
    if (data) {
      navigate(`/dashboard?id=${data.createOrLoginUser.id}`);
    }
  }, [data, navigate]);

  function login(email: string) {
    if (email.trim().length < 1) {
      alert('Insert a valid e-mail!');
      return;
    }

    createOrLoginUser({ variables: { email: email.trim() } });
  }

  return { login, loading };
}
