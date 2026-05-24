import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userData } = await req.json();

    if (!userData) {
      return new Response(
        JSON.stringify({ error: '분석할 데이터가 없습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropic = new Anthropic();

    const systemPrompt = `당신은 개인 성장과 생산성 전문 코치입니다. 사용자의 플래너 데이터를 분석하여 따뜻하고 실용적인 인사이트를 제공합니다.

분석 시 다음 원칙을 따르세요:
1. 비판보다는 격려와 건설적인 피드백 제공
2. 구체적인 데이터 기반 분석
3. 실행 가능한 조언 제시
4. 한국어로 자연스럽게 소통
5. 이모지를 적절히 활용하여 친근하게 전달
6. 데이터가 부족한 영역은 솔직하게 언급하고, 있는 데이터 중심으로 분석`;

    const userPrompt = `다음은 사용자의 플래너 데이터입니다. 이를 종합적으로 분석해주세요.

${JSON.stringify(userData, null, 2)}

다음 형식으로 분석해주세요:

## 🎯 목표 달성 분석
- 전체 달성률과 패턴
- 잘하고 있는 점
- 개선할 수 있는 점

## ⚡ 생산성 패턴
- 시간 활용 패턴
- 우선순위 관리 상태
- 집중력 분석 (뽀모도로, 루틴 등)

## 💜 감정 & 마음 상태
- 전반적인 감정 흐름
- 스트레스/미루기 패턴
- 마음 건강 체크

## ⚖️ 삶의 균형
- 인생 목표 카테고리별 분포
- 편중된 영역 vs 소홀한 영역
- 균형 개선 제안

## 💪 당신의 강점
- 데이터에서 보이는 강점 3가지

## 🌱 성장 포인트
- 구체적인 개선 제안 3가지

## 📝 이번 주 추천 액션
- 바로 실천할 수 있는 작은 행동 2-3가지

분석은 따뜻하고 격려하는 톤으로, 하지만 솔직하게 작성해주세요. 데이터가 없는 영역은 "아직 데이터가 부족해요"라고 언급하고 넘어가세요.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const analysisText = message.content[0].type === 'text' ? message.content[0].text : '';

    return new Response(
      JSON.stringify({
        analysis: analysisText,
        analyzedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
