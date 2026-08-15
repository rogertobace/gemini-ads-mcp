import { z } from "zod";

export const adFormats = ["4:5", "1:1", "9:16"] as const;

export const generateAdInputSchema = z.object({
  company_name: z
    .string()
    .min(2)
    .max(120)
    .describe("Nome da empresa ou marca anunciante."),
  offer: z
    .string()
    .min(3)
    .max(500)
    .describe("Produto, serviço ou oferta principal do anúncio."),
  audience: z
    .string()
    .min(3)
    .max(500)
    .describe("Público-alvo e contexto de compra."),
  angle: z
    .string()
    .min(2)
    .max(240)
    .describe("Ângulo criativo, por exemplo transformação, autoridade ou dor."),
  objective: z
    .string()
    .min(2)
    .max(240)
    .describe("Objetivo de marketing, por exemplo geração de leads."),
  format: z
    .enum(adFormats)
    .default("4:5")
    .describe("Proporção final do anúncio."),
  headline: z
    .string()
    .min(2)
    .max(100)
    .optional()
    .describe("Headline exata a ser renderizada. Omitir para o Gemini propor."),
  supporting_text: z
    .string()
    .max(180)
    .optional()
    .describe("Texto curto de apoio a ser renderizado."),
  cta: z
    .string()
    .max(50)
    .default("Saiba mais")
    .describe("Texto curto do botão ou chamada para ação."),
  brand_notes: z
    .string()
    .max(1000)
    .optional()
    .describe("Cores, tipografia, tom, restrições e elementos da marca."),
  visual_direction: z
    .string()
    .max(1000)
    .optional()
    .describe("Direção de arte, composição, fotografia e referências visuais."),
  language: z
    .string()
    .max(40)
    .default("Português do Brasil")
    .describe("Idioma do texto dentro do anúncio."),
  negative_instructions: z
    .string()
    .max(600)
    .optional()
    .describe("Elementos, estilos ou erros que devem ser evitados."),
});

export type GenerateAdInput = z.infer<typeof generateAdInputSchema>;
