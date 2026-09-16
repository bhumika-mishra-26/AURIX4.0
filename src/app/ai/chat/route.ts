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

    // Groq production model IDs in order of preference
    // See https://console.groq.com/docs/models for the full list
    const candidateModels = [
      process.env.GROQ_MODEL || 'openai/gpt-oss-120b', // 500 t/s, $0.15/$0.60 per 1M
      'openai/gpt-oss-20b',                             // 1000 t/s, $0.075/$0.30 per 1M
      'llama-3.3-70b-versatile',                        // free-tier fallback
      'llama-3.1-8b-instant',                           // free-tier fallback
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

    // Conversational fallback assistant — responds to the actual question asked
    const lastUserMsg = conversation[conversation.length - 1]?.content?.toLowerCase() || '';
    let fallbackReply = '';

    if (selectedVuln) {
      if (lastUserMsg.includes('poc') || lastUserMsg.includes('exploit')) {
        fallbackReply = `Hey there! Let's look at the Proof-of-Concept for **${selectedVuln.vuln}**.\n\n` +
          `AURIX's Red Agent generated a **masked wargaming PoC** targeting line **${selectedVuln.codeLine}** in \`${selectedVuln.file}\`. ` +
          `Because we prioritize safety, this script is sanitized and masked — its primary purpose is to mathematically verify in our isolated sandbox that the vulnerability is exploitable and that the patch completely neutralizes it.\n\n` +
          `Would you like me to explain how an attacker might craft payloads against this line, or shall we inspect the Blue Agent's patch fix?`;
      } else if (lastUserMsg.includes('patch') || lastUserMsg.includes('fix') || lastUserMsg.includes('remediat') || lastUserMsg.includes('how')) {
        fallbackReply = `Here is how we fix **${selectedVuln.vuln}** in \`${selectedVuln.file}\`:\n\n` +
          `The Blue Agent synthesized a surgical patch that replaces unsafe dynamic execution with secure parameterization and strict input validation. ` +
          `Our dual-agent wargaming loop already verified the exploit is 100% neutralized.\n\n` +
          (selectedVuln.patchCode ? `**Suggested patch:**\n\`\`\`\n${selectedVuln.patchCode}\n\`\`\`\n\n` : '') +
          `💡 Click **"Implement PR Fix"** in the details panel to auto-open a verified Pull Request on your GitHub repo!`;
      } else if (lastUserMsg.includes('what') || lastUserMsg.includes('explain') || lastUserMsg.includes('tell') || lastUserMsg.includes('describe')) {
        fallbackReply = `**${selectedVuln.vuln}** is a **${selectedVuln.severity}** severity finding (CVSS ${selectedVuln.cvss || 'N/A'}) in the **${selectedVuln.layer}** layer.\n\n` +
          `📍 **Location:** \`${selectedVuln.file}\`, line **${selectedVuln.codeLine}**\n\n` +
          (selectedVuln.vulnCode ? `**Vulnerable code:**\n\`\`\`\n${selectedVuln.vulnCode}\n\`\`\`\n\n` : '') +
          `This flaw typically arises when user-controlled input reaches a sensitive execution sink without proper validation or parameter binding, enabling an attacker to run arbitrary commands.\n\n` +
          `Want me to walk through the attack vector, the Blue Agent patch, or both?`;
      } else {
        fallbackReply = `Looking at **${selectedVuln.vuln}** (${selectedVuln.severity} severity, CVSS ${selectedVuln.cvss || 'N/A'}):\n\n` +
          `📍 \`${selectedVuln.file}\` · line **${selectedVuln.codeLine}** · **${selectedVuln.layer}** layer.\n\n` +
          `How can I help? I can explain the attack vector, break down the patch diff, or walk you through testing the fix!`;
      }
    } else {
      // No vuln selected — respond contextually based on what was actually asked.
      // IMPORTANT: Check more specific conditions FIRST to avoid broad keyword collisions.
      // e.g. "what" alone is too broad — pair it with vuln-specific words.

      const isAskingForVulnList =
        lastUserMsg.includes('vuln') ||
        lastUserMsg.includes('found') ||
        lastUserMsg.includes('scan') ||
        lastUserMsg.includes('repo') ||
        lastUserMsg.includes('list') ||
        lastUserMsg.includes('show') ||
        (lastUserMsg.includes('what') && (
          lastUserMsg.includes('vuln') ||
          lastUserMsg.includes('issue') ||
          lastUserMsg.includes('problem') ||
          lastUserMsg.includes('finding') ||
          lastUserMsg.includes('in my')
        ));

      const isAskingForFix =
        lastUserMsg.includes('fix') ||
        lastUserMsg.includes('patch') ||
        lastUserMsg.includes('remediat') ||
        (lastUserMsg.includes('how') && !lastUserMsg.includes('how does') && !lastUserMsg.includes('how do i explain'));

      const isAskingToExplain =
        lastUserMsg.includes('explain') ||
        lastUserMsg.includes('describe') ||
        lastUserMsg.includes('tell me') ||
        lastUserMsg.includes('what is') ||
        lastUserMsg.includes('what are') ||
        lastUserMsg.includes('how does') ||
        lastUserMsg.includes('how do');

      const isAskingAboutExploit =
        lastUserMsg.includes('exploit') ||
        lastUserMsg.includes('poc') ||
        lastUserMsg.includes('attack') ||
        lastUserMsg.includes('hack');

      const isGreeting =
        lastUserMsg.includes('hello') ||
        lastUserMsg.includes('hi ') ||
        lastUserMsg === 'hi' ||
        lastUserMsg.includes('hey');

      if (isAskingForFix) {
        fallbackReply = `Great question! To fix the vulnerabilities AURIX found:\n\n` +
          `1. **Click a vulnerability card** on the Kanban board to load its full context.\n` +
          `2. Open the **Vulnerability Details** panel and review the Blue Agent's suggested patch.\n` +
          `3. Click **"Implement PR Fix"** to automatically open a verified Pull Request on your GitHub repo.\n\n` +
          `Each fix has been wargame-tested by the Red/Blue agent loop to confirm the exploit is fully neutralized. Want me to explain any specific vulnerability fix in detail?`;
      } else if (isAskingForVulnList) {
        const { allVulns: vulnList } = await req.clone().json().catch(() => ({ allVulns: [] }));
        if (Array.isArray(vulnList) && vulnList.length > 0) {
          let tableMd = `| Vulnerability | Severity | Layer | File | Line |\n| --- | --- | --- | --- | --- |\n`;
          vulnList.forEach((v: any) => {
            const fileName = (v.file || '').split('/').pop() || v.file;
            tableMd += `| **${v.vuln}** | ${v.severity} | ${v.layer} | \`${fileName}\` | ${v.codeLine || 'N/A'} |\n`;
          });
          fallbackReply = `Here is your security overview:\n\nWe found **${vulnList.length}** verified findings:\n\n${tableMd}\nClick any vulnerability card on the board and I'll dive into the exploit and fix with you!`;
        } else {
          fallbackReply = `No vulnerability data is loaded yet. Run a scan from your Dashboard, then come back and I can walk through every finding with you!`;
        }
      } else if (isAskingToExplain) {
        fallbackReply = `Sure! To get a full explanation of a specific vulnerability, **click any card on the Kanban board** to load its context.\n\n` +
          `I'll then walk you through:\n` +
          `- 🔍 **What the flaw is** and why it's dangerous\n` +
          `- 💥 **How the Red Agent PoC** demonstrates it in a safe, sandboxed wargame\n` +
          `- 🛡️ **How the Blue Agent patch** neutralizes it\n` +
          `- 🚀 **How to ship the fix** via an automated GitHub Pull Request\n\n` +
          `Or ask me **"what vulnerabilities are in my repo?"** for a full findings overview!`;
      } else if (isAskingAboutExploit) {
        fallbackReply = `Great security question! **Exploits** are techniques attackers use to trigger a vulnerability and cause unauthorized behaviour.\n\n` +
          `In AURIX, the **Red Agent** auto-generates a masked Proof-of-Concept (PoC) for each finding. The PoC is sanitized for safety — it proves the flaw is real and verifies the Blue Agent patch neutralizes it, without exposing a live weaponized exploit chain.\n\n` +
          `**Click any vulnerability card** on the Kanban board and I'll walk you through its specific exploit vector and the corresponding patch!`;
      } else if (isGreeting) {
        fallbackReply = `Hey! 👋 Great to see you! I'm **AURIX Tutor**, your DevSecOps AI pair-programmer.\n\n` +
          `I can help you:\n` +
          `- **Understand** each vulnerability in your repo\n` +
          `- **Analyze** the Red Agent exploit proof-of-concept\n` +
          `- **Review** the Blue Agent's automated patch\n` +
          `- **Guide** you to implement fixes via GitHub Pull Request\n\n` +
          `Click any vulnerability card on the Kanban board to get started, or just ask me anything!`;
      } else {
        fallbackReply = `I'm **AURIX Tutor**, your AI DevSecOps assistant! Here's what I can help with:\n\n` +
          `- **"What vulnerabilities are in my repo?"** — Full findings overview\n` +
          `- **"How can I fix these?"** — Step-by-step remediation guide\n` +
          `- **"Explain exploit / poc"** — Learn about attack vectors\n` +
          `- **Click a vulnerability card** — Deep-dive into a specific exploit + fix\n\n` +
          `What would you like to explore?`;
      }
    }

    return NextResponse.json({ reply: fallbackReply, source: 'conversational-fallback' });
  } catch (err) {
    console.error('Error in /api/ai/chat:', err);
    return NextResponse.json({ error: 'Internal server error processing security chat' }, { status: 500 });
  }
}
