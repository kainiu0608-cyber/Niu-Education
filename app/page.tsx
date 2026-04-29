"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Paperclip, X, Sparkles, Copy, ImagePlus, Brain, BookOpen,
  CheckCircle, Lightbulb, Zap, GraduationCap, MessageSquare, Target,
  Wand2, FileText, Presentation, Image as ImageIcon, Plus, History,
  Pin, Search, Download, RotateCcw, Menu, Gamepad2, NotebookPen,
  CalendarCheck, Timer, Trophy, Flame, ExternalLink, Home, Dumbbell,
  Calculator, Music, Star, Pencil, Trash2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Tab = "chat" | "games" | "tools" | "notes" | "planner" | "links";
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

const starterMessage: Message = {
  role: "assistant",
  content:
    "Welcome to **Niu Education** ✨ I’m your AI school hub. Upload homework, screenshots, Word docs, PowerPoints, or ask anything.",
};

const modes = [
  { id: "teach", name: "Teach", icon: Brain, desc: "Step-by-step" },
  { id: "hints", name: "Hints", icon: Lightbulb, desc: "No answer first" },
  { id: "check", name: "Check", icon: CheckCircle, desc: "Fix mistakes" },
  { id: "study", name: "Study", icon: BookOpen, desc: "Study guide" },
  { id: "quiz", name: "Quiz", icon: Target, desc: "Test me" },
  { id: "quick", name: "Quick", icon: Zap, desc: "Fast help" },
  { id: "explain", name: "Explain", icon: MessageSquare, desc: "Make simple" },
] as const;

