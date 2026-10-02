import { ValidationError, ValidationPipe } from '@nestjs/common';
import { GraphQLError } from 'graphql';

// Flattens class-validator errors into one message, including nested ones.
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .flatMap(error => [
      ...Object.values(error.constraints ?? {}),
      formatValidationErrors(error.children ?? []),
    ])
    .filter(Boolean)
    .join('; ');
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: errors =>
      new GraphQLError(formatValidationErrors(errors), {
        extensions: { code: 'BAD_USER_INPUT' },
      }),
  });
}
