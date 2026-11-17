/**
 * Repository Portfolio Leaderboard Aggregator
 * Ranks scanned repositories and awards specific accolades across health, security, docs, and activity.
 */

/**
 * Generate portfolio leaderboard and rankings
 * @param {Array<Object>} repoAnalyses - Array of normalized repository analysis records
 * @returns {Object} Leaderboard data, rankings, and awarded accolades
 */
export function aggregatePortfolioLeaderboard(repoAnalyses = []) {
    if (!repoAnalyses || repoAnalyses.length === 0) {
        return {
            status: 'unavailable',
            message: 'No repositories available for portfolio leaderboard',
            rankings: [],
            accolades: {},
        };
    }

    const items = repoAnalyses.map(r => {
        const pillars = r.health_analysis?.pillars || {};
        const stars = r.stars || r.repository_metadata?.stargazers_count || 0;
        const health = r.health_score || r.health_analysis?.total_score || 0;
        const security = r.security?.security_readiness_score || pillars.security?.score || 0;
        const documentation = pillars.documentation?.score || 0;
        const maintainability = pillars.maintainability?.score || 0;
        const activity = r.activity?.commit_frequency_per_week || 0;

        return {
            name: r.repository_metadata?.name || r.repo_name,
            fullName: r.repository_metadata?.full_name || r.repo_name,
            url: r.repository_metadata?.html_url || r.repo_url,
            health_score: health,
            health_grade: r.health_grade || r.health_analysis?.grade || 'N/A',
            security_score: security,
            documentation_score: documentation,
            maintainability_score: maintainability,
            activity_score: activity,
            stars,
            language: r.repository_metadata?.language || 'Unknown',
            description: r.repository_metadata?.description || '',
        };
    });

    // Sort by health score descending
    const rankedByHealth = [...items].sort((a, b) => b.health_score - a.health_score);

    // Accolades
    const highestHealth = rankedByHealth[0];
    const highestSecurity = [...items].sort((a, b) => b.security_score - a.security_score)[0];
    const bestDocumentation = [...items].sort((a, b) => b.documentation_score - a.documentation_score)[0];
    const bestMaintained = [...items].sort((a, b) => b.maintainability_score - a.maintainability_score)[0];
    const mostPopular = [...items].sort((a, b) => b.stars - a.stars)[0];
    const mostActive = [...items].sort((a, b) => b.activity_score - a.activity_score)[0];

    // Portfolio metrics
    const totalRepos = items.length;
    const avgScore = Math.round(items.reduce((sum, r) => sum + r.health_score, 0) / totalRepos);
    const totalStars = items.reduce((sum, r) => sum + r.stars, 0);
    const healthyCount = items.filter(r => r.health_score >= 80).length;

    return {
        status: 'completed',
        portfolio_summary: {
            total_repositories: totalRepos,
            average_health_score: avgScore,
            healthy_repositories_count: healthyCount,
            total_stars_accumulated: totalStars,
            portfolio_health_grade: avgScore >= 90 ? 'A+' : avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : 'D',
        },
        accolades: {
            highest_health_score: {
                repository: highestHealth.fullName,
                metric: `${highestHealth.health_score}/100`,
                badge: 'Highest Health Score',
            },
            highest_security: {
                repository: highestSecurity.fullName,
                metric: `${highestSecurity.security_score}/100`,
                badge: 'Highest Security Configuration Score',
            },
            best_documentation: {
                repository: bestDocumentation.fullName,
                metric: `${bestDocumentation.documentation_score}/100`,
                badge: 'Best Documentation Quality',
            },
            best_maintained: {
                repository: bestMaintained.fullName,
                metric: `${bestMaintained.maintainability_score}/100`,
                badge: 'Best Maintained Repository',
            },
            most_popular: {
                repository: mostPopular.fullName,
                metric: `${mostPopular.stars.toLocaleString()} Stars`,
                badge: 'Most Popular Repository',
            },
            most_active: {
                repository: mostActive.fullName,
                metric: `${mostActive.activity_score} commits/week`,
                badge: 'Most Active Repository',
            },
        },
        leaderboard: rankedByHealth.map((r, idx) => ({
            rank: idx + 1,
            ...r,
        })),
    };
}

