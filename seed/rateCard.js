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
    },

    // ====== যেসব কাজ আমি নেই না
    notOffered: [
        'Native Android / iOS app (Java, Kotlin, Swift)',
        'Machine Learning / AI model training',
        'Blockchain / smart contract',
        'Game development',
        'Desktop software (C#, .NET)',
        'WordPress theme development',
    ],
}

module.exports = rateCard
