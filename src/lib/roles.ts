import type { Role, RoleCategory } from "@/types";
import { DSA_ROLE } from "@/lib/dsa";

/* ============================================================ *
 * Role catalog — every interviewable role HireLoop supports.
 * Topics are what an actual hiring manager would probe.
 * ============================================================ */

export const ROLES: Role[] = [
  /* ---- Engineering ------------------------------------------------ */
  {
    id: "frontend-developer",
    name: "Frontend Developer",
    category: "engineering",
    description:
      "UI engineering with modern frameworks, performance, and accessibility.",
    topics: [
      "React/Vue/Svelte",
      "State management",
      "CSS architecture",
      "Performance optimization",
      "Accessibility",
      "Browser APIs",
      "TypeScript",
      "Testing",
    ],
  },
  {
    id: "backend-developer",
    name: "Backend Developer",
    category: "engineering",
    description:
      "Server-side systems, API design, data modeling, and scalability.",
    topics: [
      "API design (REST/GraphQL)",
      "Database modeling",
      "Caching strategies",
      "Authentication & authorization",
      "Concurrency",
      "Message queues",
      "Observability",
      "Testing",
    ],
  },
  {
    id: "full-stack-developer",
    name: "Full-Stack Developer",
    category: "engineering",
    description:
      "End-to-end product engineering across client, server, and data.",
    topics: [
      "Frontend frameworks",
      "API design",
      "Database modeling",
      "Authentication flows",
      "Deployment & CI/CD",
      "State management",
      "Performance",
      "System design",
    ],
  },
  {
    id: "mobile-developer",
    name: "Mobile Developer",
    category: "engineering",
    description: "Native and cross-platform mobile app engineering.",
    topics: [
      "iOS/Android fundamentals",
      "React Native / Flutter",
      "Mobile state management",
      "Offline & sync",
      "App performance",
      "Push notifications",
      "App store deployment",
      "Native modules",
    ],
  },
  {
    id: "devops-sre",
    name: "DevOps / SRE",
    category: "engineering",
    description:
      "Infrastructure, reliability, automation, and incident response.",
    topics: [
      "CI/CD pipelines",
      "Containers & Kubernetes",
      "Infrastructure as Code",
      "Observability & monitoring",
      "Incident response",
      "SLOs & error budgets",
      "Cloud platforms",
      "Linux & networking",
    ],
  },
  {
    id: "security-engineer",
    name: "Security Engineer",
    category: "engineering",
    description:
      "Application and infrastructure security, threat modeling, and defense.",
    topics: [
      "Threat modeling",
      "OWASP Top 10",
      "Authentication & cryptography",
      "Network security",
      "Cloud security",
      "Incident response",
      "Secure SDLC",
      "Penetration testing",
    ],
  },
  {
    id: "ml-engineer",
    name: "ML Engineer",
    category: "engineering",
    description:
      "Production machine learning systems, training pipelines, and deployment.",
    topics: [
      "ML algorithms",
      "Model training & evaluation",
      "Feature engineering",
      "MLOps & deployment",
      "Data pipelines",
      "Model monitoring",
      "Deep learning frameworks",
      "Scaling inference",
    ],
  },

  /* ---- Data ------------------------------------------------------- */
  {
    id: "data-scientist",
    name: "Data Scientist",
    category: "data",
    description:
      "Statistical modeling, experimentation, and turning data into decisions.",
    topics: [
      "Statistics & probability",
      "Experimentation & A/B testing",
      "Machine learning",
      "Data wrangling",
      "SQL & Python",
      "Causal inference",
      "Data visualization",
      "Communicating insights",
    ],
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    category: "data",
    description:
      "Analytics, reporting, and translating business questions into data answers.",
    topics: [
      "SQL",
      "Data visualization",
      "Business metrics & KPIs",
      "Dashboard design",
      "Statistical reasoning",
      "Spreadsheet modeling",
      "Stakeholder communication",
      "Data storytelling",
    ],
  },
  {
    id: "data-engineer",
    name: "Data Engineer",
    category: "data",
    description:
      "Data pipelines, warehousing, and large-scale data infrastructure.",
    topics: [
      "ETL/ELT pipelines",
      "Data warehousing",
      "SQL & query optimization",
      "Distributed processing (Spark)",
      "Data modeling",
      "Streaming (Kafka)",
      "Orchestration (Airflow)",
      "Data quality",
    ],
  },
  {
    id: "analytics-engineer",
    name: "Analytics Engineer",
    category: "data",
    description:
      "The bridge between data engineering and analytics — modeling trusted datasets.",
    topics: [
      "dbt & data modeling",
      "SQL",
      "Data warehousing",
      "Dimensional modeling",
      "Data testing & documentation",
      "Version control for data",
      "BI tools",
      "Metrics layers",
    ],
  },

  /* ---- Product ---------------------------------------------------- */
  {
    id: "product-manager",
    name: "Product Manager",
    category: "product",
    description:
      "Product strategy, prioritization, and shipping outcomes that matter.",
    topics: [
      "Product strategy",
      "Prioritization frameworks",
      "User research",
      "Roadmapping",
      "Metrics & success criteria",
      "Stakeholder management",
      "Go-to-market",
      "Product discovery",
    ],
  },
  {
    id: "technical-product-manager",
    name: "Technical Product Manager",
    category: "product",
    description:
      "Product management for technical products, platforms, and APIs.",
    topics: [
      "Technical product strategy",
      "API & platform products",
      "System design literacy",
      "Working with engineering",
      "Technical tradeoffs",
      "Roadmapping",
      "Data & metrics",
      "Developer experience",
    ],
  },
  {
    id: "growth-pm",
    name: "Growth PM",
    category: "product",
    description:
      "Product-led growth, funnels, experimentation, and retention.",
    topics: [
      "Growth funnels & loops",
      "A/B testing & experimentation",
      "Activation & retention",
      "Acquisition channels",
      "Metrics & North Star",
      "Onboarding optimization",
      "Monetization",
      "Behavioral psychology",
    ],
  },
  {
    id: "product-operations",
    name: "Product Operations",
    category: "product",
    description:
      "Scaling product processes, tooling, and cross-functional alignment.",
    topics: [
      "Product processes & rituals",
      "Cross-functional coordination",
      "Tooling & systems",
      "Insights operations",
      "Roadmap communication",
      "Launch management",
      "Stakeholder alignment",
      "Process improvement",
    ],
  },

  /* ---- Design ----------------------------------------------------- */
  {
    id: "ux-designer",
    name: "UX Designer",
    category: "design",
    description:
      "User research, interaction design, and information architecture.",
    topics: [
      "User research",
      "Interaction design",
      "Information architecture",
      "Usability testing",
      "Wireframing & prototyping",
      "Accessibility",
      "Design thinking",
      "Journey mapping",
    ],
  },
  {
    id: "ui-designer",
    name: "UI Designer",
    category: "design",
    description: "Visual design, typography, and crafting polished interfaces.",
    topics: [
      "Visual design principles",
      "Typography",
      "Color & layout",
      "Design tools (Figma)",
      "Responsive design",
      "Iconography",
      "Motion & micro-interactions",
      "Design handoff",
    ],
  },
  {
    id: "product-designer",
    name: "Product Designer",
    category: "design",
    description:
      "End-to-end product design from research to polished, shipped UI.",
    topics: [
      "Product thinking",
      "User research",
      "Interaction design",
      "Visual design",
      "Prototyping",
      "Design systems",
      "Cross-functional collaboration",
      "Measuring design impact",
    ],
  },
  {
    id: "design-systems-designer",
    name: "Design Systems Designer",
    category: "design",
    description:
      "Scalable component libraries, design tokens, and system governance.",
    topics: [
      "Component architecture",
      "Design tokens",
      "Documentation",
      "Accessibility standards",
      "Design–dev collaboration",
      "Versioning & governance",
      "Theming",
      "Adoption & advocacy",
    ],
  },

  /* ---- Specialized ------------------------------------------------ */
  {
    id: "ai-engineer",
    name: "AI Engineer",
    category: "specialized",
    description:
      "Building applications powered by LLMs, agents, and generative AI.",
    topics: [
      "LLM application design",
      "Prompt engineering",
      "RAG & embeddings",
      "Agents & tool use",
      "Evaluation & guardrails",
      "Vector databases",
      "Fine-tuning vs prompting",
      "Latency & cost optimization",
    ],
  },
  {
    id: "solutions-architect",
    name: "Solutions Architect",
    category: "specialized",
    description:
      "Designing technical solutions that map business needs to architecture.",
    topics: [
      "System architecture",
      "Cloud platforms",
      "Scalability & reliability",
      "Integration patterns",
      "Cost optimization",
      "Security & compliance",
      "Stakeholder communication",
      "Technology selection",
    ],
  },
];

/** Ordered category keys for rendering grouped sections. */
export const CATEGORY_ORDER: RoleCategory[] = [
  "engineering",
  "data",
  "product",
  "design",
  "specialized",
];

/** Display labels for each category. */
export const CATEGORY_LABELS: Record<RoleCategory, string> = {
  engineering: "Engineering",
  data: "Data",
  product: "Product",
  design: "Design",
  specialized: "Specialized",
};

/** Look up a role by its id (including the virtual DSA role). */
export function getRole(id: string): Role | undefined {
  if (id === DSA_ROLE.id) return DSA_ROLE;
  return ROLES.find((role) => role.id === id);
}

/** Roles belonging to a category, in catalog order. */
export function getRolesByCategory(category: RoleCategory): Role[] {
  return ROLES.filter((role) => role.category === category);
}
