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
    exp: 6,
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
  diary: {
    name: '일기',
    emoji: '📝',
    exp: 2,
    dailyLimit: 1,
    tags: ['#일기', '#감사일기', '#하루기록', '#오늘하루', '#일상'],
  },
};

// 월간 레벨 시스템 (경험치 기반)
const EXP_PER_LEVEL = 5; // 레벨당 필요 경험치 (한 달 최대 Lv.100)
const PENALTY_PER_DAY = 0; // 페널티 비활성화
const MORNING_TOLERANCE = 10; // 기상 인증 허용 오차 (분)

// ========== 시즌 이벤트 설정 ==========
const SEASON_EVENTS = [
  {
    name: '작은 씨앗 시즌',
    emoji: '🌱',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    expMultiplier: 1, // 기본 배수
    description: '작은 실행이 모여 숲이 된다',
  },
];

// 특정 기간 경험치 배수 이벤트 (동적으로 로드됨)
let EXP_BOOST_EVENTS = [];

// 이벤트 히스토리 localStorage 키
const EVENT_HISTORY_STORAGE_KEY = 'lurupl_event_history';

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

// 이벤트 히스토리 저장하기
function saveEventHistory(events) {
  try {
    localStorage.setItem(EVENT_HISTORY_STORAGE_KEY, JSON.stringify(events));
    console.log('이벤트 히스토리 저장 완료:', events);
  } catch (e) {
    console.error('이벤트 히스토리 저장 실패:', e);
  }
}

// 새 이벤트 추가
function addEvent(event) {
  const events = loadEventHistory();
  event.id = Date.now(); // 고유 ID
  events.push(event);
  saveEventHistory(events);
  applyEventSettings();
  return event.id;
}

// 이벤트 삭제
function deleteEvent(eventId) {
  let events = loadEventHistory();
  events = events.filter(e => e.id !== eventId);
  saveEventHistory(events);
  applyEventSettings();
}

// 이벤트 수정
function updateEvent(eventId, updatedEvent) {
  const events = loadEventHistory();
  const index = events.findIndex(e => e.id === eventId);
  if (index !== -1) {
    events[index] = { ...events[index], ...updatedEvent };
    saveEventHistory(events);
    applyEventSettings();
  }
}

// 이벤트 히스토리를 EXP_BOOST_EVENTS에 적용
function applyEventSettings() {
  const events = loadEventHistory();
  EXP_BOOST_EVENTS = events.filter(e => e.enabled).map(e => ({
    name: e.name,
    emoji: e.emoji || '🎉',
    startDate: e.startDate,
    endDate: e.endDate,
    expMultiplier: parseFloat(e.expMultiplier) || 1,
    categories: e.categories,
  }));
  console.log('적용된 이벤트 목록:', EXP_BOOST_EVENTS);
}

// 날짜가 이벤트 기간 내인지 확인
function isDateInEventPeriod(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  return dateStr >= startDate && dateStr <= endDate;
}

// 해당 날짜/카테고리에 적용될 경험치 배수 계산
function getExpMultiplier(dateStr, category) {
  let multiplier = 1;

  for (const event of EXP_BOOST_EVENTS) {
    if (isDateInEventPeriod(dateStr, event.startDate, event.endDate)) {
      // 전체 카테고리 또는 해당 카테고리가 포함된 경우
      if (event.categories === null || event.categories.includes(category)) {
        multiplier = Math.max(multiplier, event.expMultiplier);
      }
    }
  }

  return multiplier;
}

// 현재 활성화된 이벤트 목록 가져오기
function getActiveEvents(dateStr) {
  return EXP_BOOST_EVENTS.filter(event =>
    isDateInEventPeriod(dateStr, event.startDate, event.endDate)
  );
}

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
    diary: 0,
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
    diary: 0,
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

// 나간 사람 목록 (전역 변수로 저장하여 parseChat에서도 사용)
let leftMembersSet = new Set();

