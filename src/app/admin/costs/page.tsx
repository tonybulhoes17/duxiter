import { DollarSign, Percent, TrendingDown, Wallet } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { MiniLineChart } from "@/components/admin/line-chart";
import { getAdminCosts } from "@/lib/admin-queries";
import { formatBrl } from "@/lib/format";

const EVENT_LABEL: Record<string, string> = {
  itinerary_generate: "Roteiro — geração (pass 1)",
  itinerary_expand: "Roteiro — expansão (pass 2)",
  itinerary_tts: "Roteiro — áudio (TTS)",
  identify: "Identificar foto — visão",
  identify_tts: "Identificar foto — áudio (TTS)",
  translate: "Tradução (admin)",
};

function fmtUsd(n: number) {
  return `US$ ${n.toFixed(2)}`;
}

export default async function AdminCostsPage() {
  const c = await getAdminCosts();

  const margin30 = c.revenueBrl.d30 - c.costBrl.d30;
  const marginPct =
    c.revenueBrl.d30 > 0 ? (margin30 / c.revenueBrl.d30) * 100 : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Custo de IA</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Custo real estimado de cada chamada de OpenAI (texto, visão, áudio),
          lado a lado com a receita — números reais, não estimativa.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Custo hoje"
          value={fmtUsd(c.costUsd.today)}
          hint={formatBrl(c.costBrl.today)}
          icon={TrendingDown}
        />
        <StatCard
          label="Custo últimos 30 dias"
          value={fmtUsd(c.costUsd.d30)}
          hint={formatBrl(c.costBrl.d30)}
          icon={DollarSign}
        />
        <StatCard
          label="Receita últimos 30 dias"
          value={formatBrl(c.revenueBrl.d30)}
          hint="passeios + roteiros + fotos"
          icon={Wallet}
        />
        <StatCard
          label="Margem últimos 30 dias"
          value={marginPct != null ? `${marginPct.toFixed(0)}%` : "—"}
          hint={formatBrl(margin30)}
          icon={Percent}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold text-text-secondary">
          Custo por dia (US$, últimos 30 dias)
        </h2>
        <div className="mt-3">
          <MiniLineChart
            data={c.dailyCostUsd.map((d) => ({ date: d.date, usd: d.usd }))}
            series={[{ key: "usd", label: "Custo (US$)", color: "#e53935" }]}
          />
          {c.dailyCostUsd.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">
              Ainda sem dados — aparece aqui assim que as chamadas de IA começarem a
              ser instrumentadas em produção.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">
          Por tipo de chamada (30 dias)
        </h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {c.byEventType.map((e) => (
            <li key={e.event_type} className="flex justify-between py-2">
              <span>
                {EVENT_LABEL[e.event_type] ?? e.event_type}{" "}
                <span className="text-text-muted">({e.count})</span>
              </span>
              <span className="font-metric">{fmtUsd(e.cost_usd)}</span>
            </li>
          ))}
          {c.byEventType.length === 0 && (
            <li className="py-2 text-text-muted">Sem eventos registrados ainda.</li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Chamadas recentes</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {c.recentEvents.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2">
              <span className="min-w-0 truncate pr-2">
                {EVENT_LABEL[e.event_type] ?? e.event_type}{" "}
                <span className="text-text-muted">
                  · {e.model ?? "—"} ·{" "}
                  {new Date(e.created_at).toLocaleString("pt-BR")}
                </span>
              </span>
              <span className="shrink-0 font-metric">{fmtUsd(e.cost_usd)}</span>
            </li>
          ))}
          {c.recentEvents.length === 0 && (
            <li className="py-2 text-text-muted">Nada ainda.</li>
          )}
        </ul>
      </section>

      <p className="text-xs text-text-muted">
        Custo estimado a partir dos tokens/caracteres reais retornados pela OpenAI em
        cada chamada, aplicando o preço por 1M tokens/caracteres configurado em{" "}
        <code className="rounded bg-subtle px-1 py-0.5">src/lib/usage-tracking.ts</code>
        . Câmbio USD→BRL: {c.fxRate.toFixed(3)}. Receita inclui passeios, desbloqueios
        de roteiro e pacotes de identificação de foto com pagamento confirmado.
      </p>
    </div>
  );
}
