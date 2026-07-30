# Audit complet — bokashilife.com

**Date de l'audit : 30 juillet 2026**
Périmètre : les 54 fichiers HTML du dépôt, sitemap, robots.txt, configuration Vercel, données structurées, maillage interne, contenu, indexation Google (vérifications externes), API/admin.

---

## Diagnostic global

Le site ne souffre **pas d'un blocage technique** (pas de noindex accidentel, pas de robots.txt bloquant, canonicals corrects, sitemap valide, maillage interne sans lien cassé, pages indexables et partiellement indexées par Google). Le problème est ailleurs, et il est double :

1. **Aucune autorité** : site lancé d'un bloc le 24 janvier 2026 (50 pages publiées simultanément), sur un domaine neuf, sans backlinks, sans auteur identifiable, sans page « À propos ». Pour Google, c'est le profil type d'un site de contenu généré automatiquement : il est crawlé, partiellement indexé, mais ne se voit attribuer aucun classement. **C'est la cause principale des 3 visites en 3 mois — il n'y a pas besoin de pénalité pour expliquer ce chiffre.**
2. **Des signaux de spam actifs** qui détruisent la confiance algorithmique et exposent à une action manuelle : notes et nombres d'avis **inventés** dans le balisage Schema.org, dates de publication **antidatées**, affirmations de tests produits invérifiables, pages vides publiées dans le sitemap.

Le site est par ailleurs **figé** : dernier déploiement le 21 mai, toutes les dates visibles affichent « Mis à jour le 23 janvier 2026 », tous les `lastmod` du sitemap datent de janvier. Six mois sans aucun signe de vie confirment à Google qu'il s'agit d'un site abandonné.

---

## 🔴 Problèmes critiques (à corriger en priorité absolue)

### 1. Notes et avis fabriqués dans les données structurées
Fichiers : `index.html`, `acheter-bokashi/organko.html`, `organko-2.html`, `hozelock.html`, `kit-double.html`

Le balisage JSON-LD déclare des `AggregateRating` avec des volumes d'avis inventés :
- Organko : « 5/5 — 847 avis », « 4.3/5 — 1247 avis »
- Hozelock : « 4/5 — 312 avis », « 4.0/5 — 523 avis »
- Kit double : « 5/5 — 156 avis », « 4.2/5 — 892 avis »

Le site n'a **aucun système d'avis**. Ces chiffres sont fictifs. C'est une violation directe des consignes Google sur les extraits d'avis (« self-serving reviews » et notes invérifiables) et un motif classique d'action manuelle *« Données structurées contenant du spam »* — qui, une fois appliquée, plombe tout le domaine.

**Aggravant** : les mêmes blocs déclarent des `Offer` avec `MerchantReturnPolicy`, `FreeReturn`, `OfferShippingDetails` (livraison, retours gratuits sous 30 jours…) alors que le site **ne vend rien** — tous les liens sortants produits vont vers Amazon (14 liens affiliés). Le balisage se fait passer pour un marchand.

**Correction** : supprimer tous les `aggregateRating`, `Offer`, `MerchantReturnPolicy`, `OfferShippingDetails` de toutes les pages. Garder au plus un `Product` minimal (nom, image, description, brand) ou un simple `ItemList`.

### 2. Dates de publication antidatées
- `bokashi-jardin/engrais.html`, `fabrique-terre.html`, `terreau.html` : `datePublished: 2024-01-15`
- `utiliser-bokashi/sans-jardin.html`, `hiver.html` : `datePublished: 2025-01-20`

Le premier commit du dépôt date du **24 janvier 2026**. Ces pages prétendent exister depuis 1 à 2 ans avant la création du site. Google recoupe ces dates avec la première date de crawl : l'incohérence est un signal de manipulation qui décrédibilise l'ensemble des métadonnées du site.

**Correction** : remettre les vraies dates (janvier 2026) partout.

