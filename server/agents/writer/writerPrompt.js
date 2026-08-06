export const writerPrompt = ({
  topic,
  contentType,
  audience,
  tone,
  wordCount,
  research,
  editorFeedback
}) => {
  const isRevision = !!editorFeedback;
  
  const basePrompt = `
You are an expert Content Writer creating high-quality ${contentType} content.

Your goal: Create content that meets the Editor's quality standards in ONE revision if possible.

Target:
- Topic: ${topic}
- Type: ${contentType}
- Audience: ${audience}
- Tone: ${tone}
- Word count: ${wordCount || 800} words

Research to use:
${JSON.stringify(research, null, 2)}
`;

  let revisionPrompt = "";

  if (isRevision) {
    revisionPrompt = `
========================================
REVISION REQUIRED - ADDRESS ALL FEEDBACK
========================================

Editor found these issues in your previous draft:

Summary: ${editorFeedback.summary || "See details below"}

${editorFeedback.revisionInstructions?.length ? `
MUST FIX (in order):
${editorFeedback.revisionInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}
` : ''}

${editorFeedback.weaknesses?.length ? `
SPECIFIC PROBLEMS:
${editorFeedback.weaknesses.map(w => `- [${w.severity.toUpperCase()}] ${w.section}: ${w.issue}
  Fix: ${w.suggestion}`).join('\n')}
` : ''}

${editorFeedback.missingPoints?.length ? `
ADD THIS CONTENT:
${editorFeedback.missingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
` : ''}

IMPORTANT:
1. Fix ALL the issues listed above
2. Don't just make minor changes - genuinely improve
3. If you add new content, make it high quality
4. Maintain good parts of previous draft
`;
  }

  const writingRules = `

WRITING RULES:
${isRevision ? `
REVISION: Fix all issues from Editor feedback. Make this version BETTER.
` : ''}
1. Original, well-structured ${contentType}
2. Appropriate for ${audience}
3. Match "${tone}" tone
4. Use research outline for structure
5. Add real, helpful examples
6. No fake facts, stats, or citations
7. No mention of AI or agents
8. Include strong intro and conclusion
9. Target word count: ${wordCount || 800} words

${isRevision ? `
Return the REVISED ${contentType} that fixes all Editor feedback.
` : `Return the completed ${contentType}.`}
`;

  return basePrompt + revisionPrompt + writingRules;
};
