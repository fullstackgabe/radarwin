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
('super_quarta', 'Super quarta', 'BR + EUA', 'Banco Central e Federal Reserve', 'https://www.bcb.gov.br/controleinflacao/calendarioreunioescopom', 'Fed às 15h/16h · Copom após o fechamento', 'forte', 'Dia em que o Copom e o Fed (FOMC) decidem os juros no mesmo dia.', 'Copom e Fed decidem juros no mesmo dia. O 1º candle costuma não continuar. Considere não operar.', 1),
('fomc', 'Decisão de juros nos EUA (FOMC)', 'EUA', 'Federal Reserve', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', '15h (16h no inverno americano)', 'atencao', 'O banco central americano anuncia a taxa de juros dos EUA.', 'Mercado em espera até a decisão. O 1º candle costuma não continuar. Opere com cautela.', 2),
('copom', 'Decisão de juros no Brasil (Copom)', 'BR', 'Banco Central do Brasil', 'https://www.bcb.gov.br/controleinflacao/calendarioreunioescopom', 'Após o fechamento (~18h30)', 'atencao', 'O Banco Central anuncia a taxa Selic.', 'Mercado em espera até a decisão. A abertura perde força. Opere com cautela.', 3),
('ipca', 'IPCA', 'BR', 'IBGE', 'https://www.ibge.gov.br/explica/inflacao.php', '9h', 'normal', 'Inflação oficial do Brasil no mês.', 'O candle de abertura pode vir maior. Não atrapalha a abertura. Opere normalmente.', 4),
('ipca15', 'IPCA-15', 'BR', 'IBGE', 'https://www.ibge.gov.br/explica/inflacao.php', '9h', 'normal', 'Prévia da inflação oficial do Brasil.', 'O candle de abertura pode vir maior. Não atrapalha a abertura. Opere normalmente.', 5),
('payroll', 'Payroll (emprego nos EUA)', 'EUA', 'BLS', 'https://www.bls.gov/schedule/news_release/empsit.htm', '9h30 (10h30 no inverno americano)', 'normal', 'Relatório de emprego dos EUA, um dos indicadores de maior impacto nos mercados.', 'Volatilidade forte na divulgação. Não atrapalha a abertura. Opere normalmente.', 6),
('cpi', 'CPI (inflação nos EUA)', 'EUA', 'BLS', 'https://www.bls.gov/schedule/news_release/cpi.htm', '9h30 (10h30 no inverno americano)', 'normal', 'Inflação ao consumidor dos EUA.', 'Volatilidade forte na divulgação. Não atrapalha a abertura. Opere normalmente.', 7),
('pos_fomc', 'Dia seguinte ao FOMC', 'EUA', 'Federal Reserve', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Dia todo', 'normal', 'Primeiro pregão depois da decisão de juros americana.', 'A abertura volta ao normal. Opere normalmente.', 8)
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
