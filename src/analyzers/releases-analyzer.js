/**
 * Release & Version Intelligence Analyzer
 * Analyzes GitHub releases, tags, deployment cadences, and version history.
 */

import { formatDate, getRelativeTime } from '../utils.js';

/**
 * Analyze releases and tags
 * @param {Array<Object>} releases - Releases list from GitHub API
 * @param {Array<Object>} tags - Tags list from GitHub API
 * @param {Object} repoData - Repository metadata
 * @returns {Object} Release intelligence analysis
 */
export function analyzeReleasesAndVersions(releases = [], tags = [], repoData = {}) {
    const hasReleases = releases && releases.length > 0;
    const hasTags = tags && tags.length > 0;

    if (!hasReleases && !hasTags) {
        return {
            status: 'unavailable',
            total_releases: 0,
            total_tags: 0,
            latest_release: null,
            latest_tag: null,
            average_days_between_releases: null,
            release_frequency_per_year: 0,
            has_changelog_notes: false,
            release_inactivity_warning: 'No published releases or tags detected.',
            timeline: [],
        };
    }

    const latestRelease = hasReleases ? releases[0] : null;
    const latestTag = hasTags ? tags[0] : null;

    // Calculate time between consecutive releases
    let avgDaysBetween = 0;
    if (hasReleases && releases.length > 1) {
        let totalDiffDays = 0;
        let intervals = 0;
        for (let i = 0; i < releases.length - 1; i++) {
            const date1 = new Date(releases[i].published_at || releases[i].created_at);
            const date2 = new Date(releases[i + 1].published_at || releases[i + 1].created_at);
            const diffDays = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
            if (!isNaN(diffDays)) {
                totalDiffDays += diffDays;
                intervals++;
            }
        }
        avgDaysBetween = intervals > 0 ? Math.round(totalDiffDays / intervals) : 0;
    }

    // Release frequency per year
    let frequencyPerYear = 0;
    if (hasReleases && releases.length > 0) {
        const oldestReleaseDate = new Date(releases[releases.length - 1].published_at || releases[releases.length - 1].created_at);
        const latestReleaseDate = new Date(releases[0].published_at || releases[0].created_at);
        const spanYears = Math.max((latestReleaseDate - oldestReleaseDate) / (1000 * 60 * 60 * 24 * 365), 0.25);
        frequencyPerYear = Math.round((releases.length / spanYears) * 10) / 10;
    }

    // Days since latest release
    const latestDate = latestRelease ? new Date(latestRelease.published_at || latestRelease.created_at) : null;
    const daysSinceLatest = latestDate ? Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

    let inactivityWarning = null;
    if (daysSinceLatest !== null && daysSinceLatest > 365) {
        inactivityWarning = `No releases published in over ${Math.floor(daysSinceLatest / 30)} months. Repository may follow rolling releases or be in maintenance mode.`;
    }

    // Build timeline items
    const timeline = (hasReleases ? releases : tags.slice(0, 10)).map(item => {
        const isRelease = Boolean(item.published_at || item.body !== undefined);
        const dateStr = item.published_at || item.created_at || null;
        return {
            name: item.name || item.tag_name || item.name,
            tag: item.tag_name || item.name,
            date: dateStr ? formatDate(dateStr) : 'Unknown',
            relativeDate: dateStr ? getRelativeTime(dateStr) : '',
            isPrerelease: Boolean(item.prerelease),
            isDraft: Boolean(item.draft),
            assetCount: item.assets ? item.assets.length : 0,
            hasNotes: Boolean(item.body && item.body.trim().length > 10),
            notesPreview: item.body ? item.body.slice(0, 150) : '',
            htmlUrl: item.html_url || '',
        };
    });

    return {
        status: 'completed',
        total_releases: releases.length,
        total_tags: tags.length,
        latest_release_tag: latestRelease ? latestRelease.tag_name : (latestTag ? latestTag.name : null),
        latest_release_date: latestRelease ? formatDate(latestRelease.published_at) : null,
        days_since_last_release: daysSinceLatest,
        average_days_between_releases: avgDaysBetween || null,
        release_frequency_per_year: frequencyPerYear,
        inactivity_warning: inactivityWarning,
        timeline: timeline.slice(0, 15),
    };
}

