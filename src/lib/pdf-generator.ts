
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyWorkout, formatDate, formatDateShort, getWeekNumber, parseLocalDate } from './training-plan-utils';

// Brand colors
const BRAND_PRIMARY = '#FF6B35'; // Accent color
const BRAND_DARK = '#1A1A1A';
const BRAND_GRAY = '#666666';
const BRAND_LIGHT_GRAY = '#F5F5F5';
const BRAND_WHITE = '#FFFFFF';

// CTA and app links
const APP_URL = 'https://app.hybridx.club/';

export interface PDFGenerationOptions {
  userName: string;
  eventName: string;
  eventDate: string;
  userEmail: string;
  programName: string;
  programDescription: string;
  workouts: DailyWorkout[];
}

// Phase definitions for section headers
const PHASES: { weekStart: number; weekEnd: number; name: string; subtitle: string }[] = [
  { weekStart: 1, weekEnd: 4, name: 'PHASE 1: BASE BUILDING', subtitle: 'Building your aerobic engine and strength foundations' },
  { weekStart: 5, weekEnd: 7, name: 'PHASE 2: BUILD', subtitle: 'Developing race-specific fitness and threshold capacity' },
  { weekStart: 8, weekEnd: 10, name: 'PHASE 3: COMPETITION PREP', subtitle: 'Sharpening for race day with simulations and race-pace work' },
  { weekStart: 11, weekEnd: 12, name: 'PHASE 4: TAPER & RACE', subtitle: 'Rest, recover, and perform' },
];

function getPhaseForWeek(week: number) {
  return PHASES.find(p => week >= p.weekStart && week <= p.weekEnd);
}

/**
 * Generate a beautifully formatted PDF training plan with HybridX CTAs
 */
