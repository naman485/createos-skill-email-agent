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
- Do not include any links or CTAs

Respond with valid JSON only, no markdown wrapper:
{"subject": "...", "body": "..."}`;

async function generateEmail({ email, name, note, domain }) {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  const userMessage = `Recipient details:
- Email: ${email}
- Name: ${name}
- Note: ${note}
- Email domain: ${domain}

Write the personalized outreach email now.`;

  const response = await client.chat.completions.create({
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });

  const raw = response.choices[0].message.content.trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse email from Claude');
  }

  if (!parsed.subject || !parsed.body) {
    throw new Error('Failed to parse email from Claude');
  }

  return { subject: parsed.subject, body: parsed.body };
}

module.exports = { generateEmail };
