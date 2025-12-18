/**
 * GitHub API Client Wrapper
 * Handles all GitHub API interactions with rate limiting support
 */

import { Octokit } from 'octokit';
import { log } from 'crawlee';

/**
 * Create and configure the GitHub client
 * @param {string|null} token - Optional GitHub PAT for higher rate limits
 * @returns {Octokit} Configured Octokit instance
 */
export function createGitHubClient(token = null) {
    const options = {
        userAgent: 'github-health-analyzer/1.0.0',
    };

    if (token) {
        options.auth = token;
        log.info('Using authenticated GitHub API (5000 requests/hour)');
    } else {
        log.info('Using unauthenticated GitHub API (60 requests/hour)');
    }

    return new Octokit(options);
}

/**
 * Check current rate limit status
 * @param {Octokit} octokit - GitHub client instance
 * @returns {Promise<{remaining: number, limit: number, reset: Date}>}
 */
export async function checkRateLimit(octokit) {
    try {
        const { data } = await octokit.rest.rateLimit.get();
        const core = data.resources.core;
        return {
            remaining: core.remaining,
            limit: core.limit,
            reset: new Date(core.reset * 1000),
        };
    } catch (error) {
        log.warning('Failed to check rate limit:', error.message);
        return { remaining: 60, limit: 60, reset: new Date() };
    }
}

/**
 * Get repository metadata
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object|null>} Repository data or null if not found
 */
export async function getRepoData(octokit, owner, repo) {
    try {
        const { data } = await octokit.rest.repos.get({ owner, repo });
        return data;
    } catch (error) {
        if (error.status === 404) {
            log.warning(`Repository not found: ${owner}/${repo}`);
            return null;
        }
        throw error;
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
    try {
        const { data } = await octokit.rest.repos.getReadme({ owner, repo });
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return {
            exists: true,
            content,
            length: content.length,
        };
    } catch (error) {
        if (error.status === 404) {
            return { exists: false, content: '', length: 0 };
        }
        throw error;
    }
}

/**
 * Check if a file exists in the repository
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path to check
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
 * Check if a directory exists in the repository
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Directory path to check
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
 * Get list of workflows in the repository
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{exists: boolean, count: number}>}
 */
export async function getWorkflows(octokit, owner, repo) {
    try {
        const { data } = await octokit.rest.actions.listRepoWorkflows({ owner, repo });
        return {
            exists: data.total_count > 0,
            count: data.total_count,
        };
    } catch (error) {
        // Workflows might be disabled or not accessible
        return { exists: false, count: 0 };
    }
}

/**
 * Get repository releases
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{exists: boolean, count: number, latest: string|null}>}
 */
export async function getReleases(octokit, owner, repo) {
    try {
        const { data } = await octokit.rest.repos.listReleases({ owner, repo, per_page: 10 });
        return {
            exists: data.length > 0,
            count: data.length,
            latest: data.length > 0 ? data[0].tag_name : null,
        };
    } catch (error) {
        return { exists: false, count: 0, latest: null };
    }
}

/**
 * Get repository tags
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{exists: boolean, count: number}>}
 */
export async function getTags(octokit, owner, repo) {
    try {
        const { data } = await octokit.rest.repos.listTags({ owner, repo, per_page: 10 });
        return {
            exists: data.length > 0,
            count: data.length,
        };
    } catch (error) {
        return { exists: false, count: 0 };
    }
}

/**
 * Get issue statistics
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<{open: number, closed: number, ratio: number}>}
 */
export async function getIssueStats(octokit, owner, repo) {
    try {
        // Get open issues count from repo data (already fetched usually)
        const [openResponse, closedResponse] = await Promise.all([
            octokit.rest.issues.listForRepo({ owner, repo, state: 'open', per_page: 1 }),
            octokit.rest.issues.listForRepo({ owner, repo, state: 'closed', per_page: 1 }),
        ]);

        // Extract total count from headers (if available) or estimate
        const openCount = parseInt(openResponse.headers['x-total-count'] || openResponse.data.length, 10);
        const closedCount = parseInt(closedResponse.headers['x-total-count'] || closedResponse.data.length, 10);

        const total = openCount + closedCount;
        const ratio = total > 0 ? (closedCount / total) * 100 : 0;

        return {
            open: openCount,
            closed: closedCount,
            ratio: Math.round(ratio),
        };
    } catch (error) {
        return { open: 0, closed: 0, ratio: 0 };
    }
}

/**
 * Get all public repositories for a user
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} username - GitHub username
 * @param {number} maxRepos - Maximum number of repos to fetch (0 for all)
 * @returns {Promise<Array<{owner: string, repo: string, url: string}>>}
 */
export async function getUserRepos(octokit, username, maxRepos = 10) {
    try {
        const perPage = maxRepos > 0 ? Math.min(maxRepos, 100) : 100;
        const { data } = await octokit.rest.repos.listForUser({
            username,
            type: 'owner',
            sort: 'updated',
            direction: 'desc',
            per_page: perPage,
        });

        const repos = data.map((repo) => ({
            owner: repo.owner.login,
            repo: repo.name,
            url: repo.html_url,
        }));

        return maxRepos > 0 ? repos.slice(0, maxRepos) : repos;
    } catch (error) {
        if (error.status === 404) {
            log.warning(`User not found: ${username}`);
            return [];
        }
        throw error;
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
        '.prettierrc',
        '.prettierrc.js',
        '.prettierrc.json',
        'biome.json',
        '.stylelintrc',
        'tslint.json',
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
