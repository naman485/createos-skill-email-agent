const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your environment first.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3001/callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
  prompt: 'consent',
});

console.log('\nOpen this URL in your browser and authorize naman@nodeops.xyz:\n');
console.log(authUrl);
console.log('\nWaiting for callback...\n');

const server = http.createServer(async (req, res) => {
  const { query } = url.parse(req.url, true);
  if (query.code) {
    const { tokens } = await oauth2Client.getToken(query.code);
    res.end('Done. Check your terminal for the refresh token.');
    server.close();
    console.log('\n=== GMAIL_REFRESH_TOKEN ===');
    console.log(tokens.refresh_token);
    console.log('===========================\n');
    console.log('Copy this value into your .env file as GMAIL_REFRESH_TOKEN.');
  }
}).listen(3001);
