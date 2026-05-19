const OpenAI = require('openai');
const { BRAND_CONTEXT } = require('./brand-context');

const SYSTEM_PROMPT = `${BRAND_CONTEXT}

---

## Your task

You are writing a personal founder outreach email on behalf of Naman Kabra (naman@nodeops.xyz), founder of CreateOS.

Rules:
- 150-250 words total
- Personal founder tone — this is not marketing copy, it is a genuine 1:1 email
- Use the recipient's name in the greeting
- Use the note and email domain to personalize: reference what they signed up for, what their company does, what angle is most relevant to them
- Apply all voice rules above: short sentences, no hype words, no em-dashes, numbers where relevant
- End with exactly ONE specific question to gather product feedback — make it easy to answer
- Do not include a signature block — Naman will sign manually
- Only include links if the note explicitly asks for them. When including links, use ONLY the Canonical URLs listed above — never invent or guess URLs. If the note asks for a link not in the canonical list, omit it.

Respond with valid JSON only, no markdown wrapper:
{"subject": "...", "body": "..."}`;

function buildClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });
}

function extractJson(raw) {
  let jsonText = raw;
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  } else {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonText = raw.slice(firstBrace, lastBrace + 1);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error('[email-gen] raw response that failed to parse:', raw.slice(0, 500));
    throw new Error('Failed to parse email from Claude');
  }

  if (!parsed.subject || !parsed.body) {
    console.error('[email-gen] parsed but missing fields:', JSON.stringify(parsed).slice(0, 500));
    throw new Error('Failed to parse email from Claude');
  }

  return { subject: parsed.subject, body: parsed.body };
}

async function callModel(messages) {
  const response = await buildClient().chat.completions.create({
    model: 'anthropic/claude-sonnet-4-6',
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages,
  });
  return response.choices[0].message.content.trim();
}

async function generateEmail({ email, name, note, domain }) {
  const userMessage = `Recipient details:
- Email: ${email}
- Name: ${name}
- Note: ${note}
- Email domain: ${domain}

Write the personalized outreach email now.`;

  const raw = await callModel([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);
  return extractJson(raw);
}

async function reviseEmail({ email, name, note, domain, currentSubject, currentBody, feedback }) {
  const userMessage = `Recipient details:
- Email: ${email}
- Name: ${name}
- Note: ${note}
- Email domain: ${domain}

Current draft:
Subject: ${currentSubject}

${currentBody}

Operator feedback to apply:
${feedback}

Revise the draft per the feedback. Keep everything that works. Only change what the feedback asks for, plus anything that becomes inconsistent because of those changes. Return the full revised email as JSON.`;

  const raw = await callModel([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);
  return extractJson(raw);
}

module.exports = { generateEmail, reviseEmail };
