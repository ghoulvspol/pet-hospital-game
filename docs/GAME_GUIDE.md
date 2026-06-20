# PetCare Tycoon Game Guide / 宠物医院大亨游戏说明

## 中文说明

### 1. 游戏概览

《PetCare Tycoon》是一款原创的宠物医院经营模拟游戏。玩家要在有限资金下建设诊室、护理房和配套设施，接待猫、狗、兔子、鹦鹉等宠物患者，通过合理排队、房间升级、员工培养和服务策略，让医院稳定盈利并提升声誉。

游戏灵感来自经典经营模拟，但所有角色、房间、名称、音效和像素资产均为原创，不直接复制任何现有游戏素材。

### 2. 核心目标

你的长期目标是把小型宠物门诊扩展成高效、温暖、盈利的宠物医院。

主要目标包括：

- 治疗更多宠物，避免患者等待过久离开。
- 建设不同科室，覆盖更多病例类型。
- 提升医院声誉和每日收入。
- 完成阶段目标，解锁下一波经营挑战。
- 管理员工精力、技能和房间分配。
- 保持房间清洁，提升治疗质量和收益。

### 3. 基本玩法循环

1. 观察下一个到院宠物和当前队列需求。
2. 在底部建筑栏选择房间类型。
3. 点击空地建造房间。
4. 给房间安排合适员工，或让系统自动分配可用员工。
5. 宠物进入等待区，系统会把它们送往匹配房间治疗。
6. 治疗完成后获得收入、声誉、员工经验和治疗报告。
7. 使用收入升级房间、雇佣员工、提升候诊舒适度或培训员工。
8. 根据每日报告和运营预警继续调整布局与策略。

### 4. 用户、积分与排行榜

游戏会在浏览器本地保存一个玩家档案，包括玩家名、游玩局数和历史最佳积分。左侧“玩家”卡片可以改名、保存当前积分，并查看本地排行榜。

积分主要来自治疗收入、护理质量、星级、患者优先级和护理连胜。专家难度会给更高积分倍率，但经营压力也更大。

排行榜只保存在当前浏览器的 `localStorage` 中，不需要后端服务。点击“保存积分”会把当前局的积分、天数、治疗数、口碑和难度写入榜单；点击“清空榜单”会清除本地排行榜。

### 5. 难度模式

| 难度 | 特点 | 适合玩家 |
| --- | --- | --- |
| 温馨诊所 | 初始资金更多、来客更慢、宠物更有耐心、维护费更低，积分倍率较低。 | 想轻松建设和熟悉系统的玩家。 |
| 经典班次 | 标准资金、标准压力、标准积分倍率。 | 想体验完整经营循环的玩家。 |
| 专家高峰 | 初始资金更少、来客更快、宠物耐心更少、维护费更高、队列压力更明显，但积分倍率最高。 | 想挑战排名和高压调度的玩家。 |

切换难度会开启一局新的经营，保留玩家档案和排行榜，但重置当前医院状态。

### 6. 医院等级与任务合约

医院等级会随着治疗表现、积分奖励和合约完成获得 XP。升级医院会带来额外资金和积分奖励，让长期经营不只依赖每日收入。

左侧“任务合约”提供可选挑战。一次最多同时进行两个合约，完成后获得现金、口碑、医院 XP 和积分奖励。合约类型包括：

- 高峰护理演练：治疗急诊宠物，考验高压调度。
- 贵宾健康计划：交付优秀星级护理，适合追求高质量路线。
- 清洁班次审计：保持房间清洁，奖励稳定运营。
- 员工训练日：投入技能等级，强化团队成长。

合约会随着章节推进持续刷新，是冲击排行榜和专家难度的重要积分来源。

### 7. 房间类型

| 房间 | 英文名 | 适合病例 | 特点 |
| --- | --- | --- | --- |
| 温馨诊室 | Cozy Exam Room | 体检、爪部小伤 | 成本低，适合早期快速接待。 |
| 毛绒护理 SPA | Fluffy Grooming Spa | 皮毛瘙痒、泥毛危机 | 收益中等，能覆盖护理类病例。 |
| 小小诊断实验室 | Tiny Diagnostics Lab | 肚子不适、神秘喷嚏 | 成本高但单次收入更高。 |
| 阳光恢复病房 | Sunny Recovery Ward | 扭伤、紧张就诊 | 适合恢复和安抚类病例。 |

