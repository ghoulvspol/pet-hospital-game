import type { CarePolicy, HospitalObjective, IllnessDefinition, Locale, PatientPriority, PatientStatus, PetKind, RoomDefinition, RoomKind, SkillId, StaffRole, TreatmentGrade } from '../game/simulation/types';

export const DEFAULT_LOCALE: Locale = 'en';

export interface LocalizedRoomText {
  title: string;
  shortTitle: string;
  description: string;
}

export interface LocalizedSkillText {
  title: string;
  description: string;
}

export interface TranslationBundle {
  app: {
    eyebrow: string;
    title: string;
    description: string;
  };
  actions: {
    pause: string;
    resume: string;
    restart: string;
    hire: string;
    upgradeRoom: string;
    fullyUpgraded: string;
    cleanRoom: string;
    cleaning: string;
    restStaff: string;
    resumeStaff: string;
    assignHere: string;
    soothePatient: string;
    prioritizePatient: string;
    upgradeComfort: string;
  };
  disabledReasons: {
    notEnoughMoney: (amount: number) => string;
    fullyUpgraded: string;
    alreadyClean: string;
    cleaningCooldown: (seconds: number) => string;
    petAlreadyCalm: string;
    petUnavailable: string;
    alreadyTriaged: string;
    notWaiting: string;
    noSkillPoint: string;
    skillMastered: string;
  };
  hud: {
    money: string;
    reputation: string;
    day: string;
    time: string;
    careQueue: string;
    staff: string;
    inspector: string;
    clinicLog: string;
    buildMode: string;
    noPets: string;
    routeSteps: string;
    room: string;
    status: string;
    patience: string;
    level: string;
    patient: string;
    treated: string;
    cleanliness: string;
    skillTree: string;
    skillPoints: string;
    needsRoom: string;
    cases: string;
    unassigned: string;
    idle: string;
    floating: string;
    energy: string;
    language: string;
    chinese: string;
    english: string;
    objectives: string;
    reward: string;
    complete: string;
    progress: string;
    treatment: string;
    queuePressure: string;
    operations: string;
    allStable: string;
    dirtyRooms: string;
    tiredStaff: string;
    queueRisk: string;
    debtRisk: string;
    lostPets: string;
    rushHour: string;
    nextArrival: string;
    incomingSoon: string;
    cleanCost: string;
    quality: string;
    recentCare: string;
    bonus: string;
    priority: string;
    mode: string;
    working: string;
    resting: string;
    assignStaff: string;
    bestCare: string;
    todayRevenue: string;
    dailySummary: string;
    lost: string;
    reputationShort: string;
    carePolicy: string;
    activePolicy: string;
    waitingComfort: string;
    maxed: string;
    careStreak: string;
    bestStreak: string;
    stars: string;
    levelAbbr: string;
    goalWave: string;
    coachTitle: string;
    coachStable: string;
    coachClean: (room: string) => string;
    coachRest: (staff: string) => string;
    coachAssign: (room: string) => string;
    coachQueue: string;
    coachComfort: string;
    coachBuild: (room: string) => string;
    coachUpgrade: string;
    coachHire: string;
  };
  tutorial: {
    title: string;
    body: string;
  };
  world: {
    waitingGarden: string;
    petEntrance: string;
    treatingNow: string;
    staffReady: string;
    needsStaff: string;
    checkIn: string;
  };
  status: Record<PatientStatus, string>;
  pets: Record<PetKind, string>;
  staffRoles: Record<StaffRole, string>;
  rooms: Record<RoomKind, LocalizedRoomText>;
  illnesses: Record<string, string>;
  skills: Record<SkillId, LocalizedSkillText>;
  events: {
    opened: string;
    buildTip: string;
    outOfBounds: string;
    keepEntryClear: string;
    spaceOccupied: string;
    roomOpened: (room: string) => string;
    needMoney: (amount: number) => string;
    cannotBuild: string;
    roomFullUpgrade: string;
    roomUpgrade: (room: string, level: number) => string;
    skillMastered: (staff: string, skill: string) => string;
    needsSkillPoint: (staff: string) => string;
    skillTrained: (staff: string, skill: string, rank: number) => string;
    staffJoined: (staff: string) => string;
    patientArrived: (patient: string, illness: string) => string;
    patientLeft: (patient: string) => string;
    patientRecovered: (patient: string, revenue: number) => string;
    dailyUpkeep: (day: number, total: number) => string;
    debtWarning: string;
    staffLevelUp: (staff: string, level: number) => string;
    objectiveComplete: (objective: string, money: number, reputation: number) => string;
    roomCleaned: (room: string) => string;
    roomTooClean: string;
    rushStarted: string;
    pressureWarning: string;
    patientRecoveredWithGrade: (patient: string, grade: string, revenue: number) => string;
    staffAssigned: (staff: string, room: string) => string;
    staffResting: (staff: string) => string;
    staffResumed: (staff: string) => string;
    staffReadyAgain: (staff: string) => string;
    staffSpecialtyMismatch: (staff: string, room: string) => string;
    dailyReport: (day: number, treated: number, revenue: number, bestQuality: number) => string;
    carePolicyChanged: (room: string, policy: string) => string;
    patientSoothed: (patient: string) => string;
    patientAlreadyCalm: (patient: string) => string;
    patientPrioritized: (patient: string) => string;
    patientAlreadyPrioritized: (patient: string) => string;
    waitingComfortUpgraded: (level: number) => string;
    waitingComfortMaxed: string;
    careStreak: (streak: number, bonus: number) => string;
    objectiveWaveUnlocked: (wave: number) => string;
  };
  fx: {
    roomBuilt: string;
    needMoney: string;
    noSkillPoints: string;
    staffHired: string;
    waitedTooLong: string;
    levelUp: string;
    cleaned: string;
    rush: string;
    assigned: string;
    resting: string;
    wrongSpecialty: string;
    soothed: string;
    prioritized: string;
    comfort: string;
    newGoals: string;
    roomLevel: (level: number) => string;
  };
  objectives: {
    title: (objective: HospitalObjective, roomName?: string) => string;
  };
  grades: Record<TreatmentGrade, string>;
  priorities: Record<PatientPriority, string>;
  carePolicies: Record<CarePolicy, LocalizedSkillText & { shortTitle: string }>;
}

