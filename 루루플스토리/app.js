/**
 * 루루플 인증 레벨 시스템
 * ADHD 실행력 향상을 위한 과학적 설계 기반
 */

const CERT_CATEGORIES = {
  cleaning: {
    name: '청소',
    emoji: '🧹',
    exp: 2,
    dailyLimit: 3,
    tags: ['#청소', '#방청소', '#정리', '#설거지', '#빨래', '#집안일'],
  },
  exercise: {
    name: '운동',
    emoji: '🏃',
    exp: 2,
    dailyLimit: 2,
    tags: ['#운동', '#헬스', '#러닝', '#산책', '#식단'],
  },
  morning: {
    name: '기상',
    emoji: '⏰',
    exp: 1,
    dailyLimit: 1,
    tags: ['#기상', '#굿모닝', '#아침'],
  },
  planning: {
    name: '계획',
    emoji: '📋',
    exp: 3,
    dailyLimit: 1,
    tags: ['#계획', '#계획표', '#투두', '#todo', '#할일'],
  },
  study: {
    name: '공부',
    emoji: '📚',
    exp: 2,
    dailyLimit: 1,
    tags: ['#공부', '#스터디', '#독서', '#학습'],
  },
  medicine: {
    name: '약',
    emoji: '💊',
    exp: 1,
    dailyLimit: 1,
    tags: ['#약', '#복약', '#약먹기', '#약복용', '#영양제'],
  },
};

// 월간 레벨 시스템 (경험치 기반)
const EXP_PER_LEVEL = 5; // 레벨당 필요 경험치 (한 달 최대 Lv.100)
const PENALTY_PER_DAY = 1; // 인증 안 한 날 하루당 페널티
const MORNING_TOLERANCE = 10; // 기상 인증 허용 오차 (분)

// 멤버별 목표 기상 시간 저장
let memberWakeUpTimes = {};

// 원본 채팅 내용 저장
let rawChatContent = '';

// 레벨 타이틀 (10레벨 단위로 순환)
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

// 누적 칭호 (총 누적 경험치 기반, 영구)
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

// 연속 달성 배지
const STREAK_BADGES = [
  { months: 2, badge: '연속 2개월', icon: '🔥' },
  { months: 3, badge: '연속 3개월', icon: '🔥🔥' },
  { months: 6, badge: '반년 연속', icon: '💪' },
  { months: 12, badge: '1년 연속', icon: '🏅' },
];

// 누적 칭호 계산
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

// 연속 달성 개월 수 계산
function calculateStreak(records) {
  // 월별로 인증 여부 확인
  const monthlyData = {};

  records.forEach((r) => {
    if (!r.date || r.exp <= 0) return;
    const yearMonth = r.date.substring(0, 7); // "2024-01"
    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = 0;
    }
    monthlyData[yearMonth] += r.exp;
  });

  // 월 목록 정렬
  const months = Object.keys(monthlyData).sort().reverse();
  if (months.length === 0) return 0;

  // 현재 월부터 연속 달성 체크
  let streak = 0;
  const now = new Date();
  let checkYear = now.getFullYear();
  let checkMonth = now.getMonth() + 1;

  for (let i = 0; i < 24; i++) {
    // 최대 2년 체크
    const monthStr = `${checkYear}-${String(checkMonth).padStart(2, '0')}`;

    if (monthlyData[monthStr] && monthlyData[monthStr] >= EXP_PER_LEVEL) {
      streak++;
    } else if (i > 0) {
      // 현재 월은 진행중이므로 패스 가능
      break;
    }

    // 이전 달로 이동
    checkMonth--;
    if (checkMonth === 0) {
      checkMonth = 12;
      checkYear--;
    }
  }

  return streak;
}

// 연속 달성 배지 가져오기
function getStreakBadge(streak) {
  let result = null;
  for (const badge of STREAK_BADGES) {
    if (streak >= badge.months) {
      result = badge;
    }
  }
  return result;
}

// 전월 랭킹 계산
function getLastMonthRankings() {
  const now = new Date();
  let lastMonth = now.getMonth() - 1;
  let lastYear = now.getFullYear();

  if (lastMonth < 0) {
    lastMonth = 11;
    lastYear--;
  }

  const lastMonthStr = `${lastYear}-${String(lastMonth + 1).padStart(2, '0')}`;
  const memberExp = {};

  for (const [nickname, memberData] of Object.entries(analysisData.members)) {
    memberExp[nickname] = 0;

    memberData.records.forEach((record) => {
      if (
        record.date &&
        record.date.startsWith(lastMonthStr) &&
        record.exp > 0
      ) {
        memberExp[nickname] += record.exp;
      }
    });
  }

  // 경험치 있는 멤버만 정렬
  const sorted = Object.entries(memberExp)
    .filter(([, exp]) => exp > 0)
    .sort((a, b) => b[1] - a[1]);

  const rankings = {};
  sorted.forEach(([name, exp], idx) => {
    rankings[name] = {
      rank: idx + 1,
      exp: exp,
    };
  });

  return rankings;
}

// 전월 랭킹 테두리 정보
const LAST_MONTH_BORDERS = {
  1: {
    class: 'prev-champion',
    title: '전월 챔피언',
    icon: '👑',
    color: '#fbbf24',
  },
  2: { class: 'prev-silver', title: '전월 2위', icon: '🥈', color: '#94a3b8' },
  3: { class: 'prev-bronze', title: '전월 3위', icon: '🥉', color: '#fb923c' },
  top10: {
    class: 'prev-top10',
    title: '전월 TOP 10',
    icon: '⭐',
    color: '#a78bfa',
  },
};