export function generateTrainingPlanPDF(options: PDFGenerationOptions): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add a new page with header
  const addPageWithHeader = () => {
    doc.addPage();
    yPosition = 15;
    // Header bar
    doc.setFillColor(BRAND_PRIMARY);
    doc.rect(0, 0, pageWidth, 4, 'F');
    // Small header on subsequent pages
    doc.setFontSize(9);
    doc.setTextColor(BRAND_GRAY);
    doc.text('HybridX Club - Hyrox Training Plan', 20, yPosition);
    doc.setTextColor(BRAND_PRIMARY);
    doc.text('app.hybridx.club', pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 10;
  };

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      addPageWithHeader();
      return true;
    }
    return false;
  };

  // Helper to add footer with CTA on every page
  const addFooter = (pageNum: number) => {
    doc.setFontSize(7);
    doc.setTextColor(BRAND_GRAY);
    doc.text(
      `Page ${pageNum} | Ready for personalised programming? Join HybridX Club - app.hybridx.club`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    // Bottom accent bar
    doc.setFillColor(BRAND_PRIMARY);
    doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
  };

  // ==================== COVER PAGE ====================
  // Full-width brand accent bar at top
  doc.setFillColor(BRAND_PRIMARY);
  doc.rect(0, 0, pageWidth, 10, 'F');

  yPosition = 35;

  // Logo/Brand Name
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_PRIMARY);
  doc.text('HYBRIDX', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setFontSize(11);
  doc.setTextColor(BRAND_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('Where Hybrid Athletes Are Made', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 18;
  doc.setFontSize(16);
  doc.setTextColor(BRAND_DARK);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.userName}'s Personal`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('HYROX TRAINING PLAN', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 28;

  // Event Details Box
  doc.setFillColor(BRAND_LIGHT_GRAY);
  doc.roundedRect(20, yPosition, pageWidth - 40, 55, 3, 3, 'F');

  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(BRAND_DARK);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Race:', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 9;
  doc.setFontSize(15);
  doc.setTextColor(BRAND_PRIMARY);
  doc.text(options.eventName, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 9;
  doc.setFontSize(12);
  doc.setTextColor(BRAND_DARK);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(parseLocalDate(options.eventDate)), pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 25;
  doc.setFontSize(10);
  doc.setTextColor(BRAND_GRAY);
  doc.text(`Prepared exclusively for ${options.userName}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 25;

  // Program Description
  doc.setFontSize(11);
  doc.setTextColor(BRAND_DARK);
  const descriptionLines = doc.splitTextToSize(options.programDescription, pageWidth - 50);
  doc.text(descriptionLines, pageWidth / 2, yPosition, { align: 'center', maxWidth: pageWidth - 50 });

  yPosition += descriptionLines.length * 6 + 18;

  // Key Information Box
  doc.setDrawColor(BRAND_PRIMARY);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, yPosition, pageWidth - 40, 48, 3, 3);

  yPosition += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_DARK);
  doc.text('Training Duration: 12 Weeks (84 Days)', 30, yPosition);
  yPosition += 8;
  const dayOne = options.workouts.find((w) => w.day === 1) ?? options.workouts[0];
  doc.text(`Start Date: ${formatDate(dayOne.date)}`, 30, yPosition);
  yPosition += 8;
  doc.text(`Race Day: ${formatDate(parseLocalDate(options.eventDate))}`, 30, yPosition);
  yPosition += 8;
  doc.text('Workouts: 3-4 sessions per week', 30, yPosition);
  yPosition += 8;
  doc.text('Periodisation: Base - Build - Deload - Competition - Taper', 30, yPosition);

  // Footer on cover page
  addFooter(1);

  // ==================== PLAN OVERVIEW PAGE ====================
  addPageWithHeader();
  yPosition += 5;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_PRIMARY);
  doc.text('YOUR TRAINING PHASES', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Phase overview boxes
  PHASES.forEach((phase) => {
    checkPageBreak(35);

    doc.setFillColor(BRAND_LIGHT_GRAY);
    doc.roundedRect(20, yPosition, pageWidth - 40, 28, 2, 2, 'F');

    // Phase color bar on left
    doc.setFillColor(BRAND_PRIMARY);
    doc.rect(20, yPosition, 4, 28, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_DARK);
    doc.text(`${phase.name} (Weeks ${phase.weekStart}-${phase.weekEnd})`, 30, yPosition + 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_GRAY);
    doc.text(phase.subtitle, 30, yPosition + 20);

    yPosition += 35;
  });

  yPosition += 10;

  // Science callout box
  checkPageBreak(50);
  doc.setFillColor(BRAND_PRIMARY);
  doc.roundedRect(20, yPosition, pageWidth - 40, 45, 3, 3, 'F');

  yPosition += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_WHITE);
  doc.text('BUILT ON SCIENCE', 30, yPosition);

  yPosition += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const scienceText = 'This plan follows the 80/20 polarised training model used by elite endurance ' +
    'athletes worldwide. ~70-80% of your running is at easy, conversational pace to build your ' +
    'aerobic engine. ~20-30% is at threshold intensity - the single strongest predictor of Hyrox ' +
    'race performance (Brandt et al., 2025).';
  const scienceLines = doc.splitTextToSize(scienceText, pageWidth - 60);
  doc.text(scienceLines, 30, yPosition);

  yPosition += scienceLines.length * 5 + 15;
  addFooter(2);

  // ==================== TRAINING PLAN PAGES ====================
  addPageWithHeader();
  yPosition += 5;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_PRIMARY);
  doc.text('YOUR 12-WEEK TRAINING SCHEDULE', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  let currentWeek = 0;
  let currentPhase = '';
  let pageNum = 3;

  // Track which weeks should have CTAs
  const ctaWeeks = new Set([4, 7, 10, 12]);

  options.workouts.forEach((workout, index) => {
    const weekNumber = getWeekNumber(workout.day);
    const phase = getPhaseForWeek(weekNumber);

    // Add phase header if entering a new phase
    if (phase && phase.name !== currentPhase) {
      currentPhase = phase.name;
      checkPageBreak(25);

      if (index > 0) yPosition += 8;

      // Phase banner
      doc.setFillColor(BRAND_DARK);
      doc.roundedRect(20, yPosition, pageWidth - 40, 18, 2, 2, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_PRIMARY);
      doc.text(phase.name, 28, yPosition + 8);

      doc.setFontSize(8);
      doc.setTextColor(BRAND_WHITE);
      doc.text(phase.subtitle, 28, yPosition + 14);

      yPosition += 25;
    }

    // Add week header if we're starting a new week
    if (weekNumber !== currentWeek) {
      // Add CTA block at end of specific weeks
      if (ctaWeeks.has(currentWeek) && currentWeek > 0) {
        addCTABlock(doc, currentWeek, pageWidth, yPosition, checkPageBreak);
        yPosition += 30;
      }

      currentWeek = weekNumber;
      checkPageBreak(30);

      if (index > 0) yPosition += 5;

      // Week separator
      doc.setFillColor(BRAND_PRIMARY);
      doc.rect(20, yPosition, pageWidth - 40, 10, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`WEEK ${weekNumber}`, 25, yPosition + 7);

      // Week type label on right
      let weekLabel = '';
      if (weekNumber <= 4) weekLabel = 'Base Building';
      else if (weekNumber <= 6) weekLabel = 'Build';
      else if (weekNumber === 7) weekLabel = 'Deload Week';
      else if (weekNumber <= 10) weekLabel = 'Competition Prep';
      else weekLabel = 'Taper & Race';

      doc.setFontSize(9);
      doc.text(weekLabel, pageWidth - 25, yPosition + 7, { align: 'right' });

      yPosition += 15;
    }

    // Calculate space needed for this workout
    const exerciseCount = workout.exercises.length;
    const spaceNeeded = 25 + (exerciseCount * 8) + 30;

    checkPageBreak(spaceNeeded);

    // Day header
    doc.setFillColor(BRAND_LIGHT_GRAY);
    doc.roundedRect(20, yPosition, pageWidth - 40, 12, 2, 2, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_DARK);
    doc.text(`Day ${workout.day}`, 25, yPosition + 8);

    // Checkbox
    doc.setDrawColor(BRAND_DARK);
    doc.setLineWidth(0.3);
    doc.rect(pageWidth - 45, yPosition + 3.5, 5, 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_GRAY);
    doc.text('Done', pageWidth - 38, yPosition + 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_GRAY);
    doc.text(formatDateShort(workout.date), pageWidth / 2, yPosition + 8, { align: 'center' });

    yPosition += 15;

    // Workout title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_PRIMARY);
    doc.text(workout.workoutTitle, 25, yPosition);
    yPosition += 7;

    // Exercises
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_DARK);

    workout.exercises.forEach((exercise) => {
      checkPageBreak(12);

      // Exercise name (bold)
      doc.setFont('helvetica', 'bold');
      doc.text(`- ${exercise.name}:`, 28, yPosition);

      // Exercise details (normal)
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND_GRAY);
      const detailsX = 28 + doc.getTextWidth(`- ${exercise.name}: `) + 2;
      const maxDetailsWidth = pageWidth - detailsX - 25;
      const detailsLines = doc.splitTextToSize(exercise.details, maxDetailsWidth > 40 ? maxDetailsWidth : 80);

      // If name is too long, put details on next line
      if (detailsX > pageWidth * 0.5) {
        yPosition += 5;
        doc.text(detailsLines, 34, yPosition);
      } else {
        doc.text(detailsLines, detailsX, yPosition);
      }

      yPosition += detailsLines.length * 5;
      doc.setTextColor(BRAND_DARK);
    });

    yPosition += 4;

    // Notes Box
    checkPageBreak(25);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_DARK);
    doc.text('Notes:', 25, yPosition);

    doc.setDrawColor(BRAND_GRAY);
    doc.setLineWidth(0.2);
    doc.roundedRect(25, yPosition + 2, pageWidth - 50, 16, 2, 2);

    yPosition += 23;
    yPosition += 4;

    // Update page number tracking when page breaks occur
    const currentPage = doc.getNumberOfPages();
    if (currentPage > pageNum) {
      pageNum = currentPage;
    }
  });

  // ==================== FINAL PAGE - CTA & MOTIVATION ====================
  addPageWithHeader();
  yPosition = 40;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_PRIMARY);
  doc.text(`${options.userName.toUpperCase()}, YOU'RE READY.`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_DARK);
  const motivationText = [
    'This plan is your roadmap to the finish line.',
    'Trust the process, show up consistently, and watch yourself transform.',
    '',
    'Every champion was once a beginner who refused to give up.',
  ];
  motivationText.forEach(line => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  });

  yPosition += 15;

  // Big CTA box
  doc.setFillColor(BRAND_PRIMARY);
  doc.roundedRect(20, yPosition, pageWidth - 40, 70, 4, 4, 'F');

  yPosition += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_WHITE);
  doc.text('READY FOR THE NEXT LEVEL?', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const ctaLines = [
    'This free plan gives you a strong foundation - but every athlete is different.',
    'Join HybridX Club for personalised programming, progress tracking,',
    'expert coaching cues, and a community of hybrid athletes pushing forward.',
  ];
  ctaLines.forEach(line => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
  });

  yPosition += 5;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(APP_URL, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 30;

  // Team sign-off
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_PRIMARY);
  doc.text('See you at the finish line.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.text('- Team HybridX', pageWidth / 2, yPosition, { align: 'center' });

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i);
  }

  return doc;
}

