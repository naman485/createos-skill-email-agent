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
    setWebHook: jest.fn().mockResolvedValue({}),
  }));
});

const { app } = require('../src/index');

describe('POST /webhook', () => {
  const CHAT_ID = '123456789';

  beforeEach(() => {
    process.env.TELEGRAM_CHAT_ID = CHAT_ID;
    jest.clearAllMocks();
  });

  test('processes valid message and sends email', async () => {
    const { generateEmail } = require('../src/email-gen');
    const { sendEmail } = require('../src/gmail');

    await request(app)
      .post('/webhook')
      .send({
        message: {
          chat: { id: CHAT_ID },
          message_id: 1,
          text: 'john@acme.com | John Doe | signed up from Product Hunt',
        },
      })
      .expect(200);

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
    await request(app)
      .post('/webhook')
      .send({
        message: {
          chat: { id: CHAT_ID },
          message_id: 2,
          text: 'not a valid format',
        },
      })
      .expect(200);

    expect(mockSendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringContaining('Format:')
    );
  });

  test('ignores messages from unknown chat IDs silently', async () => {
    await request(app)
      .post('/webhook')
      .send({
        message: {
          chat: { id: '999999' },
          message_id: 3,
          text: 'john@acme.com | John | some note',
        },
      })
      .expect(200);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  test('replies with error message when email generation fails', async () => {
    const { generateEmail } = require('../src/email-gen');
    generateEmail.mockRejectedValueOnce(new Error('Claude error'));

    await request(app)
      .post('/webhook')
      .send({
        message: {
          chat: { id: CHAT_ID },
          message_id: 4,
          text: 'john@acme.com | John Doe | some note',
        },
      })
      .expect(200);

    expect(mockSendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringContaining('Failed to generate email')
    );
  });

  test('replies with error message when gmail send fails', async () => {
    const { sendEmail } = require('../src/gmail');
    sendEmail.mockRejectedValueOnce(new Error('Gmail error'));

    await request(app)
      .post('/webhook')
      .send({
        message: {
          chat: { id: CHAT_ID },
          message_id: 5,
          text: 'john@acme.com | John Doe | some note',
        },
      })
      .expect(200);

    expect(mockSendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringContaining('Email generated but send failed')
    );
  });

  test('GET /health returns ok', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });
});
