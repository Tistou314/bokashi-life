import { requireAuth } from '../lib/auth.js';
import { deleteFile } from '../lib/github.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({ error: 'Path requis' });
    }

    // Security: only allow deleting from assets/images
    if (!path.startsWith('assets/images/')) {
      return res.status(403).json({ error: 'Suppression autorisée uniquement dans assets/images/' });
    }

    // Security: prevent path traversal
    if (path.includes('..')) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    // Delete the file
    const filename = path.split('/').pop();
    const commitMessage = `[Admin] Suppression image: ${filename}`;
    await deleteFile(path, commitMessage);

    return res.status(200).json({
      success: true,
      message: 'Image supprimée avec succès'
    });

  } catch (error) {
    console.error('Delete media error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Image non trouvée' });
    }

    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'image' });
  }
}
