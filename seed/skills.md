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

## যেসব কাজ আমি করি না
Native Android বা iOS app (Java, Kotlin, Swift) বানাই না। Machine Learning বা AI model training করি না। Blockchain বা smart contract এর কাজ করি না। Game development করি না। Desktop software (C#, .NET) বানাই না। WordPress theme development করি না - কেউ WordPress চাইলে সরাসরি বলে দিই এটা আমার কাজের বাইরে।
