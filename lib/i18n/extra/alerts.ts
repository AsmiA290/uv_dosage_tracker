import type { Locale } from "../config";

/**
 * Strings for session alerts (pop-up notifications), kept in their own small
 * module so the main dictionaries stay unchanged. Translations were produced
 * with an AI assistant and reviewed by the author; see README.
 */
export interface AlertMessages {
  reapplyTitle: string;
  reapplyBody: string;
  budgetLowTitle: string;
  budgetLowBody: string;
  thresholdTitle: string;
  thresholdBody: string;
  workTitle: string;
  workBody: string;
  enableTitle: string;
  enableBody: string;
  enableButton: string;
  enabled: string;
  blocked: string;
  unsupported: string;
  iosHint: string;
  dismiss: string;
}

export const ALERT_MESSAGES: Record<Locale, AlertMessages> = {
  en: {
    reapplyTitle: "Time to reapply sunscreen",
    reapplyBody: "About half of your last application has likely worn off.",
    budgetLowTitle: "Burn budget running low",
    budgetLowBody: "About three quarters of today's burn budget is used. Plan to find shade soon.",
    thresholdTitle: "Burn threshold reached",
    thresholdBody: "You may have reached your sunburn threshold. Head to shade and cover up.",
    workTitle: "Daily work UV limit reached",
    workBody: "Today's UV on your skin has reached the international limit for outdoor workers.",
    enableTitle: "Get alerts while you work",
    enableBody:
      "The app can notify you when it is time to reapply sunscreen or seek shade. Alerts work while the app is open or running in the background.",
    enableButton: "Turn on alerts",
    enabled: "Alerts are on",
    blocked: "Alerts are blocked in your browser settings.",
    unsupported: "This browser does not support alerts.",
    iosHint: "On iPhone, add the app to your Home Screen first.",
    dismiss: "Dismiss",
  },
  es: {
    reapplyTitle: "Es hora de volver a aplicar protector solar",
    reapplyBody: "Es probable que ya se haya ido cerca de la mitad de la última capa.",
    budgetLowTitle: "Te queda poco presupuesto de quemadura",
    budgetLowBody: "Ya usaste cerca de tres cuartas partes del presupuesto de quemadura de hoy. Busca sombra pronto.",
    thresholdTitle: "Umbral de quemadura alcanzado",
    thresholdBody: "Es posible que hayas alcanzado tu umbral de quemadura solar. Ve a la sombra y cúbrete.",
    workTitle: "Límite diario de UV en el trabajo alcanzado",
    workBody: "La UV de hoy sobre tu piel alcanzó el límite internacional para trabajadores al aire libre.",
    enableTitle: "Recibe alertas mientras trabajas",
    enableBody:
      "La app puede avisarte cuando sea hora de volver a aplicar protector solar o de buscar sombra. Las alertas funcionan mientras la app está abierta o en segundo plano.",
    enableButton: "Activar alertas",
    enabled: "Las alertas están activadas",
    blocked: "Las alertas están bloqueadas en la configuración del navegador.",
    unsupported: "Este navegador no admite alertas.",
    iosHint: "En iPhone, primero agrega la app a tu pantalla de inicio.",
    dismiss: "Cerrar",
  },
  pl: {
    reapplyTitle: "Czas ponownie nałożyć filtr przeciwsłoneczny",
    reapplyBody: "Prawdopodobnie starła się już około połowa ostatniej warstwy.",
    budgetLowTitle: "Kończy się budżet oparzeniowy",
    budgetLowBody: "Wykorzystano około trzech czwartych dzisiejszego budżetu oparzeniowego. Wkrótce poszukaj cienia.",
    thresholdTitle: "Osiągnięto próg oparzenia",
    thresholdBody: "Możliwe, że osiągnięto próg oparzenia słonecznego. Przejdź do cienia i zakryj skórę.",
    workTitle: "Osiągnięto dzienny limit UV w pracy",
    workBody: "Dzisiejsze promieniowanie UV na skórze osiągnęło międzynarodowy limit dla pracowników na zewnątrz.",
    enableTitle: "Otrzymuj alerty podczas pracy",
    enableBody:
      "Aplikacja może powiadomić, gdy trzeba ponownie nałożyć filtr lub poszukać cienia. Alerty działają, gdy aplikacja jest otwarta lub działa w tle.",
    enableButton: "Włącz alerty",
    enabled: "Alerty są włączone",
    blocked: "Alerty są zablokowane w ustawieniach przeglądarki.",
    unsupported: "Ta przeglądarka nie obsługuje alertów.",
    iosHint: "Na iPhonie najpierw dodaj aplikację do ekranu początkowego.",
    dismiss: "Zamknij",
  },
  zh: {
    reapplyTitle: "该补涂防晒霜了",
    reapplyBody: "上次涂抹的防晒霜可能已脱落约一半。",
    budgetLowTitle: "晒伤预算即将用完",
    budgetLowBody: "今天的晒伤预算已用掉约四分之三。请尽快寻找阴凉处。",
    thresholdTitle: "已达到晒伤阈值",
    thresholdBody: "你可能已达到晒伤阈值。请到阴凉处并遮盖皮肤。",
    workTitle: "已达到每日工作 UV 限值",
    workBody: "今天照到你皮肤上的 UV 已达到户外工作者的国际限值。",
    enableTitle: "工作时接收提醒",
    enableBody: "当需要补涂防晒霜或寻找阴凉时，应用可以提醒你。应用打开或在后台运行时，提醒均可使用。",
    enableButton: "开启提醒",
    enabled: "提醒已开启",
    blocked: "提醒已在浏览器设置中被阻止。",
    unsupported: "此浏览器不支持提醒。",
    iosHint: "在 iPhone 上，请先将应用添加到主屏幕。",
    dismiss: "关闭",
  },
  tl: {
    reapplyTitle: "Oras na para muling maglagay ng sunscreen",
    reapplyBody: "Malamang nabura na ang halos kalahati ng huling inilagay mo.",
    budgetLowTitle: "Paubos na ang burn budget mo",
    budgetLowBody: "Halos tatlong-kapat na ng burn budget mo ngayong araw ang nagamit. Humanap agad ng lilim.",
    thresholdTitle: "Naabot na ang burn threshold",
    thresholdBody: "Maaaring naabot mo na ang iyong sunburn threshold. Pumunta sa lilim at takpan ang balat.",
    workTitle: "Naabot na ang pang-araw-araw na UV limit sa trabaho",
    workBody: "Ang UV sa balat mo ngayong araw ay umabot na sa internasyonal na limit para sa mga manggagawa sa labas.",
    enableTitle: "Tumanggap ng mga alerto habang nagtatrabaho",
    enableBody:
      "Maaabisuhan ka ng app kapag oras nang muling maglagay ng sunscreen o humanap ng lilim. Gumagana ang mga alerto habang bukas ang app o tumatakbo sa background.",
    enableButton: "I-on ang mga alerto",
    enabled: "Naka-on ang mga alerto",
    blocked: "Naka-block ang mga alerto sa settings ng browser mo.",
    unsupported: "Hindi sinusuportahan ng browser na ito ang mga alerto.",
    iosHint: "Sa iPhone, idagdag muna ang app sa Home Screen.",
    dismiss: "Isara",
  },
  ar: {
    reapplyTitle: "حان وقت إعادة وضع واقي الشمس",
    reapplyBody: "من المرجح أن نحو نصف الطبقة الأخيرة قد زال.",
    budgetLowTitle: "رصيد الحروق يوشك على النفاد",
    budgetLowBody: "استُخدم نحو ثلاثة أرباع رصيد الحروق لهذا اليوم. ابحث عن الظل قريبًا.",
    thresholdTitle: "تم بلوغ عتبة الحروق",
    thresholdBody: "ربما بلغت عتبة حروق الشمس. انتقل إلى الظل وغطِّ بشرتك.",
    workTitle: "تم بلوغ الحد اليومي للأشعة UV في العمل",
    workBody: "بلغت الأشعة UV على بشرتك اليوم الحد الدولي للعاملين في الهواء الطلق.",
    enableTitle: "احصل على تنبيهات أثناء العمل",
    enableBody:
      "يمكن للتطبيق تنبيهك عندما يحين وقت إعادة وضع واقي الشمس أو البحث عن الظل. تعمل التنبيهات أثناء فتح التطبيق أو تشغيله في الخلفية.",
    enableButton: "تفعيل التنبيهات",
    enabled: "التنبيهات مفعّلة",
    blocked: "التنبيهات محظورة في إعدادات المتصفح.",
    unsupported: "هذا المتصفح لا يدعم التنبيهات.",
    iosHint: "على iPhone، أضف التطبيق أولًا إلى الشاشة الرئيسية.",
    dismiss: "إغلاق",
  },
  uk: {
    reapplyTitle: "Час повторно нанести сонцезахисний засіб",
    reapplyBody: "Імовірно, близько половини останнього шару вже стерлося.",
    budgetLowTitle: "Бюджет до опіку закінчується",
    budgetLowBody: "Використано близько трьох чвертей сьогоднішнього бюджету до опіку. Незабаром знайдіть тінь.",
    thresholdTitle: "Досягнуто порогу опіку",
    thresholdBody: "Можливо, ви досягли порогу сонячного опіку. Перейдіть у тінь і прикрийте шкіру.",
    workTitle: "Досягнуто денного ліміту UV на роботі",
    workBody: "Сьогоднішнє UV-опромінення вашої шкіри досягло міжнародного ліміту для працівників просто неба.",
    enableTitle: "Отримуйте сповіщення під час роботи",
    enableBody:
      "Застосунок може сповістити, коли час повторно нанести засіб або знайти тінь. Сповіщення працюють, коли застосунок відкритий або працює у фоні.",
    enableButton: "Увімкнути сповіщення",
    enabled: "Сповіщення увімкнено",
    blocked: "Сповіщення заблоковано в налаштуваннях браузера.",
    unsupported: "Цей браузер не підтримує сповіщення.",
    iosHint: "На iPhone спершу додайте застосунок на початковий екран.",
    dismiss: "Закрити",
  },
  hi: {
    reapplyTitle: "सनस्क्रीन दोबारा लगाने का समय",
    reapplyBody: "पिछली बार लगाई गई परत का लगभग आधा हिस्सा शायद उतर चुका है।",
    budgetLowTitle: "सनबर्न बजट कम हो रहा है",
    budgetLowBody: "आज के सनबर्न बजट का लगभग तीन-चौथाई हिस्सा इस्तेमाल हो चुका है। जल्द ही छाया में जाएँ।",
    thresholdTitle: "सनबर्न सीमा तक पहुँच गए",
    thresholdBody: "हो सकता है आप अपनी सनबर्न सीमा तक पहुँच गए हों। छाया में जाएँ और त्वचा ढकें।",
    workTitle: "काम पर दैनिक UV सीमा पूरी हुई",
    workBody: "आज आपकी त्वचा पर पड़ी UV बाहर काम करने वालों की अंतरराष्ट्रीय सीमा तक पहुँच गई है।",
    enableTitle: "काम करते समय अलर्ट पाएँ",
    enableBody:
      "जब सनस्क्रीन दोबारा लगाने या छाया में जाने का समय हो, तो ऐप आपको सूचित कर सकता है। ऐप खुला हो या पृष्ठभूमि में चल रहा हो, तब अलर्ट काम करते हैं।",
    enableButton: "अलर्ट चालू करें",
    enabled: "अलर्ट चालू हैं",
    blocked: "आपके ब्राउज़र की सेटिंग में अलर्ट बंद हैं।",
    unsupported: "यह ब्राउज़र अलर्ट का समर्थन नहीं करता।",
    iosHint: "iPhone पर, पहले ऐप को होम स्क्रीन पर जोड़ें।",
    dismiss: "बंद करें",
  },
  gu: {
    reapplyTitle: "સનસ્ક્રીન ફરી લગાવવાનો સમય",
    reapplyBody: "છેલ્લે લગાવેલા સ્તરનો લગભગ અડધો ભાગ કદાચ ઉતરી ગયો છે.",
    budgetLowTitle: "સનબર્ન બજેટ ઓછું થઈ રહ્યું છે",
    budgetLowBody: "આજના સનબર્ન બજેટનો લગભગ ત્રણ-ચતુર્થાંશ ભાગ વપરાઈ ગયો છે. જલ્દી છાંયડો શોધો.",
    thresholdTitle: "સનબર્નની મર્યાદા સુધી પહોંચ્યા",
    thresholdBody: "તમે કદાચ સનબર્નની મર્યાદા સુધી પહોંચી ગયા છો. છાંયડામાં જાઓ અને ત્વચા ઢાંકો.",
    workTitle: "કામ પર દૈનિક UV મર્યાદા પૂરી થઈ",
    workBody: "આજે તમારી ત્વચા પર પડેલું UV બહાર કામ કરતા લોકો માટેની આંતરરાષ્ટ્રીય મર્યાદા સુધી પહોંચી ગયું છે.",
    enableTitle: "કામ કરતી વખતે ચેતવણીઓ મેળવો",
    enableBody:
      "સનસ્ક્રીન ફરી લગાવવાનો કે છાંયડો શોધવાનો સમય થાય ત્યારે ઍપ તમને જણાવી શકે છે. ઍપ ખુલ્લી હોય અથવા પૃષ્ઠભૂમિમાં ચાલતી હોય ત્યારે ચેતવણીઓ કામ કરે છે.",
    enableButton: "ચેતવણીઓ ચાલુ કરો",
    enabled: "ચેતવણીઓ ચાલુ છે",
    blocked: "તમારા બ્રાઉઝરની સેટિંગ્સમાં ચેતવણીઓ બંધ છે.",
    unsupported: "આ બ્રાઉઝર ચેતવણીઓને સપોર્ટ કરતું નથી.",
    iosHint: "iPhone પર, પહેલા ઍપને હોમ સ્ક્રીન પર ઉમેરો.",
    dismiss: "બંધ કરો",
  },
  ru: {
    reapplyTitle: "Пора повторно нанести солнцезащитное средство",
    reapplyBody: "Вероятно, около половины последнего слоя уже стёрлось.",
    budgetLowTitle: "Бюджет до ожога заканчивается",
    budgetLowBody: "Использовано около трёх четвертей сегодняшнего бюджета до ожога. Скоро найдите тень.",
    thresholdTitle: "Достигнут порог ожога",
    thresholdBody: "Возможно, вы достигли порога солнечного ожога. Перейдите в тень и прикройте кожу.",
    workTitle: "Достигнут дневной лимит UV на работе",
    workBody: "Сегодняшнее UV-облучение вашей кожи достигло международного лимита для работников на открытом воздухе.",
    enableTitle: "Получайте уведомления во время работы",
    enableBody:
      "Приложение может напомнить, когда пора повторно нанести средство или найти тень. Уведомления работают, когда приложение открыто или работает в фоне.",
    enableButton: "Включить уведомления",
    enabled: "Уведомления включены",
    blocked: "Уведомления заблокированы в настройках браузера.",
    unsupported: "Этот браузер не поддерживает уведомления.",
    iosHint: "На iPhone сначала добавьте приложение на экран «Домой».",
    dismiss: "Закрыть",
  },
  ko: {
    reapplyTitle: "자외선 차단제를 다시 바를 시간입니다",
    reapplyBody: "지난번에 바른 양의 약 절반이 이미 지워졌을 가능성이 큽니다.",
    budgetLowTitle: "화상 예산이 얼마 남지 않았습니다",
    budgetLowBody: "오늘 화상 예산의 약 4분의 3을 사용했습니다. 곧 그늘을 찾으세요.",
    thresholdTitle: "화상 기준치에 도달했습니다",
    thresholdBody: "일광화상 기준치에 도달했을 수 있습니다. 그늘로 가서 피부를 가리세요.",
    workTitle: "작업 중 일일 UV 한도에 도달했습니다",
    workBody: "오늘 피부에 닿은 UV가 야외 근로자를 위한 국제 한도에 도달했습니다.",
    enableTitle: "일하는 동안 알림 받기",
    enableBody:
      "자외선 차단제를 다시 바르거나 그늘을 찾아야 할 때 앱이 알려 줄 수 있습니다. 알림은 앱이 열려 있거나 백그라운드에서 실행 중일 때 작동합니다.",
    enableButton: "알림 켜기",
    enabled: "알림이 켜져 있습니다",
    blocked: "브라우저 설정에서 알림이 차단되어 있습니다.",
    unsupported: "이 브라우저는 알림을 지원하지 않습니다.",
    iosHint: "iPhone에서는 먼저 앱을 홈 화면에 추가하세요.",
    dismiss: "닫기",
  },
};

export function alertMessages(locale: Locale): AlertMessages {
  return ALERT_MESSAGES[locale] ?? ALERT_MESSAGES.en;
}
