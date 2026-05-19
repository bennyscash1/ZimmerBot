// // MongoDB Insert Script for ZimmerPro
// // הרץ את הסקריפט הזה ב-MongoDB Shell או MongoDB Compass

// // בחר את מסד הנתונים
// use('zimmerpro');

// // ============================================
// // 1. ACCOUNTS - צריך ליצור קודם!
// // ============================================
// db.accounts.insertMany([
//   {
//     name: "אחוזת דורון",
//     phone: "052-5556666",
//     email: "doron@example.com",
//     token: "T-8821",
//     logo: "https://picsum.photos/40/40",
//     primary_contact_id: 1,
//     is_active: true,
//     whatsapp_number: "052-5556666",
//     maxUnits: 5
//   }
// ]);

// // שמור את ה-_id של Account שנוצר
// var accountId = db.accounts.findOne({token: "T-8821"})._id;

// // ============================================
// // 2. USERS
// // ============================================
// // הערה: סיסמאות צריכות להיות מוצפנות עם bcrypt
// // השתמש ב-API של המערכת ליצירת משתמשים, או הצפן ידנית
// db.users.insertMany([
//   {
//     name: "מנהל ראשי",
//     email: "admin@zimmerpro.com",
//     phoneNumber: "0500000000",
//     password: "$2a$10$YourHashedPasswordHere", // צריך להחליף!
//     role: "admin",
//     isActive: true,
//     isApproved: true,
//     createdAt: "2024-01-01"
//   },
//   {
//     name: "דורון בעלים",
//     email: "doron@example.com",
//     phoneNumber: "0525556666",
//     password: "$2a$10$YourHashedPasswordHere", // צריך להחליף!
//     role: "complex_owner",
//     accountId: 1, // צריך להתאים ל-accountId
//     isActive: true,
//     isApproved: true,
//     createdAt: "2024-02-15"
//   }
// ]);

// // ============================================
// // 3. FACILITIES
// // ============================================
// db.facilities.insertMany([
//   {
//     accountId: 1,
//     name: "בריכה פרטית",
//     category: "outdoor",
//     icon: "Waves"
//   },
//   {
//     accountId: 1,
//     name: "Wi-Fi עוצמתי",
//     category: "general",
//     icon: "Wifi"
//   },
//   {
//     accountId: 1,
//     name: "מכונת קפה",
//     category: "indoor",
//     icon: "Coffee"
//   }
// ]);

// // שמור את ה-_id של Facilities
// var facilityIds = db.facilities.find({accountId: 1}).map(f => f._id.toString());

// // ============================================
// // 4. UNITS
// // ============================================
// db.units.insertMany([
//   {
//     accountId: 1,
//     name: "סוויטת היער",
//     description: "נוף פנורמי ליער ירוק, שקט ושלווה בלב הטבע.",
//     pricePerNight: 850,
//     capacity: 2,
//     status: "available",
//     images: ["https://picsum.photos/seed/1/400/300"],
//     videoUrl: "",
//     facilityIds: facilityIds,
//     specialPrices: []
//   },
//   {
//     accountId: 1,
//     name: "בקתת הנחל",
//     description: "בקתת עץ קסומה על גדת הנחל עם מרפסת רחבה.",
//     pricePerNight: 1100,
//     capacity: 4,
//     status: "available",
//     images: ["https://picsum.photos/seed/2/400/300"],
//     videoUrl: "",
//     facilityIds: facilityIds.slice(1), // רק חלק מהמתקנים
//     specialPrices: [
//       {
//         startDate: "2024-08-01",
//         endDate: "2024-08-31",
//         pricePerNight: 1500,
//         label: "אוגוסט",
//         earlyCheckInAllowed: false,
//         lateCheckOutAllowed: false,
//         minNights: 3
//       }
//     ]
//   }
// ]);

// // שמור את ה-_id של Units
// var unit1Id = db.units.findOne({name: "סוויטת היער"})._id.toString();
// var unit2Id = db.units.findOne({name: "בקתת הנחל"})._id.toString();

// // ============================================
// // 5. ROOMS
// // ============================================
// db.rooms.insertMany([
//   {
//     lodging_id: unit1Id,
//     name: "חדר שינה מרכזי",
//     room_type: "bedroom",
//     has_jacuzzi: true,
//     has_view: true,
//     beds_count: 1,
//     windows_count: 2,
//     has_ac: true,
//     has_tv: true
//   },
//   {
//     lodging_id: unit2Id,
//     name: "חדר הורים",
//     room_type: "bedroom",
//     has_jacuzzi: false,
//     has_view: true,
//     beds_count: 1,
//     windows_count: 1,
//     has_ac: true,
//     has_tv: true
//   },
//   {
//     lodging_id: unit2Id,
//     name: "חדר ילדים",
//     room_type: "bedroom",
//     has_jacuzzi: false,
//     has_view: false,
//     beds_count: 2,
//     windows_count: 1,
//     has_ac: true,
//     has_tv: false
//   }
// ]);

// // ============================================
// // 6. BOOKINGS
// // ============================================
// db.bookings.insertMany([
//   {
//     unitId: unit1Id,
//     guestName: "ישראל ישראלי",
//     guestPhone: "050-1234567",
//     checkIn: "2024-05-01",
//     checkOut: "2024-05-03",
//     totalPrice: 1700,
//     status: "confirmed",
//     googleSynced: true
//   }
// ]);

// // ============================================
// // 7. REVIEWS
// // ============================================
// db.reviews.insertMany([
//   {
//     unitId: unit1Id,
//     guestName: "משה כהן",
//     rating: 5,
//     comment: "מקום מדהים ושקט, נהנינו מכל רגע!",
//     date: "2024-04-15",
//     isPublished: true
//   },
//   {
//     unitId: unit2Id,
//     guestName: "רחל לוי",
//     rating: 4,
//     comment: "הבקתה מקסימה, הנחל מוסיף המון לאווירה.",
//     date: "2024-04-20",
//     isPublished: true
//   }
// ]);

// // ============================================
// // 8. CONTACTS
// // ============================================
// db.contacts.insertMany([
//   {
//     accountId: 1,
//     name: "יוני אינסטלציה",
//     role: "Maintenance",
//     phone: "054-0000001",
//     email: "yoni@fix.com",
//     notes: ""
//   },
//   {
//     accountId: 1,
//     name: "שני שיווק",
//     role: "Marketing",
//     phone: "054-0000002",
//     email: "shani@ads.com",
//     notes: ""
//   }
// ]);

// print("✅ כל הנתונים נוספו בהצלחה!");
