-- ═══════════════════════════════════════════════════════════════════════════════
-- 플로카 ADHD 플래너 - Supabase 완전 리셋 스크립트
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 1. 기존 트리거 및 함수 삭제                                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 2. 기존 테이블 모두 삭제                                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
DROP TABLE IF EXISTS public.ai_analysis_results CASCADE;
DROP TABLE IF EXISTS public.daily_logs CASCADE;
DROP TABLE IF EXISTS public.emotion_therapy_sessions CASCADE;
DROP TABLE IF EXISTS public.procrastination_sessions CASCADE;
DROP TABLE IF EXISTS public.morning_journals CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.user_app_data CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 3. 새로운 user_app_data 테이블 생성                                            ║
-- ║    모든 앱 데이터를 JSONB 하나에 저장하는 심플한 구조                            ║
-- ║                                                                               ║
-- ║    저장되는 localStorage 키들:                                                 ║
-- ║    - floca_user_profile (사용자 프로필)                                        ║
-- ║    - floca_goals (목표: 인생/연간/월간/주간/일일)                               ║
-- ║    - floca_daily_close_records (하루마무리 기록)                                ║
-- ║    - floca_morning_journal (아침일기)                                          ║
-- ║    - floca_emotion_therapy (감정인지치료)                                       ║
-- ║    - floca_proc_records (미루기 대처)                                           ║
-- ║    - floca_reward_state (보상 시스템)                                           ║
-- ║    - floca_brain_dump (브레인덤프)                                              ║
-- ║    - floca_routines (루틴)                                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
CREATE TABLE public.user_app_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  app_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_user_app_data_user_id ON public.user_app_data(user_id);
CREATE INDEX idx_user_app_data_updated_at ON public.user_app_data(updated_at DESC);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 4. Row Level Security (RLS) 설정                                              ║
-- ║    각 사용자는 자신의 데이터만 접근 가능                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
ALTER TABLE public.user_app_data ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 데이터만 조회 가능
CREATE POLICY "user_app_data_select_own"
  ON public.user_app_data
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: 본인 user_id로만 삽입 가능
CREATE POLICY "user_app_data_insert_own"
  ON public.user_app_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인 데이터만 수정 가능
CREATE POLICY "user_app_data_update_own"
  ON public.user_app_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: 본인 데이터만 삭제 가능
CREATE POLICY "user_app_data_delete_own"
  ON public.user_app_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 5. 권한 부여                                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
GRANT ALL ON public.user_app_data TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 완료! 이제 index.html의 Supabase 코드도 업데이트 필요
-- ═══════════════════════════════════════════════════════════════════════════════
