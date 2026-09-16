import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  robots: { index: true },
};

const LAST_UPDATED = "16 de setembro de 2026";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-display text-xl font-bold text-text-primary">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 font-heading text-base font-semibold text-text-primary">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 leading-relaxed text-text-secondary">{children}</p>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-text-secondary">
      {children}
    </ul>
  );
}

function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-subtle">
            <th className="px-3 py-2 font-heading font-semibold text-text-primary">
              Dado
            </th>
            <th className="px-3 py-2 font-heading font-semibold text-text-primary">
              Para quê usamos
            </th>
            <th className="px-3 py-2 font-heading font-semibold text-text-primary">
              Base legal
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b, c], i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-3 py-2 align-top text-text-secondary">{a}</td>
              <td className="px-3 py-2 align-top text-text-secondary">{b}</td>
              <td className="px-3 py-2 align-top text-text-secondary">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-10 md:py-14">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Última atualização: {LAST_UPDATED}
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-text-primary md:text-4xl">
        Política de Privacidade
      </h1>
      <P>
        Esta Política de Privacidade explica quais dados pessoais a
        plataforma Duxiter (&ldquo;Serviço&rdquo;, &ldquo;nós&rdquo;) coleta,
        por que, com quem compartilha e quais direitos você tem sobre eles,
        em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº
        13.709/2018). Ela complementa nossos{" "}
        <a href="/termos" className="text-primary hover:underline">
          Termos de Uso
        </a>
        .
      </P>
      <P>
        O controlador dos dados tratados por este Serviço é{" "}
        <strong>João Antônio Bulhões Leão, CPF 024.000.955-07</strong>,
        contatável pelo formulário &ldquo;Fale conosco&rdquo; disponível no
        rodapé do Serviço.
      </P>

      <H2>1. Quais dados coletamos e para quê</H2>
      <H3>1.1 Cadastro e conta</H3>
      <P>
        Ao criar uma conta (por e-mail/senha ou login social com Google ou
        Apple), coletamos seu nome, e-mail e, quando fornecida pelo provedor
        de login, sua foto de perfil. Também guardamos seu idioma preferido
        no Serviço.
      </P>
      <H3>1.2 Localização</H3>
      <P>
        Quando você usa &ldquo;usar minha localização&rdquo; para gerar um
        roteiro ou identificar algo pela câmera na rua, ou toca um ponto no
        mapa, coletamos as coordenadas de GPS informadas pelo seu navegador
        <em> apenas com a sua ação explícita</em> — o Serviço nunca rastreia
        sua localização em segundo plano. Essas coordenadas são usadas para
        montar o roteiro ou identificar o local, e podem ficar salvas junto
        do roteiro gerado (ex.: o ponto de partida escolhido).
      </P>
      <H3>1.3 Fotos para identificação</H3>
      <P>
        Ao fotografar um monumento, obra de arte ou objeto para
        identificação, a imagem é enviada diretamente aos provedores de
        inteligência artificial que fazem a análise (OpenAI e, quando
        aplicável, Google Cloud Vision) para gerar a resposta.{" "}
        <strong>
          O Duxiter não armazena essas fotos em seus próprios servidores
        </strong>{" "}
        além do tempo necessário para processar a requisição — elas não ficam
        salvas em nenhum álbum, histórico ou banco de imagens do Serviço.
        Esses provedores têm suas próprias políticas de retenção para fins de
        segurança e prevenção de abuso, geralmente por prazo curto, e não
        usam esse conteúdo para treinar seus modelos quando acessado via API
        comercial.
      </P>
      <H3>1.4 Pagamentos</H3>
      <P>
        Pagamentos são processados pela Stripe. O Duxiter{" "}
        <strong>nunca recebe nem armazena o número completo do seu cartão</strong>
        ; guardamos apenas o registro da transação (valor, data, status,
        identificadores da Stripe) para fins de acesso ao conteúdo comprado,
        emissão de comprovantes e obrigações fiscais/contábeis.
      </P>
      <H3>1.5 Divisão de despesas em grupo</H3>
      <P>
        Ao criar ou participar de uma viagem no divisor de despesas,
        armazenamos o nome informado para cada participante (que pode ser
        apenas um apelido, não precisa ser o nome civil), os valores e
        descrições das despesas lançadas. Convidados podem participar sem
        criar conta, usando um link de convite; nesse caso, identificamos o
        dispositivo do convidado por um código local (cookie), não por dados
        pessoais adicionais.
      </P>
      <H3>1.6 Dados de uso, desempenho e cookies</H3>
      <P>
        Coletamos eventos de uso (por exemplo, visualização de um passeio,
        geração de um roteiro, abertura da câmera de identificação) para
        entender o que funciona no Serviço e para calcular o custo real de
        cada funcionalidade baseada em inteligência artificial. Usamos
        cookies essenciais para manter sua sessão logada, lembrar seu idioma
        e, no caso de convidados de viagens, sua participação — veja a seção
        9.
      </P>

      <H2>2. Resumo — dado, finalidade e base legal</H2>
      <Table
        rows={[
          [
            "Nome, e-mail, foto de perfil",
            "Criar e gerenciar sua conta",
            "Execução de contrato",
          ],
          [
            "Localização (GPS, sob ação sua)",
            "Gerar roteiro / identificar local",
            "Execução de contrato",
          ],
          [
            "Foto enviada para identificação",
            "Processar a identificação via IA",
            "Execução de contrato",
          ],
          [
            "Dados de pagamento (via Stripe)",
            "Cobrar e liberar acesso ao conteúdo comprado",
            "Execução de contrato / obrigação legal",
          ],
          [
            "Nomes e despesas de uma viagem",
            "Calcular e mostrar quem deve a quem",
            "Execução de contrato",
          ],
          [
            "Eventos de uso e custo de IA",
            "Melhorar o Serviço e controlar custos",
            "Legítimo interesse",
          ],
          [
            "Cookies essenciais",
            "Manter sessão, idioma e convites de viagem",
            "Execução de contrato",
          ],
        ]}
      />

      <H2>3. Com quem compartilhamos seus dados</H2>
      <P>
        Não vendemos seus dados pessoais. Compartilhamos apenas o necessário
        com os seguintes prestadores de serviço, que atuam como operadores
        no tratamento:
      </P>
      <UL>
        <li>
          <strong>Supabase</strong> — hospedagem do banco de dados, contas
          de usuário e arquivos de mídia dos passeios;
        </li>
        <li>
          <strong>OpenAI</strong> — geração de roteiros, narração em áudio e
          identificação de fotos por inteligência artificial;
        </li>
        <li>
          <strong>Google (Maps, Geocoding e, quando aplicável, Cloud
          Vision)</strong> — exibição de mapas, conversão de coordenadas em
          endereços, e suporte à identificação por foto;
        </li>
        <li>
          <strong>Stripe</strong> — processamento de pagamentos;
        </li>
        <li>
          <strong>Resend</strong> — envio de e-mails transacionais (ex.:
          confirmação de compra);
        </li>
        <li>
          <strong>Vercel</strong> — hospedagem da aplicação web.
        </li>
      </UL>
      <P>
        Alguns desses prestadores estão localizados fora do Brasil
        (principalmente Estados Unidos), o que envolve transferência
        internacional de dados. Essa transferência ocorre com base na
        necessidade de execução do contrato com você e nas salvaguardas
        contratuais oferecidas por esses prestadores (como cláusulas-padrão
        de proteção de dados). Também podemos divulgar dados quando exigido
        por lei ou ordem judicial.
      </P>

      <H2>4. Por quanto tempo guardamos seus dados</H2>
      <P>
        Mantemos seus dados de conta enquanto ela estiver ativa. Registros de
        pagamento são mantidos pelo prazo exigido pela legislação fiscal e
        contábil brasileira (em geral 5 anos). Você pode solicitar a exclusão
        da sua conta e dos dados associados a qualquer momento — nesse caso,
        anonimizamos ou eliminamos o que não precisarmos reter por obrigação
        legal.
      </P>

      <H2>5. Seus direitos como titular de dados</H2>
      <P>Nos termos do art. 18 da LGPD, você pode solicitar a qualquer momento:</P>
      <UL>
        <li>Confirmação de que tratamos seus dados, e acesso a eles;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>
          Anonimização, bloqueio ou eliminação de dados desnecessários ou
          tratados em desconformidade com a lei;
        </li>
        <li>Portabilidade dos seus dados a outro fornecedor de serviço;</li>
        <li>
          Informação sobre com quem compartilhamos seus dados;
        </li>
        <li>
          Revogação do seu consentimento, quando o tratamento se basear
          nele;
        </li>
        <li>Exclusão da sua conta e dos dados pessoais associados.</li>
      </UL>
      <P>
        Para exercer qualquer um desses direitos, use o formulário
        &ldquo;Fale conosco&rdquo; no rodapé do Serviço. Respondemos dentro
        de um prazo razoável, observadas eventuais obrigações legais de
        retenção de determinados registros (por exemplo, comprovantes de
        pagamento).
      </P>

      <H2>6. Segurança</H2>
      <P>
        Adotamos medidas técnicas e administrativas razoáveis para proteger
        seus dados contra acessos não autorizados, perda ou alteração
        indevida — incluindo conexão criptografada (HTTPS) em todo o
        Serviço, controle de acesso por autenticação, e uso de provedores
        com práticas de segurança reconhecidas (Supabase, Stripe, Vercel).
        Nenhum sistema é 100% livre de risco, e nos comprometemos a agir
        rapidamente caso algum incidente de segurança seja identificado.
      </P>

      <H2>7. Crianças e adolescentes</H2>
      <P>
        O Serviço não é direcionado a menores de 18 anos e não coletamos
        intencionalmente dados de crianças. Caso um responsável legal
        identifique que uma criança forneceu dados pessoais ao Serviço sem o
        devido consentimento, pedimos contato pelo formulário &ldquo;Fale
        conosco&rdquo; para que possamos excluir esses dados.
      </P>

      <H2>8. Cookies</H2>
      <P>Usamos apenas cookies essenciais ao funcionamento do Serviço:</P>
      <UL>
        <li>
          <strong>Sessão/autenticação</strong> — mantém você logado entre
          visitas;
        </li>
        <li>
          <strong>Idioma</strong> — lembra se você prefere português, inglês
          ou espanhol;
        </li>
        <li>
          <strong>Participação em viagem (convidado)</strong> — identifica
          seu dispositivo como participante de uma viagem do divisor de
          despesas, sem exigir conta.
        </li>
      </UL>
      <P>
        Não usamos cookies de publicidade ou rastreamento de terceiros para
        fins de marketing.
      </P>

      <H2>9. Alterações nesta Política</H2>
      <P>
        Podemos atualizar esta Política periodicamente para refletir mudanças
        no Serviço, em nossos prestadores, ou na legislação aplicável.
        Alterações relevantes serão comunicadas com antecedência razoável.
        Recomendamos revisitar esta página de tempos em tempos.
      </P>

      <H2>10. Contato</H2>
      <P>
        Dúvidas, solicitações sobre seus dados pessoais, ou qualquer questão
        relacionada a esta Política podem ser enviadas pelo formulário
        &ldquo;Fale conosco&rdquo;, disponível no rodapé do Serviço.
      </P>
    </div>
  );
}
