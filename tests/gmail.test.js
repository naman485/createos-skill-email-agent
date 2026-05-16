const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg_123' });

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));

const { sendEmail } = require('../src/gmail');

describe('sendEmail', () => {
  beforeEach(() => {
    process.env.GMAIL_FROM = 'naman@nodeops.xyz';
    process.env.GMAIL_APP_PASSWORD = 'test-app-password';
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'msg_123' });
  });

  test('calls sendMail with correct to, subject, and body', async () => {
    await sendEmail('john@acme.com', 'Test subject', 'Test body');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('john@acme.com');
    expect(call.subject).toBe('Test subject');
    expect(call.text).toBe('Test body');
    expect(call.from).toBe('naman@nodeops.xyz');
  });

  test('returns message id on success', async () => {
    const result = await sendEmail('john@acme.com', 'Subject', 'Body');
    expect(result).toBe('msg_123');
  });

  test('throws if send fails', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

    await expect(sendEmail('john@acme.com', 'Subject', 'Body'))
      .rejects.toThrow('SMTP error');
  });
});
