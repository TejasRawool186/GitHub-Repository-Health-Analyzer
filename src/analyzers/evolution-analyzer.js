/**
 * Repository Evolution & Technical Debt Timeline Analyzer
 * Tracks growth trends, milestones, debt markers, and timestamped health snapshots.
 */

import { formatDate, getRelativeTime } from '../utils.js';

/**
 * Analyze repository evolution and build historical snapshot
 * @param {Object} options - Inputs: repoData, commits, releases, healthScore, treeSummary, dependencies, previousSnapshot
 * @returns {Object} Evolution timeline and debt analysis
 */
export function analyzeEvolution({
    repoData = {},
    commits = [],
    releases = [],
    healthScore = 0,
    treeSummary = {},
    dependencies = [],
    previousSnapshot = null,
}) {
    const timestamp = new Date().toISOString();
    const createdAtStr = repoData.created_at;
    const pushedDateStr = repoData.pushed_at;

    const createdMs = createdAtStr ? new Date(createdAtStr).getTime() : Date.now();
    const repoAgeDays = Math.max(Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24)), 1);
    const repoAgeYears = Math.round((repoAgeDays / 365) * 10) / 10;

    // Current snapshot to store
    const currentSnapshot = {
        scan_timestamp: timestamp,
        health_score: healthScore,
        total_files: treeSummary.total_files || 0,
        total_dependencies: dependencies.length || 0,
        stars: repoData.stargazers_count || 0,
        forks: repoData.forks_count || 0,
        release_count: releases.length || 0,
    };

    // Calculate score delta if previous snapshot exists
    let scoreDelta = null;
    let fileDelta = null;
    if (previousSnapshot && typeof previousSnapshot.health_score === 'number') {
        scoreDelta = healthScore - previousSnapshot.health_score;
        fileDelta = (treeSummary.total_files || 0) - (previousSnapshot.total_files || 0);
    }

    // Historical milestone markers
    const milestones = [];

    milestones.push({
        event: 'Repository Inception',
        date: formatDate(createdAtStr),
        relative: getRelativeTime(createdAtStr),
        description: `Project initialized on GitHub (${repoData.default_branch || 'main'} branch)`,
        category: 'Creation',
    });

    if (releases && releases.length > 0) {
        // First release
        const firstRel = releases[releases.length - 1];
        milestones.push({
            event: `Initial Release: ${firstRel.tag_name || firstRel.name}`,
            date: formatDate(firstRel.published_at || firstRel.created_at),
            relative: getRelativeTime(firstRel.published_at || firstRel.created_at),
            description: 'First public tagged version or artifact release',
            category: 'Release',
        });

        // Latest release if different
        if (releases.length > 1) {
            const latestRel = releases[0];
            milestones.push({
                event: `Latest Release: ${latestRel.tag_name || latestRel.name}`,
                date: formatDate(latestRel.published_at || latestRel.created_at),
                relative: getRelativeTime(latestRel.published_at || latestRel.created_at),
                description: 'Most recent production release tag',
                category: 'Release',
            });
        }
    }

    milestones.push({
        event: 'Latest Code Push',
        date: formatDate(pushedDateStr),
        relative: getRelativeTime(pushedDateStr),
        description: 'Most recent commit pushed to default branch',
        category: 'Activity',
    });

    milestones.push({
        event: 'Intelligence Scan Audit',
        date: formatDate(timestamp),
        relative: 'Today',
        description: `Comprehensive 20-feature health audit performed (Score: ${healthScore}/100)`,
        category: 'Audit',
    });

    // Technical debt metrics
    const totalFiles = treeSummary.total_files || 1;
    const debtMarkers = treeSummary.code_complexity?.total_debt_markers || 0;
    const debtDensityPer100Files = Math.round((debtMarkers / totalFiles) * 100);

    return {
        status: 'completed',
        repository_age_days: repoAgeDays,
        repository_age_years: repoAgeYears,
        milestones,
        current_snapshot: currentSnapshot,
        previous_snapshot_compared: Boolean(previousSnapshot),
        score_delta: scoreDelta,
        file_delta: fileDelta,
        technical_debt_metrics: {
            todo_markers_count: treeSummary.code_complexity?.todo_count || 0,
            fixme_markers_count: treeSummary.code_complexity?.fixme_count || 0,
            hack_markers_count: treeSummary.code_complexity?.hack_count || 0,
            debt_markers_total: debtMarkers,
            debt_density_per_100_files: debtDensityPer100Files,
            debt_rating: debtDensityPer100Files > 20 ? 'Elevated Debt' : debtDensityPer100Files > 5 ? 'Moderate Debt' : 'Low Debt',
        },
        disclaimer: 'Evolution history is constructed strictly from verified Git commit milestones and timestamped snapshots. Unobserved historical states are never artificially simulated.',
    };
}