// 멤버 목록만 추출 (나간 사람 자동 제외, 재입장 시 복구)
function extractMembers(content) {
  const members = new Set();
  leftMembersSet = new Set(); // 전역 변수 초기화
  const lines = content.split('\n');
  const messagePattern = /\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]/;
  const leftPattern = /(.+)님이 나갔습니다/;
  const kickedPattern = /(.+)님을 내보냈습니다/;
  const joinedPattern = /(.+)님이 들어왔습니다/;

  // 순차적으로 처리하여 마지막 상태 반영
  lines.forEach((line) => {
    // 나간 사람 감지
    const leftMatch = line.match(leftPattern);
    if (leftMatch) {
      leftMembersSet.add(leftMatch[1].trim());
      return;
    }

    // 내보낸 사람 감지
    const kickedMatch = line.match(kickedPattern);
    if (kickedMatch) {
      leftMembersSet.add(kickedMatch[1].trim());
      return;
    }

    // 다시 들어온 사람 감지 (나간 목록에서 제거)
    const joinedMatch = line.match(joinedPattern);
    if (joinedMatch) {
      const joinedName = joinedMatch[1].trim();
      if (leftMembersSet.has(joinedName)) {
        leftMembersSet.delete(joinedName);
        console.log(`[재입장] ${joinedName} - 활성 멤버로 복구`);
      }
      return;
    }

    // 일반 메시지에서 멤버 추출
    const match = line.match(messagePattern);
    if (match) {
      members.add(match[1].trim());
    }
  });

  // 최종적으로 나간 상태인 사람만 제외
  leftMembersSet.forEach((name) => members.delete(name));

  console.log('최종 나간 사람 목록:', Array.from(leftMembersSet));
  console.log('활성 멤버 목록:', Array.from(members));

  return Array.from(members).sort();
}

// localStorage 키
const WAKE_TIMES_STORAGE_KEY = 'lurupl_wake_times';

