import { StaffMember, Operatory, DentalService, Appointment, WaitlistEntry } from '../types/scheduler';

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'dr-julian-aris',
    name: 'Dr. Julian Aris',
    role: 'Principal Surgeon',
    qualifications: 'BDS (Hons), MFDS RCS (Eng), MOralSurg, Cert Implantology',
    colorCode: '#0D9488', // Surgical Teal
    shifts: {
      mon: { startMinute: 510, endMinute: 990 }, // 08:30 - 16:30
      tue: { startMinute: 510, endMinute: 990 },
      wed: { startMinute: 510, endMinute: 990 },
      thu: { startMinute: 510, endMinute: 990 },
      fri: { startMinute: 510, endMinute: 990 },
      sat: { startMinute: 540, endMinute: 840 }, // Saturday half-day optional
      sun: { startMinute: 510, endMinute: 990 }, // Keep active for today's demo
    },
    breaks: {
      mon: [{ startMinute: 750, endMinute: 810, label: 'Surgical Decontamination & Lunch' }], // 12:30 - 13:30
      tue: [{ startMinute: 750, endMinute: 810, label: 'Surgical Decontamination & Lunch' }],
      wed: [{ startMinute: 750, endMinute: 810, label: 'Surgical Decontamination & Lunch' }],
      thu: [{ startMinute: 750, endMinute: 810, label: 'Surgical Decontamination & Lunch' }],
      fri: [{ startMinute: 750, endMinute: 810, label: 'Surgical Decontamination & Lunch' }],
      sat: [{ startMinute: 690, endMinute: 720, label: 'Clinical Break' }],
      sun: [{ startMinute: 750, endMinute: 810, label: 'Surgical Decontamination & Lunch' }],
    },
  },
  {
    id: 'dr-elena-chen',
    name: 'Dr. Elena Chen',
    role: 'Cosmetic Dentist',
    qualifications: 'BDS (Brist), MSc Aesthetic & Restorative Dentistry, Invisalign Platinum Provider',
    colorCode: '#8B5CF6', // Aesthetic Lavender/Violet
    shifts: {
      mon: { startMinute: 540, endMinute: 1050 }, // 09:00 - 17:30
      tue: { startMinute: 540, endMinute: 1050 },
      wed: { startMinute: 540, endMinute: 1050 },
      thu: { startMinute: 540, endMinute: 1050 },
      fri: { startMinute: 540, endMinute: 1050 },
      sat: { startMinute: 540, endMinute: 900 },
      sun: { startMinute: 540, endMinute: 1050 },
    },
    breaks: {
      mon: [{ startMinute: 780, endMinute: 840, label: 'Lunch Break & Case Review' }], // 13:00 - 14:00
      tue: [{ startMinute: 780, endMinute: 840, label: 'Lunch Break & Case Review' }],
      wed: [{ startMinute: 780, endMinute: 840, label: 'Lunch Break & Case Review' }],
      thu: [{ startMinute: 780, endMinute: 840, label: 'Lunch Break & Case Review' }],
      fri: [{ startMinute: 780, endMinute: 840, label: 'Lunch Break & Case Review' }],
      sat: [{ startMinute: 720, endMinute: 750, label: 'Lunch Break' }],
      sun: [{ startMinute: 780, endMinute: 840, label: 'Lunch Break & Case Review' }],
    },
  },
  {
    id: 'maya-lin',
    name: 'Maya Lin',
    role: 'Dental Hygienist',
    qualifications: 'RDH, BSc Oral Health Science, Dip Dent Hygiene & Therapy',
    colorCode: '#0284C7', // Clinic Blue
    shifts: {
      mon: { startMinute: 480, endMinute: 960 }, // 08:00 - 16:00
      tue: { startMinute: 480, endMinute: 960 },
      wed: { startMinute: 480, endMinute: 960 },
      thu: { startMinute: 480, endMinute: 960 },
      fri: { startMinute: 480, endMinute: 960 },
      sat: { startMinute: 480, endMinute: 840 },
      sun: { startMinute: 480, endMinute: 960 },
    },
    breaks: {
      mon: [{ startMinute: 720, endMinute: 780, label: 'Autoclave Sterilisation & Lunch' }], // 12:00 - 13:00
      tue: [{ startMinute: 720, endMinute: 780, label: 'Autoclave Sterilisation & Lunch' }],
      wed: [{ startMinute: 720, endMinute: 780, label: 'Autoclave Sterilisation & Lunch' }],
      thu: [{ startMinute: 720, endMinute: 780, label: 'Autoclave Sterilisation & Lunch' }],
      fri: [{ startMinute: 720, endMinute: 780, label: 'Autoclave Sterilisation & Lunch' }],
      sat: [{ startMinute: 660, endMinute: 690, label: 'Lunch Break' }],
      sun: [{ startMinute: 720, endMinute: 780, label: 'Autoclave Sterilisation & Lunch' }],
    },
  },
];

