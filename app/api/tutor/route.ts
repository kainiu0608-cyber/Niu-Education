import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function cleanXmlText(xml: string) {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractOfficeText(file: File) {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const parts: string[] = [];

  for (const path of Object.keys(zip.files)) {
    const isDocxText =
      path.startsWith("word/") && path.endsWith(".xml");

    const isPptxText =
      path.startsWith("ppt/slides/") && path.endsWith(".xml");

    if (isDocxText || isPptxText) {
      const xml = await zip.files[path].async("text");
      const text = cleanXmlText(xml);
      if (text) parts.push(text);
    }
  }

  return parts.join("\n\n").slice(0, 25000);
}

async function extractTextFile(file: File) {
  return (await file.text()).slice(0, 25000);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local or Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const message = String(formData.get("message") || "");
    const mode = String(formData.get("mode") || "teach");
    const subject = String(formData.get("subject") || "Auto-detect");
    const grade = String(formData.get("grade") || "middle/high school");
    const historyRaw = String(formData.get("history") || "[]");
    const files = formData.getAll("files") as File[];

    let history: ChatMessage[] = [];
    try {
      history = JSON.parse(historyRaw);
    } catch {
      history = [];
    }

    let extractedFilesText = "";

    const content: any[] = [
      {
        type: "input_text",
        text: `
App: Niu Education
Mode: ${mode}
Subject: ${subject}
Grade level: ${grade}

Recent conversation:
${history
  .slice(-10)
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join("\n\n")}

Student message:
${message || "The student uploaded homework and wants help."}
        `,
      },
    ];

    for (const file of files) {
      if (file.size > 12 * 1024 * 1024) {
        return NextResponse.json(
          { error: `${file.name} is too large. Keep files under 12MB.` },
          { status: 400 }
        );
      }

      if (file.type.startsWith("image/")) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUrl = `data:${file.type};base64,${base64}`;

        content.push({
          type: "input_image",
          image_url: dataUrl,
          detail: "high",
        });
      } else if (
        file.name.endsWith(".docx") ||
        file.name.endsWith(".pptx")
      ) {
        const text = await extractOfficeText(file);
        extractedFilesText += `\n\n--- FILE: ${file.name} ---\n${text}`;
      } else if (
        file.type.startsWith("text/") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md")
      ) {
        const text = await extractTextFile(file);
        extractedFilesText += `\n\n--- FILE: ${file.name} ---\n${text}`;
      } else {
        extractedFilesText += `\n\n--- FILE: ${file.name} ---\nThis file type was uploaded but text could not be extracted yet. Ask the student for a screenshot or text copy if needed.`;
      }
    }

    if (extractedFilesText) {
      content.push({
        type: "input_text",
        text: `
Uploaded document text:
${extractedFilesText}
        `,
      });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are Niu Education, a premium AI tutor.

You are better than a basic homework solver because you:
- teach step by step
- explain mistakes
- create practice problems
- make study guides
- quiz the student
- summarize uploaded documents
- explain PowerPoints and Word docs
- keep the answer clean and readable

Modes:
teach = full step-by-step explanation
hints = hints first, do not immediately give final answer
check = check the student's work and fix mistakes
study = study guide with key ideas, examples, practice
quiz = quiz the student and wait for answers
quick = short but still clear
explain = explain like they are confused

Style:
- Sound like a helpful human tutor.
- Explain like the student is around the selected grade level.
- Use clean headings.
- Do not dump a giant wall of text.
- If a document is uploaded, summarize it and help answer questions from it.
- If a slide deck is uploaded, organize by slide/topic if possible.
- If something is unclear, say exactly what is unclear.

Math formatting:
- VERY IMPORTANT: use dollar-sign LaTeX only.
- Inline math must use $...$.
- Big equations must use $$...$$.
- Do NOT use \$begin:math:text$ \.\.\. \\$end:math:text$.
- Do NOT use \$begin:math:display$ \.\.\. \\$end:math:display$.
- Use \\frac{}{} for stacked fractions.
- Use \\sqrt{} for square roots.
- Use x^2 for exponents.
- Never show raw ugly math like \\frac{-b \\pm... unless it is inside $...$ or $$...$$.

End with one helpful follow-up like:
"Want me to quiz you on this?" or "Want me to check your answer?"
          `,
        },
        {
          role: "user",
          content,
        },
      ],
      max_output_tokens: 2600,
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong. Try again with a clearer screenshot or smaller file.",
      },
      { status: 500 }
    );
  }
}