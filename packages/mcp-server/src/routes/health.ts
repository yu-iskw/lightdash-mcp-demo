import type { Request, Response, Router } from 'express';

export function registerHealthRoute(router: Router): void {
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });
}