const subjects = [
  "Auto-detect", "Math", "Algebra", "Geometry", "Biology",
  "Chemistry", "Science", "English", "History"
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
  if (fileName.endsWith(".docx") || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
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

function makeFallbackTitle(messages: Message[]) {
  const combined = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ")
    .trim();

  if (!combined) return "New Study Chat";

  const cleaned = combined
    .replace(/please|help|with|this|image|homework|question/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 45 ? cleaned.slice(0, 45) + "..." : cleaned || "Study Help Chat";
}

export default function Home() {
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

  const [mathA, setMathA] = useState(7);
  const [mathB, setMathB] = useState(8);
  const [mathAnswer, setMathAnswer] = useState("");
  const [mathScore, setMathScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const [flashFront, setFlashFront] = useState("Quadratic formula");
  const [flashBack, setFlashBack] = useState("$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$");
  const [flipped, setFlipped] = useState(false);

  const [scrambleWord, setScrambleWord] = useState("ALGEBRA");
  const [scrambleGuess, setScrambleGuess] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const savedChats = localStorage.getItem("niu-education-chats-v3");
    const savedNotes = localStorage.getItem("niu-education-notes");
    const savedTasks = localStorage.getItem("niu-education-tasks");

    if (savedChats) setChats(JSON.parse(savedChats));
    if (savedNotes) setNotes(savedNotes);
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  useEffect(() => {
    localStorage.setItem("niu-education-notes", notes);
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("niu-education-tasks", JSON.stringify(tasks));
  }, [tasks]);

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
        return chat.title.toLowerCase().includes(q) || chat.summary.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [chats, chatSearch]);

  function saveChats(nextChats: Chat[]) {
    setChats(nextChats);
    localStorage.setItem("niu-education-chats-v3", JSON.stringify(nextChats));
  }

  function upsertChat(nextMessages: Message[], title?: string, summary?: string) {
    const hasUserMessage = nextMessages.some((m) => m.role === "user");
    if (!hasUserMessage) return;

    const now = new Date().toLocaleString();
    const currentId = activeChatIdRef.current;

    if (currentId) {
      const updated = chats.map((chat) =>
        chat.id === currentId
          ? {
              ...chat,
              title: title || chat.title || makeFallbackTitle(nextMessages),
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
        title: title || makeFallbackTitle(nextMessages),
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
    saveChats(chats.map((chat) => chat.id === chatId ? { ...chat, pinned: !chat.pinned } : chat));
  }

  function renameChat(chatId: string) {
    const chat = chats.find((c) => c.id === chatId);
    const next = prompt("Rename chat:", chat?.title || "");
    if (!next) return;
    saveChats(chats.map((chat) => chat.id === chatId ? { ...chat, title: next } : chat));
  }

  function exportCurrentChat() {
    const text = messages.map((m) => `## ${m.role === "user" ? "You" : "Niu Education"}\n\n${m.content}`).join("\n\n---\n\n");
    downloadText("niu-education-chat.md", text);
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

    const imagePreviews = files.filter((f) => f.type.startsWith("image/")).map((_, i) => previews[i]).filter(Boolean);

    const userMessage: Message = {
      role: "user",
      content: text || "Please help me with these files.",
      files: files.map((f) => f.name),
      previews: imagePreviews,
    };

    const nextMessages = regenerate ? [...baseMessages, userMessage] : [...messages, userMessage];

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
    formData.append("history", JSON.stringify(baseMessages.map((m) => ({ role: m.role, content: m.content }))));

    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/tutor", { method: "POST", body: formData });
      const data = await res.json();

      const finalMessages = [
        ...nextMessages,
        { role: "assistant" as const, content: data.answer || data.error || "Something went wrong." },
      ];

      setMessages(finalMessages);
      upsertChat(finalMessages, data.chatTitle, data.chatSummary);
    } catch {
      const finalMessages = [
        ...nextMessages,
        { role: "assistant" as const, content: "Something broke. Try again with a clearer screenshot or smaller file." },
      ];

      setMessages(finalMessages);
      upsertChat(finalMessages);
    } finally {
      setLoading(false);
    }
  }

  function checkMathGame() {
    if (Number(mathAnswer) === mathA * mathB) {
      setMathScore((s) => s + 10);
      setStreak((s) => s + 1);
      setMathA(Math.floor(Math.random() * 12) + 2);
      setMathB(Math.floor(Math.random() * 12) + 2);
      setMathAnswer("");
    } else {
      setStreak(0);
      setMathAnswer("");
    }
  }

  function addTask() {
    if (!taskInput.trim()) return;
    setTasks([{ id: crypto.randomUUID(), text: taskInput, done: false }, ...tasks]);
    setTaskInput("");
  }

  const Sidebar = (
    <aside className="flex h-full w-80 shrink-0 flex-col rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-5">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-300 to-purple-400 text-black shadow-xl">
          <GraduationCap size={34} />
        </div>

        <h1 className="text-4xl font-black leading-tight">Niu Education</h1>
        <p className="mt-2 text-sm text-gray-300">
          AI homework, study tools, games, notes, planner, docs, and slides.
        </p>
      </div>

      <button onClick={startNewChat} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 font-black text-black hover:bg-cyan-200">
        <Plus size={18} /> New chat
      </button>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          ["chat", Home, "Chat"],
          ["games", Gamepad2, "Games"],
          ["tools", Calculator, "Tools"],
          ["notes", NotebookPen, "Notes"],
          ["planner", CalendarCheck, "Planner"],
          ["links", ExternalLink, "Hub"],
        ].map(([id, Icon, label]: any) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-2xl border p-3 text-left font-black ${
              tab === id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/10 bg-black/20 hover:bg-white/10"
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
                  activeChatId === chat.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/10 bg-white/5"
                }`}
              >
                <button onClick={() => openChat(chat)} className="w-full text-left">
                  <p className="truncate text-sm font-black">{chat.pinned ? "📌 " : ""}{chat.title}</p>
                  <p className="line-clamp-2 text-xs opacity-75">{chat.summary}</p>
                  <p className="mt-1 text-[10px] opacity-60">{chat.updatedAt}</p>
                </button>

                <div className="mt-2 flex gap-1">
                  <button onClick={() => togglePin(chat.id)} className="rounded-lg p-1 hover:bg-white/20"><Pin size={13} /></button>
                  <button onClick={() => renameChat(chat.id)} className="rounded-lg p-1 hover:bg-white/20"><Pencil size={13} /></button>
                  <button onClick={() => deleteChat(chat.id)} className="rounded-lg p-1 hover:bg-red-500 hover:text-white"><X size={13} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <label className="mb-2 text-xs font-bold text-gray-400">Subject</label>
      <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mb-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none">
        {subjects.map((s) => <option key={s}>{s}</option>)}
      </select>

      <label className="mb-2 text-xs font-bold text-gray-400">Level</label>
      <select value={grade} onChange={(e) => setGrade(e.target.value)} className="mb-5 rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none">
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
            <button key={item.id} onClick={() => setMode(item.id)} className={`w-full rounded-2xl border p-3 text-left transition ${
              mode === item.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/10 bg-black/20 hover:bg-white/10"
            }`}>
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
    </aside>
  );

  function ChatTab() {
    return (
      <>
        <div className="border-b border-white/10 p-4">
          <div className="flex gap-2 overflow-x-auto">
            {starters.map((starter) => (
              <button key={starter} onClick={() => sendMessage(starter)} className="shrink-0 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
                {starter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-[1.7rem] p-5 leading-7 shadow-xl md:max-w-[78%] ${
                message.role === "user" ? "bg-gradient-to-br from-cyan-300 to-blue-400 text-black" : "border border-white/10 bg-[#171b2b] text-gray-100"
              }`}>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="font-black">{message.role === "user" ? "You" : "🎓 Niu Education"}</p>
                  {message.role === "assistant" && (
                    <button onClick={() => navigator.clipboard.writeText(message.content)} className="rounded-xl border border-white/10 p-2 text-gray-300 hover:bg-white/10">
                      <Copy size={16} />
                    </button>
                  )}
                </div>

                {message.files && message.files.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {message.files.map((name) => (
                      <div key={name} className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm">
                        {fileIcon(name)} {name}
                      </div>
                    ))}
                  </div>
                )}

                {message.previews && message.previews.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    {message.previews.map((src, i) => (
                      <img key={i} src={src} alt="uploaded homework" className="max-h-64 rounded-2xl border border-white/20 object-cover" />
                    ))}
                  </div>
                )}

                {message.role === "assistant" ? (
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
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

  function GamesTab() {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-2 text-4xl font-black">Game Zone</h2>
        <p className="mb-6 text-gray-300">Study games so the app feels fun, not boring.</p>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <div className="mb-3 flex items-center gap-3">
              <Flame className="text-orange-300" />
              <h3 className="text-2xl font-black">Math Rush</h3>
            </div>
            <p className="mb-4 text-gray-300">Score: {mathScore} • Streak: {streak}</p>
            <div className="mb-4 rounded-2xl bg-black/30 p-6 text-center text-5xl font-black">
              {mathA} × {mathB}
            </div>
            <input
              value={mathAnswer}
              onChange={(e) => setMathAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkMathGame()}
              placeholder="Answer"
              className="mb-3 w-full rounded-2xl bg-black/30 p-4 outline-none"
            />
            <button onClick={checkMathGame} className="w-full rounded-2xl bg-cyan-300 p-4 font-black text-black">
              Check
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <div className="mb-3 flex items-center gap-3">
              <Star className="text-yellow-300" />
              <h3 className="text-2xl font-black">Flashcard Flip</h3>
            </div>
            <input value={flashFront} onChange={(e) => setFlashFront(e.target.value)} className="mb-3 w-full rounded-2xl bg-black/30 p-3 outline-none" />
            <input value={flashBack} onChange={(e) => setFlashBack(e.target.value)} className="mb-3 w-full rounded-2xl bg-black/30 p-3 outline-none" />
            <button onClick={() => setFlipped(!flipped)} className="min-h-40 w-full rounded-3xl bg-gradient-to-br from-purple-400 to-cyan-300 p-6 text-2xl font-black text-black">
              {flipped ? (
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {flashBack}
                </ReactMarkdown>
              ) : flashFront}
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <div className="mb-3 flex items-center gap-3">
              <Gamepad2 className="text-cyan-300" />
              <h3 className="text-2xl font-black">Word Scramble</h3>
            </div>
            <p className="mb-4 text-gray-300">Unscramble: <b>{scrambleWord.split("").sort(() => Math.random() - 0.5).join("")}</b></p>
            <input value={scrambleGuess} onChange={(e) => setScrambleGuess(e.target.value)} className="mb-3 w-full rounded-2xl bg-black/30 p-4 outline-none" />
            <button
              onClick={() => {
                if (scrambleGuess.toUpperCase() === scrambleWord) {
                  alert("Correct 🔥");
                  setScrambleWord(["ALGEBRA", "BIOLOGY", "HISTORY", "SCIENCE", "GEOMETRY"][Math.floor(Math.random() * 5)]);
                  setScrambleGuess("");
                } else alert("Try again");
              }}
              className="w-full rounded-2xl bg-purple-300 p-4 font-black text-black"
            >
              Check Word
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <div className="mb-3 flex items-center gap-3">
              <Trophy className="text-yellow-300" />
              <h3 className="text-2xl font-black">XP Board</h3>
            </div>
            <p className="text-5xl font-black text-cyan-200">{mathScore + streak * 5} XP</p>
            <p className="mt-3 text-gray-300">Keep playing games and studying to build your score.</p>
          </div>
        </div>
      </div>
    );
  }

  function ToolsTab() {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-2 text-4xl font-black">Study Tools</h2>
        <p className="mb-6 text-gray-300">Quick buttons that send powerful prompts to the tutor.</p>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Essay Builder", "Help me create an essay outline with intro, body paragraphs, evidence, and conclusion."],
            ["Test Cram", "Make me a 20-minute study plan and quiz me on the most important parts."],
            ["Explain Like 5", "Explain my last topic in the easiest possible way with examples."],
            ["Practice Generator", "Make 10 practice problems like this and include answers after."],
            ["Mistake Finder", "Find common mistakes students make on this topic."],
            ["Study Schedule", "Make me a study schedule for tonight."],
          ].map(([title, prompt]) => (
            <button key={title} onClick={() => sendMessage(prompt)} className="rounded-3xl border border-white/10 bg-white/10 p-5 text-left hover:bg-white/20">
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
        <p className="mb-6 text-gray-300">Your private saved notes on this device.</p>
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
        <p className="mb-6 text-gray-300">Track homework tasks and study goals.</p>

        <div className="mb-5 flex gap-3">
          <input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="Add homework task..." className="flex-1 rounded-2xl bg-black/30 p-4 outline-none" />
          <button onClick={addTask} className="rounded-2xl bg-cyan-300 px-6 font-black text-black">Add</button>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4">
              <input type="checkbox" checked={task.done} onChange={() => setTasks(tasks.map((t) => t.id === task.id ? { ...t, done: !t.done } : t))} />
              <p className={`flex-1 ${task.done ? "line-through text-gray-500" : ""}`}>{task.text}</p>
              <button onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function LinksTab() {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-2 text-4xl font-black">Niu Hub</h2>
        <p className="mb-6 text-gray-300">Links to other future Niu Education mini-sites.</p>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Niu Flashcards", "/flashcards", BookOpen],
            ["Niu Games", "/games", Gamepad2],
            ["Niu Planner", "/planner", CalendarCheck],
            ["Niu Essay Lab", "/essay", Pencil],
            ["Niu Music Study", "/music", Music],
            ["Niu Fitness Break", "/fitness", Dumbbell],
          ].map(([title, href, Icon]: any) => (
            <a key={title} href={href} className="rounded-3xl border border-white/10 bg-white/10 p-6 hover:bg-white/20">
              <Icon className="mb-4 text-cyan-300" size={30} />
              <p className="text-2xl font-black">{title}</p>
              <p className="mt-2 text-gray-300">Coming soon page / future expansion.</p>
              <ExternalLink className="mt-4" />
            </a>
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
            <button onClick={() => setSidebarOpen(false)} className="mb-3 rounded-xl bg-white px-3 py-2 font-black text-black">Close</button>
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
                  {tab === "games" && "Game Zone"}
                  {tab === "tools" && "Study Tools"}
                  {tab === "notes" && "Notes"}
                  {tab === "planner" && "Planner"}
                  {tab === "links" && "Niu Hub"}
                </h2>
                <p className="text-sm text-gray-400">Mode: {mode.toUpperCase()} • Subject: {subject}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setSidebarOpen(true)} className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20 lg:hidden"><Menu /></button>
                <button onClick={() => sendMessage(undefined, true)} className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20"><RotateCcw /></button>
                <button onClick={exportCurrentChat} className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20"><Download /></button>
                <button onClick={startNewChat} className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/20"><Plus /></button>
              </div>
            </div>
          </header>

          {tab === "chat" && <ChatTab />}
          {tab === "games" && <GamesTab />}
          {tab === "tools" && <ToolsTab />}
          {tab === "notes" && <NotesTab />}
          {tab === "planner" && <PlannerTab />}
          {tab === "links" && <LinksTab />}

          {tab === "chat" && files.length > 0 && (
            <div className="border-t border-white/10 p-4">
              <div className="flex flex-wrap gap-3">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    {file.type.startsWith("image/") ? <ImageIcon size={18} /> : fileIcon(file.name)}
                    <span className="max-w-48 truncate text-sm font-bold">{file.name}</span>
                    <button onClick={() => removeFile(index)} className="rounded-full bg-red-500 p-1"><X size={14} /></button>
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

              <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }} className="rounded-[1.5rem] border border-white/15 bg-black/30 p-3">
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
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 font-bold hover:bg-white/10">
                    <Paperclip size={18} /> Attach
                  </button>

                  <button onClick={() => fileInputRef.current?.click()} className="hidden items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 font-bold hover:bg-white/10 md:flex">
                    <ImagePlus size={18} /> Upload
                  </button>

                  <button onClick={() => setInput((v) => v + " Explain this easier.")} className="hidden items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 font-bold hover:bg-white/10 md:flex">
                    <Wand2 size={18} /> Improve
                  </button>

                  <button onClick={() => sendMessage()} disabled={loading} className="ml-auto flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 px-6 py-3 font-black text-black hover:opacity-90 disabled:opacity-60">
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