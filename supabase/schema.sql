create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.subscribers (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
drop policy if exists "subscriber le a propria linha" on public.subscribers;
create policy "subscriber le a propria linha" on public.subscribers
  for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));

create table if not exists public.leads (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;
drop policy if exists "lead grava o proprio email" on public.leads;
create policy "lead grava o proprio email" on public.leads
  for insert to authenticated with check (lower(email) = lower(auth.jwt() ->> 'email'));

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  callmebot_key text,
  callmebot_phone text,
  whatsapp_verified boolean not null default false,
  avisa_agenda boolean not null default true,
  avisa_lembrete boolean not null default true,
  so_alerta_forte boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "perfil proprio" on public.profiles;
create policy "perfil proprio" on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.event_types (
  code text primary key,
  nome text not null,
  pais text not null,
  fonte text not null,
  fonte_url text not null,
  horario_texto text not null,
  nivel text not null check (nivel in ('normal', 'atencao', 'forte')),
  o_que_e text not null,
  impacto_texto text not null,
  ordem int not null default 99
);
alter table public.event_types drop column if exists hist_trades, drop column if exists hist_acerto, drop column if exists hist_media;
alter table public.event_types enable row level security;
drop policy if exists "tipos visiveis para assinantes" on public.event_types;
create policy "tipos visiveis para assinantes" on public.event_types
  for select to authenticated using (true);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.event_types(code),
  data date not null,
  hora_brt time,
  nivel text not null,
  origem text not null default 'sync',
  criado_em timestamptz not null default now(),
  unique (code, data)
);
create index if not exists events_data_idx on public.events (data);
alter table public.events enable row level security;
drop policy if exists "eventos visiveis para assinantes" on public.events;
create policy "eventos visiveis para assinantes" on public.events
  for select to authenticated using (true);

create table if not exists public.feriados (
  data date primary key,
  nome text not null
);
alter table public.feriados enable row level security;

create table if not exists public.datas_oficiais (
  code text not null,
  data date not null,
  hora_local time,
  fuso text not null,
  primary key (code, data)
);
alter table public.datas_oficiais enable row level security;

create table if not exists public.sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  ref text not null,
  status text not null default 'sending',
  resposta text,
  enviado_em timestamptz not null default now(),
  unique (user_id, tipo, ref)
);
alter table public.sends enable row level security;

create table if not exists public.sync_log (
  id bigint generated always as identity primary key,
  fonte text not null,
  ok boolean not null,
  detalhe text,
  criado_em timestamptz not null default now()
);
alter table public.sync_log enable row level security;

