import type {
  MajorModKind,
  TankClassId,
  TutorialActionCue,
  TutorialActorLoadout,
  TutorialMissionDefinition,
  TutorialMissionId,
  TutorialTriggerDefinition,
} from './types.ts'

const NO_REWARDS = { credits: 0, xp: 0, score: 0 }
const TRAINING_ROLES = { base_attacker: 0.34, hunter: 0.33, wall_breaker: 0.33 }
const TANK_HUNT_ROLES = { base_attacker: 0, hunter: 0.55, wall_breaker: 0.45 }
export const TUTORIAL_BRIEFING_OFFICER = 'General Rook'
export const TUTORIAL_ACTION_CUE_SECONDS = 10

const DIRECTION_ACTION_KEYS = ['LEFT', 'UP', 'DOWN', 'RIGHT']

const INSTRUCTORS: TutorialActorLoadout[] = [
  {
    id: 'instructor-needle',
    callSign: 'Needle',
    classId: 'scout',
    majorMod: 'overdrive',
    side: 'player',
    team: 'blue',
    spawn: { x: 7, y: 14 },
  },
  {
    id: 'instructor-spanner',
    callSign: 'Spanner',
    classId: 'engineer',
    majorMod: 'hedgehog',
    side: 'player',
    team: 'blue',
    spawn: { x: 10, y: 14 },
  },
  {
    id: 'instructor-brick',
    callSign: 'Brick',
    classId: 'battle',
    majorMod: 'pontoon',
    side: 'player',
    team: 'blue',
    spawn: { x: 13, y: 14 },
  },
]

