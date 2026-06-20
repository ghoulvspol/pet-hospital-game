import type { IllnessDefinition, PetKind, RoomDefinition, RoomKind, SkillId } from './types';

export const ROOM_DEFINITIONS: Record<RoomKind, RoomDefinition> = {
  exam: {
    kind: 'exam',
    title: 'Cozy Exam Room',
    shortTitle: 'Exam',
    description: 'Handles checkups, paw bumps, and first visits.',
    icon: '🩺',
    cost: 180,
    upkeep: 18,
    width: 2,
    height: 2,
    treatmentSeconds: 7,
    revenueBonus: 18,
    color: 0x80d8ff,
    accent: 0x18a0fb,
  },
  grooming: {
    kind: 'grooming',
    title: 'Fluffy Grooming Spa',
    shortTitle: 'Groom',
    description: 'Treats itchy coats and messy fur emergencies.',
    icon: '🫧',
    cost: 230,
    upkeep: 22,
    width: 2,
    height: 2,
    treatmentSeconds: 9,
    revenueBonus: 28,
    color: 0xfccde2,
    accent: 0xf06292,
  },
  lab: {
    kind: 'lab',
    title: 'Tiny Diagnostics Lab',
    shortTitle: 'Lab',
    description: 'Finds tummy bugs and mystery sniffles.',
    icon: '🧪',
    cost: 320,
    upkeep: 30,
    width: 2,
    height: 2,
    treatmentSeconds: 12,
    revenueBonus: 42,
    color: 0xb8f7d4,
    accent: 0x16a34a,
  },
  recovery: {
    kind: 'recovery',
    title: 'Sunny Recovery Ward',
    shortTitle: 'Rest',
    description: 'A calm place for nervous pets and sprained paws.',
    icon: '🌤️',
    cost: 280,
    upkeep: 26,
    width: 2,
    height: 2,
    treatmentSeconds: 10,
    revenueBonus: 35,
    color: 0xffe4a3,
    accent: 0xf59e0b,
  },
};

export const ILLNESSES: IllnessDefinition[] = [
  {
    id: 'wellness-check',
    title: 'Wellness Check',
    requiredRoom: 'exam',
    value: 58,
    patienceSeconds: 34,
  },
  {
    id: 'paw-bump',
    title: 'Paw Bump',
    requiredRoom: 'exam',
    value: 72,
    patienceSeconds: 30,
  },
  {
    id: 'itchy-coat',
    title: 'Itchy Coat',
    requiredRoom: 'grooming',
    value: 86,
    patienceSeconds: 38,
  },
  {
    id: 'muddy-fur',
    title: 'Muddy Fur Crisis',
    requiredRoom: 'grooming',
    value: 96,
    patienceSeconds: 36,
  },
  {
    id: 'tummy-bug',
    title: 'Tummy Bug',
    requiredRoom: 'lab',
    value: 132,
    patienceSeconds: 46,
  },
  {
    id: 'mystery-sniffles',
    title: 'Mystery Sniffles',
    requiredRoom: 'lab',
    value: 124,
    patienceSeconds: 44,
  },
  {
    id: 'sprained-hop',
    title: 'Sprained Hop',
    requiredRoom: 'recovery',
    value: 110,
    patienceSeconds: 42,
  },
  {
    id: 'nervous-visit',
    title: 'Nervous Visit',
    requiredRoom: 'recovery',
    value: 94,
    patienceSeconds: 40,
  },
];

export const PET_ICONS: Record<PetKind, string> = {
  dog: '🐶',
  cat: '🐱',
  rabbit: '🐰',
  parrot: '🦜',
};

export const PET_NAMES = [
  'Mochi',
  'Biscuit',
  'Miso',
  'Pixel',
  'Pumpkin',
  'Nimbus',
  'Tofu',
  'Pebble',
  'Clover',
  'Waffle',
  'Lulu',
  'Pickle',
];

export const STAFF_NAMES = [
  'Dr. Mira',
  'Nurse Jun',
  'Dr. Nova',
  'Tech Sam',
  'Nurse Pip',
  'Dr. Sol',
  'Tech Bea',
];

export const PET_KINDS: PetKind[] = ['dog', 'cat', 'rabbit', 'parrot'];

export interface SkillDefinition {
  id: SkillId;
  title: string;
  description: string;
  maxRank: number;
  icon: string;
}

export const SKILL_DEFINITIONS: Record<SkillId, SkillDefinition> = {
  calmHands: {
    id: 'calmHands',
    title: 'Calm Hands',
    description: 'Pets lose patience more slowly while assigned staff are on duty.',
    maxRank: 3,
    icon: '🫶',
  },
  fastDiagnosis: {
    id: 'fastDiagnosis',
    title: 'Fast Diagnosis',
    description: 'Treatment speed improves for every trained rank.',
    maxRank: 3,
    icon: '⚡',
  },
  sparkleCare: {
    id: 'sparkleCare',
    title: 'Sparkle Care',
    description: 'Rooms stay cleaner and recovery payouts rise slightly.',
    maxRank: 2,
    icon: '✨',
  },
  routingSense: {
    id: 'routingSense',
    title: 'Routing Sense',
    description: 'Patients move faster through the hospital corridors.',
    maxRank: 2,
    icon: '🧭',
  },
};

export const SKILL_ORDER: SkillId[] = ['fastDiagnosis', 'calmHands', 'sparkleCare', 'routingSense'];

export const MAX_ROOM_LEVEL = 3;