建议开局优先补齐基础诊室，再根据队列中“Needs / 需要”的房间需求扩建。

### 8. 宠物与优先级

宠物患者会带着不同病例来到医院，并拥有耐心值。等待越久，耐心越低；耐心耗尽后患者会离开，影响当日表现。

优先级分为：

- 普通：标准排队逻辑。
- 急诊：更需要快速处理。
- VIP：潜在收益更高，值得重点照顾。

可用操作：

- 安抚宠物：花费资金恢复部分耐心。
- 优先分诊：为重要患者添加优先标记，让其在队列排序中更靠前。

### 9. 员工系统

员工拥有角色、专长、精力、等级、经验和技能点。

员工角色包括：

- 兽医：适合诊疗核心房间。
- 护士：通用支援能力强。
- 技师：适合实验室和技术类工作。

员工会在治疗后获得经验，升级后得到技能点。精力过低时效率会受影响，需要送去休息室恢复。

### 10. 技能树

| 技能 | 英文名 | 效果 |
| --- | --- | --- |
| 快速诊断 | Fast Diagnosis | 提升治疗速度。 |
| 温柔双手 | Calm Hands | 降低宠物等待或治疗中的耐心流失。 |
| 闪亮护理 | Sparkle Care | 房间更不容易变脏，恢复收益略有提升。 |
| 路线感知 | Routing Sense | 宠物在医院中的移动更快。 |

建议早期优先点“快速诊断”和“温柔双手”，中后期再强化清洁与路线效率。

### 11. 房间升级与清洁

房间最高可升级到 3 级。升级通常能提升治疗吞吐和收益，并重置清洁度。

清洁度会随使用下降。清洁度过低时，地图上会出现风险标记，治疗表现和运营稳定性都会受到影响。可以在房间检查面板中执行“清洁房间”。

### 12. 护理策略

每个房间可以设置护理策略：

- 平衡：稳定治疗速度、质量和收益。
- 快速：提升周转速度，适合排队压力高时使用。
- 舒适：更重视治疗质量和耐心管理，适合 VIP 或高价值患者。

如果队列变长，切换到快速策略；如果追求高评分和连胜，使用舒适策略。

### 13. 候诊舒适度

候诊舒适度是全局设施升级。提升后，等待中的宠物耐心下降更慢，更适合应对高峰期和复杂病例。

当目标要求提升候诊体验，或经常出现排队风险时，应优先升级候诊舒适度。

### 14. 运营预警

左侧运营卡片会提醒关键风险：

- 脏房间：房间需要清洁。
- 疲劳员工：员工精力过低，需要休息。
- 队列风险：等待宠物过多或压力上升。

地图上也会出现可视化提示，例如低清洁度百分比、员工疲劳感叹号、休息中的 Z 标记等。

### 15. 阶段目标与报告

游戏会持续生成阶段目标，例如：

- 治疗指定数量宠物。
- 建造指定房间。
- 升级房间。
- 提升声誉。
- 达成护理连胜。
- 提升候诊舒适度。
- 达成当日收入目标。
- 雇佣更多员工。

完成目标后可获得资金和声誉奖励，并推进经营章节。

治疗报告会展示评分、星级、收入、奖金和护理策略；每日报告会总结当天治疗数、流失数、收入、最佳质量和声誉。

### 16. 操作方式

| 操作 | 说明 |
| --- | --- |
| 鼠标点击空地 | 建造当前选中的房间。 |
| 鼠标点击房间 | 打开房间检查面板。 |
| 鼠标点击宠物 | 打开患者检查面板。 |
| 底部建筑栏 | 切换要建造的房间类型。 |
| `Space` | 暂停或继续游戏。 |
| `1` | 选择温馨诊室。 |
| `2` | 选择毛绒护理 SPA。 |
| `3` | 选择小小诊断实验室。 |
| `4` | 选择阳光恢复病房。 |
| `中文 / English` | 切换中文和英文界面。 |

### 17. 新手建议

- 开局先保证至少有一个诊室，再观察队列需求补房间。
- 不要一次性花光资金，保留清洁、安抚和雇佣预算。
- 队列压力升高时，优先分诊急诊或 VIP。
- 员工低精力时及时休息，否则治疗效率会下降。
- 房间清洁低于风险线时优先处理，避免收益和质量下滑。
- 目标推荐的房间通常是当前最值得建设的选择。

