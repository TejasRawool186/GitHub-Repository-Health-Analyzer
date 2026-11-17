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

function generateEmptyDashboardHtml(processed = 0, skipped = 0, filtered = 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Repository Intelligence - Run Summary</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #090A07;
            --bg-card: #151515;
            --accent: #B8FF63;
            --border-color: #262626;
            --text-main: #FFFFFF;
            --text-muted: #A3A3A3;
        }
        body { background: var(--bg-base); color: var(--text-main); font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; margin: 0; }
        .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 40px; max-width: 620px; text-align: center; }
        h1 { font-size: 22px; font-weight: 800; margin-bottom: 12px; color: var(--text-main); }
        p { color: var(--text-muted); font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 6px; background: rgba(184, 255, 99, 0.1); color: var(--accent); font-weight: 700; font-size: 13px; margin-bottom: 24px; }
        .stats { display: flex; justify-content: space-around; background: #1a1a1a; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 20px; }
        .stat-item { text-align: center; }
        .stat-val { font-size: 20px; font-weight: 800; color: var(--accent); font-family: 'JetBrains Mono', monospace; }
        .stat-lbl { font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-top: 2px; }
        .tips { text-align: left; background: #0e0e0e; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; font-size: 13px; color: var(--text-muted); }
        .tips ul { padding-left: 20px; margin-top: 8px; }
        .tips li { margin-bottom: 6px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">RUN DIAGNOSTICS</div>
        <h1>No Repositories Output</h1>
        <p>The scan completed, but no repositories were saved to the dataset or dashboard.</p>
        <div class="stats">
            <div class="stat-item"><div class="stat-val">${processed}</div><div class="stat-lbl">Processed</div></div>
            <div class="stat-item"><div class="stat-val">${filtered}</div><div class="stat-lbl">Filtered Out</div></div>
            <div class="stat-item"><div class="stat-val">${skipped}</div><div class="stat-lbl">Skipped / Failed</div></div>
        </div>
        <div class="tips">
            <strong>Checklist to resolve:</strong>
            <ul>
                <li>Verify the GitHub repository URL is valid and public (e.g. <code>https://github.com/owner/repo</code>).</li>
                <li>Check the run log in the <strong>Log</strong> tab to see specific API warnings or error details.</li>
                <li>For private repositories or high-frequency audits, provide a GitHub Personal Access Token in input.</li>
                <li>Ensure <code>minHealthScore</code> is set to 0 in input.</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
}

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
        await Actor.setValue(`report_${safeRepoName}.html`, htmlReport, { contentType: 'text/html' });

        if (result.sbom?.cyclonedx_json) {
            await Actor.setValue(`sbom_cyclonedx_${safeRepoName}.json`, result.sbom.cyclonedx_json, { contentType: 'application/json' });
        }
        if (result.sbom?.spdx_json) {
            await Actor.setValue(`sbom_spdx_${safeRepoName}.json`, result.sbom.spdx_json, { contentType: 'application/json' });
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

    const analyzedRecords = [];

    // Register defensive aborting handler for graceful shutdown
    Actor.on('aborting', async () => {
        log.warning('Abort signal received from Apify platform. Finalizing state and exiting cleanly...');
        try {
            if (analyzedRecords.length > 0) {
                const dashboardHtml = generateCombinedDashboard(analyzedRecords);
                await Actor.setValue('OUTPUT', dashboardHtml, { contentType: 'text/html' });
            }
        } catch (e) {
            // ignore
        }
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
                await Actor.setValue('OUTPUT', dashboardHtml, { contentType: 'text/html' });
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
    try {
        if (analyzedRecords.length > 0) {
            const dashboardHtml = generateCombinedDashboard(analyzedRecords);
            await Actor.setValue('OUTPUT', dashboardHtml, { contentType: 'text/html' });
            log.info('Interactive visual dashboard published to Key-Value Store key OUTPUT');
        } else {
            const fallbackHtml = generateEmptyDashboardHtml(processedCount, skippedCount, filteredOutCount);
            await Actor.setValue('OUTPUT', fallbackHtml, { contentType: 'text/html' });
            log.info('Diagnostic dashboard published to Key-Value Store key OUTPUT');
        }
    } catch (error) {
        log.warning(`Could not persist visual dashboard to OUTPUT: ${error.message}`);
    }

    await Actor.exit();
}

main().catch(async (error) => {
    log.error(`Fatal Actor failure: ${error.message}`);
    process.exit(1);
});
