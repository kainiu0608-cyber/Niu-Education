"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Paperclip, X, Sparkles, Copy, ImagePlus, Brain, BookOpen,
  CheckCircle, Lightbulb, Zap, GraduationCap, MessageSquare, Target,
  Wand2, FileText, Presentation, Image as ImageIcon, Plus, History,
  Pin, Search, Download, RotateCcw, Menu, NotebookPen, CalendarCheck,
  Calculator, Home as HomeIcon, Pencil, Trash2, LogOut
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Tab = "chat" | "tools" | "notes" | "planner";
type Mode = "teach" | "hints" | "check" | "study" | "quiz" | "quick" | "explain";

type Message = {
  role: "user" | "assistant";
  content: string;
  files?: string[];
  previews?: string[];
};

type Chat = {
  id: string;
  title: string;
  summary: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
};

type Task = {
  id: string;
  text: string;
  done: boolean;
};

type Account = {
  username: string;
  password: string;
};

const starterMessage: Message = {
  role: "assistant",
  content:
    "Welcome to **Niu Education** ✨ Upload homework, screenshots, Word docs, PowerPoints, or ask anything. I’ll teach it step by step.",
};

const modes = [
  { id: "teach", name: "Teach", icon: Brain, desc: "Step-by-step" },
  { id: "hints", name: "Hints", icon: Lightbulb, desc: "Hints first" },
  { id: "check", name: "Check", icon: CheckCircle, desc: "Fix mistakes" },
  { id: "study", name: "Study", icon: BookOpen, desc: "Study guide" },
  { id: "quiz", name: "Quiz", icon: Target, desc: "Test me" },
  { id: "quick", name: "Quick", icon: Zap, desc: "Fast answer" },
  { id: "explain", name: "Explain", icon: MessageSquare, desc: "Make simple" },
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
  if (
    fileName.endsWith(".docx") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md")
  ) {
    return <FileText size={18} />;
  }
  return <ImageIcon size={18} />;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fallbackTitle(messages: Message[]) {
  const firstUser = messages.find((m) => m.role === "user")?.content || "";
  const cleaned = firstUser
    .replace(/please|help|homework|image|question|this/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "New Study Chat";
  return cleaned.length > 45 ? cleaned.slice(0, 45) + "..." : cleaned;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [loggedInUser, setLoggedInUser] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [tab, setTab] = useState<Tab>("chat");

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
  const [chatSearch, setChatSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeChatIdRef = useRef<string | null>(null);

  const userKey = loggedInUser ? `niu-user-${loggedInUser}` : "";

  useEffect(() => {
    const current = localStorage.getItem("niu-current-user");
    if (current) setLoggedInUser(current);
  }, []);

  useEffect(() => {
    if (!loggedInUser) return;

    const raw = localStorage.getItem(userKey);
    if (raw) {
      const data = JSON.parse(raw);
      setChats(data.chats || []);
      setNotes(data.notes || "");
      setTasks(data.tasks || []);
    } else {
      setChats([]);
      setNotes("");
      setTasks([]);
    }

    setMessages([starterMessage]);
    setActiveChatId(null);
    activeChatIdRef.current = null;
  }, [loggedInUser]);

  useEffect(() => {
    if (!loggedInUser) return;
    localStorage.setItem(
      userKey,
      JSON.stringify({
        chats,
        notes,
        tasks,
      })
    );
  }, [chats, notes, tasks, loggedInUser]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  const filteredChats = useMemo(() => {
    return chats
      .filter((chat) => {
        const q = chatSearch.toLowerCase();
        return (
          chat.title.toLowerCase().includes(q) ||
          chat.summary.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [chats, chatSearch]);

  function getAccounts(): Account[] {
    return JSON.parse(localStorage.getItem("niu-accounts") || "[]");
  }

  function saveAccounts(accounts: Account[]) {
    localStorage.setItem("niu-accounts", JSON.stringify(accounts));
  }

  function handleAuth() {
    setAuthError("");

    const username = authUsername.trim().toLowerCase();
    const password = authPassword.trim();

    if (!username || !password) {
      setAuthError("Enter a username and password.");
      return;
    }

    const accounts = getAccounts();

    if (authMode === "signup") {
      if (accounts.some((a) => a.username === username)) {
        setAuthError("That username already exists.");
        return;
      }

      saveAccounts([...accounts, { username, password }]);
      localStorage.setItem("niu-current-user", username);
      setLoggedInUser(username);
      return;
    }

    const found = accounts.find(
      (a) => a.username === username && a.password === password
    );

    if (!found) {
      setAuthError("Wrong username or password.");
      return;
    }

    localStorage.setItem("niu-current-user", username);
    setLoggedInUser(username);
  }

  function logout() {
    localStorage.removeItem("niu-current-user");
    setLoggedInUser("");
    setAuthUsername("");
    setAuthPassword("");
    setMessages([starterMessage]);
    setChats([]);
    setNotes("");
    setTasks([]);
  }

  function saveChats(nextChats: Chat[]) {
    setChats(nextChats);
  }

  function upsertChat(nextMessages: Message[], title?: string, summary?: string) {
    const hasUser = nextMessages.some((m) => m.role === "user");
    if (!hasUser) return;

    const now = new Date().toLocaleString();
    const currentId = activeChatIdRef.current;

    if (currentId) {
      const updated = chats.map((chat) =>
        chat.id === currentId
          ? {
              ...chat,
              title: title || chat.title || fallbackTitle(nextMessages),
              summary: summary || chat.summary || "Saved Niu Education chat.",
              messages: nextMessages,
              updatedAt: now,
            }
          : chat
      );
      saveChats(updated);
    } else {
      const newChat: Chat = {
        id: crypto.randomUUID(),
        title: title || fallbackTitle(nextMessages),
        summary: summary || "Saved Niu Education chat.",
        messages: nextMessages,
        createdAt: now,
        updatedAt: now,
      };

      activeChatIdRef.current = newChat.id;
      setActiveChatId(newChat.id);
      saveChats([newChat, ...chats]);
    }
  }

  function startNewChat() {
    setMessages([starterMessage]);
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setInput("");
    setFiles([]);
    setPreviews([]);
    setSidebarOpen(false);
    setTab("chat");
  }

  function openChat(chat: Chat) {
    setMessages(chat.messages);
    setActiveChatId(chat.id);
    activeChatIdRef.current = chat.id;
    setInput("");
    setFiles([]);
    setPreviews([]);
    setSidebarOpen(false);
    setTab("chat");
  }

  function deleteChat(chatId: string) {
    const updated = chats.filter((chat) => chat.id !== chatId);
    saveChats(updated);
    if (activeChatId === chatId) startNewChat();
  }

  function togglePin(chatId: string) {
    saveChats(
      chats.map((chat) =>
        chat.id === chatId ? { ...chat, pinned: !chat.pinned } : chat
      )
    );
  }

  function renameChat(chatId: string) {
    const chat = chats.find((c) => c.id === chatId);
    const next = prompt("Rename chat:", chat?.title || "");
    if (!next) return;
    saveChats(
      chats.map((chat) => (chat.id === chatId ? { ...chat, title: next } : chat))
    );
  }

  function exportCurrentChat() {
    const text = messages
      .map(
        (m) =>
          `## ${m.role === "user" ? "You" : "Niu Education"}\n\n${m.content}`
      )
      .join("\n\n---\n\n");

    downloadText("niu-education-chat.md", text);
  }

  async function addFiles(selected: FileList | File[] | null) {
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

    for (const file of accepted) {
      if (file.type.startsWith("image/")) {
        const dataUrl = await fileToDataUrl(file);
        setPreviews((prev) => [...prev, dataUrl]);
      }
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function sendMessage(customText?: string, regenerate = false) {
    let text = customText || input;
    let baseMessages = messages;

    if (regenerate) {
      const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf("user");
      if (lastUserIndex === -1) return;
      text = messages[lastUserIndex].content;
      baseMessages = messages.slice(0, lastUserIndex);
    }

    if (!text.trim() && files.length === 0) return;

    setTab("chat");

    const userMessage: Message = {
      role: "user",
      content: text || "Please help me with these files.",
      files: files.map((f) => f.name),
      previews,
    };

    const nextMessages = regenerate
      ? [...baseMessages, userMessage]
      : [...messages, userMessage];

    setMessages(nextMessages);
    upsertChat(nextMessages);

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
        baseMessages.map((m) => ({
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

      const finalMessages: Message[] = [
        ...nextMessages,
        {
          role: "assistant",
          content: data.answer || data.error || "Something went wrong.",
        },
      ];

      setMessages(finalMessages);
      upsertChat(finalMessages, data.chatTitle, data.chatSummary);
    } catch {
      const finalMessages: Message[] = [
        ...nextMessages,
        {
          role: "assistant",
          content:
            "Something broke. Try again with a clearer screenshot or smaller file.",
        },
      ];

      setMessages(finalMessages);
      upsertChat(finalMessages);
    } finally {
      setLoading(false);
    }
  }

  function addTask() {
    if (!taskInput.trim()) return;
    setTasks([{ id: crypto.randomUUID(), text: taskInput, done: false }, ...tasks]);
    setTaskInput("");
  }

  if (!loggedInUser) {
    return (
      <main className="min-h-screen bg-[#050716] text-white">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#22d3ee80,transparent_30%),radial-gradient(circle_at_top_right,#a855f780,transparent_32%),radial-gradient(circle_at_bottom,#f9731680,transparent_35%)]" />

        <section className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-6">
          <div className="grid w-full gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-300 to-purple-400 text-black">
                <GraduationCap size={42} />
              </div>
              <h1 className="text-6xl font-black">Niu Education</h1>
              <p className="mt-4 text-xl text-gray-300">
                Sign in to save your chats, notes, planner tasks, and uploaded photo previews on this device.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-2 text-4xl font-black">
                {authMode === "login" ? "Log in" : "Sign up"}
              </h2>
              <p className="mb-6 text-gray-300">
                {authMode === "login"
                  ? "Welcome back."
                  : "Create your Niu Education account."}
              </p>

              <input
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Username"
                className="mb-3 w-full rounded-2xl border border-white/10 bg-black/30 p-4 outline-none"
              />

              <input
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="mb-3 w-full rounded-2xl border border-white/10 bg-black/30 p-4 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAuth();
                }}
              />

              {authError && (
                <p className="mb-3 rounded-xl bg-red-500/20 p-3 text-red-200">
                  {authError}
                </p>
              )}

              <button
                onClick={handleAuth}
                className="w-full rounded-2xl bg-cyan-300 p-4 font-black text-black hover:bg-cyan-200"
              >
                {authMode === "login" ? "Log in" : "Create account"}
              </button>

              <button
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setAuthError("");
                }}
                className="mt-4 w-full rounded-2xl border border-white/15 p-4 font-bold hover:bg-white/10"
              >
                {authMode === "login"
                  ? "Need an account? Sign up"
                  : "Already have an account? Log in"}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const Sidebar = (
    <aside className="flex h-full w-80 shrink-0 flex-col rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-5">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-300 to-purple-400 text-black shadow-xl">
          <GraduationCap size={34} />
        </div>

        <h1 className="text-4xl font-black leading-tight">Niu Education</h1>
        <p className="mt-2 text-sm text-gray-300">
          Logged in as <b>{loggedInUser}</b>
        </p>
      </div>

      <button
        onClick={startNewChat}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 font-black text-black hover:bg-cyan-200"
      >
        <Plus size={18} /> New chat
      </button>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          ["chat", HomeIcon, "Chat"],
          ["tools", Calculator, "Tools"],
          ["notes", NotebookPen, "Notes"],
          ["planner", CalendarCheck, "Planner"],
        ].map(([id, Icon, label]: any) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-2xl border p-3 text-left font-black ${
              tab === id
                ? "border-cyan-300 bg-cyan-300 text-black"
                : "border-white/10 bg-black/20 hover:bg-white/10"
            }`}
          >
            <Icon size={18} />
            <p className="mt-1 text-sm">{label}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="mb-3 flex items-center gap-2 font-black">
          <History size={18} /> Recent chats
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <Search size={16} />
          <input
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
          />
        </div>

        <div className="max-h-52 space-y-2 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <p className="text-sm text-gray-400">No saved chats yet.</p>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`rounded-xl border p-2 ${
                  activeChatId === chat.id
                    ? "border-cyan-300 bg-cyan-300 text-black"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <button onClick={() => openChat(chat)} className="w-full text-left">
                  <p className="truncate text-sm font-black">
                    {chat.pinned ? "📌 " : ""}
                    {chat.title}
                  </p>
                  <p className="line-clamp-2 text-xs opacity-75">{chat.summary}</p>
                  <p className="mt-1 text-[10px] opacity-60">{chat.updatedAt}</p>
                </button>

                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => togglePin(chat.id)}
                    className="rounded-lg p-1 hover:bg-white/20"
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    onClick={() => renameChat(chat.id)}
                    className="rounded-lg p-1 hover:bg-white/20"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="rounded-lg p-1 hover:bg-red-500 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>
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

      <button
        onClick={logout}
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/15 p-3 font-bold hover:bg-white/10"
      >
        <LogOut size={18} /> Log out
      </button>
    </aside>
  );

  function ChatTab() {
    return (
      <>
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
                        {fileIcon(name)} {name}
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
      </>
    );
  }

  function ToolsTab() {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-2 text-4xl font-black">Study Tools</h2>
        <p className="mb-6 text-gray-300">
          Fast buttons that turn Niu Education into a full school assistant.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "Essay Builder",
              "Help me create an essay outline with intro, body paragraphs, evidence, and conclusion.",
            ],
            [
              "Test Cram",
              "Make me a 20-minute study plan and quiz me on the most important parts.",
            ],
            [
              "Explain Like I’m Lost",
              "Explain my last topic in the easiest possible way with examples.",
            ],
            [
              "Practice Generator",
              "Make 10 practice problems like this and include answers after.",
            ],
            [
              "Mistake Finder",
              "Find common mistakes students make on this topic.",
            ],
            ["Study Schedule", "Make me a study schedule for tonight."],
          ].map(([title, prompt]) => (
            <button
              key={title}
              onClick={() => sendMessage(prompt)}
              className="rounded-3xl border border-white/10 bg-white/10 p-5 text-left hover:bg-white/20"
            >
              <Wand2 className="mb-3 text-cyan-300" />
              <p className="text-xl font-black">{title}</p>
              <p className="mt-2 text-sm text-gray-300">{prompt}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function NotesTab() {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-2 text-4xl font-black">Notes</h2>
        <p className="mb-6 text-gray-300">
          Saved to your account on this browser.
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write study notes here..."
          className="min-h-[500px] w-full rounded-3xl border border-white/10 bg-black/30 p-6 text-white outline-none"
        />
      </div>
    );
  }

  function PlannerTab() {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-2 text-4xl font-black">Homework Planner</h2>
        <p className="mb-6 text-gray-300">
          Saved to your account on this browser.
        </p>

        <div className="mb-5 flex gap-3">
          <input
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="Add homework task..."
            className="flex-1 rounded-2xl bg-black/30 p-4 outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
          />
          <button
            onClick={addTask}
            className="rounded-2xl bg-cyan-300 px-6 font-black text-black"
          >
            Add
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4"
            >
              <input
                type="checkbox"
                checked={task.done}
                onChange={() =>
                  setTasks(
                    tasks.map((t) =>
                      t.id === task.id ? { ...t, done: !t.done } : t
                    )
                  )
                }
              />
              <p className={`flex-1 ${task.done ? "line-through text-gray-500" : ""}`}>
                {task.text}
              </p>
              <button onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050716] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#22d3ee80,transparent_30%),radial-gradient(circle_at_top_right,#a855f780,transparent_32%),radial-gradient(circle_at_bottom,#f9731680,transparent_35%)]" />

      <section className="mx-auto flex h-screen w-full max-w-7xl gap-5 p-4">
        <div className="hidden lg:block">{Sidebar}</div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 p-4 lg:hidden">
            <button
              onClick={() => setSidebarOpen(false)}
              className="mb-3 rounded-xl bg-white px-3 py-2 font-black text-black"
            >
              Close
            </button>
            {Sidebar}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col rounded-[2rem] border border-white/15 bg-black/25 shadow-2xl backdrop-blur-xl">
          <header className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-cyan-200">
                  <Sparkles size={16} /> Niu Education
                </p>
                <h2 className="text-2xl font-black md:text-4xl">
                  {tab === "chat" && "Homework Tutor Chat"}
                  {tab === "tools" && "Study Tools"}
                  {tab === "notes" && "Notes"}
                  {tab === "planner" && "Planner"}
                </h2>
                <p className="text-sm text-gray-400">
                  Mode: {mode.toUpperCase()} • Subject: {subject}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20 lg:hidden"
                >
                  <Menu />
                </button>
                <button
                  onClick={() => sendMessage(undefined, true)}
                  className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20"
                >
                  <RotateCcw />
                </button>
                <button
                  onClick={exportCurrentChat}
                  className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20"
                >
                  <Download />
                </button>
                <button
                  onClick={startNewChat}
                  className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20"
                >
                  <Plus />
                </button>
              </div>
            </div>
          </header>

          {tab === "chat" && <ChatTab />}
          {tab === "tools" && <ToolsTab />}
          {tab === "notes" && <NotesTab />}
          {tab === "planner" && <PlannerTab />}

          {tab === "chat" && files.length > 0 && (
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

          {tab === "chat" && (
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
                    <Paperclip size={18} /> Attach
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hidden items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 font-bold hover:bg-white/10 md:flex"
                  >
                    <ImagePlus size={18} /> Upload
                  </button>

                  <button
                    onClick={() => setInput((v) => v + " Explain this easier.")}
                    className="hidden items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 font-bold hover:bg-white/10 md:flex"
                  >
                    <Wand2 size={18} /> Improve
                  </button>

                  <button
                    onClick={() => sendMessage()}
                    disabled={loading}
                    className="ml-auto flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 px-6 py-3 font-black text-black hover:opacity-90 disabled:opacity-60"
                  >
                    Send <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}