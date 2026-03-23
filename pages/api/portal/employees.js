import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method === "GET") {
    var { data, error } = await supabase.from("portal_employees").select("*").order("last_name");
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ employees: data });
  }
  if (req.method === "PUT") {
    var { id, department_id, position_id, first_name, last_name, middle_name, phone, birth_date } = req.body;
    var updates = {};
    if (department_id !== undefined) updates.department_id = department_id || null;
    if (position_id !== undefined) updates.position_id = position_id || null;
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (middle_name !== undefined) updates.middle_name = middle_name;
    if (phone !== undefined) updates.phone = phone;
    if (birth_date !== undefined) updates.birth_date = birth_date || null;
    var { data, error } = await supabase.from("portal_employees").update(updates).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ employee: data });
  }
  res.status(405).json({ error: "Method not allowed" });
}
