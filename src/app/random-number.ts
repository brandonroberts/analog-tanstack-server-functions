import { createServerFn } from '@tanstack/start';

export const randomNumberFn = createServerFn({ method: 'GET' })
  .handler(({ data: name }) => {
    return { name, randomNumber: Math.floor(Math.random() * 100) }
  });