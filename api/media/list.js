import { requireAuth } from '../lib/auth.js';
import { listFiles, getRepoTree } from '../lib/github.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    // Get all files from assets/images
    const tree = await getRepoTree();

    // Filter to only image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const images = tree.filter(item => {
      if (!item.path.startsWith('assets/images/')) return false;
      const ext = item.path.toLowerCase().slice(item.path.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    });

    // Format response
    const formattedImages = images.map(img => ({
      path: img.path,
      name: img.path.split('/').pop(),
      url: `/${img.path}`,
      sha: img.sha,
      size: img.size || 0
    }));

    // Sort by name
    formattedImages.sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      images: formattedImages,
      count: formattedImages.length
    });

  } catch (error) {
    console.error('List media error:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des images' });
  }
}
