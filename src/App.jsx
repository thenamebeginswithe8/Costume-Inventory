import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function App() {
  const [inventory, setInventory] = useState([]);
  const [borrowLog, setBorrowLog] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [view, setView] = useState("inventory");

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      const { data: invData, error: invError } = await supabase
        .from("inventory")
        .select("*");
      if (invError) console.log(invError);
      else setInventory(invData);

      const { data: borrowData, error: borrowError } = await supabase
        .from("borrow_log")
        .select("*");
      if (borrowError) console.log(borrowError);
      else setBorrowLog(borrowData);
    }
    fetchData();
  }, []);

  // Inventory CRUD functions
  async function addInventory(item) {
    const { data, error } = await supabase
      .from("inventory")
      .insert([{ ...item, id: uid("c") }]);
    if (error) console.log(error);
    else setInventory((s) => [data[0], ...s]);
  }

  async function updateInventory(id, patch) {
    const { data, error } = await supabase
      .from("inventory")
      .update(patch)
      .eq("id", id);
    if (error) console.log(error);
    else setInventory((s) => s.map((i) => (i.id === id ? data[0] : i)));
  }

  async function removeInventory(id) {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) console.log(error);
    else setInventory((s) => s.filter((i) => i.id !== id));
  }

  // Borrow / Return functions
  async function borrowItem(record) {
    const inv = inventory.find((i) => i.id === record.inventoryId);
    if (!inv) return;
    const available = inv.quantity - currentlyBorrowedQuantity(record.inventoryId);
    if (record.qty > available) {
      alert(`Not enough available. ${available} left.`);
      return;
    }
    const newRecord = {
      ...record,
      id: uid("b"),
      costumeName: inv.name,
      date_borrowed: new Date().toISOString().slice(0, 10),
      status: "Borrowed",
    };
    const { data, error } = await supabase.from("borrow_log").insert([newRecord]);
    if (error) console.log(error);
    else setBorrowLog((s) => [data[0], ...s]);
  }

  async function returnItem(borrowId, patch) {
    const { data, error } = await supabase
      .from("borrow_log")
      .update({ ...patch, status: "Returned", date_returned: new Date().toISOString().slice(0, 10) })
      .eq("id", borrowId);
    if (error) console.log(error);
    else setBorrowLog((s) => s.map((r) => (r.id === borrowId ? data[0] : r)));
  }

  function currentlyBorrowedQuantity(inventoryId) {
    return borrowLog
      .filter((r) => r.inventoryId === inventoryId && r.status === "Borrowed")
      .reduce((a, b) => a + (Number(b.qty) || 0), 0);
  }

  function isOverdue(record) {
    if (!record.returnDueDate || record.status !== "Borrowed") return false;
    const today = new Date().toISOString().slice(0, 10);
    return today > record.returnDueDate;
  }

  // CSV Export
  function exportCSV() {
    const rows = [];
    rows.push(
      ["id", "name", "category", "size", "color", "quantity", "condition", "location", "notes"].join(",")
    );
    inventory.forEach((i) => {
      rows.push(
        [i.id, i.name, i.category, i.size, i.color, i.quantity, i.condition, i.location, `"${(i.notes || "").replace(/"/g, '""')}"`].join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importCSV(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const txt = e.target.result;
      const lines = txt.split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) return alert("No data found");
      const data = lines.slice(1).map((ln) => {
        const parts = ln.split(",");
        return {
          id: parts[0] || uid("c"),
          name: parts[1] || "",
          category: parts[2] || "",
          size: parts[3] || "",
          color: parts[4] || "",
          quantity: Number(parts[5]) || 0,
          condition: parts[6] || "",
          location: parts[7] || "",
          notes: parts[8] ? parts[8].replace(/^\"|\"$/g, "") : "",
        };
      });
      for (const item of data) {
        await addInventory(item);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Costume Logistics — Inventory & Borrow System</h1>
          <div className="space-x-2">
            <button onClick={() => setView("inventory")} className={`px-3 py-1 rounded ${view==='inventory'?'bg-indigo-600 text-white':'bg-white border'}`}>Inventory</button>
            <button onClick={() => setView("borrow")} className={`px-3 py-1 rounded ${view==='borrow'?'bg-indigo-600 text-white':'bg-white border'}`}>Borrow</button>
            <button onClick={() => setView("returns")} className={`px-3 py-1 rounded ${view==='returns'?'bg-indigo-600 text-white':'bg-white border'}`}>Returns</button>
          </div>
        </header>

        {view === "inventory" && (
          <section className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-2">
                <input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="Search by name, category or location" className="border px-2 py-1 rounded" />
                <button onClick={()=>{ 
                  const name = prompt('Name');
                  if(!name) return;
                  const cat = prompt('Category','Accessory');
                  addInventory({ name, category:cat, size:'Free', color:'', quantity:1, condition:'Good', location:'Storage', notes:''});
                }} className="px-2 py-1 bg-green-600 text-white rounded">+ Add</button>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={exportCSV} className="px-3 py-1 border rounded">Export CSV</button>
                <label className="px-3 py-1 border rounded cursor-pointer">
                  Import CSV
                  <input onChange={(e)=>importCSV(e.target.files[0])} type="file" accept=".csv" className="hidden" />
                </label>
              </div>
            </div>

            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-2">Name</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Available</th>
                  <th>Condition</th>
                  <th>Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventory.filter(i=>{
                  const q = filter.toLowerCase();
                  if(!q) return true;
                  return (i.name||'').toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q) || (i.location||'').toLowerCase().includes(q)
                }).map(item=>{
                  const borrowed = currentlyBorrowedQuantity(item.id);
                  const available = item.quantity - borrowed;
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="py-2">{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.size}</td>
                      <td>{item.quantity}</td>
                      <td>{available}</td>
                      <td>{item.condition}</td>
                      <td>{item.location}</td>
                      <td className="text-right">
                        <button onClick={()=>{setSelected(item.id); setView('borrow');}} className="px-2 py-1 border rounded mr-2">Borrow</button>
                        <button onClick={()=>{if(confirm('Delete this item?')) removeInventory(item.id)}} className="px-2 py-1 border rounded">Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {view === 'borrow' && (
          <BorrowSection
            inventory={inventory}
            borrowLog={borrowLog}
            selected={selected}
            borrowItem={borrowItem}
            returnItem={returnItem}
            currentlyBorrowedQuantity={currentlyBorrowedQuantity}
            isOverdue={isOverdue}
          />
        )}

        {view === 'returns' && (
          <section className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">Borrow & Return History</h2>
            <div className="space-y-2">
              {borrowLog.map(r=> (
                <div key={r.id} className="p-2 border rounded">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{r.costumeName} — {r.borrowerName} ({r.qty})</div>
                      <div className="text-sm text-gray-600">Borrowed: {r.date_borrowed} | Due: {r.returnDueDate} | Status: {r.status}</div>
                      {r.status==='Returned' && <div className="text-sm">Returned: {r.date_returned} — Condition: {r.conditionOnReturn} — Checked by: {r.checkedBy} — Repair cost: {r.repairCost}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">ID: {r.id}</div>
                    </div>
                  </div>
                </div>
              ))}
              {borrowLog.length===0 && <div className="text-sm text-gray-600">No history yet.</div>}
            </div>
          </section>
        )}

        <footer className="mt-6 text-sm text-gray-600">
          Tip: This system is now online. Multiple users can access it simultaneously.
        </footer>
      </div>
    </div>
  );
}

// Separate component for Borrow Section
function BorrowSection({ inventory, borrowLog, selected, borrowItem, returnItem, currentlyBorrowedQuantity, isOverdue }) {
  const [inventoryId, setInventoryId] = useState(selected || (inventory[0] && inventory[0].id) || '');
  const [borrowerName, setBorrowerName] = useState('');
  const [dept, setDept] = useState('');
  const [qty, setQty] = useState(1);
  const [purpose, setPurpose] = useState('Event');
  const [dueDate, setDueDate] = useState('');
  const [staff, setStaff] = useState('');

  useEffect(()=>{
    if(selected) setInventoryId(selected);
  },[selected]);

  useEffect(()=>{
    if(inventory.length && !inventoryId) setInventoryId(inventory[0].id);
  },[inventory]);

  return (
    <section className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-3">Borrow Item</h2>
      <form onSubmit={(e)=>{
        e.preventDefault();
        borrowItem({ inventoryId, borrowerName, dept, qty: Number(qty), purpose, dueDate, staff });
        setBorrowerName(''); setQty(1); setPurpose('Event'); setDueDate(''); setStaff('');
      }} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select value={inventoryId} onChange={(e)=>setInventoryId(e.target.value)} className="border p-2 rounded">
            {inventory.map(i=> <option key={i.id} value={i.id}>{i.name} — ({i.quantity} total)</option>)}
          </select>
          <input value={borrowerName} onChange={(e)=>setBorrowerName(e.target.value)} required placeholder="Borrower name" className="border p-2 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input value={dept} onChange={(e)=>setDept(e.target.value)} placeholder="Department / Team" className="border p-2 rounded" />
          <input value={qty} onChange={(e)=>setQty(e.target.value)} type="number" min="1" className="border p-2 rounded" />
          <input value={dueDate} onChange={(e)=>setDueDate(e.target.value)} type="date" className="border p-2 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={purpose} onChange={(e)=>setPurpose(e.target.value)} placeholder="Purpose" className="border p-2 rounded" />
          <input value={staff} onChange={(e)=>setStaff(e.target.value)} placeholder="Staff in-charge" className="border p-2 rounded" />
        </div>
        <div>
          <button className="px-3 py-1 bg-indigo-600 text-white rounded">Borrow</button>
        </div>
      </form>

      <hr className="my-4" />
      <h3 className="font-semibold mb-2">Active Borrowings</h3>
      <div className="space-y-2">
        {borrowLog.filter(r=>r.status==='Borrowed').map(r=> (
          <div key={r.id} className={`p-2 border rounded ${isOverdue(r)?'bg-red-50 border-red-300':''}`}>
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{r.costumeName} (x{r.qty})</div>
                <div className="text-sm text-gray-600">Borrower: {r.borrowerName} — Due: {r.returnDueDate}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">Status: {r.status}</div>
                <button onClick={()=>{ 
                  const cond = prompt('Condition on return (Good / Needs Repair / Damaged)','Good');
                  if(cond==null) return;
                  const missing = Number(prompt('Missing items (0)','0')||0);
                  const cost = Number(prompt('Repair cost (0)','0')||0);
                  const checked = prompt('Checked by','Staff');
                  returnItem(r.id,{ conditionOnReturn:cond, missingItems:missing, repairCost:cost, checkedBy:checked });
                }} className="mt-2 px-2 py-1 border rounded">Mark Returned</button>
              </div>
            </div>
          </div>
        ))}
        {borrowLog.filter(r=>r.status==='Borrowed').length===0 && <div className="text-sm text-gray-600">No active borrowings.</div>}
      </div>
    </section>
  )
}
