/**
 * The site's calculators, and what each page says about itself beyond the tool: how it
 * works, the questions people ask, and what to try next. One place, so a calculator's
 * explanation cannot drift from its neighbours' and "related tools" cannot point at a
 * page that has moved (calculators-registry.test.ts).
 *
 * The explanations restate what the code does. Change a formula in the form and change
 * its sentence here in the same commit.
 */

export interface CalculatorInfo {
  slug: string;
  path: string;
  name: string;
  blurb: string;
}

export const CALCULATORS: readonly CalculatorInfo[] = [
  { slug: 'pace-calculator', path: '/calculators/pace-calculator', name: 'Pace Calculator', blurb: 'Pace, finish time or distance from the other two.' },
  { slug: 'race-time-predictor', path: '/calculators/race-time-predictor', name: 'Race Time Predictor', blurb: 'Your 5K to marathon times from one recent race.' },
  { slug: 'heart-rate-zone-calculator', path: '/calculators/heart-rate-zone-calculator', name: 'Heart Rate Zone Calculator', blurb: 'Five training zones from your resting and maximum heart rate.' },
  { slug: 'vdot', path: '/vdot', name: 'VDOT Calculator', blurb: 'Training paces from a recent race result.' },
  { slug: 'split-time-calculator', path: '/calculators/split-time-calculator', name: 'Split Time Calculator', blurb: 'Even or elevation-adjusted splits for a target time.' },
  { slug: 'hyrox-pacer', path: '/calculators/hyrox-pacer', name: 'HYROX Pacer', blurb: 'A pacing plan for the runs and the stations.' },
  { slug: 'strength-engine-test', path: '/calculators/strength-engine-test', name: 'Strength and Engine Test', blurb: 'Whether strength or running is holding you back.' },
  { slug: 'week-planner', path: '/calculators/week-planner', name: 'Hybrid Week Planner', blurb: 'A week of running and lifting that does not clash.' },
  { slug: 'one-rep-max-calculator', path: '/calculators/one-rep-max-calculator', name: 'One-Rep Max Calculator', blurb: 'Estimate your 1RM from a set of reps.' },
  { slug: 'percentage-based-weight-calculator', path: '/calculators/percentage-based-weight-calculator', name: 'Percentage-Based Weight Calculator', blurb: 'The weight for any percentage of your 1RM.' },
  { slug: 'powerlifting-score-calculator', path: '/calculators/powerlifting-score-calculator', name: 'Powerlifting Score Calculator', blurb: 'Your DOTS or Wilks score.' },
  { slug: 'body-fat-calculator', path: '/calculators/body-fat-calculator', name: 'Body Fat Calculator', blurb: 'Body fat percentage from tape measurements.' },
  { slug: 'calorie-macronutrient-calculator', path: '/calculators/calorie-macronutrient-calculator', name: 'Calorie and Macro Calculator', blurb: 'Daily calories and macros for your goal.' },
];

export const calculatorBySlug = (slug: string): CalculatorInfo | undefined => CALCULATORS.find((c) => c.slug === slug);

export interface CalculatorGuide {
  /** Paragraphs under "How it works". */
  how: string[];
  faqs: { question: string; answer: string }[];
  /** Slugs from CALCULATORS, best next step first. */
  related: string[];
}

