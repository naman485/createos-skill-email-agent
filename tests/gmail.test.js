jest.mock('googleapis', () => {
  const mockSend = jest.fn().mockResolvedValue({ data: { id: 'msg_123' } });
  const mockMessages = { send: mockSend };
  const mockUsers = { messages: mockMessages };
  const mockGmail = { users: mockUsers };

  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => ({
          setCredentials: jest.fn(),
        })),
      },
      gmail: jest.fn().mockReturnValue(mockGmail),
    },
  };
});

const { sendEmail } = require('../src/gmail');

describe('sendEmail', () => {
  beforeEach(() => {
    process.env.GMAIL_CLIENT_ID = 'test-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'test-secret';
    process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';
    process.env.GMAIL_FROM = 'naman@nodeops.xyz';
  });

  test('calls gmail.users.messages.send with base64 encoded message', async () => {
    const { google } = require('googleapis');
    const mockSend = google.gmail().users.messages.send;

    await sendEmail('john@acme.com', 'Test subject', 'Test body');

    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.userId).toBe('me');
    expect(call.requestBody.raw).toBeDefined();
    expect(typeof call.requestBody.raw).toBe('string');
  });

  test('returns message id on success', async () => {
    const result = await sendEmail('john@acme.com', 'Subject', 'Body');
    expect(result).toBe('msg_123');
  });

  test('throws if send fails', async () => {
    const { google } = require('googleapis');
    const mockSend = google.gmail().users.messages.send;
    mockSend.mockRejectedValueOnce(new Error('Gmail API error'));

    await expect(sendEmail('john@acme.com', 'Subject', 'Body'))
      .rejects.toThrow('Gmail API error');
  });
});
