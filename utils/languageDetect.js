// ====== ভাষা detect - bn (বাংলা script) | banglish (English script এ বাংলা) | en

const BANGLA_RANGE = /[ঀ-৿]/

// ====== Banglish এর সবচেয়ে common word গুলো
const BANGLISH_WORDS = [
    'ami',
    'tumi',
    'apni',
    'apnar',
    'amar',
    'tomar',
    'kemon',
    'kemne',
    'kivabe',
    'kibhabe',
    'koto',
    'kotot',
    'kobe',
    'keno',
    'kno',
    'ki',
    'kichu',
    'korbo',
    'korben',
    'koro',
    'kore',
    'korte',
    'lagbe',
    'lagse',
    'hobe',
    'hoise',
    'hoy',
    'ache',
    'achen',
    'nai',
    'na',
    'valo',
    'bhalo',
    'vai',
    'bhai',
    'bhaiya',
    'vaiya',
    'apa',
    'dada',
    'plz',
    'ektu',
    'ekta',
    'ekhon',
    'takar',
    'taka',
    'din',
    'diben',
    'dorkar',
    'chai',
    'chi',
    'bolen',
    'bolun',
    'janan',
    'jani',
    'jodi',
    'tahole',
    'kaj',
    'kaaj',
    'somoy',
    'somossa',
    'shomossa',
    'dhonnobad',
    'assalamu',
    'walaikum',
    // ====== আরও কিছু, যেগুলো ছাড়া অনেক বাক্য English মনে হয়
    'er',
    'ar',
    'ta',
    'tar',
    'te',
    'to',
    'toh',
    'moto',
    'motamuti',
    'thakbe',
    'thake',
    'ase',
    'ache',
    'chilo',
    'kotha',
    'bola',
    'bolte',
    'jabe',
    'jay',
    'jani',
    'ekbar',
    'ektuku',
    'kototuku',
    'kemon',
    'onek',
    'olpo',
    'aro',
    'aar',
    'sob',
    'shob',
    'kono',
    'kon',
    'kothay',
    'kake',
    'amake',
    'apnake',
    'apnara',
    'amra',
    'nite',
    'nibo',
    'niben',
    'dite',
    'dibo',
    'pari',
    'parbo',
    'parben',
    'pare',
    'chai',
    'chaile',
    'chan',
    'shuru',
    'sesh',
    'age',
    'pore',
    'porbe',
    'age',
    'kintu',
    'tobe',
    'karon',
    'jonno',
    'jonne',
    'sathe',
    'niye',
    'theke',
    'obossoi',
    'thik',
    'accha',
    'achha',
    'bujhi',
    'bujhechi',
    'bujhte',
    'dekhi',
    'dekhte',
    'dam',
    'daam',
    'khoroch',
    'poisa',
    'tk',
]

const BANGLISH_SET = new Set(BANGLISH_WORDS)

// ====== Detect Language
const detectLanguage = (text = '') => {
    if (!text || typeof text !== 'string') return 'en'

    // বাংলা script থাকলে সরাসরি bn
    if (BANGLA_RANGE.test(text)) return 'bn'

    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s']/g, ' ')
        .split(/\s+/)
        .filter(Boolean)

    if (!words.length) return 'en'

    const hits = words.filter((word) => BANGLISH_SET.has(word)).length
    const ratio = hits / words.length

    // ছোট message এ ১টা hit ই যথেষ্ট, বড় message এ ১৫% লাগবে
    if (words.length <= 4 && hits >= 1) return 'banglish'
    if (ratio >= 0.15) return 'banglish'

    return 'en'
}

// ====== Prompt এ ঢোকানোর জন্য মানুষ-পড়া নাম
const languageLabel = (lang) => {
    const map = {
        bn: 'Bangla (বাংলা script)',
        banglish: 'Banglish (Bangla language written in English letters)',
        en: 'English',
    }
    return map[lang] || map.en
}

module.exports = { detectLanguage, languageLabel }