### 18. 技术结构

当前项目采用 Phaser、TypeScript 和 Vite：

- `src/game/simulation`：游戏规则和可保存状态的唯一来源。
- `src/phaser/scenes`：Phaser 场景、渲染、动画和输入适配。
- `src/ui`：DOM HUD、检查面板、队列、目标和日志。
- `src/i18n`：中英文文本资源。
- `src/phaser/assets` 与 `public/assets`：原创像素资产和资源清单。

后续扩展应继续保持“模拟规则与渲染层分离”的结构，避免把核心经营逻辑直接写进 Phaser 场景循环。

---

## English Guide

### 1. Game Overview

PetCare Tycoon is an original pet hospital management simulation. You build rooms, manage staff, treat cats, dogs, rabbits, and parrots, and balance queue pressure, room cleanliness, treatment quality, revenue, and reputation.

The game is inspired by classic management sims, but all characters, room names, sounds, and pixel assets are original.

### 2. Main Goal

Grow a small pet clinic into a warm, efficient, and profitable animal hospital.

Your main goals are to:

- Treat more pets before they run out of patience.
- Build the right rooms for incoming case types.
- Increase reputation and daily revenue.
- Complete chapter objectives and unlock new challenge waves.
- Manage staff energy, assignments, skills, and training.
- Keep rooms clean to protect treatment quality and rewards.

### 3. Core Gameplay Loop

1. Watch the next arrival and current queue needs.
2. Select a room type from the bottom build dock.
3. Click an empty tile to build.
4. Assign suitable staff, or let available staff cover rooms automatically.
5. Pets wait, route to matching rooms, and receive treatment.
6. Completed treatments grant money, reputation, staff XP, and reports.
7. Spend earnings on upgrades, hiring, comfort, cleaning, and training.
8. Use operations warnings and daily reports to refine your strategy.

### 4. Player Profile, Score, and Leaderboard

The game stores a local player profile in the browser, including player name, total runs, and best score. Use the left player card to rename the profile, save the current score, and review the local leaderboard.

Score mainly comes from treatment revenue, care quality, stars, patient priority, and care streaks. Expert difficulty gives a higher score multiplier but creates more pressure.

The leaderboard is local-only through `localStorage`; no backend service is required. Saving a score records the current score, day, treated count, reputation, and difficulty. Clearing the board removes local leaderboard entries.

### 5. Difficulty Modes

| Difficulty | Rules | Best for |
| --- | --- | --- |
| Cozy Clinic | More starting money, slower arrivals, more patient pets, lower upkeep, and lower score multiplier. | Relaxed building and learning the systems. |
| Classic Shift | Standard money, pressure, and score multiplier. | The balanced management loop. |
| Expert Rush | Less starting money, faster arrivals, less patience, higher upkeep, stronger queue pressure, and the highest score multiplier. | Players chasing high-score ranking and harder scheduling. |

Changing difficulty starts a fresh run while preserving the player profile and leaderboard.

### 6. Hospital Levels and Mission Contracts

The hospital earns XP from strong treatment results, score rewards, and completed contracts. Leveling up grants extra cash and score, making long-term clinic growth meaningful beyond daily income.

The left-side contract panel offers optional challenges. Up to two contracts can be active at once. Completing one grants money, reputation, hospital XP, and score. Contract types include:

- Rush Care Drill: treat urgent pets and prove high-pressure readiness.
- VIP Wellness Plan: deliver excellent high-star care for premium visitors.
- Clean Shift Audit: keep rooms sparkling for stable operations.
- Training Day: invest skill ranks into the care team.

Contracts refresh as chapters advance and are a major score source for leaderboard runs and Expert difficulty.

### 7. Room Types

| Room | Best For | Notes |
| --- | --- | --- |
| Cozy Exam Room | Wellness checks and paw bumps | Cheap and reliable for early demand. |
| Fluffy Grooming Spa | Itchy coats and muddy fur | Covers grooming cases with solid income. |
| Tiny Diagnostics Lab | Tummy bugs and mystery sniffles | Expensive, slower, but high value. |
| Sunny Recovery Ward | Nervous visits and sprained hops | Strong for calm recovery cases. |

A good opening is to secure basic exam coverage first, then expand based on the queue’s “Needs” labels.

