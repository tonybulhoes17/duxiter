import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  robots: { index: true },
};

const LAST_UPDATED = "15 de setembro de 2026";

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

export default function TermsPage() {
  return (
    <div className="container max-w-3xl py-10 md:py-14">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Última atualização: {LAST_UPDATED}
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-text-primary md:text-4xl">
        Termos de Uso
      </h1>
      <P>
        Estes Termos de Uso (&ldquo;Termos&rdquo;) regem o acesso e o uso da
        plataforma Duxiter — aplicativo web e progressivo (PWA) disponível
        em <strong>duxiter.com.br</strong> — incluindo passeios com
        áudio-guia pré-produzidos, roteiros gerados por inteligência
        artificial, identificação de locais e obras por foto, e a ferramenta
        de divisão de despesas de viagem em grupo (em conjunto, o
        &ldquo;Serviço&rdquo;).
      </P>
      <P>
        O Serviço é oferecido por{" "}
        <strong>
          [RAZÃO SOCIAL / NOME COMPLETO DO RESPONSÁVEL — PREENCHER], inscrito
          no CPF/CNPJ nº [PREENCHER], com endereço em [PREENCHER]
        </strong>{" "}
        (&ldquo;Duxiter&rdquo;, &ldquo;nós&rdquo;). Ao criar uma conta,
        comprar um passeio ou roteiro, ou de qualquer forma usar o Serviço,
        você (&ldquo;usuário&rdquo;, &ldquo;você&rdquo;) declara que leu,
        entendeu e concorda com estes Termos. Se você não concorda, não
        utilize o Serviço.
      </P>

      <H2>1. Quem pode usar o Serviço</H2>
      <P>
        O Serviço é destinado a pessoas com <strong>18 anos ou mais</strong>,
        com plena capacidade civil para celebrar contratos, especialmente para
        realizar compras. Menores de 18 anos podem usar funcionalidades
        gratuitas do Serviço somente sob supervisão de um responsável legal,
        que assume total responsabilidade pelo uso.
      </P>
      <P>
        Ao criar uma conta você declara que as informações fornecidas
        (incluindo as obtidas via login com Google ou Apple) são verdadeiras,
        completas e atualizadas, e que é responsável por manter a
        confidencialidade das suas credenciais de acesso e por toda atividade
        realizada na sua conta.
      </P>

      <H2>2. O que é o Serviço</H2>
      <H3>2.1 Passeios pré-produzidos</H3>
      <P>
        Roteiros de áudio-guia com conteúdo previamente escrito, revisado e
        narrado, organizados por cidade, com mapa, paradas, imagens e faixas de
        áudio. Alguns são gratuitos; outros exigem pagamento único para
        desbloquear o conteúdo completo (as primeiras paradas costumam ficar
        disponíveis gratuitamente como amostra). Uma vez comprado, o acesso a
        um passeio pago é válido pelo prazo indicado no momento da compra
        (atualmente 6 meses a partir da confirmação do pagamento).
      </P>
      <H3>2.2 Roteiros gerados por Inteligência Artificial</H3>
      <P>
        A partir de um destino, tempo disponível e preferências informadas
        pelo usuário, o Serviço utiliza modelos de inteligência artificial de
        terceiros (incluindo modelos da OpenAI) para gerar um roteiro
        personalizado, com texto e narração em áudio sintetizada. A geração em
        si é gratuita; o desbloqueio da narração completa de um roteiro
        específico exige pagamento único, sem prazo de expiração de acesso
        para aquele roteiro.
      </P>
      <P>
        <strong>
          Conteúdo gerado por IA pode conter imprecisões, desatualizações ou
          erros.
        </strong>{" "}
        Veja a seção 6 abaixo — é essencial que você verifique
        independentemente qualquer informação prática antes de tomar decisões
        com base nela.
      </P>
      <H3>2.3 Identificação por foto</H3>
      <P>
        Ao fotografar um monumento, obra de arte, prédio ou outro ponto de
        interesse, o Serviço usa modelos de visão computacional para tentar
        identificá-lo e fornecer informações a respeito. Um número limitado de
        identificações por dia é gratuito; identificações adicionais exigem a
        compra de um pacote de créditos, que não expiram. O Serviço só cobra
        pela tentativa quando consegue identificar o objeto com confiança
        razoável — tentativas sem identificação bem-sucedida não consomem seu
        limite gratuito nem créditos pagos.
      </P>
      <H3>2.4 Divisão de despesas em grupo</H3>
      <P>
        Ferramenta para registrar e dividir despesas entre participantes de
        uma viagem.{" "}
        <strong>
          O Duxiter não processa pagamentos, não transfere, retém ou
          movimenta dinheiro entre participantes
        </strong>{" "}
        — a ferramenta é apenas um registro (ledger) de quem gastou o quê e
        quem deve a quem; qualquer acerto financeiro entre os participantes
        ocorre fora da plataforma, por meios próprios deles. Convidados podem
        participar de uma viagem sem necessariamente criar uma conta,
        utilizando um link de convite; o criador da viagem é responsável por
        gerenciá-la.
      </P>

      <H2>3. Cadastro, conta e cancelamento</H2>
      <P>
        Você pode criar uma conta com e-mail/senha ou por login social (Google
        ou Apple). Você é responsável por notificar o Duxiter imediatamente em
        caso de uso não autorizado da sua conta. Você pode solicitar a
        exclusão da sua conta e dos seus dados pessoais a qualquer momento,
        pelo formulário de contato disponível no Serviço, observadas as
        exceções legais de retenção (ex.: registros fiscais de pagamentos).
      </P>

      <H2>4. Pagamentos, preços e reembolsos</H2>
      <P>
        Os pagamentos são processados por um parceiro de pagamentos terceiro
        (Stripe), em reais (BRL). O Duxiter não armazena dados completos de
        cartão de crédito. Os preços exibidos no momento da compra são os
        preços vigentes para aquela transação; preços podem mudar sem aviso
        prévio para compras futuras, mas nunca afetam compras já concluídas.
      </P>
      <P>
        Como regra geral, compras de conteúdo digital com acesso imediato
        (desbloqueio de passeio, roteiro ou créditos) são{" "}
        <strong>
          não reembolsáveis após o desbloqueio do conteúdo
        </strong>
        , nos termos do art. 49 do Código de Defesa do Consumidor combinado
        com a natureza do conteúdo digital fornecido imediatamente com o
        consentimento do consumidor. Caso identifique uma cobrança indevida,
        duplicada, ou um problema técnico que tenha impedido o acesso ao
        conteúdo comprado, contate-nos — analisamos cada caso individualmente
        e, quando cabível, reembolsamos ou concedemos acesso equivalente.
      </P>

      <H2>5. Conteúdo enviado por você</H2>
      <P>
        Ao enviar uma foto para identificação, ou uma nota/localização para
        enriquecer a busca, você garante ter o direito de compartilhar esse
        conteúdo e autoriza o Duxiter a processá-lo (inclusive enviando-o a
        provedores de IA terceiros, como OpenAI e Google, para fins de
        identificação) exclusivamente para prestar o Serviço a você. Evite
        fotografar pessoas identificáveis sem o consentimento delas.
      </P>

      <H2>6. Natureza informativa do conteúdo — leia com atenção</H2>
      <P>
        O Duxiter é uma ferramenta de apoio e entretenimento para viajantes.{" "}
        <strong>
          Textos, narrações em áudio, rotas, distâncias, horários,
          informações históricas/culturais e sugestões práticas — sejam de
          passeios pré-produzidos ou gerados por IA — são fornecidos
          &ldquo;como estão&rdquo; e podem estar incompletos, desatualizados
          ou conter erros.
        </strong>{" "}
        Isso inclui, sem se limitar a:
      </P>
      <UL>
        <li>
          Horários de funcionamento, preços de ingresso, necessidade de
          reserva e disponibilidade de atrações, que mudam com frequência e
          devem ser confirmados nas fontes oficiais de cada local;
        </li>
        <li>
          Rotas de caminhada e distâncias/tempos estimados, que não
          substituem sua própria percepção do ambiente, sinalização local e
          bom senso quanto a segurança viária e condições do terreno;
        </li>
        <li>
          Fatos históricos, culturais e curiosidades apresentados em
          narrações — especialmente as geradas por IA — que podem conter
          imprecisões.
        </li>
      </UL>
      <P>
        <strong>
          Você é o único responsável por decisões tomadas com base no
          conteúdo do Serviço,
        </strong>{" "}
        incluindo itinerário, segurança pessoal, uso de vias públicas e
        interações com terceiros durante o uso do aplicativo em ambiente
        externo. Preste atenção ao seu redor, especialmente ao caminhar
        consultando o celular, e siga sempre a legislação e sinalização local.
      </P>

      <H2>7. Condutas proibidas</H2>
      <P>Ao usar o Serviço, você concorda em não:</P>
      <UL>
        <li>
          Copiar, redistribuir, revender ou explorar comercialmente o
          conteúdo do Duxiter (textos, áudios, imagens, rotas) sem autorização
          expressa;
        </li>
        <li>
          Tentar acessar áreas restritas do Serviço, contornar limites de uso
          gratuito ou mecanismos de cobrança, ou interferir na sua operação
          normal (incluindo engenharia reversa, scraping automatizado ou
          ataques de negação de serviço);
        </li>
        <li>
          Enviar conteúdo ilegal, ofensivo, ou que viole direitos de
          terceiros através de qualquer campo de texto, foto ou avaliação do
          Serviço;
        </li>
        <li>Usar a conta de outra pessoa sem autorização.</li>
      </UL>

      <H2>8. Propriedade intelectual</H2>
      <P>
        Marca, identidade visual, software, textos e narrações produzidos
        pelo Duxiter são de sua propriedade ou licenciados a ele, protegidos
        pela legislação de direitos autorais e propriedade industrial
        aplicável. Nenhum destes Termos transfere qualquer direito de
        propriedade intelectual ao usuário além da licença limitada, pessoal e
        não exclusiva de uso do Serviço para fins pessoais durante sua
        viagem.
      </P>

      <H2>9. Isenção de garantias e limitação de responsabilidade</H2>
      <P>
        Na máxima extensão permitida pela lei aplicável, o Serviço é
        fornecido &ldquo;no estado em que se encontra&rdquo; e &ldquo;conforme
        disponível&rdquo;, sem garantias de qualquer tipo, incluindo de
        adequação a uma finalidade específica,
        disponibilidade ininterrupta ou ausência de erros. O Duxiter não será
        responsável por danos indiretos, incidentais ou consequenciais
        decorrentes do uso do Serviço, incluindo — mas não se limitando a —
        decisões de viagem tomadas com base em informações imprecisas, exceto
        nos casos em que a lei brasileira de proteção ao consumidor determine
        de forma diversa e irrenunciável.
      </P>

      <H2>10. Serviços de terceiros</H2>
      <P>
        O Serviço integra provedores terceiros — processamento de pagamento
        (Stripe), inteligência artificial (OpenAI), mapas e geolocalização
        (Google Maps), envio de e-mail (Resend) — cada um sujeito aos próprios
        termos e políticas de privacidade. O Duxiter não é responsável pela
        disponibilidade ou pelas práticas desses terceiros.
      </P>

      <H2>11. Alterações destes Termos</H2>
      <P>
        Podemos atualizar estes Termos periodicamente para refletir mudanças
        no Serviço ou na legislação aplicável. Alterações relevantes serão
        comunicadas com antecedência razoável (por exemplo, um aviso no
        aplicativo ou por e-mail). O uso continuado do Serviço após uma
        alteração entrar em vigor constitui aceitação dos novos Termos.
      </P>

      <H2>12. Rescisão</H2>
      <P>
        Podemos suspender ou encerrar o acesso de um usuário que viole estes
        Termos, sem prejuízo de eventuais medidas legais cabíveis. Você pode
        deixar de usar o Serviço e solicitar o encerramento da sua conta a
        qualquer momento.
      </P>

      <H2>13. Lei aplicável e foro</H2>
      <P>
        Estes Termos são regidos pelas leis da República Federativa do
        Brasil. Fica eleito o foro do domicílio do consumidor para dirimir
        quaisquer controvérsias decorrentes destes Termos, conforme previsto
        no Código de Defesa do Consumidor.
      </P>

      <H2>14. Contato</H2>
      <P>
        Dúvidas sobre estes Termos podem ser enviadas pelo formulário
        &ldquo;Fale conosco&rdquo;, disponível no rodapé do Serviço.
      </P>
    </div>
  );
}