/**
 * Add a CTA block at the end of key training weeks
 */
function addCTABlock(
  doc: jsPDF,
  weekNumber: number,
  pageWidth: number,
  yPosition: number,
  checkPageBreak: (space: number) => boolean,
) {
  checkPageBreak(35);

  const ctaMessages: Record<number, { title: string; body: string }> = {
    4: {
      title: "Phase 1 Complete - You've Built Your Base!",
      body: 'Want to track your benchmarks and see your progress over time? The HybridX app gives you detailed analytics and personalised insights. - app.hybridx.club',
    },
    7: {
      title: 'Deload Complete - Feeling Stronger?',
      body: 'The HybridX training app adapts to YOUR recovery and readiness with personalised programming that goes beyond a one-size-fits-all plan. - app.hybridx.club',
    },
    10: {
      title: "Competition Prep Done - You're Race Ready!",
      body: "After race day, what's next? Keep the momentum going with HybridX Club - structured off-season programming, community support, and coaching. - app.hybridx.club",
    },
    12: {
      title: 'You Did It!',
      body: "Your Hyrox journey doesn't end here. Join thousands of hybrid athletes training smarter with HybridX. Start your next chapter - app.hybridx.club",
    },
  };

  const cta = ctaMessages[weekNumber];
  if (!cta) return;

  doc.setDrawColor(BRAND_PRIMARY);
  doc.setLineWidth(1);
  doc.setFillColor(BRAND_LIGHT_GRAY);
  doc.roundedRect(25, yPosition, pageWidth - 50, 25, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_PRIMARY);
  doc.text(cta.title, 32, yPosition + 9);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_DARK);
  const bodyLines = doc.splitTextToSize(cta.body, pageWidth - 70);
  doc.text(bodyLines, 32, yPosition + 16);
}

/**
 * Generate and trigger download of the PDF
 */
export function downloadTrainingPlanPDF(options: PDFGenerationOptions): void {
  const pdf = generateTrainingPlanPDF(options);
  pdf.save(trainingPlanPdfFileName(options));
}

export function trainingPlanPdfFileName(options: Pick<PDFGenerationOptions, 'eventDate'>): string {
  return `HybridX-Hyrox-Training-Plan-${formatDateShort(parseLocalDate(options.eventDate))}.pdf`;
}

/** The PDF as a Blob, for a download link that still works when an automatic download is blocked. */
export function trainingPlanPdfBlob(options: PDFGenerationOptions): Blob {
  return generateTrainingPlanPDF(options).output('blob');
}
