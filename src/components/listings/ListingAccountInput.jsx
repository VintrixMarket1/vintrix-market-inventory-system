import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ListingAccountInput({ value, onChange }) {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    base44.entities.Product.list({ distinct: "listing_account" })
      .then(res => setAccounts((res.items || []).filter(Boolean)));
  }, []);

  return (
    <div className="space-y-1.5">
      <Label>Konto wystawienia</Label>
      <Input list="listing-accounts" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Wybierz lub wpisz nazwę konta" />
      <datalist id="listing-accounts">
        {accounts.map(a => <option key={a} value={a} />)}
      </datalist>
    </div>
  );
}