export const TUTORIAL_MISSIONS: TutorialMissionDefinition[] = [
  {
    id: 1,
    name: 'First Gear',
    subtitle: 'Live-fire fundamentals',
    objectiveMode: 'defense',
    briefing: 'Survey the live-fire range, learn movement and fire discipline, then destroy two enemy tanks.',
    recommendedClass: 'scout',
    recommendedMod: 'overdrive',
    actors: [],
    level: {
      id: 1,
      name: 'First Gear',
      briefing: 'General Rook surveys the range before releasing you against two carefully underachieving hostiles.',
      objective: {
        mode: 'defense',
        label: 'Tank Hunt',
        briefing: 'Survey the range, learn the controls, and destroy both enemy tanks.',
        winCondition: 'Take a short movement lap and destroy two enemy tanks.',
      },
      biome: 'temperate',
      rows: [
        '.....................',
        '.....................',
        '....BBB.....BBB......',
        '....B.........B......',
        '....B.........B......',
        '....BBB.....BBB......',
        '.....................',
        '.......===...........',
        '.......===...........',
        '.....................',
        '....BBB...W.BBB......',
        '....B.....W...B......',
        '....B.........B......',
        '....BBB.SSS.BBB......',
        '.....................',
        '.....................',
        '.....................',
      ],
      playerSpawn: { x: 10, y: 14 },
      enemySpawns: [{ x: 5, y: 3 }, { x: 15, y: 3 }],
      retranslators: [],
      enemyTotal: 2,
      activeEnemyLimit: 2,
      spawnInterval: 6,
      roleWeights: TANK_HUNT_ROLES,
      armoredEnemyRatio: 0,
      rewards: NO_REWARDS,
    },
    steps: [
      {
        id: 'welcome',
        goal: 'Confirm range-control instructions.',
        trigger: { kind: 'confirm' },
        dialogue: [
          { speaker: 'General Rook', text: 'Welcome to Boot Camp. Before you move, I will show you the live-fire range.' },
          { speaker: 'General Rook', text: 'Confirm when ready. Range control will borrow your camera, not your dignity.' },
        ],
      },
      {
        id: 'tour',
        goal: 'Observe both enemies and the obstacle lanes.',
        trigger: { kind: 'camera-complete' },
        dialogue: [{
          speaker: 'General Rook',
          text: 'Two enemy tanks, brick cover, steel barriers, and a water lane. Memorize the range; it will not memorize you.',
        }],
        cameraCue: {
          target: { x: 5, y: 3 },
          duration: 3.2,
          holdDanger: true,
          label: 'Left hostile',
          waypoints: [
            { target: { x: 5, y: 3 }, duration: 3.2, label: 'Left hostile' },
            { target: { x: 10, y: 8 }, duration: 3.4, label: 'Obstacle lanes' },
            { target: { x: 15, y: 3 }, duration: 3.2, label: 'Right hostile' },
          ],
        },
      },
      {
        id: 'move',
        goal: 'Drive at least three cells and make one deliberate turn.',
        trigger: { kind: 'move', count: 3, target: 'with-turn' },
        dialogue: [{
          speaker: 'General Rook',
          text: 'Take a short handling run. Cover three cells and change heading at least once before engaging.',
        }],
      },
      {
        id: 'engage',
        goal: 'Destroy both enemies; watch ammunition and reload timing.',
        trigger: { kind: 'destroy', count: 2, target: 'squad' },
        dialogue: [
          {
            speaker: 'General Rook',
            text: 'Good. Now engage both enemies. Fire deliberately and watch the shell and reload readouts.',
          },
          {
            speaker: 'General Rook',
            text: 'Brick and steel can reduce your exposure while you destroy both targets. They have been ordered to lose professionally.',
          },
        ],
        completionDialogue: [{ speaker: 'General Rook', text: 'Range clear. Two tanks destroyed and only one clipboard wounded.' }],
      },
    ],
  },
  {
    id: 2,
    name: 'Radio Is Not Magic',
    subtitle: 'Defense and vision drill',
    objectiveMode: 'defense',
    briefing: 'Use static and portable relays to share vision through fog in an offline Online Battle simulation.',
    recommendedClass: 'scout',
    recommendedMod: 'overdrive',
    actors: [INSTRUCTORS[0]!],
    level: {
      id: 2,
      name: 'Radio Is Not Magic',
      briefing: 'Needle demonstrates relay links, fog contacts, and off-screen objective markers.',
      objective: {
        mode: 'defense',
        label: 'Vision Drill',
        briefing: 'Bring relays online and clear the revealed contacts.',
        winCondition: 'Link the range and destroy the two revealed hostiles.',
      },
      biome: 'swamp',
      rows: [
        '.....................',
        '..hhh...........hhh..',
        '..h...............h..',
        '..h.....BBB.......h..',
        '........B.B..........',
        '........BBB..........',
        '.....................',
        '====.............====',
        '.....................',
        '..........WWW........',
        '..........WWW........',
        '..hhh...........hhh..',
        '..h...............h..',
        '..hhh.....E.....hhh..',
        '.....................',
        '.....................',
        '.....................',
      ],
      playerSpawn: { x: 10, y: 14 },
      enemySpawns: [{ x: 9, y: 10 }, { x: 4, y: 4 }],
      retranslators: [{ x: 4, y: 8 }, { x: 16, y: 8 }],
      enemyTotal: 2,
      activeEnemyLimit: 2,
      spawnInterval: 8,
      roleWeights: TRAINING_ROLES,
      armoredEnemyRatio: 0,
      rewards: NO_REWARDS,
    },
    steps: [
      {
        id: 'welcome',
        goal: 'Confirm the shared-vision briefing.',
        trigger: { kind: 'confirm' },
        dialogue: [{ speaker: 'Needle', text: 'A radio extends your eyes. It does not improve what is between the headphones.' }],
      },
      {
        id: 'tour',
        goal: 'Watch the objective camera reveal the relay line.',
        trigger: { kind: 'camera-complete' },
        cameraCue: { target: { x: 16, y: 8 }, duration: 4.2, holdDanger: true, label: 'Eastern relay' },
        dialogue: [{ speaker: 'General Rook', text: 'Range control has the camera. Hostiles and spawns are held until it returns.' }],
      },
      {
        id: 'relay',
        goal: 'Capture a static relay or deploy a portable relay.',
        trigger: { kind: 'relay', count: 1 },
        holdDanger: true,
        dialogue: [{ speaker: 'Needle', text: 'Bring a static relay online or deploy a portable link.' }],
      },
      {
        id: 'shared-contact',
        goal: 'Use the relay link to acquire a hidden hostile contact.',
        trigger: { kind: 'relay', target: 'shared-contact' },
        holdDanger: true,
        dialogue: [{ speaker: 'Needle', text: 'The nearest target is outside direct sight. Hold position until the relay marks it for the team.' }],
      },
      {
        id: 'contacts',
        goal: 'Use shared vision to destroy two contacts.',
        trigger: { kind: 'destroy', count: 2, target: 'squad' },
        dialogue: [{ speaker: 'Needle', text: 'Link established. The fog has filed a formal complaint. Clear both shared contacts.' }],
        completionDialogue: [{ speaker: 'General Rook', text: 'Offline simulation complete. No matchmaking server was harmed.' }],
      },
    ],
  },
  {
    id: 3,
    name: 'Three Tanks, One Plan',
    subtitle: 'Team Battle',
    objectiveMode: 'team-battle',
    briefing: 'Fight beside a Scout, Engineer, and Battle Tank while practicing a tactic adapted to your loadout.',
    recommendedClass: 'battle',
    recommendedMod: 'overdrive',
    actors: INSTRUCTORS,
    level: {
      id: 3,
      name: 'Three Tanks, One Plan',
      briefing: 'The instructor squad demonstrates recon, lane control, and shielded breach timing.',
      objective: {
        mode: 'team-battle',
        label: 'Team Battle',
        briefing: 'Coordinate with the instructor squad and drain the opposing tickets.',
        winCondition: 'Perform your adaptive tactic and defeat four hostiles.',
        friendlySpawns: INSTRUCTORS.map((actor) => ({ ...actor.spawn })),
        friendlyTotal: 3,
        enemyTickets: 4,
      },
      biome: 'industrial',
      rows: [
        '.....................',
        '....BBB.....BBB......',
        '....B.........B......',
        '....B.........B......',
        '....BBB.....BBB......',
        '.....................',
        '=======.....=========',
        '.....................',
        '....SSS.....SSS......',
        '.....................',
        '=======.....=========',
        '.....................',
        '....BBB.....BWB.W....',
        '....B........WB.W....',
        '.....................',
        '.....................',
        '.....................',
      ],
      playerSpawn: { x: 10, y: 15 },
      enemySpawns: [{ x: 3, y: 1 }, { x: 10, y: 1 }, { x: 17, y: 1 }],
      retranslators: [{ x: 2, y: 8 }, { x: 18, y: 8 }],
      enemyTotal: 4,
      activeEnemyLimit: 3,
      spawnInterval: 5,
      roleWeights: TRAINING_ROLES,
      armoredEnemyRatio: 0.25,
      rewards: NO_REWARDS,
    },
    steps: [
      {
        id: 'welcome',
        goal: 'Confirm the combined-arms briefing.',
        trigger: { kind: 'confirm' },
        dialogue: [
          { speaker: 'Needle', text: 'I find the trouble.' },
          { speaker: 'Spanner', text: 'I arrange it.' },
          { speaker: 'Brick', text: 'I make it shorter.' },
        ],
      },
      {
        id: 'class-tactic',
        goal: 'Perform the class tactic selected for your tank.',
        trigger: { kind: 'objective', target: 'adaptive-tactic' },
        adaptiveGoals: [
          { classId: 'scout', goal: 'Place a decoy or tripwire in the marked recon lane.', trigger: { kind: 'deploy', count: 1, zone: { x: 10, y: 11, radius: 1 } } },
          { classId: 'engineer', goal: 'Place a mine or steel trap in the marked control lane.', trigger: { kind: 'deploy', count: 1, zone: { x: 10, y: 11, radius: 1 } } },
          { classId: 'battle', goal: 'Land a heavy hit or absorb an opening shot with your shield.', trigger: { kind: 'objective', target: 'battle-breach' } },
        ],
        adaptiveMode: 'class',
        dialogue: [{ speaker: 'General Rook', text: 'Use the class kit you brought. The marked lane is where it can help the squad.' }],
      },
      {
        id: 'mod-tactic',
        goal: 'Use your Major Mod in its marked tactical position.',
        trigger: { kind: 'objective', target: 'adaptive-tactic' },
        adaptiveGoals: [
          { majorMod: 'overdrive', goal: 'Activate Overdrive while moving through the marked flank.', trigger: { kind: 'mod', target: 'overdrive', zone: { x: 10, y: 9, radius: 1 }, requireMoving: true } },
          { majorMod: 'pontoon', goal: 'Create the marked water route with Pontoon.', trigger: { kind: 'mod', target: 'pontoon', zone: { x: 16, y: 14, radius: 0 } } },
          { majorMod: 'hedgehog', goal: 'Deny the marked choke with Hedgehog.', trigger: { kind: 'mod', target: 'hedgehog', zone: { x: 10, y: 10, radius: 1 } } },
          { majorMod: 'emp', goal: 'Disrupt the marked relay approach with EMP.', trigger: { kind: 'mod', target: 'emp', zone: { x: 13, y: 8, radius: 0 } } },
        ],
        adaptiveMode: 'mod',
        dialogue: [{ speaker: 'Spanner', text: 'Now place your Major Mod where its effect supports the plan. Geography is part of the equipment.' }],
      },
      {
        id: 'tickets',
        goal: 'Land a hit and help the squad defeat four hostiles.',
        trigger: { kind: 'destroy', count: 4, target: 'squad-with-player-hit' },
        dialogue: [{ speaker: 'Brick', text: 'Kits demonstrated. Now shorten the enemy ticket list with the squad.' }],
        completionDialogue: [{ speaker: 'Brick', text: 'That was coordination. Please do not tell headquarters; they may schedule it.' }],
      },
    ],
  },
  {
    id: 4,
    name: 'Borrowed Flag',
    subtitle: 'Capture The Flag',
    objectiveMode: 'ctf',
    briefing: 'Capture the enemy flag twice. Use the only crossing and adapt when the range changes.',
    recommendedClass: 'scout',
    recommendedMod: 'overdrive',
    actors: [
      {
        ...INSTRUCTORS[2]!,
        spawn: { x: 11, y: 9 },
      },
    ],
    scriptedDeployables: [{
      id: 'ctf-permanent-trap',
      kind: 'steel',
      cell: { x: 10, y: 8 },
      owner: 'enemy',
      ownerTankId: 'range-control',
      team: 'red',
      tutorialTrigger: 'flag-trap',
    }],
    level: {
      id: 4,
      name: 'Borrowed Flag',
      briefing: 'Brick waits in reserve while you run the flag route.',
      objective: {
        mode: 'ctf',
        label: 'Capture The Flag',
        briefing: 'Bring the enemy flag to the blue base twice.',
        winCondition: 'Capture the enemy flag twice.',
        friendlySpawns: [{ x: 11, y: 9 }],
        friendlyTotal: 1,
        flag: {
          playerBase: { x: 10, y: 15 },
          enemyFlag: { x: 10, y: 1 },
          capturesToWin: 2,
          transfer: {
            dropCell: { x: 10, y: 8 },
            receiveCell: { x: 10, y: 9 },
            gateCells: [],
            trapCell: { x: 10, y: 8 },
            activatesAfterCaptures: 1,
            handoffActorId: 'instructor-brick',
            handoffWaitCell: { x: 11, y: 9 },
          },
        },
      },
      biome: 'temperate',
      rows: [
        '.....................',
        '.....................',
        '....BBB.....BBB......',
        '....B.........B......',
        '....BBB.....BBB......',
        '.....................',
        '....WWW.....WWW......',
        '....WWW..=.=.WWW.....',
        'SSSSSSSSSS.SSSSSSSSSS',
        '....WWW..=.=.WWW.....',
        '....WWW.....WWW......',
        '.....................',
        '....BBB.....BBB......',
        '....B.........B......',
        '.....................',
        '.....................',
        '.....................',
      ],
      playerSpawn: { x: 10, y: 14 },
      enemySpawns: [{ x: 3, y: 2 }, { x: 17, y: 2 }],
      retranslators: [{ x: 2, y: 8 }, { x: 18, y: 8 }],
      enemyTotal: 2,
      activeEnemyLimit: 2,
      spawnInterval: 7,
      roleWeights: TRAINING_ROLES,
      armoredEnemyRatio: 0,
      rewards: NO_REWARDS,
    },
    steps: [
      {
        id: 'welcome',
        goal: 'Confirm the flag-handling briefing.',
        trigger: { kind: 'confirm' },
        dialogue: [{ speaker: 'Brick', text: 'Two captures earn clearance. Use the only crossing and bring each flag to the blue base.' }],
      },
      {
        id: 'pickup',
        goal: 'First run: pick up the enemy flag.',
        trigger: { kind: 'flag-pickup' },
        dialogue: [{ speaker: 'General Rook', text: 'First run is simple. Take the clear crossing, pick up the flag, and bring it straight home.' }],
      },
      {
        id: 'first-capture',
        goal: 'First run: bring the flag to the blue base.',
        trigger: { kind: 'flag-capture', count: 1, target: 'total' },
        dialogue: [{ speaker: 'General Rook', text: 'Flag secured. Return it to the blue base. No paperwork, just drive.' }],
      },
      {
        id: 'second-pickup',
        goal: 'Pick up the enemy flag for the next run.',
        trigger: { kind: 'flag-pickup' },
        dialogue: [{ speaker: 'Brick', text: 'One capture recorded. Take the flag again and bring it home.' }],
        holdDanger: true,
      },
      {
        id: 'return-second',
        goal: 'Return the flag to the blue base.',
        trigger: { kind: 'objective', target: 'flag-trap' },
        dialogue: [],
        holdDanger: true,
      },
      {
        id: 'trapped',
        goal: 'Permanent trap! Drop the flag for Brick.',
        trigger: { kind: 'flag-drop', target: 'flag-transfer' },
        dialogue: [{
          speaker: 'General Rook',
          text: 'Ambush. That permanent track trap has your tank. Use the flag-drop action to pass it to Brick on the clear side.',
        }],
        holdDanger: true,
      },
      {
        id: 'handoff',
        goal: 'Observe Brick complete the flag handoff.',
        trigger: { kind: 'flag-capture', count: 1, target: 'ally-handoff' },
        cameraCue: {
          target: { x: 11, y: 9 },
          duration: 8.5,
          holdDanger: true,
          label: 'Brick flag run',
          followActorId: 'instructor-brick',
          untilTrigger: true,
        },
        dialogue: [{
          speaker: 'General Rook',
          text: "That is a combat handoff. Passing the flag to a fresh tank keeps the operation moving and increases the operation's efficiency.",
        }],
        completionDialogue: [{ speaker: 'Brick', text: 'Second capture complete. The flag traveled business class; we did not.' }],
      },
    ],
  },
  {
    id: 5,
    name: 'No Friendlies on the Form',
    subtitle: 'Free For All',
    objectiveMode: 'ffa',
    briefing: 'Use a portable relay, challenge a false contact, recover and relocate the set, resupply, then score four kills.',
    recommendedClass: 'battle',
    recommendedMod: 'hedgehog',
    actors: [],
    scriptedDeployables: [{
      id: 'rook-decoy',
      kind: 'decoy',
      cell: { x: 10, y: 11 },
      owner: 'neutral',
      ownerTankId: 'range-control',
      team: 'red',
    }],
    level: {
      id: 5,
      name: 'No Friendlies on the Form',
      briefing: 'Every live tank is hostile, but not every relay contact is a tank. Verify the echo, relocate, and keep supplied.',
      objective: {
        mode: 'ffa',
        label: 'Free For All',
        briefing: 'Use relay contacts, cover, target priority, and the ammo station to score four kills.',
        winCondition: 'Score four player kills while the range replenishes hostile contacts.',
        neutralSpawns: [
          { x: 2, y: 1 },
          { x: 10, y: 1 },
          { x: 18, y: 1 },
          { x: 2, y: 9 },
          { x: 18, y: 9 },
        ],
        neutralTotal: 5,
        targetScore: 4,
      },
      biome: 'ruined_battlefield',
      rows: [
        '.....................',
        '.....................',
        '....BBB.....BBB......',
        '....B.........B......',
        '....BBB.....BBB......',
        '.....................',
        '=======.....=========',
        '.....................',
        '....hhh.....hhh......',
        '.....................',
        '=======.....=========',
        '.....................',
        '....BBB.....BWB......',
        '....B........WB......',
        '..........A..........',
        '.....................',
        '.....................',
      ],
      playerSpawn: { x: 10, y: 15 },
      enemySpawns: [
        { x: 2, y: 1 },
        { x: 10, y: 1 },
        { x: 18, y: 1 },
        { x: 2, y: 9 },
        { x: 18, y: 9 },
      ],
      retranslators: [],
      enemyTotal: 5,
      activeEnemyLimit: 5,
      continuousEnemySpawns: true,
      spawnInterval: 2.5,
      roleWeights: TRAINING_ROLES,
      armoredEnemyRatio: 0,
      rewards: NO_REWARDS,
    },
    steps: [
      {
        id: 'welcome',
        goal: 'Confirm relay and hostile-identification rules.',
        trigger: { kind: 'confirm' },
        dialogue: [{ speaker: 'General Rook', text: 'No friendly tanks are listed. The range will replenish hostiles, but first we learn to see before we shoot.' }],
      },
      {
        id: 'deploy-relay',
        goal: 'Deploy the portable relay from this covered position.',
        trigger: { kind: 'relay', count: 1, target: 'place' },
        holdDanger: true,
        dialogue: [{ speaker: 'General Rook', text: 'Deploy the portable relay here. Its pulses return wall echoes and mark contacts beyond your direct sight.' }],
      },
      {
        id: 'find-decoy',
        goal: 'Watch the relay pulse locate the hidden contact.',
        trigger: { kind: 'relay', target: 'contact:rook-decoy' },
        holdDanger: true,
        dialogue: [],
      },
      {
        id: 'decoy-lesson',
        goal: 'Drive to the marked inspection point beside the suspicious contact.',
        trigger: { kind: 'objective', target: 'reach-zone', zone: { x: 10, y: 12, radius: 0 } },
        cameraCue: {
          target: { x: 10, y: 11 },
          duration: 4.5,
          holdDanger: true,
          label: 'False relay contact',
        },
        dialogue: [{ speaker: 'General Rook', text: 'That contact is a decoy. Relays report echoes, not intentions; verify a marker before committing your tank to it.' }],
      },
      {
        id: 'recover-relay',
        goal: 'Recover the portable relay.',
        trigger: { kind: 'relay', count: 1, target: 'recover' },
        holdDanger: true,
        dialogue: [{ speaker: 'General Rook', text: 'Take the relay back. A useful set moves with the fight; an abandoned set becomes expensive scenery.' }],
      },
      {
        id: 'calibration-shot',
        goal: 'Fire one calibration round before resupplying.',
        trigger: { kind: 'fire', count: 1 },
        holdDanger: true,
        dialogue: [{ speaker: 'General Rook', text: 'Fire one round. We will use the empty rack to identify the yellow ammunition station.' }],
      },
      {
        id: 'resupply',
        goal: 'Move onto the yellow ammo station and hold position for one shell.',
        trigger: { kind: 'ammo', count: 1 },
        holdDanger: true,
        dialogue: [{ speaker: 'General Rook', text: 'The yellow station replenishes shells while you remain still on it. Plan resupply before the last round, not after it.' }],
      },
      {
        id: 'priority',
        goal: 'Use cover and relay awareness to destroy the first hostile.',
        trigger: { kind: 'destroy', count: 1 },
        dialogue: [{ speaker: 'General Rook', text: 'Live contacts are entering now. Use cover, verify the nearest threat, and finish one target before changing queues.' }],
      },
      {
        id: 'relocate-relay',
        goal: 'Relocate and deploy the relay behind your new cover.',
        trigger: { kind: 'relay', count: 1, target: 'place', zone: { x: 6, y: 9, radius: 1 } },
        dialogue: [{ speaker: 'General Rook', text: 'One confirmed. Reposition the relay so its next pulse supports where you are fighting now.' }],
      },
      {
        id: 'finish',
        goal: 'Use the relay, cover, and target priority to reach four kills.',
        trigger: { kind: 'destroy', count: 4, target: 'player-total' },
        dialogue: [{ speaker: 'General Rook', text: 'Reach four confirmed kills. The range replaces losses, so patience and position matter more than chasing every marker.' }],
        completionDialogue: [{ speaker: 'General Rook', text: 'Four confirmed. Free For All complete; the deconfliction meeting remains heroically understaffed.' }],
      },
    ],
  },
  {
    id: 6,
    name: 'Knock Before Breaching',
    subtitle: 'Assault graduation',
    objectiveMode: 'assault',
    briefing: 'Reveal the command core, combine the full squad’s class kits, and conduct a short graduation assault.',
    recommendedClass: 'engineer',
    recommendedMod: 'emp',
    actors: INSTRUCTORS,
    level: {
      id: 6,
      name: 'Knock Before Breaching',
      briefing: 'The full instructor squad supports a controlled breach of the command core.',
      objective: {
        mode: 'assault',
        label: 'Assault',
        briefing: 'Open the bunker route and destroy the command core.',
        winCondition: 'Destroy the command core with the instructor squad.',
        friendlySpawns: INSTRUCTORS.map((actor) => ({ ...actor.spawn })),
        friendlyTotal: 3,
        assault: {
          cell: { x: 10, y: 2 },
          hp: 6,
        },
      },
      biome: 'industrial',
      rows: [
        '.........SSS.........',
        '.........S.S.........',
        '.........SES.........',
        '....BBBB.....BBBB....',
        '....B...........B....',
        '....B...........B....',
        '....BBBB.....BBBB....',
        '.....................',
        '=======.....=========',
        '.....................',
        '....BBB.....BBB......',
        '....B.........B......',
        '....BBB.....BWB.W....',
        '....B........WB.W....',
        '.....................',
        '.....................',
        '.....................',
      ],
      playerSpawn: { x: 10, y: 15 },
      enemySpawns: [{ x: 3, y: 4 }, { x: 17, y: 4 }, { x: 10, y: 6 }],
      retranslators: [{ x: 3, y: 8 }, { x: 17, y: 8 }],
      enemyTotal: 3,
      activeEnemyLimit: 3,
      spawnInterval: 6,
      roleWeights: TRAINING_ROLES,
      armoredEnemyRatio: 0.34,
      rewards: NO_REWARDS,
    },
    steps: [
      {
        id: 'welcome',
        goal: 'Confirm graduation assault orders.',
        trigger: { kind: 'confirm' },
        dialogue: [{ speaker: 'General Rook', text: 'Final drill. Knock before breaching; it makes the breach seem organized.' }],
      },
      {
        id: 'reveal',
        goal: 'Watch the command-core camera reveal.',
        trigger: { kind: 'camera-complete' },
        cameraCue: { target: { x: 10, y: 2 }, duration: 5, holdDanger: true, label: 'Command core' },
        dialogue: [{ speaker: 'General Rook', text: 'Command core marked. Camera control returns before the hostiles are released.' }],
      },
      {
        id: 'adaptive',
        goal: 'Use your Major Mod in the marked breach position.',
        trigger: { kind: 'objective', target: 'adaptive-tactic' },
        adaptiveGoals: [
          { majorMod: 'overdrive', goal: 'Activate Overdrive while moving through the marked assault lane.', trigger: { kind: 'mod', target: 'overdrive', zone: { x: 10, y: 9, radius: 1 }, requireMoving: true } },
          { majorMod: 'pontoon', goal: 'Open the marked water route with Pontoon.', trigger: { kind: 'mod', target: 'pontoon', zone: { x: 16, y: 14, radius: 0 } } },
          { majorMod: 'hedgehog', goal: 'Deny the marked reinforcement choke with Hedgehog.', trigger: { kind: 'mod', target: 'hedgehog', zone: { x: 10, y: 9, radius: 1 } } },
          { majorMod: 'emp', goal: 'Place EMP within disruption range of the marked command relay.', trigger: { kind: 'mod', target: 'emp', zone: { x: 13, y: 8, radius: 0 } } },
        ],
        adaptiveMode: 'mod',
        dialogue: [{ speaker: 'Spanner', text: 'Use what you brought. Improvisation is doctrine with wet ink.' }],
      },
      {
        id: 'core',
        goal: 'Fire on the command core until it is destroyed.',
        trigger: { kind: 'objective', target: 'assault-core' },
        dialogue: [{ speaker: 'Spanner', text: 'Breach lane secure. The core is vulnerable now. Drive into the firing lane and finish it with your own cannon.' }],
        completionDialogue: [
          { speaker: 'Brick', text: 'Core down. I knocked. It was the shell.' },
          { speaker: 'General Rook', text: 'Boot Camp complete. Campaign command now has one fewer excuse.' },
        ],
      },
    ],
  },
]

