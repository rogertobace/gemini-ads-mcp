import type { GenerateAdInput } from "@/src/ad-schema";

export function buildAdPrompt(input: GenerateAdInput) {
  const textRequirements = [
    input.headline
      ? `Headline exata: “${input.headline}”.`
      : "Crie uma headline curta e persuasiva.",
    input.supporting_text
      ? `Texto de apoio exato: “${input.supporting_text}”.`
      : "Não inclua texto de apoio adicional.",
    `CTA exato: “${input.cta}”.`,
  ].join("\n");

  return `Crie uma única peça publicitária estática profissional, pronta para mídia paga.

FORMATO E ENTREGA
- Proporção: ${input.format}.
- Entregue somente uma imagem final completa, sem mockup, sem moldura externa e sem explicações fora da peça.
- Preserve margens seguras para feeds e não corte textos ou elementos importantes.

CONTEXTO DE MARKETING
- Empresa: ${input.company_name}.
- Oferta: ${input.offer}.
- Público: ${input.audience}.
- Ângulo criativo: ${input.angle}.
- Objetivo: ${input.objective}.
- Idioma: ${input.language}.

COPY NA ARTE
${textRequirements}
- Renderize somente os textos explicitamente autorizados acima.
- Não acrescente rótulos como “antes”, “depois”, nome da empresa, slogans, legendas ou frases decorativas.

DIREÇÃO DE ARTE
${input.visual_direction || "Visual premium, claro e orientado à conversão, com hierarquia forte e foco em um único conceito."}
${input.brand_notes ? `Diretrizes de marca: ${input.brand_notes}` : "Não invente logotipo nem símbolos de marca."}

PADRÃO DE QUALIDADE
- Aparência de campanha produzida por direção de arte humana, não de template genérico de IA.
- Tipografia legível, alinhamento preciso, contraste adequado e hierarquia clara.
- Não repetir textos. Não inserir palavras aleatórias, selos falsos, preços ou promessas não fornecidas.
- Revise cuidadosamente a ortografia de todo texto visível antes de finalizar.
- Evite excesso de elementos, gradientes genéricos de SaaS, brilho neon, glassmorphism e poluição visual.
${input.negative_instructions ? `- Evitar também: ${input.negative_instructions}` : ""}`.trim();
}
