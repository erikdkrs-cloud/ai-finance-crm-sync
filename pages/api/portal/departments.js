import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method === "GET") {
    var { data, error } = await supabase.from("portal_departments").select("*").order("name");
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ departments: data });
  }
  if (req.method === "POST") {
    var { name, head_employee_id } = req.body;
    if (!name) return res.status(400).json({ error: "Название обязательно" });
    var { data, error } = await supabase.from("portal_departments").insert({ name: name, head_employee_id: head_employee_id || null }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ department: data });
  }
  if (req.method === "PUT") {
    var { id, name, head_employee_id } = req.body;
    var { data, error } = await supabase.from("portal_departments").update({ name: name, head_employee_id: head_employee_id || null }).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ department: data });
  }
  if (req.method === "DELETE") {
    var { id } = req.body;
    var { error } = await supabase.from("portal_departments").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }
  res.status(405).json({ error: "Method not allowed" });
}
