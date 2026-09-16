import type { NextFunction, Request, Response } from 'express';
import { originCheck } from './origin-check.middleware';

const check = originCheck(['https://hr.example.com']);

function run(method: string, origin?: string) {
  const req = {
    method,
    protocol: 'https',
    host: 'api.example.com',
    get: (name: string) => (name === 'origin' ? origin : undefined),
  } as unknown as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  check(req, res as unknown as Response, next as NextFunction);
  return { next, res };
}

describe('originCheck', () => {
  it('lets reads through from any origin', () => {
    expect(run('GET', 'https://evil.example').next).toHaveBeenCalled();
  });

  it('lets writes through from an allowed origin', () => {
    expect(run('POST', 'https://hr.example.com').next).toHaveBeenCalled();
  });

  it("lets writes through from the API's own origin", () => {
    expect(run('POST', 'https://api.example.com').next).toHaveBeenCalled();
  });

  it('lets writes through without an Origin header', () => {
    expect(run('DELETE').next).toHaveBeenCalled();
  });

  it('blocks writes from any other origin', () => {
    const { next, res } = run('POST', 'https://evil.example');

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
