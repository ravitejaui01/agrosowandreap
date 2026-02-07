import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

function rowToRule(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    globs: row.globs,
    alwaysApply: row.always_apply,
    content: row.content,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

// List all rules
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM rules ORDER BY created_at DESC");
    res.json(result.rows.map(rowToRule));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create rule
router.post("/", async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await query(
      `INSERT INTO rules (id, name, description, globs, always_apply, content)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        b.name ?? "Untitled Rule",
        b.description ?? null,
        b.globs ?? b.glob ?? null,
        b.alwaysApply ?? b.always_apply ?? false,
        b.content ?? "",
      ]
    );
    const created = await query("SELECT * FROM rules WHERE id = $1", [id]);
    res.status(201).json(rowToRule(created.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single rule
router.get("/:id", async (req, res) => {
  try {
    const result = await query("SELECT * FROM rules WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToRule(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update rule
router.patch("/:id", async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    const map = {
      name: "name",
      description: "description",
      globs: "globs",
      glob: "globs",
      alwaysApply: "always_apply",
      always_apply: "always_apply",
      content: "content",
    };
    for (const [k, col] of Object.entries(map)) {
      if (b[k] !== undefined) {
        updates.push(`${col} = $${i}`);
        values.push(b[k]);
        i++;
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    values.push(req.params.id);
    await query(
      `UPDATE rules SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${i}`,
      values
    );
    const result = await query("SELECT * FROM rules WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rowToRule(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete rule
router.delete("/:id", async (req, res) => {
  try {
    const result = await query("DELETE FROM rules WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