export const CALCULATOR_GUIDES: Record<string, CalculatorGuide> = {
  'pace-calculator': {
    how: [
      'Pace is time divided by distance. Enter any two of distance, time and pace and the calculator works out the third, in kilometres or miles.',
    ],
    faqs: [
      {
        question: 'How do I work out my running pace?',
        answer:
          'Divide your time by your distance. A 25:00 5K is 25 minutes over 5 kilometres, which is 5:00 per kilometre, or about 8:03 per mile. Enter the distance and the time and the calculator does the division.',
      },
      {
        question: 'Is pace per kilometre or per mile?',
        answer: 'Either. Choose the unit and the answer comes back in it. A mile is 1.609 kilometres, so 5:00 per kilometre is about 8:03 per mile.',
      },
      {
        question: 'Can I use it for HYROX?',
        answer: 'For the runs, yes: HYROX has eight 1 km runs. For a plan that includes the stations, use the HYROX Pacer.',
      },
    ],
    related: ['race-time-predictor', 'heart-rate-zone-calculator', 'hyrox-pacer'],
  },
  'race-time-predictor': {
    how: [
      "The predictor uses Riegel's formula: the new time is your time multiplied by (new distance ÷ your distance) to the power 1.06. The exponent is slightly above 1 because you slow a little per kilometre as the distance grows.",
      'It predicts the 5K, 10K, half marathon and marathon from one recent result.',
    ],
    faqs: [
      {
        question: 'How accurate is a race time prediction?',
        answer:
          'It is an estimate. It assumes you have trained for the longer distance as well as you did for the one you raced. A marathon predicted from a 5K is often optimistic for a runner who has not done the long runs.',
      },
      {
        question: 'Which result should I enter?',
        answer: 'A recent, all-out effort at a distance not far from your target. A recent 10K predicts a half marathon better than a 5K does.',
      },
      {
        question: 'Can it predict a HYROX finish time?',
        answer: 'No. HYROX adds eight functional stations to 8 km of running. The HYROX Pacer plans the whole race.',
      },
    ],
    related: ['vdot', 'pace-calculator', 'hyrox-pacer'],
  },
  'heart-rate-zone-calculator': {
    how: [
      'Zones use the Karvonen method, which starts from your heart rate reserve: maximum heart rate minus resting heart rate. Each zone is a band of that reserve added back to your resting rate: 50 to 60%, 60 to 70%, 70 to 80%, 80 to 90% and 90 to 100%.',
      'If you do not enter a maximum, the calculator estimates it as 220 minus your age.',
    ],
    faqs: [
      {
        question: 'What is the Karvonen formula?',
        answer:
          'Target heart rate = (maximum − resting) × intensity + resting. Because it starts from your resting rate, a fitter athlete with a lower resting heart rate gets zones that reflect it, which a plain percentage of maximum does not.',
      },
      {
        question: 'How do I find my resting heart rate?',
        answer: 'Measure it for a minute first thing in the morning, before getting up, on a few days, and use the lowest typical value.',
      },
      {
        question: 'Is 220 minus age accurate?',
        answer:
          'It is a rough rule that can be off by ten beats or more for an individual. A maximum you have measured in a hard, safe effort, or seen at the end of a race, is better: enter it if you have one.',
      },
    ],
    related: ['pace-calculator', 'vdot', 'strength-engine-test'],
  },
  'one-rep-max-calculator': {
    how: [
      'Two formulas estimate a one-rep max from a set of several reps. Epley: weight × (1 + reps ÷ 30). Brzycki: weight ÷ (1.0278 − 0.0278 × reps).',
      'They agree closely for sets of 2 to 5 reps and drift apart above about 10, so an estimate from a heavy set is more trustworthy than one from a light set.',
    ],
    faqs: [
      {
        question: 'Which formula should I use?',
        answer: 'Either is reasonable for a set of 2 to 5 reps. Epley is the default here. If you would like a range, run both and treat the difference as the uncertainty.',
      },
      {
        question: 'Is a calculated 1RM as good as testing it?',
        answer:
          'It is an estimate, and for programming it is usually enough: you can pick training weights without the risk of a maximal attempt. A true max depends on the day, your warm-up and your technique.',
      },
      {
        question: 'What do I do with the number?',
        answer: 'Use the Percentage-Based Weight Calculator to turn it into working weights for a programme.',
      },
    ],
    related: ['percentage-based-weight-calculator', 'powerlifting-score-calculator', 'strength-engine-test'],
  },
  'percentage-based-weight-calculator': {
    how: ['The weight is your one-rep max multiplied by the percentage and divided by 100, shown to two decimal places. Percentages up to 200 are accepted, for variations that go above a max.'],
    faqs: [
      {
        question: 'What percentage of my 1RM should I train at?',
        answer:
          'It depends on the goal and the programme. As a rough guide, heavy sets of 1 to 5 reps are usually programmed at about 80 to 95%, and sets of 8 to 12 at about 65 to 75%. Follow the programme you are running.',
      },
      {
        question: 'Do I round to my plates?',
        answer: 'Yes. The calculator gives the exact figure; round to the nearest load you can build, and be consistent about whether you round up or down.',
      },
      {
        question: 'Where do I get my 1RM?',
        answer: 'Test it, or estimate it from a hard set with the One-Rep Max Calculator.',
      },
    ],
    related: ['one-rep-max-calculator', 'powerlifting-score-calculator', 'week-planner'],
  },
  'powerlifting-score-calculator': {
    how: [
      'A score divides your total by a bodyweight-based coefficient, so lifters of different sizes can be compared. DOTS, the default, uses the coefficients OpenPowerlifting publishes. Wilks is the older formula from the 1990s.',
      'Both are polynomial fits that only hold for a range of bodyweights, 40 to 210 kg for men and 40 to 150 kg for women here, so outside it the calculator says so rather than give a number that means nothing.',
    ],
    faqs: [
      {
        question: 'DOTS or Wilks?',
        answer: 'DOTS was designed to correct known biases in Wilks at the extremes of bodyweight and is the one OpenPowerlifting uses. Wilks is here for comparing with older results.',
      },
      {
        question: 'What total do I enter?',
        answer: 'Your best successful squat, bench press and deadlift added together, in kilograms or pounds.',
      },
      {
        question: 'Why can two websites give slightly different scores?',
        answer: 'Different coefficient sets and rounding. The DOTS figures here are checked against published OpenPowerlifting results.',
      },
    ],
    related: ['one-rep-max-calculator', 'percentage-based-weight-calculator', 'body-fat-calculator'],
  },
  'body-fat-calculator': {
    how: [
      'The US Navy method estimates body fat from tape measurements. Men use waist, neck and height; women add the hips. The measurements go into the Hodgdon and Beckett logarithmic equations.',
      'Measure waist at the navel for men and at the narrowest point for women, hips at the widest point, and neck just below the larynx. Measure relaxed, and take each twice.',
    ],
    faqs: [
      {
        question: 'How accurate is the Navy method?',
        answer:
          'It is an estimate: usually within a few percentage points, and less reliable for some body shapes. It is most useful for tracking change over time with the same measurer and the same method.',
      },
      {
        question: 'What is a healthy body fat percentage?',
        answer: 'It varies with age, sex and sport, and no single figure suits everyone. If a result worries you, talk to a doctor or a registered dietitian.',
      },
      {
        question: 'Why does my result change between days?',
        answer: 'Small differences in where the tape sits and how tight it is change the result. Measure at the same time of day, on the same spots, without pulling the tape tight.',
      },
    ],
    related: ['calorie-macronutrient-calculator', 'powerlifting-score-calculator', 'strength-engine-test'],
  },
  'calorie-macronutrient-calculator': {
    how: [
      'Resting energy comes from the Mifflin-St Jeor equation, then is multiplied by an activity factor from 1.2 (sedentary) to 1.9 (very active) to estimate what you burn in a day.',
      'The goal adjusts it: 20% below for losing weight, 15% above for gaining muscle. Protein is set at 2.0 g per kg of bodyweight when losing weight and 1.8 g per kg otherwise, fat at 25% of calories, and carbohydrate fills the rest. The target never goes below 1,000 calories.',
    ],
    faqs: [
      {
        question: 'How accurate is it?',
        answer:
          'Equations like this are good for a starting point and can be ten percent or more out for an individual. Follow your weight and energy over two to three weeks and adjust the target up or down by a small amount.',
      },
      {
        question: 'Which activity level should I choose?',
        answer: 'Choose the one that matches your usual week, not your best one. People tend to overestimate it; if in doubt, pick the lower level.',
      },
      {
        question: 'Is this medical advice?',
        answer: 'No. If you have a medical condition, are pregnant, or have a history of disordered eating, speak to a doctor or registered dietitian before changing how you eat.',
      },
    ],
    related: ['body-fat-calculator', 'strength-engine-test', 'week-planner'],
  },
  'split-time-calculator': {
    how: [
      'Even splits divide your target time by the distance. Upload a GPX file and the calculator also asks an AI model, Google Gemini, to suggest splits that keep effort even across the climbs and descents.',
      'For that, only the route\'s distance and elevation points, your target time and the split distance are sent. The coordinates and the file itself are not. The suggestions are a guide, not a guarantee.',
    ],
    faqs: [
      {
        question: 'What are even splits?',
        answer: 'The same time for every kilometre or mile. They suit a flat course. On a hilly one, holding the same pace costs more effort uphill than down.',
      },
      {
        question: 'How does the elevation adjustment work?',
        answer: 'The AI looks at how much each split climbs or descends and shifts time towards the climbs and away from the descents, so the splits still add up to your target.',
      },
      {
        question: 'Is my GPX file stored?',
        answer: 'The file is read in your browser. Only the distance and elevation points are sent for the suggestion; see the privacy policy for how that is handled.',
      },
    ],
    related: ['pace-calculator', 'race-time-predictor', 'hyrox-pacer'],
  },
};
