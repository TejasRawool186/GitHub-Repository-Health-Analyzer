/**
 * GitHub Repository Intelligence Platform
 * Main entry point for the Apify Actor
 *
 * Implements deterministic repository analysis across 20 intelligence features,
 * 7-pillar health scoring, interactive architecture/data-flow visualization,
 * SBOM generation (CycloneDX/SPDX), and portfolio analytics.
 */

import { Actor, log } from 'apify';
import { createGitHubClient, checkRateLimit, getUserRepos } from './github-client.js';
import { analyzeRepository } from './analyzer-orchestrator.js';
import { parseGitHubUrl } from './utils.js';
import { generateHtmlReport, generateMarkdownSummary } from './report-generator.js';
import { generateCombinedDashboard } from './dashboard-generator.js';

// Default demo repository for zero-config health check
const DEMO_REPO_URL = 'https://github.com/apify/crawlee';

/**
 * Process a single repository and return its complete intelligence record
 */
async function processRepository(octokit, owner, repo, options = {}) {
    log.info(`Processing repository: ${owner}/${repo}`);

    const result = await analyzeRepository(octokit, owner, repo, options);
    if (!result) {
        log.warning(`Skipping ${owner}/${repo} - repository inaccessible or not found`);
        return null;
    }

    // Generate single-repository summary reports
    const htmlReport = generateHtmlReport(result);
    const markdownSummary = generateMarkdownSummary(result);

    result.html_report = htmlReport;
    result.markdown_summary = markdownSummary;

    // Save individual HTML report and SBOM files to Key-Value Store
    try {
        const store = await Actor.openKeyValueStore();
        const safeRepoName = `${owner}_${repo}`.replace(/[^a-zA-Z0-9-_]/g, '_');

        await store.setValue(`report_${safeRepoName}.html`, htmlReport, { contentType: 'text/html' });

        if (result.sbom?.cyclonedx_json) {
            await store.setValue(`sbom_cyclonedx_${safeRepoName}.json`, result.sbom.cyclonedx_json, { contentType: 'application/json' });
        }
        if (result.sbom?.spdx_json) {
            await store.setValue(`sbom_spdx_${safeRepoName}.json`, result.sbom.spdx_json, { contentType: 'application/json' });
        }

        log.info(`Stored artifacts for ${owner}/${repo} in Key-Value Store`);
    } catch (storeError) {
        log.warning(`Could not persist individual report to Key-Value Store: ${storeError.message}`);
    }

    return result;
}

/**
 * Main Actor function
 */
