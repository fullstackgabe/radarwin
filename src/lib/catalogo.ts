import type { EventType, Nivel } from '@/types'

export const CATALOGO: EventType[] = [
  {
    code: 'super_quarta',
    nome: 'Super quarta',
    pais: 'BR + EUA',
    fonte: 'Banco Central e Federal Reserve',
    fonte_url: 'https://www.bcb.gov.br/controleinflacao/calendarioreunioescopom',
    horario_texto: 'Fed às 15h/16h · Copom após o fechamento',
    nivel: 'forte',
    o_que_e: 'Dia em que o Copom e o Fed (FOMC) decidem os juros no mesmo dia.',
    impacto_texto: 'Copom e Fed decidem juros no mesmo dia. O 1º candle costuma não continuar. Considere não operar.',
    ordem: 1,
  },
  {
    code: 'fomc',
    nome: 'Decisão de juros nos EUA (FOMC)',
    pais: 'EUA',
    fonte: 'Federal Reserve',
    fonte_url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    horario_texto: '15h (16h no inverno americano)',
    nivel: 'atencao',
    o_que_e: 'O banco central americano anuncia a taxa de juros dos EUA.',
    impacto_texto: 'Mercado em espera até a decisão. O 1º candle costuma não continuar. Opere com cautela.',
    ordem: 2,
  },
  {
    code: 'copom',
    nome: 'Decisão de juros no Brasil (Copom)',
    pais: 'BR',
    fonte: 'Banco Central do Brasil',
    fonte_url: 'https://www.bcb.gov.br/controleinflacao/calendarioreunioescopom',
    horario_texto: 'Após o fechamento (~18h30)',
    nivel: 'atencao',
    o_que_e: 'O Banco Central anuncia a taxa Selic.',
    impacto_texto: 'Mercado em espera até a decisão. A abertura perde força. Opere com cautela.',
    ordem: 3,
  },
  {
    code: 'ipca',
    nome: 'IPCA',
    pais: 'BR',
    fonte: 'IBGE',
    fonte_url: 'https://www.ibge.gov.br/explica/inflacao.php',
    horario_texto: '9h',
    nivel: 'normal',
    o_que_e: 'Inflação oficial do Brasil no mês.',
    impacto_texto: 'O candle de abertura pode vir maior. Não atrapalha a abertura. Opere normalmente.',
    ordem: 4,
  },
  {
    code: 'ipca15',
    nome: 'IPCA-15',
    pais: 'BR',
    fonte: 'IBGE',
    fonte_url: 'https://www.ibge.gov.br/explica/inflacao.php',
    horario_texto: '9h',
    nivel: 'normal',
    o_que_e: 'Prévia da inflação oficial do Brasil.',
    impacto_texto: 'O candle de abertura pode vir maior. Não atrapalha a abertura. Opere normalmente.',
    ordem: 5,
  },
  {
    code: 'payroll',
    nome: 'Payroll (emprego nos EUA)',
    pais: 'EUA',
    fonte: 'BLS',
    fonte_url: 'https://www.bls.gov/schedule/news_release/empsit.htm',
    horario_texto: '9h30 (10h30 no inverno americano)',
    nivel: 'normal',
    o_que_e: 'Relatório de emprego dos EUA, um dos indicadores de maior impacto nos mercados.',
    impacto_texto: 'Volatilidade forte na divulgação. Não atrapalha a abertura. Opere normalmente.',
    ordem: 6,
  },
  {
    code: 'cpi',
    nome: 'CPI (inflação nos EUA)',
    pais: 'EUA',
    fonte: 'BLS',
    fonte_url: 'https://www.bls.gov/schedule/news_release/cpi.htm',
    horario_texto: '9h30 (10h30 no inverno americano)',
    nivel: 'normal',
    o_que_e: 'Inflação ao consumidor dos EUA.',
    impacto_texto: 'Volatilidade forte na divulgação. Não atrapalha a abertura. Opere normalmente.',
    ordem: 7,
  },
  {
    code: 'pos_fomc',
    nome: 'Dia seguinte ao FOMC',
    pais: 'EUA',
    fonte: 'Federal Reserve',
    fonte_url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    horario_texto: 'Dia todo',
    nivel: 'normal',
    o_que_e: 'Primeiro pregão depois da decisão de juros americana.',
    impacto_texto: 'A abertura volta ao normal. Opere normalmente.',
    ordem: 8,
  },
]

export const NIVEL_ORDEM: Record<Nivel, number> = { normal: 0, atencao: 1, forte: 2 }

export const NIVEL_LABEL: Record<Nivel, string> = {
  normal: 'Dia normal',
  atencao: 'Atenção',
  forte: 'Alerta forte',
}

export const NIVEL_EMOJI: Record<Nivel, string> = { normal: '✅', atencao: '🟡', forte: '🔴' }

export const NIVEL_FRASE: Record<Nivel, string> = {
  normal: 'Nada atrapalhando a abertura. Opere normalmente.',
  atencao: 'Dia de decisão de juros. Opere com cautela.',
  forte: 'Copom e Fed no mesmo dia. Considere não operar.',
}

export function maiorNivel(niveis: Nivel[]): Nivel {
  return niveis.reduce<Nivel>((a, b) => (NIVEL_ORDEM[b] > NIVEL_ORDEM[a] ? b : a), 'normal')
}
