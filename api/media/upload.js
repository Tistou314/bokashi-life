import { requireAuth } from '../lib/auth.js';
import { createFile, getFileContent } from '../lib/github.js';

// Vercel serverless functions have a body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { filename, content, contentType } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename et content requis' });
    }

    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: 'Extension non autorisée. Formats acceptés: ' + allowedExtensions.join(', ')
      });
    }

    // Sanitize filename (remove special chars, spaces)
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    const path = `assets/images/${sanitizedFilename}`;

    // Check if file already exists
    const existing = await getFileContent(path);
    if (existing) {
      return res.status(409).json({
        error: 'Un fichier avec ce nom existe déjà',
        existingPath: path
      });
    }

    // Content should be base64 encoded from frontend
    // Create the file via GitHub API
    const commitMessage = `[Admin] Upload image: ${sanitizedFilename}`;

    // GitHub API expects base64 without the data URL prefix
    let base64Content = content;
    if (content.includes('base64,')) {
      base64Content = content.split('base64,')[1];
    }

    const result = await createFileRaw(path, base64Content, commitMessage);

    return res.status(201).json({
      success: true,
      message: 'Image uploadée avec succès',
      path,
      url: `/${path}`,
      commit: result.commit?.sha || null
    });

  } catch (error) {
    console.error('Upload media error:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
  }
}

// Create file with raw base64 content (no re-encoding)
async function createFileRaw(path, base64Content, message) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  const response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        content: base64Content,
        branch
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.status}`);
  }

  return await response.json();
}
