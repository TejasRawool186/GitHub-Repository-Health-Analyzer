/**
 * Accessibility & Localization Readiness Audit Analyzer
 * Statically evaluates frontend repositories for A11y linters, automated tests, and internationalization libraries.
 */

const A11Y_PACKAGES = [
    { name: 'axe-core', category: 'Engine', desc: 'Core accessibility testing engine' },
    { name: '@axe-core/playwright', category: 'E2E Testing', desc: 'Playwright automated axe accessibility runner' },
    { name: 'cypress-axe', category: 'E2E Testing', desc: 'Cypress automated axe accessibility runner' },
    { name: 'jest-axe', category: 'Unit Testing', desc: 'Jest custom matchers for axe accessibility' },
    { name: 'pa11y', category: 'CLI Automation', desc: 'Automated accessibility CLI reporter' },
    { name: 'eslint-plugin-jsx-a11y', category: 'Static Linting', desc: 'ESLint rules for JSX accessibility standards' },
    { name: 'eslint-plugin-vuejs-accessibility', category: 'Static Linting', desc: 'ESLint accessibility rules for Vue' },
];

const I18N_PACKAGES = [
    { name: 'i18next', category: 'Framework', desc: 'Internationalization framework' },
    { name: 'react-i18next', category: 'Frontend Bindings', desc: 'React internationalization bindings' },
    { name: 'next-intl', category: 'Framework', desc: 'Next.js App & Pages router internationalization' },
    { name: 'next-i18next', category: 'Framework', desc: 'Next.js i18next integration' },
    { name: 'react-intl', category: 'Frontend Bindings', desc: 'FormatJS React internationalization library' },
    { name: 'vue-i18n', category: 'Frontend Bindings', desc: 'Vue.js internationalization framework' },
];

const I18N_DIR_PATTERNS = ['locales', 'i18n', 'messages', 'lang', 'translations'];

/**
 * Audit repository accessibility and localization readiness
 * @param {Object} options - Inputs: treePaths, packageJson
 * @returns {Object} A11y and I18n audit report
 */
export function analyzeAccessibilityAndLocalization({
    treePaths = [],
    packageJson = null,
}) {
    const pathsSet = new Set(treePaths);
    const depsSet = new Set();

    if (packageJson) {
        for (const sec of ['dependencies', 'devDependencies', 'peerDependencies']) {
            if (packageJson[sec]) {
                for (const pkg of Object.keys(packageJson[sec])) {
                    depsSet.add(pkg.toLowerCase());
                }
            }
        }
    }

    // 1. Accessibility Tooling Check
    const detectedA11yTools = [];
    for (const tool of A11Y_PACKAGES) {
        if (depsSet.has(tool.name.toLowerCase())) {
            detectedA11yTools.push(tool);
        }
    }

    let a11yScore = 0;
    if (detectedA11yTools.some(t => t.category === 'Static Linting')) a11yScore += 40;
    if (detectedA11yTools.some(t => t.category === 'E2E Testing' || t.category === 'Unit Testing')) a11yScore += 40;
    if (detectedA11yTools.some(t => t.category === 'Engine' || t.category === 'CLI Automation')) a11yScore += 20;

    // 2. Localization Tooling & Directory Check
    const detectedI18nTools = [];
    for (const tool of I18N_PACKAGES) {
        if (depsSet.has(tool.name.toLowerCase())) {
            detectedI18nTools.push(tool);
        }
    }

    const detectedI18nDirs = [];
    for (const p of treePaths) {
        const lower = p.toLowerCase();
        for (const pattern of I18N_DIR_PATTERNS) {
            if (lower === pattern || lower.startsWith(`${pattern}/`)) {
                detectedI18nDirs.push(p);
                break;
            }
        }
    }

    let i18nScore = 0;
    if (detectedI18nTools.length > 0) i18nScore += 50;
    if (detectedI18nDirs.length > 0) i18nScore += 50;

    const recommendations = [];
    if (detectedA11yTools.length === 0) {
        recommendations.push({
            category: 'Accessibility',
            action: 'Install eslint-plugin-jsx-a11y or @axe-core/playwright to catch basic WCAG violations automatically',
        });
    }
    if (detectedI18nTools.length === 0 && detectedI18nDirs.length === 0) {
        recommendations.push({
            category: 'Localization',
            action: 'Adopt a localization framework like i18next or next-intl to separate UI strings from components',
        });
    }

    return {
        status: 'completed',
        accessibility: {
            readiness_score: a11yScore,
            status: a11yScore >= 60 ? 'Active Tooling Detected' : a11yScore > 0 ? 'Partial Tooling' : 'No Tooling Detected',
            detected_tools: detectedA11yTools,
        },
        localization: {
            readiness_score: i18nScore,
            status: i18nScore >= 60 ? 'Internationalization Configured' : i18nScore > 0 ? 'Partial Structure' : 'Single Language Assumed',
            detected_tools: detectedI18nTools,
            translation_directories_count: detectedI18nDirs.length,
            translation_directories: detectedI18nDirs.slice(0, 10),
        },
        recommendations,
        disclaimer: 'This audit is a static repository readiness assessment of linting and build configuration. It does not certify full WCAG 2.1/2.2 compliance or guarantee accessible end-user screen reader behavior.',
    };
}

