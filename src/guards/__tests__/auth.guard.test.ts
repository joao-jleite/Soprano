import { describe, it, expect, vi } from 'vitest';
import { requireAuth, requireRole, requireAuthAndRole, AuthError, PermissionError } from '../auth.guard';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeClient(user: unknown, role?: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : new Error('no user') }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: role ? { role } : null, error: null }),
    }),
  } as unknown as SupabaseClient;
}

describe('requireAuth', () => {
  it('retorna o usuário quando autenticado', async () => {
    const user = { id: 'user-1', email: 'a@b.com' };
    const client = makeClient(user);
    const result = await requireAuth(client);
    expect(result).toEqual(user);
  });

  it('lança AuthError quando não autenticado', async () => {
    const client = makeClient(null);
    await expect(requireAuth(client)).rejects.toThrow(AuthError);
  });
});

describe('requireRole', () => {
  it('retorna role quando tem permissão', async () => {
    const client = makeClient({ id: 'u1' }, 'admin');
    const role = await requireRole(client, 'u1', 'admin');
    expect(role).toBe('admin');
  });

  it('lança PermissionError quando role não está na lista', async () => {
    const client = makeClient({ id: 'u1' }, 'supervisor');
    await expect(requireRole(client, 'u1', 'admin')).rejects.toThrow(PermissionError);
  });

  it('aceita múltiplos roles', async () => {
    const client = makeClient({ id: 'u1' }, 'supervisor');
    const role = await requireRole(client, 'u1', 'admin', 'supervisor');
    expect(role).toBe('supervisor');
  });
});

describe('requireAuthAndRole', () => {
  it('retorna user e role', async () => {
    const user = { id: 'u1' };
    const client = makeClient(user, 'admin');
    const result = await requireAuthAndRole(client, 'admin');
    expect(result.user).toEqual(user);
    expect(result.role).toBe('admin');
  });

  it('lança AuthError antes de checar role', async () => {
    const client = makeClient(null);
    await expect(requireAuthAndRole(client, 'admin')).rejects.toThrow(AuthError);
  });
});
