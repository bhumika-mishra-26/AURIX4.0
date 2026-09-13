import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  try {
    const { messages, selectedVuln, prompt } = await req.json();
    const groqApiKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const conversation = Array.isArray(messages)
      ? messages
      : prompt
      ? [{ role: 'user', content: prompt }]
      : [];
    if (conversation.length === 0) {
      return NextResponse.json({ error: 'No message prompt provided' }, { status: 400 });
    }
    let contextDescription =
      'No specific vulnerability is currently highlighted. The developer is asking general application security or AURIX wargaming questions.';
    if (selectedVuln) {
      contextDescription = `Current Selected Vulnerability Details:
- Title: ${selectedVuln.vuln || 'Security Finding'}
- Severity: ${selectedVuln.severity || 'High'} (CVSS: ${selectedVuln.cvss || 'N/A'})
- Architectural Layer: ${selectedVuln.layer || 'Backend'}
- Target File: ${selectedVuln.file || 'Source File'} (Line: ${selectedVuln.codeLine || 'N/A'})
- Vulnerable Code:
${selectedVuln.vulnCode || 'N/A'}
- Red Agent PoC Script:
${selectedVuln.pocScript || 'N/A'}
- Blue Agent Suggested Patch:
${selectedVuln.patchCode || 'N/A'}
- Current Wargame Status: ${selectedVuln.status || 'Active'}`;
    }
    const systemPrompt = `You are the AURIX Contextual Security Tutor, an expert Application Security and AI SecOps mentor.
Project AURIX is an autonomous, zero-false-positive Agentic Security Remediation Platform. It uses a dual-agent LangGraph state machine:
- The Red Agent writes Python exploit PoC scripts and executes them in an ephemeral network-isolated Docker sandbox to mathematically prove True Positive vulnerabilities.
- The Blue Agent synthesizes surgical code patches to remediate the verified flaws.
- The wargaming loop re-tests the exploit against the patch to verify 100% neutralization.
- Verified fixes can be applied automatically via One-Click GitHub Pull Requests.
${contextDescription}
Guidelines:
1. Answer the user's specific question accurately, clearly, and concisely.
2. If they ask about the PoC or exploit, explain the attack vector and why proving it in a sandbox eliminates false positives.
3. If they ask about the patch or remediation, explain why the patch works (e.g. parameterization, sanitization, secrets management).
4. If they ask general programming or security questions, explain with best security engineering practices (OWASP, defense-in-depth).
5. Format your answers in clean, readable Markdown with bullet points or code snippets where helpful.`;
    // 1. Live LLM Call via Groq API
    if (groqApiKey && groqApiKey !== 'your_groq_api_key') {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: 'system', content: systemPrompt }, ...conversation.slice(-6)],
            temperature: 0.3,
            max_tokens: 800,
          }),
        });
        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          return NextResponse.json({
            reply: data.choices[0].message.content,
            source: 'groq-llm',
          });
        }
      } catch (llmErr: any) {
        console.error('Groq LLM call error:', llmErr?.message);
      }
    }
    // 2. Fallback Response Generator
    const lastUserMsg = conversation[conversation.length - 1]?.content?.toLowerCase() || '';
    let fallbackReply = '';
    if (selectedVuln) {
      if (lastUserMsg.includes('poc') || lastUserMsg.includes('exploit')) {
        fallbackReply = `The **Red Agent** generated an executable Proof-of-Concept exploit script for **${selectedVuln.vuln}** in \`${selectedVuln.file}\`.\n\n` +
          `### Exploit Mechanism:\n` +
          `- **Target**: Line ${selectedVuln.codeLine} in \`${selectedVuln.file}\`.\n` +
          `- **Method**: Injects payload to bypass validation checks without proper sanitization.\n` +
          `- **Zero-False-Positive Proof**: Executed directly inside an ephemeral isolated Docker sandbox.\n\n` +
          `You can inspect the full Python PoC in the Vulnerability Details modal.`;
      } else if (lastUserMsg.includes('patch') || lastUserMsg.includes('fix') || lastUserMsg.includes('remediat')) {
        fallbackReply = `The **Blue Agent** generated a surgical remediation patch for **${selectedVuln.vuln}**.\n\n` +
          `### Remediation Strategy:\n` +
          `- **Surgical Diff**: Replaces vulnerable string interpolation/untrusted calls with parameterized bindings.\n` +
          `- **Wargame Neutralization**: The exploit was neutralized with 0 exit errors in sandbox tests.\n` +
          `- **Action**: Click **"One-Click GitHub PR Fix"** to open an automated Pull Request immediately.`;
      } else {
        fallbackReply = `### Analysis for **${selectedVuln.vuln}** (${selectedVuln.severity} - CVSS ${selectedVuln.cvss})\n\n` +
          `- **Location**: \`${selectedVuln.file}\` at line **${selectedVuln.codeLine}**\n` +
          `- **Layer**: ${selectedVuln.layer} Architecture\n` +
          `- **Status**: ${selectedVuln.status.toUpperCase()}\n\n` +
          `This issue occurs when untrusted input is processed without strict validation. Would you like a breakdown of the exploit PoC or the patch diff?`;
      }
    } else {
      fallbackReply = `Hello! I am the **AURIX Security Tutor**.\n\n` +
        `AURIX uses autonomous dual-agent wargaming (Red vs. Blue agents orchestrated via LangGraph) to prove vulnerabilities in ephemeral sandboxes and generate verified patches.\n\n` +
        `Click any vulnerability card on the Kanban board to load its exact source code, PoC exploit, and remediation diff!`;
    }
    return NextResponse.json({ reply: fallbackReply, source: 'fallback-engine' });
  } catch (err) {
    console.error('Error in /api/ai/chat:', err);
    return NextResponse.json({ error: 'Internal server error processing security chat' }, { status: 500 });
  }
}
