import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';

const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const ADMIN_DISPLAY_NAME =
  process.env.ADMIN_DISPLAY_NAME || 'Admin Officer — Municipality of Sagbayan';

function normalizeSupabaseUrl(rawUrl: string): string {
  const cleaned = rawUrl.trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
  if (!cleaned) return '';

  let candidate = cleaned;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = candidate.includes('.')
      ? `https://${candidate}`
      : `https://${candidate}.supabase.co`;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.origin;
  } catch {
    return '';
  }
}

const SUPABASE_URL = normalizeSupabaseUrl(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
);
const SUPABASE_PUBLISHABLE_KEY = (
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
)
  .trim()
  .replace(/^['"]|['"]$/g, '');

const DEV_EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');
const SESSION_SECRET = process.env.SESSION_SECRET || (IS_PROD ? '' : DEV_EPHEMERAL_SECRET);

const COOKIE_NAME = 'certiflow_session';
const STATE_FILE = '/tmp/certiflow-backend-state.json';

export interface OfficerUser {
  id?: string;
  username: string;
  email?: string;
  name: string;
  role: 'admin_officer';
}

interface SessionPayload {
  sub: string;
  uid?: string;
  email?: string;
  name: string;
  role: 'admin_officer';
  iat: number;
  exp: number;
}

interface PrintLogEntry {
  id: string;
  certificateType: string;
  documentTitle: string;
  action: string;
  pages: number;
  officer: string;
  createdAt: number;
}

interface BackendState {
  totalExports: number;
  printHistory: PrintLogEntry[];
}

interface PreparedPrintJob {
  id: string;
  html: string;
  createdAt: number;
  expiresAt: number;
}

interface AuthenticatedRequest extends Request {
  officer?: OfficerUser;
}

interface SupabaseAuthUser {
  id: string;
  email?: string;
  role?: string;
  user_metadata?: {
    username?: string;
    name?: string;
    full_name?: string;
    display_name?: string;
    role?: string;
  };
  app_metadata?: {
    role?: string;
  };
}

interface SupabaseTokenResponse {
  access_token?: string;
  user?: SupabaseAuthUser;
  error?: string;
  error_description?: string;
  msg?: string;
}

function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

function isAuthConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(SESSION_SECRET);
}

function mapSupabaseAuthError(payload: SupabaseTokenResponse, status: number): string {
  const rawCode = String(payload.error || '').toLowerCase();
  const rawMessage = String(payload.error_description || payload.msg || payload.error || '');
  const lower = rawMessage.toLowerCase();

  if (
    rawCode === 'invalid_grant' ||
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials')
  ) {
    return 'Incorrect email or password. Please double-check your credentials and try again.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox or contact your administrator.';
  }

  if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many sign-in attempts. Please wait a moment and try again.';
  }

  if (status >= 500) {
    return 'The sign-in service is temporarily unavailable. Please try again in a few moments.';
  }

  return 'We could not verify your credentials. Please try again.';
}

async function authenticateWithSupabase(
  identifier: string,
  password: string
): Promise<
  | { ok: true; user: OfficerUser }
  | { ok: false; status: number; error: string }
> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase Auth configuration missing: SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is unset.');
    return {
      ok: false,
      status: 503,
      error:
        'The sign-in service is temporarily unavailable. Please contact your system administrator.',
    };
  }

  if (!SESSION_SECRET) {
    console.error('SESSION_SECRET environment variable is required in production.');
    return {
      ok: false,
      status: 503,
      error:
        'The sign-in service is temporarily unavailable due to a server configuration issue. Please contact your system administrator.',
    };
  }

  const loginEmail = identifier.trim();

  if (!loginEmail || !loginEmail.includes('@')) {
    return {
      ok: false,
      status: 400,
      error: 'Please enter a valid registered officer email address.',
    };
  }

  let res: globalThis.Response;
  let payload: SupabaseTokenResponse = {};

  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: loginEmail,
        password,
      }),
    });

    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text) as SupabaseTokenResponse;
      } catch {
        payload = {};
      }
    }
  } catch (err) {
    console.error('Supabase Auth request failed:', err);
    return {
      ok: false,
      status: 502,
      error: 'We could not reach the sign-in service right now. Please try again in a moment.',
    };
  }

  if (!res.ok || !payload.access_token || !payload.user) {
    return {
      ok: false,
      status: res.status >= 500 ? 502 : res.status === 429 ? 429 : 401,
      error: mapSupabaseAuthError(payload, res.status),
    };
  }

  const sbUser = payload.user;
  const meta = sbUser.user_metadata || {};
  return {
    ok: true,
    user: {
      id: sbUser.id,
      email: sbUser.email || loginEmail,
      username: meta.username || sbUser.email || loginEmail,
      name:
        meta.name ||
        meta.full_name ||
        meta.display_name ||
        sbUser.email ||
        ADMIN_DISPLAY_NAME,
      role: 'admin_officer',
    },
  };
}

