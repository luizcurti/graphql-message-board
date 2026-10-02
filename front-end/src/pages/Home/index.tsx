import React, { useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { Container, Button, Content, Input } from './styles';

const Home: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const { login } = useAuth();

  function handleRegister(e: React.MouseEvent) {
    e.preventDefault();
    login(input);
    setInput('');
  }

  return (
    <Container>
      <Content>
        <form>
          <Input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder="E-mail"
          />

          <Button onClick={handleRegister}>
            <FaCheck size={36} color="#fff" />
            <span>Login or Register</span>
          </Button>
        </form>
      </Content>
    </Container>
  );
};

export default Home;
