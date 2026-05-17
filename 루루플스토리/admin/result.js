/**
 * 루루플 결과 페이지
 * Google Sheets에서 데이터를 가져와 표시
 */

// ========== 설정 ==========
// Google Apps Script 웹앱 URL (배포 후 여기에 입력)
const API_URL =
  'https://script.google.com/macros/s/AKfycbwpoXQFMdlROUKD7s9uxWTBHBJGsLghi5XH_yIHexkGhn5b7CB5-hSb8eCQEKy7V7Yb/exec';

// ========== 상수 ==========
const CERT_CATEGORIES = {
  cleaning: { name: '청소', emoji: '🧹', exp: 2 },
  exercise: { name: '운동', emoji: '🏃', exp: 2 },
  morning: { name: '기상', emoji: '⏰', exp: 1 },
  planning: { name: '계획', emoji: '📋', exp: 6 },
  study: { name: '공부', emoji: '📚', exp: 2 },
  medicine: { name: '약', emoji: '💊', exp: 1 },
  diary: { name: '일기', emoji: '📝', exp: 2 },
};

const EXP_PER_LEVEL = 5;

// ========== 이벤트 히스토리 ==========
const EVENT_HISTORY_STORAGE_KEY = 'lurupl_event_history';

// 로컬 시간대 기준 날짜 문자열 (YYYY-MM-DD)
function toLocalDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 저장된 이벤트 히스토리 불러오기
function loadEventHistory() {
  try {
    const saved = localStorage.getItem(EVENT_HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('이벤트 히스토리 불러오기 실패:', e);
    return [];
  }
}

// 현재 진행 중인 이벤트 가져오기
function getActiveEvents() {
  const events = loadEventHistory();
  const today = toLocalDateStr(new Date());
  return events.filter(e => e.enabled && e.startDate <= today && e.endDate >= today);
}

// 예정된 이벤트 가져오기
function getUpcomingEvents() {
  const events = loadEventHistory();
  const today = toLocalDateStr(new Date());
  return events.filter(e => e.enabled && e.startDate > today);
}

// 모든 활성 이벤트 (진행중 + 예정)
function getAllActiveEvents() {
  const events = loadEventHistory();
  const today = toLocalDateStr(new Date());
  return events.filter(e => e.enabled && e.endDate >= today);
}

const LEVEL_TITLES = [
  '새싹',
  '성장',
  '발전',
  '열정',
  '습관',
  '루틴',
  '마스터',
  '전문가',
  '영웅',
  '전설',
];

const ACCUMULATED_TITLES = [
  { minExp: 0, title: '뉴비', icon: '🌱' },
  { minExp: 30, title: '루키', icon: '🥉' },
  { minExp: 80, title: '브론즈', icon: '🥈' },
  { minExp: 150, title: '실버', icon: '🥇' },
  { minExp: 300, title: '골드', icon: '⭐' },
  { minExp: 500, title: '플래티넘', icon: '💎' },
  { minExp: 800, title: '다이아', icon: '👑' },
  { minExp: 1200, title: '마스터', icon: '🔥' },
  { minExp: 2000, title: '그랜드마스터', icon: '⚡' },
  { minExp: 3000, title: '레전드', icon: '🏆' },
];

// ========== 시즌 설정 ==========
const SEASON_CONFIG = {
  name: '작은 씨앗 시즌',
  emoji: '🌱',
  startDate: '2025-06-01',
  endDate: '2025-08-31',
  concept: '작은 실행이 모여 숲이 된다',
};

// 시즌 EXP 지급 규칙
const SEASON_EXP_RULES = {
  baseCert: 5,           // 일반 인증 1회
  firstDaily: 3,         // 오늘 첫 인증
  newCategory: 10,       // 새로운 카테고리 첫 인증
  streak3: 15,           // 3일 연속
  streak7: 30,           // 7일 연속
  cheer: 2,              // 응원 1회 (1일 3회 제한)
  cheerReceived: 1,      // 응원 받음
};

// 복귀 보너스
const RETURN_BONUS = [
  { days: 7, exp: 20, badge: '돌아왔다!' },
  { days: 14, exp: 35, badge: '다시 시작' },
  { days: 30, exp: 50, badge: '불사조' },
];

// 시즌 레벨표
const SEASON_LEVELS = [
  { level: 1, minExp: 0, emoji: '🌰', title: '씨앗', desc: '시작이 반이다' },
  { level: 2, minExp: 50, emoji: '🌱', title: '새싹', desc: '땅을 뚫고 나왔어요' },
  { level: 3, minExp: 120, emoji: '🌿', title: '풀잎', desc: '조금씩 자라는 중' },
  { level: 4, minExp: 220, emoji: '🪴', title: '화분', desc: '뿌리가 생겼어요' },
  { level: 5, minExp: 350, emoji: '🌳', title: '묘목', desc: '나무가 되어가는 중' },
  { level: 6, minExp: 500, emoji: '🌲', title: '나무', desc: '단단해졌어요' },
  { level: 7, minExp: 700, emoji: '🌸', title: '꽃나무', desc: '꽃이 피었어요' },
  { level: 8, minExp: 950, emoji: '🍎', title: '열매나무', desc: '결실을 맺었어요' },
  { level: 9, minExp: 1250, emoji: '🌳🌳', title: '작은 숲', desc: '혼자가 아니에요' },
  { level: 10, minExp: 1600, emoji: '🏕️', title: '쉼터가 된 숲', desc: '다른 사람의 쉼터가 됨' },
];

// 시즌 퀘스트
const SEASON_QUESTS = {
  daily: [
    { id: 'd1', title: '오늘 인증 1회', desc: '아무 카테고리나 1회 인증', exp: 5, check: (data) => data.todayCertCount >= 1 },
    { id: 'd2', title: '응원 1회', desc: '다른 사람에게 응원 남기기', exp: 3, check: (data) => data.todayCheerCount >= 1 },
  ],
  weekly: [
    { id: 'w1', title: '주간 인증 3회', desc: '이번 주 3회 이상 인증', exp: 20, check: (data) => data.weeklyCertCount >= 3 },
    { id: 'w2', title: '카테고리 2개 도전', desc: '서로 다른 카테고리 2개 인증', exp: 15, check: (data) => data.weeklyCategories >= 2 },
    { id: 'w3', title: '주말 인증', desc: '주말에도 인증 1회', exp: 10, check: (data) => data.weekendCert >= 1 },
  ],
};

// 시즌 배지
const SEASON_BADGES = [
  { id: 'returner', name: '돌아왔다!', emoji: '🌸', condition: 'return7' },
  { id: 'explorer', name: '탐험가', emoji: '🧭', condition: 'categories5' },
  { id: 'warm', name: '따뜻한 사람', emoji: '💖', condition: 'cheer50' },
  { id: 'steady', name: '꾸준한 발걸음', emoji: '👣', condition: 'streak7' },
  { id: 'phoenix', name: '불사조', emoji: '🔥', condition: 'return30' },
];

// 저장된 데이터
let resultData = null;

// ========== 유틸리티 함수 ==========
function calculateLevel(totalExp) {
  if (totalExp <= 0) return 1;
  return Math.floor(totalExp / EXP_PER_LEVEL) + 1;
}

function getLevelColor(level) {
  const hue = (level * 25) % 360;
  const saturation = 70 + (level % 10) * 2;
  const lightness = 55 + (level % 5) * 2;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getLevelTitle(level) {
  const baseTitle = LEVEL_TITLES[(level - 1) % 10];
  const tier = Math.floor((level - 1) / 10);
  if (tier === 0) return baseTitle;
  const tierNames = [
    '',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
    'IX',
    'X',
  ];
  if (tier < 10) return `${baseTitle} ${tierNames[tier]}`;
  return `${baseTitle} +${tier}`;
}

function getLevel(totalExp) {
  const level = calculateLevel(totalExp);
  return {
    level: level,
    name: getLevelTitle(level),
    minExp: (level - 1) * EXP_PER_LEVEL,
    color: getLevelColor(level),
  };
}

function getNextLevel(totalExp) {
  const currentLevel = calculateLevel(totalExp);
  const nextLevel = currentLevel + 1;
  return {
    level: nextLevel,
    minExp: (nextLevel - 1) * EXP_PER_LEVEL,
  };
}

function getAccumulatedTitle(totalExp) {
  let result = ACCUMULATED_TITLES[0];
  for (const title of ACCUMULATED_TITLES) {
    if (totalExp >= title.minExp) {
      result = title;
    } else {
      break;
    }
  }
  return result;
}

// ========== 시즌 유틸리티 함수 ==========
function getSeasonLevel(seasonExp) {
  let result = SEASON_LEVELS[0];
  for (const level of SEASON_LEVELS) {
    if (seasonExp >= level.minExp) {
      result = level;
    } else {
      break;
    }
  }
  return result;
}

function getNextSeasonLevel(seasonExp) {
  for (const level of SEASON_LEVELS) {
    if (seasonExp < level.minExp) {
      return level;
    }
  }
  return null; // 최고 레벨 도달
}

function getSeasonDaysLeft() {
  const endDate = new Date(SEASON_CONFIG.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function isSeasonActive() {
  const today = new Date();
  const start = new Date(SEASON_CONFIG.startDate);
  const end = new Date(SEASON_CONFIG.endDate);
  return today >= start && today <= end;
}

function formatSeasonPeriod() {
  const start = new Date(SEASON_CONFIG.startDate);
  const end = new Date(SEASON_CONFIG.endDate);
  const format = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return `${format(start)} ~ ${format(end)}`;
}

// ========== 시즌 표시 함수 ==========
function displaySeasonSection() {
  const section = document.getElementById('seasonSection');
  if (!section || !resultData) return;

  // 시즌 기본 정보
  document.getElementById('seasonName').textContent = SEASON_CONFIG.name;
  document.getElementById('seasonPeriod').textContent = formatSeasonPeriod();

  const daysLeft = getSeasonDaysLeft();
  document.getElementById('seasonDaysLeft').textContent = daysLeft > 0 ? `D-${daysLeft}` : '종료됨';

  // 시즌 데이터 계산 (임시 - 실제로는 서버에서 받아야 함)
  displaySeasonMyStatus();
  displaySeasonQuests();
  displaySeasonLevelTrack();
  displaySeasonTop10();
}

function displaySeasonMyStatus() {
  // 모든 멤버의 시즌 EXP 계산 (임시로 월간 데이터 기반으로 시뮬레이션)
  const members = Object.entries(resultData.members || {});
  if (members.length === 0) return;

  // 첫 번째 멤버 기준으로 표시 (실제로는 현재 사용자 기준)
  // 실제 구현 시에는 로그인된 사용자 또는 선택된 사용자 기준
  const [topName, topData] = members.sort((a, b) => (b[1].netExp || 0) - (a[1].netExp || 0))[0];

  // 시즌 EXP 시뮬레이션 (실제로는 별도 저장)
  const simulatedSeasonExp = Math.floor((topData.totalExp || 0) * 0.3);

  const currentLevel = getSeasonLevel(simulatedSeasonExp);
  const nextLevel = getNextSeasonLevel(simulatedSeasonExp);

  document.getElementById('seasonLevelEmoji').textContent = currentLevel.emoji;
  document.getElementById('seasonLevelName').textContent = `Lv.${currentLevel.level} ${currentLevel.title}`;
  document.getElementById('seasonLevelDesc').textContent = currentLevel.desc;
  document.getElementById('seasonExpValue').textContent = simulatedSeasonExp;

  if (nextLevel) {
    const progress = ((simulatedSeasonExp - currentLevel.minExp) / (nextLevel.minExp - currentLevel.minExp)) * 100;
    document.getElementById('seasonProgressFill').style.width = `${Math.max(0, Math.min(100, progress))}%`;
    document.getElementById('seasonExpCurrent').textContent = `${simulatedSeasonExp} / ${nextLevel.minExp} EXP`;
    document.getElementById('seasonNextLevel').textContent = `다음: Lv.${nextLevel.level} ${nextLevel.title}`;
  } else {
    document.getElementById('seasonProgressFill').style.width = '100%';
    document.getElementById('seasonExpCurrent').textContent = `${simulatedSeasonExp} EXP (MAX)`;
    document.getElementById('seasonNextLevel').textContent = '최고 레벨 달성!';
  }

  // 배지 표시
  displaySeasonBadges(topData);
}

function displaySeasonBadges(memberData) {
  const container = document.getElementById('seasonBadges');
  if (!container) return;

  const earnedBadges = [];

  // 연속 인증 배지
  if ((memberData.maxStreak || 0) >= 7) {
    earnedBadges.push({ emoji: '👣', name: '꾸준한 발걸음' });
  }

  // 카테고리 탐험가 (5개 이상)
  const categories = Object.keys(memberData.categoryCount || {}).filter(k => memberData.categoryCount[k] > 0);
  if (categories.length >= 5) {
    earnedBadges.push({ emoji: '🧭', name: '탐험가' });
  }

  container.innerHTML = earnedBadges.length > 0
    ? earnedBadges.map(b => `<span class="season-badge earned">${b.emoji} ${b.name}</span>`).join('')
    : '<span class="season-badge locked">🔒 아직 획득한 배지가 없어요</span>';
}

function displaySeasonQuests() {
  const container = document.getElementById('seasonQuestList');
  if (!container) return;

  // 주간 퀘스트 표시
  const quests = SEASON_QUESTS.weekly;

  // 임시 데이터 (실제로는 서버에서)
  const mockData = {
    weeklyCertCount: 2,
    weeklyCategories: 1,
    weekendCert: 0,
  };

  container.innerHTML = quests.map(quest => {
    const completed = quest.check(mockData);
    return `
      <div class="quest-item ${completed ? 'completed' : ''}">
        <div class="quest-check">${completed ? '✓' : ''}</div>
        <div class="quest-content">
          <div class="quest-title">${quest.title}</div>
          <div class="quest-desc">${quest.desc}</div>
        </div>
        <div class="quest-reward">+${quest.exp} EXP</div>
      </div>
    `;
  }).join('');
}

function displaySeasonLevelTrack() {
  const container = document.getElementById('seasonLevelTrack');
  if (!container) return;

  // 현재 레벨 계산
  const members = Object.entries(resultData.members || {});
  let currentSeasonExp = 0;
  if (members.length > 0) {
    const [, topData] = members.sort((a, b) => (b[1].netExp || 0) - (a[1].netExp || 0))[0];
    currentSeasonExp = Math.floor((topData.totalExp || 0) * 0.3);
  }
  const currentLevel = getSeasonLevel(currentSeasonExp);

  container.innerHTML = SEASON_LEVELS.map(level => {
    let stateClass = 'locked';
    if (currentSeasonExp >= level.minExp) {
      stateClass = level.level === currentLevel.level ? 'current' : 'achieved';
    }
    return `
      <div class="level-node ${stateClass}">
        <div class="emoji">${level.emoji}</div>
        <div class="lv">Lv.${level.level}</div>
        <div class="exp">${level.minExp}</div>
      </div>
    `;
  }).join('');
}

function displaySeasonTop10() {
  const container = document.getElementById('seasonTop10');
  if (!container || !resultData.members) return;

  // 시즌 EXP 기준 정렬 (임시로 총 EXP의 30%로 시뮬레이션)
  const members = Object.entries(resultData.members)
    .map(([name, data]) => ({
      name,
      seasonExp: Math.floor((data.totalExp || 0) * 0.3),
      data,
    }))
    .sort((a, b) => b.seasonExp - a.seasonExp)
    .slice(0, 10);

  container.innerHTML = members.map((member, idx) => {
    const level = getSeasonLevel(member.seasonExp);
    const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
    return `
      <div class="top10-item">
        <div class="rank ${rankClass}">${idx + 1}</div>
        <div class="info">
          <div class="name">${member.name}</div>
          <div class="level">${level.emoji} ${level.title}</div>
        </div>
        <div class="exp">${member.seasonExp}</div>
      </div>
    `;
  }).join('');
}

// ========== 데이터 로드 ==========
async function loadData() {
  const loadingSection = document.getElementById('loadingSection');
  const errorSection = document.getElementById('errorSection');
  const resultsSection = document.getElementById('resultsSection');

  loadingSection.style.display = 'block';
  errorSection.style.display = 'none';
  resultsSection.style.display = 'none';

  try {
    // 캐시 방지를 위한 타임스탬프 추가
    const url = `${API_URL}?t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`데이터를 불러올 수 없습니다. (${response.status})`);

    resultData = await response.json();

    if (!resultData || !resultData.members) {
      throw new Error('유효하지 않은 데이터입니다.');
    }

    loadingSection.style.display = 'none';
    resultsSection.style.display = 'block';

    displayResults();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    loadingSection.style.display = 'none';
    errorSection.style.display = 'block';
    document.getElementById('errorMessage').textContent = error.message;
  }
}

// ========== 주간 마감 계산 ==========
function getWeekDeadline() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = 일요일
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);

  return sunday;
}

function getTimeRemaining() {
  const deadline = getWeekDeadline();
  const now = new Date();
  const diff = deadline - now;

  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes, expired: false };
}

function getAlertLevel(certCount, hoursRemaining) {
  const MIN_CERTS = 3;
  const remaining = MIN_CERTS - certCount;

  if (certCount >= MIN_CERTS) {
    return { level: 'safe', icon: '', text: '완료', color: '#22c55e' };
  }

  if (certCount === 0 && hoursRemaining < 24) {
    return { level: 'danger', icon: '', text: '강퇴 임박', color: '#ef4444' };
  }

  if (remaining >= 2 && hoursRemaining < 24) {
    return { level: 'danger', icon: '', text: '강퇴 임박', color: '#ef4444' };
  }

  if (remaining >= 1 && hoursRemaining < 48) {
    return { level: 'warning', icon: '', text: `${remaining}회 부족`, color: '#f59e0b' };
  }

  if (certCount === 2) {
    return { level: 'caution', icon: '', text: '1회 남음', color: '#eab308' };
  }

  if (certCount === 1) {
    return { level: 'warning', icon: '', text: '2회 부족', color: '#f59e0b' };
  }

  return { level: 'danger', icon: '', text: '3회 필요', color: '#ef4444' };
}

// ========== 주간 경고 표시 ==========
function displayWeeklyAlerts() {
  const alertSection = document.getElementById('weeklyAlertSection');
  const alertGrid = document.getElementById('alertGrid');
  const deadlineTimer = document.getElementById('deadlineTimer');

  if (!resultData || !resultData.members) {
    alertSection.style.display = 'none';
    return;
  }

  // 마감까지 남은 시간 표시
  const timeRemaining = getTimeRemaining();
  if (timeRemaining.expired) {
    deadlineTimer.innerHTML = `<span class="timer-expired">이번 주 마감됨</span>`;
  } else {
    const urgencyClass = timeRemaining.hours < 24 ? 'timer-urgent' :
                         timeRemaining.hours < 48 ? 'timer-warning' : 'timer-normal';
    deadlineTimer.innerHTML = `
      <span class="${urgencyClass}">
        마감까지 ${timeRemaining.hours}시간 ${timeRemaining.minutes}분
      </span>
    `;
  }

  alertGrid.innerHTML = '';

  const memberAlerts = [];

  for (const [nickname, data] of Object.entries(resultData.members)) {
    const weeklyCertCount = data.weeklyCertCount || 0;
    const alert = getAlertLevel(weeklyCertCount, timeRemaining.hours);

    memberAlerts.push({
      name: nickname,
      certCount: weeklyCertCount,
      alert: alert,
    });
  }

  // 위험도 순으로 정렬 (위험 > 경고 > 주의 > 안전)
  const levelOrder = { danger: 0, warning: 1, caution: 2, safe: 3 };
  memberAlerts.sort((a, b) => {
    const levelDiff = levelOrder[a.alert.level] - levelOrder[b.alert.level];
    if (levelDiff !== 0) return levelDiff;
    return a.certCount - b.certCount;
  });

  memberAlerts.forEach(({ name, certCount, alert }) => {
    const card = document.createElement('div');
    card.className = `alert-card alert-${alert.level}`;

    const progressWidth = Math.min((certCount / 3) * 100, 100);

    card.innerHTML = `
      <div class="alert-icon">${alert.icon}</div>
      <div class="alert-content">
        <div class="alert-name">${name}</div>
        <div class="alert-progress">
          <div class="alert-progress-bar">
            <div class="alert-progress-fill" style="width: ${progressWidth}%; background: ${alert.color}"></div>
          </div>
          <span class="alert-count">${certCount}/3회</span>
        </div>
      </div>
      <div class="alert-status" style="background: ${alert.color}20; color: ${alert.color}">
        ${alert.text}
      </div>
    `;

    alertGrid.appendChild(card);
  });

  alertSection.style.display = 'block';
}

// ========== 결과 표시 ==========
function displayResults() {
  if (!resultData) return;

  // 마지막 업데이트 시간
  if (resultData.lastUpdated) {
    document.getElementById('lastUpdated').textContent =
      `마지막 업데이트: ${resultData.lastUpdated}`;
  }

  // 요약 정보
  const now = new Date();
  const monthName = `${now.getMonth() + 1}월`;
  document.getElementById('totalCount').textContent =
    `${monthName} ${resultData.monthlyCount || 0}회 (${resultData.monthlyExp || 0}EXP)`;

  // 1위 정보
  const members = Object.entries(resultData.members || {}).sort(
    (a, b) => (b[1].netExp || 0) - (a[1].netExp || 0),
  );

  if (members.length > 0) {
    const [topName, topData] = members[0];
    const topNetExp = topData.netExp || 0;
    const level = getLevel(topNetExp);
    const nextLevel = getNextLevel(topNetExp);

    document.getElementById('currentLevel').textContent = `Lv.${level.level}`;
    document.getElementById('currentLevel').style.color = level.color;
    document.getElementById('levelName').textContent = `${level.name} (1위)`;

    const progress =
      ((topNetExp - level.minExp) / (nextLevel.minExp - level.minExp)) * 100;
    document.getElementById('progressFill').style.width =
      `${Math.max(0, progress)}%`;
    document.getElementById('progressText').textContent =
      `${topNetExp} / ${nextLevel.minExp} EXP`;
  }

  displayEventBanners(); // 이벤트 배너 표시
  displaySeasonSection(); // 시즌 섹션 표시
  displayWeeklyAlerts(); // 주간 경고 먼저 표시
  displayWeeklyRankings();
  displayTimeActivity();
  displayCategories();
  displayLeaderboard();
  displayRankingHistory();
}

// ========== 이벤트 배너 표시 ==========
function displayEventBanners() {
  const container = document.getElementById('eventBanners');
  if (!container) return;

  const activeEvents = getActiveEvents();
  const upcomingEvents = getUpcomingEvents();

  container.innerHTML = '';

  // 진행 중인 이벤트
  activeEvents.forEach(event => {
    const daysLeft = Math.ceil((new Date(event.endDate) - new Date()) / (1000 * 60 * 60 * 24));

    let categoryText = '전체 카테고리';
    if (event.categories && event.categories.length > 0) {
      categoryText = event.categories.map(c => {
        const cat = CERT_CATEGORIES[c];
        return cat ? `${cat.emoji} ${cat.name}` : c;
      }).join(', ');
    }

    const banner = document.createElement('div');
    banner.className = 'event-banner active';
    banner.innerHTML = `
      <div class="event-emoji">${event.emoji || '🎉'}</div>
      <div class="event-info">
        <div class="event-name">${event.name}</div>
        <div class="event-details">
          <span class="event-period">📅 ${event.startDate} ~ ${event.endDate}</span>
          <span class="event-categories">| 대상: ${categoryText}</span>
        </div>
      </div>
      <div class="event-right">
        <div class="event-multiplier">x${event.expMultiplier}</div>
        <div class="event-days-left">D-${daysLeft}</div>
      </div>
    `;
    container.appendChild(banner);
  });

  // 예정된 이벤트 (1개만 표시)
  if (upcomingEvents.length > 0) {
    const event = upcomingEvents[0];
    const daysUntil = Math.ceil((new Date(event.startDate) - new Date()) / (1000 * 60 * 60 * 24));

    const banner = document.createElement('div');
    banner.className = 'event-banner upcoming';
    banner.innerHTML = `
      <div class="event-emoji">📢</div>
      <div class="event-info">
        <div class="event-name">예정: ${event.name}</div>
        <div class="event-details">
          <span class="event-period">📅 ${event.startDate} 시작</span>
          <span class="event-multiplier-text">경험치 ${event.expMultiplier}배</span>
        </div>
      </div>
      <div class="event-right">
        <div class="event-countdown">${daysUntil}일 후 시작</div>
      </div>
    `;
    container.appendChild(banner);
  }

  // 이벤트가 없으면 숨김
  if (activeEvents.length === 0 && upcomingEvents.length === 0) {
    container.style.display = 'none';
  } else {
    container.style.display = 'block';
  }
}

// ========== 주간 랭킹 ==========
function displayWeeklyRankings() {
  const container = document.getElementById('weeklyRankings');
  container.innerHTML = '';

  if (!resultData.weeklyData || resultData.weeklyData.length === 0) {
    container.innerHTML = '<div class="no-data">주간 데이터가 없습니다</div>';
    return;
  }

  resultData.weeklyData.forEach((weekInfo, idx) => {
    const weekCard = document.createElement('div');
    weekCard.className = `week-card ${weekInfo.isCurrentWeek ? 'current' : ''} ${weekInfo.isPastWeek ? 'past' : ''}`;

    let rankingsHtml = '';
    const top3 = weekInfo.rankings?.slice(0, 3) || [];

    if (top3.length === 0) {
      rankingsHtml = '<div class="no-data">아직 데이터가 없습니다</div>';
    } else {
      const rankClasses = ['gold', 'silver', 'bronze'];
      const rankEmojis = ['🥇', '🥈', '🥉'];

      top3.forEach((member, i) => {
        let changeIndicator = '';
        if (member.rankChange !== undefined && member.rankChange !== null) {
          if (member.rankChange > 0) {
            changeIndicator = `<span class="rank-up">▲${member.rankChange}</span>`;
          } else if (member.rankChange < 0) {
            changeIndicator = `<span class="rank-down">▼${Math.abs(member.rankChange)}</span>`;
          } else {
            changeIndicator = `<span class="rank-same">-</span>`;
          }
        } else if (idx > 0) {
          changeIndicator = `<span class="rank-new">NEW</span>`;
        }

        rankingsHtml += `
                    <div class="week-rank-item ${rankClasses[i]}">
                        <span class="rank-emoji">${rankEmojis[i]}</span>
                        <span class="rank-name">${member.name}</span>
                        <span class="rank-exp">${member.exp} EXP</span>
                        ${changeIndicator}
                    </div>
                `;
      });
    }

    weekCard.innerHTML = `
            <div class="week-header">
                <span class="week-title">${weekInfo.week}주차</span>
                <span class="week-date">${weekInfo.dateRange || ''}</span>
                ${weekInfo.isCurrentWeek ? '<span class="week-badge">진행중</span>' : ''}
                ${weekInfo.isPastWeek ? '<span class="week-badge settled">정산완료</span>' : ''}
            </div>
            <div class="week-rankings">
                ${rankingsHtml}
            </div>
        `;

    container.appendChild(weekCard);
  });
}

// ========== 시간대별 활동 ==========
function displayTimeActivity() {
  const timeChart = document.getElementById('timeChart');
  const timeLabels = document.getElementById('timeLabels');
  const timeStats = document.getElementById('timeStats');

  timeChart.innerHTML = '';
  timeLabels.innerHTML = '';

  const hourlyCount = resultData.hourlyCount || new Array(24).fill(0);
  const maxCount = Math.max(...hourlyCount, 1);

  const colors = {
    cleaning: '#f472b6',
    exercise: '#22d3ee',
    morning: '#fbbf24',
    planning: '#a78bfa',
    study: '#4ade80',
    medicine: '#f87171',
    diary: '#fb923c',
  };

  for (let hour = 0; hour < 24; hour++) {
    const count = hourlyCount[hour] || 0;
    const heightPercent = (count / maxCount) * 100;

    const bar = document.createElement('div');
    bar.className = 'time-bar';
    bar.style.height = `${Math.max(heightPercent, 2)}%`;
    bar.style.background = count > 0 ? 'var(--primary)' : 'var(--border)';
    bar.title = `${hour}시: ${count}회`;

    timeChart.appendChild(bar);

    const label = document.createElement('span');
    label.className = 'time-label';
    if (hour % 3 === 0) {
      label.textContent = `${hour}`;
    }
    timeLabels.appendChild(label);
  }

  // 통계
  const peakHour = hourlyCount.indexOf(Math.max(...hourlyCount));
  const morningCount = hourlyCount.slice(5, 12).reduce((a, b) => a + b, 0);
  const afternoonCount = hourlyCount.slice(12, 18).reduce((a, b) => a + b, 0);
  const eveningCount = hourlyCount.slice(18, 24).reduce((a, b) => a + b, 0);
  const nightCount = hourlyCount.slice(0, 5).reduce((a, b) => a + b, 0);
  const totalValid = morningCount + afternoonCount + eveningCount + nightCount;

  timeStats.innerHTML = `
        <div class="time-stat">
            <span class="stat-icon">🌅</span>
            <span class="stat-label">피크 시간</span>
            <span class="stat-value">${peakHour}시</span>
        </div>
        <div class="time-stat">
            <span class="stat-icon">🌄</span>
            <span class="stat-label">오전 (5-11시)</span>
            <span class="stat-value">${morningCount}회 <small>(${totalValid > 0 ? ((morningCount / totalValid) * 100).toFixed(0) : 0}%)</small></span>
        </div>
        <div class="time-stat">
            <span class="stat-icon">☀️</span>
            <span class="stat-label">오후 (12-17시)</span>
            <span class="stat-value">${afternoonCount}회 <small>(${totalValid > 0 ? ((afternoonCount / totalValid) * 100).toFixed(0) : 0}%)</small></span>
        </div>
        <div class="time-stat">
            <span class="stat-icon">🌙</span>
            <span class="stat-label">저녁 (18-23시)</span>
            <span class="stat-value">${eveningCount}회 <small>(${totalValid > 0 ? ((eveningCount / totalValid) * 100).toFixed(0) : 0}%)</small></span>
        </div>
    `;
}

// ========== 카테고리 ==========
function displayCategories() {
  const grid = document.getElementById('categoryGrid');
  const pieChart = document.getElementById('pieChart');
  const pieLegend = document.getElementById('pieLegend');
  const pieTotal = document.getElementById('pieTotal');

  console.log('[DEBUG] displayCategories 호출됨');
  console.log('[DEBUG] CERT_CATEGORIES:', Object.keys(CERT_CATEGORIES));

  grid.innerHTML = '';
  pieLegend.innerHTML = '';

  const rawCategoryCount = resultData.categoryCount || {};
  // 모든 카테고리에 대해 기본값 0 보장
  const categoryCount = {
    cleaning: rawCategoryCount.cleaning || 0,
    exercise: rawCategoryCount.exercise || 0,
    morning: rawCategoryCount.morning || 0,
    planning: rawCategoryCount.planning || 0,
    study: rawCategoryCount.study || 0,
    medicine: rawCategoryCount.medicine || 0,
    diary: rawCategoryCount.diary || 0,
  };
  const colors = {
    cleaning: '#f472b6',
    exercise: '#22d3ee',
    morning: '#fbbf24',
    planning: '#a78bfa',
    study: '#4ade80',
    medicine: '#f87171',
    diary: '#fb923c',
  };

  const total = Object.values(categoryCount).reduce((a, b) => a + (b || 0), 0);
  pieTotal.textContent = total;

  let gradientParts = [];
  let currentAngle = 0;

  for (const [category, data] of Object.entries(CERT_CATEGORIES)) {
    const count = categoryCount[category] || 0;
    const totalExp = count * data.exp;

    console.log(`[DEBUG] 카테고리 카드 생성: ${category} (${data.name})`);

    const card = document.createElement('div');
    card.className = `category-card ${category}`;
    card.innerHTML = `
            <div class="emoji">${data.emoji}</div>
            <div class="name">${data.name} <span class="exp-badge">+${data.exp}EXP</span></div>
            <div class="count">${count}회</div>
            <div class="exp-total">${totalExp} EXP</div>
        `;
    grid.appendChild(card);

    // 파이 차트
    if (count > 0) {
      const angle = (count / total) * 360;
      gradientParts.push(
        `${colors[category]} ${currentAngle}deg ${currentAngle + angle}deg`,
      );
      currentAngle += angle;
    }

    // 범례
    const percent = total > 0 ? (count / total) * 100 : 0;
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
            <span class="legend-color" style="background: ${colors[category]}"></span>
            <span class="legend-name">${data.emoji} ${data.name}</span>
            <span class="legend-value">${count}회</span>
            <span class="legend-percent">${percent.toFixed(1)}%</span>
        `;
    pieLegend.appendChild(legendItem);
  }

  if (gradientParts.length > 0) {
    pieChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
  } else {
    pieChart.style.background = `conic-gradient(var(--border) 0deg 360deg)`;
  }
}

// ========== 리더보드 ==========
function displayLeaderboard() {
  const leaderboard = document.getElementById('leaderboard');
  leaderboard.innerHTML = '';

  const members = Object.entries(resultData.members || {}).sort(
    (a, b) => (b[1].netExp || 0) - (a[1].netExp || 0),
  );

  members.forEach(([nickname, data], index) => {
    const netExp = data.netExp || 0;
    const totalExp = data.totalExp || 0;
    const monthlyLevel = getLevel(netExp);
    const totalLevel = getLevel(totalExp);
    const accTitle = getAccumulatedTitle(totalExp);
    const rankClass =
      index === 0
        ? 'gold'
        : index === 1
          ? 'silver'
          : index === 2
            ? 'bronze'
            : '';

    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    item.innerHTML = `
            <div class="rank ${rankClass}">${index + 1}</div>
            <div class="member-info">
                <div class="member-name">${nickname}</div>
                <div class="member-levels">
                    <span class="level-monthly" style="color: ${monthlyLevel.color}">월간 Lv.${monthlyLevel.level}</span>
                    <span class="level-divider">|</span>
                    <span class="level-total" style="color: ${totalLevel.color}">누적 Lv.${totalLevel.level}</span>
                </div>
                <div class="member-badges">
                    <span class="acc-title">${accTitle.icon} ${accTitle.title}</span>
                </div>
            </div>
            <div class="member-stats">
                <div class="member-count">${netExp} EXP</div>
                <div class="member-categories">${data.monthlyCount || 0}회 (${data.certDays || 0}일)</div>
                <div class="member-total">누적 ${totalExp} EXP</div>
            </div>
        `;
    leaderboard.appendChild(item);
  });
}

// ========== 랭킹 히스토리 ==========
function displayRankingHistory() {
  const tbody = document.getElementById('historyBody');
  tbody.innerHTML = '';

  const rankings = resultData.monthlyRankings || [];

  if (rankings.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">데이터가 없습니다</td></tr>';
    return;
  }

  rankings.forEach(({ month, top3, isCurrentMonth }) => {
    const row = document.createElement('tr');
    if (isCurrentMonth) row.className = 'current-month';

    const rankCells = [0, 1, 2]
      .map((idx) => {
        const data = top3[idx];
        if (data) {
          return `<td><div class="rank-cell"><span>${data.name}</span><span class="rank-exp">${data.exp}EXP</span></div></td>`;
        }
        return '<td>-</td>';
      })
      .join('');

    row.innerHTML = `
            <td class="month-cell">${month}${isCurrentMonth ? ' (진행중)' : ''}</td>
            ${rankCells}
        `;

    tbody.appendChild(row);
  });
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', loadData);
