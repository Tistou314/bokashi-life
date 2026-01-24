import { requireAuth } from '../lib/auth.js';
import { createFile, getFileContent } from '../lib/github.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { path, type, title, description, silo } = req.body;

    if (!path || !type || !title) {
      return res.status(400).json({ error: 'Path, type et title requis' });
    }

    // Security: only allow HTML files
    if (!path.endsWith('.html')) {
      return res.status(400).json({ error: 'Seuls les fichiers HTML sont autorisés' });
    }

    // Security: prevent path traversal
    if (path.includes('..')) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    // Security: don't allow creating admin files
    if (path.startsWith('admin/') || path.startsWith('api/')) {
      return res.status(403).json({ error: 'Création de fichiers admin/api non autorisée' });
    }

    // Check if file already exists
    const existing = await getFileContent(path);
    if (existing) {
      return res.status(409).json({ error: 'Ce fichier existe déjà' });
    }

    // Generate HTML template based on type
    const content = generateTemplate(type, {
      title,
      description: description || '',
      silo,
      path
    });

    // Create the file via GitHub API
    const commitMessage = `[Admin] Création de ${path}`;
    const result = await createFile(path, content, commitMessage);

    return res.status(201).json({
      success: true,
      message: 'Page créée avec succès',
      path,
      commit: result.commit?.sha || null
    });

  } catch (error) {
    console.error('Create page error:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de la page' });
  }
}

function generateTemplate(type, options) {
  const { title, description, silo, path } = options;

  // Determine breadcrumb
  const parts = path.split('/');
  const siloName = getSiloName(silo);

  const baseUrl = 'https://bokashilife.com';
  const canonical = `${baseUrl}/${path.replace('.html', '')}`;

  // Common head section
  const head = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Bokashi Life</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=DM+Serif+Display&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/style.css">`;

  if (type === 'hub') {
    return generateHubTemplate(head, title, description, siloName, silo, baseUrl);
  } else if (type === 'product') {
    return generateProductTemplate(head, title, description, siloName, silo, baseUrl);
  } else {
    return generateArticleTemplate(head, title, description, siloName, silo, baseUrl);
  }
}

function getSiloName(silo) {
  const names = {
    'comprendre-bokashi': 'Comprendre le Bokashi',
    'acheter-bokashi': 'Acheter un Bokashi',
    'activateur-bokashi': 'Activateur Bokashi',
    'fabriquer-bokashi': 'Fabriquer son Bokashi',
    'utiliser-bokashi': 'Utiliser le Bokashi',
    'bokashi-jardin': 'Bokashi au Jardin'
  };
  return names[silo] || silo;
}

