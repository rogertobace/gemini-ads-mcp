import { describe, expect, it } from "vitest";

import { buildAdPrompt } from "@/src/ad-prompt";

describe("buildAdPrompt", () => {
  it("creates a conversion-focused 4:5 prompt without inventing copy or a logo", () => {
    const prompt = buildAdPrompt({
      company_name: "Nadecor",
      offer: "Móveis planejados premium",
      audience: "Proprietários de imóveis em Pernambuco",
      angle: "Transformação do ambiente",
      objective: "Geração de leads",
      format: "4:5",
      headline: "Transforme sua casa",
      cta: "Solicite seu projeto",
      language: "Português do Brasil",
    });

    expect(prompt).toContain("Proporção: 4:5");
    expect(prompt).toContain("Headline exata: “Transforme sua casa”");
    expect(prompt).toContain("Não inclua texto de apoio adicional");
    expect(prompt).toContain("Renderize somente os textos explicitamente autorizados");
    expect(prompt).toContain("Não invente logotipo");
    expect(prompt).toContain("Geração de leads");
  });
});
