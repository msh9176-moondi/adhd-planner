/**
 * Google Apps Script - 루루플 인증 시스템 API
 *
 * 설정 방법:
 * 1. Google Drive에서 Google Sheets 새로 만들기
 * 2. 확장 프로그램 > Apps Script 클릭
 * 3. 이 코드를 전체 복사해서 붙여넣기
 * 4. SHEET_ID를 실제 스프레드시트 ID로 변경
 * 5. ADMIN_PASSWORD를 원하는 비밀번호로 변경 (app.js와 동일하게)
 * 6. 배포 > 새 배포 > 웹 앱 선택
 *    - 설명: 루루플 API
 *    - 실행 사용자: 나
 *    - 액세스 권한: 모든 사용자
 * 7. 배포 후 URL을 복사해서 app.js와 result.js의 API_URL에 붙여넣기
 *
 * !! 중요: 코드 수정 후 반드시 "새 배포"로 다시 배포해야 합니다 !!
 */

// ========== 설정 ==========
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // 스프레드시트 ID (URL에서 복사)
const ADMIN_PASSWORD = 'lurupl2024'; // 관리자 비밀번호

// ========== GET 요청 처리 (데이터 조회) ==========
function doGet(e) {
  try {
    const callback = e.parameter.callback; // JSONP 콜백
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Data');

    if (!sheet) {
      return createResponse({ error: '데이터가 없습니다.' }, callback);
    }

    const data = sheet.getRange('A1').getValue();

    if (!data) {
      return createResponse({ error: '저장된 데이터가 없습니다.' }, callback);
    }

    const jsonData = JSON.parse(data);
    return createResponse(jsonData, callback);

  } catch (error) {
    return createResponse({ error: error.message }, e.parameter.callback);
  }
}

// ========== POST 요청 처리 (데이터 저장) ==========
function doPost(e) {
  try {
    // form data 또는 JSON 파싱
    let data;
    if (e.parameter && e.parameter.data) {
      // form 방식
      data = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      // JSON 방식
      data = JSON.parse(e.postData.contents);
    } else {
      return createResponse({ error: '데이터가 없습니다.' });
    }

    // 비밀번호 검증
    if (data.password !== ADMIN_PASSWORD) {
      return createResponse({ error: '비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 필드 제거 후 저장
    delete data.password;

    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName('Data');

    // Data 시트가 없으면 생성
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Data');
    }

    // JSON 데이터 저장
    sheet.getRange('A1').setValue(JSON.stringify(data));

    // 저장 시간 기록
    sheet.getRange('B1').setValue(new Date().toISOString());

    // 히스토리 시트에도 기록 (백업용)
    let historySheet = spreadsheet.getSheetByName('History');
    if (!historySheet) {
      historySheet = spreadsheet.insertSheet('History');
      historySheet.getRange('A1:C1').setValues([['날짜', '시간', '데이터']]);
    }

    const now = new Date();
    const lastRow = historySheet.getLastRow() + 1;
    historySheet.getRange(lastRow, 1, 1, 3).setValues([[
      Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd'),
      Utilities.formatDate(now, 'Asia/Seoul', 'HH:mm:ss'),
      JSON.stringify(data)
    ]]);

    return createResponse({ success: true, message: '저장되었습니다.' });

  } catch (error) {
    return createResponse({ error: error.message });
  }
}

// ========== 응답 생성 함수 (JSONP 지원) ==========
function createResponse(data, callback) {
  const jsonStr = JSON.stringify(data);

  // JSONP 콜백이 있으면 래핑
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + jsonStr + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // 일반 JSON 응답
  return ContentService
    .createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== 테스트 함수 ==========
function testGet() {
  const result = doGet({ parameter: {} });
  Logger.log(result.getContent());
}
