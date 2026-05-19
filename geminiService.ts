
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { AppState, ChatMessage } from "./types";
import { Language } from "./translations";

const createBookingDeclaration: FunctionDeclaration = {
  name: 'create_booking',
  parameters: {
    type: Type.OBJECT,
    description: 'Create a new zimmer booking in the system after confirming all details and payment with the guest.',
    properties: {
      unitId: { type: Type.STRING, description: 'The unique ID of the zimmer unit selected.' },
      guestName: { type: Type.STRING, description: 'Full name of the guest.' },
      guestPhone: { type: Type.STRING, description: 'WhatsApp/Phone number of the guest.' },
      checkIn: { type: Type.STRING, description: 'Check-in date in YYYY-MM-DD format.' },
      checkOut: { type: Type.STRING, description: 'Check-out date in YYYY-MM-DD format.' },
      totalPrice: { type: Type.NUMBER, description: 'Total price for the entire stay.' }
    },
    required: ['unitId', 'guestName', 'guestPhone', 'checkIn', 'checkOut', 'totalPrice'],
  },
};

const searchUnitsDeclaration: FunctionDeclaration = {
  name: 'search_available_units',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for available zimmer units based on dates and optionally number of guests.',
    properties: {
      checkIn: { type: Type.STRING, description: 'Check-in date (YYYY-MM-DD)' },
      checkOut: { type: Type.STRING, description: 'Check-out date (YYYY-MM-DD)' },
      guests: { type: Type.NUMBER, description: 'Number of guests' }
    },
    required: ['checkIn', 'checkOut'],
  },
};

export async function processGuestMessage(messages: ChatMessage[], context: AppState, lang: Language) {
  // Get Gemini API key from environment variable (VITE_ prefix needed for frontend)
  // Try both VITE_GEMINI_API_KEY and GEMINI_API_KEY (if exported from backend)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    console.error('❌ VITE_GEMINI_API_KEY לא מוגדר! הוסף את המפתח לקובץ .env.local עם הקידומת VITE_');
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to .env.local');
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const langNames = { he: 'Hebrew', en: 'English', ar: 'Arabic' };

  // Convert history to Gemini format
  const history = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  const systemInstruction = `
    You are "ZimmerPro AI", a smart WhatsApp booking agent for vacation rentals.
    Your goal is to lead the guest through a complete booking flow.
    
    FLOW STEPS (STRICT ORDER - NO SKIPPING):
    1. GREET & GET NAME: First, greet warmly and ask for the guest's name: "${lang === 'he' ? 'שלום! אני שמח לעזור לך להזמין צימר. מה השם שלך?' : 'Hello! I\'m happy to help you book a lodging. What\'s your name?'}"
    2. UNDERSTAND DATES: If the guest mentions a timeframe (e.g. "this weekend", "next week"), resolve it to YYYY-MM-DD. If dates are missing, ask nicely.
    3. SEARCH: As soon as dates are clear, IMMEDIATELY call 'search_available_units' with the dates.
    4. PRESENT OPTIONS: After the tool returns units, tell the guest about them (name, price). Show all available units clearly.
    5. CAPTURE SELECTION: Wait for the guest to explicitly pick/choose a unit. Do NOT proceed until they confirm.
    6. COLLECT PHONE: Ask for the guest's phone number if not yet provided. Say: "${lang === 'he' ? 'מה מספר הטלפון שלך?' : 'What\'s your phone number?'}"
    7. DEMO PAYMENT: Once name and phone are confirmed, ask for payment: "${lang === 'he' ? 'לצורך הדמיית המערכת, אנא הזן 4 ספרות של כרטיס אשראי (למשל 4580)' : 'For system demonstration, please enter 4 digits of your credit card (e.g., 4580)'}"
    8. BOOK: IMMEDIATELY after they provide the 4 digits, call 'create_booking' with ALL required fields (unitId, guestName, guestPhone, checkIn, checkOut, totalPrice).
    
    CRITICAL RULES:
    - ALWAYS communicate in ${langNames[lang]}.
    - DO NOT skip steps! Follow the flow strictly: Name → Dates → Search → Select → Phone → Payment → Book.
    - If guest provides name early (e.g. "אני דוד"), remember it and use it in create_booking.
    - Extract name from messages like "השם שלי הוא X", "קוראים לי X", "אני X".
    - Be concise, professional, and friendly. Use emojis like 🏨, ✨, ✅.
    - Today is ${new Date().toISOString().split('T')[0]}.
    - Context: Units available in the system are: ${context.units.map(u => `${u.name} (ID:${u.id}, Price:₪${u.pricePerNight})`).join(', ') || 'None'}.
    - When calling create_booking, ALWAYS provide guestName from the conversation history.
    - Calculate totalPrice = (checkOut - checkIn days) * unit.pricePerNight if not provided.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: history,
      config: {
        systemInstruction,
        temperature: 0.1,
        tools: [{ functionDeclarations: [searchUnitsDeclaration, createBookingDeclaration] }]
      },
    });

    return {
      text: response.text || "",
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: lang === 'he' ? "מצטער, חלה שגיאה קטנה. בואו ננסה שוב!" : "Sorry, a small error occurred. Let's try again!", functionCalls: undefined };
  }
}
