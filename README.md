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
| `PORT` | Server port (default: 5000) | No |
| `ADMIN_USERNAME` | Admin login username (default: admin) | No |
| `ADMIN_PASSWORD` | Admin login password (default: admin123) | Yes |
| `NODE_ENV` | Environment: `development` or `production` | No |

### 4. إعداد قاعدة البيانات | Set up the database

```bash
npm run db:push
```

### 5. بناء المشروع للإنتاج | Build for production

```bash
npm run build
```

### 6. تشغيل الخادم | Start the server

```bash
npm start
```

The server will start on the port specified by `PORT` (default: 5000).

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
├── dist/                 # Production build output (generated)
│   ├── index.cjs         # Bundled server
│   └── public/           # Bundled frontend
└── package.json
```

## أوامر npm | Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run db:push` | Push database schema changes |
| `npm run check` | Run TypeScript type checking |

## النشر على Hostinger | Deploying to Hostinger

### باستخدام Node.js على Hostinger | Using Hostinger Node.js Hosting

1. ادفع الكود إلى GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. في لوحة تحكم Hostinger:
   - اربط مستودع GitHub بالاستضافة
   - أضف متغيرات البيئة (`ADMIN_PASSWORD`, `NODE_ENV=production`)
   - اضبط أمر البناء: `npm install && npm run build`
   - اضبط أمر التشغيل: `npm start`
   - اضبط نقطة الدخول: `dist/index.cjs`

3. قاعدة البيانات SQLite تعمل تلقائياً (ملف `database.db` محلي)، لا حاجة لإعداد قاعدة بيانات خارجية.

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
