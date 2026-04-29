import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function cleanXmlText(xml: string) {
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function extractOfficeText(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const parts: string[] = [];

  for (const path of Object.keys(zip.files)) {
    const isDocx = path.startsWith("word/") && path.endsWith(".xml");
    const isPptx = path.startsWith("ppt/slides/") && path.endsWith(".xml");

    if (isDocx || isPptx) {
      const text = cleanXmlText(await zip.files[path].async("text"));
      if (text) parts.push(text);
    }
  }

  return parts.join("\n\n").slice(0, 35000);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY." },
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
    } catch {}

    const content: any[] = [
      {
        type: "input_text",
        text: `
App: Niu Education
Mode: ${mode}
Subject: ${subject}
Grade: ${grade}

Conversation:
${history.slice(-16).map((m) => `${m.role}: ${m.content}`).join("\n\n")}

New message:
${message || "The student uploaded files and wants help."}
        `,
      },
    ];

    let documentText = "";

    for (const file of files) {
      if (file.size > 12 * 1024 * 1024) {
        return NextResponse.json(
          { error: `${file.name} is too large. Max 12MB.` },
          { status: 400 }
        );
      }

      if (file.type.startsWith("image/")) {
        const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
        content.push({
          type: "input_image",
          image_url: `data:${file.type};base64,${base64}`,
          detail: "high",
        });
      } else if (file.name.endsWith(".docx") || file.name.endsWith(".pptx")) {
        documentText += `\n\n--- ${file.name} ---\n${await extractOfficeText(file)}`;
      } else if (
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md") ||
        file.type.startsWith("text/")
      ) {
        documentText += `\n\n--- ${file.name} ---\n${(await file.text()).slice(0, 35000)}`;
      }
    }

    if (documentText) {
      content.push({
        type: "input_text",
        text: `Uploaded document text:\n${documentText}`,
      });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are Niu Education, a premium teen-friendly AI school hub.

You help students with:
- homework
- screenshots
- Word docs
- PowerPoints
- study guides
- quizzes
- notes
- practice problems

Rules:
- Teach step by step.
- Make it easy for teens.
- Do not just dump answers.
- Use headings and clean formatting.
- If files are uploaded, analyze them.
- If PowerPoint, summarize by slide/topic.
- If Word doc, summarize and answer from it.

Math:
- Use dollar-sign LaTeX only.
- Inline math: $...$
- Big equations: $$...$$
- Use \\frac{}{} and \\sqrt{}.
- Never leave raw LaTeX outside dollar signs.

VERY IMPORTANT:
At the end, include metadata exactly like this:
NIU_METADATA_START
{"title":"specific title of what the student is working on","summary":"short summary of the entire conversation and what the student needed help with"}
NIU_METADATA_END

The title must NOT be generic like "Homework Chat".
Make it specific, like:
"Solving Quadratics by Completing the Square"
"Biology Cell Notes Study Guide"
"Romeo and Juliet Paragraph Help"
          `,
        },
        { role: "user", content },
      ],
      max_output_tokens: 3200,
    });

    const full = response.output_text || "";

    const match = full.match(/NIU_METADATA_START\s*([\s\S]*?)\s*NIU_METADATA_END/);

    let answer = full.replace(/NIU_METADATA_START[\s\S]*?NIU_METADATA_END/g, "").trim();

    let chatTitle = "Niu Education Chat";
    let chatSummary = "Saved tutoring chat.";

    if (match?.[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        chatTitle = parsed.title || chatTitle;
        chatSummary = parsed.summary || chatSummary;
      } catch {}
    }

    return NextResponse.json({ answer, chatTitle, chatSummary });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}