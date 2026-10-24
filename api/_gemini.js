// Owner: Eashvar. Gemini helper for api/assistant.js. Not an endpoint (files starting with _ are skipped).
// Gemini only turns the user's message into a search (what to look for, price, how far to walk).
// It never names places: Google Places finds the real ones, so nothing made up reaches the page.
// Docs: https://ai.google.dev/gemini-api/docs/structured-output
import axios from 'axios'

// A fast, cheap model is enough for this: Flash-Lite answers in about 1.5 s, while the bigger
// Flash models took from 4 s to over a minute for the same structured answer. GEMINI_MODEL in
// .env.local overrides it if Google renames or retires this one (2.5 Flash went that way).
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'

const SYSTEM_PROMPT = `You help a group of friends in Singapore find somewhere to go near their agreed meeting point (an MRT station).
Turn the latest message into a Google Places text search. Fill in:
- isSearch: false if the message isn't asking for a place to go (a greeting, a question about something else). Otherwise true.
- query: the food or kind of place only, in a few words, e.g. "prata", "bubble tea", "board game cafe". Leave out dietary words and the area name; those are handled separately.
- dietary: dietary needs from the message plus the group's, e.g. ["halal"]. Empty if there are none.
- maxPrice: 1 (cheap, under $15 a person), 2 ($15-30), 3 ($30-50) or 4 (pricier). Use the group's lowest budget unless the message says otherwise. 0 if there's no limit.
- walkMins: how many minutes' walk from the station they'd accept. Default 10. "Near the MRT" or "close by" means 5. "Don't mind walking" means 15.
- needsGroup: true if they mention a group, friends, "fits us", or 4 or more people.
- reply: one short, friendly sentence about what you're searching for, e.g. "Looking for halal prata near Bishan for dinner."
Never name specific places, ratings, prices or opening hours in the reply; the app shows the real results.
If the message changes an earlier search ("cheaper", "closer"), start from the earlier search and adjust it.
"Something else" means a different but similar idea for the same meal and needs (after "prata", try "nasi lemak" or "murtabak"), so isSearch stays true.
If isSearch is false, the reply says in one sentence what you can help with, and query is "".`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    isSearch: { type: 'BOOLEAN' },
    query: { type: 'STRING' },
    maxPrice: { type: 'INTEGER' },
    walkMins: { type: 'INTEGER' },
    needsGroup: { type: 'BOOLEAN' },
    dietary: { type: 'ARRAY', items: { type: 'STRING' } },
    reply: { type: 'STRING' },
  },
  required: ['isSearch', 'query', 'reply'],
}

const BUDGET_LABELS = { 1: 'under $15 a person', 2: '$15-30 a person', 3: '$30+ a person' }

function describeTime(startsAt) {
  if (!startsAt) return 'not set'
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startsAt))
}

// The facts Gemini gets with the message. No names, emails or starting points: only the
// meeting point, the time and what the group as a whole needs.
function describe({ message, midpoint, startsAt, needs }) {
  const dietary = needs.dietary.length ? needs.dietary.join(', ') : 'none'
  const budget = BUDGET_LABELS[needs.maxPrice] ?? 'not set'
  return [
    `Meeting point: ${midpoint.name} MRT`,
    `Hangout starts: ${describeTime(startsAt)}`,
    `Group: ${needs.size} people. Dietary needs: ${dietary}. Lowest budget: ${budget}.`,
    `Message: ${message}`,
  ].join('\n')
}

/**
 * The message as a structured search.
 * @returns {Promise<{ isSearch: boolean, query: string, maxPrice?: number, walkMins?: number,
 *   needsGroup?: boolean, dietary?: string[], reply: string }>}
 */
export async function toSearch(key, { message, history, midpoint, startsAt, needs }) {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const contents = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: describe({ message, midpoint, startsAt, needs }) }] },
  ]
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0.2,
      },
    },
    { headers: { 'x-goog-api-key': key }, timeout: 15000 },
  )
  const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini gave no answer')
  return JSON.parse(text)
}
