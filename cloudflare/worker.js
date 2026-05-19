// Elf Destiny Wiki — Suggest-Edit Worker
//
// Deploy this in the Cloudflare Workers dashboard (workers.cloudflare.com).
// Add one secret via Settings → Variables → Secret: GITHUB_PAT
// The PAT needs: Issues (read/write) + Discussions (read/write) on
// the GalacticLiaison/elf-destiny-wiki repo only.

const ALLOWED_ORIGIN = 'https://galacticliaison.github.io';
const REPO_OWNER     = 'GalacticLiaison';
const REPO_NAME      = 'elf-destiny-wiki';
const ISSUE_LABEL    = 'wiki-suggestion';
const REPO_NODE_ID   = 'R_kgDOShPfEA';           // GitHub GraphQL node ID for this repo
const DISC_CAT_ID    = 'DIC_kwDOShPfEM4C9Y3q';   // "Wiki Suggestions" Giscus discussion category

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Block requests not originating from the wiki
    if (request.headers.get('Origin') !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, 400);
    }

    const { pageUrl, pageTitle, selectedText, suggestion } = body;
    if (!pageUrl || !pageTitle || !selectedText || !suggestion) {
      return json({ ok: false, error: 'Missing fields' }, 400);
    }

    // Create GitHub issue
    const issueTitle = 'Wiki suggestion: ' + pageTitle;
    const issueBody  =
      '**Page:** ' + pageUrl + '\n\n' +
      '**Selected text:**\n> ' + selectedText.replace(/\n/g, '\n> ') + '\n\n' +
      '**Suggestion:**\n' + suggestion + '\n\n' +
      '---\n*Submitted via the wiki suggestion tool*';

    const issueRes = await ghFetch(env.GITHUB_PAT,
      'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/issues',
      { title: issueTitle, body: issueBody, labels: [ISSUE_LABEL] }
    );

    if (!issueRes.ok) {
      return json({ ok: false, error: 'GitHub Issues API error: ' + issueRes.status }, 502);
    }

    const issue = await issueRes.json();

    // Best-effort: cross-post to the page's Giscus discussion
    try {
      await postToDiscussion(env.GITHUB_PAT, pageUrl, issueTitle, issue.html_url);
    } catch (_) {}

    return json({ ok: true, issueUrl: issue.html_url });
  }
};

// ── GitHub helpers ────────────────────────────────────────────────────────

function ghFetch(pat, url, body) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Authorization':  'Bearer ' + pat,
      'Accept':         'application/vnd.github.v3+json',
      'Content-Type':   'application/json',
      'User-Agent':     'elf-destiny-wiki-suggest',
    },
    body: JSON.stringify(body),
  });
}

function ghGraphQL(pat, query, variables) {
  return fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + pat,
      'Content-Type':  'application/json',
      'User-Agent':    'elf-destiny-wiki-suggest',
    },
    body: JSON.stringify({ query, variables }),
  }).then(r => r.json());
}

async function postToDiscussion(pat, pageUrl, issueTitle, issueUrl) {
  const pathname    = new URL(pageUrl).pathname;
  const searchQuery = 'repo:' + REPO_OWNER + '/' + REPO_NAME + ' ' + pathname + ' in:title';

  const data = await ghGraphQL(pat,
    `query FindDiscussion($q: String!) {
       search(type: DISCUSSION, query: $q, first: 1) {
         nodes { ... on Discussion { id } }
       }
     }`,
    { q: searchQuery }
  );

  const nodes = data?.data?.search?.nodes;
  let discussionId;

  if (nodes && nodes.length > 0) {
    discussionId = nodes[0].id;
  } else {
    // No discussion exists yet for this page — create one so the comment has somewhere to land
    const created = await ghGraphQL(pat,
      `mutation CreateDiscussion($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
         createDiscussion(input: { repositoryId: $repoId, categoryId: $catId, title: $title, body: $body }) {
           discussion { id }
         }
       }`,
      {
        repoId: REPO_NODE_ID,
        catId:  DISC_CAT_ID,
        title:  pathname,
        body:   'Suggestions and discussion for this wiki page.',
      }
    );
    discussionId = created?.data?.createDiscussion?.discussion?.id;
    if (!discussionId) return; // creation failed — give up silently
  }

  const commentBody =
    'A suggestion was submitted for this page here:\n' +
    '**[' + issueTitle + '](' + issueUrl + ')**';

  await ghGraphQL(pat,
    `mutation AddComment($discussionId: ID!, $body: String!) {
       addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
         comment { url }
       }
     }`,
    { discussionId, body: commentBody }
  );
}

// ── Response helper ───────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
