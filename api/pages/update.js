import { requireAuth } from '../lib/auth.js';
import { updateFile, getFileContent } from '../lib/github.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { path, content, sha } = req.body;

    if (!path || !content) {
      return res.status(400).json({ error: 'Path et content requis' });
    }

    // Security: only allow HTML files
    if (!path.endsWith('.html')) {
      return res.status(400).json({ error: 'Seuls les fichiers HTML sont autorisés' });
    }

    // Security: prevent path traversal
    if (path.includes('..')) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    // Security: don't allow modifying admin files
    if (path.startsWith('admin/')) {
      return res.status(403).json({ error: 'Modification des fichiers admin non autorisée' });
    }

    // Verify file exists
    const existing = await getFileContent(path);
    if (!existing) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Update the file via GitHub API
    const commitMessage = `[Admin] Mise à jour de ${path}`;
    const result = await updateFile(path, content, commitMessage, sha || existing.sha);

    return res.status(200).json({
      success: true,
      message: 'Page mise à jour avec succès',
      commit: result.commit?.sha || null
    });

  } catch (error) {
    console.error('Update page error:', error);

    // Handle SHA mismatch (conflict)
    if (error.message.includes('SHA')) {
      return res.status(409).json({
        error: 'Conflit: la page a été modifiée par ailleurs. Veuillez recharger.'
      });
    }

    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la page' });
  }
}
