/**
 * Contributor & Team Analytics Analyzer
 * Analyzes team distribution, contributor rankings, and computes the statistical Bus Factor Indicator.
 */

/**
 * Analyze repository contributors and compute Bus Factor
 * @param {Array<Object>} contributors - List of contributors from GitHub API
 * @param {Object} repoData - Repository metadata
 * @returns {Object} Contributor intelligence and Bus Factor heuristic
 */
export function analyzeContributors(contributors = [], repoData = {}) {
    if (!contributors || contributors.length === 0) {
        return {
            status: 'unavailable',
            total_contributors: 0,
            bus_factor: {
                value: 0,
                status: 'Unknown',
                top_contributor_percentage: 0,
                warning: 'No contributor data returned from API',
            },
            contributors: [],
            distribution: [],
        };
    }

    const totalContributions = contributors.reduce((sum, c) => sum + (c.contributions || 0), 0);
    const sorted = [...contributors].sort((a, b) => (b.contributions || 0) - (a.contributions || 0));

    // Compute Bus Factor: how many contributors are responsible for >= 50% of contributions
    let cumulative = 0;
    let busFactorCount = 0;
    const targetHalf = totalContributions * 0.5;

    for (const c of sorted) {
        busFactorCount++;
        cumulative += (c.contributions || 0);
        if (cumulative >= targetHalf) {
            break;
        }
    }

    const topContributor = sorted[0];
    const topPercentage = totalContributions > 0 ? Math.round(((topContributor.contributions || 0) / totalContributions) * 100) : 0;

    let busFactorStatus = 'Resilient';
    let busFactorWarning = 'Contribution workload is shared among multiple core developers.';

    if (busFactorCount === 1) {
        busFactorStatus = 'Critical Concentration';
        busFactorWarning = `A single contributor (${topContributor.login}) accounts for ${topPercentage}% of all tracked contributions. High single-point-of-failure risk.`;
    } else if (busFactorCount <= 3) {
        busFactorStatus = 'Moderate Concentration';
        busFactorWarning = `Top ${busFactorCount} contributors account for over 50% of project commits. Key maintainer dependency present.`;
    }

    // Format top contributors for display
    const formattedContributors = sorted.slice(0, 25).map((c, index) => ({
        rank: index + 1,
        login: c.login,
        avatarUrl: c.avatar_url,
        contributions: c.contributions,
        percentage: totalContributions > 0 ? Math.round(((c.contributions || 0) / totalContributions) * 100) : 0,
        profileUrl: c.html_url,
    }));

    return {
        status: 'completed',
        total_contributors: contributors.length,
        total_tracked_contributions: totalContributions,
        bus_factor: {
            value: busFactorCount,
            status: busFactorStatus,
            top_contributor_percentage: topPercentage,
            top_contributor_login: topContributor.login,
            warning: busFactorWarning,
            disclaimer: 'The Bus Factor is a mathematical heuristic calculated purely from commit volumes and historical frequency. It is not a definitive measure of maintainer employment or community readiness.',
        },
        contributors: formattedContributors,
    };
}

