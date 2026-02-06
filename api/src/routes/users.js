import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT id, name, email, role FROM users ORDER BY name");
    res.json(result.rows.map(rowToUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await query("SELECT id, name, email, role FROM users WHERE id = $1", [req.params.id]);
    const user = rowToUser(result.rows[0]);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { id, name, email, role } = req.body;
    if (!id || !name || !email || !role) {
      return res.status(400).json({ error: "id, name, email, role required" });
    }
    await query(
      "INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)",
      [id, name, email, role]
    );
    res.status(201).json({ id, name, email, role });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "User already exists" });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
