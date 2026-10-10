const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Parse owner and repository name from a GitHub URL
 * Supports:
 * - https://github.com/owner/repo
 * - http://github.com/owner/repo/
 * - github.com/owner/repo.git
 * - https://github.com/owner/repo.git/
 * - deep paths: https://github.com/owner/repo/tree/main
 */
function parseGithubUrl(url) {
  if (!url || typeof url !== 'string') return null;

  // Regular expression matching github.com/owner/repo
  const regex = /github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i;
  const match = url.trim().match(regex);
  if (!match) return null;

  const owner = match[1];
  let repo = match[2];

  // Strip .git suffix if present
  if (repo.toLowerCase().endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  // Strip any trailing slashes or path separators
  repo = repo.replace(/\/+$/, '');

  if (!owner || !repo) return null;

  return { owner, repo };
}

/**
 * Clear the in-memory cache (useful for tests)
 */
function clearCache() {
  cache.clear();
}

/**
 * Fetch GitHub repository info including language, commit count, last push date, and stars
 */
async function getRepoDetails(evidenceUrl) {
  const parsed = parseGithubUrl(evidenceUrl);
  if (!parsed) {
    return { available: false };
  }

  const { owner, repo } = parsed;
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data };
  }

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'MicroCredential-SkillPassport-App',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    // 1. Fetch Repository Info
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    });

    if (repoRes.status === 404) {
      return { available: false, reason: 'not_found' };
    }

    if (repoRes.status === 403 || repoRes.status === 429) {
      const remaining = repoRes.headers?.get?.('x-ratelimit-remaining');
      let bodyText = '';
      try {
        const bodyJson = await repoRes.json();
        bodyText = JSON.stringify(bodyJson);
      } catch {
        // ignore json parse error
      }

      const isRateLimited =
        remaining === '0' ||
        repoRes.status === 429 ||
        bodyText.toLowerCase().includes('rate limit');

      if (isRateLimited) {
        return { available: false, reason: 'rate_limited' };
      }
      return { available: false, reason: 'private' };
    }

    if (!repoRes.ok) {
      return { available: false, reason: 'error' };
    }

    const repoData = await repoRes.json();

    // 2. Fetch Commits (per_page=1 to parse Link header for total commits count)
    let commitCount = 0;
    try {
      const commitsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
        { headers }
      );

        let linkHeader = '';
        if (typeof commitsRes.headers?.get === 'function') {
          linkHeader = commitsRes.headers.get('link') || '';
        } else if (commitsRes.headers?.link) {
          linkHeader = commitsRes.headers.link;
        }

        const lastUrlMatch = linkHeader.match(/<([^>]+)>;\s*rel="last"/i);
        const pageMatch = lastUrlMatch ? lastUrlMatch[1].match(/[?&]page=(\d+)/) : null;

        if (pageMatch) {
          commitCount = parseInt(pageMatch[1], 10);
        } else {
          const commits = await commitsRes.json();
          commitCount = Array.isArray(commits) ? commits.length : 0;
        }
    } catch {
      // If commits fetch fails, keep commitCount as 0 without throwing
    }

    const resultData = {
      available: true,
      language: repoData.language || null,
      commitCount,
      lastUpdated: repoData.pushed_at || repoData.updated_at || null,
      stars: repoData.stargazers_count ?? 0,
    };

    // Cache successful response for 10 minutes
    cache.set(cacheKey, {
      data: resultData,
      timestamp: Date.now(),
    });

    return resultData;
  } catch {
    return { available: false, reason: 'network_error' };
  }
}

module.exports = {
  parseGithubUrl,
  getRepoDetails,
  clearCache,
  cache,
};
