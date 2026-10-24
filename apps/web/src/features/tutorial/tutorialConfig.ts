export const mascotAssets = {
  ahaSmirk: "/assets/mascot/abqoorFaceAhaSmirk.png",
  confused: "/assets/mascot/abqoorFaceConfused.png",
  coolRight: "/assets/mascot/AbqoorFaceCoolRight.png",
  mindBlown: "/assets/mascot/abqoorFaceMindBlown.png",
  this: "/assets/mascot/abqoorFaceThis.png"
} as const;

export type AbqoorExpression = keyof typeof mascotAssets;

export type ProductTourStep = {
  expression: AbqoorExpression;
  id: string;
  message: string;
  route: string;
  targetLabel: string;
  targetSelector: string;
  title: string;
};

export const productTourSteps: ProductTourStep[] = [
  {
    expression: "this",
    id: "welcome",
    message: "هنا مساحتك في عبقور. خطتك وتقدّمك ينتظرونك كل ما رجعت.",
    route: "/career",
    targetLabel: "ملخص خطة الدراسة",
    targetSelector: ".study-progress-plan-intro",
    title: "هلا بك"
  },
  {
    expression: "coolRight",
    id: "quantitative",
    message: "ابدأ من الكمي، وادخل الموضوع اللي يحتاج منك شغل اليوم.",
    route: "/career",
    targetLabel: "عالم الكمي",
    targetSelector: ".hub-world-force-math",
    title: "طريق الكمي"
  },
  {
    expression: "mindBlown",
    id: "verbal",
    message: "وهنا اللفظي، بمهاراته وأسئلته ومساره الخاص.",
    route: "/career",
    targetLabel: "عالم اللفظي",
    targetSelector: ".hub-world-force-verbal",
    title: "طريق اللفظي"
  },
  {
    expression: "confused",
    id: "sessions",
    message: "محتار وش تحل؟ سائل يرتّب لك جلسة سؤال وراء سؤال ويحفظ مكانك.",
    route: "/career",
    targetLabel: "سائل",
    targetSelector: ".hub-world-force-sail",
    title: "خلّها على سائل"
  },
  {
    expression: "ahaSmirk",
    id: "progress",
    message: "تابع خطتك ومستواك هنا، واعرف وش أنجزت ووين يحتاج تركيزك.",
    route: "/career",
    targetLabel: "تقدم الدراسة",
    targetSelector: ".study-progress-journey-progress",
    title: "شوف تقدّمك"
  },
  {
    expression: "this",
    id: "weak-areas",
    message: "كل غلطة لها فايدة. تلقاها في بنك الأخطاء وتراجعها لين تثبت.",
    route: "/career",
    targetLabel: "بنك الأخطاء",
    targetSelector: ".hub-world-force-errors",
    title: "حوّل ضعفك لقوة"
  }
];

export const tutorialReplayEvent = "abqoor:tutorial-replay";

export const requestTutorialReplay = () => {
  window.dispatchEvent(new Event(tutorialReplayEvent));
};
