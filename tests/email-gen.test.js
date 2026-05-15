const { generateEmail } = require('../src/email-gen');

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            subject: 'Quick question about your CreateOS setup',
            body: 'Hey John,\n\nSaw you signed up from Product Hunt. That week was something.\n\nWe hit $100K in revenue in week 1 of 2025. Not from a launch. From people who needed production infrastructure for AI workloads and couldn\'t stitch together three services to get it.\n\nCurious — what made you sign up? And what were you trying to ship?\n\nNaman'
          })
        }]
      })
    }
  }));
});

describe('generateEmail', () => {
  const recipient = {
    email: 'john@acme.com',
    name: 'John',
    note: 'signed up from Product Hunt',
    domain: 'acme.com',
  };

  test('returns subject and body strings', async () => {
    const result = await generateEmail(recipient);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('body');
    expect(typeof result.subject).toBe('string');
    expect(typeof result.body).toBe('string');
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.body.length).toBeGreaterThan(0);
  });

  test('throws if Claude returns malformed JSON', async () => {
    const Anthropic = require('@anthropic-ai/sdk');
    Anthropic.mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'not json at all' }]
        })
      }
    }));

    await expect(generateEmail(recipient)).rejects.toThrow('Failed to parse email from Claude');
  });

  test('throws if Claude returns JSON missing subject', async () => {
    const Anthropic = require('@anthropic-ai/sdk');
    Anthropic.mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify({ body: 'some body' }) }]
        })
      }
    }));

    await expect(generateEmail(recipient)).rejects.toThrow('Failed to parse email from Claude');
  });
});
