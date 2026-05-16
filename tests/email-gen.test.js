const { generateEmail } = require('../src/email-gen');

const mockCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: JSON.stringify({
    subject: 'Quick question about your CreateOS setup',
    body: 'Hey John,\n\nSaw you signed up from Product Hunt. That week was something.\n\nWe hit $100K in revenue in week 1 of 2025. Not from a launch. From people who needed production infrastructure for AI workloads.\n\nWhat were you trying to ship?\n\nNaman',
  }) } }],
});

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

describe('generateEmail', () => {
  const recipient = {
    email: 'john@acme.com',
    name: 'John',
    note: 'signed up from Product Hunt',
    domain: 'acme.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        subject: 'Quick question about your CreateOS setup',
        body: 'Hey John,\n\nSaw you signed up from Product Hunt.\n\nWhat were you trying to ship?\n\nNaman',
      }) } }],
    });
  });

  test('returns subject and body strings', async () => {
    const result = await generateEmail(recipient);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('body');
    expect(typeof result.subject).toBe('string');
    expect(typeof result.body).toBe('string');
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.body.length).toBeGreaterThan(0);
  });

  test('throws if model returns malformed JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'not json at all' } }],
    });
    await expect(generateEmail(recipient)).rejects.toThrow('Failed to parse email from Claude');
  });

  test('throws if model returns JSON missing subject', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ body: 'some body' }) } }],
    });
    await expect(generateEmail(recipient)).rejects.toThrow('Failed to parse email from Claude');
  });
});
