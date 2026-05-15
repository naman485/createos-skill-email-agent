const { parseMessage } = require('../src/parser');

describe('parseMessage', () => {
  test('parses valid message with all three fields', () => {
    const result = parseMessage('john@acme.com | John Doe | signed up from Product Hunt');
    expect(result).toEqual({
      email: 'john@acme.com',
      name: 'John Doe',
      note: 'signed up from Product Hunt',
      domain: 'acme.com',
    });
  });

  test('trims whitespace from all fields', () => {
    const result = parseMessage('  jane@stripe.com  |  Jane Smith  |  asked about pricing  ');
    expect(result).toEqual({
      email: 'jane@stripe.com',
      name: 'Jane Smith',
      note: 'asked about pricing',
      domain: 'stripe.com',
    });
  });

  test('returns null for message missing the note field', () => {
    const result = parseMessage('john@acme.com | John Doe');
    expect(result).toBeNull();
  });

  test('returns null for invalid email', () => {
    const result = parseMessage('not-an-email | John Doe | some note');
    expect(result).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseMessage('')).toBeNull();
  });

  test('extracts domain from email', () => {
    const result = parseMessage('a@openai.com | Alice | building agents');
    expect(result.domain).toBe('openai.com');
  });
});