// 저장된 기상 시간 불러오기
function loadSavedWakeTimes() {
  try {
    const saved = localStorage.getItem(WAKE_TIMES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('기상 시간 불러오기 실패:', e);
    return {};
  }
}

// 기상 시간 저장하기
function saveWakeTimes(wakeTimes) {
  try {
    localStorage.setItem(WAKE_TIMES_STORAGE_KEY, JSON.stringify(wakeTimes));
    console.log('기상 시간 저장 완료:', wakeTimes);
  } catch (e) {
    console.error('기상 시간 저장 실패:', e);
  }
}

// 멤버별 설정 UI 표시
function displayMemberSettings(members) {
  memberSettings.innerHTML = '';

  // 저장된 기상 시간 불러오기
  const savedWakeTimes = loadSavedWakeTimes();
  console.log('저장된 기상 시간:', savedWakeTimes);

  members.forEach((nickname) => {
    // 저장된 시간이 있으면 사용, 없으면 07:00 기본값
    const savedTime = savedWakeTimes[nickname] || '07:00';

    const card = document.createElement('div');
    card.className = 'member-setting-card';
    card.innerHTML = `
            <div class="member-name">${nickname}</div>
            <div class="time-input-group">
                <label>목표 기상 시간:</label>
                <input type="time" id="wake-${nickname}" value="${savedTime}">
                ${savedWakeTimes[nickname] ? '<span class="saved-badge">저장됨</span>' : ''}
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

  // 기상 시간 localStorage에 저장 (다음에 불러올 수 있도록)
  saveWakeTimes(memberWakeUpTimes);

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
      diary: 0,
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
    const trimmedNickname = nickname.trim();

    // 나간 사람의 기록은 무시
    if (leftMembersSet.has(trimmedNickname)) {
      return;
    }

    const category = findCategory(message);
    if (!category) return;

    let hour24 = parseInt(hour);
    if (ampm === '오후' && hour24 !== 12) hour24 += 12;
    if (ampm === '오전' && hour24 === 12) hour24 = 0;
    const timeStr = `${hour24.toString().padStart(2, '0')}:${minute}`;

    let baseExp = CERT_CATEGORIES[category].exp;
    let expMultiplier = getExpMultiplier(currentDate, category);
    let exp = baseExp * expMultiplier;
    let isValidMorning = true;
    let isOverDailyLimit = false;
    let isEventBoost = expMultiplier > 1;

    // 이벤트 배수 로그
    if (isEventBoost) {
      console.log(`[이벤트] ${currentDate} ${category}: ${baseExp} x ${expMultiplier} = ${exp} EXP`);
    }

    // 기상 인증 시간 검증
    if (category === 'morning') {
      const targetTime = memberWakeUpTimes[trimmedNickname];
      console.log(`[기상 인증] ${trimmedNickname}: 실제시간=${timeStr}, 목표시간=${targetTime || '미설정'}`);
      if (targetTime) {
        isValidMorning = isWithinTolerance(
          timeStr,
          targetTime,
          MORNING_TOLERANCE,
        );
        console.log(`[기상 인증 결과] ${trimmedNickname}: ${isValidMorning ? '성공' : '실패'}`);
        if (!isValidMorning) {
          exp = 0; // 시간 벗어나면 경험치 0
        }
      } else {
        // 목표 시간이 설정되지 않은 경우에도 인증 기록은 남김 (기본 exp 유지)
        console.log(`[기상 인증] ${trimmedNickname}: 목표 시간 미설정, 기본 exp 적용`);
      }
    }

    // 일일 제한 검증
    const dailyKey = `${trimmedNickname}|${currentDate}|${category}`;
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
      nickname: trimmedNickname,
      message: message.trim(),
      category: category,
      tag: extractTag(message, category),
      baseExp: baseExp,
      expMultiplier: expMultiplier,
      exp: exp,
      isEventBoost: isEventBoost,
      isValidMorning: category === 'morning' ? isValidMorning : null,
      targetWakeTime:
        category === 'morning' ? memberWakeUpTimes[trimmedNickname] : null,
      isOverDailyLimit: isOverDailyLimit,
      dailyCertNum: dailyCertCounts[dailyKey],
    };

    // 디버그 로그
    if (trimmedNickname.includes('지누')) {
      console.log(`[DEBUG parseChat] 지누 기록 생성: ${currentDate} ${timeStr} ${category} exp=${exp} msg=${message.trim()}`);
    }

    analysisData.records.push(record);
    analysisData.totalCount++;
    analysisData.totalExp += exp;
    if (exp > 0) {
      analysisData.categoryCount[category]++;
    }

    if (!analysisData.members[trimmedNickname]) {
      analysisData.members[trimmedNickname] = {
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
          diary: 0,
        },
      };
    }
    analysisData.members[trimmedNickname].records.push(record);
    analysisData.members[trimmedNickname].totalCount++;
    analysisData.members[trimmedNickname].totalExp += exp;
    if (exp > 0) {
      analysisData.members[trimmedNickname].categoryCount[category]++;
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

// 주차별 날짜 범위 계산 (월요일~일요일 기준)
function getWeekRanges(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 1일부터 시작해서 각 날짜가 어느 주에 속하는지 계산
  let currentDate = new Date(firstDay);
  let currentWeek = null;
  let weekNum = 1;

  while (currentDate <= lastDay) {
    const dayOfWeek = currentDate.getDay(); // 0=일, 1=월, ...

    // 월요일이거나 첫 날이면 새 주 시작
    if (dayOfWeek === 1 || currentWeek === null) {
      if (currentWeek !== null) {
        weeks.push(currentWeek);
      }
      currentWeek = {
        week: weekNum++,
        start: new Date(currentDate),
        end: null,
        startStr: toLocalDateStr(currentDate),
        endStr: null,
      };
    }

    // 일요일이거나 월말이면 주 종료
    if (dayOfWeek === 0 || currentDate.getTime() === lastDay.getTime()) {
      currentWeek.end = new Date(currentDate);
      currentWeek.endStr = toLocalDateStr(currentDate);
    }

    // 다음 날로 이동
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 마지막 주 추가
  if (currentWeek && currentWeek.end === null) {
    currentWeek.end = new Date(lastDay);
    currentWeek.endStr = toLocalDateStr(lastDay);
  }
  if (currentWeek && !weeks.includes(currentWeek)) {
    weeks.push(currentWeek);
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

    // 해당 주간의 기록 집계 (startStr ~ endStr)
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
    diary: '#fb923c',
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
    diary: '#fb923c',
  };

  // 총 인증 횟수 (undefined/NaN 방지)
  const total = Object.values(analysisData.categoryCount).reduce(
    (a, b) => a + (b || 0),
    0,
  );
  pieTotal.textContent = total;

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
    const percent = (count / total) * 100;
    const angle = (count / total) * 360;

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

    // 이벤트 배수 배지
    let eventBadge = '';
    if (record.isEventBoost && record.expMultiplier > 1) {
      eventBadge = `<span class="status-badge event">🎉 x${record.expMultiplier}</span>`;
    }

    // 상태 배지 결정
    let statusBadge = '';
    if (record.isOverDailyLimit) {
      // 일일 제한 초과
      const limit = CERT_CATEGORIES[record.category].dailyLimit;
      statusBadge = `<span class="status-badge fail">초과 (${record.dailyCertNum}/${limit}회)</span>`;
    } else if (record.category === 'morning') {
      // 기상 인증 성공/실패 표시
      if (record.isValidMorning) {
        const displayExp = record.isEventBoost ? `${record.baseExp}x${record.expMultiplier}=${record.exp}` : record.exp;
        statusBadge = `<span class="status-badge success">+${displayExp}</span>`;
      } else {
        statusBadge = `<span class="status-badge fail">실패 (목표: ${record.targetWakeTime})</span>`;
      }
    } else {
      const displayExp = record.isEventBoost ? `${record.baseExp}x${record.expMultiplier}=${record.exp}` : record.exp;
      statusBadge = `<span class="status-badge success">+${displayExp}</span>`;
    }

    item.innerHTML = `
            <div class="record-time">${record.date}<br>${record.time}</div>
            <div class="record-member">${record.nickname}</div>
            <div class="record-tag ${record.category}">${CERT_CATEGORIES[record.category].emoji} ${record.tag}</div>
            ${eventBadge}
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
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// 이번 주 종료일 계산 (일요일 기준)
function getWeekEnd() {
  const weekStart = getWeekStart();
  const sunday = new Date(weekStart);
  sunday.setDate(weekStart.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

// 로컬 시간대 기준 날짜 문자열 (YYYY-MM-DD)
function toLocalDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 이번 주 인증 횟수 계산 (월요일~일요일)
function getWeeklyCertCount(records, nickname = '') {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  const weekStartStr = toLocalDateStr(weekStart);
  const weekEndStr = toLocalDateStr(weekEnd);

  // 디버그 로그
  if (nickname.includes('지누')) {
    console.log(`[DEBUG] ${nickname} 주간 카운트 계산: ${weekStartStr} ~ ${weekEndStr}`);
  }

  let count = 0;
  records.forEach((r) => {
    if (r.date >= weekStartStr && r.date <= weekEndStr && r.exp > 0) {
      count++;
      // 디버그 로그
      if (nickname.includes('지누')) {
        console.log(`[DEBUG] ${nickname} 카운트 +1: ${r.date} ${r.time} ${r.category} exp=${r.exp} msg=${r.message}`);
      }
    }
  });

  if (nickname.includes('지누')) {
    console.log(`[DEBUG] ${nickname} 총 주간 인증: ${count}회`);
  }
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
    const weeklyCount = getWeeklyCertCount(data.records, nickname);
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
  'https://script.google.com/macros/s/AKfycbwpoXQFMdlROUKD7s9uxWTBHBJGsLghi5XH_yIHexkGhn5b7CB5-hSb8eCQEKy7V7Yb/exec';

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

// 페이지 로드 시 세션 확인 및 이벤트 설정 초기화
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('isAdmin') === 'true') {
    if (adminLoginSection) adminLoginSection.style.display = 'none';
    if (adminArea) adminArea.style.display = 'block';
  }

  // 이벤트 설정 초기화
  initEventSettingsUI();
});

// 이벤트 설정 UI 초기화
function initEventSettingsUI() {
  const addEventBtn = document.getElementById('addEventBtn');
  const eventForm = document.getElementById('eventForm');
  const cancelEventBtn = document.getElementById('cancelEventBtn');
  const saveEventBtn = document.getElementById('saveEventBtn');
  const catAll = document.getElementById('catAll');
  const catItems = document.querySelectorAll('.cat-item');

  if (!addEventBtn) return;

  // 이벤트 목록 표시
  renderEventList();

  // 새 이벤트 버튼
  addEventBtn.addEventListener('click', () => {
    resetEventForm();
    document.getElementById('eventFormTitle').textContent = '새 이벤트 추가';
    document.getElementById('editingEventId').value = '';
    eventForm.style.display = 'block';
    addEventBtn.style.display = 'none';
  });

  // 취소 버튼
  cancelEventBtn.addEventListener('click', () => {
    eventForm.style.display = 'none';
    addEventBtn.style.display = 'block';
  });

  // 저장 버튼
  saveEventBtn.addEventListener('click', () => {
    saveEventFromForm();
  });

  // 전체 카테고리 체크박스
  catAll.addEventListener('change', () => {
    if (catAll.checked) {
      catItems.forEach(item => item.checked = false);
    }
  });

  // 개별 카테고리 체크박스
  catItems.forEach(item => {
    item.addEventListener('change', () => {
      if (item.checked) {
        catAll.checked = false;
      }
      const anyChecked = Array.from(catItems).some(i => i.checked);
      if (!anyChecked) {
        catAll.checked = true;
      }
    });
  });

  // 이벤트 설정 적용
  applyEventSettings();
}

// 이벤트 폼 초기화
function resetEventForm() {
  document.getElementById('eventName').value = '';
  document.getElementById('eventMultiplier').value = '3';
  document.getElementById('eventStartDate').value = '';
  document.getElementById('eventEndDate').value = '';
  document.getElementById('catAll').checked = true;
  document.querySelectorAll('.cat-item').forEach(item => item.checked = false);
}

// 폼에서 이벤트 저장
function saveEventFromForm() {
  const eventName = document.getElementById('eventName').value.trim();
  const eventMultiplier = document.getElementById('eventMultiplier').value;
  const eventStartDate = document.getElementById('eventStartDate').value;
  const eventEndDate = document.getElementById('eventEndDate').value;
  const catAll = document.getElementById('catAll');
  const catItems = document.querySelectorAll('.cat-item');
  const editingId = document.getElementById('editingEventId').value;

  // 유효성 검사
  if (!eventName) {
    alert('이벤트 이름을 입력하세요.');
    return;
  }
  if (!eventStartDate || !eventEndDate) {
    alert('시작일과 종료일을 모두 입력하세요.');
    return;
  }
  if (eventStartDate > eventEndDate) {
    alert('종료일이 시작일보다 빠를 수 없습니다.');
    return;
  }

  let categories = null;
  if (!catAll.checked) {
    categories = Array.from(catItems)
      .filter(item => item.checked)
      .map(item => item.value);
    if (categories.length === 0) categories = null;
  }

  const eventData = {
    name: eventName,
    emoji: '🎉',
    startDate: eventStartDate,
    endDate: eventEndDate,
    expMultiplier: parseFloat(eventMultiplier),
    categories: categories,
    enabled: true,
  };

  if (editingId) {
    // 수정
    updateEvent(parseInt(editingId), eventData);
  } else {
    // 새로 추가
    addEvent(eventData);
  }

  // 폼 닫기
  document.getElementById('eventForm').style.display = 'none';
  document.getElementById('addEventBtn').style.display = 'block';

  // 목록 갱신
  renderEventList();
}

// 이벤트 목록 렌더링
function renderEventList() {
  const eventList = document.getElementById('eventList');
  if (!eventList) return;

  const events = loadEventHistory();
  const today = toLocalDateStr(new Date());

  eventList.innerHTML = '';

  if (events.length === 0) {
    return; // CSS :empty 스타일이 적용됨
  }

  // 최신 이벤트가 위로 오도록 정렬
  events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  events.forEach(event => {
    const isOngoing = event.startDate <= today && event.endDate >= today;
    const isUpcoming = event.startDate > today;
    const isEnded = event.endDate < today;

    let statusBadge = '';
    let cardClass = '';
    if (isOngoing && event.enabled) {
      statusBadge = '<span class="event-status-badge ongoing">진행중</span>';
      cardClass = 'active';
    } else if (isUpcoming) {
      statusBadge = '<span class="event-status-badge upcoming">예정</span>';
    } else if (isEnded) {
      statusBadge = '<span class="event-status-badge ended">종료</span>';
      cardClass = 'expired';
    }

    let categoryText = '전체';
    if (event.categories && event.categories.length > 0) {
      categoryText = event.categories.map(c => {
        const cat = CERT_CATEGORIES[c];
        return cat ? cat.emoji : c;
      }).join(' ');
    }

    const card = document.createElement('div');
    card.className = `event-card ${cardClass}`;
    card.innerHTML = `
      <div class="event-card-toggle">
        <label class="toggle-switch">
          <input type="checkbox" ${event.enabled ? 'checked' : ''} data-event-id="${event.id}">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="event-card-info">
        <div class="event-card-name">
          ${event.emoji || '🎉'} ${event.name}
          <span class="multiplier">${event.expMultiplier}배</span>
          ${statusBadge}
        </div>
        <div class="event-card-period">📅 ${event.startDate} ~ ${event.endDate}</div>
        <div class="event-card-categories">대상: ${categoryText}</div>
      </div>
      <div class="event-card-actions">
        <button type="button" class="edit" data-event-id="${event.id}" title="수정">✏️</button>
        <button type="button" class="delete" data-event-id="${event.id}" title="삭제">🗑️</button>
      </div>
    `;

    eventList.appendChild(card);
  });

  // 이벤트 핸들러 등록
  eventList.querySelectorAll('.toggle-switch input').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const eventId = parseInt(e.target.dataset.eventId);
      updateEvent(eventId, { enabled: e.target.checked });
      renderEventList();
    });
  });

  eventList.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const eventId = parseInt(e.target.dataset.eventId);
      editEvent(eventId);
    });
  });

  eventList.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const eventId = parseInt(e.target.dataset.eventId);
      if (confirm('이 이벤트를 삭제하시겠습니까?')) {
        deleteEvent(eventId);
        renderEventList();
      }
    });
  });
}