### 3. Trois pages vides publiées et présentes dans le sitemap
`activateur-bokashi/definition.html`, `dosage.html`, `alternatives.html` (~165 mots chacune) affichent : *« Cet article est en cours de rédaction. Revenez bientôt ! »*

Des pages placeholder indexables, soumises dans le sitemap avec `priority 0.7–0.8`, sont un signal « low quality » massif : Google échantillonne le site, tombe sur des coquilles vides, et déclasse l'ensemble.

**Correction** : soit rédiger le contenu, soit passer ces pages en `noindex` **et** les retirer du sitemap tant qu'elles sont vides.

### 4. Affirmations d'expérience invérifiables (E-E-A-T)
`acheter-bokashi/avis.html` : « Notre test en appartement », « Nous avons utilisé le bokashi Organko et le Hozelock pendant plusieurs mois », « Comparatif des modèles testés »… Or :
- Auteur = `Organization "Bokashi Life"` partout — aucun humain identifié.
- Aucune page « À propos », aucune photo originale (uniquement des visuels produits), aucune preuve de test.
- La page s'intitule « Avis » mais ne contient aucun avis.

Depuis les mises à jour « Helpful Content » intégrées au cœur de l'algorithme, ce pattern (site affilié + prétention de tests + zéro preuve + zéro auteur) est précisément ce que Google déclasse. C'est très probablement le facteur qui explique que même les pages indexées ne sortent sur rien.

**Correction** : créer une vraie identité éditoriale (page À propos, auteur nommé avec bio), et soit réaliser/documenter de vrais tests (photos originales, mesures), soit reformuler honnêtement (« notre analyse comparative » plutôt que « notre test »).

### 5. Site figé depuis 6 mois
- Dernier commit : 21 mai 2026 (et uniquement de la perf — dernier ajout de contenu : fin janvier).
- 39 dates visibles « Mis à jour le … janvier 2026 » sur toutes les pages.
- Tous les `lastmod` du sitemap : 2026-01-23/25, avec des `changefreq: weekly` jamais honorés.

Un sitemap qui promet des mises à jour hebdomadaires jamais constatées apprend à Google à ignorer le site. La fraîcheur affichée en janvier, en juillet, signale l'abandon aussi aux visiteurs.

**Correction** : rythme de publication régulier (même 2 pages/mois), mise à jour réelle des contenus datés, `lastmod` honnêtes, `changefreq` réalistes (`monthly`).

---

## 🟠 Problèmes importants

### 6. www et non-www indexés en parallèle
Google indexe à la fois `bokashilife.com` et `www.bokashilife.com` (constaté en recherche `site:`). Les canonicals pointent bien vers le domaine nu, ce qui limite les dégâts, mais il n'existe **aucune redirection 301 www → apex** (rien dans `vercel.json`; à configurer dans le dashboard Vercel : Domains → www.bokashilife.com → Redirect to bokashilife.com). Cela divise les signaux entre deux hôtes.

### 7. Zéro backlink / zéro notoriété
Aucune stratégie visible d'acquisition de liens. Sur un domaine neuf, sans aucun lien entrant, même un contenu parfait ne se positionne pas. Pistes : annuaires compost/zéro-déchet, forums jardinage (avec parcimonie), articles invités, partenariats avec des boutiques EM (fermedumoutta.fr est déjà cité — un échange est envisageable), presse locale/écologie, Pinterest (très efficace sur le jardinage).

### 8. Empreinte « site généré » dans les titres
13+ titres contiennent « Guide Complet », plus « Comparatif Complet », « Test Complet », « Tutoriel Complet »… Ce pattern uniforme est une signature de génération en masse. Diversifier les titres, les raccourcir (plusieurs dépassent 60 caractères et sont tronqués en SERP).

### 9. Homepage faible
371 mots seulement, essentiellement des liens de navigation, plus un ton marketing creux (« fermentation magique », « magie japonaise ») — et c'est elle qui porte le schema Product spammé. La page qui reçoit le plus de PageRank ne cible aucune requête réelle.

