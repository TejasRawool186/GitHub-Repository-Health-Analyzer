/**
 * Utility functions for the GitHub Health Analyzer
 */

/**
 * Generate a Shields.io badge URL for the health score
 * @param {number} score - Health score (0-100)
 * @param {string} grade - Letter grade (A+, A, B, C, D, F)
 * @returns {string} Shields.io badge URL
 */
export function generateBadgeUrl(score, grade) {
    let color;
    if (score >= 80) {
        color = 'brightgreen';
    } else if (score >= 60) {
        color = 'green';
    } else if (score >= 50) {
        color = 'yellow';
    } else if (score >= 30) {
        color = 'orange';
    } else {
        color = 'red';
    }

    // URL encode the label and message
    const label = encodeURIComponent('Health');
    const message = encodeURIComponent(`${grade} (${score}%)`);

    return `https://img.shields.io/badge/${label}-${message}-${color}?style=for-the-badge`;
}

/**
 * Generate markdown badge code for README embedding
 * @param {number} score - Health score (0-100)
 * @param {string} grade - Letter grade
 * @param {string} repoUrl - Repository URL for badge link
 * @returns {string} Markdown badge code
 */
export function generateBadgeMarkdown(score, grade, repoUrl) {
    const badgeUrl = generateBadgeUrl(score, grade);
    return `[![Health: ${grade}](${badgeUrl})](${repoUrl})`;
}

/**
 * Parse a GitHub URL to extract owner and repo
 * @param {string} url - GitHub URL
 * @returns {{type: 'repo'|'user'|'invalid', owner: string|null, repo: string|null}}
 */
export function parseGitHubUrl(url) {
    if (!url || typeof url !== 'string') {
        return { type: 'invalid', owner: null, repo: null };
    }

    // Clean the URL
    let cleanUrl = url.trim();

    // Handle URLs without protocol
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = `https://${cleanUrl}`;
    }

    try {
        const urlObj = new URL(cleanUrl);

        // Check if it's a GitHub URL
        if (!urlObj.hostname.includes('github.com')) {
            return { type: 'invalid', owner: null, repo: null };
        }

        // Parse the pathname
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        if (pathParts.length === 0) {
            return { type: 'invalid', owner: null, repo: null };
        }

        if (pathParts.length === 1) {
            // User profile URL: https://github.com/username
            return { type: 'user', owner: pathParts[0], repo: null };
        }

        // Repository URL: https://github.com/owner/repo
        // Also handles: https://github.com/owner/repo/tree/main, etc.
        // Strip .git suffix if present
        let repoName = pathParts[1];
        if (repoName.endsWith('.git')) {
            repoName = repoName.slice(0, -4);
        }
        return { type: 'repo', owner: pathParts[0], repo: repoName };
    } catch (error) {
        return { type: 'invalid', owner: null, repo: null };
    }
}

/**
 * Format a date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return 'Unknown';

    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Unknown';

    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Format a number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('en-US');
}

/**
 * Calculate relative time from now
 * @param {string|Date} date - Date to calculate from
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
    if (!date) return 'Unknown';

    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Unknown';

    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms (doubles each retry)
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on 404s or auth errors
            if (error.status === 404 || error.status === 401 || error.status === 403) {
                throw error;
            }

            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}
