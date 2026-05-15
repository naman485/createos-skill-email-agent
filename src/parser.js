function parseMessage(text) {
  if (!text || typeof text !== 'string') return null;

  const parts = text.split('|').map(p => p.trim());
  if (parts.length < 3) return null;

  const [email, name, ...noteParts] = parts;
  const note = noteParts.join('|').trim();

  if (!email || !name || !note) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return null;

  const domain = email.split('@')[1];

  return { email, name, note, domain };
}

module.exports = { parseMessage };
