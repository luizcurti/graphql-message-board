import { ArgumentMetadata } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { GraphQLError } from 'graphql';
import { createValidationPipe, formatValidationErrors } from './validation';
import MessageInput from '../resolvers/input/message.input';

function error(constraints?: Record<string, string>, children: ValidationError[] = []) {
  return Object.assign(new ValidationError(), { constraints, children });
}

describe('formatValidationErrors', () => {
  it('joins constraints from all errors', () => {
    const result = formatValidationErrors([
      error({ isEmail: 'Invalid email format' }),
      error({ min: 'page must not be less than 1', max: 'too big' }),
    ]);

    expect(result).toBe('Invalid email format; page must not be less than 1; too big');
  });

  it('includes nested child errors', () => {
    const result = formatValidationErrors([
      error(undefined, [error({ isNotEmpty: 'Content required' })]),
    ]);

    expect(result).toBe('Content required');
  });

  it('returns an empty string for no errors', () => {
    expect(formatValidationErrors([])).toBe('');
    expect(formatValidationErrors([error()])).toBe('');
  });
});

describe('createValidationPipe', () => {
  const metadata: ArgumentMetadata = { type: 'body', metatype: MessageInput };
  const pipe = createValidationPipe();

  it('passes and transforms a valid input', async () => {
    const result = await pipe.transform({ content: 'Hi', userId: 1 }, metadata);

    expect(result).toBeInstanceOf(MessageInput);
    expect(result).toEqual({ content: 'Hi', userId: 1 });
  });

  it('throws a BAD_USER_INPUT GraphQLError with every message', async () => {
    const promise = pipe.transform({ content: '', userId: 0 }, metadata);

    await expect(promise).rejects.toBeInstanceOf(GraphQLError);
    await expect(promise).rejects.toMatchObject({
      message: 'Message content cannot be empty; User ID must be a positive number',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('rejects properties that are not whitelisted', async () => {
    await expect(
      pipe.transform({ content: 'Hi', userId: 1, admin: true }, metadata),
    ).rejects.toMatchObject({ message: 'property admin should not exist' });
  });
});
