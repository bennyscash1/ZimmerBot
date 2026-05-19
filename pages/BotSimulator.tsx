
import React, { useState, useRef, useEffect } from 'react';
import { AppState, ChatMessage, Booking, BookingStatus, ZimmerUnit } from '../types';
import { translations, Language } from '../translations';
import { 
  Send, Bot, User, Loader2, Info, CheckCircle, Calendar, Sparkles, 
  MapPin, UserCheck, CreditCard, X, Eye, ShoppingCart, Star, Waves, Wifi, Tv, Lock,
  ChevronLeft, Sparkle, MessageCircle
} from 'lucide-react';
import { processGuestMessage } from '../geminiService';
import { unitsAPI, bookingsAPI } from '../api';

interface Props {
  db: AppState;
  setDb: (db: AppState) => void;
  lang: Language;
}

const BotSimulator: React.FC<Props> = ({ db, setDb, lang }) => {
  const t = translations[lang];
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showBookingAlert, setShowBookingAlert] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [searchResults, setSearchResults] = useState<{units: ZimmerUnit[], checkIn: string, checkOut: string} | null>(null);
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<ZimmerUnit | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);


  // return (
   
  // );

  // Load units and bookings from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [unitsData, bookingsData] = await Promise.all([
          unitsAPI.getAll(),
          bookingsAPI.getAll()
        ]);
        // Update db with fresh data from API
        setDb({ ...db, units: unitsData || [], bookings: bookingsData || [] });
      } catch (err) {
        console.error('Error loading data for bot:', err);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [db.messages, isTyping, searchResults, isProcessingPayment]);

  const handleSendMessage = async (textOverride?: string) => {
    const messageToSend = textOverride || inputText;
    if (!messageToSend.trim()) return;

    // Detect if user is providing credit card (simple heuristic for demo)
    const isProvidingCard = messageToSend.match(/\d{4}/);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: messageToSend,
      timestamp: new Date()
    };

    const updatedMessages = [...db.messages, userMsg];
    setDb({ ...db, messages: updatedMessages });
    setInputText('');
    
    if (isProvidingCard) {
      setIsProcessingPayment(true);
      await new Promise(r => setTimeout(r, 2000));
      setIsProcessingPayment(false);
    }

    setIsTyping(true);

    try {
      // PASS FULL HISTORY TO GEMINI
      const result = await processGuestMessage(updatedMessages, db, lang);

      let botResponses: ChatMessage[] = [];

      if (result.functionCalls && result.functionCalls.length > 0) {
        for (const fc of result.functionCalls) {
          if (fc.name === 'search_available_units') {
            const args = fc.args as any;
            const available = db.units.filter(u => {
              const conflicts = db.bookings.filter(b => b.unitId === u.id && (
                (args.checkIn >= b.checkIn && args.checkIn < b.checkOut) ||
                (args.checkOut > b.checkIn && args.checkOut <= b.checkOut)
              ));
              return conflicts.length === 0;
            });

            setSearchResults({ units: available, checkIn: args.checkIn, checkOut: args.checkOut });
            
            botResponses.push({
              id: Date.now().toString() + '-search',
              role: 'model',
              text: lang === 'he' 
                ? `מעולה! מצאתי עבורך ${available.length} אפשרויות פנויות לתאריכים ${args.checkIn} עד ${args.checkOut}:` 
                : `Found ${available.length} available options for ${args.checkIn} to ${args.checkOut}:`,
              timestamp: new Date()
            });
          } 
          
          else if (fc.name === 'create_booking') {
            const args = fc.args as any;
            
            // Extract guest name from conversation history if not provided
            let guestName = args.guestName;
            if (!guestName) {
              // Try to find name in conversation history - check all user messages
              for (let i = updatedMessages.length - 1; i >= 0; i--) {
                const msg = updatedMessages[i];
                if (msg.role !== 'user') continue;
                
                const text = msg.text.toLowerCase();
                
                // Pattern 1: "השם שלי הוא X" or "השם שלי X"
                let match = msg.text.match(/(?:השם שלי (?:הוא )?|קוראים לי |שמי |אני |קוראים? לי )(.+?)(?:\.|,|\s|$|,)/i);
                if (match && match[1]) {
                  guestName = match[1].trim().split(/\s+/)[0]; // Take first word as name
                  break;
                }
                
                // Pattern 2: "אני X" where X is likely a name (2-20 chars, no numbers)
                match = msg.text.match(/אני ([א-ת]{2,20})(?:\s|$|\.|,)/);
                if (match && match[1] && !match[1].match(/\d/)) {
                  guestName = match[1].trim();
                  break;
                }
                
                // Pattern 3: "X" as standalone message (likely a name)
                if (i === updatedMessages.length - 1 && msg.text.length >= 2 && msg.text.length <= 20 && !msg.text.match(/\d/)) {
                  guestName = msg.text.trim();
                  break;
                }
              }
              
              // Fallback: use "אורח" if no name found
              if (!guestName) {
                guestName = lang === 'he' ? 'אורח' : 'Guest';
              }
            }

            // Find the unit to get price if not provided
            const selectedUnit = db.units.find(u => u.id === args.unitId);
            const unitPrice = selectedUnit?.pricePerNight || args.totalPrice || 0;
            
            // Calculate total price if not provided
            const checkInDate = new Date(args.checkIn);
            const checkOutDate = new Date(args.checkOut);
            const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
            const totalPrice = args.totalPrice || (unitPrice * nights);

            // Create booking via API
            try {
              const bookingData = {
                unitId: args.unitId,
                guestName: guestName,
                guestPhone: args.guestPhone || '',
                checkIn: args.checkIn,
                checkOut: args.checkOut,
                totalPrice: totalPrice,
                status: 'confirmed'
              };

              // Call API to create booking
              const createdBooking = await bookingsAPI.create(bookingData);

              botResponses.push({
                id: Date.now().toString() + '-booking',
                role: 'model',
                text: lang === 'he' 
                  ? `איזה יופי! 🎉 ההזמנה שלך אושרה בהצלחה. סגרתי לך את ${selectedUnit?.name || 'הצימר'} ל${guestName}. מספר הזמנה: ${createdBooking.id || createdBooking._id}. נשלחה אליך הודעת אישור ב-SMS.`
                  : `Awesome! 🎉 Your booking is confirmed for ${selectedUnit?.name || 'the unit'}. Order ID: ${createdBooking.id || createdBooking._id}. A confirmation SMS has been sent.`,
                timestamp: new Date()
              });

              // Reload bookings from API to get updated list
              const updatedBookings = await bookingsAPI.getAll();
              setDb({ ...db, bookings: updatedBookings || [], messages: [...updatedMessages, ...botResponses] });
              setShowBookingAlert(true);
              setTimeout(() => setShowBookingAlert(false), 5000);
              setSearchResults(null);
              
              setIsTyping(false);
              return; // Exit early to avoid double-setting messages
            } catch (bookingError: any) {
              console.error('Error creating booking:', bookingError);
              botResponses.push({
                id: Date.now().toString() + '-error',
                role: 'model',
                text: lang === 'he' 
                  ? `מצטער, הייתה בעיה ביצירת ההזמנה. אנא נסה שוב מאוחר יותר.`
                  : `Sorry, there was an issue creating the booking. Please try again later.`,
                timestamp: new Date()
              });
            }
          }
        }
      } else {
        botResponses.push({
          id: Date.now().toString() + '-text',
          role: 'model',
          text: result.text,
          timestamp: new Date()
        });
      }

      setDb({ ...db, messages: [...updatedMessages, ...botResponses] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSelectUnit = (unit: ZimmerUnit) => {
    const dateContext = searchResults ? `לתאריכים ${searchResults.checkIn} עד ${searchResults.checkOut}` : "";
    const text = lang === 'he' 
      ? `אני רוצה להזמין את ${unit.name} ${dateContext}. השם שלי הוא ישראל והטלפון 050-1112223.`
      : `I want to book ${unit.name} ${dateContext}. My name is John and phone is 050-1112223.`;
    handleSendMessage(text);
    setSearchResults(null);
  };

  const quickReplies = [
    { label: "היי, מה פנוי לסופ״ש הקרוב?", text: "היי, מה פנוי לסופ״ש הקרוב?" },
    { label: "אני רוצה להזמין צימר ל-3 לילות במאי", text: "אני רוצה להזמין צימר ל-3 לילות בחודש מאי" },
    { label: "מה המחיר של סוויטת היער?", text: "מה המחיר של סוויטת היער?" }
  ];

  return (
    <div>
      <p className="text-[11px] leading-relaxed opacity-80 font-medium">
        הבוט עדיין לא מחובר
      </p>
    </div>
  );

  // return (
  //   <div className="h-full flex flex-col gap-6 animate-fadeIn relative">
  //     {showBookingAlert && (
  //       <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-emerald-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-bounce border-2 border-white">
  //         <CheckCircle size={24} />
  //         <span className="font-black">ההזמנה נקלטה במערכת! ✅</span>
  //       </div>
  //     )}

  //     {selectedUnitForDetails && (
  //       <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
  //         <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedUnitForDetails(null)}></div>
  //         <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl z-10 overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
  //           <div className="relative h-64">
  //             <img src={selectedUnitForDetails.images[0]} className="w-full h-full object-cover" alt="" />
  //             <button onClick={() => setSelectedUnitForDetails(null)} className="absolute top-6 right-6 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-all">
  //               <X size={24} />
  //             </button>
  //           </div>
  //           <div className="p-10 overflow-y-auto space-y-6">
  //             <div className="flex justify-between items-start">
  //               <div className="text-right">
  //                 <h3 className="text-3xl font-black text-slate-800">{selectedUnitForDetails.name}</h3>
  //                 <div className="flex items-center gap-1 text-amber-500 mt-2 justify-end">
  //                   <Star size={16} fill="currentColor" />
  //                   <Star size={16} fill="currentColor" />
  //                   <Star size={16} fill="currentColor" />
  //                   <Star size={16} fill="currentColor" />
  //                   <Star size={16} fill="currentColor" />
  //                 </div>
  //               </div>
  //               <div className="text-left">
  //                 <p className="text-2xl font-black text-indigo-600">₪{selectedUnitForDetails.pricePerNight}</p>
  //                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">מחיר ללילה</p>
  //               </div>
  //             </div>
  //             <p className="text-slate-600 leading-relaxed font-medium text-right">{selectedUnitForDetails.description}</p>
              
  //             <button 
  //               onClick={() => { handleSelectUnit(selectedUnitForDetails); setSelectedUnitForDetails(null); }}
  //               className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all"
  //             >
  //               בחר בצימר זה והמשך להזמנה
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     )}

  //     <div className="flex items-center justify-between">
  //       <div>
  //         <h2 className="text-2xl font-black text-slate-800 tracking-tight">סימולטור WhatsApp חכם</h2>
  //         <p className="text-slate-500 font-medium">כאן תוכלו לבחון את זרימת המכירה והתשלום של הבוט מקצה לקצה.</p>
  //       </div>
  //     </div>

  //     <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
  //       <div className="lg:col-span-8 bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col relative">
  //         <div className="bg-[#075e54] p-5 flex items-center justify-between text-white">
  //           <div className="flex items-center gap-4">
  //             <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
  //               <Bot size={24} />
  //             </div>
  //             <div>
  //               <h3 className="font-bold text-lg leading-none">ZimmerPro AI Assistant</h3>
  //               <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1 flex items-center gap-1">
  //                 <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
  //                 מחובר ומוכן לעזור
  //               </p>
  //             </div>
  //           </div>
  //           <button onClick={() => setDb({...db, messages: []})} className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">איפוס צ׳אט</button>
  //         </div>

  //         <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#e5ddd5] custom-scrollbar">
  //           {db.messages.length === 0 && (
  //             <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fadeIn">
  //               <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-slate-200">
  //                 {/* Fixed missing import for MessageCircle */}
  //                 <MessageCircle size={40} className="opacity-20" />
  //               </div>
  //               <div className="space-y-2">
  //                  <p className="text-slate-600 font-black text-lg">איך אפשר לעזור היום?</p>
  //                  <p className="text-slate-400 text-xs font-medium">הבוט שלנו יכול לחפש צימרים, לספק מחירים ולסגור הזמנות.</p>
  //               </div>
  //               <div className="flex flex-wrap gap-2 justify-center max-w-sm">
  //                  {quickReplies.map((q, i) => (
  //                    <button key={i} onClick={() => handleSendMessage(q.text)} className="bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl text-xs font-black text-slate-800 shadow-sm hover:bg-white transition-all border border-white/50">{q.label}</button>
  //                  ))}
  //               </div>
  //             </div>
  //           )}
            
  //           {db.messages.map((m) => (
  //             <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
  //               <div className={`p-4 rounded-2xl text-sm shadow-sm max-w-[80%] ${m.role === 'user' ? 'bg-white rounded-tr-none text-slate-800' : 'bg-[#dcf8c6] rounded-tl-none font-bold text-slate-900 border border-emerald-100'}`}>
  //                 {m.text}
  //                 <div className="text-[9px] mt-1 opacity-50 text-right">
  //                   {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  //                 </div>
  //               </div>
  //             </div>
  //           ))}

  //           {searchResults && (
  //             <div className="flex justify-end animate-fadeIn">
  //               <div className="flex flex-col gap-4 w-[90%]">
  //                 {searchResults.units.map(unit => (
  //                   <div key={unit.id} className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-white/50 animate-scaleIn flex flex-col md:flex-row">
  //                      <img src={unit.images[0]} className="h-40 md:h-auto md:w-32 object-cover" alt="" />
  //                      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
  //                         <div className="flex justify-between items-start">
  //                            <div className="text-right">
  //                              <h4 className="font-black text-slate-800 text-base">{unit.name}</h4>
  //                              <p className="text-[10px] text-slate-400 font-bold">עד {unit.capacity} אורחים</p>
  //                            </div>
  //                            <span className="text-emerald-600 font-black">₪{unit.pricePerNight}</span>
  //                         </div>
  //                         <div className="flex gap-2">
  //                            <button onClick={() => setSelectedUnitForDetails(unit)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded-xl hover:bg-slate-200 flex items-center justify-center gap-1.5 transition-all"><Eye size={14} /> פרטים</button>
  //                            <button onClick={() => handleSelectUnit(unit)} className="flex-1 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-indigo-600 flex items-center justify-center gap-1.5 transition-all"><ShoppingCart size={14} /> הזמן עכשיו</button>
  //                         </div>
  //                      </div>
  //                   </div>
  //                 ))}
  //                 {searchResults.units.length === 0 && (
  //                   <div className="bg-white/80 p-6 rounded-2xl text-center text-slate-500 font-bold border border-white/50">
  //                      לצערי אין יחידות פנויות בתאריכים אלו. נסו תאריך אחר!
  //                   </div>
  //                 )}
  //               </div>
  //             </div>
  //           )}

  //           {isProcessingPayment && (
  //             <div className="flex justify-end animate-fadeIn">
  //                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-indigo-100 w-[85%] flex flex-col items-center gap-6 relative overflow-hidden">
  //                   <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 animate-pulse"></div>
  //                   <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner relative">
  //                      <Lock size={36} />
  //                      <div className="absolute inset-0 border-2 border-indigo-200 rounded-full animate-ping opacity-20"></div>
  //                   </div>
  //                   <div className="text-center space-y-2">
  //                      <p className="font-black text-slate-800 text-lg">מעבד תשלום מאובטח...</p>
  //                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PCI-DSS Compliant Transaction</p>
  //                   </div>
  //                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
  //                      <div className="h-full bg-indigo-600 animate-progress"></div>
  //                   </div>
  //                </div>
  //             </div>
  //           )}
            
  //           {isTyping && !isProcessingPayment && (
  //             <div className="flex justify-end animate-pulse">
  //               <div className="bg-[#dcf8c6] px-5 py-2.5 rounded-full text-[10px] font-black uppercase text-slate-500 border border-emerald-50">
  //                 ZimmerPro מקליד...
  //               </div>
  //             </div>
  //           )}
  //         </div>

  //         <div className="p-4 bg-[#f0f0f0] flex items-center gap-3">
  //           <div className="relative flex-1">
  //             <input 
  //               type="text" 
  //               value={inputText}
  //               onChange={e => setInputText(e.target.value)}
  //               onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
  //               placeholder="כתוב הודעה..."
  //               className="w-full bg-white border-none rounded-full px-6 py-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#075e54] transition-all"
  //             />
  //             <button 
  //               onClick={() => handleSendMessage()}
  //               disabled={!inputText.trim() || isTyping}
  //               className={`absolute ${t.dir === 'rtl' ? 'left-1.5' : 'right-1.5'} top-1.5 p-2.5 bg-[#075e54] text-white rounded-full shadow-lg transition-all ${!inputText.trim() || isTyping ? 'opacity-30 scale-90' : 'hover:scale-105 active:scale-95'}`}
  //             >
  //               <Send size={18} className={t.dir === 'rtl' ? 'rotate-180' : ''} />
  //             </button>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Info Sidebar */}
  //       <div className="lg:col-span-4 space-y-6">
  //          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
  //            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16"></div>
  //            <h4 className="font-black text-slate-800 mb-8 flex items-center gap-3 relative">
  //               <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
  //                  <Sparkle size={18} />
  //               </div>
  //               זרימת ההזמנה
  //            </h4>
             
  //            <div className="space-y-6 relative">
  //              {[
  //                { icon: Calendar, label: "בירור תאריכים", status: db.messages.some(m => m.text.includes('מתי') || m.text.includes('202') || m.text.includes('סופ״ש') || m.text.includes('מחר')) },
  //                { icon: MapPin, label: "חיפוש יחידות פנויות", status: db.messages.some(m => m.text.includes('מצאתי עבורך')) },
  //                { icon: UserCheck, label: "פרטי אורח (שם ונייד)", status: db.messages.some(m => m.text.includes('ישראל') || m.text.includes('05')) },
  //                { icon: CreditCard, label: "תשלום סימולטיבי", status: db.messages.some(m => m.text.match(/\d{4}/)) },
  //                { icon: CheckCircle, label: "אישור סופי", status: db.bookings.length > 1 }
  //              ].map((step, i) => (
  //                <div key={i} className="flex items-center gap-4 group">
  //                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${step.status ? 'bg-emerald-500 text-white shadow-emerald-100 scale-110' : 'bg-slate-50 text-slate-300'}`}>
  //                    <step.icon size={20} />
  //                  </div>
  //                  <div className="flex-1">
  //                     <span className={`text-[11px] font-black uppercase tracking-tight block ${step.status ? 'text-emerald-600' : 'text-slate-400'}`}>
  //                        {step.label}
  //                     </span>
  //                     {step.status && <p className="text-[9px] text-emerald-400 font-bold uppercase">הושלם ✅</p>}
  //                  </div>
  //                </div>
  //              ))}
  //            </div>
  //          </div>

  //          <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-6 relative overflow-hidden">
  //             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
  //                <div className="grid grid-cols-4 gap-4 p-4">
  //                   {Array.from({length: 12}).map((_, i) => <div key={i} className="w-4 h-4 bg-white rounded-full"></div>)}
  //                </div>
  //             </div>
  //             <h5 className="font-black text-indigo-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
  //                <Info size={14} />
  //                הוראות לסימולציה
  //             </h5>
  //             <div className="space-y-4">
  //               <p className="text-sm font-bold leading-relaxed">
  //                 הבוט תוכנן להוביל אותך צעד אחר צעד. נסה לכתוב: <span className="text-indigo-300">"מה פנוי לסופ״ש הקרוב?"</span>
  //               </p>
  //               <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
  //                  <p className="text-[11px] leading-relaxed opacity-80 font-medium">
  //                    בשלב האחרון, הבוט יבקש 4 ספרות אשראי. הזן למשל <span className="text-white font-black">"4580"</span> כדי לראות את יצירת ההזמנה ב-Live בתוך המערכת!
  //                  </p>
  //               </div>
  //             </div>
  //          </div>
  //       </div>
  //     </div>
  //   </div>
  // );
};

export default BotSimulator;