export const INITIAL_OPERATORIES: Operatory[] = [
  {
    id: 'suite-1',
    name: 'Surgical Suite 1 (HEPA / Surgical Cart)',
    type: 'surgical',
    chairModel: 'A-dec 500 Surgical Dental Chair & Led Sterilization Unit',
  },
  {
    id: 'suite-2',
    name: 'Operatory Suite 2 (Aesthetic & Laser Ready)',
    type: 'general',
    chairModel: 'Belmont Eurus S6 Ambience with Diode Laser Module',
  },
  {
    id: 'bay-a',
    name: 'Hygiene Bay A (Ultrasonic Cavitron)',
    type: 'hygiene',
    chairModel: 'Planmeca Compact i5 Hygiene Edition with Prophy-Jet',
  },
];

export const DENTAL_SERVICES: DentalService[] = [
  // Preventative
  {
    id: 'prev-1',
    name: 'Routine Scale & Polish',
    branch: 'Preventative',
    durationMinutes: 40,
    cleanupBufferMinutes: 10,
    allowedStaffIds: ['maya-lin', 'dr-elena-chen'],
    requiredOperatoryType: 'hygiene',
    description: 'Supra/subgingival ultrasonic plaque and calculus debridement, prophy-paste polishing and topical fluoride glaze.',
  },
  {
    id: 'prev-2',
    name: 'Comprehensive Periodontal Therapy',
    branch: 'Preventative',
    durationMinutes: 60,
    cleanupBufferMinutes: 15,
    allowedStaffIds: ['maya-lin'],
    requiredOperatoryType: 'hygiene',
    description: 'Deep root surface debridement, pocket irrigation with antimicrobial chlorhexidine and six-point periodontal charting.',
  },
  {
    id: 'prev-3',
    name: 'Clinical Oral Exam & Digital 3D OPG',
    branch: 'Preventative',
    durationMinutes: 30,
    cleanupBufferMinutes: 10,
    allowedStaffIds: ['dr-elena-chen', 'dr-julian-aris'],
    requiredOperatoryType: 'general',
    description: 'Comprehensive dental charting, intraoral HD camera scan, low-dose digital bitewings, and soft-tissue oncological screening.',
  },

  // Restorative
  {
    id: 'rest-1',
    name: 'Composite Nano-Hybrid Restoration',
    branch: 'Restorative',
    durationMinutes: 50,
    cleanupBufferMinutes: 15,
    allowedStaffIds: ['dr-elena-chen', 'dr-julian-aris'],
    requiredOperatoryType: 'general',
    description: 'Biomimetic multilayer anterior/posterior composite restoration under rubber dam isolation and occlusion alignment.',
  },
  {
    id: 'rest-2',
    name: 'Ceramic Crown Prep & Digital Scan',
    branch: 'Restorative',
    durationMinutes: 90,
    cleanupBufferMinutes: 20,
    allowedStaffIds: ['dr-elena-chen'],
    requiredOperatoryType: 'general',
    description: 'Diamond rotary chamfer preparation, optical intraoral 3D scan for CAD/CAM zirconia crown, and chairside provisionalization.',
  },
  {
    id: 'rest-3',
    name: 'Rotary Molar Endodontics (Root Canal)',
    branch: 'Restorative',
    durationMinutes: 75,
    cleanupBufferMinutes: 20,
    allowedStaffIds: ['dr-julian-aris', 'dr-elena-chen'],
    requiredOperatoryType: 'general',
    description: 'Surgical microscope-assisted chemo-mechanical shaping, warm vertical gutta-percha compaction, and glass ionomer coronal seal.',
  },

  // Cosmetic
  {
    id: 'cosm-1',
    name: 'In-Office Medical Diode Laser Whitening',
    branch: 'Cosmetic',
    durationMinutes: 60,
    cleanupBufferMinutes: 15,
    allowedStaffIds: ['dr-elena-chen', 'maya-lin'],
    requiredOperatoryType: 'general',
    description: 'Hydrogen peroxide gel photo-activation using diode laser frequency with desensitizing nano-hydroxyapatite finish.',
  },
  {
    id: 'cosm-2',
    name: 'Porcelain Veneer Smile Consultation & Prep',
    branch: 'Cosmetic',
    durationMinutes: 90,
    cleanupBufferMinutes: 20,
    allowedStaffIds: ['dr-elena-chen'],
    requiredOperatoryType: 'general',
    description: 'Minimally-invasive labial enamel reduction, diagnostic wax-up mock-up transfer, and spectrophotometric digital shade matching.',
  },
  {
    id: 'cosm-3',
    name: 'Direct Aesthetic Edge Bonding',
    branch: 'Cosmetic',
    durationMinutes: 60,
    cleanupBufferMinutes: 15,
    allowedStaffIds: ['dr-elena-chen'],
    requiredOperatoryType: 'general',
    description: 'Freehand polychromatic composite layering to correct diastemas, incisal chips, and anatomical asymmetry.',
  },

  // Orthodontic
  {
    id: 'orth-1',
    name: 'Clear Aligner Assessment & 3D ClinCheck',
    branch: 'Orthodontic',
    durationMinutes: 45,
    cleanupBufferMinutes: 10,
    allowedStaffIds: ['dr-elena-chen'],
    requiredOperatoryType: 'general',
    description: 'High-speed intraoral scanner arch capture, cephalometric staging analysis, and digital tooth movement trajectory simulation.',
  },
  {
    id: 'orth-2',
    name: 'Aligner Attachment Bonding & First Seating',
    branch: 'Orthodontic',
    durationMinutes: 50,
    cleanupBufferMinutes: 15,
    allowedStaffIds: ['dr-elena-chen'],
    requiredOperatoryType: 'general',
    description: 'Precision composite attachment template transfer, interproximal reduction (IPR) if prescribed, and patient insertion training.',
  },
  {
    id: 'orth-3',
    name: 'Orthodontic Tracking Review & Refinement',
    branch: 'Orthodontic',
    durationMinutes: 30,
    cleanupBufferMinutes: 10,
    allowedStaffIds: ['dr-elena-chen'],
    requiredOperatoryType: 'general',
    description: 'Evaluation of tooth movement compliance, auxiliary elastic reassessment, and refinement scanning.',
  },

  // Facial Surgery
  {
    id: 'surg-1',
    name: 'Surgical Wisdom Tooth Impaction Extraction',
    branch: 'Facial Surgery',
    durationMinutes: 60,
    cleanupBufferMinutes: 25,
    allowedStaffIds: ['dr-julian-aris'],
    requiredOperatoryType: 'surgical',
    description: 'Sterile surgical mucoperiosteal flap, bone troughing osteotomy, tooth sectioning, socket curettage, and vicryl suturing.',
  },
  {
    id: 'surg-2',
    name: 'Titanium Dental Implant Placement',
    branch: 'Facial Surgery',
    durationMinutes: 90,
    cleanupBufferMinutes: 30,
    allowedStaffIds: ['dr-julian-aris'],
    requiredOperatoryType: 'surgical',
    description: 'Computer-guided surgical stent osteotomy, high-torque implant body seating, PRF membrane placement, and healing abutment.',
  },
  {
    id: 'surg-3',
    name: 'Lateral Window Sinus Floor Augmentation',
    branch: 'Facial Surgery',
    durationMinutes: 75,
    cleanupBufferMinutes: 25,
    allowedStaffIds: ['dr-julian-aris'],
    requiredOperatoryType: 'surgical',
    description: 'Piezoelectric lateral window osteotomy, Schneiderian membrane elevation, particulate bone graft packing, and collagen shield.',
  },
];

