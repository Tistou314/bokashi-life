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

    // TEMPORARY: Hardcoded credentials for testing
    const TEMP_USERNAME = 'admin';
    const TEMP_PASSWORD = 'BokashiAdmin2024';

    // Simple direct check
    if (username === TEMP_USERNAME && password === TEMP_PASSWORD) {
      // Success - continue to create JWT
      console.log('Login successful with hardcoded creds');
    } else {
      console.log('Login failed:', { username, password: '***' });
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
