import type { Response } from 'express';

// Mock the prisma client so the controller can be unit-tested without a DB.
const findUnique = jest.fn();
const upsert = jest.fn();
const findMany = jest.fn();
const deleteMany = jest.fn();
jest.mock('../context', () => ({
  prisma: { toolDraft: { findUnique, upsert, findMany, deleteMany } },
}));

import { ToolDraftsController } from './tool-drafts.controller';

function mockRes() {
  const res = {} as Response & { statusCode: number; body: unknown };
  res.statusCode = 200;
  res.status = jest.fn((c: number) => {
    res.statusCode = c;
    return res;
  }) as any;
  res.json = jest.fn((b: unknown) => {
    res.body = b;
    return res;
  }) as any;
  return res;
}

const req = (over: Record<string, unknown>) =>
  ({ user: { id: 'u1' }, params: {}, query: {}, body: {}, ...over } as any);

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
  findMany.mockReset();
  deleteMany.mockReset();
});

describe('ToolDraftsController.upsert', () => {
  const validBody = { tool: 'exam', title: 'T', payload: { a: 1 } };

  it('400s when required fields are missing', async () => {
    const res = mockRes();
    await ToolDraftsController.upsert(req({ params: { id: 'd1' }, body: { tool: 'exam' } }), res);
    expect(res.statusCode).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('400s on an unknown tool', async () => {
    const res = mockRes();
    await ToolDraftsController.upsert(req({ params: { id: 'd1' }, body: { ...validBody, tool: 'hacktool' } }), res);
    expect(res.statusCode).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("403s when the draft id belongs to another user (ownership guard)", async () => {
    findUnique.mockResolvedValue({ id: 'd1', userId: 'someone-else' });
    const res = mockRes();
    await ToolDraftsController.upsert(req({ params: { id: 'd1' }, body: validBody }), res);
    expect(res.statusCode).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('upserts scoped to the caller when valid and owned', async () => {
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({ id: 'd1', userId: 'u1', ...validBody });
    const res = mockRes();
    await ToolDraftsController.upsert(req({ params: { id: 'd1' }, body: validBody }), res);
    expect(res.statusCode).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'd1' });
    expect(arg.create.userId).toBe('u1');
  });
});

describe('ToolDraftsController.list / remove', () => {
  it('lists only the caller’s drafts', async () => {
    findMany.mockResolvedValue([]);
    const res = mockRes();
    await ToolDraftsController.list(req({ query: { tool: 'exam' } }), res);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', tool: 'exam' } }),
    );
    expect(res.statusCode).toBe(200);
  });

  it('deletes scoped to id AND caller', async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    const res = mockRes();
    await ToolDraftsController.remove(req({ params: { id: 'd1' } }), res);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'd1', userId: 'u1' } });
    expect(res.statusCode).toBe(200);
  });
});