export function getTutorialMission(id: number): TutorialMissionDefinition {
  return TUTORIAL_MISSIONS.find((mission) => mission.id === id) ?? TUTORIAL_MISSIONS[0]!
}

export function normalizeTutorialMissionId(id: number): TutorialMissionId {
  return Math.max(1, Math.min(TUTORIAL_MISSIONS.length, Math.floor(id || 1))) as TutorialMissionId
}

export function getUnlockedTutorialMissionIds(completedMissions: number[]): TutorialMissionId[] {
  const validCompleted = new Set(
    completedMissions
      .map((mission) => Math.floor(mission))
      .filter((mission): mission is TutorialMissionId => mission >= 1 && mission <= TUTORIAL_MISSIONS.length),
  )
  const firstIncomplete = TUTORIAL_MISSIONS.find((mission) => !validCompleted.has(mission.id))?.id
    ?? TUTORIAL_MISSIONS.length
  return TUTORIAL_MISSIONS
    .filter((mission) => validCompleted.has(mission.id) || mission.id === firstIncomplete)
    .map((mission) => mission.id)
}

export function getAdaptiveTutorialGoal(
  mission: TutorialMissionDefinition,
  classId: TankClassId,
  majorMod: MajorModKind,
  stepIndex: number,
) {
  const step = mission.steps[stepIndex]
  if (!step?.adaptiveGoals?.length) {
    return null
  }

  const preferred = step.adaptiveMode === 'class'
    ? step.adaptiveGoals.find((goal) => goal.classId === classId)
    : step.adaptiveGoals.find((goal) => goal.majorMod === majorMod)
  return preferred
    ?? step.adaptiveGoals.find((goal) => goal.classId === classId)
    ?? step.adaptiveGoals.find((goal) => goal.majorMod === majorMod)
    ?? step.adaptiveGoals[0]
    ?? null
}

