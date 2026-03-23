import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method === "GET") {
    var { data, error } = await supabase.from("portal_positions").select("*").order("title");
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ positions: data });
  }
  if (req.method === "POST") {
    var { title, department_id } = req.body;
    if (!title) return res.status(400).json({ error: "Название обязательно" });
    var { data, error } = await supabase.from("portal_positions").insert({ title: title, department_id: department_id || null }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ position: data });
  }
  if (req.method === "DELETE") {
    var { id } = req.body;
    var { error } = await supabase.from("portal_positions").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }
  res.status(405).json({ error: "Method not allowed" });
}
