/**
 * Repository Comparison & Benchmarking Aggregator
 * Compares two or more scanned repositories across health scores, 7 pillars, technologies, and sizes.
 */

/**
 * Compare an array of analyzed repository results
 * @param {Array<Object>} repoAnalyses - Array of normalized repository analysis records
 * @returns {Object} Comparison matrix and benchmarking data
 */
export function aggregateComparison(repoAnalyses = []) {
    if (!repoAnalyses || repoAnalyses.length === 0) {
        return {
            status: 'unavailable',
            message: 'No repositories available to compare',
            repositories: [],
        };
    }

    const repositories = repoAnalyses.map(r => {
        const pillars = r.health_analysis?.pillars || {};
        const techList = r.technology_stack?.technologies?.map(t => t.name) || [];

        return {
            name: r.repository_metadata?.full_name || r.repo_name,
            url: r.repository_metadata?.html_url || r.repo_url,
            health_score: r.health_score || r.health_analysis?.total_score || 0,
            health_grade: r.health_grade || r.health_analysis?.grade || 'N/A',
            risk_level: r.risk_level || r.health_analysis?.risk_level || 'Unknown',
            stars: r.stars || r.repository_metadata?.stargazers_count || 0,
            forks: r.forks || r.repository_metadata?.forks_count || 0,
            open_issues: r.open_issues || r.repository_metadata?.open_issues_count || 0,
            license: r.license_type || r.repository_metadata?.license?.name || 'No License',
            total_files: r.repository_structure?.total_files || 0,
            dependencies_count: r.dependencies?.total_dependencies || 0,
            security_score: r.security?.security_readiness_score || 0,
            reproducibility_score: r.reproducibility?.reproducibility_score || 0,
            pillars: {
                readability: pillars.readability?.score || 0,
                stability: pillars.stability?.score || 0,
                security: pillars.security?.score || 0,
                community: pillars.community?.score || 0,
                maintainability: pillars.maintainability?.score || 0,
                documentation: pillars.documentation?.score || 0,
                automation: pillars.automation?.score || 0,
            },
            technologies: techList,
        };
    });

    // Radar chart dataset: 7 pillars per repository
    const radarPillars = ['Readability', 'Stability', 'Security', 'Community', 'Maintainability', 'Documentation', 'Automation'];
    const radarDatasets = repositories.map((r, idx) => {
        const colors = ['#B8FF63', '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];
        const color = colors[idx % colors.length];
        return {
            label: r.name,
            data: [
                r.pillars.readability,
                r.pillars.stability,
                r.pillars.security,
                r.pillars.community,
                r.pillars.maintainability,
                r.pillars.documentation,
                r.pillars.automation,
            ],
            borderColor: color,
            backgroundColor: `${color}20`,
        };
    });

    // Find technology overlaps
    const allTechs = new Set();
    for (const r of repositories) {
        for (const t of r.technologies) {
            allTechs.add(t);
        }
    }

    const techOverlap = Array.from(allTechs).map(t => {
        const reposWithTech = repositories.filter(r => r.technologies.includes(t)).map(r => r.name);
        return {
            technology: t,
            count: reposWithTech.length,
            repositories: reposWithTech,
            shared: reposWithTech.length > 1,
        };
    }).sort((a, b) => b.count - a.count);

    // Identify relative strengths & weaknesses
    const benchmarkingInsights = repositories.map(r => {
        const strengths = [];
        const weaknesses = [];

        if (r.health_score >= 80) strengths.push('High overall health index');
        if (r.security_score >= 80) strengths.push('Robust security configuration');
        if (r.reproducibility_score >= 80) strengths.push('Excellent environment reproducibility');
        if (r.pillars.maintainability >= 80) strengths.push('Strong test and linter coverage');

        if (r.health_score < 60) weaknesses.push('Below average repository health');
        if (r.security_score < 50) weaknesses.push('Missing critical security policies or Dependabot');
        if (r.pillars.documentation < 50) weaknesses.push('Sparse documentation, missing changelog or docs directory');
        if (r.reproducibility_score < 50) weaknesses.push('Missing lockfiles or container specs');

        return {
            name: r.name,
            strengths: strengths.length > 0 ? strengths : ['Stable baseline configurations'],
            weaknesses: weaknesses.length > 0 ? weaknesses : ['No severe deficits identified'],
        };
    });

    return {
        status: 'completed',
        repository_count: repositories.length,
        repositories,
        radar_chart: {
            labels: radarPillars,
            datasets: radarDatasets,
        },
        technology_overlap: techOverlap,
        insights: benchmarkingInsights,
    };
}