function generateHubTemplate(head, title, description, siloName, silo, baseUrl) {
  return `${head}
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "${title}",
      "description": "${description}",
      "url": "${baseUrl}/${silo}/",
      "isPartOf": {
        "@type": "WebSite",
        "name": "Bokashi Life",
        "url": "${baseUrl}"
      }
    }
    </script>
</head>
<body>
    <header class="header">
        <div class="container header__inner">
            <a href="/" class="logo">
                <span class="logo__icon">🌿</span>
                <span class="logo__text">Bokashi Life</span>
            </a>
            <nav class="nav">
                <a href="/comprendre-bokashi/" class="nav__link">Comprendre</a>
                <a href="/acheter-bokashi/" class="nav__link">Acheter</a>
                <a href="/utiliser-bokashi/" class="nav__link">Utiliser</a>
                <a href="/bokashi-jardin/" class="nav__link">Jardin</a>
                <a href="/acheter-bokashi/guide-achat.html" class="nav__link nav__link--cta">Démarrer →</a>
            </nav>
            <button class="menu-toggle" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
        </div>
    </header>

    <main>
        <section class="section section--hero">
            <div class="container">
                <nav class="breadcrumbs">
                    <a href="/">Accueil</a>
                    <span>→</span>
                    <span>${siloName}</span>
                </nav>
                <h1>${title}</h1>
                <p class="section-subtitle">${description}</p>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="silo-grid">
                    <!-- Ajoutez vos cartes ici via l'éditeur -->
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container footer__grid">
            <div class="footer__brand">
                <a href="/" class="logo">
                    <span class="logo__icon">🌿</span>
                    <span class="logo__text">Bokashi Life</span>
                </a>
                <p>Votre guide complet pour le compostage bokashi.</p>
            </div>
            <div class="footer__links">
                <h4>Découvrir</h4>
                <a href="/comprendre-bokashi/">Comprendre</a>
                <a href="/acheter-bokashi/">Acheter</a>
                <a href="/utiliser-bokashi/">Utiliser</a>
            </div>
            <div class="footer__links">
                <h4>Ressources</h4>
                <a href="/activateur-bokashi/">Activateur</a>
                <a href="/fabriquer-bokashi/">Fabriquer</a>
                <a href="/bokashi-jardin/">Jardin</a>
            </div>
            <div class="footer__links">
                <h4>Légal</h4>
                <a href="/mentions-legales.html">Mentions légales</a>
                <a href="/confidentialite.html">Confidentialité</a>
            </div>
        </div>
        <div class="container footer__bottom">
            <p>© 2025 Bokashi Life. Tous droits réservés.</p>
        </div>
    </footer>

    <div class="menu-overlay"></div>
    <nav class="nav--mobile">
        <a href="/comprendre-bokashi/">Comprendre</a>
        <a href="/acheter-bokashi/">Acheter</a>
        <a href="/utiliser-bokashi/">Utiliser</a>
        <a href="/bokashi-jardin/">Jardin</a>
        <a href="/acheter-bokashi/guide-achat.html" class="nav__link--cta">Démarrer →</a>
    </nav>

    <script>
        const menuToggle = document.querySelector('.menu-toggle');
        const mobileNav = document.querySelector('.nav--mobile');
        const menuOverlay = document.querySelector('.menu-overlay');

        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mobileNav.classList.toggle('active');
            menuOverlay.classList.toggle('active');
        });

        menuOverlay.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            menuOverlay.classList.remove('active');
        });
    </script>
</body>
</html>`;
}

