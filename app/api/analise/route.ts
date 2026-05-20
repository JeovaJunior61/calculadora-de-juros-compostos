import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// We check the API key on each request (lazy load) or gracefully handle missing keys
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "A chave API GEMINI_API_KEY não está configurada no servidor. Por favor, adicione-a nas configurações." },
        { status: 500 }
      );
    }

    const { valorInicial, valorMensal, taxaJuros, taxaTipo, periodo, periodoTipo, tributacao, totalFinal, totalFinalNet, totalTaxPaid, totalInvestido, totalJuros } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um analista financeiro especialista e planeador de patrimônio certificado no Brasil.
O usuário utilizou nosso Simulador de Juros Compostos com os seguintes dados:
- Valor Inicial: R$ ${valorInicial}
- Aporte Mensal: R$ ${valorMensal}
- Taxa de Juros: ${taxaJuros}% ao ${taxaTipo === 'anual' ? 'ano' : 'mês'}
- Período: ${periodo} ${periodoTipo === 'anos' ? 'anos' : 'meses'}
- Tipo de Tributação: ${tributacao === 'isento' ? 'Isento (LCI, LCA, Poupança)' : 'CDB / Tesouro Direto (Tabela Regressiva de IR)'}

Resultados finais calculados:
- Montante Total Bruto: R$ ${totalFinal}
- Montante Líquido (pós Imposto de Renda): ${tributacao === 'isento' ? 'Mesmo valor (Isento)' : 'R$ ' + totalFinalNet}
- Imposto de Renda Retido Pago: ${tributacao === 'isento' ? 'R$ 0,00 (Isento)' : 'R$ ' + totalTaxPaid}
- Capital Total Investido pelo usuário: R$ ${totalInvestido}
- Rendimento Acumulado por Juros Brutos: R$ ${totalJuros}

Escreva um relatório ou análise financeira sucinta, profissional e prática em português brasileiro para este investidor (use de 3 a 4 parágrafos curtos). Foque em:
1. **Poder do Tempo e Retorno Real**: Destaque a diferença entre o valor acumulado e investido. Explique o efeito bola de neve dos juros.
2. **Impacto Tributário e de Custos**: Comente sobre a escolha tributária selecionada (${tributacao === 'isento' ? 'Isenção de IR em investimentos como LCI/LCA' : 'A Tabela Regressiva do IR em CDBs e Tesouro, cuja alíquota mínima chega a 15% após 2 anos'}).
3. **Impacto da Inflação**: Lembre o usuário de que o valor nominal futuro sofrerá o efeito da inflação e indique brevemente a importância de focar em "taxa real" acima da inflação.
4. **Sugestão de Ativos**: Com base no perfil modelado, sugira brevemente os ativos mais adequados no Brasil: Tesouro IPCA+ para longo prazo, CDB/LCI/LCA pós-fixados para curto/médio prazo ou reserva, fundos imobiliários ou ações para geração de dividendos futuros se for para viver de renda.
5. **Próximo Passo**: Dê um conselho de encorajamento realista e estratégico para manter a consistência financeira.

Importante: 
- Retorne com formatação Markdown clara (com negritos e títulos pequenos se achar necessário, sem cabeçalhos H1 grandes).
- Use uma linguagem sofisticada, acolhedoramente profissional e evite listas com tópicos longos de forma cansativa.
- Não invente garantias de retorno; mantenha os alertas padrão do mercado financeiro brasileiro.
- Evite o uso despropositado de emojis (no máximo 2-3 em todo o texto para manter o tom executivo sofisticado).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ insight: response.text });
  } catch (error: any) {
    console.error("Erro na rota de API do Gemini:", error);
    return NextResponse.json(
      { error: `Ocorreu um erro ao processar a análise: ${error.message || error}` },
      { status: 500 }
    );
  }
}