// 레벨 색상 (그라데이션으로 무한 확장)
function getLevelColor(level) {
  const hue = (level * 25) % 360;
  const saturation = 70 + (level % 10) * 2;
  const lightness = 55 + (level % 5) * 2;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// 레벨 계산 (경험치 기반, 상한선 없음, 최소 1레벨)
function calculateLevel(totalExp) {
  if (totalExp <= 0) return 1;
  return Math.floor(totalExp / EXP_PER_LEVEL) + 1;
}

// 해당 레벨에 필요한 최소 경험치
function getExpForLevel(level) {
  return (level - 1) * EXP_PER_LEVEL;
}

// 레벨 타이틀 생성 (10레벨마다 등급 추가)
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

// 시간이 목표 시간 +-허용범위 내인지 확인
function isWithinTolerance(actualTime, targetTime, toleranceMinutes) {
  const [actualHour, actualMin] = actualTime.split(':').map(Number);
  const [targetHour, targetMin] = targetTime.split(':').map(Number);

  const actualTotalMin = actualHour * 60 + actualMin;
  const targetTotalMin = targetHour * 60 + targetMin;

  const diff = Math.abs(actualTotalMin - targetTotalMin);
  return diff <= toleranceMinutes;
}

// 현재 월의 시작일과 오늘 날짜 구하기
function getCurrentMonthInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstDay = new Date(year, month, 1);
  const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return { year, month, today, firstDayStr };
}

// 날짜가 이번 달인지 확인
function isCurrentMonth(dateStr) {
  if (!dateStr) return false;
  const { year, month } = getCurrentMonthInfo();
  const targetMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  return dateStr.startsWith(targetMonth);
}

// 멤버별 월간 데이터 계산 (인증 안 한 날 페널티 포함)
function calculateMonthlyData(memberRecords, nickname) {
  const { today } = getCurrentMonthInfo();

  // 이번 달 기록만 필터
  const monthlyRecords = memberRecords.filter((r) => isCurrentMonth(r.date));

  // 월간 획득 경험치 (유효한 인증만)
  let monthlyExp = 0;
  let monthlyCount = 0;
  const certDates = new Set();
  const categoryCount = {
    cleaning: 0,
    exercise: 0,
    morning: 0,
    planning: 0,
    study: 0,
    medicine: 0,
  };

  monthlyRecords.forEach((r) => {
    if (r.exp > 0) {
      monthlyExp += r.exp;
      monthlyCount++;
      certDates.add(r.date);
      categoryCount[r.category]++;
    }
  });

  // 인증 안 한 날 수 계산 (1일부터 오늘까지)
  const missedDays = today - certDates.size;
  const penalty = Math.max(0, missedDays) * PENALTY_PER_DAY;

  // 순 경험치 (최소 0)
  const netExp = Math.max(0, monthlyExp - penalty);

  return {
    monthlyExp,
    monthlyCount,
    missedDays: Math.max(0, missedDays),
    penalty,
    netExp,
    certDays: certDates.size,
    categoryCount,
  };
}

let analysisData = {
  records: [],
  members: {},
  // 전체 누적
  totalCount: 0,
  totalExp: 0,
  // 월간
  monthlyCount: 0,
  monthlyExp: 0,
  monthlyNetExp: 0,
  categoryCount: {
    cleaning: 0,
    exercise: 0,
    morning: 0,
    planning: 0,
    study: 0,
    medicine: 0,
  },
};

const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const settingsSection = document.getElementById('settingsSection');
const resultsSection = document.getElementById('resultsSection');
const memberSettings = document.getElementById('memberSettings');
const analyzeBtn = document.getElementById('analyzeBtn');

uploadBox.addEventListener('click', () => fileInput.click());
uploadBox.addEventListener('dragover', handleDragOver);
uploadBox.addEventListener('dragleave', handleDragLeave);
uploadBox.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
analyzeBtn.addEventListener('click', runAnalysis);

// 내보내기 버튼 이벤트
document
  .getElementById('exportAllPng')
  .addEventListener('click', exportAllToPng);
document
  .getElementById('exportLeaderboardPng')
  .addEventListener('click', exportLeaderboardToPng);
document.getElementById('exportTxt').addEventListener('click', exportToTxt);

document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document
      .querySelectorAll('.filter-btn')
      .forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    filterRecords(btn.dataset.filter);
  });
});

function handleDragOver(e) {
  e.preventDefault();
  uploadBox.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadBox.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  uploadBox.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    rawChatContent = e.target.result;
    // 1단계: 멤버 목록만 먼저 파싱
    const members = extractMembers(rawChatContent);
    if (members.length === 0) {
      alert(
        '멤버를 찾을 수 없습니다. 카카오톡 내보내기 파일인지 확인해주세요.',
      );
      return;
    }
    // 2단계: 설정 섹션 표시
    displayMemberSettings(members);
  };
  reader.readAsText(file, 'UTF-8');
}

// 멤버 목록만 추출 (나간 사람 자동 제외)
function extractMembers(content) {
  const members = new Set();
  const leftMembers = new Set();
  const lines = content.split('\n');
  const messagePattern = /\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]/;
  const leftPattern = /(.+)님이 나갔습니다/;

  lines.forEach((line) => {
    // 나간 사람 감지
    const leftMatch = line.match(leftPattern);
    if (leftMatch) {
      leftMembers.add(leftMatch[1].trim());
      return;
    }

    // 일반 메시지에서 멤버 추출
    const match = line.match(messagePattern);
    if (match) {
      members.add(match[1].trim());
    }
  });

  // 나간 사람 제외
  leftMembers.forEach((name) => members.delete(name));

  return Array.from(members).sort();
}

// 멤버별 설정 UI 표시
function displayMemberSettings(members) {
  memberSettings.innerHTML = '';

  members.forEach((nickname) => {
    const card = document.createElement('div');
    card.className = 'member-setting-card';
    card.innerHTML = `
            <div class="member-name">${nickname}</div>
            <div class="time-input-group">
                <label>목표 기상 시간:</label>
                <input type="time" id="wake-${nickname}" value="07:00">
            </div>
        `;
    memberSettings.appendChild(card);
  });

  settingsSection.style.display = 'block';
  resultsSection.style.display = 'none';
  settingsSection.scrollIntoView({ behavior: 'smooth' });
}

// 분석 시작 버튼 클릭
function runAnalysis() {
  // 멤버별 목표 기상 시간 수집
  memberWakeUpTimes = {};

  const timeInputs = memberSettings.querySelectorAll('input[type="time"]');
  timeInputs.forEach((input) => {
    const nickname = input.id.replace('wake-', '');
    memberWakeUpTimes[nickname] = input.value;
  });

  // 전체 분석 실행
  parseChat(rawChatContent);
  displayResults();
}

