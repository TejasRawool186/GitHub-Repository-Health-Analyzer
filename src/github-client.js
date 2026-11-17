/**
 * GitHub API Client Wrapper
 * Handles GitHub REST & Trees API with rate limit tracking, caching, and retry logic
 */

import { Octokit } from 'octokit';
import { log } from 'apify';
import { retryWithBackoff, sleep } from './utils.js';

// In-memory cache for API calls during a single Actor run to minimize duplicate requests
const memoryCache = new Map();

/**
 * Create and configure the GitHub client
 * @param {string|null} token - Optional GitHub PAT for higher rate limits (5000/hr vs 60/hr)
 * @param {string|null} proxyUrl - Optional proxy URL for requests
 * @returns {Octokit} Configured Octokit instance
 */
export function createGitHubClient(token = null, proxyUrl = null) {
    const options = {
        userAgent: 'github-health-analyzer/2.0.0',
    };

    if (token) {
        options.auth = token.trim();
        log.info('Using authenticated GitHub API (5000 requests/hour)');
    } else {
        log.info('Using unauthenticated GitHub API (60 requests/hour limit)');
    }

    if (proxyUrl) {
        log.info('Routing GitHub requests through configured proxy');
        // If custom proxy agent is provided in future or custom fetch dispatcher
    }

    return new Octokit(options);
}

/**
 * Check current rate limit status
 * @param {Octokit} octokit - GitHub client instance
 * @returns {Promise<{remaining: number, limit: number, reset: Date, used: number}>}
 */
export async function checkRateLimit(octokit) {
    try {
        const { data } = await octokit.rest.rateLimit.get();
        const core = data.resources.core;
        return {
            remaining: core.remaining,
            limit: core.limit,
            used: core.used || (core.limit - core.remaining),
            reset: new Date(core.reset * 1000),
        };
    } catch (error) {
        log.warning(`Failed to check rate limit: ${error.message}`);
        return { remaining: 60, limit: 60, used: 0, reset: new Date() };
    }
}

/**
 * Helper to cache and execute an Octokit call with exponential backoff
 */
async function cachedCall(cacheKey, fn) {
    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey);
    }
    const result = await retryWithBackoff(fn, 3, 1000);
    memoryCache.set(cacheKey, result);
    return result;
}

/**
 * Get repository metadata
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object|null>} Repository data or null if not found
 */
export async function getRepoData(octokit, owner, repo) {
    const key = `repo:${owner}/${repo}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.repos.get({ owner, repo });
            return data;
        });
    } catch (error) {
        if (error.status === 404) {
            log.warning(`Repository not found: ${owner}/${repo}`);
            return null;
        }
        if (error.status === 403 && error.message?.includes('API rate limit')) {
            log.error(`GitHub API rate limit exceeded during getRepoData for ${owner}/${repo}`);
            throw error;
        }
        log.warning(`Could not fetch repository ${owner}/${repo}: ${error.message}`);
        return null;
    }
}

/**
 * Fetch complete repository tree using Git Trees API (recursive: 1)
 * This fetches the entire repository structure in a SINGLE API call.
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Default branch name (e.g. 'main', 'master')
 * @returns {Promise<{tree: Array<Object>, truncated: boolean}>}
 */
export async function getRepoTree(octokit, owner, repo, branch = 'main') {
    const key = `tree:${owner}/${repo}:${branch}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: '1',
            });
            return {
                tree: data.tree || [],
                truncated: Boolean(data.truncated),
                sha: data.sha,
            };
        });
    } catch (error) {
        log.warning(`Git Trees API recursive fetch failed for ${owner}/${repo} (${branch}): ${error.message}`);
        return { tree: [], truncated: false, error: error.message };
    }
}

/**
 * Get raw file content or parsed text from repository
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @returns {Promise<{exists: boolean, content: string, size: number}>}
 */
export async function getFileContent(octokit, owner, repo, path) {
    const key = `content:${owner}/${repo}:${path}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
            if (Array.isArray(data)) {
                return { exists: true, isDirectory: true, content: '', size: 0 };
            }
            if (data.content && data.encoding === 'base64') {
                const text = Buffer.from(data.content, 'base64').toString('utf-8');
                return { exists: true, isDirectory: false, content: text, size: data.size || text.length };
            }
            return { exists: true, isDirectory: false, content: '', size: data.size || 0 };
        });
    } catch (error) {
        if (error.status === 404) {
            return { exists: false, isDirectory: false, content: '', size: 0 };
        }
        return { exists: false, isDirectory: false, content: '', size: 0, error: error.message };
    }
}

/**
 * Get repository README content
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{exists: boolean, content: string, length: number}>}
 */
export async function getReadme(octokit, owner, repo) {
    const key = `readme:${owner}/${repo}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.repos.getReadme({ owner, repo });
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            return {
                exists: true,
                content,
                length: content.length,
            };
        });
    } catch (error) {
        if (error.status === 404) {
            return { exists: false, content: '', length: 0 };
        }
        return { exists: false, content: '', length: 0 };
    }
}