// Helper to get today's date formatted as YYYY-MM-DD
export function getDemoDate(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// Generate balanced initial appointments across staff and rooms for today and adjacent days
export function generateInitialAppointments(): Appointment[] {
  const today = getDemoDate(0);
  const tomorrow = getDemoDate(1);

  return [
    // --- Dr. Julian Aris (Suite 1: Surgical) ---
    {
      id: 'apt-aris-1',
      patientName: 'Jonathan Vance',
      patientPhone: '+44 7700 900142',
      serviceId: 'surg-1', // Surgical Wisdom Tooth Extraction (60m + 25m buffer)
      staffId: 'dr-julian-aris',
      operatoryId: 'suite-1',
      date: today,
      startMinute: 540, // 09:00 - 10:00 (buffer until 10:25 = 625)
      endMinute: 600,
      bufferEndMinute: 625,
      status: 'confirmed',
      isFlexible: false,
    },
    {
      id: 'apt-aris-2',
      patientName: 'Sarah Jenkins',
      patientPhone: '+44 7700 900588',
      serviceId: 'surg-2', // Titanium Dental Implant (90m + 30m buffer)
      staffId: 'dr-julian-aris',
      operatoryId: 'suite-1',
      date: today,
      startMinute: 630, // 10:30 - 12:00 (buffer until 12:30 = 750, right up to Dr. Aris lunch!)
      endMinute: 720,
      bufferEndMinute: 750,
      status: 'confirmed',
      isFlexible: true,
    },
    // (Lunch: 12:30 - 13:30 / 750 - 810)
    {
      id: 'apt-aris-3',
      patientName: 'Marcus Sterling',
      patientPhone: '+44 7700 900891',
      serviceId: 'surg-3', // Sinus Floor Lift (75m + 25m buffer)
      staffId: 'dr-julian-aris',
      operatoryId: 'suite-1',
      date: today,
      startMinute: 825, // 13:45 - 15:00 (buffer until 15:25 = 925)
      endMinute: 900,
      bufferEndMinute: 925,
      status: 'confirmed',
      isFlexible: false,
    },

    // --- Dr. Elena Chen (Suite 2: Aesthetic / General) ---
    {
      id: 'apt-chen-1',
      patientName: 'Clara Oswald',
      patientPhone: '+44 7700 900214',
      serviceId: 'cosm-2', // Porcelain Veneer Consultation & Prep (90m + 20m buffer)
      staffId: 'dr-elena-chen',
      operatoryId: 'suite-2',
      date: today,
      startMinute: 555, // 09:15 - 10:45 (buffer until 11:05 = 665)
      endMinute: 645,
      bufferEndMinute: 665,
      status: 'confirmed',
      isFlexible: false,
    },
    {
      id: 'apt-chen-2',
      patientName: 'David Tennant',
      patientPhone: '+44 7700 900741',
      serviceId: 'orth-1', // Clear Aligner Scan (45m + 10m buffer)
      staffId: 'dr-elena-chen',
      operatoryId: 'suite-2',
      date: today,
      startMinute: 675, // 11:15 - 12:00 (buffer until 12:10 = 730)
      endMinute: 720,
      bufferEndMinute: 730,
      status: 'confirmed',
      isFlexible: true,
    },
    // (Lunch: 13:00 - 14:00 / 780 - 840)
    {
      id: 'apt-chen-3',
      patientName: 'Fiona Gallagher',
      patientPhone: '+44 7700 900452',
      serviceId: 'cosm-3', // Direct Aesthetic Edge Bonding (60m + 15m buffer)
      staffId: 'dr-elena-chen',
      operatoryId: 'suite-2',
      date: today,
      startMinute: 855, // 14:15 - 15:15 (buffer until 15:30 = 930)
      endMinute: 915,
      bufferEndMinute: 930,
      status: 'confirmed',
      isFlexible: false,
    },
    {
      id: 'apt-chen-4',
      patientName: 'Oliver Twist',
      patientPhone: '+44 7700 900339',
      serviceId: 'rest-1', // Composite Nano-Hybrid Restoration (50m + 15m buffer)
      staffId: 'dr-elena-chen',
      operatoryId: 'suite-2',
      date: today,
      startMinute: 945, // 15:45 - 16:35 (buffer until 16:50 = 1010)
      endMinute: 995,
      bufferEndMinute: 1010,
      status: 'confirmed',
      isFlexible: true,
    },

    // --- Maya Lin (Bay A: Hygiene) ---
    {
      id: 'apt-lin-1',
      patientName: 'Emily Bronte',
      patientPhone: '+44 7700 900661',
      serviceId: 'prev-1', // Routine Scale & Polish (40m + 10m buffer)
      staffId: 'maya-lin',
      operatoryId: 'bay-a',
      date: today,
      startMinute: 500, // 08:20 - 09:00 (buffer until 09:10 = 550)
      endMinute: 540,
      bufferEndMinute: 550,
      status: 'confirmed',
      isFlexible: false,
    },
    {
      id: 'apt-lin-2',
      patientName: 'Arthur Dent',
      patientPhone: '+44 7700 900119',
      serviceId: 'prev-2', // Comprehensive Periodontal Therapy (60m + 15m buffer)
      staffId: 'maya-lin',
      operatoryId: 'bay-a',
      date: today,
      startMinute: 570, // 09:30 - 10:30 (buffer until 10:45 = 645)
      endMinute: 630,
      bufferEndMinute: 645,
      status: 'confirmed',
      isFlexible: true,
    },
    {
      id: 'apt-lin-3',
      patientName: 'Harriet Vane',
      patientPhone: '+44 7700 900482',
      serviceId: 'prev-1', // Scale & Polish (40m + 10m buffer)
      staffId: 'maya-lin',
      operatoryId: 'bay-a',
      date: today,
      startMinute: 660, // 11:00 - 11:40 (buffer until 11:50 = 710)
      endMinute: 700,
      bufferEndMinute: 710,
      status: 'confirmed',
      isFlexible: false,
    },
    // (Lunch: 12:00 - 13:00 / 720 - 780)
    {
      id: 'apt-lin-4',
      patientName: 'Robert Langdon',
      patientPhone: '+44 7700 900994',
      serviceId: 'prev-1', // Scale & Polish
      staffId: 'maya-lin',
      operatoryId: 'bay-a',
      date: today,
      startMinute: 800, // 13:20 - 14:00 (buffer until 14:10 = 850)
      endMinute: 840,
      bufferEndMinute: 850,
      status: 'confirmed',
      isFlexible: false,
    },
    {
      id: 'apt-lin-5',
      patientName: 'Gemma Simmons',
      patientPhone: '+44 7700 900823',
      serviceId: 'prev-2', // Periodontal Therapy
      staffId: 'maya-lin',
      operatoryId: 'bay-a',
      date: today,
      startMinute: 870, // 14:30 - 15:30 (buffer until 15:45 = 945)
      endMinute: 930,
      bufferEndMinute: 945,
      status: 'confirmed',
      isFlexible: true,
    },

    // Tomorrow sample appointment
    {
      id: 'apt-tomorrow-1',
      patientName: 'Eleanor Vance',
      patientPhone: '+44 7700 900778',
      serviceId: 'surg-1',
      staffId: 'dr-julian-aris',
      operatoryId: 'suite-1',
      date: tomorrow,
      startMinute: 570,
      endMinute: 630,
      bufferEndMinute: 655,
      status: 'confirmed',
      isFlexible: false,
    },
  ];
}

export const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: 'wait-1',
    patientName: 'Sophia Montgomery',
    phone: '+44 7700 900382',
    serviceId: 'surg-1', // Surgical Wisdom extraction (needs Dr. Aris + Suite 1)
    preferredDate: getDemoDate(0),
    notes: 'Severe pericoronitis lower right quadrant. Needs urgent extraction if morning slot opens.',
  },
  {
    id: 'wait-2',
    patientName: 'Alexander Hayes',
    phone: '+44 7700 900419',
    serviceId: 'prev-1', // Routine Scale & Polish (needs Maya Lin or Elena Chen)
    preferredDate: getDemoDate(0),
    notes: 'Traveling abroad tomorrow evening; desires hygiene appointment today if gap opens.',
  },
  {
    id: 'wait-3',
    patientName: 'Isabella Rossi',
    phone: '+44 7700 900720',
    serviceId: 'orth-1', // Clear Aligner Scan
    preferredDate: getDemoDate(0),
    notes: 'Available anytime afternoon after 14:00.',
  },
  {
    id: 'wait-4',
    patientName: 'Julian Croft',
    phone: '+44 7700 900651',
    serviceId: 'cosm-1', // Laser Teeth Whitening
    preferredDate: getDemoDate(1),
    notes: 'Upcoming wedding in 3 days. Prefers aesthetic operatory.',
  },
];
