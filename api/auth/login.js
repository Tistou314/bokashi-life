import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, remember } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username et password requis' });
    }

    // Get credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminUsername || !adminPasswordHash) {
      console.error('Missing ADMIN_USERNAME or ADMIN_PASSWORD_HASH environment variables');
      return res.status(500).json({ error: 'Configuration serveur incorrecte' });
    }

    // Verify credentials
    const usernameMatch = username === adminUsername;
    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);

    if (!usernameMatch || !passwordMatch) {
      // Add delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 300));
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Create JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const expiresIn = remember ? '7d' : '24h';

    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);

    // Set cookie
    const maxAge = remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60; // 7 days or 24 hours

    res.setHeader('Set-Cookie', [
      `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    ]);

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
