// ⚠️⚠️ এই ফাইলটা তোমাকে অবশ্যই বদলাতে হবে ⚠️⚠️
// নিচের সব সংখ্যা PLACEHOLDER - আমি তোমার আসল rate জানি না।
// Bot কখনো নিজের মাথা থেকে দাম বলবে না, শুধু এই ফাইল থেকেই বলবে।
// তাই এখানে ভুল থাকলে bot ভুল দাম বলবে।
//
// এটাই price এর single source of truth - pricingServices.js আর seedKnowledge.js
// দুটোই এখান থেকেই পড়ে, তাই কোথাও mismatch হওয়ার সুযোগ নেই।

const rateCard = {
    currency: 'BDT',
    currencySymbol: '৳',
    hourlyRate: 1200,
    minimumProject: 15000,
    paymentTerms: '৫০% advance, বাকি ৫০% delivery এর সময়',
    revisionPolicy: 'প্রতিটা milestone এ ২ বার free revision, এর বেশি হলে hourly rate',

    // ====== Project type wise range
    projects: {
        landing_page: {
            label: 'Landing page / Portfolio website',
            min: 15000,
            max: 30000,
            duration: '৭-১২ দিন',
            includes: ['Responsive design', 'Contact form', 'Basic SEO', 'Deployment'],
        },
        business_website: {
            label: 'Business / Company website (multi-page)',
            min: 30000,
            max: 60000,
            duration: '২-৩ সপ্তাহ',
            includes: ['৫-৮ page', 'Admin panel', 'Blog', 'SEO', 'Deployment'],
        },
        ecommerce: {
            label: 'E-commerce website (full stack)',
            min: 70000,
            max: 180000,
            duration: '৪-৮ সপ্তাহ',
            includes: [
                'Product + category management',
                'Cart & checkout',
                'Payment gateway',
                'Order management',
                'Admin dashboard',
                'User auth',
            ],
        },
        admin_dashboard: {
            label: 'Admin dashboard / Internal tool',
            min: 45000,
            max: 120000,
            duration: '৩-৬ সপ্তাহ',
            includes: ['Role based auth', 'CRUD modules', 'Charts & analytics', 'Export'],
        },
        custom_webapp: {
            label: 'Custom web application (MERN)',
            min: 80000,
            max: 250000,
            duration: '৬-১২ সপ্তাহ',
            includes: ['Custom feature set', 'Database design', 'API', 'Admin panel'],
        },
        saas: {
            label: 'SaaS platform (subscription based)',
            min: 150000,
            max: 500000,
            duration: '৮-১৬ সপ্তাহ',
            includes: [
                'Multi-tenant architecture',
                'Subscription ও billing',
                'Plan অনুযায়ী feature নিয়ন্ত্রণ',
                'User ও team management',
                'Analytics dashboard',
            ],
        },
        crm: {
            label: 'CRM (customer relationship management)',
            min: 100000,
            max: 300000,
            duration: '৬-১২ সপ্তাহ',
            includes: ['Lead ও contact management', 'Sales pipeline', 'Follow-up reminder', 'Report ও analytics'],
        },
        erp: {
            label: 'ERP (inventory, accounts, HR)',
            min: 150000,
            max: 500000,
            duration: '১০-২০ সপ্তাহ',
            includes: ['Inventory', 'Purchase ও sales', 'Accounts', 'HR ও payroll', 'Multi-branch', 'Report'],
        },
        pos: {
            label: 'POS (point of sale)',
            min: 80000,
            max: 250000,
            duration: '৫-১০ সপ্তাহ',
            includes: [
                'Billing ও invoice',
                'Barcode',
                'Stock management',
                'Daily ও monthly sales report',
                'Multi-branch',
            ],
        },
        restaurant_system: {
            label: 'Restaurant management system',
            min: 90000,
            max: 280000,
            duration: '৬-১২ সপ্তাহ',
            includes: [
                'Menu ও order management',
                'Table booking',
                'Kitchen display',
                'Online delivery',
                'Billing',
                'Sales report',
            ],
        },
        booking_platform: {
            label: 'Booking / marketplace platform (Airbnb ধরনের)',
            min: 120000,
            max: 400000,
            duration: '৮-১৬ সপ্তাহ',
            includes: [
                'Listing ও search with filter',
                'Booking ও calendar',
                'Payment ও commission',
                'Review ও rating',
                'Host আর guest এর আলাদা panel',
            ],
        },
        api_backend: {
            label: 'REST API / Backend only',
            min: 35000,
            max: 100000,
            duration: '২-৫ সপ্তাহ',
            includes: ['Express + MongoDB', 'JWT auth', 'File upload', 'API documentation'],
        },
        realtime_app: {
            label: 'Real-time app (chat / live features)',
            min: 60000,
            max: 150000,
            duration: '৪-৮ সপ্তাহ',
            includes: ['socket.io', 'Live messaging', 'Online status', 'Notification'],
        },
        ai_chatbot: {
            label: 'AI chatbot / AI assistant (WhatsApp, Messenger, website)',
            min: 50000,
            max: 150000,
            duration: '৩-৬ সপ্তাহ',
            includes: [
                'LLM integration (Gemini / GPT / Claude)',
                'নিজস্ব তথ্য দিয়ে উত্তর (RAG)',
                'বাংলা + English',
                'Conversation memory',
                'Human handover',
                'Admin panel',
            ],
        },
        ai_automation: {
            label: 'AI automation / workflow automation',
            min: 40000,
            max: 150000,
            duration: '২-৬ সপ্তাহ',
            includes: [
                'বারবার করা কাজ AI দিয়ে স্বয়ংক্রিয় করা',
                'Document/email থেকে তথ্য বের করা',
                'Report ও content তৈরি',
                'Third party API যুক্ত করা',
            ],
        },
        ai_feature: {
            label: 'চালু application এ AI feature যোগ করা',
            min: 30000,
            max: 100000,
            duration: '২-৫ সপ্তাহ',
            includes: [
                'In-app AI assistant',
                'Smart search / recommendation',
                'Auto summary, auto reply',
                'Document Q&A',
            ],
        },
        redesign: {
            label: 'Existing site redesign / revamp',
            min: 25000,
            max: 70000,
            duration: '২-৪ সপ্তাহ',
            includes: ['UI redesign', 'Responsive fix', 'Performance optimization'],
        },
        bug_fix: {
            label: 'Bug fix / ছোট কাজ',
            min: 3000,
            max: 15000,
            duration: '১-৪ দিন',
            includes: ['Issue diagnosis', 'Fix', 'Testing'],
        },
        maintenance: {
            label: 'Monthly maintenance',
            min: 8000,
            max: 20000,
            duration: 'মাসিক',
            includes: ['Bug fix', 'Small updates', 'Uptime monitoring', 'Backup'],
        },
    },

    // ====== Extra feature হলে এগুলো যোগ হয়
    addons: {
        payment_gateway: { label: 'Payment gateway (SSLCommerz / Stripe)', price: 8000 },
        multi_language: { label: 'Multi-language (বাংলা + English)', price: 6000 },
        sms_email: { label: 'SMS / Email notification', price: 5000 },
        realtime_chat: { label: 'Real-time chat', price: 15000 },
        video_call: { label: 'Video call (WebRTC)', price: 25000 },
        advanced_seo: { label: 'Advanced SEO + Next.js SSR', price: 10000 },
        analytics_dashboard: { label: 'Analytics dashboard', price: 12000 },
        third_party_api: { label: 'Third party API integration (প্রতিটি)', price: 5000 },
        hosting_setup: { label: 'Hosting + domain setup', price: 3000 },
        ai_assistant: { label: 'AI assistant / chatbot যোগ করা', price: 35000 },
        ai_knowledge_base: { label: 'নিজস্ব তথ্য দিয়ে AI কে শেখানো (RAG)', price: 20000 },
        voice_support: { label: 'Voice message বোঝা ও উত্তর', price: 12000 },
    },

    // ====== যেসব কাজ আমি নেই না
    // ⚠️ AI নিয়ে ভুল বোঝাবুঝি এড়াতে: নিজে AI model train করি না,
    //    কিন্তু existing AI model দিয়ে application বানানো আমার নিয়মিত কাজ।
    notOffered: [
        'Native Android / iOS app (Java, Kotlin, Swift)',
        'শূন্য থেকে নিজের AI/ML model train করা (কিন্তু Gemini/GPT/Claude দিয়ে AI application বানানো করি)',
        'Blockchain / smart contract',
        'Game development',
        'Desktop software (C#, .NET)',
        'WordPress theme development',
    ],
}

module.exports = rateCard