function parseChat(content) {
  analysisData = {
    records: [],
    members: {},
    totalCount: 0,
    totalExp: 0,
    monthlyCount: 0,
    monthlyExp: 0,
    monthlyNetExp: 0,
    categoryCount: {
      cleaning: 0,
      exercise: 0,
      morning: 0,
      planning: 0,
      study: 0,
      medicine: 0,
    },
  };

  const lines = content.split('\n');
  const messagePattern =
    /\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*(.+)/;
  const datePattern = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;

  let currentDate = '';

  // 일일 인증 횟수 추적: { "닉네임|날짜|카테고리": count }
  const dailyCertCounts = {};

  // 1차: 모든 기록 파싱
  lines.forEach((line) => {
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      currentDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      return;
    }

    const messageMatch = line.match(messagePattern);
    if (!messageMatch) return;

    const [, nickname, ampm, hour, minute, message] = messageMatch;
    const category = findCategory(message);
    if (!category) return;

    let hour24 = parseInt(hour);
    if (ampm === '오후' && hour24 !== 12) hour24 += 12;
    if (ampm === '오전' && hour24 === 12) hour24 = 0;
    const timeStr = `${hour24.toString().padStart(2, '0')}:${minute}`;

    let exp = CERT_CATEGORIES[category].exp;
    let isValidMorning = true;
    let isOverDailyLimit = false;

    // 기상 인증 시간 검증
    if (category === 'morning') {
      const targetTime = memberWakeUpTimes[nickname.trim()];
      if (targetTime) {
        isValidMorning = isWithinTolerance(
          timeStr,
          targetTime,
          MORNING_TOLERANCE,
        );
        if (!isValidMorning) {
          exp = 0; // 시간 벗어나면 경험치 0
        }
      }
    }

    // 일일 제한 검증
    const dailyKey = `${nickname.trim()}|${currentDate}|${category}`;
    if (!dailyCertCounts[dailyKey]) {
      dailyCertCounts[dailyKey] = 0;
    }
    dailyCertCounts[dailyKey]++;

    const dailyLimit = CERT_CATEGORIES[category].dailyLimit;
    if (dailyCertCounts[dailyKey] > dailyLimit) {
      isOverDailyLimit = true;
      exp = 0; // 일일 제한 초과 시 경험치 0
    }

    const record = {
      date: currentDate,
      time: timeStr,
      nickname: nickname.trim(),
      message: message.trim(),
      category: category,
      tag: extractTag(message, category),
      exp: exp,
      isValidMorning: category === 'morning' ? isValidMorning : null,
      targetWakeTime:
        category === 'morning' ? memberWakeUpTimes[nickname.trim()] : null,
      isOverDailyLimit: isOverDailyLimit,
      dailyCertNum: dailyCertCounts[dailyKey],
    };

    analysisData.records.push(record);
    analysisData.totalCount++;
    analysisData.totalExp += exp;
    if (exp > 0) {
      analysisData.categoryCount[category]++;
    }

    if (!analysisData.members[nickname]) {
      analysisData.members[nickname] = {
        records: [],
        totalCount: 0,
        totalExp: 0,
        // 월간 데이터는 나중에 계산
        monthly: null,
        categoryCount: {
          cleaning: 0,
          exercise: 0,
          morning: 0,
          planning: 0,
          study: 0,
          medicine: 0,
        },
      };
    }
    analysisData.members[nickname].records.push(record);
    analysisData.members[nickname].totalCount++;
    analysisData.members[nickname].totalExp += exp;
    if (exp > 0) {
      analysisData.members[nickname].categoryCount[category]++;
    }
  });

  // 2차: 멤버별 월간 데이터 계산 (페널티 포함)
  for (const [nickname, memberData] of Object.entries(analysisData.members)) {
    memberData.monthly = calculateMonthlyData(memberData.records, nickname);
  }

  // 전체 월간 통계
  const { today } = getCurrentMonthInfo();
  const allMonthlyRecords = analysisData.records.filter((r) =>
    isCurrentMonth(r.date),
  );
  const allCertDates = new Set(allMonthlyRecords.map((r) => r.date));

  analysisData.monthlyCount = allMonthlyRecords.length;
  analysisData.monthlyExp = allMonthlyRecords.reduce(
    (sum, r) => sum + r.exp,
    0,
  );

  analysisData.records.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.time.localeCompare(a.time);
  });
}

function findCategory(message) {
  const lowerMessage = message.toLowerCase();
  for (const [category, data] of Object.entries(CERT_CATEGORIES)) {
    for (const tag of data.tags) {
      if (lowerMessage.includes(tag.toLowerCase())) {
        return category;
      }
    }
  }
  return null;
}

function extractTag(message, category) {
  const data = CERT_CATEGORIES[category];
  for (const tag of data.tags) {
    if (message.toLowerCase().includes(tag.toLowerCase())) {
      return tag;
    }
  }
  return '';
}

function getLevel(totalExp) {
  const level = calculateLevel(totalExp);
  return {
    level: level,
    name: getLevelTitle(level),
    minExp: getExpForLevel(level),
    color: getLevelColor(level),
  };
}

function getNextLevel(totalExp) {
  const currentLevel = calculateLevel(totalExp);
  const nextLevel = currentLevel + 1;
  return {
    level: nextLevel,
    name: getLevelTitle(nextLevel),
    minExp: getExpForLevel(nextLevel),
    color: getLevelColor(nextLevel),
  };
}

