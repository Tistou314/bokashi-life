import { jwtVerify } from 'jose';

// Verify authentication from request
export async function verifyAuth(req) {
  try {
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/admin_token=([^;]+)/);

    if (!tokenMatch) {
      return { authenticated: false, error: 'Non authentifié' };
    }

    const token = tokenMatch[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    return { authenticated: true, username: payload.username };
  } catch (error) {
    return { authenticated: false, error: 'Session expirée' };
  }
}

// Middleware helper - returns null if authenticated, or sends error response
export async function requireAuth(req, res) {
  const auth = await verifyAuth(req);

  if (!auth.authenticated) {
    res.status(401).json({ error: auth.error });
    return null;
  }

  return auth;
}
