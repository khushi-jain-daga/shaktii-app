const schemaPrompt = `Return only valid JSON with keys: executiveSummary, metadata {logTypeDetected,timeRangeCovered,overallRiskScore}, severityBreakdown {critical,high,medium,low,info}, findings [{severity,eventType,sourceIP,timestamp,description,mitreTag,rawLogSnippet,matchedPattern}], iocs [{value,type,reputation}], remediationChecklist. Severity must be Critical, High, Medium, Low or Info. IOC type must be IP, Domain, Hash or User. Reputation must be Malicious, Suspicious, Unknown or Clean.`;

function parseJson(text = '') {
  let clean = String(text).trim();
  if (clean.includes('```json')) clean = clean.split('```json')[1].split('```')[0];
  else if (clean.startsWith('```')) clean = clean.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
  return JSON.parse(clean);
}

async function withTimeout(promise, ms) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Provider timeout')), ms); })]); }
  finally { clearTimeout(timer); }
}

async function gemini(prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const payload = await response.json();
  return parseJson(payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
}

async function openai(prompt) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
  const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0, response_format: { type: 'json_object' } }) });
  if (!response.ok) throw new Error(`OpenAI ${response.status}`);
  const payload = await response.json();
  return parseJson(payload?.choices?.[0]?.message?.content || '{}');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const { fileName = 'unknown.log', redactedData = '' } = req.body || {};
  if (!redactedData || !String(redactedData).trim()) return res.status(400).json({ success: false, error: 'No readable content found in uploaded file.' });

  const sample = redactedData.length > 30000 ? `${redactedData.slice(0, 15000)}\n...[TRUNCATED]...\n${redactedData.slice(-15000)}` : redactedData;
  const prompt = `You are a Tier 3 SOC analyst inside SHAKTII PKAP Analyzer. Analyze the privacy-redacted log/content. Use only supplied evidence. ${schemaPrompt}\n\nFile: ${fileName}\n\nRedacted content:\n${sample}`;
  const providers = [['Gemini', gemini, 35000], ['OpenAI', openai, 25000]];
  const providerErrors = [];

  for (const [name, fn, timeout] of providers) {
    try {
      const analysis = await withTimeout(fn(prompt), timeout);
      return res.status(200).json({ success: true, analysis, providerUsed: name, aiFallback: false });
    } catch (error) {
      providerErrors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return res.status(503).json({ success: false, error: 'Configured AI providers are unavailable. Client deterministic PKAP analysis should be used.', providerErrors, aiFallback: true });
}
