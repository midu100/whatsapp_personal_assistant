# Skills

## Frontend
React 19 এ কাজ করি, Vite দিয়ে project setup করি। Component গুলো functional, JavaScript এ লেখা (TypeScript নয়)। Routing এর জন্য React Router v7। UI স্টাইলিং Tailwind CSS v4 দিয়ে, design token গুলো CSS এর `@theme` block এ রাখি। Animation এর জন্য framer-motion, icon এর জন্য react-icons বা lucide-react।

## Next.js
Next.js 16 এ App Router দিয়ে কাজ করি। Server component, route group, middleware, `generateMetadata` দিয়ে SEO - এসব নিয়মিত ব্যবহার করি। SEO গুরুত্বপূর্ণ এমন project এ Next.js recommend করি, কারণ server-side rendering এ Google ভালো index করে।

## State management ও data fetching
Redux Toolkit আর RTK Query ব্যবহার করি নতুন project গুলোতে - এতে caching, auto refetch, loading state সব একসাথে পাওয়া যায়। ছোট project এ axios দিয়ে সরাসরি service layer বানাই। TanStack Query বা Zustand ব্যবহার করি না।

## Backend
Node.js এ Express 5 দিয়ে REST API বানাই। Database MongoDB, ORM হিসেবে Mongoose। Authentication এ JWT ব্যবহার করি, token httpOnly cookie তে রাখি, সাথে Bearer header fallback। Role based access control (admin/user) দিই। Password bcrypt দিয়ে hash করা হয়।

## File ও image upload
Multer দিয়ে file নিই, Cloudinary তে host করি। MongoDB তে শুধু `public_id` আর `url` রাখা হয়, ফলে image পরে delete বা replace করা সহজ হয়।

## Real-time feature
socket.io দিয়ে real-time chat, online status, live notification বানাই। WebRTC দিয়ে audio/video call signaling এর কাজও করেছি।

## Payment
বাংলাদেশি ক্লায়েন্টের জন্য SSLCommerz integrate করি (bKash, Nagad, card সব এক জায়গায়)। আন্তর্জাতিক হলে Stripe। Cash on delivery ও support করা যায়।

## আরও যা করি
Email/OTP verification (nodemailer), password reset flow, pagination, search ও filter, admin dashboard with analytics, responsive design, hosting ও domain setup, existing site এর bug fix ও performance optimization।

## AI automation ও AI-powered application
শুধু সাধারণ website নয় — AI দিয়ে কাজ স্বয়ংক্রিয় করার application ও বানাই। এটা এখন আমার কাজের একটা বড় অংশ।

যা যা বানাই: AI assistant বা chatbot যেটা WhatsApp, Messenger বা website এ বসে ক্লায়েন্টের হয়ে কথা বলে; নিজের ব্যবসার তথ্য দিয়ে শেখানো AI (RAG) যেটা শুধু আপনার তথ্য থেকেই উত্তর দেয়, বানিয়ে কিছু বলে না; document বা email থেকে তথ্য বের করে আনা; report আর content স্বয়ংক্রিয়ভাবে তৈরি; বারবার হাতে করা কাজগুলো AI দিয়ে চালিয়ে দেওয়া।

Gemini, GPT আর Claude — এই AI model গুলো ব্যবহার করি। বাংলা আর ইংরেজি দুই ভাষাতেই AI কাজ করানো যায়, voice message বুঝিয়ে দেওয়াও সম্ভব।

## Application এর ভিতরে AI assistant
আমি যেসব business application বানাই, তার প্রায় সবগুলোতেই চাইলে একটা AI assistant বসিয়ে দেওয়া যায়। এটাই আসল পার্থক্য তৈরি করে — application টা শুধু তথ্য জমা রাখে না, কাজটাও করে দেয়।

যেমন: ক্লায়েন্টের message এর উত্তর নিজে থেকে দেওয়া, নতুন lead এর তথ্য নিয়ে গুরুত্ব অনুযায়ী সাজানো, বিক্রির তথ্য দেখে সহজ ভাষায় report বলে দেওয়া, stock কমে গেলে আগেই জানিয়ে দেওয়া, invoice বা description লিখে দেওয়া, "এই মাসে সবচেয়ে বেশি কোনটা বিক্রি হয়েছে" এমন প্রশ্নের উত্তর সরাসরি দেওয়া।

এতে মালিকের সময় বাঁচে আর ব্যবসা চালানো সহজ হয় — এটাই লক্ষ্য।

## Business application (SaaS, CRM, ERP, POS)
বড় ধরনের business application নিয়েও কাজ করি:

**SaaS platform** — subscription ভিত্তিক software, multi-tenant, plan অনুযায়ী feature নিয়ন্ত্রণ, billing।
**CRM** — lead আর customer management, sales pipeline, follow-up reminder, report।
**ERP** — inventory, purchase, sales, accounts, HR ও payroll, multi-branch।
**POS** — billing, barcode, stock, দৈনিক ও মাসিক sales report, একাধিক শাখা।
**Restaurant management** — menu ও order, table booking, kitchen display, online delivery, billing।
**Booking ও marketplace platform** — Airbnb ধরনের, listing, search ও filter, calendar, payment ও commission, review।

এই প্রতিটাতেই AI assistant যোগ করা যায়।

## যেসব কাজ আমি করি না
Native Android বা iOS app (Java, Kotlin, Swift) বানাই না। শূন্য থেকে নিজের AI/ML model train করি না — তবে Gemini, GPT বা Claude এর মতো তৈরি model দিয়ে AI application বানানো আমার নিয়মিত কাজ, সেটা অবশ্যই করি। Blockchain বা smart contract এর কাজ করি না। Game development করি না। Desktop software (C#, .NET) বানাই না। WordPress theme development করি না - কেউ WordPress চাইলে সরাসরি বলে দিই এটা আমার কাজের বাইরে।