export function getTutorialActionCue(
  mission: TutorialMissionDefinition,
  classId: TankClassId,
  majorMod: MajorModKind,
  stepIndex: number,
  playerCell?: { x: number; y: number },
): TutorialActionCue | null {
  const step = mission.steps[stepIndex]
  if (!step) {
    return null
  }

  const adaptive = step.trigger.kind === 'objective' && step.trigger.target === 'adaptive-tactic'
    ? getAdaptiveTutorialGoal(mission, classId, majorMod, stepIndex)
    : null
  const trigger = adaptive?.trigger ?? step.trigger
  const transferCell = trigger.kind === 'flag-drop' && trigger.target === 'flag-transfer'
    ? mission.level.objective.flag?.transfer?.dropCell
    : null
  const transferTrap = mission.level.objective.flag?.transfer?.trapCell
  if (
    transferCell
    && playerCell
    && (playerCell.x !== transferCell.x || playerCell.y !== transferCell.y)
  ) {
    if (transferTrap) {
      return null
    }
    return createActionCue('drive', 'TO XFER', DIRECTION_ACTION_KEYS, DIRECTION_ACTION_KEYS)
  }
  if (trigger.kind === 'ammo') {
    const onAmmoStation = Boolean(
      playerCell
      && mission.level.rows[playerCell.y]?.[playerCell.x] === 'A',
    )
    return onAmmoStation
      ? createActionCue('wait', 'HOLD POSITION', [], [])
      : createActionCue('drive', 'TO AMMO', DIRECTION_ACTION_KEYS, DIRECTION_ACTION_KEYS)
  }
  return getActionCueForTrigger(trigger)
}