function loadState(): BackendState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<BackendState>;
      return {
        totalExports: typeof parsed.totalExports === 'number' ? parsed.totalExports : 0,
        printHistory: Array.isArray(parsed.printHistory) ? parsed.printHistory : [],
      };
    }
  } catch (err) {
    console.warn('Could not read persisted backend state:', err);
  }
  return { totalExports: 0, printHistory: [] };
}

function persistState(state: BackendState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist backend state:', err);
  }
}

const backendState: BackendState = loadState();
const printJobs = new Map<string, PreparedPrintJob>();

function cleanupExpiredPrintJobs(): void {
  const now = Date.now();
  for (const [id, job] of printJobs.entries()) {
    if (job.expiresAt <= now) {
      printJobs.delete(id);
    }
  }
}

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function signSessionToken(user: OfficerUser): string {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: user.username,
    uid: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + 1000 * 60 * 60 * 24, // 24 hours
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string): OfficerUser | null {
  if (!SESSION_SECRET || !token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  if (!safeEqualString(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as SessionPayload;
    if (!payload.sub || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return {
      id: payload.uid,
      email: payload.email,
      username: payload.sub,
      name: payload.name || ADMIN_DISPLAY_NAME,
      role: 'admin_officer',
    };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = part.slice(0, eqIndex).trim();
    const val = part.slice(eqIndex + 1).trim();
    result[key] = decodeURIComponent(val);
  }
  return result;
}

function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[COOKIE_NAME]) {
    return cookies[COOKIE_NAME];
  }
  return null;
}

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);
  const officer = token ? verifySessionToken(token) : null;
  if (!officer) {
    res.status(401).json({
      ok: false,
      error: 'Your session has expired. Please sign in again to continue.',
    });
    return;
  }
  req.officer = officer;
  next();
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    maxAge: 1000 * 60 * 60 * 24,
    path: '/',
  });
}

function clearSessionCookie(req: Request, res: Response): void {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    path: '/',
  });
}

