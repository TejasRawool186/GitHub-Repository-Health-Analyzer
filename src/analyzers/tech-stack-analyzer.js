/**
 * Interactive Technology Stack Explorer Analyzer
 * Detects technologies across 10 categories from manifests, configs, and file trees.
 */

// Technology signature dictionary with Simple Icons slug, category, and detection patterns
const TECH_DEFINITIONS = [
    // 1. Frontend
    { name: 'React', category: 'Frontend', iconSlug: 'react', npm: ['react', 'react-dom'], files: [] },
    { name: 'Next.js', category: 'Frontend', iconSlug: 'nextdotjs', npm: ['next'], files: ['next.config.js', 'next.config.mjs', 'next.config.ts'] },
    { name: 'Vue.js', category: 'Frontend', iconSlug: 'vuedotjs', npm: ['vue'], files: ['vue.config.js'] },
    { name: 'Nuxt', category: 'Frontend', iconSlug: 'nuxt', npm: ['nuxt', 'nuxt3'], files: ['nuxt.config.js', 'nuxt.config.ts'] },
    { name: 'Angular', category: 'Frontend', iconSlug: 'angular', npm: ['@angular/core'], files: ['angular.json'] },
    { name: 'Svelte', category: 'Frontend', iconSlug: 'svelte', npm: ['svelte', '@sveltejs/kit'], files: ['svelte.config.js'] },
    { name: 'Remix', category: 'Frontend', iconSlug: 'remix', npm: ['@remix-run/react', '@remix-run/node'], files: ['remix.config.js'] },
    { name: 'Gatsby', category: 'Frontend', iconSlug: 'gatsby', npm: ['gatsby'], files: ['gatsby-config.js'] },
    { name: 'Tailwind CSS', category: 'Frontend', iconSlug: 'tailwindcss', npm: ['tailwindcss'], files: ['tailwind.config.js', 'tailwind.config.ts'] },
    { name: 'Astro', category: 'Frontend', iconSlug: 'astro', npm: ['astro'], files: ['astro.config.mjs'] },

    // 2. Backend
    { name: 'Node.js', category: 'Backend', iconSlug: 'nodedotjs', npm: [], files: ['package.json'], engines: ['node'] },
    { name: 'Express', category: 'Backend', iconSlug: 'express', npm: ['express'], files: [] },
    { name: 'NestJS', category: 'Backend', iconSlug: 'nestjs', npm: ['@nestjs/core'], files: ['nest-cli.json'] },
    { name: 'FastAPI', category: 'Backend', iconSlug: 'fastapi', python: ['fastapi'], files: [] },
    { name: 'Django', category: 'Backend', iconSlug: 'django', python: ['django'], files: ['manage.py'] },
    { name: 'Flask', category: 'Backend', iconSlug: 'flask', python: ['flask'], files: [] },
    { name: 'Spring Boot', category: 'Backend', iconSlug: 'springboot', maven: ['spring-boot-starter'], gradle: ['org.springframework.boot'], files: [] },
    { name: 'Fastify', category: 'Backend', iconSlug: 'fastify', npm: ['fastify'], files: [] },
    { name: 'Koa', category: 'Backend', iconSlug: 'koa', npm: ['koa'], files: [] },
    { name: 'Gin', category: 'Backend', iconSlug: 'gin', go: ['github.com/gin-gonic/gin'], files: [] },
    { name: 'Axum', category: 'Backend', iconSlug: 'rust', cargo: ['axum'], files: [] },
    { name: 'Ruby on Rails', category: 'Backend', iconSlug: 'rubyonrails', files: ['config/routes.rb', 'bin/rails'] },

    // 3. Programming Languages
    { name: 'JavaScript', category: 'Programming Languages', iconSlug: 'javascript', extensions: ['.js', '.mjs', '.cjs', '.jsx'] },
    { name: 'TypeScript', category: 'Programming Languages', iconSlug: 'typescript', npm: ['typescript'], extensions: ['.ts', '.tsx', '.mts'], files: ['tsconfig.json'] },
    { name: 'Python', category: 'Programming Languages', iconSlug: 'python', extensions: ['.py'], files: ['requirements.txt', 'pyproject.toml', 'Pipfile'] },
    { name: 'Java', category: 'Programming Languages', iconSlug: 'openjdk', extensions: ['.java'], files: ['pom.xml', 'build.gradle'] },
    { name: 'Go', category: 'Programming Languages', iconSlug: 'go', extensions: ['.go'], files: ['go.mod', 'go.sum'] },
    { name: 'Rust', category: 'Programming Languages', iconSlug: 'rust', extensions: ['.rs'], files: ['Cargo.toml', 'Cargo.lock'] },
    { name: 'C++', category: 'Programming Languages', iconSlug: 'cplusplus', extensions: ['.cpp', '.cc', '.cxx', '.hpp'] },
    { name: 'C', category: 'Programming Languages', iconSlug: 'c', extensions: ['.c', '.h'] },
    { name: 'PHP', category: 'Programming Languages', iconSlug: 'php', extensions: ['.php'], files: ['composer.json'] },
    { name: 'Ruby', category: 'Programming Languages', iconSlug: 'ruby', extensions: ['.rb'], files: ['Gemfile'] },

    // 4. Databases
    { name: 'PostgreSQL', category: 'Databases', iconSlug: 'postgresql', npm: ['pg', '@prisma/client', 'typeorm', 'postgres'], python: ['psycopg2', 'asyncpg'], docker: ['postgres'] },
    { name: 'MySQL', category: 'Databases', iconSlug: 'mysql', npm: ['mysql', 'mysql2'], python: ['mysqlclient', 'pymysql'], docker: ['mysql', 'mariadb'] },
    { name: 'MongoDB', category: 'Databases', iconSlug: 'mongodb', npm: ['mongodb', 'mongoose'], python: ['pymongo', 'motor'], docker: ['mongo'] },
    { name: 'Redis', category: 'Databases', iconSlug: 'redis', npm: ['redis', 'ioredis'], python: ['redis'], docker: ['redis'] },
    { name: 'SQLite', category: 'Databases', iconSlug: 'sqlite', npm: ['sqlite3', 'better-sqlite3'], python: ['sqlite3'], files: ['*.sqlite', '*.db'] },
    { name: 'Prisma ORM', category: 'Databases', iconSlug: 'prisma', npm: ['@prisma/client', 'prisma'], files: ['prisma/schema.prisma'] },
    { name: 'Elasticsearch', category: 'Databases', iconSlug: 'elasticsearch', npm: ['@elastic/elasticsearch'], python: ['elasticsearch'], docker: ['elasticsearch'] },

    // 5. Cloud
    { name: 'AWS', category: 'Cloud', iconSlug: 'amazonwebservices', npm: ['aws-sdk', '@aws-sdk/client-s3'], python: ['boto3'], files: ['template.yaml', 'serverless.yml'] },
    { name: 'Google Cloud', category: 'Cloud', iconSlug: 'googlecloud', npm: ['@google-cloud/storage'], python: ['google-cloud-storage'], files: ['app.yaml'] },
    { name: 'Azure', category: 'Cloud', iconSlug: 'microsoftazure', npm: ['@azure/storage-blob'], python: ['azure-storage-blob'], files: [] },
    { name: 'Cloudflare', category: 'Cloud', iconSlug: 'cloudflare', npm: ['wrangler'], files: ['wrangler.toml', 'wrangler.json'] },
    { name: 'Vercel', category: 'Cloud', iconSlug: 'vercel', npm: ['@vercel/node'], files: ['vercel.json'] },
    { name: 'Netlify', category: 'Cloud', iconSlug: 'netlify', files: ['netlify.toml'] },

    // 6. DevOps
    { name: 'Docker', category: 'DevOps', iconSlug: 'docker', files: ['Dockerfile', 'docker-compose.yml', 'compose.yaml', '.dockerignore'] },
    { name: 'Kubernetes', category: 'DevOps', iconSlug: 'kubernetes', files: ['k8s/', 'kubernetes/', 'helm/'] },
    { name: 'Terraform', category: 'DevOps', iconSlug: 'terraform', extensions: ['.tf'], files: ['main.tf'] },
    { name: 'GitHub Actions', category: 'DevOps', iconSlug: 'githubactions', files: ['.github/workflows/'] },
    { name: 'Ansible', category: 'DevOps', iconSlug: 'ansible', files: ['playbook.yml', 'playbook.yaml'] },

    // 7. AI/ML
    { name: 'PyTorch', category: 'AI/ML', iconSlug: 'pytorch', python: ['torch', 'torchvision'] },
    { name: 'TensorFlow', category: 'AI/ML', iconSlug: 'tensorflow', python: ['tensorflow', 'tf-nightly'] },
    { name: 'LangChain', category: 'AI/ML', iconSlug: 'langchain', npm: ['langchain', '@langchain/core'], python: ['langchain', 'langchain-core'] },
    { name: 'Hugging Face', category: 'AI/ML', iconSlug: 'huggingface', python: ['transformers', 'datasets', 'huggingface-hub'] },
    { name: 'OpenCV', category: 'AI/ML', iconSlug: 'opencv', python: ['opencv-python', 'cv2'], npm: ['@uiv/opencv'] },
    { name: 'scikit-learn', category: 'AI/ML', iconSlug: 'scikitlearn', python: ['scikit-learn', 'sklearn'] },
    { name: 'OpenAI API', category: 'AI/ML', iconSlug: 'openai', npm: ['openai'], python: ['openai'] },

    // 8. Testing
    { name: 'Jest', category: 'Testing', iconSlug: 'jest', npm: ['jest'], files: ['jest.config.js', 'jest.config.ts'] },
    { name: 'Vitest', category: 'Testing', iconSlug: 'vitest', npm: ['vitest'], files: ['vitest.config.ts', 'vitest.config.js'] },
    { name: 'Pytest', category: 'Testing', iconSlug: 'pytest', python: ['pytest'], files: ['pytest.ini', 'conftest.py'] },
    { name: 'Playwright', category: 'Testing', iconSlug: 'playwright', npm: ['playwright', '@playwright/test'], python: ['playwright'], files: ['playwright.config.ts'] },
    { name: 'Cypress', category: 'Testing', iconSlug: 'cypress', npm: ['cypress'], files: ['cypress.config.js', 'cypress.config.ts'] },
    { name: 'Mocha', category: 'Testing', iconSlug: 'mocha', npm: ['mocha'], files: ['.mocharc.json', '.mocharc.js'] },

    // 9. Build Tools
    { name: 'Vite', category: 'Build Tools', iconSlug: 'vite', npm: ['vite'], files: ['vite.config.js', 'vite.config.ts'] },
    { name: 'Webpack', category: 'Build Tools', iconSlug: 'webpack', npm: ['webpack'], files: ['webpack.config.js'] },
    { name: 'Turborepo', category: 'Build Tools', iconSlug: 'turborepo', npm: ['turbo'], files: ['turbo.json'] },
    { name: 'Gradle', category: 'Build Tools', iconSlug: 'gradle', files: ['build.gradle', 'build.gradle.kts', 'gradlew'] },
    { name: 'Maven', category: 'Build Tools', iconSlug: 'apachemaven', files: ['pom.xml', 'mvnw'] },
    { name: 'esbuild', category: 'Build Tools', iconSlug: 'esbuild', npm: ['esbuild'] },
    { name: 'Rollup', category: 'Build Tools', iconSlug: 'rollupdotjs', npm: ['rollup'], files: ['rollup.config.js'] },

    // 10. Monitoring & Observability
    { name: 'Prometheus', category: 'Monitoring & Observability', iconSlug: 'prometheus', docker: ['prom/prometheus'], files: ['prometheus.yml'] },
    { name: 'Grafana', category: 'Monitoring & Observability', iconSlug: 'grafana', docker: ['grafana/grafana'], files: [] },
    { name: 'OpenTelemetry', category: 'Monitoring & Observability', iconSlug: 'opentelemetry', npm: ['@opentelemetry/api', '@opentelemetry/sdk-node'], python: ['opentelemetry-api'] },
    { name: 'Sentry', category: 'Monitoring & Observability', iconSlug: 'sentry', npm: ['@sentry/node', '@sentry/react', '@sentry/nextjs'], python: ['sentry-sdk'] },
    { name: 'Datadog', category: 'Monitoring & Observability', iconSlug: 'datadog', npm: ['dd-trace'], python: ['ddtrace'] },
];

