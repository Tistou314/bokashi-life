import { requireAuth } from '../lib/auth.js';
import { getFileContent } from '../lib/github.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Path parameter required' });
    }

    // Security: only allow HTML files
    if (!path.endsWith('.html')) {
      return res.status(400).json({ error: 'Seuls les fichiers HTML sont autorisés' });
    }

    // Security: prevent path traversal
    if (path.includes('..')) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    const file = await getFileContent(path);

    if (!file) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Parse HTML to extract editable sections
    const parsed = parseHtmlContent(file.content, path);

    return res.status(200).json({
      success: true,
      path: file.path,
      sha: file.sha,
      raw: file.content,
      parsed
    });

  } catch (error) {
    console.error('Read page error:', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture de la page' });
  }
}

// Parse HTML content to extract editable sections
function parseHtmlContent(html, path) {
  const result = {
    type: detectPageType(html, path),
    meta: {},
    content: {}
  };

  // Extract meta title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  result.meta.title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  result.meta.description = descMatch ? descMatch[1] : '';

  // Extract canonical URL
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  result.meta.canonical = canonicalMatch ? canonicalMatch[1] : '';

  // Extract H1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  result.content.h1 = h1Match ? h1Match[1].trim() : '';

  // Extract page type specific content
  if (result.type === 'hub') {
    result.content.cards = extractSiloCards(html);
  } else if (result.type === 'article') {
    result.content.sections = extractArticleSections(html);
    result.content.faq = extractFaq(html);
    result.content.sidebar = extractSidebar(html);
  } else if (result.type === 'product') {
    result.content.product = extractProductInfo(html);
    result.content.faq = extractFaq(html);
  }

  // Extract JSON-LD schemas
  result.schemas = extractSchemas(html);

  return result;
}

function detectPageType(html, path) {
  if (path.endsWith('index.html') && (path.includes('/') || path === 'index.html')) {
    if (html.includes('silo-grid') || html.includes('silo-card')) {
      return 'hub';
    }
  }
  if (html.includes('product-card') || html.includes('product-info') ||
      path.includes('organko') || path.includes('hozelock')) {
    return 'product';
  }
  return 'article';
}

function extractSiloCards(html) {
  const cards = [];
  const cardRegex = /<article\s+class="silo-card"[^>]*>([\s\S]*?)<\/article>/g;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[1];

    const titleMatch = cardHtml.match(/<h3[^>]*>([^<]+)<\/h3>/);
    const descMatch = cardHtml.match(/<p[^>]*>([^<]+)<\/p>/);
    const linkMatch = cardHtml.match(/href="([^"]+)"/);
    const iconMatch = cardHtml.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);

    cards.push({
      title: titleMatch ? titleMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
      link: linkMatch ? linkMatch[1] : '',
      icon: iconMatch ? iconMatch[0] : ''
    });
  }

  return cards;
}

function extractArticleSections(html) {
  const sections = [];
  const articleContent = html.match(/<div\s+class="article-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<aside/);

  if (articleContent) {
    const content = articleContent[1];
    const h2Regex = /<h2\s+id="([^"]+)"[^>]*>([^<]+)<\/h2>/g;
    let match;
    let lastIndex = 0;
    const h2Matches = [];

    while ((match = h2Regex.exec(content)) !== null) {
      h2Matches.push({
        id: match[1],
        title: match[2].trim(),
        index: match.index
      });
    }

    // Extract content between h2s
    for (let i = 0; i < h2Matches.length; i++) {
      const current = h2Matches[i];
      const next = h2Matches[i + 1];

      const startIndex = content.indexOf('</h2>', current.index) + 5;
      const endIndex = next ? next.index : content.length;

      const sectionContent = content.slice(startIndex, endIndex).trim();

      sections.push({
        id: current.id,
        title: current.title,
        content: sectionContent
      });
    }
  }

  return sections;
}

function extractFaq(html) {
  const faq = [];

  // Look for FAQ schema
  const faqSchemaMatch = html.match(/"@type"\s*:\s*"FAQPage"[\s\S]*?"mainEntity"\s*:\s*\[([\s\S]*?)\]/);

  if (faqSchemaMatch) {
    const questionsJson = faqSchemaMatch[1];
    const questionRegex = /"@type"\s*:\s*"Question"[\s\S]*?"name"\s*:\s*"([^"]+)"[\s\S]*?"text"\s*:\s*"([^"]+)"/g;
    let match;

    while ((match = questionRegex.exec(questionsJson)) !== null) {
      faq.push({
        question: match[1],
        answer: match[2]
      });
    }
  }

  return faq;
}

function extractSidebar(html) {
  const sidebar = {
    cta: null
  };

  const ctaMatch = html.match(/<div\s+class="sidebar-cta"[^>]*>([\s\S]*?)<\/div>/);
  if (ctaMatch) {
    const ctaHtml = ctaMatch[1];
    const titleMatch = ctaHtml.match(/<h3[^>]*>([^<]+)<\/h3>/);
    const linkMatch = ctaHtml.match(/href="([^"]+)"/);

    sidebar.cta = {
      title: titleMatch ? titleMatch[1].trim() : '',
      link: linkMatch ? linkMatch[1] : ''
    };
  }

  return sidebar;
}

function extractProductInfo(html) {
  const product = {
    name: '',
    price: '',
    rating: 0,
    link: ''
  };

  // Extract from various possible locations
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  product.name = nameMatch ? nameMatch[1].trim() : '';

  const priceMatch = html.match(/(\d+[,.]?\d*)\s*€/);
  product.price = priceMatch ? priceMatch[0] : '';

  const ratingMatch = html.match(/(\d+([,.]\d+)?)\s*\/\s*5/);
  product.rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : 0;

  const affiliateMatch = html.match(/href="(https:\/\/[^"]*amazon[^"]+)"/);
  product.link = affiliateMatch ? affiliateMatch[1] : '';

  return product;
}

function extractSchemas(html) {
  const schemas = [];
  const schemaRegex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match;

  while ((match = schemaRegex.exec(html)) !== null) {
    try {
      const schema = JSON.parse(match[1]);
      schemas.push(schema);
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  return schemas;
}
