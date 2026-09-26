import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

export type OperatorRole = 'admin' | 'operator' | 'viewer';

export interface OperatorInfo {
  operatorId: string;
  operatorRole: OperatorRole;
  operatorName: string;
}

export interface TokenPayload {
  operatorId: string;
  operatorName: string;
  role: OperatorRole;
  exp?: number;
}

const DEFAULT_DEV_SECRET = 'bridgeguard-dev-auth-secret-do-not-use-in-production';

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.API_KEY || DEFAULT_DEV_SECRET;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 operator token.
 */
export function createOperatorToken(
  payload: { operatorId: string; operatorName: string; role: OperatorRole; exp?: number },
  secret: string = getAuthSecret(),
): string {
  const json = JSON.stringify(payload);
  const b64Payload = Buffer.from(json, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');
  return `${b64Payload}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 operator token.
 * Returns null if the token is invalid, tampered with, or expired.
 */
export function verifyOperatorToken(
  token: string,
  secret: string = getAuthSecret(),
): OperatorInfo | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [b64Payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');

  try {
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    if (!['admin', 'operator', 'viewer'].includes(payload.role)) {
      return null;
    }

    return {
      operatorId: payload.operatorId,
      operatorRole: payload.role,
      operatorName: payload.operatorName,
    };
  } catch {
    return null;
  }
}

/**
 * Global API key gate for all /api endpoints.
 */
export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;
  const expectedKey = process.env.API_KEY;

  // In development, allow requests without API key if not configured or using placeholder
  if (process.env.NODE_ENV === 'development' && (!expectedKey || expectedKey === 'your-api-key-here')) {
    return;
  }

  if (expectedKey && expectedKey !== 'your-api-key-here' && apiKey !== expectedKey) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid API key', statusCode: 401 });
  }
}

/**
 * Resolves verified operator information from request credentials.
 * NEVER trusts client-supplied x-operator-role as proof of authorization.
 */
export function getOperatorInfo(request: FastifyRequest): OperatorInfo {
  // Return cached result if already resolved for this request
  if ((request as any)._verifiedOperator) {
    return (request as any)._verifiedOperator;
  }

  // 1. Extract credential from Authorization or header
  const authHeader = request.headers['authorization'];
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (request.headers['x-operator-token']) {
    token = request.headers['x-operator-token'] as string;
  } else if (request.headers['x-api-key']) {
    token = request.headers['x-api-key'] as string;
  }

  const isDev = process.env.NODE_ENV !== 'production';
  let verified: OperatorInfo | null = null;

  if (token) {
    // Check 1: Cryptographically signed token
    verified = verifyOperatorToken(token);

    // Check 2: Pre-configured API keys for roles
    if (!verified) {
      if (process.env.ADMIN_API_KEY && token === process.env.ADMIN_API_KEY) {
        verified = {
          operatorId: (request.headers['x-operator-id'] as string) || 'admin',
          operatorRole: 'admin',
          operatorName: (request.headers['x-operator-name'] as string) || 'Administrator',
        };
      } else if (process.env.OPERATOR_API_KEY && token === process.env.OPERATOR_API_KEY) {
        verified = {
          operatorId: (request.headers['x-operator-id'] as string) || 'operator',
          operatorRole: 'operator',
          operatorName: (request.headers['x-operator-name'] as string) || 'Operator',
        };
      }
    }

    // Check 3: Development isolated tokens (strictly non-production)
    if (!verified && isDev) {
      if (token === 'bg-dev-admin-token') {
        verified = {
          operatorId: (request.headers['x-operator-id'] as string) || 'dev-admin',
          operatorRole: 'admin',
          operatorName: (request.headers['x-operator-name'] as string) || 'Dev Admin',
        };
      } else if (token === 'bg-dev-operator-token') {
        verified = {
          operatorId: (request.headers['x-operator-id'] as string) || 'dev-operator',
          operatorRole: 'operator',
          operatorName: (request.headers['x-operator-name'] as string) || 'Dev Operator',
        };
      }
    }
  }

  // Fallback: If no valid token, strictly default to 'viewer'
  // Any client-supplied x-operator-role is completely ignored for privilege elevation
  const operator: OperatorInfo = verified || {
    operatorId: (request.headers['x-operator-id'] as string) || 'viewer',
    operatorRole: 'viewer',
    operatorName: (request.headers['x-operator-name'] as string) || 'Guest Viewer',
  };

  (request as any)._verifiedOperator = operator;
  return operator;
}

/**
 * Pre-handler middleware enforcing required operator roles based on verified credentials.
 */
export function requireOperatorRole(roles: OperatorRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { operatorRole } = getOperatorInfo(request);
    if (!roles.includes(operatorRole)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `Requires role: ${roles.join(' or ')}`,
        statusCode: 403,
      });
    }
  };
}
