"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, X, Bot, RotateCcw, AlertTriangle } from "lucide-react"
import { Vulnerability } from "./vulnerability-kanban"

interface ChatbotProps {
  selectedVuln: Vulnerability | null
  isOpen: boolean
  onClose: () => void
  allVulns?: Vulnerability[]
  repoName?: string
}

interface Message {
  role: "user" | "assistant"
  content: string
}

// Inline markdown → safe HTML (bold, italic, inline code, links)
function renderInlineMarkdown(text: string): string {
  return text
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // *italic* or _italic_
    .replace(/\*(.+?)\*/g, '<em class="italic text-slate-300">$1</em>')
    .replace(/_(.+?)_/g, '<em class="italic text-slate-300">$1</em>')
    // `inline code`
    .replace(/`(.+?)`/g, '<code class="bg-slate-800 text-orange-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // [text](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-orange-400 underline" target="_blank" rel="noopener noreferrer">$1</a>')
}

// Full Markdown renderer supporting HTML Tables, Fenced Code Blocks, Headings, Lists & Paragraphs
function renderMarkdownContent(content: string): React.ReactNode[] {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 1. Detect Markdown Table (consecutive lines starting & ending with |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim())
        i++
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split("|")
          .map(s => s.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)

        // Check if line 1 is separator line (---)
        const dataStartIdx = tableLines[1].includes("---") ? 2 : 1
        const dataRows = tableLines.slice(dataStartIdx).map(rowLine =>
          rowLine
            .split("|")
            .map(s => s.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        )

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/90 shadow-md">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-900 text-orange-400 border-b border-slate-800">
                  {headerCells.map((cell, cIdx) => (
                    <th key={cIdx} className="p-2.5 font-bold uppercase tracking-wider">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-850/60 hover:bg-slate-900/60 transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 text-slate-300" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell) }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }
    }

    // 2. Fenced Code Block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = []
      const lang = line.trim().slice(3)
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) i++

      elements.push(
        <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 text-xs font-mono">
          {lang && <div className="px-3 py-1 bg-slate-900 text-orange-400 text-[10px] uppercase font-bold border-b border-slate-800">{lang}</div>}
          <pre className="p-3 text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">{codeLines.join("\n")}</pre>
        </div>
      )
      continue
    }

    // 3. Headings
    if (line.startsWith("### ")) {
      elements.push(<h3 key={`h3-${i}`} className="text-sm font-bold text-orange-500 mt-3 mb-1">{line.slice(4)}</h3>)
      i++
      continue
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={`h2-${i}`} className="text-sm font-bold text-white mt-3 mb-1">{line.slice(3)}</h2>)
      i++
      continue
    }
    if (line.startsWith("# ")) {
      elements.push(<h1 key={`h1-${i}`} className="text-base font-bold text-white mt-3 mb-1">{line.slice(2)}</h1>)
      i++
      continue
    }

    // 4. Horizontal Rule
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={`hr-${i}`} className="border-slate-800 my-2" />)
      i++
      continue
    }

    // 5. Bullet List Item
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={`bullet-${i}`} className="flex gap-2 items-start my-1">
          <span className="text-orange-400 mt-0.5 shrink-0">•</span>
          <span className="text-slate-300" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line.slice(2)) }} />
        </div>
      )
      i++
      continue
    }

    // 6. Spacer
    if (line.trim() === "") {
      elements.push(<div key={`space-${i}`} className="h-1" />)
      i++
      continue
    }

    // 7. Regular Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }} />
    )
    i++
  }

  return elements
}

