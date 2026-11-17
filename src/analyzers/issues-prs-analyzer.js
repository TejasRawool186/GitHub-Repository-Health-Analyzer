/**
 * Issues & Pull Request Intelligence Analyzer
 * Analyzes issue backlogs, PR merge velocity, aging distributions, and stale items.
 */

import { formatDate, getRelativeTime } from '../utils.js';

/**
 * Analyze issues and pull requests
 * @param {Object} options - Inputs: repoData, openIssues, closedIssues, openPrs, closedPrs, issueStats
 * @returns {Object} Issues and PRs intelligence
 */
export function analyzeIssuesAndPrs({
    repoData = {},
    openIssues = [],
    closedIssues = [],
    openPrs = [],
    closedPrs = [],
    issueStats = { open: 0, closed: 0, ratio: 0 },
}) {
    // Separate issues from PRs (GitHub issues API returns PRs as issues too, distinguished by pull_request key)
    const pureOpenIssues = openIssues.filter(i => !i.pull_request);
    const pureClosedIssues = closedIssues.filter(i => !i.pull_request);

    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;

    // Issue Aging Distribution (<30d, 30-90d, 90-180d, >180d)
    const backlogAging = {
        under_30_days: 0,
        between_30_and_90_days: 0,
        between_90_and_180_days: 0,
        over_180_days: 0,
    };

    let totalIssueAgeDays = 0;
    let staleIssuesCount = 0;

    for (const issue of pureOpenIssues) {
        const createdMs = new Date(issue.created_at).getTime();
        const updatedMs = new Date(issue.updated_at).getTime();
        const ageDays = Math.floor((now - createdMs) / dayMs);
        const inactiveDays = Math.floor((now - updatedMs) / dayMs);

        totalIssueAgeDays += ageDays;
        if (inactiveDays > 60) staleIssuesCount++;

        if (ageDays < 30) backlogAging.under_30_days++;
        else if (ageDays <= 90) backlogAging.between_30_and_90_days++;
        else if (ageDays <= 180) backlogAging.between_90_and_180_days++;
        else backlogAging.over_180_days++;
    }

    const averageIssueAgeDays = pureOpenIssues.length > 0 ? Math.round(totalIssueAgeDays / pureOpenIssues.length) : 0;

    // PR Statistics & Merge Ratio
    const mergedPrs = closedPrs.filter(pr => Boolean(pr.merged_at));
    const unmergedClosedPrs = closedPrs.filter(pr => !pr.merged_at);

    const totalClosedPrs = closedPrs.length;
    const mergeRatio = totalClosedPrs > 0 ? Math.round((mergedPrs.length / totalClosedPrs) * 100) : 0;

    let totalPrAgeDays = 0;
    let stalePrsCount = 0;

    for (const pr of openPrs) {
        const createdMs = new Date(pr.created_at).getTime();
        const updatedMs = new Date(pr.updated_at).getTime();
        const ageDays = Math.floor((now - createdMs) / dayMs);
        const inactiveDays = Math.floor((now - updatedMs) / dayMs);

        totalPrAgeDays += ageDays;
        if (inactiveDays > 45) stalePrsCount++;
    }

    const averagePrAgeDays = openPrs.length > 0 ? Math.round(totalPrAgeDays / openPrs.length) : 0;

    // Recent items for display
    const recentIssuesSample = pureOpenIssues.slice(0, 8).map(i => ({
        number: i.number,
        title: i.title,
        author: i.user?.login || 'unknown',
        createdDate: formatDate(i.created_at),
        relativeAge: getRelativeTime(i.created_at),
        commentsCount: i.comments || 0,
        url: i.html_url,
    }));

    const recentPrsSample = openPrs.slice(0, 8).map(pr => ({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login || 'unknown',
        createdDate: formatDate(pr.created_at),
        relativeAge: getRelativeTime(pr.created_at),
        isDraft: Boolean(pr.draft),
        url: pr.html_url,
    }));

    return {
        status: 'completed',
        total_open_issues: issueStats.open || pureOpenIssues.length,
        total_closed_issues: issueStats.closed || pureClosedIssues.length,
        issue_close_ratio_percent: issueStats.ratio,
        average_issue_age_days: averageIssueAgeDays,
        stale_issues_count: staleIssuesCount,
        open_prs_count: openPrs.length,
        merged_prs_sampled: mergedPrs.length,
        closed_unmerged_prs_sampled: unmergedClosedPrs.length,
        pr_merge_ratio_percent: mergeRatio,
        average_open_pr_age_days: averagePrAgeDays,
        stale_prs_count: stalePrsCount,
        backlog_aging_distribution: backlogAging,
        recent_issues: recentIssuesSample,
        recent_prs: recentPrsSample,
    };
}