function generateArticleTemplate(head, title, description, siloName, silo, baseUrl) {
  return `${head}
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${title}",
      "description": "${description}",
      "author": {
        "@type": "Organization",
        "name": "Bokashi Life"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Bokashi Life",
        "url": "${baseUrl}"
      }
    }
    </script>
</head>
<body>
    <header class="header">
        <div class="container header__inner">
            <a href="/" class="logo">
                <span class="logo__icon">🌿</span>
                <span class="logo__text">Bokashi Life</span>
            </a>
            <nav class="nav">
                <a href="/comprendre-bokashi/" class="nav__link">Comprendre</a>
                <a href="/acheter-bokashi/" class="nav__link">Acheter</a>
                <a href="/utiliser-bokashi/" class="nav__link">Utiliser</a>
                <a href="/bokashi-jardin/" class="nav__link">Jardin</a>
                <a href="/acheter-bokashi/guide-achat.html" class="nav__link nav__link--cta">Démarrer →</a>
            </nav>
            <button class="menu-toggle" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
        </div>
    </header>

    <article class="section section--sm">
        <div class="container">
            <nav class="breadcrumbs">
                <a href="/">Accueil</a>
                <span>→</span>
                <a href="/${silo}/">${siloName}</a>
                <span>→</span>
                <span>${title}</span>
            </nav>
        </div>

        <div class="article-grid">
            <div>
                <header class="article-header">
                    <h1>${title}</h1>
                </header>

                <div class="article-content">
                    <p class="intro">${description}</p>

                    <h2 id="introduction">Introduction</h2>
                    <p>Contenu à rédiger...</p>

                    <!-- Ajoutez vos sections ici via l'éditeur -->
                </div>
            </div>

            <aside class="article-sidebar">
                <nav class="toc">
                    <h2>Sommaire</h2>
                    <ul class="toc__list">
                        <li><a href="#introduction" class="toc__link">Introduction</a></li>
                    </ul>
                </nav>
            </aside>
        </div>
    </article>

    <footer class="footer">
        <div class="container footer__grid">
            <div class="footer__brand">
                <a href="/" class="logo">
                    <span class="logo__icon">🌿</span>
                    <span class="logo__text">Bokashi Life</span>
                </a>
                <p>Votre guide complet pour le compostage bokashi.</p>
            </div>
            <div class="footer__links">
                <h4>Découvrir</h4>
                <a href="/comprendre-bokashi/">Comprendre</a>
                <a href="/acheter-bokashi/">Acheter</a>
                <a href="/utiliser-bokashi/">Utiliser</a>
            </div>
            <div class="footer__links">
                <h4>Ressources</h4>
                <a href="/activateur-bokashi/">Activateur</a>
                <a href="/fabriquer-bokashi/">Fabriquer</a>
                <a href="/bokashi-jardin/">Jardin</a>
            </div>
            <div class="footer__links">
                <h4>Légal</h4>
                <a href="/mentions-legales.html">Mentions légales</a>
                <a href="/confidentialite.html">Confidentialité</a>
            </div>
        </div>
        <div class="container footer__bottom">
            <p>© 2025 Bokashi Life. Tous droits réservés.</p>
        </div>
    </footer>

    <div class="menu-overlay"></div>
    <nav class="nav--mobile">
        <a href="/comprendre-bokashi/">Comprendre</a>
        <a href="/acheter-bokashi/">Acheter</a>
        <a href="/utiliser-bokashi/">Utiliser</a>
        <a href="/bokashi-jardin/">Jardin</a>
        <a href="/acheter-bokashi/guide-achat.html" class="nav__link--cta">Démarrer →</a>
    </nav>

    <script>
        const menuToggle = document.querySelector('.menu-toggle');
        const mobileNav = document.querySelector('.nav--mobile');
        const menuOverlay = document.querySelector('.menu-overlay');

        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mobileNav.classList.toggle('active');
            menuOverlay.classList.toggle('active');
        });

        menuOverlay.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            menuOverlay.classList.remove('active');
        });

        // TOC scroll tracking
        const tocLinks = document.querySelectorAll('.toc__link');
        const headings = document.querySelectorAll('h2[id]');

        window.addEventListener('scroll', () => {
            let current = '';
            headings.forEach(heading => {
                const top = heading.offsetTop - 100;
                if (window.scrollY >= top) {
                    current = heading.getAttribute('id');
                }
            });

            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        }, { passive: true });
    </script>
</body>
</html>`;
}

