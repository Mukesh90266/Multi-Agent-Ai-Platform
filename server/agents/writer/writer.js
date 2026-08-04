import { askLLM } from "../../services/llmService.js";
import { writerPrompt } from "./writerPrompt.js";

function demoDraft({ topic, contentType, audience }) {
  return {
    content: `# ${topic}

## Introduction

Welcome to this comprehensive guide on ${topic}. In this article, we'll explore the key aspects and provide valuable insights for ${audience}.

## Key Concepts

Understanding ${topic} is essential for modern web development. Here are the main points to consider:

1. **Core Principles**: The fundamental concepts that drive this technology
2. **Practical Applications**: Real-world use cases and examples
3. **Best Practices**: Industry-standard approaches and recommendations

## Benefits

${topic} offers numerous advantages:

- Improved developer experience
- Better performance optimization
- Enhanced code maintainability
- Strong community support

## Getting Started

To begin your journey with ${topic}, follow these steps:

1. Set up your development environment
2. Learn the basic syntax and concepts
3. Build small projects to practice
4. Join the community for support

## Common Challenges

Every technology has its learning curve. Here are some challenges you might face:

- Understanding complex concepts initially
- Choosing the right tools and libraries
- Managing state and data flow

## Conclusion

${topic} is a powerful technology that can significantly improve your development workflow. With practice and dedication, you'll master these concepts in no time.

---

*This is a demo draft. Configure an AI provider (like Groq) for full content generation.*
`,
    wordCount: 250,
    mode: "demo"
  };
}

export async function writeContent(input) {
  const prompt = writerPrompt(input);

  const draft = await askLLM(prompt, {
    temperature: 0.7,
    jsonMode: false,
    systemMessage: `
You are a skilled Writer Agent.
Write original, clear, useful content.
Return only the completed draft in Markdown format.
`
  });

  // Fallback to demo mode if no LLM is available
  if (!draft || draft.trim().length < 100) {
    return demoDraft(input);
  }

  return {
    content: draft.trim(),
    wordCount: draft.trim().split(/\s+/).filter(Boolean).length,
    mode: "llm"
  };
}
