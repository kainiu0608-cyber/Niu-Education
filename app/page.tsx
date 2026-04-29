"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  Paperclip,
  X,
  Sparkles,
  Trash2,
  Copy,
  ImagePlus,
  Brain,
  BookOpen,
  CheckCircle,
  Lightbulb,
  Zap,
  GraduationCap,
  Calculator,
  MessageSquare,
  Target,
  Wand2,
  FileText,
  Presentation,
  Image as ImageIcon,
  Plus,
  History,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Mode =
  | "teach"
  | "hints"
  | "check"
  | "study"
  | "quiz"
  | "quick"
  | "explain";

type Message = {
  role: "user" | "assistant";
  content: string;
  files?: string[];
  previews?: string[];
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
};

const starterMessage: Message = {
  role: "assistant",
  content:
    "Welcome to **Niu Education** ✨ Upload homework, screenshots, Word docs, PowerPoints, or ask a question. I’ll teach it cleanly step by step.",
};

const modes = [
  { id: "teach", name: "Teach", icon: Brain, desc: "Step-by-step" },
  { id: "hints", name: "Hints", icon: Lightbulb, desc: "No instant answer" },
  { id: "check", name: "Check", icon: CheckCircle, desc: "Fix mistakes" },
  { id: "study", name: "Study", icon: BookOpen, desc: "Study guide" },
  { id: "quiz", name: "Quiz", icon: Target, desc: "Test me" },
  { id: "quick", name: "Quick", icon: Zap, desc: "Fast answer" },
  { id: "explain", name: "Explain", icon: MessageSquare, desc: "Make it simple" },
] as const;

const subjects = [
  "Auto-detect",
  "Math",
  "Algebra",
  "Geometry",
  "Biology",
  "Chemistry",
  "Science",
  "English",
  "History",
];

const starters = [
  "Explain this easier",
  "Give me hints first",
  "Make a study guide",
  "Quiz me on this",
  "Check my answer",
  "Make practice problems",
];

function formatMath(text: string) {
  return text
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}

function fileIcon(fileName: string) {
  if (fileName.endsWith(".pptx")) return <Presentation size={18} />;
  if (fileName.endsWith(".docx") || fileName.endsWith(".txt")) {
    return <FileText size={18} />;
  }
  return <ImageIcon size={18} />;
}