function generateProductTemplate(head, title, description, siloName, silo, baseUrl) {
  return `${head}
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "${title}",
      "description": "${description}",
      "brand": {
        "@type": "Brand",
        "name": "À définir"
      }
    }
    </script>
</head>
<body>
    <header class="header">
        <div class="container header__inner">
            <a href="/" class="logo">
                <span class="logo__icon">🌿</span>
                <span class="logo__text">Bokashi Life</span>
            </a>
            <nav class="nav">
                <a href="/comprendre-bokashi/" class="nav__link">Comprendre</a>
                <a href="/acheter-bokashi/" class="nav__link">Acheter</a>
                <a href="/utiliser-bokashi/" class="nav__link">Utiliser</a>
                <a href="/bokashi-jardin/" class="nav__link">Jardin</a>
                <a href="/acheter-bokashi/guide-achat.html" class="nav__link nav__link--cta">Démarrer →</a>
            </nav>
            <button class="menu-toggle" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
        </div>
    </header>

    <article class="section section--sm">
        <div class="container">
            <nav class="breadcrumbs">
                <a href="/">Accueil</a>
                <span>→</span>
                <a href="/${silo}/">${siloName}</a>
                <span>→</span>
                <span>${title}</span>
            </nav>
        </div>

        <div class="article-grid">
            <div>
                <header class="article-header">
                    <h1>${title}</h1>
                </header>

                <div class="article-content">
                    <p class="intro">${description}</p>

                    <h2 id="presentation">Présentation</h2>
                    <p>Description du produit à rédiger...</p>

                    <h2 id="caracteristiques">Caractéristiques</h2>
                    <table>
                        <tr>
                            <td>Capacité</td>
                            <td>À définir</td>
                        </tr>
                        <tr>
                            <td>Dimensions</td>
                            <td>À définir</td>
                        </tr>
                    </table>

                    <h2 id="avantages">Avantages et Inconvénients</h2>
                    <p>À rédiger...</p>

                    <h2 id="avis">Notre avis</h2>
                    <p>À rédiger...</p>
                </div>
            </div>

            <aside class="article-sidebar">
                <nav class="toc">
                    <h2>Sommaire</h2>
                    <ul class="toc__list">
                        <li><a href="#presentation" class="toc__link">Présentation</a></li>
                        <li><a href="#caracteristiques" class="toc__link">Caractéristiques</a></li>
                        <li><a href="#avantages" class="toc__link">Avantages</a></li>
                        <li><a href="#avis" class="toc__link">Notre avis</a></li>
                    </ul>
                </nav>

                <div class="sidebar-cta">
                    <h3>Acheter ce produit</h3>
                    <p class="price">Prix: À définir €</p>
                    <a href="#" class="btn btn--primary" target="_blank" rel="nofollow noopener">Voir sur Amazon →</a>
                </div>
            </aside>
        </div>
    </article>

    <footer class="footer">
        <div class="container footer__grid">
            <div class="footer__brand">
                <a href="/" class="logo">
                    <span class="logo__icon">🌿</span>
                    <span class="logo__text">Bokashi Life</span>
                </a>
                <p>Votre guide complet pour le compostage bokashi.</p>
            </div>
            <div class="footer__links">
                <h4>Découvrir</h4>
                <a href="/comprendre-bokashi/">Comprendre</a>
                <a href="/acheter-bokashi/">Acheter</a>
                <a href="/utiliser-bokashi/">Utiliser</a>
            </div>
            <div class="footer__links">
                <h4>Ressources</h4>
                <a href="/activateur-bokashi/">Activateur</a>
                <a href="/fabriquer-bokashi/">Fabriquer</a>
                <a href="/bokashi-jardin/">Jardin</a>
            </div>
            <div class="footer__links">
                <h4>Légal</h4>
                <a href="/mentions-legales.html">Mentions légales</a>
                <a href="/confidentialite.html">Confidentialité</a>
            </div>
        </div>
        <div class="container footer__bottom">
            <p>© 2025 Bokashi Life. Tous droits réservés.</p>
        </div>
    </footer>

    <div class="menu-overlay"></div>
    <nav class="nav--mobile">
        <a href="/comprendre-bokashi/">Comprendre</a>
        <a href="/acheter-bokashi/">Acheter</a>
        <a href="/utiliser-bokashi/">Utiliser</a>
        <a href="/bokashi-jardin/">Jardin</a>
        <a href="/acheter-bokashi/guide-achat.html" class="nav__link--cta">Démarrer →</a>
    </nav>

    <script>
        const menuToggle = document.querySelector('.menu-toggle');
        const mobileNav = document.querySelector('.nav--mobile');
        const menuOverlay = document.querySelector('.menu-overlay');

        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mobileNav.classList.toggle('active');
            menuOverlay.classList.toggle('active');
        });

        menuOverlay.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            menuOverlay.classList.remove('active');
        });

        // TOC scroll tracking
        const tocLinks = document.querySelectorAll('.toc__link');
        const headings = document.querySelectorAll('h2[id]');

        window.addEventListener('scroll', () => {
            let current = '';
            headings.forEach(heading => {
                const top = heading.offsetTop - 100;
                if (window.scrollY >= top) {
                    current = heading.getAttribute('id');
                }
            });

            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        }, { passive: true });
    </script>
</body>
</html>`;
}