// 이벤트 수정 모드
function editEvent(eventId) {
  const events = loadEventHistory();
  const event = events.find(e => e.id === eventId);
  if (!event) return;

  document.getElementById('eventFormTitle').textContent = '이벤트 수정';
  document.getElementById('editingEventId').value = eventId;
  document.getElementById('eventName').value = event.name;
  document.getElementById('eventMultiplier').value = event.expMultiplier;
  document.getElementById('eventStartDate').value = event.startDate;
  document.getElementById('eventEndDate').value = event.endDate;

  const catAll = document.getElementById('catAll');
  const catItems = document.querySelectorAll('.cat-item');

  if (event.categories === null) {
    catAll.checked = true;
    catItems.forEach(item => item.checked = false);
  } else {
    catAll.checked = false;
    catItems.forEach(item => {
      item.checked = event.categories.includes(item.value);
    });
  }

  document.getElementById('eventForm').style.display = 'block';
  document.getElementById('addEventBtn').style.display = 'none';
}

// Google Sheets에 결과 저장 (Form 방식)
function saveToGoogleSheets() {
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

  const saveBtn = document.getElementById('saveToSheetsBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
  }

  // 숨겨진 iframe 생성
  let iframe = document.getElementById('saveFrame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'saveFrame';
    iframe.name = 'saveFrame';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  // form 생성 및 제출
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = API_URL;
  form.target = 'saveFrame';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'data';
  input.value = JSON.stringify(dataToSave);
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  // 저장 완료 처리 (약간의 딜레이 후)
  setTimeout(() => {
    alert('데이터가 저장되었습니다!\n결과 페이지에서 확인하세요.');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '📤 결과 저장';
    }
  }, 2000);
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
    members[nickname] = {
      netExp: monthly.netExp,
      monthlyExp: monthly.monthlyExp,
      monthlyCount: monthly.monthlyCount,
      certDays: monthly.certDays,
      penalty: monthly.penalty,
      totalExp: data.totalExp,
      categoryCount: monthly.categoryCount,
    };
  }

  return members;
}