---

## 🟡 Points secondaires

- **`og:url` absent sur 43 pages** (présent sur les hubs seulement) ; incohérence mineure Open Graph.
- **`mentions-legales.html` et `confidentialite.html` en `noindex`** mais toujours dans le **sitemap** : contradiction à nettoyer (les retirer du sitemap).
- **`google69821ca3409184e9.html`** (vérification GSC) : normal, mais confirme que la Search Console est configurée — **c'est là qu'il faut aller lire l'état d'indexation réel et les éventuelles actions manuelles** (Sécurité et actions manuelles → Actions manuelles).
- **Contact** : simple `mailto:` vers `contact@bokashilife.com` — vérifier que cette adresse existe vraiment (une adresse morte sur la page contact + mentions légales est un signal de non-fiabilité).
- **Images** : les `.webp` sont bien servies (les `.png` de 220–300 Ko ne sont plus référencés — supprimables). OG image en PNG présente. RAS.
- **Perf** : fonts en `display=optional` + media print trick, GA différé, préload LCP — le travail perf de mai est correct. Ce n'est pas le problème du site.
- **Sécurité admin/API** : `robots.txt` bloque `/admin/` et `/api/`, `X-Robots-Tag: noindex` sur `/admin/`, credentials en variables d'environnement, JWT httpOnly — correct. ⚠️ L'historique git contient un commit « TEMP: Hardcode credentials for testing » : si un vrai mot de passe y a figuré, **le considérer comme compromis et le changer** (l'historique du dépôt est public si le repo l'est).
- **Maillage interne** : aucun lien cassé, hubs liés proprement en `/section/`, titres et descriptions tous uniques. Bon travail.

---

## Ce qui va bien (à ne pas casser)

Canonicals corrects sur les 51 pages publiques · titres/descriptions 100 % uniques · aucun lien interne cassé · `lang="fr"` partout · un seul H1 par page · sitemap syntaxiquement valide · robots.txt sain · redirections 404 corrigées · GA4 (G-3FFNEWQRPN) et GSC en place · liens affiliés Amazon correctement en `nofollow` · volume de contenu correct (majorité des pages entre 1 000 et 2 400 mots).

---

## Plan d'action priorisé

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Supprimer tous les `AggregateRating`/`Offer`/politiques de retour fictifs (5 fichiers) | 🔴 Critique | 1 h |
| 2 | Corriger les `datePublished` antidatés (5 fichiers) | 🔴 Critique | 15 min |
| 3 | Compléter ou noindexer + retirer du sitemap les 3 pages placeholder | 🔴 Critique | 15 min – 3 h |
| 4 | Rediriger 301 www → apex (dashboard Vercel) | 🟠 Important | 5 min |
| 5 | Vérifier dans GSC : actions manuelles, couverture d'indexation, puis demander la réindexation des pages corrigées | 🟠 Important | 30 min |
| 6 | Créer une page À propos + auteur réel (nom, bio, photo) référencé dans les schemas `Article` | 🟠 Important | 2 h |
| 7 | Étoffer la homepage (800+ mots, vraie intention de recherche) et retirer son schema Product | 🟠 Important | 2 h |
| 8 | Reprendre `avis.html` : vrais tests documentés ou reformulation honnête | 🟠 Important | 3 h |
| 9 | Relancer la publication (2+ pages/mois) et mettre à jour les dates/lastmod réellement | 🟠 Important | continu |
| 10 | Lancer l'acquisition de liens (annuaires, partenariats, Pinterest) | 🟠 Important | continu |
| 11 | Nettoyer le sitemap (pages noindex), diversifier les titres, ajouter og:url | 🟡 Mineur | 1 h |

**Attente réaliste** : après corrections, comptez 2 à 4 mois avant des impressions significatives — un domaine de janvier 2026 sans backlinks part de zéro. Les corrections 1–3 lèvent le risque de pénalité ; les actions 6–10 sont ce qui créera réellement du trafic.