async function main() {
    // Initialize the Actor
    await Actor.init();

    // Register defensive aborting handler for graceful shutdown
    Actor.on('aborting', async () => {
        log.warning('Abort signal received from Apify platform. Finalizing state and exiting cleanly...');
        await Actor.exit();
    });

    log.info('GitHub Repository Intelligence Platform initialized');

    // Read Actor input
    const input = await Actor.getInput() ?? {};
    const {
        startUrls = [],
        maxReposPerUser = 10,
        githubToken = null,
        minHealthScore = 0,
        maxCommitHistory = 50,
        maxIssuesAndPrs = 30,
        proxyConfiguration: proxyInput = null,
    } = input;

    // Optional proxy configuration setup
    let proxyUrl = null;
    if (proxyInput) {
        try {
            const proxyConfig = await Actor.createProxyConfiguration(proxyInput);
            if (proxyConfig) {
                proxyUrl = await proxyConfig.newUrl();
                log.info('Configured Apify Proxy for outbound requests');
            }
        } catch (proxyError) {
            log.warning(`Proxy configuration setup failed: ${proxyError.message}`);
        }
    }

    // Create GitHub client
    const octokit = createGitHubClient(githubToken, proxyUrl);

    // Check rate limit
    const rateLimit = await checkRateLimit(octokit);
    log.info(`GitHub API Rate Limit: ${rateLimit.remaining}/${rateLimit.limit} requests remaining (Resets at ${rateLimit.reset.toISOString()})`);

    if (rateLimit.remaining < 15) {
        log.warning(`Low GitHub API rate limit (${rateLimit.remaining} remaining). Provide a GitHub Personal Access Token in input for 5,000 req/hr.`);
    }

    const scanOptions = {
        maxCommitHistory,
        maxIssuesAndPrs,
    };

    const analyzedRecords = [];

    // Health Check / Demo Mode: Run demo scan if no startUrls provided
    if (!startUrls || startUrls.length === 0) {
        log.info(`No input URLs provided. Running demonstration scan on ${DEMO_REPO_URL}...`);
        const parsed = parseGitHubUrl(DEMO_REPO_URL);

        const result = await processRepository(octokit, parsed.owner, parsed.repo, scanOptions);
        if (result) {
            await Actor.pushData(result);
            analyzedRecords.push(result);
            log.info(`Demo scan complete. Score: ${result.health_score}/100 (${result.health_grade})`);

            try {
                const dashboardHtml = generateCombinedDashboard([result]);
                const store = await Actor.openKeyValueStore();
                await store.setValue('OUTPUT', dashboardHtml, { contentType: 'text/html' });
                log.info('Interactive visual dashboard published to Key-Value Store key OUTPUT');
            } catch (err) {
                log.warning(`Failed to generate visual dashboard: ${err.message}`);
            }
        }

        await Actor.exit();
        return;
    }

    // Process provided URLs (Direct Mode & Profile Mode)
    let processedCount = 0;
    let successfulCount = 0;
    let filteredOutCount = 0;
    let skippedCount = 0;

    for (const urlEntry of startUrls) {
        const url = typeof urlEntry === 'string' ? urlEntry : urlEntry.url;
        if (!url) {
            log.warning('Encountered empty URL entry; skipping.');
            skippedCount++;
            continue;
        }

        const parsed = parseGitHubUrl(url);

        if (parsed.type === 'invalid') {
            log.warning(`Invalid GitHub URL: ${url}`);
            skippedCount++;
            continue;
        }

        if (parsed.type === 'user') {
            // Profile / Organization scan mode
            log.info(`Profile Mode: Discovering public repositories for ${parsed.owner}...`);
            const repos = await getUserRepos(octokit, parsed.owner, maxReposPerUser);
            log.info(`Found ${repos.length} repositories for ${parsed.owner}`);

            for (const repoInfo of repos) {
                try {
                    const result = await processRepository(octokit, repoInfo.owner, repoInfo.repo, scanOptions);
                    if (result) {
                        if (result.health_score >= minHealthScore) {
                            await Actor.pushData(result);
                            analyzedRecords.push(result);
                            successfulCount++;
                            log.info(`Completed ${repoInfo.owner}/${repoInfo.repo}: Score ${result.health_score} (${result.health_grade})`);
                        } else {
                            filteredOutCount++;
                            log.info(`Filtered ${repoInfo.owner}/${repoInfo.repo}: Score ${result.health_score} below minimum threshold ${minHealthScore}`);
                        }
                    } else {
                        skippedCount++;
                    }
                    processedCount++;
                } catch (error) {
                    log.error(`Failed to process ${repoInfo.owner}/${repoInfo.repo}: ${error.message}`);
                    skippedCount++;
                }
            }
        } else {
            // Direct repository scan mode
            log.info(`Direct Mode: Scanning repository ${parsed.owner}/${parsed.repo}...`);
            try {
                const result = await processRepository(octokit, parsed.owner, parsed.repo, scanOptions);
                if (result) {
                    if (result.health_score >= minHealthScore) {
                        await Actor.pushData(result);
                        analyzedRecords.push(result);
                        successfulCount++;
                        log.info(`Completed ${parsed.owner}/${parsed.repo}: Score ${result.health_score} (${result.health_grade})`);
                    } else {
                        filteredOutCount++;
                        log.info(`Filtered ${parsed.owner}/${parsed.repo}: Score ${result.health_score} below minimum threshold ${minHealthScore}`);
                    }
                } else {
                    skippedCount++;
                }
                processedCount++;
            } catch (error) {
                log.error(`Failed to process ${parsed.owner}/${parsed.repo}: ${error.message}`);
                skippedCount++;
            }
        }
    }

    log.info(`Scan summary: Processed=${processedCount}, Successful=${successfulCount}, Filtered=${filteredOutCount}, Skipped=${skippedCount}`);

    // Generate combined interactive dashboard for all scanned records
    if (analyzedRecords.length > 0) {
        try {
            const dashboardHtml = generateCombinedDashboard(analyzedRecords);
            const store = await Actor.openKeyValueStore();
            await store.setValue('OUTPUT', dashboardHtml, { contentType: 'text/html' });
            log.info('Interactive visual dashboard published to Key-Value Store key OUTPUT');
        } catch (error) {
            log.warning(`Could not generate combined visual dashboard: ${error.message}`);
        }
    }

    await Actor.exit();
}

main().catch(async (error) => {
    log.error(`Fatal Actor failure: ${error.message}`);
    process.exit(1);
});