export const TRANSLATIONS: Record<Locale, TranslationBundle> = {
  en: {
    app: {
      eyebrow: 'Original Management Prototype',
      title: 'PetCare Tycoon',
      description: 'Original pet hospital management browser game prototype.',
    },
    actions: {
      pause: 'Pause',
      resume: 'Resume',
      restart: 'Restart',
      hire: 'Hire',
      upgradeRoom: 'Upgrade Room',
      fullyUpgraded: 'Fully Upgraded',
      cleanRoom: 'Clean Room',
      cleaning: 'Cleaning',
      restStaff: 'Send to Lounge',
      resumeStaff: 'Back to Work',
      assignHere: 'Assign Here',
      soothePatient: 'Soothe Pet',
      prioritizePatient: 'Priority Triage',
      upgradeComfort: 'Upgrade Comfort',
    },
    disabledReasons: {
      notEnoughMoney: (amount) => `Need $${amount}`,
      fullyUpgraded: 'Room is already max level',
      alreadyClean: 'Cleanliness is healthy',
      cleaningCooldown: (seconds) => `Cleaning crew ready in ${seconds}s`,
      petAlreadyCalm: 'Patience is already safe',
      petUnavailable: 'Pet is not waiting for comfort',
      alreadyTriaged: 'Already prioritized',
      notWaiting: 'Only waiting pets can be triaged',
      noSkillPoint: 'Earn a skill point first',
      skillMastered: 'Skill already mastered',
    },
    hud: {
      money: 'Money',
      reputation: 'Reputation',
      day: 'Day',
      time: 'Time',
      careQueue: 'Care Queue',
      staff: 'Staff',
      inspector: 'Inspector',
      clinicLog: 'Clinic Log',
      buildMode: 'Build Mode',
      noPets: 'No pets waiting yet. Keep building cozy care spaces.',
      routeSteps: 'Route Steps',
      room: 'Room',
      status: 'Status',
      patience: 'Patience',
      level: 'Level',
      patient: 'Patient',
      treated: 'Treated',
      cleanliness: 'Cleanliness',
      skillTree: 'Skill Tree',
      skillPoints: 'SP',
      needsRoom: 'Needs',
      cases: 'cases',
      unassigned: 'Unassigned',
      idle: 'Idle',
      floating: 'Floating',
      energy: 'energy',
      language: 'Language',
      chinese: 'Chinese',
      english: 'English',
      objectives: 'Goals',
      reward: 'Reward',
      complete: 'Complete',
      progress: 'Progress',
      treatment: 'Treatment',
      queuePressure: 'Queue Pressure',
      operations: 'Operations',
      allStable: 'All systems stable',
      dirtyRooms: 'Dirty Rooms',
      tiredStaff: 'Tired Staff',
      queueRisk: 'Queue Risk',
      debtRisk: 'Debt Risk',
      lostPets: 'Lost Pets',
      rushHour: 'Rush Hour',
      nextArrival: 'Next Arrival',
      incomingSoon: 'Incoming Soon',
      cleanCost: 'Clean Cost',
      quality: 'Quality',
      recentCare: 'Recent Care',
      bonus: 'Bonus',
      priority: 'Priority',
      mode: 'Mode',
      working: 'Working',
      resting: 'Resting',
      assignStaff: 'Assign Staff',
      bestCare: 'Best Care',
      todayRevenue: 'Today Revenue',
      dailySummary: 'Daily Summary',
      lost: 'Lost',
      reputationShort: 'Rep',
      carePolicy: 'Care Policy',
      activePolicy: 'Active Policy',
      waitingComfort: 'Waiting Comfort',
      maxed: 'Maxed',
      careStreak: 'Care Streak',
      bestStreak: 'Best Streak',
      stars: 'Stars',
      levelAbbr: 'Lv',
      goalWave: 'Chapter',
      coachTitle: 'Next Best Move',
      coachStable: 'Clinic is steady. Follow the highlighted build goal or save for the next upgrade.',
      coachClean: (room) => `Clean ${room} before quality drops further.`,
      coachRest: (staff) => `Send ${staff} to rest before treatments slow down.`,
      coachAssign: (room) => `Assign staff to ${room} so matching pets can be treated.`,
      coachQueue: 'Queue pressure is high. Use Priority Triage or build the recommended room.',
      coachComfort: 'Upgrade waiting comfort to protect pet patience during rushes.',
      coachBuild: (room) => `Build ${room} to cover active demand or chapter goals.`,
      coachUpgrade: 'Upgrade a busy room to improve throughput and payouts.',
      coachHire: 'Hire another staff member to cover more rooms at once.',
    },
    tutorial: {
      title: 'Grow your pet hospital',
      body: 'Click empty tiles to build. Staff automatically join matching rooms. Treat pets before patience runs out.',
    },
    world: {
      waitingGarden: 'Waiting Garden',
      petEntrance: 'Pet Entrance',
      treatingNow: 'Treating now',
      staffReady: 'ready',
      needsStaff: 'Needs staff',
      checkIn: 'CHECK IN',
    },
    status: {
      entering: 'Following route',
      waiting: 'Waiting garden',
      toRoom: 'Walking to room',
      treating: 'Being treated',
      leaving: 'Heading home',
    },
    pets: {
      dog: 'Dog',
      cat: 'Cat',
      rabbit: 'Rabbit',
      parrot: 'Parrot',
    },
    staffRoles: {
      vet: 'Vet',
      nurse: 'Nurse',
      tech: 'Tech',
    },
    rooms: {
      exam: {
        title: 'Cozy Exam Room',
        shortTitle: 'Exam',
        description: 'Handles checkups, paw bumps, and first visits.',
      },
      grooming: {
        title: 'Fluffy Grooming Spa',
        shortTitle: 'Groom',
        description: 'Treats itchy coats and messy fur emergencies.',
      },
      lab: {
        title: 'Tiny Diagnostics Lab',
        shortTitle: 'Lab',
        description: 'Finds tummy bugs and mystery sniffles.',
      },
      recovery: {
        title: 'Sunny Recovery Ward',
        shortTitle: 'Rest',
        description: 'A calm place for nervous pets and sprained paws.',
      },
    },
    illnesses: {
      'wellness-check': 'Wellness Check',
      'paw-bump': 'Paw Bump',
      'itchy-coat': 'Itchy Coat',
      'muddy-fur': 'Muddy Fur Crisis',
      'tummy-bug': 'Tummy Bug',
      'mystery-sniffles': 'Mystery Sniffles',
      'sprained-hop': 'Sprained Hop',
      'nervous-visit': 'Nervous Visit',
    },
    skills: {
      calmHands: {
        title: 'Calm Hands',
        description: 'Pets lose patience more slowly while assigned staff are on duty.',
      },
      fastDiagnosis: {
        title: 'Fast Diagnosis',
        description: 'Treatment speed improves for every trained rank.',
      },
      sparkleCare: {
        title: 'Sparkle Care',
        description: 'Rooms stay cleaner and recovery payouts rise slightly.',
      },
      routingSense: {
        title: 'Routing Sense',
        description: 'Patients move faster through the hospital corridors.',
      },
    },
    events: {
      opened: 'PetCare Tycoon opened its doors.',
      buildTip: 'Build rooms to treat more pet conditions.',
      outOfBounds: 'Out of bounds',
      keepEntryClear: 'Keep entry clear',
      spaceOccupied: 'Space occupied',
      roomOpened: (room) => `${room} opened for tiny patients.`,
      needMoney: (amount) => `Need $${amount}`,
      cannotBuild: 'Cannot build here.',
      roomFullUpgrade: 'This room is already fully upgraded.',
      roomUpgrade: (room, level) => `${room} upgraded to level ${level}.`,
      skillMastered: (staff, skill) => `${staff} has mastered ${skill}.`,
      needsSkillPoint: (staff) => `${staff} needs a skill point first. Treat more pets.`,
      skillTrained: (staff, skill, rank) => `${staff} trained ${skill} rank ${rank}.`,
      staffJoined: (staff) => `${staff} joined the care team.`,
      patientArrived: (patient, illness) => `${patient} arrived for ${illness.toLowerCase()}.`,
      patientLeft: (patient) => `${patient} left after waiting too long.`,
      patientRecovered: (patient, revenue) => `${patient} recovered. Earned $${revenue}.`,
      dailyUpkeep: (day, total) => `Day ${day}: upkeep and wages cost $${total}.`,
      debtWarning: 'Debt is hurting your hospital reputation.',
      staffLevelUp: (staff, level) => `${staff} reached level ${level} and gained a skill point.`,
      objectiveComplete: (objective, money, reputation) => `${objective} complete. Reward: $${money} and +${reputation} reputation.`,
      roomCleaned: (room) => `${room} is sparkling clean again.`,
      roomTooClean: 'This room is already tidy.',
      rushStarted: 'Rush hour! More pets are arriving for care.',
      pressureWarning: 'Queue pressure is rising. Build, clean, or hire fast.',
      patientRecoveredWithGrade: (patient, grade, revenue) => `${patient} recovered with ${grade} care. Earned $${revenue}.`,
      staffAssigned: (staff, room) => `${staff} is now covering ${room}.`,
      staffResting: (staff) => `${staff} is recovering in the staff lounge.`,
      staffResumed: (staff) => `${staff} is ready for the floor again.`,
      staffReadyAgain: (staff) => `${staff} has recovered enough energy to work.`,
      staffSpecialtyMismatch: (staff, room) => `${staff} is not trained for ${room}.`,
      dailyReport: (day, treated, revenue, bestQuality) => `Day ${day} wrap: ${treated} pets treated, $${revenue} earned, best care ${bestQuality}%.`,
      carePolicyChanged: (room, policy) => `${room} switched to ${policy}.`,
      patientSoothed: (patient) => `${patient} calmed down after a comfort treat.`,
      patientAlreadyCalm: (patient) => `${patient} is already calm and patient.`,
      patientPrioritized: (patient) => `${patient} is now first in the triage plan.`,
      patientAlreadyPrioritized: (patient) => `${patient} is already marked for priority triage.`,
      waitingComfortUpgraded: (level) => `Waiting garden comfort upgraded to level ${level}.`,
      waitingComfortMaxed: 'The waiting garden is already as cozy as it gets.',
      careStreak: (streak, bonus) => `${streak} good-care streak! Extra bonus: $${bonus}.`,
      objectiveWaveUnlocked: (wave) => `Chapter ${wave} goals unlocked. The hospital is growing!`,
    },
    fx: {
      roomBuilt: '+ room',
      needMoney: 'Need $',
      noSkillPoints: 'No SP',
      staffHired: '+ staff',
      waitedTooLong: 'wait',
      levelUp: 'level',
      cleaned: 'clean',
      rush: 'rush',
      assigned: 'assigned',
      resting: 'rest',
      wrongSpecialty: 'wrong room',
      soothed: 'calm',
      prioritized: 'priority',
      comfort: 'comfort',
      newGoals: 'new goals',
      roomLevel: (level) => `Lv ${level}`,
    },
    objectives: {
      title: (objective, roomName) => {
        if (objective.kind === 'treatPets') {
          return `Treat ${objective.target} pets`;
        }
        if (objective.kind === 'buildRoomKind') {
          return `Build ${roomName ?? 'room'}`;
        }
        if (objective.kind === 'upgradeRoom') {
          return `Upgrade any room to level ${objective.target}`;
        }
        if (objective.kind === 'reachReputation') {
          return `Reach ${objective.target}% reputation`;
        }
        if (objective.kind === 'reachCareStreak') {
          return `Build a ${objective.target}x care streak`;
        }
        if (objective.kind === 'upgradeWaitingComfort') {
          return `Upgrade waiting comfort to level ${objective.target}`;
        }
        if (objective.kind === 'earnRevenueToday') {
          return `Earn $${objective.target} in one day`;
        }
        return `Hire ${objective.target} staff`;
      },
    },
    grades: {
      excellent: 'Excellent',
      good: 'Good',
      rough: 'Rough',
    },
    priorities: {
      normal: 'Routine',
      urgent: 'Urgent',
      vip: 'VIP',
    },
    carePolicies: {
      balanced: {
        title: 'Balanced Care',
        shortTitle: 'Balance',
        description: 'Steady treatment with a little patience recovery.',
      },
      express: {
        title: 'Express Care',
        shortTitle: 'Express',
        description: 'Faster throughput, but rooms get dirty and staff tire faster.',
      },
      comfort: {
        title: 'Comfort Care',
        shortTitle: 'Comfort',
        description: 'Slower, gentler care that protects patience and quality.',
      },
    },
  },
  zh: {
    app: {
      eyebrow: '原创经营模拟原型',
      title: '萌宠医院大亨',
      description: '原创宠物医院经营模拟浏览器游戏原型。',
    },
    actions: {
      pause: '暂停',
      resume: '继续',
      restart: '重开',
      hire: '雇佣',
      upgradeRoom: '升级房间',
      fullyUpgraded: '已满级',
      cleanRoom: '清洁房间',
      cleaning: '清洁中',
      restStaff: '去休息室',
      resumeStaff: '回到岗位',
      assignHere: '派到这里',
      soothePatient: '安抚宠物',
      prioritizePatient: '优先分诊',
      upgradeComfort: '升级舒适度',
    },
    disabledReasons: {
      notEnoughMoney: (amount) => `还需要 $${amount}`,
      fullyUpgraded: '房间已经满级',
      alreadyClean: '清洁度仍然健康',
      cleaningCooldown: (seconds) => `清洁队 ${seconds}s 后可用`,
      petAlreadyCalm: '宠物耐心已经安全',
      petUnavailable: '当前宠物不适合安抚',
      alreadyTriaged: '已经优先分诊',
      notWaiting: '只有候诊宠物可分诊',
      noSkillPoint: '先获得技能点',
      skillMastered: '技能已满级',
    },
    hud: {
      money: '资金',
      reputation: '口碑',
      day: '天数',
      time: '时间',
      careQueue: '候诊队列',
      staff: '员工',
      inspector: '详情',
      clinicLog: '诊所日志',
      buildMode: '建造模式',
      noPets: '暂时没有宠物排队。继续扩建温馨诊室吧。',
      routeSteps: '路径步数',
      room: '房间',
      status: '状态',
      patience: '耐心',
      level: '等级',
      patient: '病患',
      treated: '已治疗',
      cleanliness: '清洁度',
      skillTree: '技能树',
      skillPoints: '技能点',
      needsRoom: '需要',
      cases: '类病例',
      unassigned: '未分配',
      idle: '空闲',
      floating: '机动',
      energy: '精力',
      language: '语言',
      chinese: '中文',
      english: 'English',
      objectives: '目标',
      reward: '奖励',
      complete: '完成',
      progress: '进度',
      treatment: '治疗进度',
      queuePressure: '队列压力',
      operations: '运营告警',
      allStable: '运营状态稳定',
      dirtyRooms: '脏污房间',
      tiredStaff: '疲劳员工',
      queueRisk: '队列风险',
      debtRisk: '负债风险',
      lostPets: '宠物流失',
      rushHour: '高峰时段',
      nextArrival: '下一位宠物',
      incomingSoon: '即将到达',
      cleanCost: '清洁费用',
      quality: '质量',
      recentCare: '最近护理',
      bonus: '加成',
      priority: '优先级',
      mode: '状态',
      working: '工作中',
      resting: '休息中',
      assignStaff: '员工排班',
      bestCare: '最佳护理',
      todayRevenue: '今日收入',
      dailySummary: '日结报告',
      lost: '流失',
      reputationShort: '口碑',
      carePolicy: '护理策略',
      activePolicy: '当前策略',
      waitingComfort: '候诊舒适度',
      maxed: '已满级',
      careStreak: '护理连胜',
      bestStreak: '最佳连胜',
      stars: '星级',
      levelAbbr: '级',
      goalWave: '章节',
      coachTitle: '下一步建议',
      coachStable: '医院运行稳定。可以跟随高亮建造目标，或攒钱准备下一次升级。',
      coachClean: (room) => `优先清洁 ${room}，避免护理质量继续下降。`,
      coachRest: (staff) => `让 ${staff} 去休息，避免治疗效率下降。`,
      coachAssign: (room) => `给 ${room} 分配员工，匹配病例才能开始治疗。`,
      coachQueue: '队列压力偏高。使用优先分诊，或建造推荐房间。',
      coachComfort: '升级候诊舒适度，能在高峰期保护宠物耐心。',
      coachBuild: (room) => `建造 ${room}，覆盖当前需求或章节目标。`,
      coachUpgrade: '升级繁忙房间，提高吞吐和收益。',
      coachHire: '雇佣更多员工，让多个房间同时运转。',
    },
    tutorial: {
      title: '扩建你的宠物医院',
      body: '点击空地建造房间。员工会自动进入匹配房间。请在宠物耐心耗尽前完成治疗。',
    },
    world: {
      waitingGarden: '候诊花园',
      petEntrance: '宠物入口',
      treatingNow: '治疗中',
      staffReady: '待命',
      needsStaff: '需要员工',
      checkIn: '挂号',
    },
    status: {
      entering: '沿路线进入',
      waiting: '候诊花园等待',
      toRoom: '前往诊室',
      treating: '治疗中',
      leaving: '回家路上',
    },
    pets: {
      dog: '小狗',
      cat: '小猫',
      rabbit: '兔兔',
      parrot: '鹦鹉',
    },
    staffRoles: {
      vet: '兽医',
      nurse: '护士',
      tech: '检验师',
    },
    rooms: {
      exam: {
        title: '温馨检查室',
        shortTitle: '检查',
        description: '处理体检、爪爪磕碰和初诊。',
      },
      grooming: {
        title: '蓬松美容间',
        shortTitle: '美容',
        description: '处理皮毛瘙痒和泥巴毛发危机。',
      },
      lab: {
        title: '小小化验室',
        shortTitle: '化验',
        description: '找出肚肚虫和神秘喷嚏的原因。',
      },
      recovery: {
        title: '阳光恢复室',
        shortTitle: '恢复',
        description: '安抚紧张宠物，也照顾扭伤的小爪。',
      },
    },
    illnesses: {
      'wellness-check': '健康体检',
      'paw-bump': '爪爪磕碰',
      'itchy-coat': '皮毛瘙痒',
      'muddy-fur': '泥巴毛发危机',
      'tummy-bug': '肚肚虫',
      'mystery-sniffles': '神秘喷嚏',
      'sprained-hop': '跳跳扭伤',
      'nervous-visit': '紧张就诊',
    },
    skills: {
      calmHands: {
        title: '安抚之手',
        description: '值班员工会让宠物耐心下降更慢。',
      },
      fastDiagnosis: {
        title: '快速诊断',
        description: '每级提升治疗速度。',
      },
      sparkleCare: {
        title: '闪亮护理',
        description: '房间更耐脏，治疗收入小幅提升。',
      },
      routingSense: {
        title: '动线直觉',
        description: '宠物在医院走廊中移动更快。',
      },
    },
    events: {
      opened: '萌宠医院正式开门营业。',
      buildTip: '建造更多房间，处理更多宠物病症。',
      outOfBounds: '超出边界',
      keepEntryClear: '请保持入口通畅',
      spaceOccupied: '空间已被占用',
      roomOpened: (room) => `${room} 已开放接诊。`,
      needMoney: (amount) => `需要 $${amount}`,
      cannotBuild: '这里不能建造。',
      roomFullUpgrade: '这个房间已经满级。',
      roomUpgrade: (room, level) => `${room} 已升级到 ${level} 级。`,
      skillMastered: (staff, skill) => `${staff} 已精通${skill}。`,
      needsSkillPoint: (staff) => `${staff} 需要技能点。继续治疗宠物来升级。`,
      skillTrained: (staff, skill, rank) => `${staff} 学会了${skill} ${rank} 级。`,
      staffJoined: (staff) => `${staff} 加入了护理团队。`,
      patientArrived: (patient, illness) => `${patient} 因${illness}来到医院。`,
      patientLeft: (patient) => `${patient} 等太久后离开了。`,
      patientRecovered: (patient, revenue) => `${patient} 康复了，收入 $${revenue}。`,
      dailyUpkeep: (day, total) => `第 ${day} 天：维护和工资花费 $${total}。`,
      debtWarning: '负债正在损害医院口碑。',
      staffLevelUp: (staff, level) => `${staff} 升到 ${level} 级并获得 1 点技能点。`,
      objectiveComplete: (objective, money, reputation) => `${objective} 已完成。奖励：$${money} 和 +${reputation} 口碑。`,
      roomCleaned: (room) => `${room} 又变得闪闪发亮了。`,
      roomTooClean: '这个房间已经很整洁。',
      rushStarted: '高峰时段！更多宠物正在赶来就诊。',
      pressureWarning: '队列压力升高。请尽快建造、清洁或雇佣员工。',
      patientRecoveredWithGrade: (patient, grade, revenue) => `${patient} 接受了${grade}护理，收入 $${revenue}。`,
      staffAssigned: (staff, room) => `${staff} 现在负责${room}。`,
      staffResting: (staff) => `${staff} 去员工休息室恢复体力。`,
      staffResumed: (staff) => `${staff} 已回到岗位。`,
      staffReadyAgain: (staff) => `${staff} 已恢复到可以工作的体力。`,
      staffSpecialtyMismatch: (staff, room) => `${staff} 暂不适合负责${room}。`,
      dailyReport: (day, treated, revenue, bestQuality) => `第 ${day} 天结算：治疗 ${treated} 只宠物，收入 $${revenue}，最佳护理 ${bestQuality}%。`,
      carePolicyChanged: (room, policy) => `${room} 已切换为${policy}。`,
      patientSoothed: (patient) => `${patient} 吃到安抚小零食，平静了下来。`,
      patientAlreadyCalm: (patient) => `${patient} 现在已经很平静。`,
      patientPrioritized: (patient) => `${patient} 已加入优先分诊名单。`,
      patientAlreadyPrioritized: (patient) => `${patient} 已经是优先分诊。`,
      waitingComfortUpgraded: (level) => `候诊花园舒适度已升级到 ${level} 级。`,
      waitingComfortMaxed: '候诊花园已经足够舒适。',
      careStreak: (streak, bonus) => `${streak} 次优质护理连胜！额外奖金：$${bonus}。`,
      objectiveWaveUnlocked: (wave) => `第 ${wave} 章目标已解锁，医院正在扩张！`,
    },
    fx: {
      roomBuilt: '+ 房间',
      needMoney: '缺钱',
      noSkillPoints: '无技能点',
      staffHired: '+ 员工',
      waitedTooLong: '久等',
      levelUp: '升级',
      cleaned: '清洁',
      rush: '高峰',
      assigned: '已派工',
      resting: '休息',
      wrongSpecialty: '岗位不符',
      soothed: '安抚',
      prioritized: '优先',
      comfort: '舒适',
      newGoals: '新目标',
      roomLevel: (level) => `${level}级`,
    },
    objectives: {
      title: (objective, roomName) => {
        if (objective.kind === 'treatPets') {
          return `治疗 ${objective.target} 只宠物`;
        }
        if (objective.kind === 'buildRoomKind') {
          return `建造${roomName ?? '房间'}`;
        }
        if (objective.kind === 'upgradeRoom') {
          return `将任意房间升到 ${objective.target} 级`;
        }
        if (objective.kind === 'reachReputation') {
          return `口碑达到 ${objective.target}%`;
        }
        if (objective.kind === 'reachCareStreak') {
          return `达成 ${objective.target} 次护理连胜`;
        }
        if (objective.kind === 'upgradeWaitingComfort') {
          return `候诊舒适度升到 ${objective.target} 级`;
        }
        if (objective.kind === 'earnRevenueToday') {
          return `单日收入达到 $${objective.target}`;
        }
        return `雇佣 ${objective.target} 名员工`;
      },
    },
    grades: {
      excellent: '优秀',
      good: '良好',
      rough: '勉强',
    },
    priorities: {
      normal: '普通',
      urgent: '急诊',
      vip: '贵宾',
    },
    carePolicies: {
      balanced: {
        title: '均衡护理',
        shortTitle: '均衡',
        description: '治疗节奏稳定，并少量恢复宠物耐心。',
      },
      express: {
        title: '快速护理',
        shortTitle: '快速',
        description: '提升吞吐速度，但房间更易变脏、员工更累。',
      },
      comfort: {
        title: '安抚护理',
        shortTitle: '安抚',
        description: '速度更慢，但保护宠物耐心并提升护理质量。',
      },
    },
  },
};

export function getTranslations(locale: Locale): TranslationBundle {
  return TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE];
}

export function getRoomText(room: Pick<RoomDefinition, 'kind'>, locale: Locale): LocalizedRoomText {
  return getTranslations(locale).rooms[room.kind];
}

export function getIllnessTitle(illness: Pick<IllnessDefinition, 'id' | 'title'> | undefined, locale: Locale): string {
  if (!illness) {
    return locale === 'zh' ? '检查' : 'Checkup';
  }
  return getTranslations(locale).illnesses[illness.id] ?? illness.title;
}

export function getSkillText(skillId: SkillId, locale: Locale): LocalizedSkillText {
  return getTranslations(locale).skills[skillId];
}

export function getObjectiveTitle(objective: HospitalObjective, locale: Locale): string {
  const roomName = objective.roomKind ? getTranslations(locale).rooms[objective.roomKind].shortTitle : undefined;
  return getTranslations(locale).objectives.title(objective, roomName);
}