function getActionCueForTrigger(trigger: TutorialTriggerDefinition): TutorialActionCue | null {
  if (trigger.kind === 'confirm') {
    return createActionCue('confirm', 'CONFIRM', ['ENTER'], ['TAP'])
  }
  if (trigger.kind === 'move') {
    return createActionCue('move', 'MOVE', DIRECTION_ACTION_KEYS, ['DRAG TO MOVE'])
  }
  if (trigger.kind === 'turn') {
    return createActionCue('turn', 'TURN', ['LEFT', 'RIGHT'], ['LEFT', 'RIGHT'])
  }
  if (trigger.kind === 'fire' || trigger.kind === 'destroy') {
    return createActionCue('fire', 'FIRE', ['SPACE'], ['FIRE'])
  }
  if (trigger.kind === 'relay') {
    if (trigger.target?.startsWith('contact:') || trigger.target === 'shared-contact') {
      return null
    }
    return createActionCue(
      'relay',
      trigger.target === 'recover' ? 'PICK UP RELAY' : 'DEPLOY RELAY',
      ['E'],
      ['RELAY ICON'],
    )
  }
  if (trigger.kind === 'deploy') {
    return createActionCue('deploy', 'PLACE KIT', ['1', '2'], ['KIT 1', 'KIT 2'])
  }
  if (trigger.kind === 'mod') {
    return createActionCue('mod', 'USE MOD', ['X'], ['MOD ICON'])
  }
  if (trigger.kind === 'objective' && trigger.target === 'flag-trap') {
    return createActionCue('drive', 'RETURN HOME', DIRECTION_ACTION_KEYS, DIRECTION_ACTION_KEYS)
  }
  if (trigger.kind === 'objective' && trigger.target === 'reach-zone') {
    return createActionCue('drive', 'TO MARKER', DIRECTION_ACTION_KEYS, DIRECTION_ACTION_KEYS)
  }
  if (trigger.kind === 'objective' && trigger.target === 'battle-breach') {
    return createActionCue('fire', 'LAND A HIT', ['SPACE'], ['FIRE'])
  }
  if (trigger.kind === 'flag-pickup' || trigger.kind === 'flag-capture') {
    if (trigger.target === 'ally-handoff') {
      return null
    }
    return createActionCue('drive', 'DRIVE', DIRECTION_ACTION_KEYS, DIRECTION_ACTION_KEYS)
  }
  if (trigger.kind === 'flag-drop') {
    return createActionCue('drop-flag', 'DROP FLAG', ['R'], ['FLAG'])
  }
  if (trigger.kind === 'objective' && trigger.target === 'assault-core') {
    return createActionCue('fire', 'FIRE', ['SPACE'], ['FIRE'])
  }
  return null
}

function createActionCue(
  kind: TutorialActionCue['kind'],
  label: string,
  keyboardKeys: string[],
  touchKeys: string[],
): TutorialActionCue {
  return {
    kind,
    label,
    keyboardKeys,
    touchKeys,
  }
}
