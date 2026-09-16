import { createUsernameLoginHandler } from './handler.ts';

// Runtime supplied by Supabase Edge (Deno); no frontend dependency or secret.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
Deno.serve(createUsernameLoginHandler({ env: name => Deno.env.get(name), fetch, crypto }));