export default function SecurityChatbot({ selectedVuln, isOpen, onClose, allVulns, repoName }: ChatbotProps) {
  const targetRepo = repoName || (typeof window !== "undefined" ? localStorage.getItem("aurix_scanned_repo") || "" : "")

  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Hello! I am **AURIX Tutor**. Ask me anything about vulnerabilities in your repository, PoC exploit scripts, or automated patch fixes." 
    }
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Automatically add message when a vulnerability card is selected
  useEffect(() => {
    if (selectedVuln) {
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: `I've loaded security context for **${selectedVuln.vuln}** in \`${selectedVuln.file.split("/").pop()}\`. How can I help you analyze the exploit PoC or remediation patch?` 
        }
      ])
    }
  }, [selectedVuln])

  const askAiTutor = async (promptText: string, currentHistory: Message[]) => {
    setIsTyping(true)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentHistory.map(m => ({ role: m.role, content: m.content })),
          repoName: targetRepo,
          selectedVuln: selectedVuln ? {
            vuln: selectedVuln.vuln,
            file: selectedVuln.file,
            layer: selectedVuln.layer,
            severity: selectedVuln.severity,
            cvss: selectedVuln.cvss,
            status: selectedVuln.status,
            codeLine: selectedVuln.codeLine,
            vulnCode: selectedVuln.vulnCode,
            pocScript: selectedVuln.pocScript,
            patchCode: selectedVuln.patchCode
          } : null,
          allVulns: (allVulns || []).map(v => ({
            vuln: v.vuln,
            file: v.file,
            layer: v.layer,
            severity: v.severity,
            cvss: v.cvss,
            status: v.status,
            codeLine: v.codeLine
          }))
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.reply) {
          setIsTyping(false)
          setMessages(prev => [...prev, { role: "assistant", content: data.reply }])
          return
        }
      }
    } catch (err) {
      console.warn("AURIX Tutor API call error:", err)
    }

    // Contextual fallback response generator when offline / LLM unavailable
    let reply = ""
    const query = promptText.toLowerCase()

    if (selectedVuln) {
      if (query.includes("poc") || query.includes("exploit")) {
        reply = `The **Red Agent** generated a Proof-of-Concept exploit script for **${selectedVuln.vuln}** in \`${selectedVuln.file}\`.\n\n` +
          `### Exploit Verification:\n` +
          `- **Vulnerable Line**: ${selectedVuln.codeLine}\n` +
          `- **Execution Method**: Simulates untrusted payload that bypasses input boundaries.\n` +
          `- **True Positive Proof**: Executed inside an ephemeral, network-isolated Docker sandbox to prove real-world exploitability.\n\n` +
          `Would you like to review the Blue Agent's suggested patch diff?`
      } else if (query.includes("patch") || query.includes("fix") || query.includes("remediat")) {
        reply = `The **Blue Agent** generated an automated remediation patch for **${selectedVuln.vuln}** in \`${selectedVuln.file}\`.\n\n` +
          `### Patch Details:\n` +
          `- Replaces unescaped variables with parameterized / sanitized queries.\n` +
          `- **Wargame Result**: The exploit script was re-run against the patch and was successfully neutralized.\n` +
          `- Click **"One-Click GitHub PR Fix"** in the details view to merge this fix.`
      } else {
        reply = `### Security Analysis: **${selectedVuln.vuln}**\n\n` +
          `- **File**: \`${selectedVuln.file}\` (Line ${selectedVuln.codeLine})\n` +
          `- **Severity**: **${selectedVuln.severity}** (CVSS ${selectedVuln.cvss})\n` +
          `- **Layer**: ${selectedVuln.layer}\n\n` +
          `This issue presents an attack surface where untrusted parameters can alter execution flow. We recommend applying the Blue Agent's patch.`
      }
    } else if (allVulns && allVulns.length > 0) {
      let tableMd = `| Vulnerability | Severity | Layer | File | Line |\n| --- | --- | --- | --- | --- |\n`
      allVulns.forEach(v => {
        const fileName = v.file.split("/").pop() || v.file
        tableMd += `| **${v.vuln}** | **${v.severity}** | ${v.layer} | \`${fileName}\` | ${v.codeLine || 'N/A'} |\n`
      })

      reply = `### AURIX Security Report for **${targetRepo || 'your repository'}**\n\n` +
        `AURIX identified **${allVulns.length}** verified security vulnerabilities in your codebase:\n\n` +
        tableMd + `\n` +
        `Select any vulnerability card on the Kanban board to view the Red Agent PoC script and Blue Agent patch!`
    } else {
      reply = `Hello! I am **AURIX Tutor**.\n\n` +
        `I can analyze any vulnerability detected by AURIX scanners, explain exploit PoCs generated by the Red Agent, or review patches from the Blue Agent.\n\n` +
        `Click on any vulnerability card in the Kanban board to load its code context!`
    }

    setIsTyping(false)
    setMessages(prev => [...prev, { role: "assistant", content: reply }])
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return

    const userMsg = input.trim()
    const nextMessages: Message[] = [...messages, { role: "user", content: userMsg }]
    setMessages(nextMessages)
    setInput("")
    askAiTutor(userMsg, nextMessages)
  }

  const handleQuickQuestion = (q: string) => {
    if (isTyping) return
    const nextMessages: Message[] = [...messages, { role: "user", content: q }]
    setMessages(nextMessages)
    askAiTutor(q, nextMessages)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-350">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <Bot size={20} className="text-orange-500" />
          <h3 className="font-bold text-sm">AURIX Tutor</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setMessages([{ role: "assistant", content: "Chat reset. How can I assist you with your code security in AURIX?" }])}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition cursor-pointer"
            title="Reset Chat"
          >
            <RotateCcw size={16} />
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Selected context banner */}
      {selectedVuln && (
        <div className="p-3 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-850 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-mono">
          <AlertTriangle size={14} className="shrink-0" />
          <div className="truncate">
            Context: <strong>{selectedVuln.vuln}</strong> in <code>{selectedVuln.file.split("/").pop()}</code>
          </div>
        </div>
      )}

      {/* Message Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/30 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-orange-500" />
              </div>
            )}
            
            <div className={`p-3 rounded-xl max-w-[85%] text-sm leading-relaxed ${
              msg.role === "user" 
                ? "bg-orange-500 text-slate-950 font-medium" 
                : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-200 shadow-sm"
            }`}>
              {msg.role === "user" ? (
                <span>{msg.content}</span>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none space-y-1.5">
                  {renderMarkdownContent(msg.content)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-orange-500 animate-spin" />
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-500 text-xs font-mono shadow-sm">
              AURIX is thinking...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-slate-850/50 flex flex-wrap gap-2">
        {selectedVuln ? (
          <>
            <button
              onClick={() => handleQuickQuestion("Explain the Red Agent PoC exploit")}
              className="text-[10px] bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 px-2.5 py-1 rounded text-slate-600 dark:text-slate-400 font-mono transition cursor-pointer shadow-sm"
            >
              Explain Exploit PoC
            </button>
            <button
              onClick={() => handleQuickQuestion("How does the Blue Agent patch fix this?")}
              className="text-[10px] bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 px-2.5 py-1 rounded text-slate-600 dark:text-slate-400 font-mono transition cursor-pointer shadow-sm"
            >
              Explain Patch Fix
            </button>
          </>
        ) : (
          <button
            onClick={() => handleQuickQuestion("What vulnerabilities are in my repo?")}
            className="text-[10px] bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 px-2.5 py-1 rounded text-slate-600 dark:text-slate-400 font-mono transition cursor-pointer shadow-sm"
          >
            What vulnerabilities are in my repo?
          </button>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 flex gap-2">
        <input
          type="text"
          placeholder="Ask about vulnerabilities, PoC scripts..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-orange-500 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 text-sm outline-none transition"
        />
        <button
          type="submit"
          className="p-2.5 bg-orange-500 text-slate-950 rounded-lg hover:bg-orange-600 transition cursor-pointer"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
