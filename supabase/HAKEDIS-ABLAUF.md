# Hakediş (aylık ödeme) – Ablauf

Modell: Too Good To Go. Müşteri Kırıntı'ya öder, komisyon düşülür, net tutar her ay IBAN'a havale edilir. Şema: `supabase/sql/payouts.sql` (canlıda uygulandı, 11 Kasım 2026).

## Her ayın 5'i
1. Hakediş oluştur (önceki ayın son günü dahil olan teslimler, IBAN'ı kayıtlı işletmeler, net > 0):
   ```sql
   select public.create_payouts('2026-11-30');   -- kaç işletme için hakediş oluştu
   ```
2. Liste (IBAN dahil, yalnızca service role / SQL editor):
   ```sql
   select b.name, d.holder, d.iban, p.net, p.orders_count, p.id
   from payouts p join businesses b on b.id = p.business_id join payout_details d on d.business_id = p.business_id
   where p.status = 'hazir' order by b.name;
   ```
3. Bankadan toplu EFT yap (açıklama: "Kırıntı hakediş <ay> <işletme>").
4. Ödendi işaretle (işletme panelinde "Ödendi" görünür):
   ```sql
   update payouts set status = 'odendi', paid_at = now(), reference = '<EFT ref>' where id = '<payout id>';
   ```

## Kurallar
- Yalnızca `teslim` edilmiş ve `odendi` siparişler sayılır; iptal, iade ve gelmeyenler dahil değil.
- Mekânda ödenen siparişlerde işletme parayı kendisi aldı: komisyonu hakedişten düşülür. Net ≤ 0 ise bir sonraki aya devreder.
- IBAN yoksa hakediş oluşmaz; işletme panelinden IBAN girmeli. IBAN TR formatı ve mod-97 sağlamasıyla doğrulanır.
- Komisyon faturası: her işletmeye ay sonu Kırıntı komisyonu için fatura kesilir (mali müşavirle netleştir).

## Henüz yapılmayanlar
- Otomatik EFT/banka entegrasyonu yok; ödeme elle yapılıyor (başlangıç için yeterli).
- Hukuki değerlendirme (6493, üçüncü kişi adına para tutma) mali müşavir/avukatla netleştirilmeli.
