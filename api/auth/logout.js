export default function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear the cookie by setting it expired
  res.setHeader('Set-Cookie', [
    `admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  ]);

  return res.status(200).json({
    success: true,
    message: 'Déconnexion réussie'
  });
}