function displayResults() {
  if (analysisData.totalCount === 0) {
    alert(
      '인증 기록이 없습니다. 해시태그(#기상, #운동 등)가 포함된 메시지를 확인해주세요.',
    );
    return;
  }

  settingsSection.style.display = 'none';
  resultsSection.style.display = 'block';

  // 월간 정보 표시
  const { month, today } = getCurrentMonthInfo();
  const monthName = `${month + 1}월`;

  document.getElementById('totalCount').textContent =
    `${monthName} ${analysisData.monthlyCount}회 (${analysisData.monthlyExp}EXP)`;

  // 전체 중 1등의 월간 순경험치로 대표 레벨 표시
  const topMember = Object.entries(analysisData.members).sort(
    (a, b) => b[1].monthly.netExp - a[1].monthly.netExp,
  )[0];

  if (topMember) {
    const topNetExp = topMember[1].monthly.netExp;
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

  displayWeeklyRankings();
  displayTimeActivity();
  displayCategories();
  displayLeaderboard();
  displayWeeklyWarning();
  displayRankingHistory();
  displayRecords('all');
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// 주차 정보 계산 (해당 월의 몇 주차인지)
function getWeekOfMonth(dateStr) {
  const date = new Date(dateStr);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstMonday = new Date(firstDay);

  // 첫 번째 월요일 찾기
  const dayOfWeek = firstDay.getDay();
  const daysUntilMonday =
    dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  firstMonday.setDate(1 + daysUntilMonday);

  // 해당 날짜가 첫 번째 월요일 이전이면 1주차
  if (date < firstMonday) return 1;

  // 주차 계산
  const diffTime = date - firstMonday;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 2; // +2 because week 1 is before first Monday
}

// 주차별 날짜 범위 계산
function getWeekRanges(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let currentStart = new Date(firstDay);
  let weekNum = 1;

  while (currentStart <= lastDay) {
    const weekEnd = new Date(currentStart);
    // 해당 주의 일요일 또는 월말 중 빠른 날짜
    const daysUntilSunday = (7 - currentStart.getDay()) % 7;
    weekEnd.setDate(currentStart.getDate() + daysUntilSunday);

    if (weekEnd > lastDay) {
      weekEnd.setTime(lastDay.getTime());
    }

    weeks.push({
      week: weekNum,
      start: new Date(currentStart),
      end: new Date(weekEnd),
      startStr: currentStart.toISOString().split('T')[0],
      endStr: weekEnd.toISOString().split('T')[0],
    });

    // 다음 주 월요일로 이동
    currentStart = new Date(weekEnd);
    currentStart.setDate(currentStart.getDate() + 1);
    weekNum++;
  }

  return weeks;
}

// 주간 랭킹 계산
function calculateWeeklyRankings() {
  const { year, month } = getCurrentMonthInfo();
  const weeks = getWeekRanges(year, month);
  const weeklyData = [];

  weeks.forEach((weekInfo) => {
    const memberExp = {};

    // 해당 주간의 기록 집계
    for (const [nickname, memberData] of Object.entries(analysisData.members)) {
      memberExp[nickname] = 0;

      memberData.records.forEach((record) => {
        if (
          record.date >= weekInfo.startStr &&
          record.date <= weekInfo.endStr &&
          record.exp > 0
        ) {
          memberExp[nickname] += record.exp;
        }
      });
    }

    // 순위 정렬
    const sorted = Object.entries(memberExp)
      .filter(([, exp]) => exp > 0)
      .sort((a, b) => b[1] - a[1]);

    const rankings = sorted.map(([name, exp], idx) => ({
      rank: idx + 1,
      name,
      exp,
    }));

    weeklyData.push({
      ...weekInfo,
      rankings,
    });
  });

  // 주차별 순위 변동 계산
  for (let i = 1; i < weeklyData.length; i++) {
    const prevWeek = weeklyData[i - 1];
    const currWeek = weeklyData[i];

    currWeek.rankings.forEach((member) => {
      const prevRanking = prevWeek.rankings.find((r) => r.name === member.name);
      if (prevRanking) {
        member.rankChange = prevRanking.rank - member.rank; // 양수면 상승
        member.prevRank = prevRanking.rank;
      } else {
        member.rankChange = null; // 신규 진입
        member.prevRank = null;
      }
    });
  }

  return weeklyData;
}

// 주간 정산 표시
function displayWeeklyRankings() {
  const container = document.getElementById('weeklyRankings');
  container.innerHTML = '';

  const weeklyData = calculateWeeklyRankings();
  const { today } = getCurrentMonthInfo();

  // 현재 주차 확인
  const now = new Date();
  const currentWeekIdx = weeklyData.findIndex(
    (w) => now >= w.start && now <= w.end,
  );

  weeklyData.forEach((weekInfo, idx) => {
    const isCurrentWeek = idx === currentWeekIdx;
    const isPastWeek = idx < currentWeekIdx || currentWeekIdx === -1;

    const weekCard = document.createElement('div');
    weekCard.className = `week-card ${isCurrentWeek ? 'current' : ''} ${isPastWeek ? 'past' : ''}`;

    const startDate = `${weekInfo.start.getMonth() + 1}/${weekInfo.start.getDate()}`;
    const endDate = `${weekInfo.end.getMonth() + 1}/${weekInfo.end.getDate()}`;

    let rankingsHtml = '';
    const top3 = weekInfo.rankings.slice(0, 3);

    if (top3.length === 0) {
      rankingsHtml = '<div class="no-data">아직 데이터가 없습니다</div>';
    } else {
      const rankClasses = ['gold', 'silver', 'bronze'];
      const rankEmojis = ['🥇', '🥈', '🥉'];

      top3.forEach((member, i) => {
        let changeIndicator = '';
        if (idx > 0 && member.rankChange !== null) {
          if (member.rankChange > 0) {
            changeIndicator = `<span class="rank-up">▲${member.rankChange}</span>`;
          } else if (member.rankChange < 0) {
            changeIndicator = `<span class="rank-down">▼${Math.abs(member.rankChange)}</span>`;
          } else {
            changeIndicator = `<span class="rank-same">-</span>`;
          }
        } else if (idx > 0 && member.rankChange === null) {
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
                <span class="week-date">${startDate} ~ ${endDate}</span>
                ${isCurrentWeek ? '<span class="week-badge">진행중</span>' : ''}
                ${isPastWeek ? '<span class="week-badge settled">정산완료</span>' : ''}
            </div>
            <div class="week-rankings">
                ${rankingsHtml}
            </div>
        `;

    container.appendChild(weekCard);
  });
}

// 시간대별 인증 활동 표시
function displayTimeActivity() {
  const timeChart = document.getElementById('timeChart');
  const timeLabels = document.getElementById('timeLabels');
  const timeStats = document.getElementById('timeStats');

  // 시간대별 인증 횟수 집계 (0~23시)
  const hourlyCount = new Array(24).fill(0);
  const hourlyCategoryCount = {};

  for (let i = 0; i < 24; i++) {
    hourlyCategoryCount[i] = {
      cleaning: 0,
      exercise: 0,
      morning: 0,
      planning: 0,
      study: 0,
      medicine: 0,
    };
  }

  analysisData.records.forEach((record) => {
    if (record.exp > 0 && record.time) {
      const hour = parseInt(record.time.split(':')[0]);
      hourlyCount[hour]++;
      hourlyCategoryCount[hour][record.category]++;
    }
  });

  const maxCount = Math.max(...hourlyCount, 1);

  // 차트 바 생성
  timeChart.innerHTML = '';
  timeLabels.innerHTML = '';

  const colors = {
    cleaning: '#f472b6',
    exercise: '#22d3ee',
    morning: '#fbbf24',
    planning: '#a78bfa',
    study: '#4ade80',
    medicine: '#f87171',
  };

  for (let hour = 0; hour < 24; hour++) {
    const count = hourlyCount[hour];
    const heightPercent = (count / maxCount) * 100;

    // 카테고리별 비율 계산
    const catCounts = hourlyCategoryCount[hour];
    let gradientParts = [];
    let currentPercent = 0;

    if (count > 0) {
      for (const [cat, catCount] of Object.entries(catCounts)) {
        if (catCount > 0) {
          const catPercent = (catCount / count) * 100;
          gradientParts.push(
            `${colors[cat]} ${currentPercent}% ${currentPercent + catPercent}%`,
          );
          currentPercent += catPercent;
        }
      }
    }

    const barGradient =
      gradientParts.length > 0
        ? `linear-gradient(to top, ${gradientParts.join(', ')})`
        : 'var(--border)';

    const bar = document.createElement('div');
    bar.className = 'time-bar';
    bar.style.height = `${Math.max(heightPercent, 2)}%`;
    bar.style.background = barGradient;
    bar.setAttribute('data-count', count);
    bar.setAttribute('data-hour', hour);

    // 호버 툴팁
    bar.title = `${hour}시: ${count}회`;

    timeChart.appendChild(bar);

    // 라벨 (3시간 간격으로만 표시)
    const label = document.createElement('span');
    label.className = 'time-label';
    if (hour % 3 === 0) {
      label.textContent = `${hour}`;
    }
    timeLabels.appendChild(label);
  }

  // 통계 표시
  const peakHour = hourlyCount.indexOf(Math.max(...hourlyCount));
  const morningCount = hourlyCount.slice(5, 12).reduce((a, b) => a + b, 0); // 5-11시
  const afternoonCount = hourlyCount.slice(12, 18).reduce((a, b) => a + b, 0); // 12-17시
  const eveningCount = hourlyCount.slice(18, 24).reduce((a, b) => a + b, 0); // 18-23시
  const nightCount = hourlyCount.slice(0, 5).reduce((a, b) => a + b, 0); // 0-4시

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
        <div class="time-stat">
            <span class="stat-icon">🌃</span>
            <span class="stat-label">심야 (0-4시)</span>
            <span class="stat-value">${nightCount}회 <small>(${totalValid > 0 ? ((nightCount / totalValid) * 100).toFixed(0) : 0}%)</small></span>
        </div>
    `;
}

function displayCategories() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';

  for (const [category, data] of Object.entries(CERT_CATEGORIES)) {
    const count = analysisData.categoryCount[category] || 0;
    const totalExp = count * data.exp;
    const card = document.createElement('div');
    card.className = `category-card ${category}`;
    card.innerHTML = `
            <div class="emoji">${data.emoji}</div>
            <div class="name">${data.name} <span class="exp-badge">+${data.exp}EXP</span></div>
            <div class="count">${count}회</div>
            <div class="exp-total">${totalExp} EXP</div>
            <div class="daily-limit">일일 ${data.dailyLimit}회 제한</div>
        `;
    grid.appendChild(card);
  }

  // 파이 차트 그리기
  displayPieChart();
}

// 파이 차트 표시
function displayPieChart() {
  const pieChart = document.getElementById('pieChart');
  const pieLegend = document.getElementById('pieLegend');
  const pieTotal = document.getElementById('pieTotal');

  pieLegend.innerHTML = '';

  // 카테고리별 색상
  const colors = {
    cleaning: '#f472b6',
    exercise: '#22d3ee',
    morning: '#fbbf24',
    planning: '#a78bfa',
    study: '#4ade80',
    medicine: '#f87171',
  };

  // 총 인증 횟수 (undefined 방어)
  const total = Object.values(analysisData.categoryCount).reduce(
    (a, b) => (a || 0) + (b || 0),
    0,
  );
  pieTotal.textContent = total || 0;

  if (total === 0) {
    pieChart.style.background = `conic-gradient(var(--border) 0deg 360deg)`;
    return;
  }

  // 각도 계산 및 conic-gradient 생성
  let gradientParts = [];
  let currentAngle = 0;

  const categories = Object.entries(CERT_CATEGORIES);

  categories.forEach(([category, data]) => {
    const count = analysisData.categoryCount[category] || 0;
    const percent = total > 0 ? (count / total) * 100 : 0;
    const angle = total > 0 ? (count / total) * 360 : 0;

    if (count > 0) {
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      gradientParts.push(`${colors[category]} ${startAngle}deg ${endAngle}deg`);
      currentAngle = endAngle;
    }

    // 범례 추가
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
            <span class="legend-color" style="background: ${colors[category]}"></span>
            <span class="legend-name">${data.emoji} ${data.name}</span>
            <span class="legend-value">${count}회</span>
            <span class="legend-percent">${percent.toFixed(1)}%</span>
        `;
    pieLegend.appendChild(legendItem);
  });

  // 그라데이션 적용
  if (gradientParts.length > 0) {
    pieChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
  } else {
    pieChart.style.background = `conic-gradient(var(--border) 0deg 360deg)`;
  }
}

function displayLeaderboard() {
  const leaderboard = document.getElementById('leaderboard');
  leaderboard.innerHTML = '';

  const { month } = getCurrentMonthInfo();

  // 전월 랭킹 가져오기
  const lastMonthRankings = getLastMonthRankings();

  // 월간 순경험치 기준으로 정렬
  const sortedMembers = Object.entries(analysisData.members).sort(
    (a, b) => b[1].monthly.netExp - a[1].monthly.netExp,
  );

  sortedMembers.forEach(([nickname, data], index) => {
    const monthly = data.monthly;
    const monthlyLevel = getLevel(monthly.netExp);
    const totalLevel = getLevel(data.totalExp);
    const rankClass =
      index === 0
        ? 'gold'
        : index === 1
          ? 'silver'
          : index === 2
            ? 'bronze'
            : '';

    // 전월 랭킹 정보
    const lastMonth = lastMonthRankings[nickname];
    let prevRankBorder = '';
    let prevRankBadge = '';

    if (lastMonth) {
      let borderInfo = null;
      if (lastMonth.rank === 1) {
        borderInfo = LAST_MONTH_BORDERS[1];
      } else if (lastMonth.rank === 2) {
        borderInfo = LAST_MONTH_BORDERS[2];
      } else if (lastMonth.rank === 3) {
        borderInfo = LAST_MONTH_BORDERS[3];
      } else if (lastMonth.rank <= 10) {
        borderInfo = LAST_MONTH_BORDERS.top10;
      }

      if (borderInfo) {
        prevRankBorder = borderInfo.class;
        prevRankBadge = `<span class="prev-rank-badge ${borderInfo.class}" title="${borderInfo.title}">${borderInfo.icon}</span>`;
      }
    }

    // 누적 칭호
    const accTitle = getAccumulatedTitle(data.totalExp);

    // 연속 달성 배지
    const streak = calculateStreak(data.records);
    const streakBadge = getStreakBadge(streak);

    const topCategory = Object.entries(monthly.categoryCount)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => CERT_CATEGORIES[cat].emoji)
      .join(' ');

    // 페널티 표시
    const penaltyText =
      monthly.penalty > 0
        ? `<span class="penalty">-${monthly.penalty}</span>`
        : '';

    // 배지 표시
    const badgesHtml = `
            <span class="acc-title">${accTitle.icon} ${accTitle.title}</span>
            ${streakBadge ? `<span class="streak-badge">${streakBadge.icon} ${streakBadge.badge}</span>` : ''}
        `;

    const item = document.createElement('div');
    item.className = `leaderboard-item ${prevRankBorder}`;
    item.innerHTML = `
            <div class="rank ${rankClass}">${index + 1}</div>
            <div class="member-info">
                <div class="member-name">${prevRankBadge}${nickname}</div>
                <div class="member-levels">
                    <span class="level-monthly" style="color: ${monthlyLevel.color}">월간 Lv.${monthlyLevel.level}</span>
                    <span class="level-divider">|</span>
                    <span class="level-total" style="color: ${totalLevel.color}">누적 Lv.${totalLevel.level}</span>
                </div>
                <div class="member-badges">${badgesHtml}</div>
            </div>
            <div class="member-stats">
                <div class="member-count">${monthly.netExp} EXP ${penaltyText}</div>
                <div class="member-categories">${monthly.monthlyCount}회 (${monthly.certDays}일) ${topCategory}</div>
                <div class="member-total">누적 ${data.totalExp} EXP</div>
            </div>
        `;
    leaderboard.appendChild(item);
  });
}

function displayRecords(filter) {
  const list = document.getElementById('recordsList');
  list.innerHTML = '';

  const filteredRecords =
    filter === 'all'
      ? analysisData.records
      : analysisData.records.filter((r) => r.category === filter);

  if (filteredRecords.length === 0) {
    list.innerHTML =
      '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">해당 카테고리의 기록이 없습니다.</div>';
    return;
  }

  filteredRecords.forEach((record) => {
    const item = document.createElement('div');
    item.className = 'record-item';

    // 상태 배지 결정
    let statusBadge = '';
    if (record.isOverDailyLimit) {
      // 일일 제한 초과
      const limit = CERT_CATEGORIES[record.category].dailyLimit;
      statusBadge = `<span class="status-badge fail">초과 (${record.dailyCertNum}/${limit}회)</span>`;
    } else if (record.category === 'morning') {
      // 기상 인증 성공/실패 표시
      if (record.isValidMorning) {
        statusBadge = `<span class="status-badge success">+${CERT_CATEGORIES.morning.exp}</span>`;
      } else {
        statusBadge = `<span class="status-badge fail">실패 (목표: ${record.targetWakeTime})</span>`;
      }
    } else {
      statusBadge = `<span class="status-badge success">+${record.exp}</span>`;
    }

    item.innerHTML = `
            <div class="record-time">${record.date}<br>${record.time}</div>
            <div class="record-member">${record.nickname}</div>
            <div class="record-tag ${record.category}">${CERT_CATEGORIES[record.category].emoji} ${record.tag}</div>
            ${statusBadge}
        `;
    list.appendChild(item);
  });
}

function filterRecords(filter) {
  displayRecords(filter);
}

// 이번 주 시작일 계산 (월요일 기준)
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// 이번 주 인증 횟수 계산
function getWeeklyCertCount(records) {
  const weekStart = getWeekStart();
  const weekStartStr = weekStart.toISOString().split('T')[0];

  let count = 0;
  records.forEach((r) => {
    if (r.date >= weekStartStr && r.exp > 0) {
      count++;
    }
  });
  return count;
}

// 주간 인증 부족 멤버 표시
function displayWeeklyWarning() {
  const warningSection = document.getElementById('warningSection');
  const warningList = document.getElementById('warningList');
  warningList.innerHTML = '';

  const minWeeklyCerts = 3;
  const underperformers = [];

  for (const [nickname, data] of Object.entries(analysisData.members)) {
    const weeklyCount = getWeeklyCertCount(data.records);
    if (weeklyCount < minWeeklyCerts) {
      underperformers.push({
        name: nickname,
        count: weeklyCount,
        remaining: minWeeklyCerts - weeklyCount,
      });
    }
  }

  if (underperformers.length === 0) {
    warningSection.style.display = 'none';
    return;
  }

  // 인증 횟수 적은 순으로 정렬
  underperformers.sort((a, b) => a.count - b.count);

  underperformers.forEach((member) => {
    const item = document.createElement('div');
    item.className = 'warning-item';
    item.innerHTML = `
            <span class="name">${member.name}</span>
            <span class="count">${member.count}/3회</span>
            <span class="remaining">(${member.remaining}회 부족)</span>
        `;
    warningList.appendChild(item);
  });

  warningSection.style.display = 'block';
}

// 월별 랭킹 추이 계산
function calculateMonthlyRankings() {
  const monthlyStats = {};

  // 모든 기록에서 월별 데이터 수집
  for (const [nickname, memberData] of Object.entries(analysisData.members)) {
    memberData.records.forEach((record) => {
      if (!record.date || record.exp <= 0) return;

      const yearMonth = record.date.substring(0, 7);
      if (!monthlyStats[yearMonth]) {
        monthlyStats[yearMonth] = {};
      }
      if (!monthlyStats[yearMonth][nickname]) {
        monthlyStats[yearMonth][nickname] = 0;
      }
      monthlyStats[yearMonth][nickname] += record.exp;
    });
  }

  // 월별로 정렬하고 1~3등 계산
  const rankings = [];
  const sortedMonths = Object.keys(monthlyStats).sort().reverse();

  sortedMonths.forEach((yearMonth) => {
    const monthData = monthlyStats[yearMonth];
    const sorted = Object.entries(monthData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    rankings.push({
      month: yearMonth,
      top3: sorted.map(([name, exp], idx) => ({ rank: idx + 1, name, exp })),
    });
  });

  return rankings;
}

// 월간 랭킹 추이 표시
function displayRankingHistory() {
  const tbody = document.getElementById('historyBody');
  tbody.innerHTML = '';

  const rankings = calculateMonthlyRankings();
  const { year, month } = getCurrentMonthInfo();
  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  if (rankings.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">데이터가 없습니다</td></tr>';
    return;
  }

  rankings.forEach(({ month: yearMonth, top3 }) => {
    const [y, m] = yearMonth.split('-');
    const monthLabel = `${y}년 ${parseInt(m)}월`;
    const isCurrentMonth = yearMonth === currentMonthStr;

    const row = document.createElement('tr');
    if (isCurrentMonth) row.className = 'current-month';

    // 1, 2, 3등 셀 생성
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
            <td class="month-cell">${monthLabel}${isCurrentMonth ? ' (진행중)' : ''}</td>
            ${rankCells}
        `;

    tbody.appendChild(row);
  });
}

// ========== 내보내기 기능 ==========

// 텍스트 파일 다운로드
function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// PNG 이미지 다운로드
async function downloadPng(element, filename, buttonId) {
  const button = document.getElementById(buttonId);
  const originalText = button.innerHTML;

  try {
    // 로딩 표시
    button.innerHTML = '⏳ 저장 중...';
    button.disabled = true;

    const canvas = await html2canvas(element, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // 버튼 복원
    button.innerHTML = originalText;
    button.disabled = false;
  } catch (error) {
    console.error('PNG 내보내기 오류:', error);
    alert('이미지 저장에 실패했습니다.');
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// 전체 결과 PNG 내보내기
function exportAllToPng() {
  const { year, month } = getCurrentMonthInfo();
  const dateStr = `${year}년${month + 1}월`;
  const element = document.getElementById('resultsSection');
  downloadPng(element, `루루플_인증현황_${dateStr}.png`, 'exportAllPng');
}

// 랭킹만 PNG 내보내기
function exportLeaderboardToPng() {
  const { year, month } = getCurrentMonthInfo();
  const dateStr = `${year}년${month + 1}월`;
  const element = document.getElementById('leaderboardSection');
  downloadPng(element, `루루플_랭킹_${dateStr}.png`, 'exportLeaderboardPng');
}

// 텍스트 파일 내보내기
function exportToTxt() {
  const { year, month, today } = getCurrentMonthInfo();
  const dateStr = `${year}년 ${month + 1}월 ${today}일`;

  // 랭킹 정렬
  const sortedMembers = Object.entries(analysisData.members).sort(
    (a, b) => b[1].monthly.netExp - a[1].monthly.netExp,
  );

  let content = '';
  content += '════════════════════════════════════════\n';
  content += '        루루플 인증 레벨 시스템\n';
  content += '════════════════════════════════════════\n';
  content += `내보내기 일시: ${dateStr}\n`;
  content += `총 멤버: ${sortedMembers.length}명\n`;
  content += '────────────────────────────────────────\n\n';

  // 월간 보상 안내
  content += '【 월간 보상 】\n';
  content += '🥇 1등: 배민 쿠폰 2만원\n';
  content += '🥈 2등: 컴포즈 커피 5천원\n';
  content += '🥉 3등: 아이스 아메리카노\n\n';

  // 이번 달 랭킹
  content += '【 이번 달 랭킹 】\n';
  content += '────────────────────────────────────────\n';

  const rankEmojis = ['🥇', '🥈', '🥉'];
  const lastMonthRankings = getLastMonthRankings();

  sortedMembers.forEach(([nickname, data], index) => {
    const monthly = data.monthly;
    const level = getLevel(monthly.netExp);
    const accTitle = getAccumulatedTitle(data.totalExp);
    const rankEmoji = index < 3 ? rankEmojis[index] : `${index + 1}.`;

    // 전월 랭킹 표시
    const lastMonth = lastMonthRankings[nickname];
    let prevRankText = '';
    if (lastMonth) {
      if (lastMonth.rank === 1) prevRankText = ' 👑전월챔피언';
      else if (lastMonth.rank <= 3)
        prevRankText = ` (전월 ${lastMonth.rank}위)`;
      else if (lastMonth.rank <= 10) prevRankText = ' ⭐전월TOP10';
    }

    content += `${rankEmoji} ${nickname}${prevRankText}\n`;
    content += `   Lv.${level.level} ${level.name} | ${monthly.netExp} EXP`;
    if (monthly.penalty > 0) content += ` (-${monthly.penalty})`;
    content += '\n';
    content += `   ${accTitle.icon} ${accTitle.title} | 인증 ${monthly.monthlyCount}회 (${monthly.certDays}일)\n`;
    content += `   누적 ${data.totalExp} EXP\n\n`;
  });

  // 카테고리별 통계
  content += '【 카테고리별 인증 현황 】\n';
  content += '────────────────────────────────────────\n';
  for (const [category, catData] of Object.entries(CERT_CATEGORIES)) {
    const count = analysisData.categoryCount[category] || 0;
    const totalExp = count * catData.exp;
    content += `${catData.emoji} ${catData.name}: ${count}회 (${totalExp} EXP)\n`;
  }

  content += '\n════════════════════════════════════════\n';
  content += '         루루플 인증 관리 시스템\n';
  content += '════════════════════════════════════════\n';

  const filename = `루루플_인증현황_${year}년${month + 1}월${today}일.txt`;
  downloadTextFile(content, filename);
}

// ========== 관리자 로그인 및 Google Sheets 연동 ==========

// Google Apps Script 웹앱 URL (배포 후 여기에 입력)
const API_URL =
  'https://script.google.com/macros/s/AKfycbwFWrkaFEBKoqE8Ll-Og-t9kWcSWT1SSeLw_BscLMV5aGYBoU5tFqbuenecSGBzybo/exec';

// 관리자 비밀번호 (실제 배포 시 변경 필요)
const ADMIN_PASSWORD = 'lurupl2024';

// DOM 요소
const adminLoginSection = document.getElementById('adminLoginSection');
const adminArea = document.getElementById('adminArea');
const adminPassword = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');

// 로그인 버튼 클릭
if (loginBtn) {
  loginBtn.addEventListener('click', handleLogin);
}

// Enter 키로 로그인
if (adminPassword) {
  adminPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

function handleLogin() {
  const password = adminPassword.value.trim();

  if (password === ADMIN_PASSWORD) {
    adminLoginSection.style.display = 'none';
    adminArea.style.display = 'block';
    sessionStorage.setItem('isAdmin', 'true');
  } else {
    alert('비밀번호가 올바르지 않습니다.');
    adminPassword.value = '';
    adminPassword.focus();
  }
}

// 페이지 로드 시 세션 확인
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('isAdmin') === 'true') {
    if (adminLoginSection) adminLoginSection.style.display = 'none';
    if (adminArea) adminArea.style.display = 'block';
  }
});

// Google Sheets에 결과 저장
async function saveToGoogleSheets() {
  if (!analysisData || analysisData.totalCount === 0) {
    alert('저장할 데이터가 없습니다. 먼저 파일을 분석해주세요.');
    return;
  }

  const { year, month, today } = getCurrentMonthInfo();

  // 저장할 데이터 구성
  const dataToSave = {
    password: ADMIN_PASSWORD,
    lastUpdated: `${year}년 ${month + 1}월 ${today}일 ${new Date().toLocaleTimeString('ko-KR')}`,
    monthlyCount: analysisData.monthlyCount,
    monthlyExp: analysisData.monthlyExp,
    categoryCount: analysisData.categoryCount,
    hourlyCount: calculateHourlyCount(),
    weeklyData: getWeeklyDataForSave(),
    monthlyRankings: getMonthlyRankingsForSave(),
    members: getMembersForSave(),
  };

  try {
    const saveBtn = document.getElementById('saveToSheetsBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '저장 중...';
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors', // CORS 우회
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSave),
    });

    // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 간주
    alert('데이터가 저장되었습니다!\n결과 페이지: result.html');

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '📤 결과 저장';
    }
  } catch (error) {
    console.error('저장 오류:', error);
    alert('저장에 실패했습니다. 콘솔을 확인해주세요.');

    const saveBtn = document.getElementById('saveToSheetsBtn');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '📤 결과 저장';
    }
  }
}

// 시간대별 인증 횟수 계산
function calculateHourlyCount() {
  const hourlyCount = new Array(24).fill(0);

  analysisData.records.forEach((record) => {
    if (record.exp > 0 && record.time) {
      const hour = parseInt(record.time.split(':')[0]);
      hourlyCount[hour]++;
    }
  });

  return hourlyCount;
}

// 주간 데이터 저장용
function getWeeklyDataForSave() {
  const weeklyData = calculateWeeklyRankings();
  const now = new Date();
  const currentWeekIdx = weeklyData.findIndex(
    (w) => now >= w.start && now <= w.end,
  );

  return weeklyData.map((week, idx) => ({
    week: week.week,
    dateRange: `${week.start.getMonth() + 1}/${week.start.getDate()} ~ ${week.end.getMonth() + 1}/${week.end.getDate()}`,
    isCurrentWeek: idx === currentWeekIdx,
    isPastWeek: idx < currentWeekIdx || currentWeekIdx === -1,
    rankings: week.rankings.slice(0, 5).map((r) => ({
      rank: r.rank,
      name: r.name,
      exp: r.exp,
      rankChange: r.rankChange || null,
    })),
  }));
}

// 월간 랭킹 저장용
function getMonthlyRankingsForSave() {
  const rankings = calculateMonthlyRankings();
  const { year, month } = getCurrentMonthInfo();
  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  return rankings.map(({ month: yearMonth, top3 }) => {
    const [y, m] = yearMonth.split('-');
    return {
      month: `${y}년 ${parseInt(m)}월`,
      isCurrentMonth: yearMonth === currentMonthStr,
      top3: top3,
    };
  });
}

// 멤버 데이터 저장용
function getMembersForSave() {
  const members = {};

  for (const [nickname, data] of Object.entries(analysisData.members)) {
    const monthly = data.monthly;
    const weeklyCertCount = getWeeklyCertCount(data.records);

    members[nickname] = {
      netExp: monthly.netExp,
      monthlyExp: monthly.monthlyExp,
      monthlyCount: monthly.monthlyCount,
      certDays: monthly.certDays,
      penalty: monthly.penalty,
      totalExp: data.totalExp,
      categoryCount: monthly.categoryCount,
      weeklyCertCount: weeklyCertCount, // 주간 인증 횟수 추가
    };
  }

  return members;
}