### 8. Pets and Priorities

Each pet arrives with a case, required room, priority, and patience timer. If patience reaches zero, the pet leaves and your daily performance suffers.

Priorities include:

- Normal: Standard queue behavior.
- Urgent: Should be handled quickly.
- VIP: Often worth protecting for better value.

Available patient actions:

- Soothe Pet: Spend money to restore patience.
- Priority Triage: Mark an important pet so it moves ahead in queue sorting.

### 9. Staff System

Staff have roles, specialties, energy, levels, XP, skill points, and trained skills.

Roles include:

- Vet: Strong for core diagnosis and treatment.
- Nurse: Flexible all-around support.
- Tech: Useful for lab and technical care.

Staff gain XP from treatments and earn skill points on level-up. Low-energy staff should rest in the lounge before they become an operational risk.

### 10. Skill Tree

| Skill | Effect |
| --- | --- |
| Fast Diagnosis | Improves treatment speed. |
| Calm Hands | Slows pet patience loss. |
| Sparkle Care | Keeps rooms cleaner and slightly improves recovery payouts. |
| Routing Sense | Helps pets move through corridors faster. |

Early upgrades in Fast Diagnosis and Calm Hands are usually the safest first investments.

### 11. Room Upgrades and Cleaning

Rooms can be upgraded up to level 3. Upgrades improve throughput and payouts, and also refresh cleanliness.

Cleanliness drops as rooms are used. Dirty rooms show risk markers and can hurt operating stability. Use the room inspector to clean rooms when cleanliness gets low.

### 12. Care Policies

Each room can use one of three care policies:

- Balanced: Stable speed, quality, and revenue.
- Express: Faster throughput when the queue is under pressure.
- Comfort: Better quality and patience handling for VIP or high-value cases.

Switch to Express during rush periods, and use Comfort when chasing high grades or care streaks.

### 13. Waiting Comfort

Waiting comfort is a global facility upgrade. Higher comfort slows patience loss while pets wait, making the hospital more resilient during rush hour.

Upgrade it when objectives request it or when queue-risk warnings appear often.

### 14. Operations Watch

The operations card highlights urgent problems:

- Dirty Rooms: Cleanliness risk.
- Tired Staff: Low staff energy.
- Queue Risk: Too many pets waiting or rising pressure.

The map also shows visual markers such as cleanliness percentages, red tired-staff alerts, and resting indicators.

### 15. Objectives and Reports

Dynamic objectives may ask you to:

- Treat a number of pets.
- Build a specific room type.
- Upgrade rooms.
- Reach reputation targets.
- Build a care streak.
- Improve waiting comfort.
- Hit a daily revenue target.
- Hire more staff.

Completing objectives grants money and reputation, then advances the chapter wave.

Treatment reports show grade, stars, revenue, bonus, and care policy. Daily reports summarize treated pets, lost pets, revenue, best quality, and reputation.

### 16. Controls

| Input | Action |
| --- | --- |
| Click empty tile | Build the selected room. |
| Click room | Inspect the room. |
| Click pet | Inspect the patient. |
| Bottom build dock | Select room type. |
| `Space` | Pause or resume. |
| `1` | Select Cozy Exam Room. |
| `2` | Select Fluffy Grooming Spa. |
| `3` | Select Tiny Diagnostics Lab. |
| `4` | Select Sunny Recovery Ward. |
| `中文 / English` | Switch interface language. |

### 17. Beginner Tips

- Start with exam coverage, then build around queue demand.
- Keep reserve money for cleaning, soothing, and hiring.
- Prioritize urgent and VIP pets when pressure rises.
- Rest low-energy staff before they slow down the clinic.
- Clean risky rooms before quality and income suffer.
- Follow the recommended build highlight when unsure what to build next.

### 18. Technical Structure

The project uses Phaser, TypeScript, and Vite:

- `src/game/simulation`: Source of truth for rules and saveable state.
- `src/phaser/scenes`: Phaser scene, rendering, animation, and input adapter.
- `src/ui`: DOM HUD, inspector, queue, objectives, and log.
- `src/i18n`: Chinese and English text resources.
- `src/phaser/assets` and `public/assets`: Original pixel assets and asset manifest.

Future features should keep simulation rules separate from Phaser rendering so gameplay remains testable and maintainable.
