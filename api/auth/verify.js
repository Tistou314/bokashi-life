import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from cookie
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/admin_token=([^;]+)/);

    if (!tokenMatch) {
      return res.status(401).json({ authenticated: false, error: 'Non authentifié' });
    }

    const token = tokenMatch[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    // Verify JWT
    const { payload } = await jwtVerify(token, secret);

    return res.status(200).json({
      authenticated: true,
      username: payload.username
    });

  } catch (error) {
    // Token invalid or expired
    return res.status(401).json({ authenticated: false, error: 'Session expirée' });
  }
}

// Helper function to verify auth - can be imported by other API routes
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