export function createApiApp(): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'certiflow-sagbayan',
      authProvider: 'supabase',
      authConfigured: isAuthConfigured(),
    });
  });

  // Admin Officer Authentication via Supabase Auth (Fail-closed, no hardcoded fallback password)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as { username?: unknown; email?: unknown; password?: unknown };
      const identifier =
        typeof body.email === 'string' && body.email.trim()
          ? body.email.trim()
          : typeof body.username === 'string'
          ? body.username.trim()
          : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!identifier || !password) {
        res.status(400).json({ ok: false, error: 'Please enter both your email and password.' });
        return;
      }

      const sbAuth = await authenticateWithSupabase(identifier, password);
      if (!sbAuth.ok) {
        res.status(sbAuth.status).json({ ok: false, error: sbAuth.error });
        return;
      }

      const token = signSessionToken(sbAuth.user);
      setSessionCookie(req, res, token);
      res.json({ ok: true, token, user: sbAuth.user });
    } catch (err) {
      console.error('Unexpected login error:', err);
      res.status(500).json({
        ok: false,
        error: 'Something went wrong while signing you in. Please try again in a moment.',
      });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/session', (req: Request, res: Response) => {
    const token = extractTokenFromRequest(req);
    const user = token ? verifySessionToken(token) : null;
    if (!user) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, user });
  });

  // Print & Export Tracking
  app.get('/api/stats', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        ok: true,
        totalExports: backendState.totalExports,
        recentLogs: backendState.printHistory.slice(0, 15),
      });
    } catch (err) {
      console.error('Failed to read registry stats:', err);
      res.status(500).json({
        ok: false,
        error: 'We could not load the export summary right now. Please try again.',
      });
    }
  });

  app.post('/api/print/log', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body || {}) as {
        certificateType?: string;
        documentTitle?: string;
        action?: string;
        pages?: number;
      };

      const entry: PrintLogEntry = {
        id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        certificateType: body.certificateType === 'marriage' ? 'marriage' : 'birth',
        documentTitle: String(body.documentTitle || 'Civil Registry Document').slice(0, 160),
        action: String(body.action || 'print').slice(0, 32),
        pages: typeof body.pages === 'number' && body.pages > 0 ? body.pages : 1,
        officer: req.officer?.email || req.officer?.username || 'admin_officer',
        createdAt: Date.now(),
      };

      backendState.totalExports += 1;
      backendState.printHistory.unshift(entry);
      if (backendState.printHistory.length > 100) {
        backendState.printHistory.length = 100;
      }
      persistState(backendState);

      res.json({
        ok: true,
        totalExports: backendState.totalExports,
        entry,
      });
    } catch (err) {
      console.error('Failed to log print export:', err);
      res.status(500).json({
        ok: false,
        error: 'We could not save the export record right now. Please try again.',
      });
    }
  });

  // Prepare Printable Standalone Document on Backend & Return Same-Origin URL
  app.post('/api/print/prepare', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      cleanupExpiredPrintJobs();
      const body = (req.body || {}) as {
        html?: unknown;
        certificateType?: string;
        documentTitle?: string;
        pages?: number;
      };

      if (typeof body.html !== 'string' || !body.html.trim()) {
        res.status(400).json({
          ok: false,
          error: 'The document could not be prepared for printing because no content was provided.',
        });
        return;
      }

      const jobId = `job_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const now = Date.now();
      printJobs.set(jobId, {
        id: jobId,
        html: body.html,
        createdAt: now,
        expiresAt: now + 1000 * 60 * 10, // 10 minutes
      });

      const entry: PrintLogEntry = {
        id: `log_${now}_${crypto.randomBytes(3).toString('hex')}`,
        certificateType: body.certificateType === 'marriage' ? 'marriage' : 'birth',
        documentTitle: String(body.documentTitle || 'Civil Registry Document').slice(0, 160),
        action: 'print',
        pages: typeof body.pages === 'number' && body.pages > 0 ? body.pages : 1,
        officer: req.officer?.email || req.officer?.username || 'admin_officer',
        createdAt: now,
      };

      backendState.totalExports += 1;
      backendState.printHistory.unshift(entry);
      if (backendState.printHistory.length > 100) {
        backendState.printHistory.length = 100;
      }
      persistState(backendState);

      res.json({
        ok: true,
        jobId,
        printUrl: `/api/print/render/${jobId}`,
        totalExports: backendState.totalExports,
      });
    } catch (err) {
      console.error('Failed to prepare print job:', err);
      res.status(500).json({
        ok: false,
        error: 'We could not prepare the document for printing. Please try again.',
      });
    }
  });

  app.get('/api/print/render/:jobId', (req: Request, res: Response) => {
    cleanupExpiredPrintJobs();
    const jobId = String(req.params.jobId || '');
    const job = printJobs.get(jobId);
    if (!job) {
      res
        .status(404)
        .send(
          'This print preview link has expired or could not be found. Please return to the form and try printing again.'
        );
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(job.html);
  });

  // Ensure unmatched /api/* routes return clean JSON instead of HTML error pages
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      ok: false,
      error: 'The requested service could not be found. Please refresh the page and try again.',
    });
  });

  // API JSON Error Middleware (catches malformed JSON, oversized payloads, and unexpected server errors)
  app.use(
    '/api',
    (
      err: unknown,
      _req: Request,
      res: Response,
      next: NextFunction
    ) => {
      if (res.headersSent) {
        next(err);
        return;
      }
      const typedErr = err as { status?: number; type?: string };
      console.error('API middleware error:', err);

      if (typedErr?.type === 'entity.too.large' || typedErr?.status === 413) {
        res.status(413).json({
          ok: false,
          error: 'The request is too large to process. Please reduce the content size and try again.',
        });
        return;
      }

      if (typedErr?.type === 'entity.parse.failed' || (err instanceof SyntaxError && typedErr?.status === 400)) {
        res.status(400).json({
          ok: false,
          error: 'We received an invalid request format. Please refresh the page and try again.',
        });
        return;
      }

      res.status(500).json({
        ok: false,
        error: 'Something went wrong on our side. Please try again in a few moments.',
      });
    }
  );

  return app;
}
