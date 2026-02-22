# صوالحي دنت - نظام إدارة عيادة الأسنان

Sawalehi Dent - Dental Clinic Management System

## المتطلبات | Requirements

- **Node.js** v20 or later
- **npm** v9 or later

## التثبيت | Installation

### 1. استنساخ المشروع | Clone the project

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. تثبيت الاعتمادات | Install dependencies

```bash
npm install
```

### 3. إعداد متغيرات البيئة | Set up environment variables

انسخ ملف `.env.example` وقم بتعديل القيم:

```bash
cp .env.example .env
```

قم بتحرير ملف `.env` وأضف القيم الصحيحة:

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment: `development` or `production` | Yes |
| `DATABASE_URL` | SQLite database file path (e.g., file:./data/database.db) | No |
| `SESSION_SECRET` | Secret key for session encryption | Yes |
| `ADMIN_USERNAME` | Admin login username (default: admin) | No |
| `ADMIN_PASSWORD` | Admin login password | Yes |

### 4. بناء المشروع للإنتاج | Build for production

```bash
npm run build
```

### 5. تشغيل الخادم | Start the server

```bash
npm start
```

The server will start on the port specified by `PORT` (default: 3000).

## البنية | Project Structure

```
├── client/               # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui)
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities
│   └── public/           # Static assets, PWA files
├── server/               # Backend (Express)
│   ├── index.ts          # Entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   ├── db.ts             # Database connection
│   └── static.ts         # Static file serving
├── shared/               # Shared code (frontend + backend)
│   ├── schema.ts         # Database schema (Drizzle ORM)
│   └── routes.ts         # API route contracts
├── script/
│   └── build.ts          # Production build script
├── data/                 # SQLite database directory
│   └── database.db       # Database file (auto-created)
├── dist/                 # Production build output (generated)
│   ├── index.cjs         # Bundled server
│   └── public/           # Bundled frontend
├── .env.example          # Environment variables template
└── package.json
```

## أوامر npm | Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | Run TypeScript type checking |

## النشر على Hostinger Cloud | Deploying to Hostinger Cloud

### خطوات النشر | Deployment Steps

#### 1. تجهيز الملفات | Prepare files

```bash
npm install
npm run build
```

#### 2. رفع الملفات إلى Hostinger | Upload to Hostinger

ارفع الملفات التالية إلى مجلد `public_html` على Hostinger:

```
public_html/
├── dist/
│   ├── index.cjs          # Entry file
│   └── public/            # Frontend files
├── data/                  # Database directory (create manually)
├── node_modules/          # Dependencies
├── package.json
├── package-lock.json
└── .env                   # Environment variables
```

أو ارفع ملف ZIP يحتوي على كل الملفات.

#### 3. إنشاء مجلد قاعدة البيانات | Create database directory

```bash
mkdir -p /home/USER/public_html/data
```

#### 4. إعداد متغيرات البيئة | Set environment variables

في لوحة تحكم Hostinger، أضف المتغيرات التالية:

| Variable | Value |
|---|---|
| `PORT` | 3000 |
| `NODE_ENV` | production |
| `DATABASE_URL` | file:./data/database.db |
| `SESSION_SECRET` | (generate a random secret) |
| `ADMIN_PASSWORD` | (your admin password) |

#### 5. إعداد التطبيق على Hostinger Cloud | Configure on Hostinger

- **Build command**: `npm install && npm run build`
- **Entry file**: `dist/index.cjs`
- **Node.js version**: 20

#### 6. تأكد من التالي | Verify

- مجلد `data` موجود داخل `public_html`
- متغيرات البيئة مضافة بشكل صحيح
- Entry file يشير إلى `dist/index.cjs`

## الميزات | Features

- إدارة المرضى وسجلاتهم الطبية
- جدولة المواعيد بنظام التقويم
- تتبع المدفوعات بعملات متعددة
- التقارير المالية (يومية / أسبوعية / شهرية)
- إدارة المصاريف مع فئات قابلة للتخصيص
- سجل العمليات اليومي
- ملاحظات العلاج وتاريخ المتابعة
- قوالب WhatsApp قابلة للتخصيص
- إدارة الملفات والصور الطبية
- نظام المصادقة مع صلاحيات حسب الدور
- دعم PWA للتثبيت على الهاتف
- واجهة عربية كاملة مع دعم RTL

## التقنيات | Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Vite
- **Backend**: Node.js, Express 5, TypeScript
- **Database**: SQLite (better-sqlite3), Drizzle ORM
- **Auth**: Session-based with bcrypt password hashing