/**
 * Get repository programming languages distribution (bytes per language)
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Record<string, number>>}
 */
export async function getRepoLanguages(octokit, owner, repo) {
    const key = `languages:${owner}/${repo}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.repos.listLanguages({ owner, repo });
            return data || {};
        });
    } catch (error) {
        log.warning(`Failed to fetch languages for ${owner}/${repo}: ${error.message}`);
        return {};
    }
}

/**
 * Get recent commits
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} limit - Maximum commits to retrieve
 * @returns {Promise<Array<Object>>}
 */
export async function getRecentCommits(octokit, owner, repo, limit = 50) {
    const key = `commits:${owner}/${repo}:${limit}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.repos.listCommits({
                owner,
                repo,
                per_page: Math.min(limit, 100),
            });
            return data || [];
        });
    } catch (error) {
        log.warning(`Failed to fetch commits for ${owner}/${repo}: ${error.message}`);
        return [];
    }
}

/**
 * Get repository contributors
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} limit - Maximum contributors to retrieve
 * @returns {Promise<Array<Object>>}
 */
export async function getContributors(octokit, owner, repo, limit = 30) {
    const key = `contributors:${owner}/${repo}:${limit}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.repos.listContributors({
                owner,
                repo,
                per_page: Math.min(limit, 100),
            });
            return data || [];
        });
    } catch (error) {
        log.warning(`Failed to fetch contributors for ${owner}/${repo}: ${error.message}`);
        return [];
    }
}

/**
 * Get repository releases
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} limit - Maximum releases to retrieve
 * @returns {Promise<Array<Object>>}
 */
export async function getReleases(octokit, owner, repo, limit = 20) {
    const key = `releases:${owner}/${repo}:${limit}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.repos.listReleases({
                owner,
                repo,
                per_page: Math.min(limit, 100),
            });
            return data || [];
        });
    } catch (error) {
        return [];
    }
}

/**
 * Get repository tags
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} limit - Maximum tags to retrieve
 * @returns {Promise<Array<Object>>}
 */
export async function getTags(octokit, owner, repo, limit = 20) {
    const key = `tags:${owner}/${repo}:${limit}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.repos.listTags({
                owner,
                repo,
                per_page: Math.min(limit, 100),
            });
            return data || [];
        });
    } catch (error) {
        return [];
    }
}

/**
 * Get repository issues (both open and closed samples)
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} state - 'open', 'closed', or 'all'
 * @param {number} limit - Maximum issues to retrieve
 * @returns {Promise<Array<Object>>}
 */
export async function getIssues(octokit, owner, repo, state = 'open', limit = 30) {
    const key = `issues:${owner}/${repo}:${state}:${limit}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.issues.listForRepo({
                owner,
                repo,
                state,
                per_page: Math.min(limit, 100),
                sort: 'updated',
                direction: 'desc',
            });
            return data || [];
        });
    } catch (error) {
        return [];
    }
}

/**
 * Get repository pull requests (both open and closed/merged samples)
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} state - 'open', 'closed', or 'all'
 * @param {number} limit - Maximum PRs to retrieve
 * @returns {Promise<Array<Object>>}
 */
