import { describe, it, expect } from 'vitest';
import {
  createOperatorToken,
  verifyOperatorToken,
  getOperatorInfo,
  requireOperatorRole,
} from '../middleware/auth';

describe('BridgeGuard RBAC & Operator Authentication', () => {
  const testSecret = 'test-secret-key-for-vitest-suite-12345';

  describe('Cryptographic Operator Tokens', () => {
    it('creates and verifies a valid admin token', () => {
      const token = createOperatorToken(
        { operatorId: 'op-admin-1', operatorName: 'Alice Admin', role: 'admin' },
        testSecret,
      );
      const verified = verifyOperatorToken(token, testSecret);
      expect(verified).not.toBeNull();
      expect(verified?.operatorId).toBe('op-admin-1');
      expect(verified?.operatorRole).toBe('admin');
      expect(verified?.operatorName).toBe('Alice Admin');
    });

    it('creates and verifies a valid operator token', () => {
      const token = createOperatorToken(
        { operatorId: 'op-soc-2', operatorName: 'Bob Operator', role: 'operator' },
        testSecret,
      );
      const verified = verifyOperatorToken(token, testSecret);
      expect(verified).not.toBeNull();
      expect(verified?.operatorId).toBe('op-soc-2');
      expect(verified?.operatorRole).toBe('operator');
      expect(verified?.operatorName).toBe('Bob Operator');
    });

    it('rejects a tampered token payload', () => {
      const token = createOperatorToken(
        { operatorId: 'op-viewer-3', operatorName: 'Eve', role: 'viewer' },
        testSecret,
      );
      const [payloadB64, sig] = token.split('.');
      // Tamper payload to claim admin
      const tamperedPayload = Buffer.from(
        JSON.stringify({ operatorId: 'op-viewer-3', operatorName: 'Eve', role: 'admin' }),
      ).toString('base64url');
      const tamperedToken = `${tamperedPayload}.${sig}`;

      const verified = verifyOperatorToken(tamperedToken, testSecret);
      expect(verified).toBeNull();
    });

    it('rejects a tampered signature', () => {
      const token = createOperatorToken(
        { operatorId: 'op-admin-1', operatorName: 'Alice Admin', role: 'admin' },
        testSecret,
      );
      const [payloadB64] = token.split('.');
      const tamperedToken = `${payloadB64}.invalidsignature1234567890`;

      const verified = verifyOperatorToken(tamperedToken, testSecret);
      expect(verified).toBeNull();
    });

    it('rejects an expired token', () => {
      const token = createOperatorToken(
        {
          operatorId: 'op-admin-1',
          operatorName: 'Alice Admin',
          role: 'admin',
          exp: Date.now() - 5000, // Expired 5 seconds ago
        },
        testSecret,
      );
      const verified = verifyOperatorToken(token, testSecret);
      expect(verified).toBeNull();
    });

    it('rejects malformed token strings', () => {
      expect(verifyOperatorToken('')).toBeNull();
      expect(verifyOperatorToken('not-a-token')).toBeNull();
      expect(verifyOperatorToken('a.b.c')).toBeNull();
    });
  });

  describe('RBAC Spoof Prevention in getOperatorInfo', () => {
    it('NEVER trusts client-supplied x-operator-role: admin without valid token', () => {
      const fakeRequest: any = {
        headers: {
          'x-operator-role': 'admin',
          'x-operator-id': 'hacker',
          'x-operator-name': 'Fake Admin',
        },
      };

      const operator = getOperatorInfo(fakeRequest);
      // Must be clamped to viewer!
      expect(operator.operatorRole).toBe('viewer');
      expect(operator.operatorId).toBe('hacker');
    });

    it('authenticates admin via valid Authorization Bearer token', () => {
      const token = createOperatorToken(
        { operatorId: 'real-admin', operatorName: 'Real Admin', role: 'admin' },
      );
      const request: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const operator = getOperatorInfo(request);
      expect(operator.operatorRole).toBe('admin');
      expect(operator.operatorId).toBe('real-admin');
      expect(operator.operatorName).toBe('Real Admin');
    });

    it('authenticates operator via x-operator-token header', () => {
      const token = createOperatorToken(
        { operatorId: 'real-operator', operatorName: 'SOC Analyst', role: 'operator' },
      );
      const request: any = {
        headers: {
          'x-operator-token': token,
        },
      };

      const operator = getOperatorInfo(request);
      expect(operator.operatorRole).toBe('operator');
      expect(operator.operatorId).toBe('real-operator');
    });

    it('authenticates dev admin token in non-production environments', () => {
      const request: any = {
        headers: {
          authorization: 'Bearer bg-dev-admin-token',
        },
      };

      const operator = getOperatorInfo(request);
      expect(operator.operatorRole).toBe('admin');
    });

    it('authenticates dev operator token in non-production environments', () => {
      const request: any = {
        headers: {
          authorization: 'Bearer bg-dev-operator-token',
        },
      };

      const operator = getOperatorInfo(request);
      expect(operator.operatorRole).toBe('operator');
    });

    it('defaults to viewer when no credentials are provided', () => {
      const request: any = {
        headers: {},
      };

      const operator = getOperatorInfo(request);
      expect(operator.operatorRole).toBe('viewer');
      expect(operator.operatorId).toBe('viewer');
    });
  });

  describe('requireOperatorRole Middleware Enforcer', () => {
    it('blocks viewer from admin-only routes with 403 Forbidden', async () => {
      let sentCode = 0;
      let sentBody: any = null;

      const fakeReply: any = {
        code: (status: number) => {
          sentCode = status;
          return {
            send: (body: any) => {
              sentBody = body;
            },
          };
        },
      };

      // Attacker trying to spoof admin
      const fakeRequest: any = {
        headers: {
          'x-operator-role': 'admin', // Spoofed!
        },
      };

      const middleware = requireOperatorRole(['admin']);
      await middleware(fakeRequest, fakeReply);

      expect(sentCode).toBe(403);
      expect(sentBody?.error).toBe('Forbidden');
      expect(sentBody?.message).toContain('Requires role: admin');
    });

    it('blocks operator from admin-only routes with 403 Forbidden', async () => {
      let sentCode = 0;
      const fakeReply: any = {
        code: (status: number) => {
          sentCode = status;
          return { send: () => {} };
        },
      };

      const token = createOperatorToken(
        { operatorId: 'op-1', operatorName: 'Operator', role: 'operator' },
      );
      const fakeRequest: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const middleware = requireOperatorRole(['admin']);
      await middleware(fakeRequest, fakeReply);

      expect(sentCode).toBe(403);
    });

    it('allows admin on admin-only routes without sending error', async () => {
      let sentCode = 0;
      const fakeReply: any = {
        code: (status: number) => {
          sentCode = status;
          return { send: () => {} };
        },
      };

      const token = createOperatorToken(
        { operatorId: 'admin-1', operatorName: 'Admin', role: 'admin' },
      );
      const fakeRequest: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const middleware = requireOperatorRole(['admin']);
      await middleware(fakeRequest, fakeReply);

      expect(sentCode).toBe(0); // Not called
    });

    it('allows operator on operator-or-admin routes', async () => {
      let sentCode = 0;
      const fakeReply: any = {
        code: (status: number) => {
          sentCode = status;
          return { send: () => {} };
        },
      };

      const token = createOperatorToken(
        { operatorId: 'op-1', operatorName: 'Operator', role: 'operator' },
      );
      const fakeRequest: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const middleware = requireOperatorRole(['admin', 'operator']);
      await middleware(fakeRequest, fakeReply);

      expect(sentCode).toBe(0); // Not called
    });
  });
});
