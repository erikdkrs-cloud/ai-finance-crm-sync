import { neon } from "@neondatabase/serverless";

var sql = neon(process.env.DATABASE_URL);

// Расстояние Левенштейна для fuzzy matching
function levenshtein(a, b) {
  var la = a.length, lb = b.length;
  var d = [];
  for (var i = 0; i <= la; i++) {
    d[i] = [i];
    for (var j = 1; j <= lb; j++) {
      d[i][j] = i === 0 ? j : 0;
    }
  }
  for (var i = 1; i <= la; i++) {
    for (var j = 1; j <= lb; j++) {
      var cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[la][lb];
}

function similarity(a, b) {
  var al = a.toLowerCase().trim();
  var bl = b.toLowerCase().trim();
  var maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(al, bl) / maxLen;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  var body = req.body || {};
  var rows = body.rows;
  var renames = body.renames || {}; // { "Опечатка": "Правильное название" }

  if (!Array.isArray(rows)) return res.status(400).json({ ok: false, error: "rows must be an array" });
  if (rows.length === 0) return res.status(200).json({ ok: true, imported: 0 });

  try {
    // Get existing projects
    var existingProjects = await sql`SELECT id, name FROM projects ORDER BY name`;
    var existingNames = existingProjects.map(function (p) { return p.name; });

    // Check mode — if no renames provided and there are similar names, return warnings
    if (!body.confirmed) {
      var warnings = [];
      var fileProjects = [];

      // Collect unique project names from file
      for (var i = 0; i < rows.length; i++) {
        var pName = String(rows[i].project || "").trim();
        if (pName && fileProjects.indexOf(pName) === -1) {
          fileProjects.push(pName);
        }
      }

      // Check each file project against existing
      for (var i = 0; i < fileProjects.length; i++) {
        var fp = fileProjects[i];
        var exactMatch = false;

        for (var j = 0; j < existingNames.length; j++) {
          if (existingNames[j] === fp) {
            exactMatch = true;
            break;
          }
        }

        if (!exactMatch) {
          // New project — check for similar names
          var similar = [];
          for (var j = 0; j < existingNames.length; j++) {
            var sim = similarity(fp, existingNames[j]);
            if (sim >= 0.6 && sim < 1) {
              similar.push({ name: existingNames[j], similarity: Math.round(sim * 100) });
            }
          }

          if (similar.length > 0) {
            similar.sort(function (a, b) { return b.similarity - a.similarity; });
            warnings.push({
              fileProject: fp,
              similar: similar.slice(0, 3),
            });
          }
        }
      }

      if (warnings.length > 0) {
        return res.status(200).json({
          ok: true,
          needsReview: true,
          warnings: warnings,
          existingProjects: existingNames,
        });
      }
    }

    // Apply renames
    var processedRows = rows.map(function (r) {
      var proj = String(r.project || "").trim();
      if (renames[proj]) proj = renames[proj];
      return Object.assign({}, r, { project: proj });
    });

    // Import
    var imported = 0;
    var projectSet = {};
    var periodSet = {};

    for (var i = 0; i < processedRows.length; i++) {
      var r = processedRows[i];
      var month = String(r.month || "").trim();
      var project = String(r.project || "").trim();
      if (!month || !project) continue;

      projectSet[project] = true;
      periodSet[month] = true;

      await sql`INSERT INTO periods (month) VALUES (${month}) ON CONFLICT (month) DO NOTHING`;
      await sql`INSERT INTO projects (name) VALUES (${project}) ON CONFLICT (name) DO NOTHING`;

      await sql`
        INSERT INTO financial_rows (
          project_id, period_id,
          revenue_no_vat, salary_workers, salary_manager, salary_head,
          ads, transport, penalties, tax
        ) VALUES (
          (SELECT id FROM projects WHERE name=${project}),
          (SELECT id FROM periods WHERE month=${month}),
          ${Number(r.revenue || r.revenue_no_vat || 0)},
          ${Number(r.expense_salary_workers || r.salary_workers || 0)},
          ${Number(r.expense_salary_management || r.salary_manager || 0)},
          ${Number(r.expense_other || r.salary_head || 0)},
          ${Number(r.expense_ads || r.ads || 0)},
          ${Number(r.expense_transport || r.transport || 0)},
          ${Number(r.expense_fines || r.penalties || 0)},
          ${Number(r.expense_tax || r.tax || 0)}
        )
        ON CONFLICT (project_id, period_id)
        DO UPDATE SET
          revenue_no_vat = excluded.revenue_no_vat,
          salary_workers = excluded.salary_workers,
          salary_manager = excluded.salary_manager,
          salary_head = excluded.salary_head,
          ads = excluded.ads,
          transport = excluded.transport,
          penalties = excluded.penalties,
          tax = excluded.tax
      `;
      imported++;
    }

    return res.status(200).json({
      ok: true,
      imported: imported,
      projects: Object.keys(projectSet),
      periods: Object.keys(periodSet),
    });
  } catch (e) {
    console.error("Import error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
