<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { exportFacts, groupByProblem } from '#lib/kb/problems';

  // issues: problem → URL of the ticket filed for it
  let { ticket, issues = {} }: { ticket: number; issues?: Record<string, string> } = $props();

  const merged = $derived(uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket));
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  const facts = $derived(exportFacts(reports as Report[], ticket, tenantOf));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{facts.reports}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>channels</th><th>tagged as</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if issues[g.problem]}<a href={issues[g.problem]}>{issues[g.problem].replace(/^.*\/issues\//, '#')}</a>{:else}none yet{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#each groups.filter((g) => g.problem === 'one-day') as g (g.problem)}
  <p class="note">
    The {g.reports.length} <code>one-day</code> reports stay counted where the desk files them by tenant
    ({list(g.filedUnder)}), and are listed on their own as well.
  </p>
{/each}

<p class="note">
  The export holds {facts.rows} rows for {facts.reports} reports: {facts.rows - facts.reports} rows repeat a report
  from an overlapping page. Intake's tag names a different place than the tenant gives the report for
  {facts.intakeDiffers} of them.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
</style>
