import { requireAuth } from '../lib/auth.js';
import { getRepoTree } from '../lib/github.js';

// Site structure definition
const SILOS = [
  { id: 'comprendre-bokashi', name: 'Comprendre', icon: '📚' },
  { id: 'acheter-bokashi', name: 'Acheter', icon: '🛒' },
  { id: 'activateur-bokashi', name: 'Activateur', icon: '🧪' },
  { id: 'fabriquer-bokashi', name: 'Fabriquer', icon: '🔧' },
  { id: 'utiliser-bokashi', name: 'Utiliser', icon: '📖' },
  { id: 'bokashi-jardin', name: 'Jardin', icon: '🌱' }
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    // Get all files from repo
    const tree = await getRepoTree();

    // Filter HTML files
    const htmlFiles = tree.filter(item => item.path.endsWith('.html'));

    // Organize by silo
    const organized = {
      root: [],
      silos: {}
    };

    // Initialize silos
    SILOS.forEach(silo => {
      organized.silos[silo.id] = {
        ...silo,
        pages: []
      };
    });

    // Categorize files
    htmlFiles.forEach(file => {
      const path = file.path;
      const parts = path.split('/');

      // Determine page type
      let pageType = 'article';
      if (path.endsWith('index.html') && parts.length > 1) {
        pageType = 'hub';
      } else if (path.includes('organko') || path.includes('hozelock')) {
        pageType = 'product';
      }

      const pageInfo = {
        path: file.path,
        name: parts[parts.length - 1],
        type: pageType,
        sha: file.sha
      };

      if (parts.length === 1) {
        // Root level files
        organized.root.push(pageInfo);
      } else {
        // Silo files
        const siloId = parts[0];
        if (organized.silos[siloId]) {
          organized.silos[siloId].pages.push(pageInfo);
        }
      }
    });

    // Sort pages within each silo
    Object.values(organized.silos).forEach(silo => {
      silo.pages.sort((a, b) => {
        // index.html first
        if (a.name === 'index.html') return -1;
        if (b.name === 'index.html') return 1;
        return a.name.localeCompare(b.name);
      });
    });

    // Calculate stats
    const stats = {
      totalPages: htmlFiles.length,
      siloCount: SILOS.length,
      hubPages: htmlFiles.filter(f => f.path.endsWith('/index.html') || f.path === 'index.html').length,
      articlePages: htmlFiles.filter(f => !f.path.endsWith('index.html')).length
    };

    return res.status(200).json({
      success: true,
      organized,
      stats,
      silos: SILOS
    });

  } catch (error) {
    console.error('List pages error:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des pages' });
  }
}
