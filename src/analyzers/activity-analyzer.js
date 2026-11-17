/**
 * GitHub Activity Timeline & Heatmap Analyzer
 * Computes commit cadence, contribution heatmaps, weekly/monthly distributions, and inactivity periods.
 */

import { formatDate, getRelativeTime } from '../utils.js';

/**
 * Analyze commit activity and timeline
 * @param {Array<Object>} commits - List of recent commits from GitHub REST API
 * @param {Object} repoData - Repository metadata
 * @returns {Object} Activity timeline and heatmap dataset
 */
export function analyzeActivityTimeline(commits = [], repoData = {}) {
    if (!commits || commits.length === 0) {
        return {
            status: 'unavailable',
            commits_analyzed: 0,
            commit_frequency_per_week: 0,
            inactivity_days: repoData.pushed_at ? Math.floor((Date.now() - new Date(repoData.pushed_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
            heatmap_data: [],
            day_of_week_distribution: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
            monthly_activity: [],
            recent_commits: [],
        };
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayDistribution = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const hourDistribution = new Array(24).fill(0);
    const monthCounts = {};
    const dateCounts = {};

    let earliestDate = new Date();
    let latestDate = new Date(0);

    const formattedCommits = [];

    for (const c of commits) {
        const commitDateStr = c.commit?.author?.date || c.commit?.committer?.date;
        if (!commitDateStr) continue;

        const d = new Date(commitDateStr);
        if (d < earliestDate) earliestDate = d;
        if (d > latestDate) latestDate = d;

        // Day of week
        const dayName = dayNames[d.getUTCDay()];
        dayDistribution[dayName] = (dayDistribution[dayName] || 0) + 1;

        // Hour of day (UTC)
        const hour = d.getUTCHours();
        hourDistribution[hour]++;

        // Month key (YYYY-MM)
        const monthKey = d.toISOString().slice(0, 7);
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;

        // Exact date key (YYYY-MM-DD) for heatmap
        const dateKey = d.toISOString().slice(0, 10);
        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;

        formattedCommits.push({
            sha: c.sha ? c.sha.substring(0, 7) : 'unknown',
            message: c.commit?.message?.split('\n')[0] || 'No message',
            author: c.commit?.author?.name || c.author?.login || 'Unknown',
            authorLogin: c.author?.login || null,
            avatarUrl: c.author?.avatar_url || null,
            date: formatDate(commitDateStr),
            relativeDate: getRelativeTime(commitDateStr),
            url: c.html_url || '',
        });
    }

    // Monthly activity sorted chronologically
    const monthlyActivity = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate commit cadence
    const timespanMs = Math.max(Date.now() - earliestDate.getTime(), 1000 * 60 * 60 * 24);
    const timespanWeeks = Math.max(timespanMs / (1000 * 60 * 60 * 24 * 7), 1);
    const commitsPerWeek = Math.round((commits.length / timespanWeeks) * 10) / 10;

    // Days since last push
    const lastPushMs = repoData.pushed_at ? new Date(repoData.pushed_at).getTime() : latestDate.getTime();
    const inactivityDays = Math.floor((Date.now() - lastPushMs) / (1000 * 60 * 60 * 24));

    // Generate 52-week rolling heatmap cells (364 days)
    const heatmapCells = [];
    const now = new Date();
    for (let i = 364; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        const count = dateCounts[dateStr] || 0;
        let level = 0;
        if (count >= 5) level = 4;
        else if (count >= 3) level = 3;
        else if (count >= 2) level = 2;
        else if (count >= 1) level = 1;

        heatmapCells.push({
            date: dateStr,
            count,
            level,
            dayOfWeek: d.getUTCDay(),
        });
    }

    return {
        status: 'completed',
        commits_analyzed: commits.length,
        earliest_commit_date: formatDate(earliestDate),
        latest_commit_date: formatDate(latestDate),
        inactivity_days: inactivityDays,
        inactivity_status: inactivityDays > 180 ? 'Dormant' : inactivityDays > 60 ? 'Inactive' : 'Actively Maintained',
        commit_frequency_per_week: commitsPerWeek,
        day_of_week_distribution: dayDistribution,
        hour_of_day_distribution: hourDistribution,
        monthly_activity: monthlyActivity,
        heatmap_data: heatmapCells,
        recent_commits: formattedCommits.slice(0, 15),
    };
}