insert into public.event_types (code, nome, pais, fonte, fonte_url, horario_texto, nivel, o_que_e, impacto_texto, ordem) values
('super_quarta', 'Super quarta', 'BR + EUA', 'Banco Central e Federal Reserve', 'https://www.bcb.gov.br/controleinflacao/calendarioreunioescopom', 'Fed às 15h/16h · Copom após o fechamento', 'forte', 'Copom e Fed decidem os juros no mesmo dia. O Fed anuncia à tarde e o Copom depois do fechamento. O mercado costuma esperar as duas decisões antes de escolher direção.', 'Copom e Fed decidem juros no mesmo dia. O 1º candle costuma não continuar. Considere não operar.', 1),
('fomc', 'Decisão de juros nos EUA (FOMC)', 'EUA', 'Federal Reserve', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', '15h (16h no inverno americano)', 'atencao', 'Reunião do Fed que define os juros dos EUA. A decisão sai à tarde, seguida da entrevista do presidente do Fed. Juros mais altos nos EUA tendem a tirar dinheiro de emergentes como o Brasil.', 'Mercado em espera até a decisão. O 1º candle costuma não continuar. Opere com cautela.', 2),
('copom', 'Decisão de juros no Brasil (Copom)', 'BR', 'Banco Central do Brasil', 'https://www.bcb.gov.br/controleinflacao/calendarioreunioescopom', 'Após o fechamento (~18h30)', 'atencao', 'Reunião do Banco Central que define a Selic. A decisão sai depois do fechamento do pregão. Selic mais alta encarece o crédito e tende a pesar na bolsa.', 'Mercado em espera até a decisão. A abertura perde força. Opere com cautela.', 3),
('ipca', 'IPCA', 'BR', 'IBGE', 'https://www.ibge.gov.br/explica/inflacao.php', '9h', 'normal', 'Inflação oficial do Brasil no mês, medida pelo IBGE. Acima do esperado, aumenta a chance de juros altos por mais tempo, o que pesa na bolsa.', 'O candle de abertura pode vir maior. Não atrapalha a abertura. Pode operar normalmente.', 4),
('ipca15', 'IPCA-15', 'BR', 'IBGE', 'https://www.ibge.gov.br/explica/inflacao.php', '9h', 'normal', 'Prévia da inflação oficial do mês, medida pelo IBGE. Antecipa o IPCA: acima do esperado, reforça a expectativa de juros altos.', 'O candle de abertura pode vir maior. Não atrapalha a abertura. Pode operar normalmente.', 5),
('payroll', 'Payroll (emprego nos EUA)', 'EUA', 'BLS', 'https://www.bls.gov/schedule/news_release/empsit.htm', '9h30 (10h30 no inverno americano)', 'normal', 'Relatório mensal de emprego dos EUA: vagas criadas e taxa de desemprego. Emprego forte pode manter os juros americanos altos. É um dos indicadores de maior impacto no mercado.', 'Volatilidade forte na divulgação. Não atrapalha a abertura. Pode operar normalmente.', 6),
('cpi', 'CPI (inflação nos EUA)', 'EUA', 'BLS', 'https://www.bls.gov/schedule/news_release/cpi.htm', '9h30 (10h30 no inverno americano)', 'normal', 'Inflação ao consumidor dos EUA no mês. Acima do esperado, aumenta a chance de juros mais altos nos EUA, o que costuma pesar nas bolsas, inclusive no Brasil.', 'Volatilidade forte na divulgação. Não atrapalha a abertura. Pode operar normalmente.', 7),
('pos_fomc', 'Dia seguinte ao FOMC', 'EUA', 'Federal Reserve', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Dia todo', 'normal', 'Primeiro pregão depois da decisão de juros americana. O mercado já absorveu a decisão e a entrevista do presidente do Fed.', 'A abertura volta ao normal. Pode operar normalmente.', 8),
('pib', 'PIB do Brasil', 'BR', 'IBGE', 'https://www.ibge.gov.br/explica/pib.php', '9h', 'atencao', 'Produto Interno Bruto do Brasil no trimestre, medido pelo IBGE. Mostra o ritmo da economia: número muito diferente do esperado mexe com juros e bolsa.', 'Sai às 9h, junto com o 1º candle. O candle de abertura pode vir maior. Fique atento à surpresa no número.', 9),
('producao_industrial', 'Produção industrial', 'BR', 'IBGE', 'https://www.ibge.gov.br/estatisticas/economicas/industria/9294-pesquisa-industrial-mensal-producao-fisica-brasil.html', '9h', 'normal', 'Produção da indústria brasileira no mês, medida pelo IBGE. Sinal do ritmo da atividade econômica.', 'Sai às 9h, junto com o 1º candle. Impacto costuma ser moderado. Pode operar normalmente.', 10),
('varejo', 'Vendas no varejo', 'BR', 'IBGE', 'https://www.ibge.gov.br/estatisticas/economicas/comercio/9227-pesquisa-mensal-de-comercio.html', '9h', 'normal', 'Vendas do comércio varejista no mês, medidas pelo IBGE. Termômetro do consumo das famílias.', 'Sai às 9h, junto com o 1º candle. Impacto costuma ser moderado. Pode operar normalmente.', 11),
('servicos', 'Volume de serviços', 'BR', 'IBGE', 'https://www.ibge.gov.br/estatisticas/economicas/servicos/9229-pesquisa-mensal-de-servicos.html', '9h', 'normal', 'Volume de serviços no mês, medido pelo IBGE. Serviços são o maior setor da economia brasileira.', 'Sai às 9h, junto com o 1º candle. Impacto costuma ser moderado. Pode operar normalmente.', 12),
('desemprego', 'Taxa de desemprego', 'BR', 'IBGE', 'https://www.ibge.gov.br/estatisticas/sociais/trabalho/9173-pesquisa-nacional-por-amostra-de-domicilios-continua-trimestral.html', '9h', 'normal', 'Taxa de desemprego do Brasil (PNAD Contínua), medida pelo IBGE. Mercado de trabalho forte pode pressionar a inflação e os juros.', 'Sai às 9h, junto com o 1º candle. Impacto costuma ser moderado. Pode operar normalmente.', 13),
('ata_copom', 'Ata do Copom', 'BR', 'Banco Central do Brasil', 'https://www.bcb.gov.br/publicacoes/atascopom', '8h', 'atencao', 'Documento do Banco Central que explica a última decisão da Selic e dá pistas dos próximos passos.', 'Sai às 8h, antes da abertura. Pode mudar a expectativa de juros e mexer no 1º candle. Fique atento.', 14),
('pib_eua', 'PIB dos EUA', 'EUA', 'BEA', 'https://www.bea.gov/news/schedule', '9h30 ou 10h30', 'normal', 'Produto Interno Bruto dos EUA no trimestre, divulgado pelo BEA. Mostra a força da maior economia do mundo.', 'Sai com a abertura já em andamento. Espere volatilidade na hora da divulgação.', 15),
('pce', 'PCE (inflação preferida do Fed)', 'EUA', 'BEA', 'https://www.bea.gov/news/schedule', '9h30 ou 10h30', 'normal', 'Inflação de consumo que o Fed usa como referência, junto com renda e gastos das famílias americanas. Acima do esperado, reforça juros altos nos EUA.', 'Sai com a abertura já em andamento. Espere volatilidade forte na hora da divulgação.', 16),
('varejo_eua', 'Vendas no varejo dos EUA', 'EUA', 'Census Bureau', 'https://www.census.gov/economic-indicators/calendar-listview.html', '9h30 ou 10h30', 'normal', 'Vendas do varejo americano no mês, divulgadas pelo Census Bureau. Termômetro do consumo nos EUA.', 'Sai com a abertura já em andamento. Espere volatilidade na hora da divulgação.', 17),
('bce', 'Decisão de juros na Europa (BCE)', 'Zona do euro', 'Banco Central Europeu', 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html', '10h15', 'normal', 'O Banco Central Europeu decide os juros da zona do euro, seguido de entrevista da presidente do BCE. Costuma mexer com o dólar e as bolsas globais.', 'Sai com a abertura já em andamento. Espere volatilidade na hora da decisão.', 18),
('vencimento_win', 'Vencimento do índice futuro', 'BR', 'B3', 'https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/futuro-de-ibovespa.htm', 'Dia todo', 'atencao', 'Vencimento do contrato de índice futuro (WIN), na quarta-feira mais próxima do dia 15 dos meses pares. A partir daí o contrato seguinte passa a ser o principal.', 'Dia de rolagem e ajuste de posições: a abertura pode ter movimentos atípicos. Confira o contrato no gráfico. Opere com cautela.', 19),
('feriado_eua', 'Feriado nos EUA', 'EUA', 'NYSE', 'https://www.nyse.com/markets/hours-calendars', 'Dia todo', 'atencao', 'Bolsas americanas fechadas. A B3 funciona normalmente.', 'Pouco volume e sem referência de Nova York: a abertura costuma ser lenta e sem direção. Opere com cautela.', 20),
('ibcbr', 'IBC-Br (prévia do PIB)', 'BR', 'Banco Central do Brasil', 'https://www.bcb.gov.br/en/about/bcb-calendar', '9h', 'normal', 'Índice de atividade econômica do Banco Central, uma prévia mensal do PIB. Atividade forte pode manter os juros altos por mais tempo.', 'Sai às 9h, junto com o 1º candle. Impacto costuma ser moderado. Pode operar normalmente.', 21),
('focus', 'Boletim Focus', 'BR', 'Banco Central do Brasil', 'https://www.bcb.gov.br/publicacoes/focus', '8h30 (segunda-feira)', 'normal', 'Pesquisa semanal do Banco Central com as previsões do mercado para inflação, Selic, PIB e dólar. Mostra se as expectativas estão piorando ou melhorando.', 'Sai às 8h30, antes da abertura. Costuma mexer pouco. Pode operar normalmente.', 22),
('igpm', 'IGP-M', 'BR', 'FGV', 'https://portalibre.fgv.br/igp', '8h', 'normal', 'Índice de preços da FGV que corrige aluguéis e contratos. Pesa muito o atacado e as commodities, então antecipa pressões na inflação.', 'Sai às 8h, antes da abertura. Costuma mexer pouco. Pode operar normalmente.', 23),
('fala_fed', 'Fala do presidente do Fed', 'EUA', 'Federal Reserve', 'https://www.federalreserve.gov/newsevents/calendar.htm', 'Varia', 'normal', 'Discurso, entrevista ou depoimento do presidente do Fed fora das reuniões. Qualquer pista sobre os próximos juros americanos mexe com dólar e bolsas.', 'Volatilidade na hora da fala. Se for antes das 9h30, pode mexer na abertura. Fique atento.', 24)
on conflict (code) do update set
  nome = excluded.nome, pais = excluded.pais, fonte = excluded.fonte, fonte_url = excluded.fonte_url,
  horario_texto = excluded.horario_texto, nivel = excluded.nivel, o_que_e = excluded.o_que_e,
  impacto_texto = excluded.impacto_texto, ordem = excluded.ordem;

insert into public.datas_oficiais (code, data, hora_local, fuso) values
('copom', '2026-11-04', '18:30', 'America/Sao_Paulo'), ('copom', '2026-12-09', '18:30', 'America/Sao_Paulo'),
('copom', '2027-01-27', '18:30', 'America/Sao_Paulo'), ('copom', '2027-03-17', '18:30', 'America/Sao_Paulo'),
('copom', '2027-04-28', '18:30', 'America/Sao_Paulo'), ('copom', '2027-06-16', '18:30', 'America/Sao_Paulo'),
('copom', '2027-08-04', '18:30', 'America/Sao_Paulo'), ('copom', '2027-09-22', '18:30', 'America/Sao_Paulo'),
('copom', '2027-10-27', '18:30', 'America/Sao_Paulo'), ('copom', '2027-12-08', '18:30', 'America/Sao_Paulo'),
('payroll', '2026-11-06', '08:30', 'America/New_York'), ('payroll', '2026-12-04', '08:30', 'America/New_York'),
('payroll', '2027-01-08', '08:30', 'America/New_York'), ('payroll', '2027-02-05', '08:30', 'America/New_York'),
('payroll', '2027-03-05', '08:30', 'America/New_York'), ('payroll', '2027-04-02', '08:30', 'America/New_York'),
('payroll', '2027-05-07', '08:30', 'America/New_York'), ('payroll', '2027-06-04', '08:30', 'America/New_York'),
('payroll', '2027-07-02', '08:30', 'America/New_York'), ('payroll', '2027-08-06', '08:30', 'America/New_York'),
('payroll', '2027-09-03', '08:30', 'America/New_York'), ('payroll', '2027-10-08', '08:30', 'America/New_York'),
('payroll', '2027-11-05', '08:30', 'America/New_York'), ('payroll', '2027-12-03', '08:30', 'America/New_York'),
('cpi', '2026-11-10', '08:30', 'America/New_York'), ('cpi', '2026-12-10', '08:30', 'America/New_York'),
('cpi', '2027-01-13', '08:30', 'America/New_York'), ('cpi', '2027-02-11', '08:30', 'America/New_York'),
('cpi', '2027-03-10', '08:30', 'America/New_York'), ('cpi', '2027-04-13', '08:30', 'America/New_York'),
('cpi', '2027-05-12', '08:30', 'America/New_York'), ('cpi', '2027-06-10', '08:30', 'America/New_York'),
('cpi', '2027-07-14', '08:30', 'America/New_York'), ('cpi', '2027-08-11', '08:30', 'America/New_York'),
('cpi', '2027-09-14', '08:30', 'America/New_York'), ('cpi', '2027-10-14', '08:30', 'America/New_York'),
('cpi', '2027-11-10', '08:30', 'America/New_York'), ('cpi', '2027-12-10', '08:30', 'America/New_York')
on conflict (code, data) do nothing;

insert into public.feriados (data, nome) values
('2026-11-20', 'Consciência Negra'), ('2026-12-24', 'Véspera de Natal'), ('2026-12-25', 'Natal'), ('2026-12-31', 'Último dia do ano'),
('2027-01-01', 'Confraternização Universal'), ('2027-02-08', 'Carnaval'), ('2027-02-09', 'Carnaval'), ('2027-03-26', 'Sexta-feira Santa'),
('2027-04-21', 'Tiradentes'), ('2027-05-27', 'Corpus Christi'), ('2027-09-07', 'Independência'), ('2027-10-12', 'Nossa Senhora Aparecida'),
('2027-11-02', 'Finados'), ('2027-11-15', 'Proclamação da República'), ('2027-12-24', 'Véspera de Natal'), ('2027-12-31', 'Último dia do ano')
on conflict (data) do nothing;
create or replace function public.is_subscriber() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.subscribers s where lower(s.email) = lower(auth.jwt() ->> 'email') and s.active)
$$;
revoke all on function public.is_subscriber() from public;
grant execute on function public.is_subscriber() to authenticated;

drop policy if exists "perfil proprio" on public.profiles;
create policy "perfil proprio" on public.profiles
  for all to authenticated using (user_id = auth.uid() and public.is_subscriber()) with check (user_id = auth.uid() and public.is_subscriber());

drop policy if exists "tipos visiveis para assinantes" on public.event_types;
create policy "tipos visiveis para assinantes" on public.event_types
  for select to authenticated using (public.is_subscriber());

drop policy if exists "eventos visiveis para assinantes" on public.events;
create policy "eventos visiveis para assinantes" on public.events
  for select to authenticated using (public.is_subscriber());