function makeTitle(text: string) {
  const cleaned = text.trim() || "New homework chat";
  return cleaned.length > 34 ? cleaned.slice(0, 34) + "..." : cleaned;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([starterMessage]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("teach");
  const [subject, setSubject] = useState("Auto-detect");
  const [grade, setGrade] = useState("middle/high school");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const savedChats = localStorage.getItem("niu-education-chats");
    if (savedChats) setChats(JSON.parse(savedChats));
  }, []);

  function saveChats(nextChats: Chat[]) {
    setChats(nextChats);
    localStorage.setItem("niu-education-chats", JSON.stringify(nextChats));
  }

  function saveCurrentChat(nextMessages: Message[]) {
    const hasRealMessage = nextMessages.some((m) => m.role === "user");
    if (!hasRealMessage) return;

    const firstUser = nextMessages.find((m) => m.role === "user");
    const title = makeTitle(firstUser?.content || "New homework chat");

    if (activeChatId) {
      const updated = chats.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, title, messages: nextMessages }
          : chat
      );
      saveChats(updated);
    } else {
      const newChat: Chat = {
        id: crypto.randomUUID(),
        title,
        messages: nextMessages,
        createdAt: new Date().toLocaleString(),
      };
      setActiveChatId(newChat.id);
      saveChats([newChat, ...chats]);
    }
  }

  useEffect(() => {
    function pasteImage(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items || []).find((x) =>
        x.type.startsWith("image/")
      );
      const file = item?.getAsFile();
      if (file) addFiles([file]);
    }

    window.addEventListener("paste", pasteImage);
    return () => window.removeEventListener("paste", pasteImage);
  }, []);

  function startNewChat() {
    setMessages([starterMessage]);
    setActiveChatId(null);
    setInput("");
    setFiles([]);
    setPreviews([]);
  }

  function openChat(chat: Chat) {
    setMessages(chat.messages);
    setActiveChatId(chat.id);
    setInput("");
    setFiles([]);
    setPreviews([]);
  }

  function deleteChat(chatId: string) {
    const updated = chats.filter((chat) => chat.id !== chatId);
    saveChats(updated);

    if (activeChatId === chatId) {
      startNewChat();
    }
  }

  function addFiles(selected: FileList | File[] | null) {
    if (!selected) return;

    const accepted = Array.from(selected).filter((file) => {
      return (
        file.type.startsWith("image/") ||
        file.name.endsWith(".docx") ||
        file.name.endsWith(".pptx") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md")
      );
    });

    setFiles((prev) => [...prev, ...accepted]);

    accepted.forEach((file) => {
      if (file.type.startsWith("image/")) {
        setPreviews((prev) => [...prev, URL.createObjectURL(file)]);
      }
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function sendMessage(customText?: string) {
    const text = customText || input;

    if (!text.trim() && files.length === 0) return;

    const imagePreviews = files
      .filter((f) => f.type.startsWith("image/"))
      .map((_, i) => previews[i])
      .filter(Boolean);

    const userMessage: Message = {
      role: "user",
      content: text || "Please help me with these files.",
      files: files.map((f) => f.name),
      previews: imagePreviews,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    saveCurrentChat(nextMessages);

    setInput("");
    setFiles([]);
    setPreviews([]);
    setLoading(true);

    const formData = new FormData();
    formData.append("message", userMessage.content);
    formData.append("mode", mode);
    formData.append("subject", subject);
    formData.append("grade", grade);
    formData.append(
      "history",
      JSON.stringify(
        messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      )
    );

    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      const finalMessages = [
        ...nextMessages,
        {
          role: "assistant" as const,
          content: data.answer || data.error || "Something went wrong.",
        },
      ];

      setMessages(finalMessages);
      saveCurrentChat(finalMessages);
    } catch {
      const finalMessages = [
        ...nextMessages,
        {
          role: "assistant" as const,
          content:
            "Something broke. Try again with a clearer screenshot or smaller file.",
        },
      ];

      setMessages(finalMessages);
      saveCurrentChat(finalMessages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050716] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#22d3ee80,transparent_30%),radial-gradient(circle_at_top_right,#a855f780,transparent_32%),radial-gradient(circle_at_bottom,#f9731680,transparent_35%)]" />

      <section className="mx-auto flex h-screen w-full max-w-7xl gap-5 p-4">
        <aside className="hidden w-80 shrink-0 flex-col rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl lg:flex">
          <div className="mb-5">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-300 to-purple-400 text-black shadow-xl">
              <GraduationCap size={34} />
            </div>

            <h1 className="text-4xl font-black leading-tight">
              Niu Education
            </h1>

            <p className="mt-2 text-sm text-gray-300">
              Homework, screenshots, Word docs, PowerPoints, study guides, and quizzes.
            </p>
          </div>

          <button
            onClick={startNewChat}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 font-black text-black hover:bg-cyan-200"
          >
            <Plus size={18} />
            New chat
          </button>

          <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="mb-3 flex items-center gap-2 font-black">
              <History size={18} />
              Recent chats
            </div>

            <div className="max-h-44 space-y-2 overflow-y-auto">
              {chats.length === 0 ? (
                <p className="text-sm text-gray-400">No saved chats yet.</p>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-2 rounded-xl border p-2 ${
                      activeChatId === chat.id
                        ? "border-cyan-300 bg-cyan-300 text-black"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <button
                      onClick={() => openChat(chat)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-bold">{chat.title}</p>
                      <p className="truncate text-xs opacity-70">
                        {chat.createdAt}
                      </p>
                    </button>

                    <button
                      onClick={() => deleteChat(chat.id)}
                      className="rounded-lg p-1 hover:bg-red-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <label className="mb-2 text-xs font-bold text-gray-400">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mb-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none"
          >
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <label className="mb-2 text-xs font-bold text-gray-400">Level</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="mb-5 rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none"
          >
            <option>elementary school</option>
            <option>middle school</option>
            <option>middle/high school</option>
            <option>high school</option>
            <option>college</option>
          </select>

          <div className="space-y-2 overflow-y-auto">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    mode === item.id
                      ? "border-cyan-300 bg-cyan-300 text-black"
                      : "border-white/10 bg-black/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={19} />
                    <div>
                      <p className="font-black">{item.name}</p>
                      <p className="text-xs opacity-70">{item.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto space-y-3 pt-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
              Supports: images, screenshots, .docx, .pptx, .txt, .md.
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col rounded-[2rem] border border-white/15 bg-black/25 shadow-2xl backdrop-blur-xl">
          <header className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-cyan-200">
                  <Sparkles size={16} />
                  Niu Education
                </p>
                <h2 className="text-2xl font-black md:text-4xl">
                  Homework Tutor Chat
                </h2>
                <p className="text-sm text-gray-400">
                  Mode: {mode.toUpperCase()} • Subject: {subject}
                </p>
              </div>

              <button
                onClick={startNewChat}
                className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20"
              >
                <Plus />
              </button>
            </div>
          </header>

          <div className="border-b border-white/10 p-4">
            <div className="flex gap-2 overflow-x-auto">
              {starters.map((starter) => (
                <button
                  key={starter}
                  onClick={() => sendMessage(starter)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-[1.7rem] p-5 leading-7 shadow-xl md:max-w-[78%] ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-cyan-300 to-blue-400 text-black"
                      : "border border-white/10 bg-[#171b2b] text-gray-100"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <p className="font-black">
                      {message.role === "user" ? "You" : "🎓 Niu Education"}
                    </p>

                    {message.role === "assistant" && (
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(message.content)
                        }
                        className="rounded-xl border border-white/10 p-2 text-gray-300 hover:bg-white/10"
                      >
                        <Copy size={16} />
                      </button>
                    )}
                  </div>

                  {message.files && message.files.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {message.files.map((name) => (
                        <div
                          key={name}
                          className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm"
                        >
                          {fileIcon(name)}
                          {name}
                        </div>
                      ))}
                    </div>
                  )}

                  {message.previews && message.previews.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      {message.previews.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt="uploaded homework"
                          className="max-h-64 rounded-2xl border border-white/20 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {message.role === "assistant" ? (
                    <div className="markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {formatMath(message.content)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-[1.7rem] border border-white/10 bg-[#171b2b] p-5 text-gray-200 shadow-xl">
                  <p className="mb-3 font-black">🎓 Niu Education</p>
                  <div className="flex gap-2">
                    <span className="h-3 w-3 animate-bounce rounded-full bg-cyan-300" />
                    <span className="h-3 w-3 animate-bounce rounded-full bg-purple-300 [animation-delay:150ms]" />
                    <span className="h-3 w-3 animate-bounce rounded-full bg-orange-300 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {files.length > 0 && (
            <div className="border-t border-white/10 p-4">
              <div className="flex flex-wrap gap-3">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="relative flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3"
                  >
                    {file.type.startsWith("image/") ? (
                      <ImageIcon size={18} />
                    ) : (
                      fileIcon(file.name)
                    )}
                    <span className="max-w-48 truncate text-sm font-bold">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="rounded-full bg-red-500 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-white/10 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,.docx,.pptx,.txt,.md"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="rounded-[1.5rem] border border-white/15 bg-black/30 p-3"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question, upload homework, attach a PowerPoint/Word doc, paste a screenshot..."
                className="min-h-20 w-full resize-none bg-transparent p-3 text-white outline-none placeholder:text-gray-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 font-bold hover:bg-white/10"
                >
                  <Paperclip size={18} />
                  Attach
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="hidden items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 font-bold hover:bg-white/10 md:flex"
                >
                  <ImagePlus size={18} />
                  Upload
                </button>

                <button
                  onClick={() => setInput((v) => v + " Explain this easier.")}
                  className="hidden items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 font-bold hover:bg-white/10 md:flex"
                >
                  <Wand2 size={18} />
                  Improve
                </button>

                <button
                  onClick={() => sendMessage()}
                  disabled={loading}
                  className="ml-auto flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 px-6 py-3 font-black text-black hover:opacity-90 disabled:opacity-60"
                >
                  Send
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}