// KeyBox platform prefix detection (standalone module, unit-testable)
export const PLATFORMS = [
  { key: "github_fg", name: "GitHub", prefixes: ["github_pat_"] },
  { key: "github", name: "GitHub", prefixes: ["ghp_", "gho_", "ghu_", "ghs_"] },
  { key: "anthropic", name: "Anthropic", prefixes: ["sk-ant-"] },
  { key: "stripe", name: "Stripe", prefixes: ["sk_live_", "sk_test_"] },
  { key: "skillhub", name: "SkillHub", prefixes: ["skh_"] },
  { key: "openai", name: "OpenAI", prefixes: ["sk-"] },
  { key: "aws", name: "AWS", prefixes: ["AKIA", "ASIA"] },
  { key: "deepseek", name: "DeepSeek", prefixes: ["sk-"] },
];

export function detectPlatform(val) {
  if (!val) return { key: "unknown", name: "其他/未知" };
  for (const p of PLATFORMS) {
    if (p.prefixes.some((x) => val.startsWith(x))) return { key: p.key, name: p.name };
  }
  return { key: "unknown", name: "其他/未知" };
}