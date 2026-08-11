export const writerPrompt = ({
  topic,
  contentType,
  audience,
  tone,
  wordCount,
  research,
  editorFeedback,
  toolResults
}) => {
  const isRevision = !!editorFeedback;
  const toolBlock = Array.isArray(toolResults) && toolResults.length
    ? `\nTOOL RESULTS:\n${JSON.stringify(toolResults, null, 2)}\n`
    : "";

  const basePrompt = `
You are an EXPERT CONTENT WRITER. Your goal: Get approved in the FIRST revision.

TARGET:
- Topic: ${topic}
- Type: ${contentType}
- Audience: ${audience}
- Tone: ${tone}
- Words: ${wordCount || 800}

QUALITY STANDARD: Write content that a SENIOR EDITOR would approve without major changes.

RESEARCH:
${JSON.stringify(research, null, 2)}
${toolBlock}
`;

  let revisionPrompt = "";

  if (isRevision) {
    revisionPrompt = `
========================================
EDITOR FEEDBACK - MUST ADDRESS ALL
========================================

Editor found these issues:

SUMMARY: ${editorFeedback.summary || "See below"}

${editorFeedback.revisionInstructions?.length ? `
MUST FIX (in order of importance):
${editorFeedback.revisionInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}
` : ''}

${editorFeedback.weaknesses?.length ? `
SPECIFIC PROBLEMS:
${editorFeedback.weaknesses.map(w => `[${w.severity.toUpperCase()}] ${w.section}: ${w.issue}
Fix: ${w.suggestion}`).join('\n')}
` : ''}

${editorFeedback.missingPoints?.length ? `
MISSING CONTENT:
${editorFeedback.missingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
` : ''}

${editorFeedback.factCheckWarnings?.length ? `
⚠️ FACT CHECK WARNINGS:
${editorFeedback.factCheckWarnings.map(f => `- ${f}`).join('\n')}
Verify these claims before including!
` : ''}

SCORING RULES:
If you fix all issues: Score jumps to 80+
If you fix most: Score becomes 75-79
If you ignore feedback: Score stays low
If you make it worse: Score drops

IMPORTANT:
1. Address EVERY item in the feedback
2. Don't just tweak - genuinely improve
3. Add depth, examples, evidence
4. Fix factual issues
5. Keep what's good from before
`;
  }

  const writingRules = `

WRITING RULES:
${isRevision ? `
REVISION MODE: Fix all feedback. Make this version BETTER than before.
` : ''}

1. Strong opening hook - make them want to read more
2. Specific examples - not generic ones
3. Explain WHY, not just WHAT
4. Add real evidence/data when possible
5. Natural flow between paragraphs
6. Insightful conclusion, not just summary
7. Match "${tone}" tone consistently
8. Target ${wordCount || 800} words
9. No fake statistics or unverified claims
10. No repetition or padding

${isRevision ? `
Return the REVISED ${contentType} that addresses ALL feedback.
` : `Return the completed ${contentType}.`}
`;

  return basePrompt + revisionPrompt + writingRules;
};
