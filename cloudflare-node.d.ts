declare module 'cloudflare:node' {
  import type { Server } from 'node:http';

  export function httpServerHandler(
    serverOrOptions: Server | { port: number }
  ): {
    fetch(request: Request): Promise<Response>;
  };
}
