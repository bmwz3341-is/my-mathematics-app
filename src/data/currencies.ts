export interface Currency {
  code: string;
  name: string;
  flag: string;
  flagCode: string;
}

export const currencies: Currency[] = [
  { code: "USD", name: "דולר אמריקאי", flag: "🇺🇸", flagCode: "us" },
  { code: "EUR", name: "יורו", flag: "🇪🇺", flagCode: "eu" },
  { code: "GBP", name: "לירה שטרלינג", flag: "🇬🇧", flagCode: "gb" },
  { code: "ILS", name: "שקל חדש", flag: "🇮🇱", flagCode: "il" },
  { code: "JPY", name: "ין יפני", flag: "🇯🇵", flagCode: "jp" },
  { code: "CHF", name: "פרנק שוויצרי", flag: "🇨🇭", flagCode: "ch" },
  { code: "CAD", name: "דולר קנדי", flag: "🇨🇦", flagCode: "ca" },
  { code: "AUD", name: "דולר אוסטרלי", flag: "🇦🇺", flagCode: "au" },
  { code: "CNY", name: "יואן סיני", flag: "🇨🇳", flagCode: "cn" },
  { code: "INR", name: "רופי הודי", flag: "🇮🇳", flagCode: "in" },
  { code: "BRL", name: "ריאל ברזילאי", flag: "🇧🇷", flagCode: "br" },
  { code: "ZAR", name: "ראנד דרום אפריקני", flag: "🇿🇦", flagCode: "za" },
  { code: "SEK", name: "קרונה שוודית", flag: "🇸🇪", flagCode: "se" },
  { code: "NOK", name: "קרונה נורווגית", flag: "🇳🇴", flagCode: "no" },
  { code: "DKK", name: "קרונה דנית", flag: "🇩🇰", flagCode: "dk" },
  { code: "PLN", name: "זלוטי פולני", flag: "🇵🇱", flagCode: "pl" },
  { code: "TRY", name: "לירה טורקית", flag: "🇹🇷", flagCode: "tr" },
  { code: "MXN", name: "פזו מקסיקני", flag: "🇲🇽", flagCode: "mx" },
  { code: "SGD", name: "דולר סינגפורי", flag: "🇸🇬", flagCode: "sg" },
  { code: "HKD", name: "דולר הונג קונגי", flag: "🇭🇰", flagCode: "hk" },
  { code: "NZD", name: "דולר ניו זילנדי", flag: "🇳🇿", flagCode: "nz" },
  { code: "KRW", name: "וון דרום קוריאני", flag: "🇰🇷", flagCode: "kr" },
];
