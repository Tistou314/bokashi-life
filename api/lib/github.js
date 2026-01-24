// GitHub API helper functions

const GITHUB_API = 'https://api.github.com';

export async function getGithubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO environment variables required');
  }

  return { token, repo, branch };
}

export async function getFileContent(path) {
  const { token, repo, branch } = await getGithubConfig();

  const response = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

  // Decode base64 content
  const content = Buffer.from(data.content, 'base64').toString('utf-8');

  return {
    content,
    sha: data.sha,
    path: data.path
  };
}

export async function updateFile(path, content, message, sha = null) {
  const { token, repo, branch } = await getGithubConfig();

  // If no SHA provided, get it first (for existing files)
  if (!sha) {
    const existing = await getFileContent(path);
    if (existing) {
      sha = existing.sha;
    }
  }

  const body = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.status}`);
  }

  return await response.json();
}

export async function createFile(path, content, message) {
  return await updateFile(path, content, message, null);
}

export async function deleteFile(path, message) {
  const { token, repo, branch } = await getGithubConfig();

  // Get SHA first
  const existing = await getFileContent(path);
  if (!existing) {
    throw new Error('File not found');
  }

  const response = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        sha: existing.sha,
        branch
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.status}`);
  }

  return true;
}

export async function listFiles(path = '', extension = null) {
  const { token, repo, branch } = await getGithubConfig();

  const response = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

  // Filter by extension if provided
  if (extension) {
    return data.filter(item =>
      item.type === 'file' && item.name.endsWith(extension)
    );
  }

  return data;
}

export async function getRepoTree(path = '') {
  const { token, repo, branch } = await getGithubConfig();

  // Get full tree recursively
  const response = await fetch(
    `${GITHUB_API}/repos/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

  // Filter to only HTML files if path not specified, or files under path
  return data.tree.filter(item => {
    if (item.type !== 'blob') return false;
    if (path && !item.path.startsWith(path)) return false;
    return true;
  });
}
