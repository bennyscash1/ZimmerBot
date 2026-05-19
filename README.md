# ZimmerPro - מערכת ניהול חכמה

מערכת ניהול מלאה לניהול יחידות אירוח, הזמנות, לקוחות ועוד.

## דרישות מוקדמות

לפני התחלה, ודא שיש לך מותקן:
- **Node.js** (גרסה 18 ומעלה)
- **npm** (מגיע עם Node.js)
- **Git** (לצורך הורדה מ-Bitbucket)

## הוראות התקנה והרצה

### 1. הורדת הפרויקט

אם הורדת את הפרויקט מ-Bitbucket:

```bash
# אם יש לך גישה ל-Bitbucket, אפשר גם לשכפל:
# git clone <repository-url>
```

### 2. התקנת תלויות - Frontend

התקן את התלויות של הפרונטאנד (בתיקיית השורש):

```bash
npm install
```

### 3. התקנת תלויות - Backend

התקן את התלויות של הבקאנד:

```bash
cd backend
npm install
cd ..
```

### 4. הגדרת משתני סביבה - Backend

צור קובץ `.env` בתיקיית `backend/`:

```bash
cd backend
cp env.example .env
```

ערוך את קובץ `.env` והגדר את הערכים הבאים:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Atlas Connection String
# החלף <db_password> עם הסיסמה האמיתית שלך
MONGODB_URI=mongodb+srv://battzyong_db_user:<db_password>@zimmerpro.bz5fbvt.mongodb.net/zimmerpro?retryWrites=true&w=majority&appName=zimmerpro

# לפתח מקומי: http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Gemini API (אם נדרש)
GEMINI_API_KEY=your-gemini-api-key-here

# Google OAuth (להתחברות עם Google)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Base URL (אופציונלי - לפתח מקומי לא צריך)
# BASE_URL=http://localhost:3000
```

**חשוב:** החלף את הערכים בפועל (סיסמת MongoDB, מפתחות API וכו').

### 5. הגדרת משתני סביבה - Frontend (אופציונלי)

אם אתה צריך להגדיר משתני סביבה לפרונטאנד, צור קובץ `.env.local` בתיקיית השורש:

```bash
# בתיקיית השורש (לא בתוך backend/)
# VITE_API_URL=http://localhost:3000/api
# GEMINI_API_KEY=your-gemini-api-key-here
# VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

**הערה:** ברירת המחדל, הפרונטאנד יתחבר ל-`http://localhost:3000/api` אוטומטית.

### 6. הרצת הפרויקט

יש לך מספר אפשרויות להרצה:

#### אופציה 1: הרצת הכל יחד (מומלץ)

הרץ את הפרונטאנד והבקאנד יחד:

```bash
npm run dev:all
```

פקודה זו תריץ:
- **Backend** על פורט 3000
- **Frontend** על פורט 5173

#### אופציה 2: הרצה נפרדת

**טרמינל 1 - Backend:**
```bash
npm run dev:backend
# או
cd backend
npm run dev
```

**טרמינל 2 - Frontend:**
```bash
npm run dev:frontend
# או
npm run dev
```

### 7. גישה לאפליקציה

לאחר ההרצה, פתח בדפדפן:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api

## מבנה הפרויקט

```
Zimmerpro/
├── backend/              # שרת Node.js/Express
│   ├── models/          # מודלים של MongoDB
│   ├── routes/          # נתיבי API
│   ├── middleware/      # Middleware
│   ├── 4-services/      # שירותים
│   ├── env.example      # תבנית משתני סביבה
│   └── .env             # משתני סביבה (צריך ליצור)
│
├── pages/               # דפי React
├── api.ts               # הגדרות API
├── package.json         # תלויות Frontend
└── vite.config.ts       # הגדרות Vite
```

## פקודות נוספות

### Build לפרודקשן

```bash
# Build של Frontend
npm run build

# הרצת Backend בפרודקשן
npm run start:backend
```

### בדיקת חיבור ל-MongoDB

ודא שיש לך חיבור תקין ל-MongoDB Atlas לפני הרצת השרת.

## פתרון בעיות

### השרת לא מתחבר
- ודא שה-MongoDB URI נכון בקובץ `.env`
- ודא שהסיסמה ב-MongoDB URI נכונה
- בדוק שה-`FRONTEND_URL` מוגדר נכון

### שגיאות CORS
- ודא ש-`FRONTEND_URL` ב-`.env` של הבקאנד מצביע על `http://localhost:5173`

### Frontend לא מתחבר ל-Backend
- ודא שהבקאנד רץ על פורט 3000
- בדוק את הקונסול בדפדפן לשגיאות רשת

