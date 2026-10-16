/**
 * Escala estrita de 8 pontos (8pt Grid System) para espaçamentos,
 * alturas de controles e raios de borda.
 */
export const DS_SPACING_8PT = {
  px4: '0.25rem', // 0.5x (4px) - Micro-gaps e badges internas
  px8: '0.5rem', // 1x (8px) - Gap padrão ícone + texto
  px16: '1rem', // 2x (16px) - Padding padrão de controles e gaps de cards
  px24: '1.5rem', // 3x (24px) - Padding interno de cartões de seção
  px32: '2rem', // 4x (32px) - Espaçamento entre blocos de página
  px40: '2.5rem', // 5x (40px) - Altura padrão de botões e inputs (h-10)
  px48: '3rem', // 6x (48px) - Controles amplos e barras
  px64: '4rem' // 8x (64px) - Respiro macro / empty states
} as const
