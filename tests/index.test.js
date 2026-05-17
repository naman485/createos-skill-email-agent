const request = require('supertest');

jest.mock('../src/email-gen', () => ({
  generateEmail: jest.fn().mockResolvedValue({
    subject: 'Quick question about your setup',
    body: 'Hey John,\n\nSaw you signed up. What were you trying to ship?\n\nNaman',
  }),
}));

jest.mock('../src/gmail', () => ({
  sendEmail: jest.fn().mockResolvedValue('msg_123'),
}));

const mockSendMessage = jest.fn().mockResolvedValue({});
jest.mock('node-telegram-bot-api', () => {
  return jest.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
    on: jest.fn(),
  }));
});

const { app, handleMessage } = require('../src/index');

describe('handleMessage', () => {
  const CHAT_ID = '123456789';

  const msg = (text, chatId = CHAT_ID) => ({ chat: { id: chatId }, text });

  beforeEach(() => {
    process.env.TELEGRAM_CHAT_ID = CHAT_ID;
    jest.clearAllMocks();
    require('../src/email-gen').generateEmail.mockResolvedValue({
      subject: 'Quick question about your setup',
      body: 'Hey John,\n\nSaw you signed up. What were you trying to ship?\n\nNaman',
    });
    require('../src/gmail').sendEmail.mockResolvedValue('msg_123');
  });

  test('processes valid message and sends email', async () => {
    const { generateEmail } = require('../src/email-gen');
    const { sendEmail } = require('../src/gmail');

    await handleMessage(msg('john@acme.com | John Doe | signed up from Product Hunt'));

    expect(generateEmail).toHaveBeenCalledWith({
      email: 'john@acme.com',
      name: 'John Doe',
      note: 'signed up from Product Hunt',
      domain: 'acme.com',
    });
    expect(sendEmail).toHaveBeenCalledWith(
      'john@acme.com',
      'Quick question about your setup',
      'Hey John,\n\nSaw you signed up. What were you trying to ship?\n\nNaman'
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringContaining('Email sent to John Doe')
    );
  });

  test('replies with format hint for malformed message', async () => {
    await handleMessage(msg('not a valid format'));
    expect(mockSendMessage).toHaveBeenCalledWith(CHAT_ID, expect.stringContaining('Format:'));
  });

  test('ignores messages from unknown chat IDs silently', async () => {
    await handleMessage(msg('john@acme.com | John | some note', '999999'));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  test('replies with error message when email generation fails', async () => {
    require('../src/email-gen').generateEmail.mockRejectedValueOnce(new Error('Claude error'));
    await handleMessage(msg('john@acme.com | John Doe | some note'));
    expect(mockSendMessage).toHaveBeenCalledWith(CHAT_ID, expect.stringContaining('Failed to generate email'));
  });

  test('replies with error message when gmail send fails', async () => {
    require('../src/gmail').sendEmail.mockRejectedValueOnce(new Error('Gmail error'));
    await handleMessage(msg('john@acme.com | John Doe | some note'));
    expect(mockSendMessage).toHaveBeenCalledWith(CHAT_ID, expect.stringContaining('Email generated but send failed'));
  });
});

describe('GET /health', () => {
  test('returns ok', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });
});