export async function getPullRequests(octokit, owner, repo, state = 'all', limit = 30) {
    const key = `pulls:${owner}/${repo}:${state}:${limit}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.pulls.list({
                owner,
                repo,
                state,
                per_page: Math.min(limit, 100),
                sort: 'updated',
                direction: 'desc',
            });
            return data || [];
        });
    } catch (error) {
        return [];
    }
}

/**
 * Get list of GitHub Actions workflows
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{exists: boolean, count: number, workflows: Array<Object>}>}
 */
export async function getWorkflows(octokit, owner, repo) {
    const key = `workflows:${owner}/${repo}`;
    try {
        return await cachedCall(key, async () => {
            const { data } = await octokit.rest.actions.listRepoWorkflows({ owner, repo });
            return {
                exists: (data.total_count || 0) > 0,
                count: data.total_count || 0,
                workflows: data.workflows || [],
            };
        });
    } catch (error) {
        return { exists: false, count: 0, workflows: [] };
    }
}

/**
 * Get issue statistics (open, closed, and closed ratio)
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{open: number, closed: number, ratio: number}>}
 */
export async function getIssueStats(octokit, owner, repo) {
    try {
        const [openResponse, closedResponse] = await Promise.all([
            octokit.rest.issues.listForRepo({ owner, repo, state: 'open', per_page: 1 }),
            octokit.rest.issues.listForRepo({ owner, repo, state: 'closed', per_page: 1 }),
        ]);

        const openCount = parseInt(openResponse.headers['x-total-count'] || openResponse.data.length, 10);
        const closedCount = parseInt(closedResponse.headers['x-total-count'] || closedResponse.data.length, 10);
        const total = openCount + closedCount;
        const ratio = total > 0 ? (closedCount / total) * 100 : 0;

        return {
            open: isNaN(openCount) ? 0 : openCount,
            closed: isNaN(closedCount) ? 0 : closedCount,
            ratio: Math.round(ratio),
        };
    } catch (error) {
        return { open: 0, closed: 0, ratio: 0 };
    }
}

/**
 * Check if a specific file exists
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @returns {Promise<boolean>}
 */
export async function fileExists(octokit, owner, repo, path) {
    try {
        await octokit.rest.repos.getContent({ owner, repo, path });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Check if a directory exists
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Directory path
 * @returns {Promise<boolean>}
 */
export async function directoryExists(octokit, owner, repo, path) {
    try {
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
        return Array.isArray(data);
    } catch (error) {
        return false;
    }
}

/**
 * Check for common security files
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{securityMd: boolean, dependabot: boolean}>}
 */
export async function getSecurityFiles(octokit, owner, repo) {
    const [securityMd, dependabot, dependabotYml] = await Promise.all([
        fileExists(octokit, owner, repo, 'SECURITY.md'),
        fileExists(octokit, owner, repo, '.github/dependabot.yml'),
        fileExists(octokit, owner, repo, '.github/dependabot.yaml'),
    ]);

    return {
        securityMd,
        dependabot: dependabot || dependabotYml,
    };
}

/**
 * Check for common linter configurations
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>}
 */
export async function hasLinterConfig(octokit, owner, repo) {
    const linterFiles = [
        '.eslintrc',
        '.eslintrc.js',
        '.eslintrc.json',
        '.eslintrc.yml',
        '.eslintrc.yaml',
        'eslint.config.js',
        'eslint.config.mjs',
        '.prettierrc',
        '.prettierrc.js',
        '.prettierrc.json',
        'biome.json',
        '.stylelintrc',
        'tslint.json',
        '.flake8',
        'pyproject.toml',
        'ruff.toml',
        '.golangci.yml',
        '.rustfmt.toml',
    ];

    for (const file of linterFiles) {
        if (await fileExists(octokit, owner, repo, file)) {
            return true;
        }
    }
    return false;
}

/**
 * Check for test directory
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>}
 */
export async function hasTestDirectory(octokit, owner, repo) {
    const testDirs = ['test', 'tests', '__tests__', 'spec', 'specs'];
    for (const dir of testDirs) {
        if (await directoryExists(octokit, owner, repo, dir)) {
            return true;
        }
    }
    return false;
}

/**
 * Get all public repositories for a user or organization
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} username - GitHub username or org name
 * @param {number} maxRepos - Maximum repos to fetch (0 for unlimited)
 * @returns {Promise<Array<{owner: string, repo: string, url: string}>>}
 */
export async function getUserRepos(octokit, username, maxRepos = 10) {
    try {
        const perPage = maxRepos > 0 ? Math.min(maxRepos, 100) : 100;
        let repos = [];

        try {
            const { data } = await octokit.rest.repos.listForUser({
                username,
                type: 'owner',
                sort: 'updated',
                direction: 'desc',
                per_page: perPage,
            });
            repos = data;
        } catch (userErr) {
            // Might be an organization
            const { data } = await octokit.rest.repos.listForOrg({
                org: username,
                type: 'public',
                sort: 'updated',
                direction: 'desc',
                per_page: perPage,
            });
            repos = data;
        }

        const mapped = repos.map((repo) => ({
            owner: repo.owner.login,
            repo: repo.name,
            url: repo.html_url,
        }));

        return maxRepos > 0 ? mapped.slice(0, maxRepos) : mapped;
    } catch (error) {
        if (error.status === 404) {
            log.warning(`User or organization not found: ${username}`);
            return [];
        }
        throw error;
    }
}
