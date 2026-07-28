export type SentenceCompletionQuestion = {
  id: string;
  type: "sentence-completion";
  category: "اكمال الجمل عام";
  parts: string[];
  answers: string[];
};

export type AnalogyQuestion = {
  id: string;
  type: "verbal-analogy";
  category: "التناظر اللفظي";
  prompt: string;
  answer: string;
};

export type OddWordQuestion = {
  id: string;
  type: "odd-word";
  category: "المفردة المختلفة";
  sentence: string;
  incorrectWord: string;
};

export type HomeQuestion =
  | SentenceCompletionQuestion
  | AnalogyQuestion
  | OddWordQuestion;

export type FloatingQuestionPlacement = {
  question: HomeQuestion;
  x: string;
  y: string;
  width: string;
  delay: string;
  duration: string;
  rotation: string;
  depth: "far" | "middle" | "near";
};

export const sentenceCompletionQuestions: SentenceCompletionQuestion[] = [
  {
    id: "sentence-1",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["من يعرف طريق الحق ", " التضحيات من أجله."],
    answers: ["هانت"]
  },
  {
    id: "sentence-2",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["عوّد نفسك على ", " فليس كل ما يقال يستحق ", ""],
    answers: ["التجاهل", "الرد"]
  },
  {
    id: "sentence-3",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["أغلق فمك قبل أن يغلق الناس ", " آذانهم"],
    answers: ["آذانهم"]
  },
  {
    id: "sentence-4",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["اتخاذ القرار الصائب ينمو ب ", " و ", ""],
    answers: ["الممارسة", "التجربة"]
  },
  {
    id: "sentence-5",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["من أيقن ب ", " جاد ب ", ""],
    answers: ["الخَلَف", "العطاء"]
  },
  {
    id: "sentence-6",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["كلمة ", " لا توجد إلا في قواميس ", ""],
    answers: ["مستحيل", "العاجزين"]
  },
  {
    id: "sentence-7",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["لا تتهاون في الأمور ", " إذا كانت قابلة ل ", ""],
    answers: ["الصغيرة", "التنامي"]
  },
  {
    id: "sentence-8",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["ثق بأن الاستقرار", "أساسي للـ ", ""],
    answers: ["محفز", "نجاح"]
  },
  {
    id: "sentence-9",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["نصف جمال الإنسان ", " فليحسن لسانه"],
    answers: ["حديثه"]
  },
  {
    id: "sentence-10",
    type: "sentence-completion",
    category: "اكمال الجمل عام",
    parts: ["لا تبادر ", " حتى يتم ", ""],
    answers: ["بالاحتفال", "الانجاز"]
  }
];

export const analogyQuestions: AnalogyQuestion[] = [
  {
    id: "analogy-1",
    type: "verbal-analogy",
    category: "التناظر اللفظي",
    prompt: "أرض : دائرة",
    answer: "ناقة : مثلث"
  },
  {
    id: "analogy-2",
    type: "verbal-analogy",
    category: "التناظر اللفظي",
    prompt: "سوق : محل",
    answer: "مدرسة : مقصف"
  },
  {
    id: "analogy-3",
    type: "verbal-analogy",
    category: "التناظر اللفظي",
    prompt: "حاجة : تدريب",
    answer: "قحط : استسقاء"
  },
  {
    id: "analogy-4",
    type: "verbal-analogy",
    category: "التناظر اللفظي",
    prompt: "الإسلام : الصلاة",
    answer: "اللغة : النحو"
  }
];

export const oddWordQuestions: OddWordQuestion[] = [
  {
    id: "odd-1",
    type: "odd-word",
    category: "المفردة المختلفة",
    sentence: "تعودت على الضوضاء حتى إن الإزعاج بدأ يثير أعصابي.",
    incorrectWord: "الإزعاج"
  },
  {
    id: "odd-2",
    type: "odd-word",
    category: "المفردة المختلفة",
    sentence: "الذي يموت يزحف ، لا يستطيع أن يطير.",
    incorrectWord: "يموت"
  },
  {
    id: "odd-3",
    type: "odd-word",
    category: "المفردة المختلفة",
    sentence: "يود الجميع أن يسير طويلاً ، لكن لا أحد يريد أن يصبح كبيرًا.",
    incorrectWord: "يسير"
  },
  {
    id: "odd-4",
    type: "odd-word",
    category: "المفردة المختلفة",
    sentence: "إن مفتاح الأمور الأعمال.",
    incorrectWord: "الأعمال"
  }
];

export const arrivalQuestionPlacements: FloatingQuestionPlacement[] = [
  {
    question: sentenceCompletionQuestions[3],
    x: "2%",
    y: "10%",
    width: "min(360px, 28vw)",
    delay: "-2.4s",
    duration: "10s",
    rotation: "-3deg",
    depth: "middle"
  },
  {
    question: analogyQuestions[0],
    x: "72%",
    y: "8%",
    width: "min(310px, 25vw)",
    delay: "-6s",
    duration: "12s",
    rotation: "2.5deg",
    depth: "far"
  },
  {
    question: oddWordQuestions[0],
    x: "70%",
    y: "66%",
    width: "min(350px, 28vw)",
    delay: "-3.8s",
    duration: "11s",
    rotation: "-2deg",
    depth: "middle"
  },
  {
    question: sentenceCompletionQuestions[0],
    x: "-3%",
    y: "68%",
    width: "min(330px, 26vw)",
    delay: "-8s",
    duration: "13s",
    rotation: "3deg",
    depth: "far"
  }
];

export const recognitionQuestionPlacements: FloatingQuestionPlacement[] = [
  {
    question: sentenceCompletionQuestions[1],
    x: "5%",
    y: "8%",
    width: "min(390px, 31vw)",
    delay: "-4s",
    duration: "12s",
    rotation: "-1.5deg",
    depth: "near"
  },
  {
    question: analogyQuestions[1],
    x: "68%",
    y: "28%",
    width: "min(330px, 27vw)",
    delay: "-7s",
    duration: "14s",
    rotation: "2deg",
    depth: "middle"
  },
  {
    question: oddWordQuestions[1],
    x: "8%",
    y: "67%",
    width: "min(350px, 28vw)",
    delay: "-1.8s",
    duration: "11s",
    rotation: "1.5deg",
    depth: "middle"
  },
  {
    question: sentenceCompletionQuestions[5],
    x: "70%",
    y: "72%",
    width: "min(360px, 29vw)",
    delay: "-9s",
    duration: "13s",
    rotation: "-2deg",
    depth: "far"
  }
];

export const transitionQuestionPlacements: FloatingQuestionPlacement[] = [
  {
    question: sentenceCompletionQuestions[6],
    x: "3%",
    y: "18%",
    width: "min(360px, 29vw)",
    delay: "-4.2s",
    duration: "13s",
    rotation: "2deg",
    depth: "far"
  },
  {
    question: analogyQuestions[2],
    x: "73%",
    y: "12%",
    width: "min(320px, 25vw)",
    delay: "-7.8s",
    duration: "11s",
    rotation: "-2.5deg",
    depth: "middle"
  },
  {
    question: oddWordQuestions[2],
    x: "68%",
    y: "68%",
    width: "min(370px, 30vw)",
    delay: "-2s",
    duration: "12s",
    rotation: "1deg",
    depth: "near"
  },
  {
    question: sentenceCompletionQuestions[8],
    x: "4%",
    y: "72%",
    width: "min(350px, 28vw)",
    delay: "-9s",
    duration: "14s",
    rotation: "-1.5deg",
    depth: "middle"
  }
];
