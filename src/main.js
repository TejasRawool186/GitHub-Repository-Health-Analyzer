/**
 * GitHub Repository Health Analyzer
 * Main entry point for the Apify Actor
 *
 * Analyzes GitHub repositories and generates health scores (0-100)
 * based on 5 pillars: Readability, Stability, Security, Community, Maintainability
 */

import { Actor, log } from 'apify';
import { createGitHubClient, getRepoData, getUserRepos, checkRateLimit } from './github-client.js';
import { calculateHealthScore } from './scorer.js';
import { parseGitHubUrl, generateBadgeUrl, formatDate } from './utils.js';
import { generateHtmlReport, generateMarkdownSummary } from './report-generator.js';
import { generateCombinedDashboard } from './dashboard-generator.js';

// Demo repository for health checks (when no input provided)
const DEMO_REPO_URL = 'https://github.com/apify/crawlee';

/**
 * Process a single repository and return its health analysis
 */
async function processRepository(octokit, owner, repo) {
    log.info(`Processing repository: ${owner}/${repo}`);

    // Get repository data
    const repoData = await getRepoData(octokit, owner, repo);
    if (!repoData) {
        log.warning(`Skipping ${owner}/${repo} - repository not found or inaccessible`);
        return null;
    }

    // Calculate health score
    const healthResult = await calculateHealthScore(octokit, owner, repo, repoData);

    // Generate badge
    const badgeUrl = generateBadgeUrl(healthResult.totalScore, healthResult.grade);

    // Construct output record
    return {
        // Overview fields
        repo_name: repoData.full_name,
        repo_url: repoData.html_url,
        health_score: healthResult.totalScore,
        health_grade: healthResult.grade,
        badge_url: badgeUrl,
        badge_markdown: `[![Health: ${healthResult.grade}](${badgeUrl})](${repoData.html_url})`,
        risk_level: healthResult.riskLevel,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        last_commit: formatDate(repoData.pushed_at),

        // Security fields
        license_type: repoData.license?.name || 'No License',
        license_risk: healthResult.pillars.security.details.licenseRisk,
        has_security_md: healthResult.pillars.security.details.hasSecurityMd ? '✅ Yes' : '❌ No',
        dependabot_enabled: healthResult.pillars.security.details.hasDependabot ? '✅ Yes' : '❌ No',

        // Community fields
        open_issues: repoData.open_issues_count,
        closed_issues: healthResult.pillars.community.details.closedIssues,
        issue_close_ratio: `${healthResult.pillars.community.details.issueCloseRatio}%`,
        has_contributing_md: healthResult.pillars.community.details.hasContributing ? '✅ Yes' : '❌ No',
        subscribers: repoData.subscribers_count,

        // Documentation fields (NEW)
        has_docs_folder: healthResult.pillars.documentation.details.hasDocsFolder ? '✅ Yes' : '❌ No',
        has_changelog: healthResult.pillars.documentation.details.hasChangelog ? '✅ Yes' : '❌ No',
        has_examples: healthResult.pillars.documentation.details.hasExamples ? '✅ Yes' : '❌ No',
        has_wiki: healthResult.pillars.documentation.details.hasWiki ? '✅ Yes' : '❌ No',

        // Automation fields (NEW)
        workflow_count: healthResult.pillars.automation.details.workflowCount,
        has_pr_template: healthResult.pillars.automation.details.hasPRTemplate ? '✅ Yes' : '❌ No',
        has_issue_template: healthResult.pillars.automation.details.hasIssueTemplate ? '✅ Yes' : '❌ No',
        has_code_of_conduct: healthResult.pillars.automation.details.hasCodeOfConduct ? '✅ Yes' : '❌ No',

        // Detailed scores (7 pillars)
        readability_score: healthResult.pillars.readability.score,
        stability_score: healthResult.pillars.stability.score,
        security_score: healthResult.pillars.security.score,
        community_score: healthResult.pillars.community.score,
        maintainability_score: healthResult.pillars.maintainability.score,
        documentation_score: healthResult.pillars.documentation.score,
        automation_score: healthResult.pillars.automation.score,

        // Recommendations (NEW)
        recommendation_count: healthResult.recommendationCount,
        recommendations: healthResult.recommendations,
        // Short format for table display (prevents horizontal scroll)
        top_recommendations: healthResult.recommendations.slice(0, 3).map(r =>
            `${r.priority === '🔴 Critical' ? '🔴' : r.priority === '🟡 Medium' ? '🟡' : '🟢'} ${r.issue.substring(0, 40)}${r.issue.length > 40 ? '...' : ''}`
        ).join(' | '),

        // Pillar rows for vertical display (NEW)
        pillar_rows: [
            { metric: '📊 Overall Score', value: `${healthResult.totalScore}/100`, grade: healthResult.grade },
            { metric: '📖 Readability (15%)', value: `${healthResult.pillars.readability.score}/100`, status: healthResult.pillars.readability.score >= 70 ? '✅' : '⚠️' },
            { metric: '🧱 Stability (15%)', value: `${healthResult.pillars.stability.score}/100`, status: healthResult.pillars.stability.score >= 70 ? '✅' : '⚠️' },
            { metric: '🔐 Security (15%)', value: `${healthResult.pillars.security.score}/100`, status: healthResult.pillars.security.score >= 70 ? '✅' : '⚠️' },
            { metric: '👥 Community (10%)', value: `${healthResult.pillars.community.score}/100`, status: healthResult.pillars.community.score >= 70 ? '✅' : '⚠️' },
            { metric: '🛠️ Maintainability (15%)', value: `${healthResult.pillars.maintainability.score}/100`, status: healthResult.pillars.maintainability.score >= 70 ? '✅' : '⚠️' },
            { metric: '📝 Documentation (15%)', value: `${healthResult.pillars.documentation.score}/100`, status: healthResult.pillars.documentation.score >= 70 ? '✅' : '⚠️' },
            { metric: '🤖 Automation (15%)', value: `${healthResult.pillars.automation.score}/100`, status: healthResult.pillars.automation.score >= 70 ? '✅' : '⚠️' },
            { metric: '⭐ Stars', value: repoData.stargazers_count.toLocaleString(), status: repoData.stargazers_count >= 100 ? '✅' : '⚠️' },
            { metric: '📅 Last Commit', value: formatDate(repoData.pushed_at), status: '📆' },
        ],

        // Metadata
        description: repoData.description || '',
        language: repoData.language || 'Unknown',
        created_at: formatDate(repoData.created_at),
        default_branch: repoData.default_branch,
        is_fork: repoData.fork,
        is_archived: repoData.archived,

        // Analysis details for debugging/advanced users
        analysis_details: {
            readability: healthResult.pillars.readability.details,
            stability: healthResult.pillars.stability.details,
            security: healthResult.pillars.security.details,
            community: healthResult.pillars.community.details,
            maintainability: healthResult.pillars.maintainability.details,
            documentation: healthResult.pillars.documentation.details,
            automation: healthResult.pillars.automation.details,
        },

        // Timestamps
        analyzed_at: new Date().toISOString(),
    };

    // Generate visual reports
    const htmlReport = generateHtmlReport(result);
    const markdownSummary = generateMarkdownSummary(result);

    // Add reports to result
    result.html_report = htmlReport;
    result.markdown_summary = markdownSummary;

    // Save HTML report to key-value store
    const store = await Actor.openKeyValueStore();
    const safeRepoName = `${owner}_${repo}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    await store.setValue(`report_${safeRepoName}.html`, htmlReport, { contentType: 'text/html' });
    log.info(`📄 HTML report saved: report_${safeRepoName}.html`);

    return result;
}

/**
 * Main Actor function
 */
async function main() {
    // Initialize the Actor
    await Actor.init();

    log.info('🚀 GitHub Repository Health Analyzer started');

    // Get input
    const input = await Actor.getInput() ?? {};
    const {
        startUrls = [],
        maxReposPerUser = 10,
        githubToken = null,
        minHealthScore = 0,
    } = input;

    // Health Check Mode: If no input provided, run demo scan
    if (!startUrls || startUrls.length === 0) {
        log.info('📋 Health Check Mode: No input provided. Running demo scan on apify/crawlee...');
        const parsed = parseGitHubUrl(DEMO_REPO_URL);
        const octokit = createGitHubClient(githubToken);

        const result = await processRepository(octokit, parsed.owner, parsed.repo);
        if (result) {
            await Actor.pushData(result);
            log.info(`✅ Demo scan complete. Score: ${result.health_score} (${result.health_grade})`);

            // Generate dashboard for demo mode too
            try {
                const dashboardHtml = generateCombinedDashboard([result]);
                const store = await Actor.openKeyValueStore();
                await store.setValue('OUTPUT', dashboardHtml, { contentType: 'text/html' });
                log.info('🎨 VISUAL DASHBOARD READY! Click "Preview in new tab" to view');
            } catch (error) {
                log.warning(`⚠️ Could not generate dashboard: ${error.message}`);
            }
        }

        await Actor.exit();
        return;
    }

    // Initialize GitHub client
    const octokit = createGitHubClient(githubToken);

    // Check rate limit
    const rateLimit = await checkRateLimit(octokit);
    log.info(`📊 Rate limit: ${rateLimit.remaining}/${rateLimit.limit} requests remaining`);

    if (rateLimit.remaining < 10) {
        log.warning(`⚠️ Low rate limit! Resets at ${rateLimit.reset.toISOString()}`);
    }

    // Track statistics
    let processed = 0;
    let successful = 0;
    let skipped = 0;
    let filteredOut = 0;

    // Process each URL
    for (const urlEntry of startUrls) {
        const url = typeof urlEntry === 'string' ? urlEntry : urlEntry.url;

        if (!url) {
            log.warning('Skipping empty URL entry');
            skipped++;
            continue;
        }

        const parsed = parseGitHubUrl(url);

        if (parsed.type === 'invalid') {
            log.warning(`Invalid GitHub URL: ${url}`);
            skipped++;
            continue;
        }

        if (parsed.type === 'user') {
            // Profile Scan Mode: Scan all user's repos
            log.info(`👤 Profile Mode: Fetching repos for user ${parsed.owner}...`);

            const repos = await getUserRepos(octokit, parsed.owner, maxReposPerUser);
            log.info(`Found ${repos.length} repositories for ${parsed.owner}`);

            for (const repoInfo of repos) {
                try {
                    const result = await processRepository(octokit, repoInfo.owner, repoInfo.repo);

                    if (result) {
                        if (result.health_score >= minHealthScore) {
                            await Actor.pushData(result);
                            successful++;
                            log.info(`✅ ${repoInfo.owner}/${repoInfo.repo}: ${result.health_score} (${result.health_grade})`);
                        } else {
                            filteredOut++;
                            log.info(`⏭️ ${repoInfo.owner}/${repoInfo.repo}: Score ${result.health_score} below threshold ${minHealthScore}`);
                        }
                    } else {
                        skipped++;
                    }

                    processed++;
                } catch (error) {
                    log.error(`Failed to process ${repoInfo.owner}/${repoInfo.repo}: ${error.message}`);
                    skipped++;
                }
            }
        } else {
            // Direct Mode: Scan single repo
            log.info(`📁 Direct Mode: Scanning ${parsed.owner}/${parsed.repo}...`);

            try {
                const result = await processRepository(octokit, parsed.owner, parsed.repo);

                if (result) {
                    if (result.health_score >= minHealthScore) {
                        await Actor.pushData(result);
                        successful++;
                        log.info(`✅ ${parsed.owner}/${parsed.repo}: ${result.health_score} (${result.health_grade})`);
                    } else {
                        filteredOut++;
                        log.info(`⏭️ ${parsed.owner}/${parsed.repo}: Score ${result.health_score} below threshold ${minHealthScore}`);
                    }
                } else {
                    skipped++;
                }

                processed++;
            } catch (error) {
                log.error(`Failed to process ${parsed.owner}/${parsed.repo}: ${error.message}`);
                skipped++;
            }
        }
    }

    // Final summary
    log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log.info('📊 SCAN COMPLETE');
    log.info(`   Total processed: ${processed}`);
    log.info(`   Successful: ${successful}`);
    log.info(`   Filtered out: ${filteredOut}`);
    log.info(`   Skipped/Failed: ${skipped}`);
    log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Generate combined dashboard HTML for all results
    try {
        const dataset = await Actor.openDataset();
        const allResults = await dataset.getData();

        if (allResults.items && allResults.items.length > 0) {
            const dashboardHtml = generateCombinedDashboard(allResults.items);
            const store = await Actor.openKeyValueStore();

            // Save as OUTPUT - this enables "Preview in new tab" button
            await store.setValue('OUTPUT', dashboardHtml, { contentType: 'text/html' });

            log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            log.info('🎨 VISUAL DASHBOARD READY!');
            log.info('   Click "Preview in new tab" to see your results');
            log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
    } catch (error) {
        log.warning(`⚠️ Could not generate visual dashboard: ${error.message}`);
    }

    // Exit the Actor
    await Actor.exit();
}

// Run the main function
main().catch((error) => {
    log.error('Actor failed:', error);
    process.exit(1);
});
