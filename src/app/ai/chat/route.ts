import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, selectedVuln, prompt } = await req.json();

    // Groq API Key configured via environment variables
    const groqApiKey = process.env.GROQ_API_KEY;

    const conversation = Array.isArray(messages)
      ? messages
      : prompt
      ? [{ role: 'user', content: prompt }]
      : [];

    if (conversation.length === 0) {
      return NextResponse.json({ error: 'No message prompt provided' }, { status: 400 });
    }

    let contextDescription =
      'No specific vulnerability is currently selected. The developer is exploring general application security, repo posture, or AURIX capabilities.';

    if (selectedVuln) {
      contextDescription = `Active Context - Selected Vulnerability:
- Finding Title: ${selectedVuln.vuln || 'Security Finding'}
- Severity: ${selectedVuln.severity || 'High'} (CVSS Score: ${selectedVuln.cvss || 'N/A'})
- Layer: ${selectedVuln.layer || 'Backend'}
- Target File: ${selectedVuln.file || 'Source File'} (Line: ${selectedVuln.codeLine || 'N/A'})
- Vulnerable Source Code:
\`\`\`
${selectedVuln.vulnCode || 'N/A'}
\`\`\`
- Red Agent Masked PoC Script:
\`\`\`
${selectedVuln.pocScript || 'N/A'}
\`\`\`
- Blue Agent Suggested Patch:
\`\`\`
${selectedVuln.patchCode || 'N/A'}
\`\`\`
- Status in Wargaming Pipeline: ${selectedVuln.status || 'Active'}`;
    }

    const systemPrompt = `You are AURIX Tutor, an intelligent, friendly, and deeply knowledgeable DevSecOps and Application Security AI assistant.
You talk naturally and helpfully like an experienced senior security engineer and mentor sitting right next to the developer, NEVER like a rigid, robotic, or pre-scripted FAQ bot.

Key Guidelines:
1. Be Conversational & Engaging:
   - Talk naturally (e.g., "Hey! Let's take a look at this together...", "Great question. Here is what is happening under the hood:").
   - Respond directly to what the user asked instead of dumping generic information or repetitive bullet dumps.
2. Explain with Clarity:
   - Break down security flaws in plain English with clear, practical code snippets when helpful.
   - Explain the "why": why is this dangerous in production, and how does the suggested patch protect them?
   - If they ask about the Red Agent exploit or PoC, mention that AURIX displays a masked wargaming version that verifies the patch internally without exposing dangerous weaponized exploit chains.
3. Be Action-Oriented:
   - Help them review the Blue Agent patch diff, understand changes, and remind them they can click "Implement PR Fix" to auto-create a GitHub Pull Request.
4. Formatting:
   - Use clean Markdown with concise sections, bold keywords, and clean code blocks.
   - Keep answers focused, insightful, and end with a friendly offer to assist further.

${contextDescription}`;

    // List of models to try in order of preference
    const candidateModels = [
      process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b'
    ];

    if (groqApiKey && groqApiKey !== 'your_groq_api_key') {
      for (const model of candidateModels) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                ...conversation.slice(-8)
              ],
              temperature: 0.6,
              max_tokens: 900,
            }),
          });

          const data = await response.json();
          if (data.choices && data.choices[0]?.message?.content) {
            return NextResponse.json({
              reply: data.choices[0].message.content,
              source: `groq-${model}`,
            });
          }
        } catch (llmErr: any) {
          console.warn(`Groq LLM call failed for ${model}:`, llmErr?.message);
        }
      }
    }

    // Conversational fallback assistant if network / API is temporarily unavailable
    const lastUserMsg = conversation[conversation.length - 1]?.content?.toLowerCase() || '';
    let fallbackReply = '';

    if (selectedVuln) {
      if (lastUserMsg.includes('poc') || lastUserMsg.includes('exploit')) {
        fallbackReply = `Hey there! Let's look at the Proof-of-Concept for **${selectedVuln.vuln}**.\n\n` +
          `AURIX's Red Agent generated a **masked wargaming PoC** targeting line **${selectedVuln.codeLine}** in \`${selectedVuln.file}\`. ` +
          `Because we prioritize safety, this script is sanitized and masked — its primary purpose is to mathematically verify in our isolated sandbox that the vulnerability is exploitable and that the patch completely neutralizes it.\n\n` +
          `Would you like me to explain how an attacker might craft payloads against this line, or shall we inspect the Blue Agent's patch fix?`;
      } else if (lastUserMsg.includes('patch') || lastUserMsg.includes('fix') || lastUserMsg.includes('remediat')) {
        fallbackReply = `Here is how we can fix **${selectedVuln.vuln}** in \`${selectedVuln.file}\`:\n\n` +
          `The Blue Agent has synthesized a surgical patch that replaces unsafe dynamic execution with safe parameterization and input sanitization. ` +
          `Our dual-agent wargaming loop already verified that the exploit is 100% neutralized after applying this change.\n\n` +
          `💡 **Next step**: You can click the **"Implement PR Fix"** button in the Vulnerability Details modal to automatically open a verified Pull Request directly on your GitHub repository!`;
      } else {
        fallbackReply = `Looking at **${selectedVuln.vuln}** (${selectedVuln.severity} severity, CVSS ${selectedVuln.cvss}):\n\n` +
          `This issue is located in \`${selectedVuln.file}\` at line **${selectedVuln.codeLine}** within the **${selectedVuln.layer}** layer. ` +
          `It typically happens when user-controlled inputs reach sensitive execution sinks without proper validation or parameter binding.\n\n` +
          `How can I help you tackle this? I can walk through the attack vector, break down the code patch, or help you test the fix!`;
      }
    } else {
      fallbackReply = `Hey! 👋 I'm **AURIX Tutor**, your AI security assistant.\n\n` +
        `I'm here to help you understand vulnerabilities found across your repository, walk through exploit vectors, and explain how the automated patches keep your codebase safe.\n\n` +
        `Click on any vulnerability in the Kanban board or ask me any question about application security to get started!`;
    }

    return NextResponse.json({ reply: fallbackReply, source: 'conversational-fallback' });
  } catch (err) {
    console.error('Error in /api/ai/chat:', err);
    return NextResponse.json({ error: 'Internal server error processing security chat' }, { status: 500 });
  }
}