/**
 * Detect technologies in a repository
 * @param {Object} options - Inputs including treePaths, packageJson, requirementsTxt, dockerfile, githubWorkflows
 * @returns {Object} Structured technology stack intelligence
 */
export function detectTechStack({
    treePaths = [],
    packageJson = null,
    requirementsTxt = '',
    dockerfileContent = '',
    githubWorkflows = [],
    githubLanguages = {},
}) {
    const detected = new Map();
    const pathsSet = new Set(treePaths);

    // Extract all npm dependencies
    const npmDeps = new Map();
    if (packageJson) {
        const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
        for (const sec of sections) {
            if (packageJson[sec] && typeof packageJson[sec] === 'object') {
                for (const [pkg, ver] of Object.entries(packageJson[sec])) {
                    npmDeps.set(pkg.toLowerCase(), { version: ver, section: sec });
                }
            }
        }
    }

    // Extract python dependencies from requirements.txt
    const pythonDeps = new Map();
    if (requirementsTxt) {
        const lines = requirementsTxt.split('\n');
        for (const line of lines) {
            const clean = line.trim().split('#')[0];
            if (!clean) continue;
            const match = clean.match(/^([a-zA-Z0-9_\-.]+)(?:([=<>!~]+)(.*))?$/);
            if (match) {
                pythonDeps.set(match[1].toLowerCase(), { version: match[3]?.trim() || null });
            }
        }
    }

    // Check each technology definition
    for (const def of TECH_DEFINITIONS) {
        let found = false;
        let source = '';
        let version = null;
        let isDirect = false;

        // Check NPM packages
        if (def.npm && def.npm.length > 0) {
            for (const pkg of def.npm) {
                if (npmDeps.has(pkg.toLowerCase())) {
                    const info = npmDeps.get(pkg.toLowerCase());
                    found = true;
                    source = `package.json (${info.section}: ${pkg})`;
                    version = info.version;
                    isDirect = true;
                    break;
                }
            }
        }

        // Check Python packages
        if (!found && def.python && def.python.length > 0) {
            for (const pkg of def.python) {
                if (pythonDeps.has(pkg.toLowerCase())) {
                    const info = pythonDeps.get(pkg.toLowerCase());
                    found = true;
                    source = `requirements.txt (${pkg})`;
                    version = info.version;
                    isDirect = true;
                    break;
                }
            }
        }

        // Check Dockerfile / Compose
        if (!found && def.docker && dockerfileContent) {
            for (const img of def.docker) {
                if (dockerfileContent.toLowerCase().includes(img.toLowerCase())) {
                    found = true;
                    source = `Dockerfile / Docker Compose (${img})`;
                    isDirect = true;
                    break;
                }
            }
        }

        // Check configuration files or signature paths
        if (!found && def.files && def.files.length > 0) {
            for (const filePattern of def.files) {
                if (filePattern.endsWith('/')) {
                    // Directory prefix
                    if (treePaths.some(p => p.startsWith(filePattern))) {
                        found = true;
                        source = `Repository structure (${filePattern})`;
                        isDirect = false;
                        break;
                    }
                } else if (pathsSet.has(filePattern)) {
                    found = true;
                    source = `Configuration file (${filePattern})`;
                    isDirect = true;
                    break;
                }
            }
        }

        // Check file extensions (for languages)
        if (!found && def.extensions && def.extensions.length > 0) {
            for (const ext of def.extensions) {
                if (treePaths.some(p => p.toLowerCase().endsWith(ext))) {
                    found = true;
                    source = `Source files (${ext})`;
                    isDirect = false;
                    break;
                }
            }
        }

        // Check GitHub language statistics
        if (!found && def.category === 'Programming Languages' && githubLanguages[def.name]) {
            found = true;
            source = `GitHub Languages API (${githubLanguages[def.name]} bytes)`;
            isDirect = true;
        }

        // If found, register
        if (found) {
            detected.set(def.name, {
                name: def.name,
                category: def.category,
                iconSlug: def.iconSlug,
                logoUrl: `https://cdn.simpleicons.org/${def.iconSlug}`,
                version: version || null,
                detectionSource: source,
                type: isDirect ? 'declared' : 'inferred',
            });
        }
    }

    // Convert map to array and category breakdown
    const items = Array.from(detected.values());
    const categorySummary = {};
    for (const item of items) {
        categorySummary[item.category] = (categorySummary[item.category] || 0) + 1;
    }

    return {
        status: 'completed',
        total_technologies: items.length,
        categories: categorySummary,
        technologies: items,
        declared_count: items.filter(t => t.type === 'declared').length,
        inferred_count: items.filter(t => t.type === 'inferred').length,
    };
}

